import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  ParseIntPipe,
  Header,
  UseInterceptors,
  PayloadTooLargeException,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException,
  NotImplementedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IUser } from '../user/user.entity.js';
import { ChatRoomService } from './chat-room.service.js';
import { JsonPipe } from '../custom-pipe/json-pipe.js';
import { createIRangeRequestWithUserFromURLSearchParams } from '../utility/range-request.js';
import { JwtUpdateInterceptor } from '../auth/jwt.update.interceptor.js';
import { ChatRoomMembershipKind } from './chat-room.entity.js';

@UseGuards(AuthGuard('jwt'))
@UseInterceptors(JwtUpdateInterceptor)
@Controller('api/chat-room')
export class ApiChatRoomController {
  constructor(private chatRoomService: ChatRoomService) {}

  private is_valid_password(value: string) {
    if (value == null || typeof value !== 'string') {
      return false;
    }
    if (value.length < 8) {
      return false;
    }
    return true;
  }

  @Post('create')
  async create(
    @Req() req: Request,
    @Body(JsonPipe)
    body:
      | { name: string; kind: 0 | 2 }
      | { name: string; kind: 1; password: string },
  ) {
    if (body.name == null || body.name.length < 1 || body.name.length > 32) {
      throw new BadRequestException({ reason: 'invalid name', body });
    }
    if (!Number.isSafeInteger(body.kind) || body.kind < 0 || body.kind > 2) {
      throw new BadRequestException({ reason: 'invalid kind', body });
    }
    if (body.kind === 1 && !this.is_valid_password(body.password)) {
      throw new BadRequestException(`invalid password: ${body.password}`);
    }
    const user = req.user as IUser;
    const room_id = await this.chatRoomService.create(
      user.id,
      body.kind,
      body.name,
    );
    if (
      body.kind === 1 &&
      !(await this.chatRoomService.set_password(
        room_id,
        user.id,
        body.password,
      ))
    ) {
      throw new InternalServerErrorException('failed to set password');
    }
    return room_id;
  }

  @Post('update/:room_id')
  async update(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
    @Body(JsonPipe)
    body:
      | { name: string; kind: 0 | 2 }
      | { name: string; kind: 1; password: string },
  ) {
    if (body.name == null || body.name.length < 1 || body.name.length > 32) {
      throw new BadRequestException({ reason: 'invalid name', body });
    }
    if (!Number.isSafeInteger(body.kind) || body.kind < 0 || body.kind > 2) {
      throw new BadRequestException({ reason: 'invalid kind', body });
    }
    if (body.kind === 1 && !this.is_valid_password(body.password)) {
      throw new BadRequestException(`invalid password: ${body.password}`);
    }
    const user = req.user as IUser;
    await this.chatRoomService.update(room_id, user.id, body.kind, body.name);
    if (
      body.kind === 1 &&
      !(await this.chatRoomService.set_password(
        room_id,
        user.id,
        body.password,
      ))
    ) {
      throw new InternalServerErrorException('failed to set password');
    }
    return room_id;
  }

  @Post('send-message/:room_id')
  async send_message(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
    @Body() body: string,
  ) {
    if (body == null || body.length === 0) {
      throw new BadRequestException('body is empty.');
    }
    if (body.length > 140) {
      throw new PayloadTooLargeException();
    }
    const user = req.user as IUser;
    await this.chatRoomService.add_log(room_id, user.id, body);
    const params = new URL(req.url, `https://${req.headers.host}`).searchParams;
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      params,
    );
    if (rangeRequest === null) {
      throw new BadRequestException('range request is invalid.');
    }
    return await this.chatRoomService.get_logs(rangeRequest, room_id);
  }

  @Get('logs/:room_id')
  async get_logs(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
  ) {
    const user = req.user as IUser;
    const params = new URL(req.url, `https://${req.headers.host}`).searchParams;
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      params,
    );
    if (rangeRequest === null) {
      throw new BadRequestException('range request is invalid.');
    }
    return await this.chatRoomService.get_logs(rangeRequest, room_id);
  }

  @Post('approve-invitation/:room_id')
  async approve_invitation(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
    @Body(JsonPipe) body?: { password: string },
  ) {
    const user = req.user as IUser;
    return await this.chatRoomService.join_membership(
      room_id,
      user.id,
      body?.password ?? undefined,
    );
  }

  @Post('reject-invitation/:room_id')
  async reject_invitation(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
  ) {
    const user = req.user as IUser;
    await this.chatRoomService.reject_invitation(room_id, user.id);
  }

  @Post('invite/:room_id')
  async invite(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
    @Body(JsonPipe) body: number[],
  ) {
    const user = req.user as IUser;
    return await this.chatRoomService.invite_memberships(
      room_id,
      user.id,
      body,
    );
  }

  @Post('appoint/:room_id')
  async appoint(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
    @Body(JsonPipe) body: number[],
  ) {
    const user = req.user as IUser;
    return await this.chatRoomService.appoint_administrators(
      room_id,
      user.id,
      body,
    );
  }

  @Post('ban/:room_id')
  async ban(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
    @Body(JsonPipe) body: number[],
  ) {
    const user = req.user as IUser;
    return await this.chatRoomService.ban_memberships(room_id, user.id, body);
  }

  @Post('kick/:room_id')
  async kick(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
    @Body(JsonPipe) body: number[],
  ) {
    if (body.length === 0) {
      throw new BadRequestException();
    }
    const user = req.user as IUser;
    const membership = await this.chatRoomService.get_membership(
      room_id,
      user.id,
    );
    if (membership == null) {
      throw new UnauthorizedException();
    }
    if (membership.kind !== ChatRoomMembershipKind.administrator) {
      if (body.length !== 1 || body[0] !== user.id) {
        throw new UnauthorizedException();
      }
    }
    return await this.chatRoomService.kick_memberships(room_id, user.id, body);
  }

  @Post('mute/:room_id')
  async mute(
    @Req() req: Request,
    @Param('room_id', ParseIntPipe) room_id: number,
    @Body(JsonPipe) body: { ids: number[]; end_time: number },
  ) {
    const user = req.user as IUser;
    return await this.chatRoomService.mute_memberships(
      room_id,
      user.id,
      body.ids,
      body.end_time,
    );
  }

  @Get('not-member-rooms')
  async not_member_rooms(@Req() req: Request) {
    const user = req.user as IUser;
    const params = new URL(req.url, `https://${req.headers.host}`).searchParams;
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      params,
    );
    if (rangeRequest === null) {
      throw new BadRequestException('range request is invalid.');
    }
    const rooms = await this.chatRoomService.get_not_member_rooms(rangeRequest);
    return rooms;
  }

  @Header('Content-Type', 'text/plain;charset=utf-8')
  @Get('skyway-token')
  async get_skyway_token(
    @Req() req: Request
  ) {
    const user = req.user as IUser;
    const token = await this.chatRoomService.get_skyway_token(user.id);
    if (token === null) {
      throw new NotImplementedException();
    }
    return token;
  }
}
