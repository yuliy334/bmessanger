import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisControlService } from './redis-control.service';

@Global()
@Module({
  providers: [RedisService, RedisControlService],
  exports:[RedisService, RedisControlService],
})
export class RedisModule {}
