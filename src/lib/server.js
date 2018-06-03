'use strict';

const net = require('net');
const logger = require('./logger');
const Client = require('./client');

const app = net.createServer();
let clientPool = [];

const parseCommand = (message, client) => {
  if (!message.startsWith('@')) {
    return false;
  }

  const parsedMessage = message.split(' ');
  const command = parsedMessage[0];
  logger.log(logger.INFO, `Parsing a command ${command}`);

  switch (command) {
    case '@list': {
      const clientNames = clientPool.map(client1 => client1.nickname).join('\n');
      client.write(`${clientNames}\n`);
      break;
    }

    case '@quit': {
      client.socket.write('You have been logged out.\n');
      client.socket.end();
      break;
    }

    case '@nickname': {
      client.nickname = [parsedMessage[1]];
      client.write(`Your name is now: ${client.nickname}`);
      break;
    }

    case '@dm': {
      const reciever = parsedMessage[1];
      const privateMessage = parsedMessage.slice(2).join(' ');

      clientPool.forEach((client1) => {
        if (client1.nickname === reciever) {
          client1.socket.write(`${client.nickname} PRIVATE: ${privateMessage}`);
        }
      });
      break;
    }

    default:
      client.socket.write('Invalid Command');
      break;
  }
  return true;
};

const removeClient = socket => () => {
  clientPool = clientPool.filter(client => client !== socket);
  logger.log(logger.INFO, `Removing ${socket.name}`);
};

app.on('connection', (socket) => {
  logger.log(logger.INFO, 'new socket');

  const newClient = new Client(socket);
  
  clientPool.push(newClient);
  socket.write(`Your name is ${newClient.nickname}\n`);
  socket.write('Welcome Wyatt\'s chat\n');

  socket.on('data', (data) => {
    const message = data.toString().trim();
    logger.log(logger.INFO, `Processing a message: ${message}`);

    if (parseCommand(message, socket)) {
      return;
    }

    clientPool.forEach((client) => {
      if (client.socket !== socket) {
        client.socket.write(`${client.nickname}: ${message}\n`);
      }
    });
  });
  socket.on('close', removeClient(socket));
  socket.on('error', () => {
    logger.log(logger.ERROR, socket.name);

    removeClient(socket)();
  });
});

const server = module.exports = {};

server.start = () => {
  if (!process.env.PORT) {
    logger.log(logger.ERROR, 'missing PORT');
    throw new Error('missing PORT');
  }
  logger.log(logger.INFO, `Server is up on PORT: ${process.env.PORT}`);
  return app.listen({ port: process.env.PORT }, () => {});
};

server.stop = () => {
  logger.log(logger.INFO, 'Server is off');
  return app.close(() => {});
};
