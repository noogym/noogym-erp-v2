import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const prisma = {
    getStatus: jest.fn(),
  };

  beforeEach(async () => {
    prisma.getStatus.mockReturnValue({
      isReady: true,
      state: 'connected',
      attempts: 1,
      lastCheckedAt: '2026-05-21T00:00:00.000Z',
    });

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return liveness without checking the database', () => {
      expect(appController.getLiveness()).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });

    it('should return readiness when the database is connected', () => {
      expect(appController.getReadiness()).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        database: {
          isReady: true,
          state: 'connected',
          attempts: 1,
          lastCheckedAt: '2026-05-21T00:00:00.000Z',
        },
      });
    });
  });
});
