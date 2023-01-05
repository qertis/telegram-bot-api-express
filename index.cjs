const express = require("express");
const jsonParser = require("body-parser").json();
const TelegramBot = require("node-telegram-bot-api");

const router = express.Router();

/**
 * @param {object} body - telegram native body
 * @returns {object|Error}
 */
function getMessageFromBody(body) {
  let message;
  let type;
  if (body.message) {
    type = "message";
    message = body.message;
  } else if (body.edited_message) {
    type = "edited_message";
    message = body.edited_message;
  } else if (body.channel_post) {
    type = "channel_post";
    message = body.channel_post;
  } else if (body.callback_query) {
    type = "callback_query";
    message = body.callback_query.message;
  } else {
    throw new Error("Unknown Telegram Body");
  }

  const chatId = String(message.chat && message.chat.id);
  const userId = String(message.from && message.from.id);
  return {
    type,
    message,
    chatId,
    userId
  };
};

function getEventName(message, metadata, eventsList) {
  switch (metadata.type) {
    case "contact": {
      if (!message.from.is_bot && message.contact.user_id === message.from.id) {
        return "auth_by_contact";
      }
      return "contact";
    }
    case "text": {
      // Check RegExp - in first
      for (const str of eventsList) {
        if (str.startsWith("/")) {
          const lastSlash = str.lastIndexOf("/");
          const restoredRegex = new RegExp(str.slice(1, lastSlash), str.slice(lastSlash + 1));

          if (restoredRegex.exec(message.text)) {
            return str;
          }
        }
      }

      if (message.type === "edited_message") {
        return "edited_message_text";
      }
      if (message.reply_to_message) {
        return "reply_to_message";
      }
      // todo стоит добавить возможность отдавать несколько типов событий. например, когда текст будет вида "hello /ping"
      if (Array.isArray(message.entities)) {
        if (message.entities.some((entity) => entity.type === "mention" )) {
          return "mention";
        }
        if (message.entities.some((entity) => entity.type === "bot_command" )) {
          return "bot_command";
        }
      }
      return metadata.type;
    }
    default: {
      return metadata.type;
    }
  }
}

class TelegramBotController {
  /**
   * @constructor
   * @param {String} token - telegram token
   * @param {String} [domain]
   * @param {Number} [port]
   * @param {Object} events
   * @returns {Router}
   */
  constructor({
                token,
                domain,
                port,
                events
              }) {
    let telegramBot;

    if (String(process.env.NODE_ENV).toLowerCase() === "test") {
      if (!domain) {
        throw new Error("domain not init");
      }
      if (!port) {
        throw new Error("Port not init");
      }
      telegramBot = new TelegramBot(token, {
        polling: true,
        baseApiUrl: `http://${domain}:${port}`
      });
      telegramBot.startPolling({ restart: false });
      telegramBot.on("polling_error", (error) => {
        console.error(error.stack);
      });
    } else if (domain) {
      telegramBot = new TelegramBot(token);
      telegramBot
        .setWebHook(`${domain}/telegram/bot${token}`, {
          max_connections: 3,
          baseApiUrl: "https://api.telegram.org"
        })
        .then(() => {
          console.info("set webhook completed");
        })
        .catch((error) => {
          console.error(error.stack);
        });
      telegramBot.on("webhook_error", (error) => {
        console.error(error.stack);
      });
    } else {
      telegramBot = new TelegramBot(token);
      telegramBot.startPolling({ restart: false });
      telegramBot.on("polling_error", (error) => {
        console.error(error.stack);
      });
    }

    telegramBot.on("message", async (message, metadata) => {
      const eventName = getEventName(message, metadata, Reflect.ownKeys(events));

      if (message?.voice?.file_id) {
        message.voice.file = await this.getTelegramFile(message.voice.file_id);
      }
      if (message?.document?.file_id) {
        message.document.file = await this.getTelegramFile(message.document.file_id);
      }
      if (message?.video?.file_id) {
        message.video.file = await this.getTelegramFile(message.video.file_id);
        if (message.video?.thumb) {
          message.video.thumb.file = await this.getTelegramFile(message.video.thumb.file_id);
        }
      }
      if (Array.isArray(message.photo)) {
        try {
          message.photo = await Promise.all(message.photo.map(async (photo) => {
            if (photo.file_size > 0 && photo.file_id) {
              const file = await this.getTelegramFile(photo.file_id);
              return {
                ...photo,
                file: file,
              }
            }
            return photo;
          }));
        } catch { }
      }

      if (events[eventName]) {
        events[eventName](this.bot, message);
      }
    });
    telegramBot.on("error", (error) => {
      if (events.error) {
        events.error(this.bot, error);
      }
    });

    this.bot = telegramBot;
    router.post(`/telegram/bot${token}`, jsonParser, (request, response) => this.api.apply(this, [request, response]));

    return router;
  }
  /**
   * @param {string} fileId - file id
   * @returns {Promise<{url: string, file_path: string}>}
   */
  async getTelegramFile(fileId) {
    const TELEGRAM_HOST = "api.telegram.org";
    const fileInfo = await this.bot.getFile(fileId);

    return {
      file_path: fileInfo.file_path,
      url: `https://${TELEGRAM_HOST}/file/bot${this.bot.token}/${fileInfo.file_path}`,
    }
  }
  /**
   * @description webhook telegram message - extend default telegram request message
   * @param {express.Request} request
   * @param {express.Response} response
   * @returns {Promise<void>}
   */
  async api(request, response) {
    try {
      const { message, type } = getMessageFromBody(
        request.body
      );
      this.bot.processUpdate({
        ...request.body,
        message: {
          ...message,
          type,
        }
      });
      response.sendStatus(200);
    } catch {
      response.sendStatus(400);
    }
  };
};

module.exports = (args) => new TelegramBotController(args);
