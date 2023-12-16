import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller.js';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  Notice,
  User,
  User42Cross,
  UserDetailInfo,
  UserRelationship,
} from './user/user.entity.js';
import {
  GameMatchingRequest,
  GameRoomPair,
} from './game-matching/game-matching.entity.js';
import {
  ChatLog,
  ChatRoom,
  ChatRoomMembership,
} from './chat-room/chat-room.entity.js';
import {
  DirectMessageLog,
  DirectMessageRoom,
  DirectMessageRoomMembership,
} from './direct-message-room/direct-message-room.entity.js';
import { ApiGameController } from './game/api-game.controller.js';
import { PassportModule } from '@nestjs/passport';
import { ApiUserController } from './user/api-user.controller.js';
import { ApiChatRoomController } from './chat-room/api-chat-room.controller.js';
import { ApiDirectMessageRoomController } from './direct-message-room/api-direct-message-room.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { GameService } from './game/game.service.js';
import { UserService } from './user/user.service.js';
import { ChatRoomService } from './chat-room/chat-room.service.js';
import { DirectMessageRoomService } from './direct-message-room/direct-message-room.service.js';
import { GameMatchingService } from './game-matching/game-matching.service.js';
import { SvelteMiddleware } from './svelte.middleware.js';
import { GameLog } from './game/game.entity.js';
import { FtStrategy } from './auth/ft.strategy.js';
import { JwtStrategy } from './auth/jwt.strategy.js';
import { SendMailService } from './auth/sendmail.service.js';
import { text } from 'express';
import { ApiGameMatchingController } from './game-matching/api-game-matching.controller.js';
import { GameGateway } from './game/game.gateway.js';
import { JsonPipe } from './custom-pipe/json-pipe.js';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtUpdateInterceptor } from './auth/jwt.update.interceptor.js';

const entities: Function[] = [
  User,
  UserRelationship,
  User42Cross,
  UserDetailInfo,
  ChatRoom,
  ChatRoomMembership,
  ChatLog,
  DirectMessageRoom,
  DirectMessageRoomMembership,
  DirectMessageLog,
  GameMatchingRequest,
  GameLog,
  Notice,
  GameRoomPair,
];

@Module({
  controllers: [
    AppController,
    ApiGameController,
    ApiUserController,
    ApiChatRoomController,
    ApiDirectMessageRoomController,
    ApiGameMatchingController,
    AuthController,
  ],
  providers: [
    AuthService,
    GameService,
    UserService,
    ChatRoomService,
    DirectMessageRoomService,
    GameMatchingService,
    FtStrategy,
    JwtStrategy,
    JwtService,
    ConfigService,
    SendMailService,
    GameGateway,
    JsonPipe,
    JwtUpdateInterceptor,
  ],
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        database: configService.get('DATABASE_DB'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        entities,
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature(entities),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: Number.parseInt(configService.get('JWT_EXPIRES_CONSTANT')),
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SvelteMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
    consumer
      .apply(
        text({
          defaultCharset: 'utf-8',
          type: ['application/json', 'text/plain'],
        }),
      )
      .forRoutes(
        ApiDirectMessageRoomController,
        ApiChatRoomController,
        ApiGameMatchingController,
        ApiUserController,
      );
  }
}
