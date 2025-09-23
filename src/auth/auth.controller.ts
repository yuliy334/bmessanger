import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegistrationDTO } from './register.dto';
import type { Response } from 'express'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("reg")
  async registration(@Body() dto: RegistrationDTO, @Res() res: Response) {
    const registrationAnswer = await this.authService.registration(dto);
    if (registrationAnswer != "exist") {
      res.cookie('sessionId', registrationAnswer, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      res.send("you have registrated");
    }
    else {
      res.send(registrationAnswer);
    }
  }
  @Post("login")
  async log_in(@Body() dto: RegistrationDTO, @Res() res: Response) {
    const sessionId = await this.authService.log_in(dto);
    if (sessionId) {
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      res.send("you have login");
    }
    else{
      res.send("incorrect username or password");
    }

  }
}
