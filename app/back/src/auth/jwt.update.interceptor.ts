import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { IUser, UserActivityKind } from '../user/user.entity.js';
import { AuthService } from './auth.service.js';
import { UserService } from '../user/user.service.js';

@Injectable()
export class JwtUpdateInterceptor implements NestInterceptor {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      mergeMap(async (data) => {
        const host = context.switchToHttp();
        const req = host.getRequest() as Request;
        const user = req.user as IUser;
        const res = host.getResponse();
        user.last_activity_timestamp =
          await this.userService.update_user_activity(
            user.id,
            UserActivityKind.login,
          );
        await this.authService.update_jwt(user, res);
        return data;
      }),
    );
  }
}
