import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisControlService } from 'src/redis/redis-control.service';
import { PrismaControlService } from 'src/prisma/prisma-control.service';
import { addPersonalChatAnswer, NewChatResult } from './dto/create-chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly redisService: RedisService, private readonly prismaService: PrismaService, private readonly redisControlService: RedisControlService, private readonly prismaControlService: PrismaControlService) { }

  async NewPrivateChat(client: Socket, username: string): Promise<addPersonalChatAnswer | undefined> {
    const newChatResult: NewChatResult[] = [];
    const creatingChat = await this.CreatePrivateChat(client, username);
    if (creatingChat.success) {
      const userIds = await this.prismaControlService.getUsersInChat(creatingChat.chatId!)
      for (const userid of userIds) {
        const socketid = await this.redisControlService.getSocketsFromUserId(userid);
        if (socketid) {
          const chat = await this.prismaControlService.getOneChat(creatingChat.chatId!, userid);
          if (chat) {
            for (const socket of socketid) {
              newChatResult.push({ chat: chat, socketid: socket })
            }
            return { newChatResult: newChatResult, creatingChatAnswer: creatingChat };
          }

        }
      }
    }
    else {
      return { newChatResult: [], creatingChatAnswer: creatingChat }
    }
    return { newChatResult: [], creatingChatAnswer: creatingChat }
  }

  async CreatePrivateChat(client: Socket, username: string) {

    const userIdFromPrisma = await this.prismaControlService.get_User_Id_From_Username(username);
    const userWhoCreated = await this.redisControlService.getIdFromSocket(client);
    if (!userIdFromPrisma) {
      return { success: false, error: "UserIsNotExist" };
    }

    if (userWhoCreated == userIdFromPrisma.id) {
      return { success: false, error: "SameUser" };
    }
    const userId: number = await this.redisControlService.getIdFromSocket(client);

    const chat = await this.prismaService.chat.create({
      data: {
        type: "private",
        users: {
          connect: [{ id: userId }, { id: userIdFromPrisma.id },],
        }
      }
    })
    if (chat) {
      return { success: true, chatId: chat.id };
    }
    else {
      return { success: false, error: "errorInCreating" };
    }
  }
}
