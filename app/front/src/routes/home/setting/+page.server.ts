import type { PageServerLoadEvent } from "./$types.js";
import { getOriginalRequest, redirectToAuth } from "$lib/helpers.js";
import { error } from "@sveltejs/kit";

export async function load(ev: PageServerLoadEvent) {
  const req = getOriginalRequest(ev);
  if (req?.services == null) {
    throw error(500);
  }
  const user = redirectToAuth(ev.url, req?.user);
  if (user == null) {
    throw error(403);
  }
  let email = null;
  if (user.id && req?.services?.userService) {
    email = await req.services.userService.get_email(user.id);
  }
  return {
    user,
    email,
  };
}
