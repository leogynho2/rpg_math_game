const db = require('./db');
const math = require('./math');
const battle = require('./battle');
const missions = require('./missions');

let io;

function init(socketIoInstance) {
    io = socketIoInstance;

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('player:join', async (data) => {
            // VALIDAÇÃO DO NOME DO JOGADOR
            if (!data || !data.name || typeof data.name !== 'string') {
                console.error('Dados inválidos recebidos no player:join:', data);
                socket.emit('error', { message: 'Nome do jogador é obrigatório' });
                return;
            }

            const playerName = data.name.trim();
            if (playerName === '') {
                socket.emit('error', { message: 'Nome do jogador não pode estar vazio' });
                return;
            }

            console.log('player:join data received:', { name: playerName }); // DEBUG

            try {
                // Primeiro verifica se o usuário existe
                let user = await db.get('SELECT * FROM users WHERE name = ?', [playerName]);
                if (!user) {
                    // Cria novo usuário (sem senha para simplificar)
                    const userResult = await db.run('INSERT INTO users (name) VALUES (?)', [playerName]);
                    user = { id: userResult.lastID, name: playerName };
                }

                // Verifica se o player existe para este usuário
                let player = await db.get(
                    'SELECT players.*, users.name FROM players JOIN users ON players.user_id = users.id WHERE players.user_id = ?', 
                    [user.id]
                );
                
                if (!player) {
                    // Cria novo player para o usuário
                    await db.run(
                        'INSERT INTO players (user_id, level, exp, hp, max_hp, coins, wins, losses, last_map, x, y) VALUES (?, 1, 0, 100, 100, 0, 0, 0, "map-city", 25, 25)',
                        [user.id]
                    );
                    player = await db.get(
                        'SELECT players.*, users.name FROM players JOIN users ON players.user_id = users.id WHERE players.user_id = ?', 
                        [user.id]
                    );
                }

                socket.emit('state:update', { player });
            } catch (error) {
                console.error('Erro no player:join:', error);
                socket.emit('error', { message: 'Erro interno do servidor' });
            }
        });

        socket.on('player:move', (data) => {
            // Server authority would validate movement here
            socket.broadcast.emit('player:moved', { id: socket.id, ...data });
        });

        socket.on('player:interact', async (data) => {
            try {
                const { npcId } = data;
                const battleInstance = await battle.startBattle(socket.id, npcId);
                const question = math.generateQuestion('easy');
                socket.emit('battle:prompt', { battleId: battleInstance.id, question });
            } catch (error) {
                console.error('Erro no player:interact:', error);
                socket.emit('error', { message: 'Erro ao iniciar batalha' });
            }
        });

        socket.on('battle:answer', async (data) => {
            try {
                const { battleId, answer } = data;
                const battleData = await db.get('SELECT * FROM battles WHERE id = ?', [battleId]);
                
                if (!battleData) {
                    socket.emit('error', { message: 'Batalha não encontrada' });
                    return;
                }
                
                const question = JSON.parse(battleData.question_snapshot_json);
                const isCorrect = math.validateAnswer(question, answer);
                const result = await battle.processBattleAnswer(battleId, socket.id, battleData.npc_id, isCorrect, question);
                socket.emit('battle:result', result);
            } catch (error) {
                console.error('Erro no battle:answer:', error);
                socket.emit('error', { message: 'Erro ao processar resposta' });
            }
        });

        socket.on('missions:sync', async () => {
            try {
                const playerMissions = await missions.getPlayerMissions(socket.id);
                socket.emit('missions:update', playerMissions);
            } catch (error) {
                console.error('Erro no missions:sync:', error);
                socket.emit('error', { message: 'Erro ao carregar missões' });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            io.emit('player:left', { id: socket.id });
        });
    });
}

module.exports = {
    init,
};