import { Body, Controller, Post , Req, UseGuards } from '@nestjs/common';
import { GameMatchingService } from './game-matching.service.js';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IUser } from '../user/user.entity.js';
import { JsonPipe } from '../custom-pipe/json-pipe.js';

@UseGuards(AuthGuard('jwt'))
@Controller('api/matchmaking')
export class ApiGameMatchingController {
    constructor(private gameMatchingService: GameMatchingService) {}

    @Post('start')
    async startMatchmaking(@Req() req: Request) {
        const user = req.user as IUser;

        console.log(`user.id`, user.id);
        console.log(`user.id`, user.displayName);
        
        return this.gameMatchingService.startMatchmaking(user.id);
    }

    @Post('invite')
    async inviteMatchMaking(@Req() req: Request, @Body(JsonPipe) targetIds: number[]): Promise<{gameRoomId: number}> {
        const user = req.user as IUser; // リクエストを行ったユーザーのIDを取得
        const requesterId = user.id; // ユーザーのID
    
        return this.gameMatchingService.inviteMatchMaking(requesterId, targetIds); // サービスのメソッドを呼び出し
    }
}