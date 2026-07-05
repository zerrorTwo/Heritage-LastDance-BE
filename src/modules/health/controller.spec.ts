import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('ping', () => {
    it('should return status ok with timestamp', () => {
      const result = controller.ping();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should return a valid ISO 8601 timestamp', () => {
      const beforeTime = new Date();
      const result = controller.ping();
      const afterTime = new Date();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000);
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000);
    });
  });
});
