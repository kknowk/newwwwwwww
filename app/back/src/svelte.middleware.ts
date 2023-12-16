import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction } from 'express';
// @ts-ignore
import { handler } from './front/handler.js';
import { UserService } from './user/user.service.js';
import {
  AuthService,
  JwtPayload,
  fromJwtPayloadToIUser,
} from './auth/auth.service.js';
import { GameService } from './game/game.service.js';
import { ChatRoomService } from './chat-room/chat-room.service.js';
import { DirectMessageRoomService } from './direct-message-room/direct-message-room.service.js';
import { GameMatchingService } from './game-matching/game-matching.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RequestWithServices, Services } from './svelte.services.js';
import type { Response } from 'express';
import { GameGateway } from './game/game.gateway.js';

@Injectable()
export class SvelteMiddleware implements NestMiddleware {
  private services: Services;

  constructor(
    authService: AuthService,
    gameService: GameService,
    userService: UserService,
    chatRoomService: ChatRoomService,
    directMessageRoomService: DirectMessageRoomService,
    gameMatchingService: GameMatchingService,
    jwtService: JwtService,
    configService: ConfigService,
    GameGateway: GameGateway,
  ) {
    this.services = {
      authService,
      gameService,
      userService,
      chatRoomService,
      directMessageRoomService,
      gameMatchingService,
      jwtService,
      configService,
      GameGateway,
    };
  }

  async use(req: RequestWithServices, res: Response, next: NextFunction) {
    console.log(req.url);
    if (
      req.url.startsWith('/api/') ||
      req.url === '/auth' ||
      req.url.startsWith('/auth/') ||
      req.url.startsWith('/auth?') ||
      req.url.startsWith('/auth#') ||
      req.url.startsWith('/images')
    ) {
      return next();
    }
    if (
      req.method.toLowerCase() === 'get' &&
      (req.url.endsWith('.js') ||
        req.url.endsWith('.css') ||
        req.url.endsWith('.map'))
    ) {
      return handler(req, res, next);
    }
    const jwt = req.cookies?.jwt;
    if (jwt) {
      let decoded = this.services.jwtService.decode(jwt, { json: true });
      if (typeof decoded === 'string') return next();
      req.user = fromJwtPayloadToIUser(decoded as JwtPayload);
    }
    req.services = this.services;
    handler(req, res, next);
  }
}
