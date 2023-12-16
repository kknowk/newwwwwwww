import { Test, TestingModule } from '@nestjs/testing';
import { ApiUserController } from './api-user.controller.js';

describe('UserController', () => {
  let controller: ApiUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiUserController],
    }).compile();

    controller = module.get<ApiUserController>(ApiUserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
