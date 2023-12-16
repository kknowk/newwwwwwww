import { redirect } from '@sveltejs/kit';
import type { RequestWithServices } from './back/svelte.services';
import type { IUser } from './back/user/user.entity';
import type { IRangeRequest, IRangeRequestWithUserId } from './back/utility/range-request';

export function getOriginalRequest(ev: { platform: any | undefined }) {
  if (ev?.platform == null || !('req' in ev.platform)) {
    return null;
  }
  const req = (ev.platform.req ?? null) as RequestWithServices;
  return req;
}

export function redirectToAuth(url: URL, user: IUser | null | undefined) {
  if (user == null) {
    if (url.pathname !== '/auth') throw redirect(307, '/auth');
  } else if (user.two_factor_authentication_required && !user.is_two_factor_authenticated) {
    if (url.pathname !== '/authentication') throw redirect(307, '/authentication');
  }
  return user;
}

const UserActivityKind = {
  logout: 0,
  login: 1,
  in_game: 2,
} as const;
type UserActivityKind = (typeof UserActivityKind)[keyof typeof UserActivityKind];

export function is_login(user: IUser) {
  const now = Math.floor(Date.now() / 1000);
  if (user.activity_kind !== UserActivityKind.logout) {
    const diff = now - user.last_activity_timestamp;
    if (diff >= 3600) {
      return UserActivityKind.logout;
    }
  }
  return user.activity_kind;
}

export function activityKindToString(kind: UserActivityKind) {
  switch (kind) {
    case UserActivityKind.in_game:
      return 'In Game';
    case UserActivityKind.login:
      return 'Login';
    default:
      return 'Logout';
  }
}

export function parseInt(value: string | number | null | undefined) {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`value (${value}) is not integer.`);
    }
    return value;
  }
  const parsed = Number.parseInt(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`value (${value}) is not integer.`);
  }
  return parsed;
}

function parseOrder(value: string | boolean | null | undefined) {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  switch (value.toLowerCase()) {
    case 'true':
    case 'asc':
    case 'ascend':
    case 'ascending':
      return true;
    case 'false':
    case 'desc':
    case 'descend':
    case 'descending':
      return false;
  }
  throw new Error(`value (${value}) is not appropriate order kind.`);
}

export function createIRangeRequest(
  start_inclusive?: string | number | null | undefined,
  start_exclusive?: string | number | null | undefined,
  end_inclusive?: string | number | null | undefined,
  end_exclusive?: string | number | null | undefined,
  limit?: string | number | null | undefined,
  is_ascending_order?: string | boolean | null | undefined,
): IRangeRequest | null {
  try {
    const answer = {
      start_inclusive: parseInt(start_inclusive),
      start_exclusive: parseInt(start_exclusive),
      end_inclusive: parseInt(end_inclusive),
      end_exclusive: parseInt(end_exclusive),
      limit: parseInt(limit),
      is_ascending_order: parseOrder(is_ascending_order),
    };
    if (answer.start_exclusive != null && answer.start_inclusive != null) {
      return null;
    }
    if (answer.end_exclusive != null && answer.end_inclusive != null) {
      return null;
    }
    return answer;
  } catch {
    return null;
  }
}

export function createIRangeRequestWithUserFromURLSearchParams(
  user_id: number,
  params: URLSearchParams,
  limit?: string | number | null | undefined,
  is_ascending_order?: string | boolean | null | undefined,
): IRangeRequestWithUserId | null {
  const answer = createIRangeRequest(
    params.get('start_inclusive'),
    params.get('start_exclusive'),
    params.get('end_inclusive'),
    params.get('end_exclusive'),
    params.get('limit') ?? limit,
    params.get('order') ?? is_ascending_order,
  ) as IRangeRequestWithUserId | null;
  if (answer === null) {
    return null;
  }
  answer.user_id = user_id;
  return answer;
}
