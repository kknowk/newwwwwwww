import { Controller, Get, Redirect, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class AppController {
  @Get('/')
  get_index(@Res({ passthrough: true }) res: Response) {
    res.redirect(307, '/home/friend');
  }
}
