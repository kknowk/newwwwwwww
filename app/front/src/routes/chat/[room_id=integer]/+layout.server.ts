import { error } from '@sveltejs/kit';
import { getOriginalRequest, createIRangeRequestWithUserFromURLSearchParams } from '$lib/helpers';
import type { ChatRoomMembershipKind, IChatRoom, IPartialChatRoomMembership, IChatLog } from '$lib/back/chat-room/chat-room.entity';
import type { IUser, IUserWithRelationship } from '$lib/back/user/user.entity';
import type { Services } from '$lib/back/svelte.services';
import type { LayoutServerLoadEvent } from './$types';

type DataType =
  | {
      user: IUser;
      room: IChatRoom;
      logs: null;
      members: null;
      users: null;
    }
  | {
      user: IUser;
      room: IChatRoom;
      logs: IChatLog[];
      members: Map<number, ChatRoomMembershipKind>;
      users: Map<number, IUserWithRelationship>;
    };

async function loadLogs(value: DataType, services: Services, ev: LayoutServerLoadEvent) {
  const memberArray = await services.chatRoomService.get_members(value.room.id, value.user.id);
  const queryArray: number[] = [];
  value.members = new Map<number, ChatRoomMembershipKind>();
  for (const iterator of memberArray) {
    value.members.set(iterator.member_id, iterator.kind);
    queryArray.push(iterator.member_id);
  }
  const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(value.user.id, ev.url.searchParams, 50, false);
  if (rangeRequest === null) {
    throw error(400, 'invalid range request');
  }
  value.logs = await services.chatRoomService.get_logs(rangeRequest, value.room.id);
  if (value.logs === null) {
    throw error(500);
  }
  const userArray = await services.userService.get_users(value.user.id, queryArray);
  value.users = new Map<number, IUserWithRelationship>();
  for (const iterator of userArray) {
    value.users.set(iterator.id, iterator);
  }
  return value;
}

async function privateRoom(value: DataType, services: Services, ev: LayoutServerLoadEvent) {
  const membership = await services.chatRoomService.get_membership(value.room.id, value.user.id);
  if (membership === null || membership.kind < 0) {
    throw error(403);
  }
  if (membership.kind >= 1) {
    return await loadLogs(value, services, ev);
  }
  return value;
}

async function protectedRoom(value: DataType, services: Services, ev: LayoutServerLoadEvent) {
  const membership = await services.chatRoomService.get_membership(value.room.id, value.user.id);
  if (membership === null || membership.kind === 0) {
    return value;
  } else if (membership.kind < 0) {
    throw error(403);
  } else {
    return await loadLogs(value, services, ev);
  }
}

async function publicRoom(value: DataType, services: Services, ev: LayoutServerLoadEvent) {
  const membership = await services.chatRoomService.get_membership(value.room.id, value.user.id);
  if (membership === null || membership.kind === 0) {
    return value;
  } else if (membership.kind < 0) {
    throw error(403);
  } else {
    return await loadLogs(value, services, ev);
  }
}

export async function load(ev: LayoutServerLoadEvent) {
  const user = (await ev.parent())?.user;
  if (user == null) {
    throw error(403);
  }
  const room_id = Number.parseInt(ev.params.room_id);
  if (!Number.isSafeInteger(room_id)) {
    throw error(404, { message: `invalid number: ${room_id}` });
  }
  const services = getOriginalRequest(ev)?.services;
  if (services == null) {
    throw error(500);
  }
  const room = await services.chatRoomService.get_room(room_id, user.id);
  if (room === null) {
    throw error(404, { message: `room not found: ${room_id}` });
  }
  const answer = {
    user,
    room,
    logs: null,
    members: null,
    users: null,
  };
  switch (room.kind) {
    case 0:
      return await privateRoom(answer, services, ev);
    case 1:
      return await protectedRoom(answer, services, ev);
    case 2:
      return await publicRoom(answer, services, ev);
    default:
      throw error(500);
  }
}
