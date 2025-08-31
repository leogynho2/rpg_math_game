/* game.js (patched)
 * - Preload images before first render
 * - Proper tileset source-rect drawing (9-arg drawImage)
 * - Spritesheet frame drawing for player/NPC
 * - Camera centered on player with clamping
 * - Minimal public API for net.js: window.game.{applyServerState,setPlayer,setOtherPlayers,setNpcs,setMap}
 */
(() => {
  // ---------- Canvas & Context ----------
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;

  // ---------- Constants ----------
  const TILE_SIZE = 32; // fallback if map doesn't specify
  const FRAME_W = 32;   // frame width in player.png / npc.png
  const FRAME_H = 32;   // frame height in player.png / npc.png

  // ---------- State ----------
  let currentMap = null;
  let tilesetImg = new Image();
  let tilesetReady = false;
  let tilesetCols = 1;

  const playerSprite = new Image();
  playerSprite.src = "/assets/player.png";

  const npcSprite = new Image();
  npcSprite.src = "/assets/npc.png"; // opcional; se 404, ignorado

  let player = {
    x: 25, y: 25,            // em tiles
    name: "you",
    level: 1, exp: 0,
    hp: 100, max_hp: 100,
    coins: 0, wins: 0, losses: 0,
    frame: 0,
    last_map: "map-city"
  };
  let otherPlayers = {};
  let npcs = [];

  let camX = 0, camY = 0;
  let last = performance.now();
  let animTime = 0;

  // ---------- Utils ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function waitImage(img) {
    return new Promise((resolve) => {
      if (img.complete && img.naturalWidth) return resolve();
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => resolve(), { once: true }); // segue sem travar
    });
  }

  // ---------- Map Loading ----------
  async function loadMap(name) {
    // ajuste a base dos mapas conforme seu projeto
    const mapUrl = `/data/${name}.json`;
    const res = await fetch(mapUrl);
    const map = await res.json();

    currentMap = map;
    currentMap.tilewidth  = currentMap.tilewidth  || TILE_SIZE;
    currentMap.tileheight = currentMap.tileheight || TILE_SIZE;

    const ts = (currentMap.tilesets && currentMap.tilesets[0]) || {};
    const tilesetPath = ts.image || "/assets/tileset.png";

    tilesetImg = new Image();
    tilesetReady = false;
    tilesetImg.src = tilesetPath;
    await waitImage(tilesetImg);

    // define número de colunas do tileset
    if (ts.columns) {
      tilesetCols = ts.columns;
    } else {
      const w = tilesetImg.naturalWidth || tilesetImg.width || (ts.imagewidth || 0);
      tilesetCols = Math.max(1, Math.floor(w / currentMap.tilewidth));
    }
    tilesetReady = true;

    centerCameraOnPlayer();
  }

  function centerCameraOnPlayer() {
    if (!currentMap) return;
    const tw = currentMap.tilewidth, th = currentMap.tileheight;
    const mapPxW = (currentMap.width || 0) * tw;
    const mapPxH = (currentMap.height || 0) * th;

    camX = clamp(player.x * tw - canvas.width / 2, 0, Math.max(0, mapPxW - canvas.width));
    camY = clamp(player.y * th - canvas.height / 2, 0, Math.max(0, mapPxH - canvas.height));
  }

  // ---------- Input (opcional para testar local) ----------
  const keys = Object.create(null);
  addEventListener("keydown", (e) => { keys[e.key] = true; });
  addEventListener("keyup",   (e) => { keys[e.key] = false; });

  // ---------- Game Loop ----------
  function gameLoop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
  }

  function update(dt) {
    // movimento local em tiles/segundo (se o servidor for autoritativo, este bloco pode ser desativado)
    const speed = 5 * dt; // 5 tiles/s
    let moved = false;
    if (keys["w"] || keys["ArrowUp"])    { player.y -= speed; moved = true; }
    if (keys["s"] || keys["ArrowDown"])  { player.y += speed; moved = true; }
    if (keys["a"] || keys["ArrowLeft"])  { player.x -= speed; moved = true; }
    if (keys["d"] || keys["ArrowRight"]) { player.x += speed; moved = true; }

    if (currentMap && moved) {
      player.x = clamp(player.x, 0, (currentMap.width  || 1) - 0.001);
      player.y = clamp(player.y, 0, (currentMap.height || 1) - 0.001);
      centerCameraOnPlayer();
    }

    // animação do player (4 frames de caminhada)
    if (moved) {
      animTime += dt;
      if (animTime >= 0.1) { animTime = 0; player.frame = (player.frame + 1) % 4; }
    } else {
      player.frame = 0;
    }
  }

  // ---------- Rendering ----------
  function drawMap() {
    if (!currentMap || !tilesetReady) return;

    const tw = currentMap.tilewidth, th = currentMap.tileheight;
    const layer = currentMap.layers && currentMap.layers.find(l => l.type === "tilelayer");
    if (!layer) return;

    const startCol = Math.floor(camX / tw);
    const endCol   = Math.min(currentMap.width,  Math.ceil((camX + canvas.width)  / tw));
    const startRow = Math.floor(camY / th);
    const endRow   = Math.min(currentMap.height, Math.ceil((camY + canvas.height) / th));

    const firstgid = (currentMap.tilesets && currentMap.tilesets[0] && currentMap.tilesets[0].firstgid) || 1;

    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const gid = layer.data[y * currentMap.width + x] | 0;
        if (gid <= 0) continue;

        const localId = gid - firstgid;
        const sx = (localId % tilesetCols) * tw;
        const sy = Math.floor(localId / tilesetCols) * th;
        const dx = Math.floor(x * tw - camX);
        const dy = Math.floor(y * th - camY);

        ctx.drawImage(tilesetImg, sx, sy, tw, th, dx, dy, tw, th);
      }
    }
  }

  function drawSprite(img, frameIndex, worldX, worldY) {
    if (!img) return;
    const tw = currentMap?.tilewidth  || TILE_SIZE;
    const th = currentMap?.tileheight || TILE_SIZE;

    const dx = Math.floor(worldX * tw - camX);
    const dy = Math.floor(worldY * th - camY);

    const cols = Math.max(1, Math.floor((img.naturalWidth || img.width) / FRAME_W));
    const sx = (frameIndex % cols) * FRAME_W;
    const sy = Math.floor(frameIndex / cols) * FRAME_H;

    ctx.drawImage(img, sx, sy, FRAME_W, FRAME_H, dx, dy, tw, th);
  }

  function render() {
    // fundo
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // mapa
    drawMap();

    // NPCs
    for (const npc of npcs) {
      drawSprite(npcSprite, npc.frame || 0, npc.x, npc.y);
      // nome
      const tw = currentMap?.tilewidth || TILE_SIZE;
      const th = currentMap?.tileheight || TILE_SIZE;
      const nx = Math.floor(npc.x * tw - camX) + tw / 2;
      const ny = Math.floor(npc.y * th - camY) - 6;
      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      if (npc.name) ctx.fillText(npc.name, nx, ny);
    }

    // outros players
    for (const id in otherPlayers) {
      const op = otherPlayers[id];
      drawSprite(playerSprite, op.frame || 0, op.x, op.y);
      const tw = currentMap?.tilewidth || TILE_SIZE;
      const th = currentMap?.tileheight || TILE_SIZE;
      const ox = Math.floor(op.x * tw - camX) + tw / 2;
      const oy = Math.floor(op.y * th - camY) - 6;
      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      if (op.name) ctx.fillText(op.name, ox, oy);
    }

    // player local
    drawSprite(playerSprite, player.frame || 0, player.x, player.y);
    const tw = currentMap?.tilewidth || TILE_SIZE;
    const th = currentMap?.tileheight || TILE_SIZE;
    const px = Math.floor(player.x * tw - camX) + tw / 2;
    const py = Math.floor(player.y * th - camY) - 6;
    ctx.fillStyle = "#e74c3c";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    if (player.name) ctx.fillText(player.name, px, py);
  }

  // ---------- Public API para net.js ----------
  window.game = {
    // servidor manda o estado completo ou parcial
    applyServerState(state) {
      if (!state) return;
      if (state.player) Object.assign(player, state.player);
      if (state.otherPlayers) otherPlayers = state.otherPlayers;
      if (state.npcs) npcs = state.npcs;
    },
    setPlayer(p) { Object.assign(player, p); centerCameraOnPlayer(); },
    setOtherPlayers(map) { otherPlayers = map || {}; },
    setNpcs(list) { npcs = list || []; },
    async setMap(name) {
      player.last_map = name;
      await loadMap(name);
    },
    get state() { return { player, otherPlayers, npcs, currentMap }; }
  };

  // ---------- Boot ----------
  (async function init() {
    await Promise.all([waitImage(playerSprite), waitImage(npcSprite)]);
    await loadMap(player.last_map || "map-city");
    requestAnimationFrame(gameLoop);
  })();
})();