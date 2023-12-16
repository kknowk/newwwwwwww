import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { IUser, UserActivityKind } from '../user/user.entity.js';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';

export interface JwtPayload {
  sub: number; // id
  d: string; // displayName
  l: number; // last activity timestamp
  k: UserActivityKind;
  a: boolean; // is 2fa
  n: number; // noticeReadId
  r: boolean; // require 2fa
}

export const fromJwtPayloadToIUser = (value: JwtPayload): IUser => {
  console.log('from jwt to IUser: ' + JSON.stringify(value));
  return {
    id: value.sub,
    displayName: value.d,
    last_activity_timestamp: value.l,
    activity_kind: value.k,
    is_two_factor_authenticated: value.a,
    notice_read_id: value.n,
    two_factor_authentication_required: value.r,
  };
};

export const fromIUserToJwtPayload = (value: IUser): JwtPayload => {
  return {
    sub: value.id,
    d: value.displayName,
    l: value.last_activity_timestamp,
    k: value.activity_kind,
    a: value.is_two_factor_authenticated,
    n: value.notice_read_id,
    r: value.two_factor_authentication_required,
  };
};

@Injectable()
export class AuthService {
  #jwtOption: JwtSignOptions;
  constructor(
    private jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.#jwtOption = { secret: configService.get('JWT_SECRET') };
    this.jwt_cookie_options = {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      // !!!milliseconds!!!
      // see: https://expressjs.com/en/4x/api.html#res.cookie
      maxAge: Number.parseInt(configService.get('JWT_EXPIRES_CONSTANT')) * 1000,
      path: '/',
    };
  }

  public readonly jwt_cookie_options: CookieOptions;

  async issue_jwt(user: IUser): Promise<string | null> {
    const payload = fromIUserToJwtPayload(user);
    try {
      const access_token = await this.jwtService.signAsync(
        payload,
        this.#jwtOption,
      );
      return access_token;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  clear_jwt(response: Response) {
    response.clearCookie('jwt', this.jwt_cookie_options);
  }

  async update_jwt(user: IUser, res: Response) {
    console.log('update jwt: ' + JSON.stringify(user));
    const access_token = await this.issue_jwt(user);
    if (access_token) {
      res.cookie('jwt', access_token, this.jwt_cookie_options);
      return true;
    } else {
      res.status(500);
      return false;
    }
  }
}
