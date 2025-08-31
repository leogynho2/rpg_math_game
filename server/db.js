const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const fs = require("fs");

let db;

async function init() {
    db = await open({
        filename: "./database.sqlite",
        driver: sqlite3.Database,
    });

    const schema = fs.readFileSync(__dirname + "/schema.sql", "utf8");
    await db.exec(schema);
    console.log("Database initialized and schema applied.");
}

module.exports = {
    init,
    get: (...args) => db.get(...args),
    all: (...args) => db.all(...args),
    run: (...args) => db.run(...args),
};


