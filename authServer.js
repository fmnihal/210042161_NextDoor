// require('dotenv').config();
// const express = require('express');
// const jwt = require('jsonwebtoken');
// const app = express();
// const port = process.env.PORT || 4539;

// let refreshTokens= [];

// app.get('/', (req, res)=> res.render('home'));
// app.get('/users/register', (req, res) => {
//     res.render('register', { errors: [], name: '', email: '', csrfToken: req.csrfToken() });
// });
// app.get('/users/login', (req, res) => res.render('login'));
// app.get('/users/dashboard', (req, res) => res.render('dashboard', {user: 'postgres'}));

// app.post('/token', (req, res)=>{
//     const refreshToken= req.body.token;
//     if (refreshToken==null) return res.sendStatus(401);
//     if (!refreshTokens.includes(refreshToken)) res.sendStatus(403);
//     jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user)=>{
//         if (err) return res.sendStatus(403);
//         const accessToken= generateAccessToken({name: user.name});
//         res.json({accessToken: accessToken});
//     });
// });
// app.post('/users/register', async (req, res) => {
//     let { name, email, password, password2 } = req.body;
//     let errors = [];
//     // Password validation
//     if (password !== password2) {
//         errors.push("Passwords do not match.");
//     }
//     if (password.length < 6 || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
//         errors.push("Password must be at least 6 characters and contain a special character.");
//     }
//     // If there are errors, re-render the register page with errors
//     if (errors.length > 0) {
//         return res.render('register', { errors, name, email });  // Keep entered data
//     }

//     try {
//         const hashedPassword = await bcrypt.hash(password, 10);
//         await db.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3)", [name, email, hashedPassword]);
//         return res.redirect('/users/login');  // Redirect to login page
//     } catch (err) {
//         console.error("Database error:", err);
//         // res.status(500).send("Error registering user.");
//         res.status(500).render('register', { errors: ["Error registering user."], name, email, csrfToken: req.csrfToken() });
//     }
// });
// app.delete('/logout', (req, res)=>{
//     refreshTokens= refreshTokens.filter(token=> token !== req.body.token);
//     res.sendStatus(204);
// });
// app.post('/users/login', (req, res) => {
//     let { email, password } = req.body;
//     if (!email || !password) {
//         return res.status(400).send("Email and password are required.");
//     }
//     // Add authentication logic here
//     ///////////
//     // jwt
//     const username= req.body.username;
//     const user= {name: username};
//     const accessToken= generateAccessToken(user);
//     const refreshToken= jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
//     refreshTokens.push(refreshToken);
//     res.json({accessToken: accessToken, refreshToken: refreshToken});
//     ////////////
//     res.send("Login successful");
// });

// function generateAccessToken(user){
//     return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '10m'});
// }

// app.listen(port, () => {
//     console.log(`Here we go! Engines started at Port ${port}.`);
// });