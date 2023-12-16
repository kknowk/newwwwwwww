import { Test, TestingModule } from '@nestjs/testing';
import { ApiDirectMessageRoomController } from './api-direct-message-room.controller.js';

describe('DirectMessageRoomController', () => {
  let controller: ApiDirectMessageRoomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiDirectMessageRoomController],
    }).compile();

    controller = module.get<ApiDirectMessageRoomController>(ApiDirectMessageRoomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
