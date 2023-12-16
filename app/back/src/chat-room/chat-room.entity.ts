import { User } from '../user/user.entity.js';
import {
  Unique,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const ChatRoomKind = {
  private: 0,
  protected: 1,
  public: 2,
} as const;
export type ChatRoomKind = (typeof ChatRoomKind)[keyof typeof ChatRoomKind];

@Entity()
export class ChatRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
  })
  name: string;

  @Column({
    type: 'int',
    default: ChatRoomKind.public,
  })
  kind: ChatRoomKind;

  @ManyToOne(() => User, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'owner_id',
    referencedColumnName: 'id',
  })
  private _owner_id: never;

  @Column()
  owner_id: number;

  @Column({
    nullable: true,
  })
  salt: string | null;

  @Column({
    nullable: true,
  })
  password: string | null;

  @Column({
    type: 'int',
    nullable: true,
    default: null,
  })
  start_inclusive_log_id: number | null;
}

export type IChatRoom = {
  [K in keyof Omit<ChatRoom, 'salt' | 'password'>]: ChatRoom[K];
};

export const ChatRoomMembershipKind = {
  administrator: 2,
  member: 1,
  invited: 0,
  muted: -1,
  banned: -2,
} as const;
export type ChatRoomMembershipKind =
  (typeof ChatRoomMembershipKind)[keyof typeof ChatRoomMembershipKind];

@Unique(['room_id', 'member_id'])
@Entity()
export class ChatRoomMembership {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ChatRoom, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'room_id',
    referencedColumnName: 'id',
  })
  private _room_id: never;

  @Column()
  @Index()
  room_id: number;

  @ManyToOne(() => User, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'member_id',
    referencedColumnName: 'id',
  })
  private _member_id: never;

  @Column()
  @Index()
  member_id: number;

  @Column({
    type: 'int',
    default: ChatRoomMembershipKind.member,
  })
  kind: ChatRoomMembershipKind;

  @Column({
    type: 'int',
    comment: 'utc seconds',
  })
  end_time: number;
}

export type IChatRoomMembership = {
  [K in keyof ChatRoomMembership]: ChatRoomMembership[K];
};

export type IPartialChatRoomMembership = {
  [K in keyof Omit<
    ChatRoomMembership,
    'end_time' | 'room_id' | 'id'
  >]: ChatRoomMembership[K];
};

@Entity()
export class ChatLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ChatRoom, { nullable: false, cascade: ['remove'] })
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
    default: 0,
    comment: 'utc seconds',
  })
  date: number;

  @Column({
    type: 'boolean',
    default: 'false',
  })
  is_html: boolean;
}

export type IChatLog = {
  [K in keyof Omit<ChatLog, 'room_id'>]: ChatLog[K];
};
