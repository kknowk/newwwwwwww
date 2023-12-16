import { WhereExpressionBuilder, SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export type IRangeRequest = {
  start_inclusive?: number;
  start_exclusive?: number;
  end_inclusive?: number;
  end_exclusive?: number;
  limit?: number;
  is_ascending_order?: boolean;
};

function parseInt(value: string | number | null | undefined) {
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

export interface IRangeRequestWithUserId extends IRangeRequest {
  user_id: number;
}

export function addWhereCondition<QueryBuilder extends WhereExpressionBuilder>(request: IRangeRequest, query: QueryBuilder, column: string, and?: boolean) {
  const method = and == null ? query.where : and ? query.andWhere : query.orWhere;
  if (request.start_inclusive != null) {
    if (request.end_inclusive != null) {
      return method.call(query, `${column} BETWEEN :v0 AND :v1`, { v0: request.start_inclusive, v1: request.end_inclusive });
    } else if (request.end_exclusive != null) {
      return method.call(query, `${column} >= :v0 AND ${column} < :v1`, { v0: request.start_inclusive, v1: request.end_exclusive });
    } else {
      return method.call(query, `${column} >= :v0`, { v0: request.start_inclusive });
    }
  } else if (request.start_exclusive != null) {
    if (request.end_inclusive != null) {
      return method.call(query, `${column} > :v0 AND ${column} <= :v1`, { v0: request.start_exclusive, v1: request.end_inclusive });
    } else if (request.end_exclusive != null) {
      return method.call(query, `${column} > :v0 AND ${column} < :v1`, { v0: request.start_exclusive, v1: request.end_exclusive });
    } else {
      return method.call(query, `${column} > :v0`, { v0: request.start_exclusive });
    }
  } else {
    if (request.end_inclusive != null) {
      return method.call(query, `${column} <= :v1`, { v1: request.end_inclusive });
    } else if (request.end_exclusive != null) {
      return method.call(query, `${column} < :v1`, { v1: request.end_exclusive });
    } else {
      return query;
    }
  }
}

export function addOrderAndLimit<Entity extends ObjectLiteral>(request: IRangeRequest, query: SelectQueryBuilder<Entity>, column: string, add?: true) {
  const method = add ? query.addOrderBy : query.orderBy;
  if (request.is_ascending_order == null) {
  } else if (request.is_ascending_order) {
    query = method.call(query, column, 'ASC');
  } else {
    query = method.call(query, column, 'DESC');
  }
  return query.limit(request.limit);
}
