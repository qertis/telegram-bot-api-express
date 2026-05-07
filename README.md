# Telegram Bot API Express

Simple and powerful Telegram Bot API express.js middleware.

## Install

```bash
npm i telegram-bot-api-express --save
```

## Dependencies
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- [telegram-bot-activitystreams](https://github.com/qertis/telegram-bot-activitystreams)

## PeerDependencies
- express >= 4.22.x
- body-parser >= 1.20.3

## Requirements
- Node.js >= 22.x
- npm >= 10.x

## Usage

```javascript
const express = require('express');
const telegramExpress = require('telegram-bot-api-express');

const app = express();
app.use(telegramExpress({
    token: 'YOUR_TELEGRAM_BOT_TOKEN',
    domain: 'https://yourdomain.com',
    privateEvents: {
        // Listen for any kind of message
        ['message']: (activity, message, bot) => {
            bot.sendMessage(message.chat.id, 'Hello World');
        },
        // Matches "/echo [whatever]" via RegExp
        [/\/echo (.+)/]: (activity, message, bot) => {
            bot.sendChatAction(message.chat.id, 'typing');
            bot.sendMessage(message.chat.id, 'PONG');
        },
    },
    publicEvents: {
        ['text']: (activity, message, bot) => {
            bot.sendMessage(message.chat.id, 'Got your message in a group!');
        },
    },
    onError(bot, error) {
        console.error(error);
    }
}).middleware);
app.listen(8080, () => {});
```

## Options

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `token` | `string` | ✅ | — | Telegram Bot Token |
| `domain` | `string` | | — | Your public HTTPS domain. If set (outside test mode), webhook is configured automatically at `${domain}/telegram/bot${token}` |
| `port` | `number` | | — | Port used only in test mode (`NODE_ENV=test`) together with `domain` |
| `restart` | `boolean` | | `false` | Restart polling on failure |
| `privateEvents` | `object` | | `{}` | Handlers for private chats (1-on-1 with the bot) |
| `publicEvents` | `object` | | `{}` | Handlers for group/supergroup/channel chats |
| `onError` | `function` | | `console.error` | Error handler, called as `onError(bot, error)` |

## Return value

The factory function returns `{ bot, middleware }`:
- `bot` — the underlying `TelegramBot` instance
- `middleware` — an Express `Router` to pass into `app.use()`

## Modes

- **Webhook** (`domain` is set, `NODE_ENV !== 'test'`): automatically deletes the old webhook and registers a new one. The bot listens at `POST /telegram/bot<token>`.
- **Polling** (no `domain`): starts long-polling directly.
- **Test** (`NODE_ENV=test`, both `domain` and `port` are required): starts polling against a local Telegram test server at `http://${domain}:${port}`.

## Event types

Handler signature: `(activity, message, bot)`

### privateEvents

| Event | Description |
|---|---|
| `message` | Any incoming message |
| `text` | Plain text message |
| `bot_command` | Message containing a bot command entity |
| `reply_to_message` | Reply to another message |
| `mention` | Message that mentions a user |
| `edited_message_text` | Edited text message |
| `auth_by_contact` | User shared their own contact (phone auth) |
| `contact` | Any shared contact |
| `inline_query` | Inline query from private chat |
| `/your-regex/flags` | RegExp key — matched against `message.text` |

### publicEvents

| Event | Description |
|---|---|
| `text` | Plain text in a group/supergroup |
| `bot_command` | Bot command in a group/supergroup |
| `mention` | Mention in a group/supergroup |
| `channel_post` | Post in a channel |
| `inline_query` | Inline query from a group/supergroup |
| `/your-regex/flags` | RegExp key — matched against `message.text` |

### Special events

| Event | Signature | Description |
|---|---|---|
| `message_forwards` | `(activities, messages)` | Batch of forwarded messages from a private chat (collected within 1 second) |
| `callback_query` | `(activity, message, bot)` | Inline keyboard button press; matched by `query.data` (string or RegExp key) |

## Native Telegram message types

In addition to the named events above, any [native Telegram message type](https://core.telegram.org/bots/api) can be used as an event key (e.g. `voice`, `photo`, `document`, `video`, `audio`, `video_note`, `sticker`, etc.).

For media messages (`voice`, `document`, `video`, `audio`, `video_note`, `photo`), the file info is automatically extended with a `file` object containing `file_path` and `url`.

## Test

> See `tests/` directory

Uses [Ava](https://github.com/avajs/ava).

```bash
npm test
```
