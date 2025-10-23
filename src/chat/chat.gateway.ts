import { WebSocketGateway, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import { Body, UseGuards } from '@nestjs/common';
import { addPersonalChatAnswer, CreateGroupChatDto, CreateOnePersonChatDto, NewChatResult } from './dto/create-chat.dto';
import { subscribe } from 'diagnostics_channel';
import { RedisControlService } from 'src/redis/redis-control.service';
import { PrismaControlService } from 'src/prisma/prisma-control.service';
import { message } from '@prisma/client';
import { NewMessageDto } from './dto/message-dto';
import { sendMessageGuard } from './guard/sendMessageGuard';
import { messageDto } from './dto/ChatsInfoDto';
import { error, group } from 'console';
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
    addPersonalChatAnswer?.newChatResult.map((c) => {
      this.server.to(c.socketid).emit('newChat', c.chat);
    })
    return addPersonalChatAnswer?.creatingChatAnswer;
  }
  @SubscribeMessage('addGroupChat')
  async AddGroupChat(client:Socket, data:CreateGroupChatDto){
    console.log(data);
    const AddGroupChatInfo = await this.chatService.AddGroupChat(client,data); 
    console.log(AddGroupChatInfo);
    if(!AddGroupChatInfo.AddGroupAnswer.success){
      return AddGroupChatInfo.AddGroupAnswer;
    }
    AddGroupChatInfo.AllIdsSockets?.map((socket)=>{
      this.server.to(socket).emit('newChat',AddGroupChatInfo.chat);
    })
    return AddGroupChatInfo.AddGroupAnswer;

  }
  @SubscribeMessage('IsUserExist')
  async IsUserExistMessage(client:Socket, data:CreateOnePersonChatDto){
    console.log("sdfsdf",data.username);
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
    for(const socket of newSendBackMessage.listOfSockets){
      this.server.to(socket).emit("newRecivedMessage",newSendBackMessage.newMessage)
    }
    return newSendBackMessage.newMessage;
  }
}
