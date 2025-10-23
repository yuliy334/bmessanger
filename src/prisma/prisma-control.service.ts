import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Socket } from 'socket.io';
import { RedisControlService } from 'src/redis/redis-control.service';
import { PrismaClient } from '@prisma/client/extension';
import { NewMessageDto } from 'src/chat/dto/message-dto';

@Injectable()
export class PrismaControlService {
  constructor(private readonly prismaService: PrismaService, private readonly redisControlService: RedisControlService) {
  }

  async get_User_Id_From_Username(username: string) {
    const userId = await this.prismaService.user.findFirst({
      where: {
        username: username
      },
      select: {
        id: true
      }
    })
    return userId;
  }
  async get_UserName_From_UserId(id: number) {
    const username = await this.prismaService.user.findFirst({
      where: {
        id: id
      },
      select: {
        username: true
      }
    })
    return username;
  }
  async SendAllChats(client: Socket) {
    const userId = await this.redisControlService.getIdFromSocket(client);
    const Chats = await this.prismaService.chat.findMany({
      where: {
        users: {
          some: { id: userId }
        }
      },
      select: {
        id: true,
        type: true,
        users: {
          select: {
            id: true,
            username: true
          }
        },
        messages: {
          select: {
            text: true,
            createdAt: true,
            sender: {
              select: {
                username: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        info: true,
      }

    })
    const formattedChat = Chats.map(chat => {
      let chatName: string | undefined = "";
      chat.messages = chat.messages.reverse()
      if (chat.type == "private") {
        const anotherUser = chat.users.find(user => user.id != userId);
        chatName = anotherUser?.username;
      }
      else {
        chatName = chat.info?.title ?? "";
      }

      const messages = chat.messages.map((message) => ({
        senderName: message.sender.username,
        text: message.text,
        chatId: chat.id,
        createdAt: message.createdAt
      }));

      return {
        chatName, id: chat.id, type: chat.type, messages, users: chat.users.map(u => ({ username: u.username }))
      }
    })

    return formattedChat ?? {};
  }
  async getOneChat(chatid: number, userid: number) {
    const chat = await this.prismaService.chat.findFirst({
      where: {
        id: chatid
      },
      select: {
        id: true,
        type: true,
        users: {
          select: {
            id: true,
            username: true
          }
        },
        messages: {
          select: {
            text: true,
            createdAt: true,
            sender: {
              select: {
                username: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        info: true,
      }
    })
    if (chat) {
      const chatName = chat.type == "private"
        ? chat.users.find(user => user.id !== userid)?.username ?? ""
        : chat.info?.title ?? "";

      const messages = chat.messages.map((message) => ({
        senderName: message.sender.username,
        text: message.text,
        chatId: chat.id,
        createdAt: message.createdAt
      }));


      return { chatName, id: chat.id, type: chat.type, messages, users: chat.users.map(u => ({ username: u.username })) };
    }


  }
  async getUsersInChat(chatid: number) {
    const usersInChat = await this.prismaService.chat.findFirst({
      where: {
        id: chatid
      },
      select: {
        users: {
          select: {
            id: true
          }
        }
      }
    })
    const userIds = usersInChat?.users.map(u => u.id) || [];
    return userIds;
  }
  async IsThisPersonalChatExist(userOne: number, userTwo: number): Promise<boolean> {
    const ifExist = await this.prismaService.user.findFirst({
      where: {
        id: userOne
      },
      select: {
        chats: {
          where: {
            type: "private",
            users: {
              every: { id: { in: [userOne, userTwo] } }
            }
          }
        }
      }
    })
    // console.log(ifExist);
    return ifExist?.chats.length != 0 ? true : false;
  }

  async IsUserInChatFunc(userId: number, chatId: number) {
    const IsUserInChat = await this.prismaService.chat.findFirst({
      where: {
        id: chatId
      },
      select: {
        users: {
          where: {
            id: userId
          }
        }
      }
    })
    return IsUserInChat;
  }

}
