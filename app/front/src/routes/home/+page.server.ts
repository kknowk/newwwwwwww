import { createIRangeRequestWithUserFromURLSearchParams, getOriginalRequest } from "$lib/helpers";
import { error } from "@sveltejs/kit";
import type { PageServerLoadEvent } from "./$types";

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  if (parent.user == null) {
    throw error(403);
  }
  const services = getOriginalRequest(ev)?.services;
  if (services == null) {
    throw error(500);
  }
  const { win, lose } = await services.userService.get_game_result_counts(parent.user.id);
  const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
    parent.user.id,
    ev.url.searchParams,
    undefined,
    false
  );
  if (rangeRequest === null) {
    throw error(400, "invalid range request");
  }
  const logs = await services.userService.get_game_logs(rangeRequest);
  return {
    user: parent.user,
    win,
    lose,
    logs,
  };
}
