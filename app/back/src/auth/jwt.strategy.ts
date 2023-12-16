import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { UserService } from '../user/user.service.js';
import { IUser, UserActivityKind } from '../user/user.entity.js';
import { JwtPayload, fromJwtPayloadToIUser } from './auth.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          const jwt = req?.cookies?.jwt;
          if (!jwt) {
            console.log('not found jwt' + req.headers.from);
          }
          return jwt;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    } as StrategyOptions);
  }

  async validate(payload: JwtPayload) {
    const user: IUser = fromJwtPayloadToIUser(payload);
    user.last_activity_timestamp = await this.userService.update_user_activity(
      user.id,
      UserActivityKind.login,
    );
    return user;
  }
}
