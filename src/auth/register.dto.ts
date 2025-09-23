import { IsNotEmpty, IsString } from "class-validator";

export class RegistrationDTO {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
