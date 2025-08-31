const db = require('./db');

const PLAYER_BASE_DMG = 5;
const ENEMY_BASE_DMG = 3;
const XP_PER_CORRECT_ANSWER = 15;
const COINS_PER_CORRECT_ANSWER = 10;
const DEATH_COIN_PENALTY_PERCENT = 0.1;

function calculatePlayerDamage(level) {
    return PLAYER_BASE_DMG + Math.floor(level * 1.5);
}

function calculateEnemyDamage(level) {
    return ENEMY_BASE_DMG + Math.floor(level * 1.2);
}

async function startBattle(playerId, npcId) {
    // Check if battle already exists or create a new one
    let battle = await db.get('SELECT * FROM battles WHERE user_id = ? AND npc_id = ? AND state = ?', [playerId, npcId, 'active']);
    if (!battle) {
        const player = await db.get('SELECT hp FROM players WHERE user_id = ?', [playerId]);
        const npc = await db.get('SELECT hp FROM npcs WHERE id = ?', [npcId]);
        const result = await db.run('INSERT INTO battles (user_id, npc_id, state, player_hp, npc_hp) VALUES (?, ?, ?, ?, ?)', [playerId, npcId, 'active', player.hp, npc.hp]);
        battle = { id: result.lastID, user_id: playerId, npc_id: npcId, state: 'active', player_hp: player.hp, npc_hp: npc.hp };
    }
    return battle;
}

async function processBattleAnswer(battleId, playerId, npcId, isCorrect, questionSnapshot) {
    const battle = await db.get('SELECT * FROM battles WHERE id = ?', [battleId]);
    if (!battle || battle.state !== 'active') {
        throw new Error('Battle not found or not active.');
    }

    const player = await db.get('SELECT * FROM players WHERE user_id = ?', [playerId]);
    const npc = await db.get('SELECT * FROM npcs WHERE id = ?', [npcId]);

    let playerHp = battle.player_hp;
    let npcHp = battle.npc_hp;
    let expGain = 0;
    let coinsGain = 0;
    let deltaHp = 0;
    let battleState = 'active';

    if (isCorrect) {
        const damage = calculatePlayerDamage(player.level);
        npcHp -= damage;
        deltaHp = -damage; // Damage to NPC
        expGain = XP_PER_CORRECT_ANSWER;
        coinsGain = COINS_PER_CORRECT_ANSWER;

        if (npcHp <= 0) {
            npcHp = 0;
            battleState = 'npc_defeated';
            await db.run('UPDATE npcs SET active = 0, last_defeated_at = ? WHERE id = ?', [Date.now(), npcId]);
            // Schedule respawn (simplified for now, actual scheduler would be external)
            setTimeout(async () => {
                await db.run('UPDATE npcs SET active = 1, hp = max_hp WHERE id = ?', [npcId]);
                console.log(`NPC ${npcId} respawned.`);
            }, npc.respawn_sec * 1000);
        }
    } else {
        const damage = calculateEnemyDamage(npc.level);
        playerHp -= damage;
        deltaHp = damage; // Damage to player

        if (playerHp <= 0) {
            playerHp = 0;
            battleState = 'player_defeated';
            const penalty = Math.floor(player.coins * DEATH_COIN_PENALTY_PERCENT);
            await db.run('UPDATE players SET coins = coins - ?, hp = max_hp, last_map = ?, x = ?, y = ? WHERE user_id = ?', [penalty, player.last_map, player.spawn_x, player.spawn_y, playerId]); // Respawn at safe point
            console.log(`Player ${playerId} defeated. Lost ${penalty} coins.`);
        }
    }

    await db.run('UPDATE battles SET player_hp = ?, npc_hp = ?, state = ? WHERE id = ?', [playerHp, npcHp, battleState, battleId]);
    await db.run('INSERT INTO answers_log (user_id, npc_id, question_snapshot_json, correct, delta_hp, exp_gain, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [playerId, npcId, JSON.stringify(questionSnapshot), isCorrect ? 1 : 0, deltaHp, expGain, Date.now()]);

    if (expGain > 0) {
        await updatePlayerStats(playerId, expGain, coinsGain, isCorrect);
    }

    return { playerHp, npcHp, battleState, expGain, coinsGain };
}

async function updatePlayerStats(playerId, exp, coins, isCorrect) {
    const player = await db.get('SELECT * FROM players WHERE user_id = ?', [playerId]);
    let newExp = player.exp + exp;
    let newLevel = player.level;
    let newMaxHp = player.max_hp;
    let newBaseDmg = player.base_damage; // Assuming base_damage exists or is calculated
    let newWins = player.wins;
    let newLosses = player.losses;

    if (isCorrect) {
        newWins++;
    } else {
        newLosses++;
    }

    // Simple level up logic (can be more complex)
    if (newExp >= (newLevel * 100)) { // Example: 100 XP per level
        newLevel++;
        newMaxHp += 10; // Example: +10 HP per level
        // Recalculate base damage if needed
        console.log(`Player ${playerId} leveled up to ${newLevel}!`);
    }

    await db.run('UPDATE players SET exp = ?, level = ?, max_hp = ?, hp = ?, coins = ?, wins = ?, losses = ? WHERE user_id = ?',
        [newExp, newLevel, newMaxHp, newMaxHp, player.coins + coins, newWins, newLosses, playerId]);
}

module.exports = {
    calculatePlayerDamage,
    calculateEnemyDamage,
    startBattle,
    processBattleAnswer,
};


