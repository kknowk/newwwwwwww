import {
  Controller,
  Body,
  Post,
  Get,
  Req,
  Param,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ParseIntPipe,
  ParseBoolPipe,
  PayloadTooLargeException,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IUser, UserRelationshipKind } from '../user/user.entity.js';
import { UserService } from '../user/user.service.js';
import { DirectMessageRoomService } from './direct-message-room.service.js';
import { createIRangeRequestWithUserFromURLSearchParams } from '../utility/range-request.js';
import { JwtUpdateInterceptor } from '../auth/jwt.update.interceptor.js';

@UseGuards(AuthGuard('jwt'))
@UseInterceptors(JwtUpdateInterceptor)
@Controller('api/direct-message-room')
export class ApiDirectMessageRoomController {
  constructor(
    private userService: UserService,
    private directMessageRoomService: DirectMessageRoomService,
  ) {}

  @Post('send-message/:counterpart_id')
  async send_message(
    @Req() req: Request,
    @Param('counterpart_id', ParseIntPipe) counterpart_id: number,
    @Body() body: string,
  ) {
    if (body == null || body.length === 0) {
      throw new BadRequestException('body is empty.');
    }
    if (body.length > 140) {
      throw new PayloadTooLargeException();
    }
    if (!(await this.userService.get_existence(counterpart_id))) {
      throw new NotFoundException({ counterpart_id });
    }
    const user = req.user as IUser;
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      counterpart_id,
    );
    if (relationship === UserRelationshipKind.banned) {
      throw new UnauthorizedException();
    }
    const params = new URL(req.url, `https://${req.headers.host}`).searchParams;
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      params,
    );
    if (rangeRequest === null) {
      throw new BadRequestException();
    }
    const room = await this.directMessageRoomService.ensure_room_existence(
      user.id,
      counterpart_id,
    );
    const result = await this.directMessageRoomService.add_log(
      user.id,
      room.id,
      body,
    );
    if (result == null) {
      throw new BadRequestException('add_log failure');
    }
    return await this.directMessageRoomService.get_logs(room.id, rangeRequest);
  }

  @Post('like/:counterpart_id/:log_id/:is_liked')
  async like_log(
    @Req() req: Request,
    @Param('counterpart_id', ParseIntPipe) counterpart_id: number,
    @Param('log_id', ParseIntPipe) log_id: number,
    @Param('is_liked', ParseBoolPipe) is_liked: boolean,
  ) {
    const user = req.user as IUser;
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      counterpart_id,
      );
      if (relationship === UserRelationshipKind.banned) {
        throw new UnauthorizedException();
      }
    const room_id = await this.directMessageRoomService.get_room_id(
      user.id,
      counterpart_id,
      );
      if (room_id == null) {
        throw new NotFoundException();
      }
    const target_log = await this.directMessageRoomService.get_log(log_id);
    if (target_log == null) {
      throw new NotFoundException();
    }
    if (target_log.is_liked !== is_liked && target_log.member_id !== user.id) {
      await this.directMessageRoomService.like_log(log_id, is_liked);
    }
    return is_liked;
  }


  @Post('delete/:room_id')
  async delete(@Req() req: Request, @Param('room_id') room_id_text: string) {
    const room_id = Number.parseInt(room_id_text);
    if (!Number.isSafeInteger(room_id)) {
      throw new BadRequestException({ room_id_text });
    }
    const user = req.user as IUser;
    if (!(await this.directMessageRoomService.is_member(user.id, room_id))) {
      throw new UnauthorizedException();
    }
    this.directMessageRoomService.delete(room_id);
  }

  @Get('logs/:counterpart_id')
  async get_logs(
    @Req() req: Request,
    @Param('counterpart_id', ParseIntPipe) counterpart_id: number,
  ) {
    const user = req.user as IUser;
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      counterpart_id,
    );
    if (relationship === UserRelationshipKind.banned) {
      throw new UnauthorizedException();
    }
    const params = new URL(req.url, `https://${req.headers.host}`).searchParams;
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      params,
    );
    if (rangeRequest === null) {
      throw new BadRequestException();
    }
    const room_id = await this.directMessageRoomService.get_room_id(
      user.id,
      counterpart_id,
    );
    if (room_id == null) {
      throw new NotFoundException();
    }
    return await this.directMessageRoomService.get_logs(room_id, rangeRequest);
  }

  @Post('hide/:room_id/:log_id')
  async hide(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
    @Param('log_id', ParseIntPipe) log_id: number,
  ) {
    const user = req.user as IUser;
    await this.directMessageRoomService.set_hide_log_id(
      user.id,
      room_id,
      log_id,
    );
  }
}
