import { createIRangeRequestWithUserFromURLSearchParams, getOriginalRequest } from "$lib/helpers";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoadEvent } from "./$types";

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  const user_id = Number.parseInt(ev.params.id);
  if (parent.user == null) {
    throw error(403);
  }
  if (parent.user.id === user_id) {
    throw redirect(307, "/home/setting");
  }
  const services = getOriginalRequest(ev)?.services;
  if (services == null) {
    throw error(500);
  }
  const user = await services.userService.findById(user_id);
  if (user == null) {
    throw error(404);
  }
  const relationship = await services.userService.get_lowest_relationship(user_id, parent.user.id);
  if (relationship < 0) {
    throw error(404);
  }
  const { win, lose } = await services.userService.get_game_result_counts(user_id);
  const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(user_id, ev.url.searchParams, undefined, false);
  if (rangeRequest === null) {
    throw error(400, 'invalid range request');
  }
  const logs = await services.userService.get_game_logs(rangeRequest);
  return {
    user,
    relationship,
    win,
    lose,
    logs,
  };
}
