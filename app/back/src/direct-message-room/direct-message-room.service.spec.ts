import { Test, TestingModule } from '@nestjs/testing';
import { DirectMessageRoomService } from './direct-message-room.service.js';

describe('DirectMessageRoomService', () => {
  let service: DirectMessageRoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DirectMessageRoomService],
    }).compile();

    service = module.get<DirectMessageRoomService>(DirectMessageRoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
