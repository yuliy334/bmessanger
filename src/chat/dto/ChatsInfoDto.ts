import { IsNotEmpty } from "class-validator";

export class userDto {
    username: string;
}
export class messageDto {
    senderName: string;
    text: string;
    chatId: number;
    createdAt: Date
}
export class chatDto {
    chatName: string;
    id: number;
    messages: messageDto[];
    type: string;
    users: userDto[];

}

export class InfoDto {
    username: string;
    chats: chatDto[];
}