import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisControlService } from 'src/redis/redis-control.service';
import { PrismaControlService } from 'src/prisma/prisma-control.service';
import { addPersonalChatAnswer, NewChatResult } from './dto/create-chat.dto';
import { messageDto } from './dto/message-dto';

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

          }

        }
      }
    }
    else {
      return { newChatResult: [], creatingChatAnswer: creatingChat }
    }
    return { newChatResult: newChatResult, creatingChatAnswer: creatingChat };
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

    const IsChatExist = await this.prismaControlService.IsThisPersonalChatExist(userIdFromPrisma?.id, userWhoCreated)
    if (IsChatExist) {
      return { success: false, error: "ChatExist" };
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

  async CreateMessage(client: Socket, data: messageDto) {
    const Userid = await this.redisControlService.getIdFromSocket(client);
    const NewMessage = await this.prismaService.message.create({
      data: {
        chatId: data.chatId,
        senderId: Userid,
        text: data.text
      }

    });
    const username = await this.prismaControlService.get_UserName_From_UserId(Userid);
    // console.log("newMessage: ",NewMessage);
    const newSendBackMessage = { text: data.text, senderName: username?.username, createdAt: NewMessage.createdAt };
    return newSendBackMessage;
  }
}
