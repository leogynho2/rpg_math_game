# Mundo da Matemática RPG

Este é um projeto de um RPG 2D web multiplayer com batalhas baseadas em matemática, inspirado em Pokémon. O jogo inclui funcionalidades de PvP e PvE, um sistema de missões, e um painel administrativo para professores.

## Tecnologias Utilizadas

-   **Frontend:** HTML5 Canvas, JavaScript (ES6+)
-   **Backend:** Node.js, Express.js, Socket.IO
-   **Banco de Dados:** SQLite (com suporte a MySQL via configuração)
-   **Assets:** Pixel-art (placeholders)

## Estrutura do Projeto

```
rpg_math_game/
├── server/                 # Backend Node.js
│   ├── server.js           # Servidor principal Express e Socket.IO
│   ├── db.js               # Conexão e operações com o banco de dados
│   ├── math.js             # Geração e validação de perguntas de matemática
│   ├── battle.js           # Lógica de batalha e escalonamento
│   ├── missions.js         # Sistema de missões e progresso
│   ├── auth.js             # Autenticação para o painel do professor
│   ├── sockets.js          # Gerenciamento de eventos Socket.IO
│   ├── config.example.env  # Exemplo de variáveis de ambiente
│   └── schema.sql          # Esquema do banco de dados e dados iniciais
├── public/                 # Frontend do jogo
│   ├── index.html          # Página principal do jogo
│   ├── game.js             # Lógica principal do jogo (renderização, movimento)
│   ├── net.js              # Comunicação com o servidor via Socket.IO
│   ├── assets/             # Imagens e spritesheets
│   │   ├── tileset.png
│   │   ├── player.png
│   │   ├── npc.png
│   │   └── ui/icons.png
│   ├── css/                # Estilos CSS
│   │   └── style.css
│   ├── maps/               # Definições de mapas (JSON)
│   │   ├── map-city.json
│   │   └── map-forest.json
│   └── vendor/             # (Opcional) Bibliotecas de terceiros
├── admin/                  # Painel administrativo para professores
│   ├── index.html          # Página do painel
│   └── admin.js            # Lógica do painel (login, ranking)
└── README.md               # Este arquivo
```

## Como Rodar Localmente

Siga os passos abaixo para configurar e executar o projeto em sua máquina local:

1.  **Navegue até o diretório do projeto:**

    ```bash
    cd rpg_math_game
    ```

2.  **Instale as dependências do Node.js:**

    ```bash
    npm install express socket.io sqlite jsonwebtoken dotenv mathjs
    ```

3.  **Configure as variáveis de ambiente:**

    Copie o arquivo de exemplo e renomeie-o para `.env`:

    ```bash
    cp server/config.example.env server/.env
    ```

    Edite o arquivo `server/.env` e defina uma senha para o professor (substitua `changeme` por uma senha forte):

    ```
    PORT=3000
    PROF_PASSWORD=sua_senha_segura_aqui
    JWT_SECRET=uma_chave_secreta_para_jwt
    ```

4.  **Inicie o servidor:**

    ```bash
    node server/server.js
    ```

    Ou, para desenvolvimento com `nodemon` (se instalado globalmente):

    ```bash
    nodemon server/server.js
    ```

5.  **Acesse o jogo e o painel administrativo:**

    -   **Jogo:** Abra seu navegador e acesse `http://localhost:3000/`
    -   **Painel do Professor:** Abra seu navegador e acesse `http://localhost:3000/admin`

    Ao iniciar o jogo, você será solicitado a inserir um nome de jogador. Para o painel do professor, use o usuário `professor` e a senha que você definiu no arquivo `.env`.

## Funcionalidades Principais

-   **Movimento e Interação:** Use as teclas `WASD` ou `Setas` para mover o personagem. Pressione `E` ou `Enter` para interagir com NPCs e portais.
-   **Batalhas de Matemática:** Ao interagir com certos NPCs, uma batalha será iniciada onde você deve responder a perguntas de matemática para causar dano ao inimigo.
-   **Sistema de Missões:** Pressione `M` para abrir o painel de missões e acompanhar seu progresso.
-   **Persistência de Dados:** Seu progresso (nível, experiência, HP, moedas, missões) é salvo no banco de dados.
-   **Painel do Professor:** Permite que professores visualizem o ranking de jogadores e o progresso dos alunos (missões concluídas, acertos/erros).

## Geração de Perguntas de Matemática

O arquivo `server/math.js` contém a lógica para gerar perguntas de matemática dinamicamente. Atualmente, ele suporta os seguintes tipos de perguntas:

-   Aritmética fracionária
-   Equações lineares simples
-   Porcentagem
-   Potências e raízes
-   MMC/MDC
-   Proporções

Cada pergunta é gerada com parâmetros aleatórios e inclui uma explicação sucinta da solução.

## Assets

Os assets de pixel-art (`tileset.png`, `player.png`, `npc.png`, `ui/icons.png`) são placeholders simples gerados para este projeto. Eles podem ser substituídos por assets mais elaborados para melhorar a experiência visual do jogo.

## Considerações de Desenvolvimento

-   **Autoridade do Servidor:** O servidor é responsável por validar movimentos, colisões e a lógica de batalha para prevenir trapaças.
-   **Otimização:** O jogo utiliza culling para renderizar apenas os tiles visíveis na tela, otimizando o desempenho.
-   **Respawn de NPCs:** NPCs derrotados respawnarão após um tempo configurável.

---

Divirta-se explorando o Mundo da Matemática!


