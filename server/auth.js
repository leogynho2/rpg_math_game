const jwt = require("jsonwebtoken");
const db = require("./db");

const PROF_PASSWORD = process.env.PROF_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey"; // Use a strong, random key in production

async function login(req, res) {
    const { username, password } = req.body;

    if (username === "professor" && password === PROF_PASSWORD) {
        const token = jwt.sign({ username: "professor" }, JWT_SECRET, { expiresIn: "1h" });
        return res.json({ token });
    } else {
        return res.status(401).json({ message: "Invalid credentials" });
    }
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null) return res.sendStatus(401); // No token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.user = user;
        next();
    });
}

module.exports = {
    login,
    authenticateToken,
};


