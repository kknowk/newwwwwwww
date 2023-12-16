import {
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, JwtPayload } from './auth.service.js';
import type { Response, Request } from 'express';
import { IUser, UserActivityKind } from '../user/user.entity.js';
import { UserService } from '../user/user.service.js';
import { SendMailService } from './sendmail.service.js';
import { randomInt } from 'crypto';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private authSerivce: AuthService,
    private userService: UserService,
    private sendMailService: SendMailService,
    private jwtService: JwtService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('ft'))
  async login() {}

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (req.cookies?.jwt) {
      const decoded = this.jwtService.decode(req.cookies.jwt, {
        json: true,
      }) as JwtPayload;
      if (
        typeof decoded !== 'string' &&
        'sub' in decoded &&
        typeof decoded.sub === 'number'
      ) {
        await this.userService.update_user_activity(
          decoded.sub,
          UserActivityKind.logout,
        );
      }
    }
    this.authSerivce.clear_jwt(res);
    res.redirect(303, '/');
  }

  @Get('callback')
  @UseGuards(AuthGuard('ft'))
  async callback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (req.user == null) {
      res.status(403);
      return;
    }
    const user = req.user as IUser;
    if (!(await this.authSerivce.update_jwt(user, res))) {
      res.status(500);
      return;
    }
    if (
      user.two_factor_authentication_required &&
      !user.is_two_factor_authenticated
    ) {
      res.redirect(307, '/authentication');
    } else if ('new' in user && user.new === true) {
      res.redirect(303, '/?should_redirect_to_settings=1');
    } else {
      res.redirect(303, '/');
    }
  }

  @Get('pseudo/:user_id/:displayName')
  async get_pseudo(
    @Param('user_id') user_id: string,
    @Param('displayName') displayName: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user_id_number = Number.parseInt(user_id);
    if (!Number.isSafeInteger(user_id_number)) {
      throw new HttpException('user_id is invalid number.', 400);
    }
    const user = await this.userService.test_find_or_create(
      user_id_number,
      displayName,
    );
    if (!(await this.authSerivce.update_jwt(user, res))) {
      res.status(500);
      return;
    }
    if (
      user.two_factor_authentication_required &&
      !user.is_two_factor_authenticated
    ) {
      res.redirect(307, '/authentication');
    } else if ('new' in user && user.new === true) {
      res.redirect(303, '/?should_redirect_to_settings=1');
    } else {
      res.redirect(303, '/');
    }
  }

  @Post('send-mail')
  @UseGuards(AuthGuard('jwt'))
  async send_mail(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req.user == null) {
      res.status(401);
      return;
    }
    const user = req.user as IUser;
    if (!user.two_factor_authentication_required) {
      res.status(403);
      res.json(user);
      return;
    }
    const random_number = randomInt(0, 1000000).toString().padStart(6, '0');
    try {
      await this.sendMailService.sendMail(
        user.id,
        'Authorization Challenge',
        random_number,
      );
    } catch (e) {
      res.status(500);
      res.json({ type: e.constructor.name, error: e, stack: e['stack'] });
      return;
    }
    await this.userService.set_2fa_temp(user.id, random_number);
    res.status(200);
  }

  @Post('challenge/:challenge')
  @UseGuards(AuthGuard('jwt'))
  async challenge(
    @Req() req: Request,
    @Param('challenge') userChallenge: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req.user == null) {
      res.status(401);
      return;
    }
    const user = req.user as IUser;
    if (!user.two_factor_authentication_required) {
      res.status(403);
      return;
    }
    const compareResult = await this.userService.compare_2fa(
      user.id,
      userChallenge,
    );
    if (compareResult === null) {
      res.status(403);
      return;
    }
    user.is_two_factor_authenticated = compareResult;
    if (!user.is_two_factor_authenticated) {
      res.status(400);
      return;
    }
    await this.authSerivce.update_jwt(user, res);
  }
}
