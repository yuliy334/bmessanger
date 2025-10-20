import { WebSocketGateway, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import { Body } from '@nestjs/common';
import { addPersonalChatAnswer, CreatePrivateChatDto, NewChatResult } from './dto/create-chat.dto';
import { subscribe } from 'diagnostics_channel';
import { RedisControlService } from 'src/redis/redis-control.service';
import { PrismaControlService } from 'src/prisma/prisma-control.service';
import { message } from '@prisma/client';
import { messageDto } from './dto/message-dto';
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
  async AddPersonalChat(client: Socket, data: CreatePrivateChatDto) {

    const addPersonalChatAnswer: addPersonalChatAnswer|undefined = await this.chatService.NewPrivateChat(client, data.username);
    console.log(addPersonalChatAnswer);
    addPersonalChatAnswer?.newChatResult.map((c) => {
      this.server.to(c.socketid).emit('newChat', c.chat);
    })
    return addPersonalChatAnswer?.creatingChatAnswer;
  }
  
  @SubscribeMessage("getAllChats")
  async GetAllChats(client: Socket) {
    const Chats = await this.prismaControlService.SendAllChats(client);
    const Userid= await this.redisControlService.getIdFromSocket(client);
    const userName = await this.prismaControlService.get_UserName_From_UserId(Userid);
    return {userName, Chats};
  }

  @SubscribeMessage("sendMessage")
  async SendMessage(client:Socket, data:messageDto){
    await this.chatService.CreateMessage(client,data);
  }
}
