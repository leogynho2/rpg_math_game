const db = require('./db');

async function getPlayerMissions(userId) {
    return await db.all('SELECT m.*, pm.progress, pm.status FROM missions m JOIN player_missions pm ON m.id = pm.mission_id WHERE pm.user_id = ?', [userId]);
}

async function updateMissionProgress(userId, missionCode, progress, status) {
    const mission = await db.get('SELECT id FROM missions WHERE code = ?', [missionCode]);
    if (!mission) {
        throw new Error('Mission not found.');
    }
    await db.run('UPDATE player_missions SET progress = ?, status = ?, updated_at = ? WHERE user_id = ? AND mission_id = ?', [progress, status, Date.now(), userId, mission.id]);
}

async function completeMission(userId, missionCode) {
    const mission = await db.get('SELECT id, reward_exp, reward_coins FROM missions WHERE code = ?', [missionCode]);
    if (!mission) {
        throw new Error('Mission not found.');
    }

    await db.run('UPDATE player_missions SET status = ?, updated_at = ? WHERE user_id = ? AND mission_id = ?', ['completed', Date.now(), userId, mission.id]);
    await db.run('UPDATE players SET exp = exp + ?, coins = coins + ? WHERE user_id = ?', [mission.reward_exp, mission.reward_coins, userId]);

    console.log(`Player ${userId} completed mission ${missionCode}. Gained ${mission.reward_exp} XP and ${mission.reward_coins} coins.`);
}

module.exports = {
    getPlayerMissions,
    updateMissionProgress,
    completeMission,
};


