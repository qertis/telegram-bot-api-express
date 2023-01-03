# telegram-bot-api-express

Simple and powerful Telegram Bot API expressjs middleware.

## Install
```bash
npm i express --save
npm i body-parser --save
npm i telegram-express --save
```

## Test
> See tests directory

```bash
npm test
```

## Usage
```javascript
const express = require('express');
const telegramExpress = require('telegram-express');

const app = express();

app.use(telegramExpress({
    token: 'TELEGRAM_TOKEN',
    domain: 'http://127.0.0.1',
    events: {
        // Listen for any kind of message. There are different kinds of messages.
        ['message']: (bot, message) => {
            bot.sendMessage(message.chat.id, 'Hello World');
        },
        // Matches "/echo [whatever]"
        [/\/echo (.+)/]: (bot, msg) => {
            bot.sendMessage(message.chat.id, 'PONG');
        },
    },
}));

app.listen(8080, () => {});
```

## More other telegram types!
Make [native types](https://core.telegram.org/bots/api) and use those types: 

```
edited_message_text
bot_command
reply_to_message
mention
channel_post
error
```

## Dependencies
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)

## PeerDependencies
- express
- body-parser
