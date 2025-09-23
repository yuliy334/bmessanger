import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegistrationDTO } from './register.dto';
import { find } from 'rxjs';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private readonly prismaService: PrismaService) { }

    async registration(dto: RegistrationDTO) {
        const { username, password } = dto;
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

            const sessionId = crypto.randomUUID();
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
            const sessionId = crypto.randomUUID();
            return sessionId;
        }
        else {
            return false;
        }
    }
}
