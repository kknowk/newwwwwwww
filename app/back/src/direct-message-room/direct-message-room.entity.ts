import {
  Column,
  Entity,
  Unique,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity.js';

export type IDirectMessageRoom = {
  [K in keyof DirectMessageRoom]: DirectMessageRoom[K];
};

@Entity()
export class DirectMessageRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'int',
    default: -1,
  })
  start_inclusive_log_id: number;
}

@Unique(['room_id', 'user_id'])
@Entity()
export class DirectMessageRoomMembership {
  @PrimaryGeneratedColumn({
    type: 'int',
  })
  id: number;

  @ManyToOne(() => DirectMessageRoom, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'room_id',
    referencedColumnName: 'id',
  })
  private _room_id: never;

  @Column({
    primary: true,
    type: 'number',
  })
  @Index()
  room_id: number;

  @ManyToOne(() => User, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  private _user_id: never;

  @Column({
    type: 'number',
  })
  @Index()
  user_id: number;

  @Column({
    type: 'int',
    default: -1,
  })
  hide_log_id: number;
}

@Entity()
export class DirectMessageLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DirectMessageRoom, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'room_id',
    referencedColumnName: 'id',
  })
  private _room_id: never;

  @Column()
  room_id: number;

  @ManyToOne(() => User, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'member_id',
    referencedColumnName: 'id',
  })
  private _member_id: never;

  @Column()
  member_id: number;

  @Column()
  content: string;

  @Column({
    type: 'int',
    comment: 'utc seconds',
  })
  date: number;

  @Column({
    type: 'boolean',
    default: 'false',
  })
  is_html: boolean;

  @Column({
	type: 'boolean',
	default: 'false',
  })
  is_liked: boolean;
}

export type IDirectMessageLog = {
  [K in keyof DirectMessageLog]: DirectMessageLog[K];
};
