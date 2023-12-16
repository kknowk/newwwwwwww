import { Test, TestingModule } from '@nestjs/testing';
import { ApiChatRoomController } from './api-chat-room.controller.js';

describe('ChatRoomController', () => {
  let controller: ApiChatRoomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiChatRoomController],
    }).compile();

    controller = module.get<ApiChatRoomController>(ApiChatRoomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
