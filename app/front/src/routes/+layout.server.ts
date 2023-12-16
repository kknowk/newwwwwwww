import type { LayoutServerLoadEvent } from "./$types";
import { getOriginalRequest } from "$lib/helpers";
import { redirect } from "@sveltejs/kit";

export async function load(ev: LayoutServerLoadEvent) {
  console.error(ev.url.pathname);
  const req = getOriginalRequest(ev);
  const user = req?.user;
  if (user != null) {
    if (
      ev.url.pathname !== "/authentication" &&
      user.two_factor_authentication_required &&
      !user.is_two_factor_authenticated
    ) {
      console.log("invalid auth: " + JSON.stringify(user));
      throw redirect(307, "/authentication");
    }
    if (ev.url.pathname === "/") {
      if (ev.url.searchParams.has("should_redirect_to_settings")) {
        throw redirect(307, "/home/setting");
      }
      throw redirect(307, "/home");
    }
  }
  return { user };
}
