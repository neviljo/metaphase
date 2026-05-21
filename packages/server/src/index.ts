import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
process.chdir(path.join(repoRoot, 'packages', 'client', 'public'));

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { GameServer } from './GameServer.js';
import { MessageHandler } from './protocol/MessageHandler.js';
import { Broadcaster } from './protocol/broadcaster.js';
import { connectDatabase } from './db/connection.js';
import { config } from './config.js';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const broadcaster = new Broadcaster();

app.use(express.static(path.join(repoRoot, 'packages/client/dist')));
app.get('/', (_req, res) => {
  res.sendFile(path.join(repoRoot, 'packages/client/dist/index.html'));
});

const gs = new GameServer(broadcaster);

wss.on('connection', (ws) => {
  const handler = new MessageHandler(ws, gs);
  broadcaster.register(handler.socketID, ws);
  ws.on('message', (raw: Buffer | string) => handler.handle(raw));
  ws.on('close', () => {
    handler.onDisconnect();
    broadcaster.unregister(handler.socketID);
  });
});

// Override sendUpdate — called from GameServer
(gs as any).sendUpdate = (socketID: string, pkg: any) => {
  broadcaster.sendTo(socketID, pkg);
};

setInterval(() => gs.updatePlayers(), 200);

httpServer.listen(config.port, async () => {
  try {
    await connectDatabase();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  gs.readMap();
  console.log(`Server listening on port ${config.port}`);
});
