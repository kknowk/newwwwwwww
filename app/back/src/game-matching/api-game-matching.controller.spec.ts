// import { Test, TestingModule } from '@nestjs/testing';
// import { GameMatchingApiController } from './api-game-matching.controller.js';

// describe('GameMatchingController', () => {
//   let controller: GameMatchingApiController;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [GameMatchingApiController],
//     }).compile();

//     controller = module.get<GameMatchingApiController>(GameMatchingApiController);
//   });

//   it('should be defined', () => {
//     expect(controller).toBeDefined();
//   });
// });


import { Test, TestingModule } from '@nestjs/testing';
import { ApiGameMatchingController } from './api-game-matching.controller.js';

describe('GameMatchingController', () => {
  let controller: ApiGameMatchingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiGameMatchingController],
    }).compile();

    controller = module.get<ApiGameMatchingController>(ApiGameMatchingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
