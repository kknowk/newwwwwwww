import { getOriginalRequest, redirectToAuth } from "$lib/helpers";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoadEvent } from "./$types";

export async function load(ev: PageServerLoadEvent) {
  const req = getOriginalRequest(ev);
  const user = redirectToAuth(ev.url, req?.user);
  if (user?.is_two_factor_authenticated) {
    throw redirect(307, "/home");
  }
  return {
    user,
  };
}
