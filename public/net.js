'use strict';
(function(){
  const playerName = localStorage.getItem('playerName') || 'Jogador';
  const socket = io('/', { auth: { name: playerName } });
  socket.emit('player:join', { name: playerName });

  socket.on('state:update', (s) => {
    if (s?.player) window.game?.setPlayer(s.player);
    if (s?.npcs) window.game?.setNpcs(s.npcs);
    if (s?.otherPlayers) window.game?.setOtherPlayers(s.otherPlayers);
  });

  // logs de reconexão para debug
  socket.on('connect_error', err => console.warn('connect_error', err));
  socket.io.on('reconnect_attempt', n => console.log('reconnect_attempt', n));

  window.socket = socket;
})();
