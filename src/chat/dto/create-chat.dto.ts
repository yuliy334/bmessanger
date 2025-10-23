import { chatDto } from "./ChatsInfoDto";
import { isNotEmpty, IsNotEmpty, IsString } from "class-validator";

export class CreateOnePersonChatDto {
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
