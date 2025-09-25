import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegistrationDTO } from './register.dto';
import { find } from 'rxjs';
import bcrypt from 'bcrypt';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AuthService {
    constructor(private readonly prismaService: PrismaService, private readonly redisService: RedisService) { }

    async FindSessionId(sessionId:string):Promise<string|Number>{
        const userFromSession = await this.redisService.get(`sessionid:${sessionId}:userid`);

        return userFromSession ?? -1;
    }

    async registration(dto: RegistrationDTO) {
        const { username, password } = dto;
        console.log(username);
        console.log(password);
        if (await this.prismaService.user.findFirst({
            where: {
                username: username,
            }
        })) {
            return "exist";
        }
        else {
            const hashedPassword = await bcrypt.hash(password, 10);
            await this.prismaService.user.create({
                data: {
                    username: username,
                    password: hashedPassword,
                }
            })

            const userid = await this.UsernameToUserid(username) || -1;
            const sessionId = crypto.randomUUID();
            this.redisService.set(`sessionid:${sessionId}:userid`, userid.toString(),60*60*24);
            return sessionId;
        }

    }

    async log_in(dto: RegistrationDTO) {
        const { username, password } = dto;
        const hashed_password = await this.prismaService.user.findFirst({
            where: {
                username: username
            },
            select: {
                password: true
            }
        });
        if (hashed_password == null) {
            return false;
        }
        if (await bcrypt.compare(password, hashed_password.password)) {
            const userid = await this.UsernameToUserid(username) || -1;
            const sessionId = crypto.randomUUID();
            this.redisService.set(`sessionid:${sessionId}:userid`, userid.toString(),60*60*24);
            return sessionId;
        }
        else {
            return false;
        }
    }

    async UsernameToUserid(username: string) {
        const usernameid = await this.prismaService.user.findFirst({
            where: {
                username: username
            },
            select: {
                id: true
            }
        });
        return usernameid?.id
    }
}
