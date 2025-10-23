import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { Socket } from "socket.io";
import { PrismaControlService } from "src/prisma/prisma-control.service";
import { RedisControlService } from "src/redis/redis-control.service";
import { NewMessageDto } from "../dto/message-dto";

@Injectable()
export class sendMessageGuard implements CanActivate {
    constructor(private readonly PrismaService: PrismaControlService, private readonly redisServise: RedisControlService ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client: Socket = context.switchToWs().getClient();
        const data:NewMessageDto = context.switchToWs().getData();

        const userid = await this.redisServise.getIdFromSocket(client);

        const IsExistObject = await this.PrismaService.IsUserInChatFunc(userid, data.chatId);


       const IsExistUserInChat = IsExistObject&&IsExistObject?.users.length>0?true:false;

        return IsExistUserInChat;
    }
}