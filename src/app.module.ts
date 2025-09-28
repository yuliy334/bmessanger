import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ChatModule } from './chat/chat.module';
import { RedisControlService } from './redis/redis-control.service';

@Module({
  imports: [AuthModule, PrismaModule, RedisModule, ChatModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, RedisControlService],
})
export class AppModule {}
