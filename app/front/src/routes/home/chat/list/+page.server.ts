import { error } from "@sveltejs/kit";
import type { PageServerLoadEvent } from "./$types";
import { createIRangeRequestWithUserFromURLSearchParams, getOriginalRequest } from "$lib/helpers";

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  if (parent.user == null) {
    throw error(403);
  }
  const service = getOriginalRequest(ev)?.services?.chatRoomService;
  if (service == null) {
    throw error(500);
  }
  const params = ev.url.searchParams;
  const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
    parent.user.id,
    params,
    undefined,
    true
  );
  if (rangeRequest === null) {
    throw error(400);
  }
  const rooms = await service.get_belonging_rooms(rangeRequest);
  rangeRequest.limit ??= 50;
  const notMemberRooms = await service.get_not_member_rooms(rangeRequest);
  return {
    user: parent.user,
    rooms,
    notMemberRooms,
  };
}
