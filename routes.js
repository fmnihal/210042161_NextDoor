const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('./db.config');  // PostgreSQL Database Connection
const { authenticateToken } = require('./auth');

const router = express.Router();

// Dummy posts data
const posts = [
    { id: 1, username: 'Kyle', title: 'Post 1' },
    { id: 2, username: 'Jim', title: 'Post 2' }
];

// ✅ REGISTER - POST Request
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "User already exists!" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user into database
        await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
            [name, email, hashedPassword]
        );

        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ LOGIN - POST Request
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userQuery.rows.length === 0) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        const user = userQuery.rows[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        res.status(200).json({ message: "Login successful!", user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;