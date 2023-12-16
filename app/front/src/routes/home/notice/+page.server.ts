import type { PageServerLoadEvent } from "./$types.js";
import {
  createIRangeRequestWithUserFromURLSearchParams,
  getOriginalRequest,
} from "$lib/helpers.js";
import { error } from "@sveltejs/kit";

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  if (parent.user == null) {
    throw error(403);
  }
  const services = getOriginalRequest(ev)?.services;
  if (services == null) {
    throw error(500);
  }
  const params = ev.url.searchParams;
  const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
    parent.user.id,
    params,
    undefined,
    false
  );
  if (rangeRequest === null) {
    throw error(500);
  }
  const [notices, maxId] = await services.userService.get_notice(rangeRequest);
  if (maxId > parent.user.notice_read_id) {
    parent.user.notice_read_id = maxId;
    const access_token = await services.authService.issue_jwt(parent.user);
    if (access_token != null) {
      ev.cookies.set('jwt', access_token, services.authService.jwt_cookie_options);
    }
  }
  return {
    user: parent.user,
    notices,
  };
}
