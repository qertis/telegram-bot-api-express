const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const jsonParser = require("body-parser").json();

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
    case "text": {
      if (message.type === "edited_message") {
        return "edited_message_text";
      }

      // Check RegExp
      for (const str of eventsList) {
        if (str.startsWith("/")) {
          const lastSlash = str.lastIndexOf("/");
          const restoredRegex = new RegExp(str.slice(1, lastSlash), str.slice(lastSlash + 1));

          if (restoredRegex.exec(message.text)) {
            return str;
          }
        }
      }
      return "text";
    }
    default: {
      return metadata.type;
    }
  }
}

class TelegramController {
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

    this.bot = telegramBot;

    telegramBot.on("message", async (message, metadata) => {
      const eventName = getEventName(message, metadata, Reflect.ownKeys(events));

      if (message?.voice?.file_id) {
        message.buffer = await this.getTelegramFile(message.voice.file_id);
      }
      if (message?.document?.file_id) {
        message.buffer = await this.getTelegramFile(message.document.file_id);
      }
      if (Array.isArray(message.photo)) {
        const [smallPhoto, mediumPhoto, bigPhoto] = message.photo;

        if (bigPhoto && bigPhoto.file_size > 0 && bigPhoto.file_id) {
          message.buffer = await this.getTelegramFile(mediumPhoto.file_id);
        } else if (mediumPhoto && mediumPhoto.file_size > 0 && mediumPhoto.file_id) {
          message.buffer = await this.getTelegramFile(mediumPhoto.file_id);
        } else if (smallPhoto && smallPhoto.file_size > 0 && smallPhoto.file_id) {
          message.buffer = await this.getTelegramFile(mediumPhoto.file_id);
        }
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

    router.post(`/telegram/bot${token}`, jsonParser, (request, response) => this.api.apply(this, [request, response]));

    return router;
  }
  /**
   * @param {string} fileId - file id
   * @returns {Promise<ArrayBuffer>}
   */
  async getTelegramFile(fileId) {
    const TELEGRAM_HOST = "api.telegram.org";
    const fileInfo = await this.bot.getFile(fileId);

    const res = await fetch(`https://${TELEGRAM_HOST}/file/bot${this.bot.token}/${fileInfo.file_path}`);
    if (res.status !== 200) {
      throw await Promise.reject("Status was not 200");
    }
    const buffer = await res.arrayBuffer();

    return buffer;
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

module.exports = (args) => new TelegramController(args);
