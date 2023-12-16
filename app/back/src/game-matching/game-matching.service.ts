import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { GameMatchingRequest, GameRoomPair } from './game-matching.entity.js';
import { UserService } from '../user/user.service.js';

@Injectable()
export class GameMatchingService {
  constructor(
    @InjectRepository(GameMatchingRequest)
    private gameMatchingRequestRepository: Repository<GameMatchingRequest>,
    private userService: UserService,
    @InjectRepository(GameRoomPair)
    private gameRoomPairRepository: Repository<GameRoomPair>,
  ) {}

  // 変更
  private lastGameRoomId = 0;
  private lastinviteGameRoomId = 1;

  // private gameRoomPairs = new Map<number, Set<number>>();

  private async addPairToGameRoom(
    gameRoomId: number,
    userId1: number,
    userId2: number,
  ) {
    await this.gameRoomPairRepository.save([
      { gameRoomId, userId: userId1, is_two: 0, userIds: [userId1, userId2] },
      { gameRoomId, userId: userId2, is_two: 0, userIds: [userId1, userId2] },
    ]);
  }

  private async addPairgroupToGameRoom(
    gameRoomId: number,
    userId1: number,
    userIds: number[],
  ) {
    await this.gameRoomPairRepository.save([
      { gameRoomId, userId: userId1, is_two: 0, userIds: userIds },
    ]);
  }

  private generateGameRoomId(): number {
    this.lastGameRoomId += 2;
    return this.lastGameRoomId;
  }

  private generateinviteGameRoomId(): number {
    this.lastinviteGameRoomId += 2;
    return this.lastinviteGameRoomId;
  }

  async inviteMatchMaking(
    requesterId: number,
    requestedIds: number[],
  ): Promise<{ gameRoomId: number }> {
    const gameRoomId = this.generateinviteGameRoomId();
    await this.userService.notify(
      requestedIds,
      `You are invited to <a href="/game_pong/${gameRoomId}">new game</a> from <a href="/user/${requesterId}">${await this.userService.get_display_name(
        requesterId,
      )}</a>`,
    );

    this.addPairgroupToGameRoom(gameRoomId, requesterId, requestedIds);

    return { gameRoomId };
  }

  async startMatchmaking(playerId: number) {
    // 既存の待機中のリクエストを検索し、更新する
    await this.updateExistingWaitingRequests(playerId);

    // マッチを探す
    const existingMatch = await this.findMatch(playerId);
    const gameRoomId = existingMatch
      ? existingMatch.gameRoomId
      : this.generateGameRoomId();
    const now = new Date().getTime();

    // 新しいマッチングリクエストを作成
    const request = this.gameMatchingRequestRepository.create({
      requester_id: playerId,
      creation_time: now,
      status: 'waiting',
      gameRoomId,
    });

    // データベースに保存
    await this.gameMatchingRequestRepository.save(request);

    // マッチが見つかった場合の処理
    if (existingMatch) {
      // ペアリング情報を保存
      this.addPairToGameRoom(gameRoomId, playerId, existingMatch.requester_id);

      // 既存のマッチングリクエストのステータスを更新
      await this.gameMatchingRequestRepository.update(
        { id: existingMatch.id },
        { status: 'matched' },
      );
      await this.gameMatchingRequestRepository.update(
        { id: playerId },
        { status: 'matched' },
      );
      return { success: true, match: existingMatch, gameRoomId };
    }

    // 新しいマッチを探す
    let match = null;
    while (!match) {
      match = await this.findMatch(playerId);
    }

    // マッチが見つかった場合の処理
    return { success: true, match, gameRoomId };
  }

  private async findMatch(playerId: number) {
    // ステータスが 'waiting' のリクエストを検索
    const match: GameMatchingRequest | null =
      await this.gameMatchingRequestRepository.findOne({
        where: {
          requester_id: Not(playerId),
          status: 'waiting',
        },
        order: {
          creation_time: 'ASC',
        },
      });

    // // デバッグ用のコンソールログ
    // console.log(`Match found: ${JSON.stringify(match)}`);
    // console.log(`検索結果: ${match ? JSON.stringify(match) : '該当なし'}`); // 検索結果をログ出力

    if (match) {
      // 両プレイヤーのステータスを 'matched' に更新
      await this.gameMatchingRequestRepository.update(
        { id: match.id },
        { status: 'matched' },
      );
      await this.gameMatchingRequestRepository.update(
        { id: playerId },
        { status: 'matched' },
      );
      console.log(`Match`);
      return match;
    }

    return null;
  }

  private async updateExistingWaitingRequests(playerId: number) {
    // ステータスが 'waiting' で、同じプレイヤーIDのリクエストを検索
    await this.gameMatchingRequestRepository.update(
      {
        requester_id: playerId,
        status: 'waiting',
      },
      {
        status: 'matched', // ステータスを 'matched' に更新
      },
    );
  }

  async checkUserAccessToGameRoom(
    userId: number,
    gameRoomId: number,
  ): Promise<boolean> {
    const pair = await this.gameRoomPairRepository.findOne({
      where: { userId, gameRoomId },
    });
    console.log('checkUserAccessToGameRoom: ' + JSON.stringify(pair));
    return !!pair;
  }

  async checkGroupUserAccessToGameRoom(
    userId: number,
    gameRoomId: number,
  ): Promise<boolean> {
    const pair = await this.gameRoomPairRepository.findOne({
      where: { gameRoomId },
    });

    console.log('checkGroupUserAccessToGameRoom: ' + JSON.stringify(pair));
    if (pair) {
      // 誘った人
      if (pair.userId == userId) {
        pair.is_two += 1;
        await this.gameRoomPairRepository.save(pair);
        return !!pair;
      }

      // それ以外

      let i = 0;
      while (pair.userIds[i]) {
        if (pair.userIds[i] == userId && pair.is_two < 2) {
          pair.is_two += 1;
          // console.log(`pair.is_two: ${pair.is_two}`)
          await this.gameRoomPairRepository.save(pair);
          return !!pair;
        }
        i++;
      }
      return !pair;
    }
    return !!pair;
  }
}
