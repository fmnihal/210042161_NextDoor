require('dotenv').config();
const express = require('express');
const db = require('./db.config.js');
const cors = require('cors');
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { router: authRouter, authenticateToken } = require('./auth'); // Add authenticateToken import here
const postRoutes = require('./routes');
const port = process.env.PORT || 4538;

const app = express();
app.set('view engine', 'ejs');

// ✅ Middleware Order (Must be in this order)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// ✅ Secure Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        sameSite: 'strict' 
    }
}));

app.use(cookieParser()); // Required for CSRF

// ✅ CSRF Protection
app.use(csurf({ cookie: true }));

// ✅ CSRF Token Middleware
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// ✅ CORS Setup
app.use(cors({ origin: "http://localhost:4538", credentials: true }));

// Add this to your app.js file, in the routes section before the API routes:

// Homepage route
app.get('/', (req, res) => {
    res.render('home', { 
        csrfToken: req.csrfToken(),
        user: req.user // This will be undefined if not logged in
    });
});

// ✅ Routes for page rendering
app.get('/login', (req, res) => {
    res.render('login', { 
        error: null, 
        csrfToken: req.csrfToken() 
    });
});

app.get('/register', (req, res) => {
    res.render('register', { 
        errors: [], 
        name: '', 
        email: '', 
        csrfToken: req.csrfToken() 
    });
});

app.get('/profile', authenticateToken, (req, res) => {
    res.render('profile', { 
        user: req.user,
        csrfToken: req.csrfToken() 
    });
});

// ✅ API Routes
app.use('/auth', authRouter);
app.use('/', postRoutes);

// ✅ Database Connection Check (Before Starting Server)
(async () => {
    try {
        const res = await db.query("SELECT NOW()");
        console.log("✅ Database connected:", res.rows[0].now);

        // ✅ Start Server after DB check
        app.listen(port, () => {
            console.log(`🚀 Server running at http://localhost:${port}`);
        });
    } catch (err) {
        console.error("❌ Database connection failed:", err);
        process.exit(1); // Exit process if DB fails
    }
})();

// ✅ CSRF Error Handling (Important)
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).send('CSRF token validation failed.');
    }
    next(err);
});