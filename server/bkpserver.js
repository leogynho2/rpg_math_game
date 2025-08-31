const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const db = require('./db');
const auth = require('./auth');
const sockets = require('./sockets');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Admin routes
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.post('/api/prof/login', auth.login);
app.get('/api/prof/overview', auth.authenticateToken, (req, res) => {
    // Implement overview metrics logic
    res.json({ message: 'Overview metrics will be here.' });
});
app.get('/api/prof/ranking', auth.authenticateToken, async (req, res) => {
    try {
        const players = await db.all('SELECT name, level, exp, wins, losses FROM players ORDER BY exp DESC');
        res.json(players);
    } catch (error) {
        console.error('Error fetching ranking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/api/prof/export.csv', auth.authenticateToken, (req, res) => {
    // Implement CSV export logic
    res.json({ message: 'CSV export will be here.' });
});

sockets.init(io);

db.init().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});


