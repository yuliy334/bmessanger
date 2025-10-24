import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisControlService } from 'src/redis/redis-control.service';
import { PrismaControlService } from 'src/prisma/prisma-control.service';
import { addPersonalChatAnswer, AddUserServiceAnswer, CreateGroupChatDto, creatingChatAnswer, DeleteUserServiceAnswer, NewChatResult, UserExistAnswer } from './dto/chat-work.dto';
import { NewMessageDto } from './dto/message-dto';
import { messageDto } from './dto/ChatsInfoDto';
import { BlobOptions } from 'buffer';
import { error, time } from 'console';
import { title } from 'process';

@Injectable()
export class ChatService {
  constructor(private readonly redisService: RedisService, private readonly prismaService: PrismaService, private readonly redisControlService: RedisControlService, private readonly prismaControlService: PrismaControlService) { }

  async NewPrivateChat(client: Socket, username: string): Promise<addPersonalChatAnswer | undefined> {
    const newChatResult: NewChatResult[] = [];
    const creatingChat = await this.CreatePrivateChat(client, username);
    if (creatingChat.success) {
      const userIds = await this.prismaControlService.getUsersIdsInChat(creatingChat.chatId!)
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

  async CreateMessage(client: Socket, data: NewMessageDto) {
    const Userid = await this.redisControlService.getIdFromSocket(client);
    const NewMessage = await this.prismaService.message.create({
      data: {
        chatId: data.chatId,
        senderId: Userid,
        text: data.text
      }

    });
    let usersInChat: number[] = await this.prismaControlService.getUsersIdsInChat(data.chatId);
    usersInChat = usersInChat.filter((user) => user != Userid);
    let usersInChatSockets: string[] = [];
    for (const user of usersInChat) {
      const SocketsOfUser = await this.redisControlService.getSocketsFromUserId(user);
      for (const socket of SocketsOfUser) {
        usersInChatSockets.push(socket);
      }
    }

    const username = await this.prismaControlService.get_UserName_From_UserId(Userid);
    const newSendBackMessage = { text: data.text, senderName: username!.username, chatId: data.chatId, createdAt: NewMessage.createdAt };
    return { newMessage: newSendBackMessage, listOfSockets: usersInChatSockets };
  }

  async GetAllChats(client: Socket) {
    const chats = await this.prismaControlService.SendAllChats(client);

    const chatWithMessages = chats.filter((chat) => chat.messages.length > 0);
    const chatWithoutMessages = chats.filter((chat) => chat.messages.length == 0);

    const sortedChat = chatWithMessages.sort((first, second) => new Date(second.messages.at(-1)!.createdAt).getTime() - new Date(first.messages.at(-1)!.createdAt).getTime());


    const Userid = await this.redisControlService.getIdFromSocket(client);
    const userName = await this.prismaControlService.get_UserName_From_UserId(Userid);
    const username = userName?.username;

    const formattedChat = [...sortedChat, ...chatWithoutMessages];
    return { username, chats: formattedChat };
  }


  async IsUserExistFunc(username: string): Promise<UserExistAnswer> {
    const user = await this.prismaService.user.findFirst({
      where: {
        username: username,
      }
    })
    if (user) {
      return { IsExist: true }
    }
    return { IsExist: false, error: "the user does not exist" };
  }

  async AddGroupChat(client: Socket, data: CreateGroupChatDto) {
    let idsOfUsers: number[] = [];
    if (!data.title) {
      const AddGroupAnswer: creatingChatAnswer = { success: false, error: `title does not exist` };
      return { AddGroupAnswer }
    }
    for (const user of data.users) {
      const id = await this.prismaControlService.get_User_Id_From_Username(user);
      if (!id) {
        const AddGroupAnswer: creatingChatAnswer = { success: false, error: `User ${user} does not exist` };
        return { AddGroupAnswer }
      }
      idsOfUsers.push(id.id);
    }
    let AllIdsSockets: string[] = [];
    const userId = await this.redisControlService.getIdFromSocket(client);
    idsOfUsers.push(userId);

    const usersSuckets = idsOfUsers.map(async (id) => {
      const idSockets = await this.redisControlService.getSocketsFromUserId(id);
      AllIdsSockets.push(...idSockets);
    })
    const AddGroupAnswer = await this.prismaControlService.CreateGroupChat(idsOfUsers, data.title);
    if (AddGroupAnswer.chatId) {
      const chat = await this.prismaControlService.getOneChat(AddGroupAnswer.chatId);
      return { AddGroupAnswer, AllIdsSockets, chat };
    }
    else {
      return { AddGroupAnswer };
    }


  }
  async AddUserToChat(client: Socket, chatId: number, username: string): Promise<AddUserServiceAnswer> {
    if (!await this.prismaControlService.getOneChat(chatId)) {
      throw new NotFoundException('Chat does not exist');
    }
    const AddedUserId = await this.prismaControlService.get_User_Id_From_Username(username);
    if (!AddedUserId) {
      throw new NotFoundException('User does not exist');
    }
    const IsUserInChat = await this.prismaControlService.IsUserInChatFunc(AddedUserId.id, chatId);
    if (IsUserInChat && IsUserInChat?.users.length > 0) {
      throw new NotFoundException('User alredy in chat');
    }
    await this.prismaControlService.AddUserToChat(chatId, AddedUserId.id);
    const chat = await this.prismaControlService.getOneChat(chatId);
    let UsersFromChatId = await Promise.all((chat?.users ?? []).map(async (user) => {
      if (user.username == username) {
        return;
      }
      return (await this.prismaControlService.get_User_Id_From_Username(user.username))?.id;
    }));


    const socketsOfAddedUser = await this.redisControlService.getSocketsFromUserId(AddedUserId.id);
    const socketsOfUsers: string[] = [];

    if (!UsersFromChatId) {
      UsersFromChatId = [];
    }

    for (const id of UsersFromChatId) {
      if (id) {
        const socketFromId = await this.redisControlService.getSocketsFromUserId(id);
        socketsOfUsers.push(...socketFromId);
      }

    }
    if (!chat) {
      throw new NotFoundException('Chat does not exist');
    }
    return { success: true, chat: chat, socketsOfAddedUser, socketsOfUsers };

  }




  async DeleteUserFromChat(client: Socket, chatId: number): Promise<DeleteUserServiceAnswer> {
    const userId = await this.redisControlService.getIdFromSocket(client);
    const username = await this.prismaControlService.get_UserName_From_UserId(userId);
    const DeleteduserSockets = await this.redisControlService.getSocketsFromUserId(userId);
    await this.prismaControlService.DeleteUserFromChat(userId, chatId);
    const UsersFromChatId = await this.prismaControlService.getUsersIdsInChat(chatId);
    const socketsOfUsers: string[] = [];
    for (const id of UsersFromChatId) {
      if (id) {
        const socketFromId = await this.redisControlService.getSocketsFromUserId(id);
        socketsOfUsers.push(...socketFromId);
      }

    }

    return { success: true, chatId: chatId, username: username?.username, socketsOfDeletedUser: DeleteduserSockets, socketsOfUsers }

  }

}
