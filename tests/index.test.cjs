const test = require('ava');
const express = require('express');
const TelegramServer = require('telegram-test-api');
const telegramExpress = require('../index.cjs');

const app = express();
const token = '-1';
const domain = 'localhost';
const port = 9001;
const userId = 1;

app.use(telegramExpress({
    token: token,
    domain: domain,
    port: port,
    privateEvents: {
      [/^\/(ping|пинг)$/]: (bot) => {
        bot.sendMessage(userId, 'PONG');
      },
      [/error/]: () => {
        throw new Error('Generate new error');
      },
    },
    publicEvents: {
      ['text']: (bot) => {
        bot.sendMessage(userId, 'text');
      },
    },
  }));

/**
 * This runs before all tests
 */
test.before(async (t) => {
  const server = new TelegramServer({
    host: domain,
    port: port,
    storage: 'RAM',
    storeTimeout: 60,
  });
  await server.start();

  t.log(`TelegramServer: ${domain}:${port} started`);
  const client = server.getClient(token);
  /*eslint-disable require-atomic-updates */
  t.context.server = server; // TelegramServer context
  t.context.client = client;
  t.context.tasks = {};
  t.context.app = app; // ExpressServer context
  /*eslint-enable */
});

test.beforeEach((t) => {
  const startedTestTitle = t.title.replace('beforeEach hook for ', '');
  t.context.tasks[startedTestTitle] = startedTestTitle;
});

test.afterEach((t) => {
  const successTestTitle = t.title.replace('afterEach hook for ', '');
  delete t.context.tasks[successTestTitle];
});

// This runs after all tests
test.after.always('guaranteed cleanup', (t) => {
  if (!t.context.tasks) {
    return;
  }
  const failedTasks = Object.entries(t.context.tasks).map(([taskName]) => {
    return taskName;
  });
  if (failedTasks.length === 0) {
    return;
  }
  t.log('Failed: ', failedTasks);
});

test('/ping', async (t) => {
  const { client } = t.context;
  {
    const message = client.makeMessage('/ping');
    await client.sendMessage(message);
    const updates = await client.getUpdates();
    t.true(updates.ok);
    t.is(updates.result[0].message.text, 'PONG');
  }
  {
    const message = client.makeMessage('/пинг');
    await client.sendMessage(message);
    const updates = await client.getUpdates();
    t.true(updates.ok);
    t.true(updates.result[0].message.text.length > 0);
    t.is(updates.result[0].message.text, 'PONG');
  }
});

test('/error', async (t) => {
  const { client } = t.context;
  {
    const message = client.makeMessage('/error');
    await client.sendMessage(message);
    await t.throwsAsync(client.getUpdates(), { instanceOf: Error });
  }
});

test('text', async (t) => {
  const { client } = t.context;
  {
    const message = client.makeMessage('simple text');
    message.chat.type = 'group'
    const resultMessage = await client.sendMessage(message);
    t.true(resultMessage.ok);
    const updates = await client.getUpdates();
    t.true(updates.ok);
  }
})
