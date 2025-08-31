# Mundo Matemática RPG

Servidor + cliente web de um mini-RPG educacional (Node.js + Socket.IO + SQLite).

## Rodando localmente

```bash
npm install
npm start
# abre http://localhost:5000
```

> A base usa SQLite. O arquivo do banco é criado automaticamente (não é versionado).

## Estrutura

```
.
├── admin/                 # painel simples de admin (estático)
├── public/                # frontend (index.html, game.js, net.js, assets/ e maps/)
│   ├── assets/            # player.png, professor.png, tileset.png
│   └── maps/              # map-city.json etc (servidos em /data/)
├── server/                # backend Node.js
│   ├── server.js          # Express + Socket.IO + static
│   ├── sockets.js         # eventos player:join/move/... (server authority)
│   ├── db.js              # init e helpers do SQLite
│   ├── schema.sql         # schema base (opcional)
│   └── *.js               # battle, missions, math, etc.
├── package.json
└── README.md
```

## Scripts NPM

- `npm start` – sobe o servidor (`server/server.js`).
- `npm test` – (reservado para testes).
- `npm run lint` – (adicione se quiser ESLint).

## Variáveis de ambiente (opcional)
- `PORT` (padrão `5000`)

## Desenvolvimento em Codespaces / Dev Containers

O repositório inclui **.devcontainer** com Node 20 e SQLite instalados.  
Ao abrir em Codespaces/VS Code Dev Containers, a extensão executa `npm install` e expõe a porta **5000**.

## CI (GitHub Actions)

Incluí um workflow simples que:
- Checa Node 20
- Instala dependências com cache
- Roda `npm test` (se existir)

## Licença

MIT – sinta-se livre para usar/alterar. Veja `LICENSE`.
