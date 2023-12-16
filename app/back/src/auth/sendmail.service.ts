import { Transporter, createTransport, SentMessageInfo } from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDetailInfo } from '../user/user.entity.js';
import { Repository } from 'typeorm';

@Injectable()
export class SendMailService {
  private readonly porter: Transporter<SentMessageInfo>;
  private readonly sender: string;

  constructor(
    configService: ConfigService,
    @InjectRepository(UserDetailInfo)
    private infoRepository: Repository<UserDetailInfo>,
  ) {
    this.sender = configService.get('GMAIL_ADDRESS');
    this.porter = createTransport({
      service: 'gmail',
      auth: {
        user: this.sender,
        pass: configService.get('GMAIL_PASSWORD'),
      },
    });
  }

  async sendMail(user_id: number, subject: string, text: string) {
    const email_address = (
      await this.infoRepository
        .createQueryBuilder()
        .select('email')
        .where('id=:id', { id: user_id })
        .getRawOne()
    )?.email;
    if (typeof email_address !== 'string')
      throw new Error('email_address type is not string.');
    if (email_address.length === 0)
      throw new Error('email_address length is 0.');
    await this.porter.sendMail({
      from: this.sender,
      to: email_address,
      subject,
      text,
    });
  }
}
