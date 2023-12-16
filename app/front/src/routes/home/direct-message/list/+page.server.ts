import { getOriginalRequest, createIRangeRequestWithUserFromURLSearchParams } from "$lib/helpers";
import { error } from "@sveltejs/kit";
import type { PageServerLoadEvent } from "./$types";

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  if (parent.user == null) {
    throw error(403);
  }
  const service = getOriginalRequest(ev)?.services?.directMessageRoomService;
  if (service == null) {
    throw error(500);
  }
  const params = ev.url.searchParams;
  const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
    parent.user.id,
    params,
    50,
    true
  );
  if (rangeRequest === null) {
    throw error(500);
  }
  const rooms = await service.get_rooms(rangeRequest);
  rooms.sort((a, b) => {
    return a.last_log_id < b.last_log_id ? 1 : a.last_log_id === b.last_log_id ? 0 : -1;
  });
  for (let index = rooms.length; index-- > 0; ) {
    const room = rooms[index];
    if (room.last_log_id <= room.hide_log_id) {
      rooms.splice(index, 1);
    }
  }
  return {
    user: parent.user,
    rooms: rooms,
  };
}
