import { Test, TestingModule } from '@nestjs/testing';
import { GameMatchingService } from './game-matching.service.js';

describe('GameMatchingService', () => {
  let service: GameMatchingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameMatchingService],
    }).compile();

    service = module.get<GameMatchingService>(GameMatchingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
