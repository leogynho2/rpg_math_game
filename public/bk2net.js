const socket = io();

socket.on("connect", () => {
    console.log("Connected to server.");
    const playerName = prompt("Enter your player name:");
    socket.emit("player:join", { name: playerName });
});

socket.on("state:update", (data) => {
    console.log("State update:", data);
    if (data.player) {
        Object.assign(game.player, data.player);
        game.loadMap(game.player.last_map);
    }
    if (data.npcs) {
        game.npcs = data.npcs;
    }
    if (data.otherPlayers) {
        game.otherPlayers = data.otherPlayers;
    }
});

socket.on("player:moved", (data) => {
    if (data.id !== socket.id) {
        game.otherPlayers[data.id] = data;
    }
});

socket.on("battle:prompt", (data) => {
    const battleDialog = document.getElementById("battle-dialog");
    const battlePrompt = document.getElementById("battle-prompt");
    const submitAnswerButton = document.getElementById("submit-answer");
    const battleAnswerInput = document.getElementById("battle-answer");

    battlePrompt.textContent = data.question.prompt;
    battleDialog.classList.remove("hidden");

    submitAnswerButton.onclick = () => {
        const answer = battleAnswerInput.value;
        socket.emit("battle:answer", { battleId: data.battleId, answer: answer });
        battleAnswerInput.value = "";
        battleDialog.classList.add("hidden");
    };
});

socket.on("battle:result", (data) => {
    console.log("Battle result:", data);
    // Update player HP, NPC HP, etc. based on result
    game.player.hp = data.playerHp;
    // You might want to update NPC state here as well, or rely on a full state update
});

socket.on("missions:update", (data) => {
    const missionList = document.getElementById("mission-list");
    missionList.innerHTML = "";
    data.forEach(mission => {
        const li = document.createElement("li");
        li.textContent = `${mission.title}: ${mission.status} (Progresso: ${mission.progress})`;
        missionList.appendChild(li);
    });
});

// Expose socket for game.js to use
window.socket = socket;


