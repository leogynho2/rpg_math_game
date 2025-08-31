/* game.js (sprite-grid ready)
 * Suporte a spritesheet em grade (player/npc) com cols/rows configuráveis.
 * - Player: default 5x4 (troque no CONFIG se seu sheet for 4x4, etc.)
 * - Professor: 2x2 estático (frente/lado/costas)
 * - Tileset: igual (32x32), com /data apontando para public/maps
 */
(() => {
  'use strict';

  // =================== CONFIG ===================
  const CONFIG = {
    TILE_SIZE: 32,            // tamanho de cada tile no mapa
    MAP_BASE_URL: '/data',    // onde seus mapas .json estão servidos
    TILESET_FALLBACK: '/assets/tileset.png',

    // Spritesheets (ajuste cols/rows conforme seus PNGs)
    PLAYER:   { url: '/assets/player.png',    cols: 5, rows: 4 },
    PROFESSOR:{ url: '/assets/professor.png', cols: 2, rows: 2 }, // renomeie seu PNG para professor.png
  };
  // ==============================================

  const canvas =
    document.getElementById('game') ||
    document.getElementById('gameCanvas') ||
    (() => { const c = document.createElement('canvas'); c.id='game'; document.body.appendChild(c); return c; })();
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  let currentMap = null;
  let tilesetImg = new Image();
  let tilesetReady = false;
  let tilesetCols = 1;
  let GID_OFFSET = 0; // se GID 1 for transparente, somamos +1 automaticamente aos gids do map

  // editor simples de mapa
  let paletteCanvas, paletteCtx;
  let paletteVisible = false;
  let paintTile = 1;

  // ---- Sprite metas carregadas dinamicamente ----
  let playerSprite = null;     // {img, cols, rows, frameW, frameH, draw()}
  let professorSprite = null;

  // ---- Estado de jogo ----
  let player = {
    x: 25, y: 25, // em tiles
    name: 'Jogador',
    frameIndex: 0,
    last_map: 'map-city'
  };
  let npcs = [];         // {x,y,frameIndex,name}
  let otherPlayers = {}; // idem

  let camX = 0, camY = 0;
  let last = performance.now();
  let animTime = 0;

  // -------------- Utils --------------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  function waitImage(img) {
    return new Promise((resolve) => {
      if (img.complete && img.naturalWidth) return resolve();
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    });
  }

  function makeGridSprite(url, cols, rows) {
    const img = new Image();
    img.src = url;
    return waitImage(img).then(() => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const frameW = Math.floor(w / cols);
      const frameH = Math.floor(h / rows);
      return {
        img, cols, rows, frameW, frameH,
        draw(worldX, worldY, frame, tileW, tileH) {
          const fx = Math.max(0, Math.floor(frame % cols));
          const fy = Math.max(0, Math.floor(frame / cols));
          const sx = fx * frameW;
          const sy = fy * frameH;
          const dx = Math.floor(worldX * tileW - camX);
          const dy = Math.floor(worldY * tileH - camY);
          ctx.drawImage(img, sx, sy, frameW, frameH, dx, dy, tileW, tileH);
        }
      };
    });
  }

  // -------------- Mapa --------------
  async function loadMap(name) {
    const url = `${CONFIG.MAP_BASE_URL}/${name}.json`;
    let map;
    try {
      const res = await fetch(url);
      if (res.ok) {
        map = await res.json();
      }
    } catch (e) {}

    if (!map) {
      const size = 50;
      map = {
        width: size,
        height: size,
        tilewidth: CONFIG.TILE_SIZE,
        tileheight: CONFIG.TILE_SIZE,
        layers: [{ type: 'tilelayer', data: new Array(size * size).fill(0) }],
        tilesets: [{ firstgid: 1, image: CONFIG.TILESET_FALLBACK }]
      };
    }

    currentMap = map;
    const tw = currentMap.tilewidth  = currentMap.tilewidth  || CONFIG.TILE_SIZE;
    const th = currentMap.tileheight = currentMap.tileheight || CONFIG.TILE_SIZE;

    const ts = (currentMap.tilesets && currentMap.tilesets[0]) || {};
    const tilesetPath = ts.image || CONFIG.TILESET_FALLBACK;

    tilesetImg = new Image();
    tilesetReady = false;
    tilesetImg.src = tilesetPath;
    await waitImage(tilesetImg);
    tilesetReady = true;

    const w = tilesetImg.naturalWidth || tilesetImg.width || 1;
    tilesetCols = Math.max(1, Math.floor(w / tw));

    updatePalette();
    await detectVisibleGidOffset();

    centerCameraOnPlayer();
  }

  async function detectVisibleGidOffset() {
    const tw = currentMap.tilewidth, th = currentMap.tileheight;
    const off = document.createElement('canvas'); off.width = tw; off.height = th;
    const octx = off.getContext('2d');
    octx.clearRect(0,0,tw,th);
    // desenha localId=0 (gid == firstgid) e testa opacidade
    octx.drawImage(tilesetImg, 0, 0, tw, th, 0, 0, tw, th);
    const data = octx.getImageData(0,0,tw,th).data;
    let opaque = 0;
    for (let i=3;i<data.length;i+=4){ if (data[i] > 8) { opaque++; if (opaque>50) break; } }
    GID_OFFSET = (opaque <= 50) ? 1 : 0;
  }

  function updatePalette() {
    if (!tilesetImg) return;
    const tw = currentMap.tilewidth, th = currentMap.tileheight;
    const rows = Math.ceil((tilesetImg.naturalHeight || tilesetImg.height) / th);
    if (!paletteCanvas) {
      paletteCanvas = document.createElement('canvas');
      paletteCanvas.style.position = 'fixed';
      paletteCanvas.style.top = '0';
      paletteCanvas.style.right = '0';
      paletteCanvas.style.border = '1px solid #666';
      paletteCanvas.style.imageRendering = 'pixelated';
      paletteCanvas.style.display = 'none';
      document.body.appendChild(paletteCanvas);
      paletteCanvas.addEventListener('click', (e) => {
        const rect = paletteCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / tw);
        const y = Math.floor((e.clientY - rect.top) / th);
        paintTile = y * tilesetCols + x + 1;
      });
    }

    paletteCanvas.width = tilesetCols * tw;
    paletteCanvas.height = rows * th;
    paletteCtx = paletteCanvas.getContext('2d');
    paletteCtx.imageSmoothingEnabled = false;
    paletteCtx.clearRect(0,0,paletteCanvas.width,paletteCanvas.height);
    paletteCtx.drawImage(tilesetImg, 0, 0);
  }

  function togglePalette(){
    paletteVisible = !paletteVisible;
    if (paletteCanvas) paletteCanvas.style.display = paletteVisible ? 'block' : 'none';
  }

  function fillMap(tile){
    if (!currentMap) return;
    const layer = currentMap.layers && currentMap.layers.find(l => l.type === 'tilelayer');
    if (layer) layer.data = new Array(currentMap.width * currentMap.height).fill(tile);
  }

  function exportMap(){
    const dataStr = JSON.stringify(currentMap, null, 2);
    console.log('map json', dataStr);
    return dataStr;
  }

  async function saveMap(){
    try {
      await fetch(`/admin/save-map?name=${encodeURIComponent(player.last_map)}`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: exportMap()
      });
      console.log('map saved');
    } catch(e){
      console.error('save-map', e);
    }
  }

  function centerCameraOnPlayer() {
    if (!currentMap) return;
    const tw = currentMap.tilewidth, th = currentMap.tileheight;
    const mapPxW = (currentMap.width || 0) * tw;
    const mapPxH = (currentMap.height || 0) * th;
    camX = clamp(player.x * tw - canvas.width / 2, 0, Math.max(0, mapPxW - canvas.width));
    camY = clamp(player.y * th - canvas.height / 2, 0, Math.max(0, mapPxH - canvas.height));
  }

  function drawMap() {
    if (!currentMap || !tilesetReady) return;

    const tw = currentMap.tilewidth, th = currentMap.tileheight;
    const layer = currentMap.layers && currentMap.layers.find(l => l.type === 'tilelayer');
    if (!layer) return;

    const startCol = Math.floor(camX / tw);
    const endCol   = Math.min(currentMap.width,  Math.ceil((camX + canvas.width)  / tw));
    const startRow = Math.floor(camY / th);
    const endRow   = Math.min(currentMap.height, Math.ceil((camY + canvas.height) / th));

    const firstgid = (currentMap.tilesets && currentMap.tilesets[0] && currentMap.tilesets[0].firstgid) || 1;

    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const rawGid = layer.data[y * currentMap.width + x] | 0;
        if (rawGid <= 0) continue;

        const gid = rawGid + GID_OFFSET;
        const localId = gid - firstgid;
        if (localId < 0) continue;

        const sx = (localId % tilesetCols) * tw;
        const sy = Math.floor(localId / tilesetCols) * th;
        const dx = Math.floor(x * tw - camX);
        const dy = Math.floor(y * th - camY);

        ctx.drawImage(tilesetImg, sx, sy, tw, th, dx, dy, tw, th);
      }
    }
  }

  // -------------- Input local (teste) --------------
  const keys = Object.create(null);
  addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'p' || e.key === 'P') togglePalette();
    if (e.key === 'b' || e.key === 'B') fillMap(paintTile);
    if (e.key === 'e' || e.key === 'E') exportMap();
    if (e.key === 's' && e.ctrlKey) { e.preventDefault(); saveMap(); }
  });
  addEventListener('keyup',   e => { keys[e.key] = false; });

  // -------------- Game Loop --------------
  function gameLoop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  function update(dt) {
    const speed = 5 * dt; // tiles/s
    let moved = false;
    if (keys['w'] || keys['ArrowUp'])    { player.y -= speed; moved = true; }
    if (keys['s'] || keys['ArrowDown'])  { player.y += speed; moved = true; }
    if (keys['a'] || keys['ArrowLeft'])  { player.x -= speed; moved = true; }
    if (keys['d'] || keys['ArrowRight']) { player.x += speed; moved = true; }

    if (currentMap && moved) {
      player.x = clamp(player.x, 0, (currentMap.width  || 1) - 0.001);
      player.y = clamp(player.y, 0, (currentMap.height || 1) - 0.001);
      centerCameraOnPlayer();
      animTime += dt;
      if (animTime >= 0.12) { animTime = 0; player.frameIndex = (player.frameIndex + 1) % (CONFIG.PLAYER.cols || 4); }
    } else {
      player.frameIndex = 0;
    }
  }

  function render() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMap();

    const tw = currentMap?.tilewidth  || CONFIG.TILE_SIZE;
    const th = currentMap?.tileheight || CONFIG.TILE_SIZE;

    // NPCs
    if (professorSprite) {
      for (const npc of npcs) {
        professorSprite.draw(npc.x, npc.y, npc.frameIndex || 0, tw, th);
        const nx = Math.floor(npc.x * tw - camX) + tw / 2;
        const ny = Math.floor(npc.y * th - camY) - 6;
        ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        if (npc.name) ctx.fillText(npc.name, nx, ny);
      }
    }

    // Outros players
    if (playerSprite) {
      for (const id in otherPlayers) {
        const op = otherPlayers[id];
        playerSprite.draw(op.x, op.y, (op.frameIndex || 0), tw, th);
        const ox = Math.floor(op.x * tw - camX) + tw / 2;
        const oy = Math.floor(op.y * th - camY) - 6;
        ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        if (op.name) ctx.fillText(op.name, ox, oy);
      }
    }

    // Player local
    if (playerSprite) playerSprite.draw(player.x, player.y, player.frameIndex || 0, tw, th);
    const px = Math.floor(player.x * tw - camX) + tw / 2;
    const py = Math.floor(player.y * th - camY) - 6;
    ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    if (player.name) ctx.fillText(player.name, px, py);
  }

  // -------------- API pública p/ net.js --------------
  window.game = {
    setPlayer(p)        { if (p) { Object.assign(player, p); centerCameraOnPlayer(); } },
    setOtherPlayers(m)  { otherPlayers = m || {}; },
    setNpcs(list)       { npcs = list || []; },
    async setMap(name)  { player.last_map = name; await loadMap(name); },
    applyServerState(s) {
      if (!s) return;
      if (s.player) this.setPlayer(s.player);
      if (s.otherPlayers) this.setOtherPlayers(s.otherPlayers);
      if (s.npcs) this.setNpcs(s.npcs);
    },
    get state() { return { player, otherPlayers, npcs, currentMap }; }
  };

  // -------------- Boot --------------
  (async function init(){
    // carrega sprites no padrão informado no CONFIG
    [playerSprite, professorSprite] = await Promise.all([
      makeGridSprite(CONFIG.PLAYER.url,    CONFIG.PLAYER.cols,    CONFIG.PLAYER.rows),
      makeGridSprite(CONFIG.PROFESSOR.url, CONFIG.PROFESSOR.cols, CONFIG.PROFESSOR.rows),
    ]);

    await loadMap(player.last_map || 'map-city');
    requestAnimationFrame(gameLoop);
  })();
})();
