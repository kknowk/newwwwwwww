import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

export const GameRuleKind = {
    basic: 0,
} as const;
export type GameRuleKind = (typeof GameRuleKind)[keyof typeof GameRuleKind];

@Entity()
export class GameMatchingRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'int',
    })
    requester_id: number;

    @Column({
        type: 'int',
        default: GameRuleKind.basic,
    })
    rule: GameRuleKind;

    @Column({
        type: 'bigint',
        comment: 'utc milliseconds'
    })
    creation_time: number;

    @Column({
        type: 'int',
        default: -1,
    })
    applicant_id: number;

    @Column({
        default: 'waiting'
    })
    status: 'waiting' | 'matched';

    @Column({ nullable: true })
    gameRoomId: number;
}

@Entity()
export class GameRoomPair {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'int',
    default: 0,
  })
  gameRoomId: number;

  @Column({
    type: 'int',
    default: 0,
  })
  userId: number;

  @Column("int", { array: true })
  userIds: number[];

  @Column({
    type: 'int',
    default: 0,
  })
  is_two: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}