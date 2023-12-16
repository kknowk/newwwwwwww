import { createIRangeRequestWithUserFromURLSearchParams, getOriginalRequest, redirectToAuth } from '$lib/helpers';
import { error } from '@sveltejs/kit';
import type { PageServerLoadEvent } from './$types';

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  const user = redirectToAuth(ev.url, parent.user);
  if (user == null) {
    throw error(403);
  }
  const service = getOriginalRequest(ev)?.services?.userService;
  if (service == null) {
    throw error(500);
  }
  const params: URLSearchParams = ev.url.searchParams;
  const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(user.id, params, 50, true);
  if (rangeRequest === null) {
    throw error(400);
  }
  const friends = await service.get_friends(rangeRequest);
  return {
    user,
    friends,
  };
}
