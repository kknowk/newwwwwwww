import { BadRequestException, Injectable } from '@nestjs/common';
import {
  IUser,
  User,
  User42Cross,
  UserDetailInfo,
  UserRelationship,
  UserRelationshipKind,
  IUserWithRelationship,
  UserActivityKind,
  Notice,
} from './user.entity.js';
import { InsertResult, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GameLog } from '../game/game.entity.js';
import * as address from 'email-addresses';
import { fileTypeFromBuffer } from 'file-type';
import { ConfigService } from '@nestjs/config';
import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import {
  IRangeRequestWithUserId,
  addWhereCondition,
  addOrderAndLimit,
} from '../utility/range-request.js';
import { InsertQueryBuilder } from 'typeorm/browser';
import { genSalt, hash } from 'bcrypt';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { imageSize } from 'image-size';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(User42Cross)
    private user42CrossRepository: Repository<User42Cross>,
    @InjectRepository(UserRelationship)
    private userRelationshipRepository: Repository<UserRelationship>,
    @InjectRepository(UserDetailInfo)
    private userDetailInfoRepository: Repository<UserDetailInfo>,
    @InjectRepository(GameLog)
    private gameLogRepository: Repository<GameLog>,
    @InjectRepository(Notice)
    private noticeRepository: Repository<Notice>,
    private configService: ConfigService,
  ) {}

  #calc_time = () => {
    return Math.floor(Date.now() / 1000);
  };

  public async findOrCreate(
    id_42: string,
    loginName: string,
    email: string,
  ): Promise<IUser> {
    const found_user_id = await this.user42CrossRepository.findOneBy({
      id_42,
    });
    if (found_user_id != null) {
      const found_user = await this.findById(found_user_id.id);
      return found_user;
    }
    const tmpUser = new User();
    tmpUser.last_activity_timestamp = this.#calc_time();
    tmpUser.displayName = await this.#get_displayable_name(loginName);
    const user = await this.userRepository.save(tmpUser);
    await this.user42CrossRepository.save({ id_42: id_42, id: user.id });
    await this.userDetailInfoRepository.save({ id: user.id, email });
    const answer: IUser & {
      new?: true;
    } = user.to_interface();
    answer.new = true;
    try {
      await this.createFirstIcon(user.id);
    } finally {
      return answer;
    }
  }

  private async createFirstIcon(id: number) {
    const canvas = createCanvas(400, 400);
    const context = canvas.getContext('2d');
    context.font = 'bold 64px sans-serif';
    const randomColor =
      '#' +
      Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0');
    context.fillStyle = randomColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(id.toString(), 200, 200);
    const buffer = await canvas.encode('png');
    const path = join(__dirname, '..', '..', 'images', `icon-${id}.png`);
    await writeFile(path, buffer, {
      encoding: 'binary',
    });
  }

  public async isValidPngFile(file: Buffer) {
    const array = new Uint8Array(file);
    const type = await fileTypeFromBuffer(array);
    if (type.ext !== 'png' && type.mime !== 'image/png') {
      return false;
    }
    const size = imageSize(file);
    return size.width === size.height && size.width === 400;
  }

  public async test_find_or_create(
    id: number,
    displayName: string,
  ): Promise<IUser> {
    const found_user = await this.userRepository.findOneBy({ id: id });
    if (found_user) {
      return found_user.to_interface();
    }
    const tmpUser = new User();
    tmpUser.last_activity_timestamp = this.#calc_time();
    tmpUser.activity_kind = UserActivityKind.login;
    tmpUser.displayName = await this.#get_displayable_name(displayName);
    const user = await this.userRepository.save(tmpUser);
    const answer: IUser & {
      new?: true;
    } = user.to_interface();
    answer.new = true;
    try {
      await this.createFirstIcon(user.id);
    } finally {
      return answer;
    }
  }

  async #get_displayable_name(name: string): Promise<string> {
    let index: number = -1;
    const original_name = name;
    while (
      await this.userRepository.exist({
        where: {
          displayName: name,
        },
      })
    ) {
      name = original_name + '_' + (++index).toString();
      console.log(name);
    }
    return name;
  }

  public async update_user_activity(
    id: number,
    kind?: UserActivityKind,
  ): Promise<number> {
    const time = this.#calc_time();
    if (kind == null) {
      await this.userRepository.update(
        { id: id },
        { last_activity_timestamp: time },
      );
    } else {
      await this.userRepository.update(
        { id: id },
        { last_activity_timestamp: time, activity_kind: kind },
      );
    }
    return time;
  }

  public async get_friends(
    request: IRangeRequestWithUserId,
  ): Promise<
    Omit<
      IUser,
      'two_factor_authentication_required' | 'is_two_factor_authenticated'
    >[]
  > {
    /*
    WITH "friends"("id") AS (SELECT "to_id" FROM "UserRelationship" WHERE "from_id"=$id AND "relationship"=1)
    SELECT * FROM "User" AS "u" INNER JOIN "friends" AS "f" ON "u"."id"="f"."id";
    */
    const query = this.userRelationshipRepository
      .createQueryBuilder()
      .select('to_id')
      .distinctOn(['to_id'])
      .where('from_id=:id', { id: request.user_id })
      .andWhere('relationship=1');
    const userQuery = this.userRepository
      .createQueryBuilder('u')
      .addCommonTableExpression(query, 'friends', { columnNames: ['id'] })
      .select('u.id', 'id')
      .addSelect('u.displayName', 'displayName')
      .addSelect('u.last_activity_timestamp', 'last_activity_timestamp')
      .addSelect('u.activity_kind', 'activity_kind')
      .addSelect('u.notice_read_id', 'notice_read_id')
      .distinctOn(['u.id'])
      .innerJoin('friends', 'f', 'u.id=f.id');
    const users = await userQuery.getRawMany();
    return users;
  }

  public async findById(
    id: number,
    update_activity?: true,
  ): Promise<IUser | null> {
    if (update_activity) {
      this.userRepository.createQueryBuilder().update({
        last_activity_timestamp: this.#calc_time(),
        activity_kind: () =>
          'CASE WHEN "activity_kind" > 1 THEN "activity_kind" ELSE 1 END',
      });
    }
    const user = await this.userRepository.findOneBy({ id });
    return user?.to_interface();
  }

  public async get_lowest_relationship(
    id0: number,
    id1: number,
  ): Promise<UserRelationshipKind> {
    const literal = await this.userRelationshipRepository
      .createQueryBuilder()
      .select('MIN(relationship)', 'value')
      .where('(from_id=:id0 AND to_id=:id1) OR (from_id=:id1 AND to_id=:id0)', {
        id0,
        id1,
      })
      .getRawOne();
    return literal?.value ?? UserRelationshipKind.stranger;
  }

  public async set_relationship(
    requester_id: number,
    target_id: number,
    relationship: UserRelationshipKind,
  ) {
    const result: InsertResult = await this.userRelationshipRepository.upsert(
      {
        from_id: requester_id,
        to_id: target_id,
        relationship: relationship,
      },
      {
        upsertType: 'on-conflict-do-update',
        skipUpdateIfNoValuesChanged: true,
        conflictPaths: {
          from_id: true,
          to_id: true,
        },
      },
    );
  }

  public async set_two_factor_authentication_required(
    user_id: number,
    two_factor_authentication_required: boolean,
  ) {
    await this.userRepository.update(
      {
        id: user_id,
      },
      {
        two_factor_authentication_required: two_factor_authentication_required,
        last_activity_timestamp: this.#calc_time(),
      },
    );
  }

  public async set_display_name(user_id: number, name: string) {
    if (name.length === 0 || name.length > 16) {
      throw new BadRequestException('invalid name');
    }
    const result = (
      await this.userRepository
        .createQueryBuilder()
        .update()
        .set({
          displayName: name,
          last_activity_timestamp: this.#calc_time(),
        })
        .where('id=:id', { id: user_id })
        .returning('displayName')
        .execute()
    ).generatedMaps;
  }

  public async get_email(user_id: number) {
    const email = (
      await this.userDetailInfoRepository
        .createQueryBuilder()
        .select('email')
        .where('id=:user_id', { user_id })
        .getRawOne()
    )?.email;
    if (typeof email !== 'string') return null;
    return email;
  }

  public async set_email(user_id: number, email: string) {
    const result = address.default.parseOneAddress(email);
    if (result == null) {
      throw new BadRequestException('invalid email');
    }
    const exe_result = await this.userDetailInfoRepository
      .createQueryBuilder()
      .update()
      .set({ email })
      .where('id=:id', { id: user_id })
      .returning('id')
      .execute();
    return exe_result.generatedMaps.length;
  }

  public async find_by_partial_name(
    request: IRangeRequestWithUserId,
    name: string,
  ): Promise<IUserWithRelationship[]> {
    /*
    SELECT * FROM "User" LEFT JOIN "UserRelationship" ON "User"."Id" = "UserRelationship"."to_id" AND "UserRelationship"."to_id"
      WHERE "u.displayName" LIKE "%:name%";
    */
    let query = this.userRepository
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect('u.displayName', 'displayName')
      .addSelect('COALESCE(ur.ur_relationship, 0)', 'relationship')
      .distinctOn(['u.id'])
      .leftJoin(
        (qb) =>
          qb
            .select(['ur.relationship', 'ur.to_id', 'ur.from_id'])
            .from(UserRelationship, 'ur'),
        'ur',
        'ur.ur_to_id=u.id AND ur.ur_from_id=:user_id',
        { user_id: request.user_id },
      )
      .where("u.displayName LIKE ('%' || :name || '%')", { name });
    query = addWhereCondition(request, query, 'u.id', true);
    query = addOrderAndLimit(request, query, 'u.id');
    return await query.getRawMany();
  }

  public async get_existence(user_id: number) {
    return await this.userRepository.exist({ where: { id: user_id } });
  }

  public async get_display_name(user_id: number): Promise<string | null> {
    const query = this.userRepository
      .createQueryBuilder('u')
      .select('u.displayName', 'displayName')
      .where('u.id=:user_id', { user_id });
    const result = await query.getRawOne();
    if (result == null) {
      return null;
    }
    return result.displayName;
  }

  public async get_display_names(
    user_ids: number[],
  ): Promise<{ id: number; displayName: string }[]> {
    const query = this.userRepository
      .createQueryBuilder('u')
      .addSelect('u.id', 'id')
      .select('u.displayName', 'displayName')
      .where('u.id IN (:...user_ids)', { user_ids });
    const result = await query.getRawMany();
    return result;
  }

  public async get_users(
    requester_id: number,
    user_ids: number[],
  ): Promise<IUserWithRelationship[]> {
    const query = this.userRepository
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect('u.displayName', 'displayName')
      .addSelect('COALESCE(ur.ur_relationship, 0)', 'relationship')
      .distinctOn(['u.id'])
      .leftJoin(
        (qb) =>
          qb
            .select(['ur.relationship', 'ur.to_id', 'ur.from_id'])
            .from(UserRelationship, 'ur'),
        'ur',
        'ur.ur_to_id=u.id AND ur.ur_from_id=:user_id',
        { user_id: requester_id },
      )
      .where('1')
      .whereInIds(user_ids);
    const result = await query.getRawMany();
    return result;
  }

  public async notify(user_id: number | number[], content: string) {
    let query: InsertQueryBuilder<any>;
    const date = Math.floor(Date.now() / 1000);
    if (typeof user_id === 'number') {
      query = this.noticeRepository.createQueryBuilder().insert().values({
        user_id,
        content,
        date,
      });
    } else if (user_id instanceof Array) {
      if (user_id.length === 0) {
        return;
      }
      query = this.noticeRepository
        .createQueryBuilder()
        .insert()
        .values(
          user_id.map((value) => {
            return {
              user_id: value,
              content,
              date,
            };
          }),
        )
        .returning([]);
    } else {
      return;
    }
    await query.execute();
  }

  public async get_notice(rangeRequest: IRangeRequestWithUserId): Promise<
    [
      {
        id: number;
        content: string;
        date: number;
      }[],
      number,
    ]
  > {
    let query = this.noticeRepository
      .createQueryBuilder()
      .select('id', 'id')
      .addSelect('content', 'content')
      .addSelect('date', 'date')
      .where('user_id=:user_id', { user_id: rangeRequest.user_id });
    query = addWhereCondition(rangeRequest, query, 'id', true);
    query = addOrderAndLimit(rangeRequest, query, 'id');
    const result = await query.getRawMany<{
      id: number;
      content: string;
      date: number;
    }>();
    let maxId: number = -1;
    for (const { id } of result) {
      if (id > maxId) {
        maxId = id;
      }
    }
    const updateQuery = this.userRepository
      .createQueryBuilder()
      .update()
      .set({
        notice_read_id: maxId,
      })
      .where('id=:id AND :maxId > notice_read_id', {
        id: rangeRequest.user_id,
        maxId,
      });
    await updateQuery.execute();
    return [result, maxId];
  }

  public async get_notice_count(rangeRequest: IRangeRequestWithUserId) {
    let query = this.noticeRepository
      .createQueryBuilder()
      .select('1')
      .where('user_id=:user_id', { user_id: rangeRequest.user_id });
    query = addWhereCondition(rangeRequest, query, 'id', true);
    query = addOrderAndLimit(rangeRequest, query, 'id');
    const result = await query.getCount();
    return result;
  }

  public async clear_notice(requester_id: number) {
    const { notice_read_id } = await this.userRepository
      .createQueryBuilder()
      .select('notice_read_id', 'notice_read_id')
      .where('id=:requester_id', { requester_id })
      .getRawOne();
    const query = this.noticeRepository
      .createQueryBuilder()
      .delete()
      .where('user_id=:requester_id AND id<=:notice_read_id', {
        requester_id,
        notice_read_id,
      });
    await query.execute();
  }

  public async set_2fa_temp(requester_id: number, value: string | Buffer) {
    const newSalt = await genSalt();
    const validEnd = Math.floor(Date.now() / 1000) + 60 * 10 * 1000;
    const newHash = await hash(value, newSalt);
    const query = this.userRepository
      .createQueryBuilder()
      .update()
      .set({
        two_factor_temp: newHash,
        two_factor_salt: newSalt,
        two_factor_valid_limit: validEnd,
      })
      .where('id=:requester_id AND two_factor_authentication_required', {
        requester_id,
      });
    await query.execute();
  }

  public async compare_2fa(
    requester_id: number,
    value: string | Buffer,
  ): Promise<boolean | null> {
    const query = this.userRepository
      .createQueryBuilder()
      .select('two_factor_temp', 'two_factor_temp')
      .addSelect('two_factor_salt', 'two_factor_salt')
      .addSelect('two_factor_valid_limit', 'two_factor_valid_limit')
      .where('id=:requester_id AND two_factor_authentication_required', {
        requester_id,
      });
    const result = await query.getRawOne();
    if (result == null) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (now > result.two_factor_valid_limit) {
      return false;
    }
    const hashed = await hash(value, result.two_factor_salt);
    const compareResult = hashed === result.two_factor_temp;
    return compareResult;
  }

  public async get_game_result_counts(user_id: number) {
    const win_query = this.gameLogRepository
      .createQueryBuilder()
      .select('count(distinct date)', 'count')
      .where('winner_id=:user_id', { user_id });
    const lose_query = this.gameLogRepository
      .createQueryBuilder()
      .select('count(distinct date)', 'count')
      .where('loser_id=:user_id', { user_id });
    const [win, lose] = await Promise.all([
      win_query.getRawOne() as Promise<{ count: number }>,
      lose_query.getRawOne() as Promise<{ count: number }>,
    ]);
    return {
      win: win.count,
      lose: lose.count,
    };
  }

  public async get_game_logs(
    rangeRequest: IRangeRequestWithUserId,
  ): Promise<{ id: number; date: number; name: string; win: boolean }[]> {
    rangeRequest.is_ascending_order = undefined;
    let win_query = this.gameLogRepository
      .createQueryBuilder('l')
      .addSelect('l.loser_id', 'id')
      .addSelect('l.date', 'date')
      .addSelect('u.displayName', 'name')
      .distinctOn(['l.date'])
      .innerJoin(User, 'u', 'u.id=l.loser_id')
      .where('l.winner_id=:user_id', { user_id: rangeRequest.user_id });
    win_query = addWhereCondition(rangeRequest, win_query, 'date', true);
    win_query = addOrderAndLimit(rangeRequest, win_query, 'date');
    let lose_query = this.gameLogRepository
      .createQueryBuilder('l')
      .select('l.winner_id', 'id')
      .addSelect('l.date', 'date')
      .addSelect('u.displayName', 'name')
      .distinctOn(['l.date'])
      .innerJoin(User, 'u', 'u.id=l.winner_id')
      .where('l.loser_id=:user_id', { user_id: rangeRequest.user_id });
    lose_query = addWhereCondition(rangeRequest, lose_query, 'date', true);
    lose_query = addOrderAndLimit(rangeRequest, lose_query, 'date');
    const wins: { id: number; date: number; name: string; win: boolean }[] =
      await win_query.getRawMany();
    const loses: { id: number; date: number; name: string; win: boolean }[] =
      await lose_query.getRawMany();
    for (const iterator of wins) {
      iterator.win = true;
    }
    for (const iterator of loses) {
      iterator.win = false;
    }
    wins.push(...loses);
    wins.sort((a, b) => {
      if (a.date < b.date) {
        return 1;
      } else if (a.date === b.date) {
        return 0;
      } else {
        return -1;
      }
    });
    return wins;
  }
}
