import { createIRangeRequestWithUserFromURLSearchParams, getOriginalRequest } from '$lib/helpers.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoadEvent } from './$types';

export async function load(ev: PageServerLoadEvent) {
  const counterpart_user_id = Number.parseInt(ev.params.user_id);
  const parent = await ev.parent();
  if (parent.user == null || parent.user.id === counterpart_user_id) {
    throw error(403);
  }
  const services = getOriginalRequest(ev)?.services;
  if (services == null) {
    throw error(500);
  }
  const counterpart = await services.userService.findById(counterpart_user_id);
  if (counterpart == null) {
    throw error(404, 'counterpart is not found.');
  }
  const relationship = await services.userService.get_lowest_relationship(parent.user.id, counterpart_user_id);
  if (relationship === -1) {
    throw error(403, 'you are banned from them or you banned them.');
  }
  const room_id = await services.directMessageRoomService.get_room_id(parent.user.id, counterpart_user_id);
  if (room_id == null) {
    return {
      user: parent.user,
      counterpart,
    };
  }
  const room = await services.directMessageRoomService.get_room(room_id);
  if (room === null) {
    throw error(500);
  }
  const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(parent.user.id, ev.url.searchParams, 50, false);
  if (rangeRequest === null) {
    throw error(400, 'invalid range request.');
  }
  const logs = await services.directMessageRoomService.get_logs(room_id, rangeRequest);
  return {
    user: parent.user,
    counterpart,
    logs,
    room,
  };
}
