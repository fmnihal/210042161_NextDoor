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


// Route to display profile page
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        // Fetch the logged-in user's data (profileUser)
        const profileUserResult = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
        const profileUser = profileUserResult.rows[0];

        if (!profileUser) {
            return res.status(404).send('User not found');
        }

        // Get the list of users the logged-in user is following
        const followingResult = await pool.query(
            "SELECT following_id FROM followers WHERE follower_id = $1", 
            [req.user.id]
        );
        const following = followingResult.rows.map(row => row.following_id);

        // Render the profile page, passing the logged-in user's data and following list
        res.render('profile', {
            user: req.user,           // The logged-in user
            profileUser: profileUser, // The logged-in user as the profile user
            following: following,     // List of users the logged-in user is following
            csrfToken: req.csrfToken() // CSRF token
        });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).send('Error fetching profile');
    }
});


// Settings, Add Links, Notifications, etc.
router.get('/profile/settings', authenticateToken, (req, res) => {
    res.render('settings', { user: req.user, csrfToken: req.csrfToken() });
});
router.get('/profile/settings/username', authenticateToken, (req, res) => {
    res.render('username', { user: req.user, csrfToken: req.csrfToken() });
});
router.get('/profile/settings/password', authenticateToken, (req, res) => {
    res.render('password', { user: req.user, csrfToken: req.csrfToken() });
});
router.get('/profile/settings/email', authenticateToken, (req, res) => {
    res.render('email', { user: req.user, csrfToken: req.csrfToken() });
});
router.get('/profile/settings/notifications', authenticateToken, (req, res) => {
    res.render('notifications', { user: req.user, csrfToken: req.csrfToken() });
});
router.get('/profile/settings/deactivate', authenticateToken, (req, res) => {
    res.render('deactivate', { user: req.user, csrfToken: req.csrfToken() });
});
router.get('/profile/settings/delete', authenticateToken, (req, res) => {
    res.render('delete', { user: req.user, csrfToken: req.csrfToken() });
});

// You can add other routes as needed, e.g., for profile editing, etc.
router.get('/profile/add-links', authenticateToken, (req, res) => {
    res.render('add-links', { user: req.user, csrfToken: req.csrfToken() });
});

router.get('/profile/settings/notifications', authenticateToken, (req, res) => {
    pool.query("SELECT * FROM notifications WHERE user_id = $1", [req.user.id], (err, result) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            return res.status(500).send('Error fetching notifications');
        }
        res.render('notifications', { notifications: result.rows, user: req.user, csrfToken: req.csrfToken() });
    });
});


router.get('/profile/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;  // Get profile user ID from the URL
    try {
        // Fetch the profile user data from the database
        const profileUserResult = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        const profileUser = profileUserResult.rows[0];

        if (!profileUser) {
            return res.status(404).send('User not found');
        }

        // Get the list of users that the logged-in user is following
        const followingResult = await pool.query(
            "SELECT following_id FROM followers WHERE follower_id = $1", 
            [req.user.id]
        );
        const following = followingResult.rows.map(row => row.following_id);

        // Render the profile page and pass the necessary data
        res.render('profile', {
            user: req.user,           // The logged-in user
            profileUser: profileUser, // The user whose profile is being viewed
            following: following      // List of users the logged-in user is following
        });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).send('Error fetching profile');
    }
});

// Get feed route (show posts from followed users)
router.get('/feed', authenticateToken, async (req, res) => {
    const { category } = req.query; // Get category filter from query params
    try {
        const followingResult = await pool.query("SELECT following_id FROM followers WHERE follower_id = $1", [req.user.id]);
        const following = followingResult.rows.map(row => row.following_id);

        let postsResult;
        if (category) {
            postsResult = await pool.query("SELECT * FROM posts WHERE user_id = ANY($1::int[]) AND category = $2 ORDER BY created_at DESC", [following, category]);
        } else {
            postsResult = await pool.query("SELECT * FROM posts WHERE user_id = ANY($1::int[]) ORDER BY created_at DESC", [following]);
        }

        const posts = postsResult.rows;
        res.render('feed', { user: req.user, posts: posts });
    } catch (err) {
        console.error('Error fetching feed:', err);
        res.status(500).send('Error fetching feed');
    }
});




// // ✅ REGISTER - POST Request
// router.post('/register', async (req, res) => {
//     try {
//         const { name, email, password } = req.body;

//         // Check if user already exists
//         const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
//         if (userExists.rows.length > 0) {
//             return res.status(400).json({ error: "User already exists!" });
//         }

//         // Hash password
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);

//         // Insert new user into database
//         await pool.query(
//             "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
//             [name, email, hashedPassword]
//         );

//         res.status(201).json({ message: "User registered successfully!" });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Server error" });
//     }
// });

// // ✅ LOGIN - POST Request
// router.post('/login', async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         // Find user by email
//         const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
//         if (userQuery.rows.length === 0) {
//             return res.status(400).json({ error: "Invalid email or password" });
//         }

//         const user = userQuery.rows[0];

//         // Compare password
//         const passwordMatch = await bcrypt.compare(password, user.password);
//         if (!passwordMatch) {
//             return res.status(400).json({ error: "Invalid email or password" });
//         }

//         res.status(200).json({ message: "Login successful!", user: { id: user.id, name: user.name, email: user.email } });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Server error" });
//     }
// });

router.post('/feed/create-post', authenticateToken, async (req, res) => {
    const { content, category } = req.body;
    const userId = req.user.id;

    // Check if the category is valid
    const validCategories = ['event', 'lost_and_found', 'buy_sell', 'discussion'];
    if (!validCategories.includes(category)) {
        return res.status(400).send('Invalid category selected');
    }

    try {
        // Insert the new post into the database
        await pool.query(
            "INSERT INTO posts (user_id, content, category) VALUES ($1, $2, $3)",
            [userId, content, category]
        );
        // Redirect the user back to the feed page
        res.redirect('/feed');
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).send('Error creating post');
    }
});


router.post('/post/:id/comment', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const { comment } = req.body;

    try {
        await pool.query("INSERT INTO comments (post_id, user_id, comment) VALUES ($1, $2, $3)", [postId, req.user.id, comment]);
        res.redirect(`/feed`);
    } catch (err) {
        console.error('Error posting comment:', err);
        res.status(500).send('Error posting comment');
    }
});

router.post('/post/:id/react', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const { reaction } = req.body; // "like" or "downvote"

    try {
        await pool.query("INSERT INTO reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)", [postId, req.user.id, reaction]);
        res.redirect(`/feed`);
    } catch (err) {
        console.error('Error reacting to post:', err);
        res.status(500).send('Error reacting to post');
    }
});


// Follow a user
router.post('/profile/follow', authenticateToken, async (req, res) => {
    const { userIdToFollow } = req.body;
    try {
        const result = await pool.query("SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2", [req.user.id, userIdToFollow]);
        if (result.rows.length > 0) {
            return res.status(400).send("You are already following this user.");
        }
        await pool.query("INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)", [req.user.id, userIdToFollow]);
        res.redirect('/feed');
    } catch (err) {
        console.error("Error following user:", err);
        res.status(500).send("Error following user.");
    }
});

// Unfollow a user
router.post('/profile/unfollow', authenticateToken, async (req, res) => {
    const { userIdToUnfollow } = req.body;

    try {
        // Unfollow the user
        await pool.query("DELETE FROM followers WHERE follower_id = $1 AND following_id = $2", [req.user.id, userIdToUnfollow]);
        res.redirect('/feed'); // Redirect to the feed or home page
    } catch (err) {
        console.error("Error unfollowing user:", err);
        res.status(500).send("Error unfollowing user.");
    }
});

// Add-links to profile
router.post('/profile/add-links', authenticateToken, async (req, res) => {
    const { github } = req.body;
    try {
        // Update only the GitHub link
        await pool.query("UPDATE users SET github = $1 WHERE id = $2", [github, req.user.id]);
        res.redirect('/profile'); // Redirect back to the profile page after update
    } catch (err) {
        console.error("Error updating social media links:", err);
        res.status(500).send("Error updating social media links");
    }
});

// Update Username
router.post('/profile/settings/username', authenticateToken, async (req, res) => {
    const { newUsername } = req.body;
    await pool.query("UPDATE users SET name = $1 WHERE id = $2", [newUsername, req.user.id]);
    res.redirect('/profile');
});
// Update Password
router.post('/profile/settings/password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
        return res.render('settings', { error: "Passwords do not match", user: req.user, csrfToken: req.csrfToken() });
    }
    // Validate current password and update new password...
});
// Update Email
router.post('/profile/settings/email', authenticateToken, async (req, res) => {
    const { newEmail } = req.body;
    await pool.query("UPDATE users SET email = $1 WHERE id = $2", [newEmail, req.user.id]);
    res.redirect('/profile');
});

// Notification Settings
router.post('/profile/settings/notifications', authenticateToken, async (req, res) => {
    const { emailNotifications, pushNotifications } = req.body;
    await pool.query("UPDATE users SET email_notifications = $1, push_notifications = $2 WHERE id = $3", 
                     [emailNotifications, pushNotifications, req.user.id]);
    res.redirect('/profile');
});

// Deactivate Account route
router.post('/profile/settings/deactivate', authenticateToken, async (req, res) => {
    try {
        // Deactivate the user's account by setting `active = false`
        await pool.query("UPDATE users SET active = false WHERE id = $1", [req.user.id]);
        res.redirect('/profile');  // After deactivation, redirect to the profile page
    } catch (err) {
        console.error('Error deactivating account:', err);
        res.status(500).send('Error deactivating account');
    }
});
// Delete Account
router.post('/profile/settings/delete', authenticateToken, async (req, res) => {
    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.redirect('/');
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

module.exports = router;