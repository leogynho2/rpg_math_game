CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    password_hash TEXT,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
    user_id INTEGER PRIMARY KEY,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 100,
    max_hp INTEGER DEFAULT 100,
    coins INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    last_map TEXT DEFAULT 'map-city',
    x INTEGER DEFAULT 25,
    y INTEGER DEFAULT 25,
    spawn_x INTEGER DEFAULT 25,
    spawn_y INTEGER DEFAULT 25,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    target TEXT,
    reward_exp INTEGER,
    reward_coins INTEGER
);

CREATE TABLE IF NOT EXISTS player_missions (
    user_id INTEGER NOT NULL,
    mission_id INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, mission_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    map TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    respawn_sec INTEGER DEFAULT 300,
    active BOOLEAN DEFAULT 1,
    hp INTEGER DEFAULT 50,
    max_hp INTEGER DEFAULT 50,
    level INTEGER DEFAULT 1,
    last_defeated_at INTEGER
);

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    npc_id INTEGER NOT NULL,
    state TEXT NOT NULL,
    player_hp INTEGER,
    npc_hp INTEGER,
    question_snapshot_json TEXT,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (npc_id) REFERENCES npcs(id)
);

CREATE TABLE IF NOT EXISTS professors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS answers_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    npc_id INTEGER NOT NULL,
    question_snapshot_json TEXT NOT NULL,
    correct BOOLEAN NOT NULL,
    delta_hp INTEGER,
    exp_gain INTEGER,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (npc_id) REFERENCES npcs(id)
);

-- Seed data
INSERT OR IGNORE INTO npcs (id, name, map, x, y, respawn_sec, hp, max_hp, level) VALUES
(1, 'Professor Carvalho', 'map-city', 20, 20, 999999, 100, 100, 1),
(2, 'Goblin Matemático', 'map-forest', 10, 10, 120, 30, 30, 2),
(3, 'Orc da Álgebra', 'map-forest', 30, 30, 180, 40, 40, 3);

INSERT OR IGNORE INTO missions (id, code, title, description, type, target, reward_exp, reward_coins) VALUES
(1, 'M001', 'Primeiro Contato', 'Fale com 1 NPC.', 'talk', '1', 10, 10),
(2, 'M002', 'Aquecimento Numérico', 'Acerte 3 perguntas.', 'answer_questions', '3', 25, 20),
(3, 'M003', 'Explorador', 'Entre no portal da floresta.', 'enter_map', 'map-forest', 15, 0);

INSERT OR IGNORE INTO professors (username, password_hash) VALUES ('professor', 'password_hash_here'); -- Replace with actual hashed password


