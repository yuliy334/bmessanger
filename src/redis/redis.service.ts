import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;


    onModuleInit() {
        this.client = new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
        });
    }
    onModuleDestroy() {
        return this.client.quit();
    }
    async set(key: string, value: string, ttl?:number) {
        await this.client.set(key, value);
        if(ttl){
            await this.client.expire(key,ttl);
        }
    }
    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }
    async del(key: string) {
        return this.client.del(key);
    }
}
