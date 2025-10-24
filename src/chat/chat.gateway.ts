import { WebSocketGateway, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import { Body, UseGuards } from '@nestjs/common';
import { addPersonalChatAnswer, AddUserDto, AddUserServiceAnswer, CreateGroupChatDto, CreateOnePersonChatDto, DeleteUserServiceAnswer, NewChatResult } from './dto/chat-work.dto';
import { subscribe } from 'diagnostics_channel';
import { RedisControlService } from 'src/redis/redis-control.service';
import { PrismaControlService } from 'src/prisma/prisma-control.service';
import { message } from '@prisma/client';
import { NewMessageDto } from './dto/message-dto';
import { sendMessageGuard } from './guard/sendMessageGuard';
import { chatDto, messageDto, userDto } from './dto/ChatsInfoDto';
import { error, group } from 'console';
import { console } from 'inspector';
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatService: ChatService, private readonly redisControlService: RedisControlService, private readonly prismaControlService: PrismaControlService) { }

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    const cookies = cookie.parse(client.handshake.headers.cookie || '');
    const sessionId = cookies['sessionId'];
    try {
      await this.redisControlService.Create_Socket_User_redis(sessionId, client.id, client);
    }
    catch (err) {
      console.error("error:", err);
    }


    console.log(sessionId, client.id);
  }
  async handleDisconnect(client: Socket) {
    console.log(`disconected:${client.id}`);
    await this.redisControlService.delete_Disconected_Suckets_Redis(client.id);

  }
  async handleDisconnecting(client: Socket) {
    console.log(`disconected:${client.id}`);
    await this.redisControlService.delete_Disconected_Suckets_Redis(client.id);

  }

  @SubscribeMessage('deleteSession')
  async DeleteMessage(client: Socket) {
    console.log("delete");
    await this.redisControlService.delete_Session_Redis(client.id);
    await this.redisControlService.delete_Disconected_Suckets_Redis(client.id);
    client.disconnect();
  }

  @SubscribeMessage('addPersonalChat')
  async AddPersonalChat(client: Socket, data: CreateOnePersonChatDto) {
    const addPersonalChatAnswer: addPersonalChatAnswer | undefined = await this.chatService.NewPrivateChat(client, data.username);
    if (!addPersonalChatAnswer?.creatingChatAnswer.success) {
      return addPersonalChatAnswer?.creatingChatAnswer;
    }
    addPersonalChatAnswer?.newChatResult.map((c) => {
      console.log(c.socketid);
      this.server.to(c.socketid).emit('newChat', c.chat);
    })
    
    return addPersonalChatAnswer?.creatingChatAnswer;
  }
  @SubscribeMessage('addGroupChat')
  async AddGroupChat(client: Socket, data: CreateGroupChatDto) {
    const AddGroupChatInfo = await this.chatService.AddGroupChat(client, data);
    if (!AddGroupChatInfo.AddGroupAnswer.success) {
      return AddGroupChatInfo.AddGroupAnswer;
    }
    AddGroupChatInfo.AllIdsSockets?.map((socket) => {
      this.server.to(socket).emit('newChat', AddGroupChatInfo.chat);
    })
    return AddGroupChatInfo.AddGroupAnswer;

  }
  @SubscribeMessage('IsUserExist')
  async IsUserExistMessage(client: Socket, data: CreateOnePersonChatDto) {
    const IsUserExist = await this.chatService.IsUserExistFunc(data.username)
    return IsUserExist;
  }

  @SubscribeMessage("getAllChats")
  async GetAllChats(client: Socket) {
    const Info = await this.chatService.GetAllChats(client);
    return { ...Info };
  }


  @SubscribeMessage("sendMessage")
  @UseGuards(sendMessageGuard)
  async SendMessage(client: Socket, data: NewMessageDto) {
    const newSendBackMessage = await this.chatService.CreateMessage(client, data);
    for (const socket of newSendBackMessage.listOfSockets) {
      console.log("message");
      this.server.to(socket).emit("newRecivedMessage", newSendBackMessage.newMessage)
    }
    return newSendBackMessage.newMessage;
  }

  @SubscribeMessage("addUserToChat")
  async AddUserToChatFunc(client: Socket, data: AddUserDto) {
    const AddChatAnswerFromService: AddUserServiceAnswer = await this.chatService.AddUserToChat(client, data.chatId, data.username);
    for (const socket of AddChatAnswerFromService.socketsOfAddedUser) {
      this.server.to(socket).emit("newChat", AddChatAnswerFromService.chat);
    }
    for (const socket of AddChatAnswerFromService.socketsOfUsers) {
      this.server.to(socket).emit("UserAdded", { username: data.username, chatId: data.chatId });
    }

  }
  @SubscribeMessage("deleteUserFromChat")
  async DeleteUserFromChatFunc(client: Socket, data: { chatId: number }) {
    const DeleteUserAnswer: DeleteUserServiceAnswer = await this.chatService.DeleteUserFromChat(client, data.chatId);
    for (const socket of DeleteUserAnswer.socketsOfDeletedUser) {
      this.server.to(socket).emit("DeleteChat", data.chatId);
    }
    for (const socket of DeleteUserAnswer.socketsOfUsers) {
      this.server.to(socket).emit("DeleteUserFromChat", { chatId: data.chatId, username: DeleteUserAnswer.username });
    }



  }
}
