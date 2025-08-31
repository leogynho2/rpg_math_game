const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 32;
let player = { x: 25, y: 25, name: "", level: 1, exp: 0, hp: 100, max_hp: 100, coins: 0, wins: 0, losses: 0, last_map: "map-city" };
let currentMap = null;
let npcs = [];
let otherPlayers = {};

let camX = 0;
let camY = 0;

let lastTime = 0;

const playerSprite = new Image();
playerSprite.src = "/assets/player.png";

const npcSprite = new Image();
npcSprite.src = "/assets/npc.png";

const tileset = new Image();
tileset.src = "/assets/tileset.png";

const keys = {};

window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function loadMap(mapName) {
    fetch(`/maps/${mapName}.json`)
        .then(response => response.json())
        .then(data => {
            currentMap = data;
            // Adjust camera to player position
            camX = player.x * TILE_SIZE - canvas.width / 2;
            camY = player.y * TILE_SIZE - canvas.height / 2;
            // Ensure camera stays within map bounds
            if (camX < 0) camX = 0;
            if (camY < 0) camY = 0;
            if (camX + canvas.width > currentMap.width * TILE_SIZE) camX = currentMap.width * TILE_SIZE - canvas.width;
            if (camY + canvas.height > currentMap.height * TILE_SIZE) camY = currentMap.height * TILE_SIZE - canvas.height;
        });
}

function gameLoop(time) {
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    let moved = false;
    const playerSpeed = 5 * TILE_SIZE * deltaTime; // 5 tiles per second

    if (keys["w"] || keys["ArrowUp"]) {
        player.y -= playerSpeed;
        moved = true;
    }
    if (keys["s"] || keys["ArrowDown"]) {
        player.y += playerSpeed;
        moved = true;
    }
    if (keys["a"] || keys["ArrowLeft"]) {
        player.x -= playerSpeed;
        moved = true;
    }
    if (keys["d"] || keys["ArrowRight"]) {
        player.x += playerSpeed;
        moved = true;
    }

    // Basic collision (prevent going out of map bounds)
    if (currentMap) {
        player.x = Math.max(0, Math.min(player.x, currentMap.width - 1));
        player.y = Math.max(0, Math.min(player.y, currentMap.height - 1));
    }

    if (moved) {
        // Update camera position to follow player
        camX = player.x * TILE_SIZE - canvas.width / 2;
        camY = player.y * TILE_SIZE - canvas.height / 2;

        // Clamp camera to map boundaries
        if (currentMap) {
            if (camX < 0) camX = 0;
            if (camY < 0) camY = 0;
            if (camX + canvas.width > currentMap.width * TILE_SIZE) camX = currentMap.width * TILE_SIZE - canvas.width;
            if (camY + canvas.height > currentMap.height * TILE_SIZE) camY = currentMap.height * TILE_SIZE - canvas.height;
        }

        // Send player movement to server
        // socket.emit("player:move", { x: player.x, y: player.y });
    }

    // Handle interaction (E or Enter key)
    if (keys["e"] || keys["Enter"]) {
        // Check for NPC interaction
        const playerTileX = Math.floor(player.x);
        const playerTileY = Math.floor(player.y);

        for (const npc of npcs) {
            if (Math.abs(playerTileX - npc.x) <= 1 && Math.abs(playerTileY - npc.y) <= 1) {
                // Simple interaction: start battle with NPC
                // socket.emit("player:interact", { npcId: npc.id });
                break;
            }
        }
        keys["e"] = false; // Prevent multiple interactions
        keys["Enter"] = false;
    }

    // Mission panel toggle
    if (keys["m"]) {
        const missionPanel = document.getElementById("mission-panel");
        missionPanel.classList.toggle("hidden");
        // socket.emit("missions:sync");
        keys["m"] = false;
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentMap) {
        // Render tiles (culling)
        const startCol = Math.floor(camX / TILE_SIZE);
        const endCol = Math.ceil((camX + canvas.width) / TILE_SIZE);
        const startRow = Math.floor(camY / TILE_SIZE);
        const endRow = Math.ceil((camY + canvas.height) / TILE_SIZE);

        for (let layer of currentMap.layers) {
            if (layer.type === "tilelayer") {
                for (let y = startRow; y < endRow; y++) {
                    for (let x = startCol; x < endCol; x++) {
                        if (x >= 0 && x < currentMap.width && y >= 0 && y < currentMap.height) {
                            const tileIndex = layer.data[y * currentMap.width + x];
                            if (tileIndex > 0) {
                                const sx = (tileIndex - 1) % (tileset.width / TILE_SIZE) * TILE_SIZE;
                                const sy = Math.floor((tileIndex - 1) / (tileset.width / TILE_SIZE)) * TILE_SIZE;
                                ctx.drawImage(tileset, sx, sy, TILE_SIZE, TILE_SIZE, x * TILE_SIZE - camX, y * TILE_SIZE - camY, TILE_SIZE, TILE_SIZE);
                            }
                        }
                    }
                }
            }
        }

        // Render NPCs
        for (const npc of npcs) {
            ctx.drawImage(npcSprite, npc.x * TILE_SIZE - camX, npc.y * TILE_SIZE - camY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "black";
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.fillText(npc.name, npc.x * TILE_SIZE - camX + TILE_SIZE / 2, npc.y * TILE_SIZE - camY - 5);
        }

        // Render other players (simplified)
        for (const id in otherPlayers) {
            const otherPlayer = otherPlayers[id];
            ctx.drawImage(playerSprite, otherPlayer.x * TILE_SIZE - camX, otherPlayer.y * TILE_SIZE - camY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "blue";
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.fillText(otherPlayer.name, otherPlayer.x * TILE_SIZE - camX + TILE_SIZE / 2, otherPlayer.y * TILE_SIZE - camY - 5);
        }

        // Render player
        ctx.drawImage(playerSprite, player.x * TILE_SIZE - camX, player.y * TILE_SIZE - camY, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = "red";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(player.name, player.x * TILE_SIZE - camX + TILE_SIZE / 2, player.y * TILE_SIZE - camY - 5);
    }

    // Update UI
    document.getElementById("player-name").textContent = `Nome: ${player.name}`;
    document.getElementById("player-level").textContent = `Nível: ${player.level} (EXP: ${player.exp})`;
    document.getElementById("player-hp").textContent = `HP: ${player.hp}/${player.max_hp}`;
    document.getElementById("player-coins").textContent = `Moedas: ${player.coins}`;
    document.getElementById("player-wins-losses").textContent = `W/L: ${player.wins}/${player.losses}`;
}

// Resize canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render(); // Re-render after resize
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // Initial resize

// Initialize game
loadMap(player.last_map);
requestAnimationFrame(gameLoop);

// UI event listeners
document.getElementById("missions-button").addEventListener("click", () => {
    document.getElementById("mission-panel").classList.toggle("hidden");
    // socket.emit("missions:sync");
});

document.getElementById("close-mission-panel").addEventListener("click", () => {
    document.getElementById("mission-panel").classList.add("hidden");
});

document.getElementById("professor-button").addEventListener("click", () => {
    window.open("/admin", "_blank");
});

// Expose player object for net.js to update
window.game = {
    player,
    npcs,
    otherPlayers,
    loadMap,
};


