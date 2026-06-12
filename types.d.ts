import type { Router } from 'express';
import TelegramBot from 'node-telegram-bot-api';

export interface TelegramFile {
  file_path: string;
  url: string;
}

export type ExtendedPhotoSize = TelegramBot.PhotoSize & {
  file?: TelegramFile;
};

export type ExtendedMessage = TelegramBot.Message & {
  id?: string;
  data?: string;
  type?: string;
  voice?: TelegramBot.Voice & { file?: TelegramFile };
  document?: TelegramBot.Document & {
    file?: TelegramFile;
    thumb?: ExtendedPhotoSize;
    thumbnail?: ExtendedPhotoSize;
  };
  video?: TelegramBot.Video & {
    file?: TelegramFile;
    thumb?: ExtendedPhotoSize;
    thumbnail?: ExtendedPhotoSize;
  };
  audio?: TelegramBot.Audio & { file?: TelegramFile };
  video_note?: TelegramBot.VideoNote & {
    file?: TelegramFile;
    thumb?: ExtendedPhotoSize;
    thumbnail?: ExtendedPhotoSize;
  };
  photo?: ExtendedPhotoSize[];
};

export type CallbackQueryMessage = Partial<ExtendedMessage> & {
  id: string;
  data?: string;
  from: TelegramBot.User;
  inline_message_id?: string;
  chat_instance: string;
  game_short_name?: string;
};

export type EventMessage = ExtendedMessage | CallbackQueryMessage;

export type ExtendedInlineQuery = TelegramBot.InlineQuery & {
  chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
};

export interface ActivityStreamsActor {
  type?: string;
  name?: string;
  id?: string;
  [property: string]: unknown;
}

export interface ActivityStreamsObject {
  type?: string;
  [property: string]: unknown;
}

export interface ActivityStreamsActivity {
  '@context': 'https://www.w3.org/ns/activitystreams';
  type: 'Activity';
  summary?: string;
  instrument: {
    type: 'Application';
    name: 'Telegram';
  };
  actor: ActivityStreamsActor;
  object: ActivityStreamsObject[];
  target?: ActivityStreamsActor;
  origin: ActivityStreamsActor;
  startTime: string;
}

export type EventHandler = (
  activity: ActivityStreamsActivity,
  message: EventMessage,
  bot: TelegramBot,
) => unknown;

export type ForwardMessagesHandler = (
  activities: ActivityStreamsActivity[],
  messages: ExtendedMessage[],
) => unknown;

export type InlineQueryHandler = (
  activity: ActivityStreamsActivity,
  query: ExtendedInlineQuery,
  bot: TelegramBot,
) => unknown;

export type EventHandlers<
  Events extends Record<string, unknown> = Record<string, EventHandler>,
> = {
  [Event in keyof Events]: Event extends 'inline_query'
    ? InlineQueryHandler
    : EventHandler;
};

export type PrivateEventHandlers<
  Events extends Record<string, unknown> = Record<string, EventHandler>,
> = {
  [Event in keyof Events]: Event extends 'message_forwards'
    ? ForwardMessagesHandler
    : Event extends 'inline_query'
      ? InlineQueryHandler
      : EventHandler;
};

export interface TelegramExpressOptions<
  PrivateEvents extends Record<string, unknown> = Record<string, EventHandler>,
  PublicEvents extends Record<string, unknown> = Record<string, EventHandler>,
> {
  token: string;
  domain?: string;
  port?: number;
  restart?: boolean;
  privateEvents?: PrivateEventHandlers<PrivateEvents>;
  publicEvents?: EventHandlers<PublicEvents>;
  onError?: (bot: TelegramBot, error: Error) => unknown;
}

export interface TelegramExpressResult {
  bot: TelegramBot;
  middleware: Router;
}

export default function telegramExpress<
  PrivateEvents extends Record<string, unknown> = Record<string, EventHandler>,
  PublicEvents extends Record<string, unknown> = Record<string, EventHandler>,
>(
  options: TelegramExpressOptions<PrivateEvents, PublicEvents>,
): TelegramExpressResult;
