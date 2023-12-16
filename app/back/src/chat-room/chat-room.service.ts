import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRelationship } from '../user/user.entity.js';
import { DataSource, Repository } from 'typeorm';
import {
  ChatRoomMembership,
  ChatLog,
  ChatRoomMembershipKind,
  ChatRoom,
  IChatLog,
  ChatRoomKind,
  IChatRoom,
  IChatRoomMembership,
  IPartialChatRoomMembership,
} from './chat-room.entity.js';
import {
  IRangeRequestWithUserId,
  addOrderAndLimit,
  addWhereCondition,
} from '../utility/range-request.js';
import { genSalt, hash } from 'bcrypt';
import { Cron } from '@nestjs/schedule';
import { UserService } from '../user/user.service.js';
import { ConfigService } from '@nestjs/config';
import { uuidV4, nowInSec, SkyWayAuthToken } from '@skyway-sdk/token';

@Injectable()
export class ChatRoomService {
  constructor(
    configService: ConfigService,
    private dataSource: DataSource,
    private userService: UserService,
    @InjectRepository(UserRelationship)
    private userRelationshipRepository: Repository<UserRelationship>,
    @InjectRepository(ChatRoom)
    private roomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatLog)
    private logRepository: Repository<ChatLog>,
    @InjectRepository(ChatRoomMembership)
    private membershipRepository: Repository<ChatRoomMembership>,
  ) {
    this.#skyway_id = configService.get('SKYWAY_CLIENT_ID') ?? null;
    this.#skyway_secret = configService.get('SKYWAY_CLIENT_SECRET') ?? null;
  }

  #skyway_id: string | null;
  #skyway_secret: string | null;

  async get_belonging_rooms(
    rangeRequest: IRangeRequestWithUserId,
  ): Promise<IChatRoom[]> {
    /*
		WITH "memberships" ("id") AS (SELECT "room_id" FROM "ChatRoomMembership" WHERE "member_id"=$requester_id AND "kind" >= 0)
		SELECT "cr"."id", "cr"."name", "cr"."kind" FROM "ChatRoom" AS "cr" INNER JOIN "memberships" AS "m" ON "cr"."id"="m"."id";
		 */
    const memberships = this.membershipRepository
      .createQueryBuilder()
      .select('room_id')
      .where('member_id = :id', { id: rangeRequest.user_id })
      .andWhere('kind >= 0');
    let query = this.roomRepository
      .createQueryBuilder('cr')
      .addCommonTableExpression(memberships, 'memberships', this.#cteOptions_id)
      .select('cr.id', 'id')
      .addSelect('cr.kind', 'kind')
      .addSelect('cr.name', 'name')
      .addSelect('cr.owner_id', 'owner_id')
      .addSelect('cr.start_inclusive_log_id', 'start_inclusive_log_id')
      .innerJoin('memberships', 'm', 'cr.id=m.id');
    query = addWhereCondition(rangeRequest, query, 'cr.id', true);
    query = addOrderAndLimit(rangeRequest, query, 'cr.id');
    const result = await query.getRawMany<IChatRoom>();
    return result;
  }

  async get_not_member_rooms(
    rangeRequest: IRangeRequestWithUserId,
  ): Promise<IChatRoom[]> {
    const memberships = this.membershipRepository
      .createQueryBuilder()
      .select('room_id')
      .where('member_id = :id', { id: rangeRequest.user_id });
    let query = this.roomRepository
      .createQueryBuilder('cr')
      .addCommonTableExpression(memberships, 'memberships', this.#cteOptions_id)
      .select('cr.id', 'id')
      .addSelect('cr.kind', 'kind')
      .addSelect('cr.name', 'name')
      .addSelect('cr.owner_id', 'owner_id')
      .addSelect('cr.start_inclusive_log_id', 'start_inclusive_log_id')
      .where(
        'cr.kind>0 AND NOT EXISTS (SELECT 1 FROM "memberships" WHERE "memberships"."id"="cr"."id")',
      );
    query = addWhereCondition(rangeRequest, query, 'cr.id', true);
    query = addOrderAndLimit(rangeRequest, query, 'cr.id');
    const result = await query.getRawMany<IChatRoom>();
    return result;
  }

  @Cron('*/10 * * * *')
  async unmute_memberships() {
    const query = this.membershipRepository
      .createQueryBuilder()
      .update()
      .set({
        kind: 1,
      })
      .where('kind=-1');
    const result = await query.execute();
    console.log('cron: 10 minutes update' + JSON.stringify(result));
  }

  async get_membership(
    room_id: number,
    requester_id: number,
  ): Promise<IChatRoomMembership | null> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const membership = (await runner.manager
        .createQueryBuilder(ChatRoomMembership, 'cm')
        .select('id', 'id')
        .addSelect('kind', 'kind')
        .addSelect('end_time', 'end_time')
        .where('room_id=:room_id AND member_id=:requester_id', {
          room_id,
          requester_id,
        })
        .getRawOne()) as IChatRoomMembership | null;
      if (membership == null) {
        await runner.commitTransaction();
        return null;
      }
      await runner.commitTransaction();
      membership.room_id = room_id;
      membership.member_id = requester_id;
      return membership;
    } catch (e) {
      console.error(e);
      await runner.rollbackTransaction();
      return null;
    } finally {
      await runner.release();
    }
  }

  async get_room(
    room_id: number,
    requester_id: number,
  ): Promise<IChatRoom | null> {
    const membership = await this.get_membership(room_id, requester_id);
    if (
      membership != null &&
      membership.kind === ChatRoomMembershipKind.banned
    ) {
      return null;
    }
    const query = this.roomRepository
      .createQueryBuilder()
      .addSelect('kind', 'kind')
      .addSelect('name', 'name')
      .addSelect('owner_id', 'owner_id')
      .addSelect('start_inclusive_log_id', 'start_inclusive_log_id')
      .where('id=:room_id', { room_id });
    const found_room = (await query.getRawOne()) as IChatRoom | null;
    if (found_room == null) {
      return null;
    }
    found_room.id = room_id;
    return found_room;
  }

  async get_room_name(room_id: number): Promise<string | null> {
    const query = this.roomRepository
      .createQueryBuilder()
      .select('name', 'name')
      .where('id=:room_id', { room_id });
    const result = await query.getRawOne();
    if (result == null) {
      return null;
    }
    return result.name;
  }

  async get_members(
    room_id: number,
    requester_id: number,
  ): Promise<IPartialChatRoomMembership[]> {
    const member_id_obj = { member_id: requester_id };
    const enemiesQueryBuilderFrom = this.userRelationshipRepository
      .createQueryBuilder('ur')
      .select('ur.from_id')
      .where('ur.relationship=-1')
      .andWhere('ur.to_id=:member_id', member_id_obj);
    const enemiesQueryBuilderTo = this.userRelationshipRepository
      .createQueryBuilder('ur')
      .select('ur.to_id')
      .where('ur.relationship=-1')
      .andWhere('ur.from_id=:member_id', member_id_obj);
    const query = this.membershipRepository
      .createQueryBuilder('m')
      .addCommonTableExpression(
        enemiesQueryBuilderFrom,
        'enemies_from',
        this.#cteOptions_id,
      )
      .addCommonTableExpression(
        enemiesQueryBuilderTo,
        'enemies_to',
        this.#cteOptions_id,
      )
      .select('m.member_id', 'member_id')
      .addSelect('m.kind', 'kind')
      .where('m.room_id=:room_id AND kind > 0', { room_id })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM "enemies_from" WHERE "enemies_from"."id"="m"."member_id")',
      )
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM "enemies_to" WHERE "enemies_to"."id"="m"."member_id")',
      );
    const result = await query.getRawMany();
    return result;
  }

  async is_administrator(room_id: number, requester_id: number) {
    return await this.membershipRepository
      .createQueryBuilder()
      .select('1')
      .where('room_id=:room_id AND member_id=:requester_id AND kind=2', {
        room_id,
        requester_id,
      })
      .getExists();
  }

  async kick_memberships(
    room_id: number,
    requester_id: number,
    request_target_ids: number[],
  ): Promise<boolean> {
    if (!(await this.is_administrator(room_id, requester_id))) {
      return false;
    }
    const query = this.membershipRepository
      .createQueryBuilder()
      .delete()
      .where(
        'room_id=:room_id AND kind<>2 AND kind<>-2 AND member_id IN (:...request_target_ids)',
        { room_id, request_target_ids },
      );
    const _ = await query.execute();
    if (
      request_target_ids.length > 0 &&
      (request_target_ids.length !== 1 ||
        request_target_ids[0] !== requester_id)
    ) {
      await this.userService.notify(
        request_target_ids,
        `Kicked out from <a href="/chat/${room_id}">${await this.get_room_name(
          room_id,
        )}</a>`,
      );
    }
    return true;
  }

  async ban_memberships(
    room_id: number,
    requester_id: number,
    request_target_ids: number[],
  ): Promise<boolean> {
    if (!(await this.is_administrator(room_id, requester_id))) {
      return false;
    }
    const query = this.membershipRepository
      .createQueryBuilder()
      .update()
      .set({
        kind: ChatRoomMembershipKind.banned,
      })
      .where(
        'room_id=:room_id AND kind<>2 AND kind<>-2 AND member_id IN (:...request_target_ids)',
        { room_id, request_target_ids },
      );
    const _ = await query.execute();
    return true;
  }

  async invite_memberships(
    room_id: number,
    requester_id: number,
    request_target_ids: number[],
  ): Promise<boolean> {
    if (!(await this.is_administrator(room_id, requester_id))) {
      return false;
    }
    const insertValues = request_target_ids.map((value, _index, _array) => {
      return {
        room_id,
        member_id: value,
        kind: ChatRoomMembershipKind.invited,
        end_time: -1,
      };
    });
    try {
      const insertionResults =
        await this.membershipRepository.insert(insertValues);
      if (request_target_ids.length > 0) {
        await this.userService.notify(
          request_target_ids,
          `You are invited to <a href="/chat/${room_id}">${await this.get_room_name(
            room_id,
          )}</a>`,
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  async join_membership(
    room_id: number,
    requester_id: number,
    password?: string,
  ) {
    try {
      const query = this.roomRepository
        .createQueryBuilder()
        .select('kind', 'kind')
        .addSelect('salt', 'salt')
        .addSelect('password', 'password')
        .where('id=:room_id', { room_id });
      const result:
        | {
            kind: 0 | 2;
            salt: null;
            password: null;
          }
        | {
            kind: 1;
            salt: string;
            password: string;
          }
        | null = await query.getRawOne();
      if (result === null) {
        return false;
      }
      switch (result.kind) {
        case 0:
          await this.membershipRepository.update(
            {
              room_id: room_id,
              member_id: requester_id,
              kind: ChatRoomMembershipKind.invited,
            },
            { kind: ChatRoomMembershipKind.member },
          );
          return true;
        case 1:
          if (
            password == null ||
            (await hash(password, result.salt)) !== result.password
          ) {
            return false;
          }
          const insertionResult1 = await this.membershipRepository.insert({
            member_id: requester_id,
            room_id: room_id,
            kind: ChatRoomMembershipKind.member,
            end_time: -1,
          });
          console.log(insertionResult1);
          return true;
        case 2:
          const insertionResult2 = await this.membershipRepository.insert({
            member_id: requester_id,
            room_id: room_id,
            kind: ChatRoomMembershipKind.member,
            end_time: -1,
          });
          console.log(insertionResult2);
          const found2 = await this.membershipRepository.findOneBy({
            member_id: requester_id,
            room_id,
          });
          console.log(found2);
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async reject_invitation(room_id: number, requester_id: number) {
    const query = this.membershipRepository
      .createQueryBuilder()
      .delete()
      .where('room_id=:room_id AND member_id=:requester_id AND kind=0', {
        room_id,
        requester_id,
      });
    await query.execute();
  }

  async appoint_administrators(
    room_id: number,
    requester_id: number,
    request_target_ids: number[],
  ): Promise<boolean> {
    if (!(await this.is_administrator(room_id, requester_id))) {
      return false;
    }
    const query = this.membershipRepository
      .createQueryBuilder()
      .update()
      .set({ kind: ChatRoomMembershipKind.administrator })
      .where(
        'room_id=:room_id AND kind=1 AND member_id IN (:...request_target_ids)',
        { room_id, request_target_ids },
      );
    await query.execute();
    if (request_target_ids.length > 0) {
      await this.userService.notify(
        request_target_ids,
        `You are appointed to be an administrator of <a href="/chat/${room_id}">${await this.get_room_name(
          room_id,
        )}</a>`,
      );
    }
    return true;
  }

  async mute_memberships(
    room_id: number,
    requester_id: number,
    request_target_ids: number[],
    end_time_utc_seconds: number,
  ): Promise<boolean> {
    if (!(await this.is_administrator(room_id, requester_id))) {
      return false;
    }
    const query = this.membershipRepository
      .createQueryBuilder()
      .update()
      .set({
        kind: ChatRoomMembershipKind.muted,
        end_time: end_time_utc_seconds,
      })
      .where(
        'room_id=:room_id AND kind=1 AND member_id IN (:...request_target_ids)',
        { room_id, request_target_ids },
      );
    await query.execute();
    return true;
  }

  async set_password(
    room_id: number,
    requester_id: number,
    password: string | Buffer,
  ): Promise<boolean> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const room = await runner.manager
        .createQueryBuilder(ChatRoom, 'cr')
        .select()
        .where('id=:room_id AND owner_id=:requester_id', {
          room_id,
          requester_id,
        })
        .getOneOrFail();
      room.salt = await genSalt();
      room.password = await hash(password, room.salt);
      await runner.manager
        .createQueryBuilder(ChatRoom, 'cr')
        .update()
        .set({ password: room.password, salt: room.salt })
        .where('id=:room_id', { room_id })
        .execute();
      await runner.commitTransaction();
    } catch (e) {
      await runner.rollbackTransaction();
      return false;
    } finally {
      await runner.release();
    }
    return true;
  }

  async make_public(room_id: number, requester_id: number) {
    const room = await this.roomRepository.findOneBy({
      id: room_id,
      owner_id: requester_id,
    });
    if (!room) return false;
    room.salt = null;
    room.password = null;
    await this.roomRepository.save(room);
    return true;
  }

  async make_private(room_id: number, requester_id: number) {
    const room = await this.roomRepository.findOneBy({
      id: room_id,
      owner_id: requester_id,
    });
    if (!room) return false;
    room.salt = null;
    room.password = null;
    await this.roomRepository.save(room);
    return true;
  }

  #cteOptions_id = {
    columnNames: ['id'],
  };

  async get_logs(
    request: IRangeRequestWithUserId,
    room_id: number,
  ): Promise<IChatLog[] | null> {
    const membership = await this.get_membership(room_id, request.user_id);
    if (membership == null || membership.kind < ChatRoomMembershipKind.member) {
      return null;
    }
    const enemiesQueryBuilderFrom = this.userRelationshipRepository
      .createQueryBuilder('ur')
      .select('ur.from_id')
      .where('ur.relationship=-1')
      .andWhere('ur.to_id=:member_id', { member_id: request.user_id });
    const enemiesQueryBuilderTo = this.userRelationshipRepository
      .createQueryBuilder('ur')
      .select('ur.to_id')
      .where('ur.relationship=-1')
      .andWhere('ur.from_id=:member_id', { member_id: request.user_id });
    let query = this.logRepository
      .createQueryBuilder('log')
      .addCommonTableExpression(
        enemiesQueryBuilderFrom,
        'enemies_from',
        this.#cteOptions_id,
      )
      .addCommonTableExpression(
        enemiesQueryBuilderTo,
        'enemies_to',
        this.#cteOptions_id,
      )
      .select('log.id', 'id')
      .addSelect('log.member_id', 'member_id')
      .addSelect('log.content', 'content')
      .addSelect('log.date', 'date')
      .addSelect('log.is_html', 'is_html')
      .where('log.room_id=:room_id', { room_id })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM "enemies_from" WHERE "enemies_from"."id"="log"."member_id")',
      )
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM "enemies_to" WHERE "enemies_to"."id"="log"."member_id")',
      );
    query = addWhereCondition(request, query, 'log.id', true);
    query = addOrderAndLimit(request, query, 'log.id');
    return await query.getRawMany<IChatLog>();
  }

  async create(
    requester_id: number,
    kind: ChatRoomKind,
    name: string,
  ): Promise<number> {
    const query = this.roomRepository
      .createQueryBuilder()
      .insert()
      .values({
        kind,
        owner_id: requester_id,
        name,
        salt: null,
        password: null,
        start_inclusive_log_id: null,
      })
      .returning('id');
    const result = await query.execute();
    const room_id = result.generatedMaps[0].id as number;
    console.log(`created chat room: ${room_id}`);
    await this.membershipRepository.insert({
      room_id,
      member_id: requester_id,
      kind: ChatRoomMembershipKind.administrator,
      end_time: 0,
    });
    return room_id;
  }

  async update(
    room_id: number,
    requester_id: number,
    kind: ChatRoomKind,
    name: string,
  ) {
    const query = this.roomRepository
      .createQueryBuilder()
      .update()
      .set({ kind, name })
      .where('id=:room_id AND owner_id=:requester_id', {
        room_id,
        requester_id,
      });
    const result = await query.execute();
  }

  async add_log(
    room_id: number,
    requester_id: number,
    content: string,
  ): Promise<number> {
    const membership = await this.get_membership(room_id, requester_id);
    if (
      membership === null ||
      membership.kind < ChatRoomMembershipKind.member
    ) {
      throw new UnauthorizedException();
    }
    const date = Math.ceil(Date.now() / 1000);
    const result = await this.logRepository
      .createQueryBuilder()
      .insert()
      .values({
        content,
        date,
        member_id: requester_id,
        room_id,
      })
      .returning('id')
      .execute();
    const log_id = result.generatedMaps[0].id;
    const updateQuery = this.roomRepository
      .createQueryBuilder()
      .update()
      .set({
        start_inclusive_log_id: log_id,
      })
      .where('id=:room_id AND start_inclusive_log_id IS NULL', { room_id });
    await updateQuery.execute();
    const members = (await this.get_members(room_id, requester_id)).map(
      (value) => value.member_id,
    );
    const foundIndex = members.findIndex((value) => value === requester_id);
    if (foundIndex >= 0) {
      members.splice(foundIndex, 1);
    }
    if (members.length > 0) {
      await this.userService.notify(
        members,
        `New Comment@<a href="/chat/${room_id}">${await this.get_room_name(
          room_id,
        )}</a>`,
      );
    }
    return log_id;
  }

  public async get_skyway_token(requester_id: number) {
    if (this.#skyway_id === null || this.#skyway_secret === null) {
      return null;
    }
    if (!(await this.userService.get_existence(requester_id))) {
      return null;
    }
    const now = nowInSec();
    const token = new SkyWayAuthToken({
      iat: now,
      exp: now + 3600 * 24 * 2,
      jti: uuidV4(),
      scope: {
        app: {
          id: this.#skyway_id,
          actions: ['read'],
          turn: false,
          channels: [
            {
              name: '*',
              actions: ['write'],
              members: [
                {
                  name: `user-${requester_id}`,
                  actions: ['write'],
                  publication: {
                    actions: ['write'],
                  },
                  subscription: {
                    actions: ['write'],
                  },
                },
              ],
            },
          ],
        },
      },
    }).encode(this.#skyway_secret);
    return token;
  }
}
