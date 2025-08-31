'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const pub = path.join(__dirname, '../public');

// middlewares / static
app.use(express.json({ limit: '5mb' }));
app.use('/assets', express.static(path.join(pub, 'assets')));
app.use('/maps',   express.static(path.join(pub, 'maps')));
// alias para JSON dos mapas
app.use('/data',   express.static(path.join(pub, 'maps')));
app.use(express.static(pub));

// rota p/ salvar mapas editados no cliente
app.post('/admin/save-map', (req, res) => {
  try {
    const name = String(req.query.name || req.body?.name || 'map-city').replace(/[^a-z0-9_\-]/gi, '');
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'invalid body' });
    }
    const dest = path.join(pub, 'maps', `${name}.json`);
    fs.writeFileSync(dest, JSON.stringify(req.body, null, 2));
    res.json({ ok: true, path: `/data/${name}.json` });
  } catch (e) {
    console.error('save-map error', e);
    res.status(500).json({ error: 'save failed' });
  }
});

const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http, { cors: { origin: '*' } });

const db = require('./db');
const sockets = require('./sockets');

// inicializa banco e sockets sem derrubar server
(async () => {
  try {
    await db.init();
    sockets.init(io);
  } catch (err) {
    console.error('init error', err);
  }
})();

const PORT = process.env.PORT || 5000;
http.listen(PORT, () => console.log(`Server running on ${PORT}`));

module.exports = { app, io };
