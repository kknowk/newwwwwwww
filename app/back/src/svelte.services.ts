import { UserService } from './user/user.service.js';
import { AuthService } from './auth/auth.service.js';
import { GameService } from './game/game.service.js';
import { ChatRoomService } from './chat-room/chat-room.service.js';
import { DirectMessageRoomService } from './direct-message-room/direct-message-room.service.js';
import { GameMatchingService } from './game-matching/game-matching.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IUser } from './user/user.entity.js';
import type { Request } from 'express';
import { GameGateway } from './game/game.gateway.js';

export interface Services {
  authService: AuthService;
  gameService: GameService;
  userService: UserService;
  chatRoomService: ChatRoomService;
  directMessageRoomService: DirectMessageRoomService;
  gameMatchingService: GameMatchingService;
  jwtService: JwtService;
  configService: ConfigService;
  GameGateway: GameGateway;
}

export interface RequestWithServices extends Request {
  services?: Services;
  user?: IUser;
}
