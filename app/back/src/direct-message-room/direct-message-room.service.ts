import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DirectMessageLog,
  DirectMessageRoom,
  DirectMessageRoomMembership,
  IDirectMessageLog,
  IDirectMessageRoom,
} from '../direct-message-room/direct-message-room.entity.js';
import { DataSource, Repository } from 'typeorm';
import { User, UserRelationship } from '../user/user.entity.js';
import {
  IRangeRequest,
  IRangeRequestWithUserId,
  addOrderAndLimit,
  addWhereCondition,
} from '../utility/range-request.js';
import { UserService } from '../user/user.service.js';

@Injectable()
export class DirectMessageRoomService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(UserRelationship)
    private relationshipRepository: Repository<UserRelationship>,
    @InjectRepository(DirectMessageRoom)
    private roomRepository: Repository<DirectMessageRoom>,
    @InjectRepository(DirectMessageRoomMembership)
    private membershipRepository: Repository<DirectMessageRoomMembership>,
    @InjectRepository(DirectMessageLog)
    private logRepository: Repository<DirectMessageLog>,
    private userService: UserService,
  ) {}

  async get_logs(
    room_id: number,
    rangeRequest: IRangeRequestWithUserId,
  ): Promise<IDirectMessageLog[]> {
    const hide_log_id = await this.get_hide_log_id(
      room_id,
      rangeRequest.user_id,
    );
    let query = this.logRepository
      .createQueryBuilder('l')
      .select('l.id', 'id')
      .addSelect('l.room_id', 'room_id')
      .addSelect('l.member_id', 'member_id')
      .addSelect('l.content', 'content')
      .addSelect('l.date', 'date')
      .addSelect('l.is_html', 'is_html')
      .addSelect('l.is_liked', 'is_liked')
      .where('l.room_id=:room_id AND l.id > :hide_log_id', {
        room_id,
        hide_log_id,
      });
    query = addWhereCondition(rangeRequest, query, 'id', true);
    query = addOrderAndLimit(rangeRequest, query, 'id');
    const answer = await query.getRawMany();
    return answer;
  }

  async get_rooms(request: IRangeRequestWithUserId): Promise<
    {
      room_id: number;
      counterpart_id: number;
      counterpart_name: string;
      last_log_id: number;
      hide_log_id: number;
    }[]
  > {
    const relationship_query0 = this.relationshipRepository
      .createQueryBuilder()
      .select('to_id')
      .where('from_id=:requester_id AND relationship < 0', {
        requester_id: request.user_id,
      });
    const relationship_query1 = this.relationshipRepository
      .createQueryBuilder()
      .select('from_id')
      .where('to_id=:requester_id AND relationship < 0', {
        requester_id: request.user_id,
      });
    let query = this.membershipRepository
      .createQueryBuilder('a')
      .addCommonTableExpression(relationship_query0, 'r0', {
        columnNames: ['id'],
      })
      .addCommonTableExpression(relationship_query1, 'r1', {
        columnNames: ['id'],
      })
      .select('a.room_id', 'room_id')
      .addSelect('b.user_id', 'counterpart_id')
      .addSelect('u.displayName', 'counterpart_name')
      .addSelect('max(l.id) OVER (PARTITION BY l.room_id)', 'last_log_id')
      .addSelect('a.hide_log_id', 'hide_log_id')
      .distinctOn(['room_id'])
      .innerJoin(DirectMessageRoomMembership, 'b', 'a.room_id=b.room_id')
      .innerJoin(User, 'u', 'u.id=b.user_id')
      .innerJoin(DirectMessageLog, 'l', 'l.room_id=b.room_id')
      .where(
        'a.user_id = :requester_id AND b.user_id <> :requester_id' +
          ' AND NOT EXISTS (SELECT 1 FROM r0 WHERE r0.id=b.user_id)' +
          ' AND NOT EXISTS (SELECT 1 FROM r1 WHERE r1.id=b.user_id)',
        { requester_id: request.user_id },
      );
    query = addWhereCondition(request, query, 'a.room_id', true);
    query = addOrderAndLimit(request, query, 'a.room_id');
    const result = await query.getRawMany();
    return result;
  }

  async get_room(room_id: number): Promise<IDirectMessageRoom | null> {
    const query = this.roomRepository
      .createQueryBuilder()
      .select('id', 'id')
      .addSelect('start_inclusive_log_id', 'start_inclusive_log_id')
      .where('id=:room_id', { room_id });
    const answer = await query.getRawOne();
    return answer;
  }

  async get_room_id(
    requester_id: number,
    counterpart_id: number,
  ): Promise<number | null> {
    if (requester_id === counterpart_id) return null;
    const query = this.membershipRepository
      .createQueryBuilder('a')
      .select('a.room_id', 'id')
      .innerJoin(DirectMessageRoomMembership, 'b', 'a.room_id=b.room_id')
      .where('a.user_id=:requester_id AND b.user_id=:counterpart_id', {
        requester_id,
        counterpart_id,
      });
    const result = await query.getRawOne();
    return result?.id;
  }

  async get_counterpart_id(
    requester_id: number,
    room_id: number,
  ): Promise<number | null> {
    const query = this.membershipRepository
      .createQueryBuilder()
      .select('user_id', 'user_id')
      .where('room_id=:room_id AND user_id <> :requester_id', {
        requester_id,
        room_id,
      });
    const result = await query.getRawOne();
    return result?.user_id;
  }

  async is_member(requester_id: number, room_id: number) {
    return await this.membershipRepository.exist({
      where: {
        room_id,
        user_id: requester_id,
      },
    });
  }

  async add_log(
    requester_id: number,
    room_id: number,
    content: string,
  ): Promise<number | null> {
    if (content.length === 0) {
      return null;
    }
    if (!(await this.is_member(requester_id, room_id))) {
      return null;
    }
    const now = Math.ceil(Date.now() / 1000);
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const result = await runner.manager
        .createQueryBuilder(DirectMessageLog, 'dl')
        .insert()
        .values({
          member_id: requester_id,
          room_id,
          content,
          date: now,
        })
        .returning('dl.id')
        .execute();
      if (result.generatedMaps.length === 0) {
        await runner.commitTransaction();
        return null;
      }
      for (const key in result.generatedMaps[0]) {
        console.log(key);
      }
      const start_inclusive_log_id = result.generatedMaps[0].id as number;
      await runner.manager
        .createQueryBuilder(DirectMessageRoom, 'dr')
        .update()
        .set({
          start_inclusive_log_id,
        })
        .where(
          'id=:room_id AND (start_inclusive_log_id = -1 OR start_inclusive_log_id > :start_inclusive_log_id )',
          {
            room_id,
            start_inclusive_log_id,
          },
        )
        .execute();
      await runner.commitTransaction();
      const counterpart_id = await this.get_counterpart_id(
        requester_id,
        room_id,
      );
      await this.userService.notify(
        counterpart_id,
        `New Message from <a href="/home/direct-message/${requester_id}">${await this.userService.get_display_name(
          requester_id,
        )}</a>`,
      );
      return start_inclusive_log_id;
    } catch (e) {
      console.error(e);
      await runner.rollbackTransaction();
    } finally {
      await runner.release();
    }
  }

  async ensure_room_existence(
    requester_id: number,
    counterpart_id: number,
  ): Promise<IDirectMessageRoom | null> {
    if (requester_id === counterpart_id) return null;
    const found = await this.get_room_id(requester_id, counterpart_id);
    if (found != null) {
      return await this.get_room(found);
    }
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const newest_log_id = (
        await runner.manager
          .createQueryBuilder(DirectMessageLog, 'dl')
          .select('id')
          .orderBy('id', 'DESC')
          .getRawOne()
      )?.id;
      const query0 = runner.manager
        .createQueryBuilder(DirectMessageRoom, 'dr')
        .insert()
        .values({
          start_inclusive_log_id: newest_log_id ?? -1,
        })
        .returning(['dr.id', 'dr.start_inclusive_log_id']);
      const newRoomResult = await query0.execute();
      const newRoom = newRoomResult.generatedMaps[0] as IDirectMessageRoom;
      const query1 = runner.manager
        .createQueryBuilder(DirectMessageRoomMembership, 'm')
        .insert()
        .values([
          { room_id: newRoom.id, user_id: requester_id },
          { room_id: newRoom.id, user_id: counterpart_id },
        ]);
      await query1.execute();
      await runner.commitTransaction();
      return newRoom;
    } catch (e) {
      console.error(e);
      await runner.rollbackTransaction();
    } finally {
      await runner.release();
    }
    return null;
  }

  async delete(room_id: number) {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.manager
        .createQueryBuilder(DirectMessageLog, 'l')
        .delete()
        .where('l.room_id=:room_id', { room_id })
        .execute();
      await runner.manager
        .createQueryBuilder(DirectMessageRoomMembership, 'm')
        .delete()
        .where('m.room_id=:room_id', { room_id })
        .execute();
      await runner.manager
        .createQueryBuilder(DirectMessageRoom, 'r')
        .delete()
        .where('r.id=:room_id', { room_id })
        .execute();
      await runner.commitTransaction();
    } catch {
      await runner.rollbackTransaction();
    } finally {
      await runner.release();
    }
  }

  async get_hide_log_id(requester_id: number, room_id: number) {
    const query = this.membershipRepository
      .createQueryBuilder()
      .select('hide_log_id', 'hide_log_id')
      .where('room_id=:room_id AND user_id=:requester_id', {
        room_id,
        requester_id,
      });
    const result = await query.getRawOne();
    if (result == null) {
      return -1;
    }
    return result.hide_log_id;
  }

  async set_hide_log_id(requester_id: number, room_id: number, log_id: number) {
    await this.membershipRepository.update(
      {
        user_id: requester_id,
        room_id: room_id,
      },
      {
        hide_log_id: log_id,
      },
    );
  }

  async like_log(log_id: number, is_liked: boolean) {
	  await this.logRepository.update(
      {
        id: log_id,
      },
      {
        is_liked: is_liked,
      },
    );
  }

  async get_log(log_id: number) {
    return await this.logRepository.findOne({ where: { id: log_id } });
  }
}
