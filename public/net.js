'use strict';
(function(){
  const playerName = localStorage.getItem('playerName') || (window.PLAYER_NAME || 'Jogador');
  const socket = io('/', { auth: { name: playerName } });

  socket.on('connect', () => console.log('Connected to server.'));

  // Solicita estado inicial ao servidor com o nome
  socket.emit('player:join', { name: playerName });

  socket.on('state:update', (state) => {
    console.log('State update:', state);
    try {
      if (!state) return;
      if (state.player && window.game && typeof window.game.setPlayer === 'function') {
        window.game.setPlayer(state.player);
      }
      if (state.otherPlayers && window.game && typeof window.game.setOtherPlayers === 'function') {
        window.game.setOtherPlayers(state.otherPlayers);
      }
      if (state.npcs && window.game && typeof window.game.setNpcs === 'function') {
        window.game.setNpcs(state.npcs);
      }
    } catch (e) {
      console.error('Falha ao aplicar estado no cliente:', e);
    }
  });

  // exporta se outros scripts precisarem
  window.socket = socket;
})();
