import { chatDto } from "./ChatsInfoDto";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateOnePersonChatDto {
    @IsString()
    @IsNotEmpty()
    username: string;

}
export class NewChatResult {
    chat: chatDto;
    socketid: string;
}
export class creatingChatAnswer {
    success: boolean;
    error?: string;
    chatId?: number | undefined;
}
export class AddUserServiceAnswer{
    success:boolean;
    chat:chatDto;
    error?:string;
    socketsOfAddedUser:string[];
    socketsOfUsers:string[];

}
export class DeleteUserServiceAnswer{
    success:boolean;
    chatId:number;
    username?:string
    error?:string;
    socketsOfDeletedUser:string[];
    socketsOfUsers:string[];

}

export class addPersonalChatAnswer {
    newChatResult: NewChatResult[];
    creatingChatAnswer: creatingChatAnswer;
}

export class CreateGroupChatDto {
    @IsNotEmpty()
    users: string[];
    @IsNotEmpty()
    title: string;
}
export class UserExistAnswer {
    IsExist: boolean;
    error?: string;
}

export class AddUserDto {
    @IsNotEmpty()
    @IsString()
    username: string;
    @IsNotEmpty()
    @IsNumber()
    chatId: number;
}