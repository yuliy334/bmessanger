import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { Socket } from 'socket.io';

@Injectable()
export class RedisControlService {
    constructor(private readonly redisService: RedisService) { }

    async getIdFromSession(sessionId: string) {
        const userId = await this.redisService.get(`sessionid:${sessionId}:userid`);
        return userId ?? "-1";
    }
    async getIdFromSocket(client: Socket): Promise<number> {
        const userId = await this.redisService.get(`socket:${client.id}:userid`);

        return userId ? +userId : -1;
    }

    async Create_Socket_User_redis(sessionId: string, socketId: string, socket: Socket) {
        const userId = await this.getIdFromSession(sessionId);

        if (userId != "-1") {
            await this.redisService.set(`socket:${socketId}:userid`, userId)
            await this.redisService.SADD(`user:${userId}:sockets`, socketId);
        }
        else {
            console.log("what the fuck");
            socket.disconnect(true);
        }

    }

    async delete_Disconected_Suckets_Redis(socketId: string) {
        const userId = await this.redisService.get(`socket:${socketId}:userid`);
        await this.redisService.del(`socket:${socketId}:userid`);
        await this.redisService.SREM(`user:${userId}:sockets`, socketId);
    }
    async delete_Session_Redis(socketId: string) {
        const userId = await this.redisService.get(`socket:${socketId}:userid`);
        const sessionId = await this.redisService.get(`userid:${userId}:sessionid`);
        await this.redisService.del(`userid:${userId}:sessionid`);
        await this.redisService.del(`sessionid:${sessionId}:userid`);
    }
    async getSocketsFromUserId(userid: number) {
        const socketid = await this.redisService.SMEMBERS(`user:${userid}:sockets`);
        return socketid;
    }


}
