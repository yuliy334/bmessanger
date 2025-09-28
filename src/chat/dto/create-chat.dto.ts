export class CreatePrivateChatDto {
    username:string;

}
export interface NewChatResult {
    chat: any;
    socketid: string;
}
export interface creatingChatAnswer {
    success: boolean;
    error?: string;
    chatId?: number|undefined;
}
export interface addPersonalChatAnswer {
    newChatResult: NewChatResult[];
    creatingChatAnswer: creatingChatAnswer;
}
