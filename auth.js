const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const pool = require('./db.config.js');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

require('dotenv').config();
const router = express.Router();
router.use(cookieParser());

let refreshTokens = new Set();

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10m' });
}

function generateRefreshToken(user) {
    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
    refreshTokens.add(refreshToken);
    return refreshToken;
}

async function getUserByEmail(email) {
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error("Database error:", error);
        return null;
    }
}

async function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    
    if (!token) {
        return res.redirect('/login');
    }
    
    try {
        const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = user;
        next();
    } catch (err) {
        // If token expired, try to use refresh token
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken || !refreshTokens.has(refreshToken)) {
            return res.redirect('/login');
        }
        
        try {
            const user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            // Generate new access token
            const accessToken = generateAccessToken({ name: user.name, email: user.email });
            res.cookie('token', accessToken, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                sameSite: 'strict', 
                maxAge: 10 * 60 * 1000 // 10 minutes
            });
            req.user = user;
            next();
        } catch (err) {
            return res.redirect('/login');
        }
    }
}

router.post('/register', async (req, res) => {
    const { name, email, password, password2 } = req.body;
    let errors = [];
    if (password !== password2) errors.push("Passwords do not match.");
    if (password.length < 6 || !/[!@#$%^&*]/.test(password)) errors.push("Password must be at least 6 characters and contain a special character.");
    if (errors.length > 0) {
        return res.render('register', { errors, name, email, csrfToken: req.csrfToken?.() || "" });
    }
    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.render('register', { errors: ['Email is already registered'], name, email, csrfToken: req.csrfToken?.() || "" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3)', [name, email, hashedPassword]);
        res.redirect('/login');
    } catch (error) {
        res.render('register', { errors: ['Error registering user'], name, email, csrfToken: req.csrfToken?.() || "" });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).render('login', { error: "Email and password are required.", csrfToken: req.csrfToken?.() || "" });
    }
    try {
        const user = await getUserByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(403).render('login', { error: "Invalid credentials.", csrfToken: req.csrfToken?.() || "" });
        }
        const accessToken = generateAccessToken({ name: user.name, email: user.email });
        const refreshToken = generateRefreshToken({ name: user.name, email: user.email });
        res.cookie('token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 3600 * 1000 });
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.redirect('/profile');
    } catch (error) {
        res.render('login', { error: "Server error.", csrfToken: req.csrfToken?.() || "" });
    }
});

router.post('/logout', (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        refreshTokens.delete(refreshToken);
    }
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.redirect('/');
});

router.get('/refresh-token', (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return res.status(403).json({ error: 'Invalid refresh token' });
    }
    
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid refresh token' });
        
        const accessToken = generateAccessToken({ name: user.name, email: user.email });
        
        res.cookie('token', accessToken, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'strict', 
            maxAge: 10 * 60 * 1000 
        });
        
        res.json({ success: true });
    });
});

module.exports = { router, authenticateToken };