import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class GameLog {
  @PrimaryGeneratedColumn({
    type: 'int',
  })
  id: number;

  @Column({
    type: 'int',
    default: -1,
  })
  winner_id: number;

  @Column({
    type: 'int',
    default: -1,
  })
  loser_id: number;

  @Column({
    type: 'int',
    comment: 'utc seconds',
    default: 0,
  })
  date: number;
}
