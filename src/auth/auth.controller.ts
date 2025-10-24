import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegistrationDTO } from './register.dto';
import type { Response } from 'express'
import type { Request } from 'express'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }
  @Post("reg")
  async registration(@Body() dto: RegistrationDTO, @Res() res: Response) {
    const registrationAnswer = await this.authService.registration(dto);
    if (registrationAnswer != "exist") {
      res.cookie('sessionId', registrationAnswer, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      res.send({ status: "registrated" });
    }
    else {
      res.status(409).send({ status: "UsernameExist" });
    }
  }
  @Post("login")
  async log_in(@Body() dto: RegistrationDTO, @Res() res: Response) {
    const sessionId = await this.authService.log_in(dto);
    if (sessionId) {
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      res.send({ login: true });
    }
    else {
      res.status(403).send({ login: false });
    }

  }
  @Get("check")
  async checkSession(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.cookies?.["sessionId"];
    if (!sessionId) {
      res.status(401).send({ sessionSuccess: false })
    }
    else {
      const userfromSessoin = await this.authService.FindSessionId(sessionId)
      if (userfromSessoin == -1) {
        res.status(401).send({ sessionSuccess: false })
      }
      else {
        res.send({ sessionSuccess: true });
      }


    }

  }
}
