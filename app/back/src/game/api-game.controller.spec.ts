import { Test, TestingModule } from '@nestjs/testing';
import { ApiGameController } from './api-game.controller.js';

describe('GameController', () => {
  let controller: ApiGameController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiGameController],
    }).compile();

    controller = module.get<ApiGameController>(ApiGameController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
