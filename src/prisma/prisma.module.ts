import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaControlService } from './prisma-control.service';


@Global()
@Module({
  providers: [PrismaService, PrismaControlService],
  exports: [PrismaService, PrismaControlService],
})
export class PrismaModule {}
