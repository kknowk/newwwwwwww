import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { UserService } from '../user/user.service.js';

@Injectable()
export class FtStrategy extends PassportStrategy(Strategy, 'ft') {
  constructor(
    configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
      clientID: configService.get('FT_CLIENT_ID'),
      clientSecret: configService.get('FT_CLIENT_SECRET'),
      callbackURL: configService.get('SITE_ROOT') + 'auth/callback',
      scope: 'public',
    });
  }

  async validate(accessToken: string, _refreshToken: string, _profile: any, callback: Function) {
    const requestInit = {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    };
    const response = await fetch('https://api.intra.42.fr/v2/me', requestInit);
    const json = await response.json();
    const id = json.id;
    const login = json.login;
    const email = json.email;
    if (typeof login === 'string') {
      if (typeof id === 'string') {
        const user = await this.userService.findOrCreate(id, login, email);
        return callback(null, user);
      } else if (typeof id === 'number' || typeof id === 'bigint') {
        const user = await this.userService.findOrCreate(id.toString(), login, email);
        return callback(null, user);
      }
    }
    throw new UnauthorizedException("42 api's returned json does not include valid id and login name.");
  }
}
