# telegram-express

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

## Example
```javascript
const express = require('express');
const telegramExpress = require('telegram-express');

const app = express();

app.use(telegramExpress({
    token: 'TELEGRAM_TOKEN',
    domain: 'http://127.0.0.1',
    events: {
        // use native events
        ['text']: (bot, message) => {
            bot.sendMessage(message.chat.id, 'Hello World');
        },
        // use RegExp events
        [/^\/(ping|пинг)$/]: (bot, message) => {
            bot.sendMessage(message.chat.id, 'PONG');
        },
        // Show error
        ['error']: (bot, message) => {
            console.error(message);
        },
    },
}));
```
