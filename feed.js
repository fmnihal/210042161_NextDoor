const express = require('express');
const pool = require('./db.config');   // ✅ Correct PostgreSQL Database Connection
const { authenticateToken } = require('./auth');  // ✅ Correct (if auth.js is in the same folder)

const router = express.Router();

// ✅ Fetch All Posts (Newsfeed)
router.get('/newsfeed', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT posts.id, posts.content, posts.created_at, users.name AS author,
                   COALESCE(likes.count, 0) AS likes
            FROM posts
            JOIN users ON posts.user_id = users.id
            LEFT JOIN (SELECT post_id, COUNT(*) AS count FROM likes GROUP BY post_id) likes
            ON posts.id = likes.post_id
            ORDER BY posts.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch newsfeed' });
    }
});

// ✅ Create a Post
router.post('/newsfeed', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content cannot be empty' });

        await pool.query("INSERT INTO posts (user_id, content) VALUES ($1, $2)", [req.user.id, content]);
        res.status(201).json({ message: 'Post created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// ✅ Like a Post
router.post('/newsfeed/:postId/like', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        await pool.query("INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [req.user.id, postId]);
        res.json({ message: 'Post liked' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// ✅ Unlike a Post
router.delete('/newsfeed/:postId/unlike', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        await pool.query("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", [req.user.id, postId]);
        res.json({ message: 'Post unliked' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to unlike post' });
    }
});

// ✅ Comment on a Post
router.post('/newsfeed/:postId/comment', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const { comment } = req.body;
        if (!comment) return res.status(400).json({ error: 'Comment cannot be empty' });

        await pool.query("INSERT INTO comments (user_id, post_id, comment) VALUES ($1, $2, $3)", [req.user.id, postId, comment]);
        res.json({ message: 'Comment added' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// ✅ Fetch Comments on a Post
router.get('/newsfeed/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        const result = await pool.query(`
            SELECT comments.comment, comments.created_at, users.name AS author 
            FROM comments 
            JOIN users ON comments.user_id = users.id 
            WHERE post_id = $1
            ORDER BY comments.created_at ASC
        `, [postId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

module.exports = router;