import { getOriginalRequest, redirectToAuth } from '$lib/helpers';

export async function load(ev) {
  const req = getOriginalRequest(ev);
  const user = redirectToAuth(ev.url, req?.user);
  return { user };
}
