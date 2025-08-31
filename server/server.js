'use strict';
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const db = require('./db');
const sockets = require('./sockets'); // usa seu sockets.js com player:join

const app = express();
const publicDir = path.join(__dirname, '../public');

// --- Static: ORDENS importam ---
// Sirva assets (sprites/tileset), mapas e o site.
app.use('/assets', express.static(path.join(publicDir, 'assets')));

// Seus mapas estão em public/maps. Expomos em /maps e também em /data (compat fetch('/data/...')).
app.use('/maps', express.static(path.join(publicDir, 'maps')));
app.use('/data', express.static(path.join(publicDir, 'maps')));

// Por fim, a raiz (index.html, js, css)
app.use(express.static(publicDir));

// (Opcional) Fallback SPA - mantenha *DEPOIS* dos statics acima se for usar.
// app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

(async () => {
  await db.init();
  sockets.init(io);
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
