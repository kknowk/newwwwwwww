import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  Body,
  UploadedFile,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import {
  IUser,
  UserRelationshipKind,
  fromStringToUserRelationshipKind,
} from './user.entity.js';
import { UserService } from './user.service.js';
import { dirname, join } from 'path';
import { createIRangeRequestWithUserFromURLSearchParams } from '../utility/range-request.js';
import { JwtUpdateInterceptor } from '../auth/jwt.update.interceptor.js';
import { writeFile, access, constants } from 'fs/promises';
import { JsonPipe } from '../custom-pipe/json-pipe.js';
import { fileURLToPath } from 'url';
import { createReadStream, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@UseGuards(AuthGuard('jwt'))
@Controller('api/user')
export class ApiUserController {
  constructor(private userService: UserService) {
    const directoryName = join(__dirname, '..', '..', 'images');
    try {
      mkdirSync(directoryName);
    } catch {}
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Get('name/:id')
  async get_name(
    @Req() req: Request,
    @Param('id', ParseIntPipe) target_id: number,
  ) {
    const user = req.user as IUser;
    if (target_id === user.id) return user.displayName;
    const target_user = await this.userService.findById(target_id);
    if (target_user == null) throw new NotFoundException();
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      target_id,
    );
    if (relationship <= UserRelationshipKind.banned)
      throw new NotFoundException();
    return target_user.displayName;
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Get('user/:id')
  async get_user(
    @Req() req: Request,
    @Param('id', ParseIntPipe) target_id: number,
  ) {
    const user = req.user as IUser;
    if (target_id === user.id) return user;
    const target_user = await this.userService.findById(target_id);
    if (target_user == null) throw new NotFoundException();
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      target_id,
    );
    if (relationship <= UserRelationshipKind.banned)
      throw new NotFoundException();
    return target_user;
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Post('users')
  async get_users(@Req() req: Request, @Body(JsonPipe) body: number[]) {
    const user = req.user as IUser;
    const users = await this.userService.get_users(user.id, body);
    return users;
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Get('find-by-partial-name/:name')
  async find_by_partial_name(@Req() req: Request, @Param('name') name: string) {
    const user = req.user as IUser;
    const url = new URL(req.url, `https://${req.headers.host}`);
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      url.searchParams,
      50,
      true,
    );
    const users = await this.userService.find_by_partial_name(
      rangeRequest,
      name,
    );
    return users;
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Post('set-relationship/:id/:relationship')
  async set_relationship(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('relationship') relationship_text: string,
  ) {
    const relationship = fromStringToUserRelationshipKind(relationship_text);
    if (relationship == null) throw new BadRequestException();
    const user = req.user as IUser;
    if (user.id === id) throw new BadRequestException();
    await this.userService.set_relationship(user.id, id, relationship);
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Post('get-notice')
  async get_notice(@Req() req: Request) {
    const user = req.user as IUser;
    const url = new URL(req.url, `https://${req.headers.host}`);
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      url.searchParams,
      50,
      false,
    );
    rangeRequest.start_exclusive =
      rangeRequest.start_exclusive > user.notice_read_id
        ? rangeRequest.start_exclusive
        : user.notice_read_id;
    const [answer, maxId] = await this.userService.get_notice(rangeRequest);
    if (maxId > user.notice_read_id) {
      user.notice_read_id = maxId;
    }
    return answer;
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Get('get-notice-count')
  async get_notice_count(@Req() req: Request) {
    const user = req.user as IUser;
    const url = new URL(req.url, `https://${req.headers.host}`);
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      url.searchParams,
      50,
      false,
    );
    rangeRequest.start_exclusive =
      rangeRequest.start_exclusive > user.notice_read_id
        ? rangeRequest.start_exclusive
        : user.notice_read_id;
    const answer = await this.userService.get_notice_count(rangeRequest);
    return answer;
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Post('clear-notice')
  async clear_notice(@Req() req: Request) {
    const user = req.user as IUser;
    await this.userService.clear_notice(user.id);
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Post('change-settings')
  @UseInterceptors(
    FileInterceptor('user-icon', {
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  async change_settings(
    @Req() req: Request,
    @Body()
    body: {
      ['user-name']?: string;
      ['user-email']?: string;
      ['user-2fa']?: 'on' | 'off';
    },
    @UploadedFile() file: Express.Multer.File | undefined | null,
  ) {
    const user = req.user as IUser;
    if (file != null) {
      if (file.mimetype !== 'image/png') {
        throw new BadRequestException('user-icon must be image/png');
      }
      if (file.size === 0 || file.size > 2 * 1024 * 1024) {
        throw new BadRequestException('user-icon must be in range.');
      }
      if (!(await this.userService.isValidPngFile(file.buffer))) {
        throw new BadRequestException('invalid file');
      }
      const path = join(__dirname, '..', '..', 'images', `icon-${user.id}.png`);
      try {
        await writeFile(path, file.buffer, {
          encoding: 'binary',
        });
      } catch (error) {
        throw new InternalServerErrorException(error);
      }
    }
    const name = body['user-name'];
    if (name != null) {
      await this.userService.set_display_name(user.id, name);
      user.displayName = name;
    }
    const email = body['user-email'];
    if (email != null) {
      await this.userService.set_email(user.id, email);
    }
    const _2fa = body['user-2fa'];
    if (_2fa != null) {
      await this.userService.set_two_factor_authentication_required(
        user.id,
        _2fa === 'on',
      );
      user.two_factor_authentication_required = _2fa === 'on';
    }
  }

  @Get('icon/:user_id')
  async get_icon(
    @Req() req: Request,
    @Param('user_id', ParseIntPipe) user_id: number,
    @Res() res: Response,
  ) {
    const user = req.user as IUser;
    if (user.id !== user_id) {
      if (!(await this.userService.get_existence(user_id))) {
        throw new NotFoundException();
      }
      const relationship = await this.userService.get_lowest_relationship(
        user.id,
        user_id,
      );
      if (relationship === UserRelationshipKind.banned) {
        throw new UnauthorizedException();
      }
    }
    const path = join(__dirname, '..', '..', 'images', `icon-${user_id}.png`);
    try {
      await access(path, constants.O_RDONLY);
    } catch (error) {
      console.error(error);
      res.status(404);
      res.json(error);
      return;
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline');
    const stream = createReadStream(path);
    stream.pipe(res);
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Get('game-result-counts/:user_id')
  async get_game_result_counts(
    @Req() req: Request,
    @Param('user_id', ParseIntPipe) user_id: number,
  ) {
    const user = req.user as IUser;
    if (!(await this.userService.get_existence(user_id))) {
      throw new NotFoundException();
    }
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      user_id,
    );
    if (relationship === UserRelationshipKind.banned) {
      throw new UnauthorizedException();
    }
    const result = await this.userService.get_game_result_counts(user_id);
    return result;
  }

  @UseInterceptors(JwtUpdateInterceptor)
  @Get('game-logs/:user_id')
  async get_game_logs(
    @Req() req: Request,
    @Param('user_id', ParseIntPipe) user_id: number,
  ) {
    const user = req.user as IUser;
    if (!(await this.userService.get_existence(user_id))) {
      throw new NotFoundException();
    }
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      user_id,
    );
    if (relationship === UserRelationshipKind.banned) {
      throw new UnauthorizedException();
    }
    const url = new URL(req.url, `https://${req.headers.host}`);
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user_id,
      url.searchParams,
      50,
      true,
    );
    const result = await this.userService.get_game_logs(rangeRequest);
    return result;
  }
}
