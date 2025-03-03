// posts.js - Create this new file for post-related routes
const express = require('express');
const router = express.Router();
const pool = require('./db.config.js');
const { authenticateToken } = require('./auth');

// Get feed (posts from users you follow + your own posts)
router.get('/feed', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id, p.title, p.content, p.category, p.created_at, p.updated_at,
                p.location, p.event_date, p.event_location, p.lost_item_description, p.status,
                u.id as user_id, u.name as user_name,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                (SELECT COUNT(*) FROM reactions WHERE post_id = p.id AND reaction_type = 'like') as like_count,
                EXISTS(SELECT 1 FROM reactions WHERE post_id = p.id AND user_id = $1 AND reaction_type = 'like') as user_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = $1
            OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
            ORDER BY p.created_at DESC
            LIMIT 20
        `;
        
        const result = await pool.query(query, [req.user.id]);
        
        res.render('feed', {
            posts: result.rows,
            user: req.user,
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error('Error fetching feed:', error);
        res.status(500).render('error', { 
            error: 'Failed to load feed', 
            csrfToken: req.csrfToken() 
        });
    }
});

// Create new post
router.post('/posts', authenticateToken, async (req, res) => {
    try {
        const { category, title, content, location, event_date, event_location, lost_item_description } = req.body;
        
        const query = `
            INSERT INTO posts 
            (user_id, category, title, content, location, event_date, event_location, lost_item_description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;
        
        const values = [
            req.user.id, 
            category, 
            title, 
            content, 
            location || null, 
            event_date || null, 
            event_location || null, 
            lost_item_description || null
        ];
        
        const result = await pool.query(query, values);
        
        res.redirect('/feed');
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).render('error', { 
            error: 'Failed to create post', 
            csrfToken: req.csrfToken() 
        });
    }
});

// Get single post with comments
router.get('/posts/:id', authenticateToken, async (req, res) => {
    try {
        // Get post details
        const postQuery = `
            SELECT 
                p.id, p.title, p.content, p.category, p.created_at, p.updated_at,
                p.location, p.event_date, p.event_location, p.lost_item_description, p.status,
                u.id as user_id, u.name as user_name,
                (SELECT COUNT(*) FROM reactions WHERE post_id = p.id AND reaction_type = 'like') as like_count,
                EXISTS(SELECT 1 FROM reactions WHERE post_id = p.id AND user_id = $1 AND reaction_type = 'like') as user_liked,
                CASE 
                    WHEN p.category = 'event' THEN 
                        (SELECT reaction_type FROM reactions WHERE post_id = p.id AND user_id = $1 AND reaction_type IN ('going', 'interested', 'not_going'))
                    WHEN p.category = 'lost_found' THEN
                        (SELECT 'found' FROM reactions WHERE post_id = p.id AND user_id = $1 AND reaction_type = 'found')
                    ELSE NULL
                END as user_reaction
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $2
        `;
        
        const postResult = await pool.query(postQuery, [req.user.id, req.params.id]);
        
        if (postResult.rows.length === 0) {
            return res.status(404).render('error', { 
                error: 'Post not found', 
                csrfToken: req.csrfToken() 
            });
        }
        
        // Get comments with threaded structure
        const commentsQuery = `
            WITH RECURSIVE comment_tree AS (
                SELECT 
                    c.id, c.content, c.created_at, c.user_id, c.parent_comment_id, 
                    u.name as user_name, 0 as level
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = $1 AND c.parent_comment_id IS NULL
                
                UNION ALL
                
                SELECT 
                    c.id, c.content, c.created_at, c.user_id, c.parent_comment_id, 
                    u.name as user_name, ct.level + 1
                FROM comments c
                JOIN users u ON c.user_id = u.id
                JOIN comment_tree ct ON c.parent_comment_id = ct.id
                WHERE c.post_id = $1
            )
            SELECT 
                ct.*, 
                (SELECT COUNT(*) FROM reactions WHERE comment_id = ct.id AND reaction_type = 'like') as like_count,
                EXISTS(SELECT 1 FROM reactions WHERE comment_id = ct.id AND user_id = $2 AND reaction_type = 'like') as user_liked
            FROM comment_tree ct
            ORDER BY 
                CASE WHEN ct.parent_comment_id IS NULL THEN ct.id ELSE ct.parent_comment_id END,
                ct.level,
                ct.created_at
        `;
        
        const commentsResult = await pool.query(commentsQuery, [req.params.id, req.user.id]);
        
        res.render('post', {
            post: postResult.rows[0],
            comments: commentsResult.rows,
            user: req.user,
            csrfToken: req.csrfToken(),
            isAuthor: req.user.id === postResult.rows[0].user_id
        });
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).render('error', { 
            error: 'Failed to load post', 
            csrfToken: req.csrfToken() 
        });
    }
});

// Add comment
router.post('/posts/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { content, parent_comment_id } = req.body;
        
        const query = `
            INSERT INTO comments 
            (post_id, user_id, parent_comment_id, content)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;
        
        await pool.query(query, [
            req.params.id, 
            req.user.id, 
            parent_comment_id || null, 
            content
        ]);
        
        res.redirect(`/posts/${req.params.id}`);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).render('error', { 
            error: 'Failed to add comment', 
            csrfToken: req.csrfToken() 
        });
    }
});

// React to post (like, going, interested, found, etc.)
router.post('/posts/:id/react', authenticateToken, async (req, res) => {
    try {
        const { reaction_type } = req.body;
        
        // Check if user already reacted with this type
        const existingReaction = await pool.query(
            'SELECT id FROM reactions WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3',
            [req.params.id, req.user.id, reaction_type]
        );
        
        if (existingReaction.rows.length > 0) {
            // Remove reaction if it exists
            await pool.query(
                'DELETE FROM reactions WHERE id = $1',
                [existingReaction.rows[0].id]
            );
        } else {
            // For mutually exclusive reactions like going/interested/not_going, remove existing ones
            if (['going', 'interested', 'not_going'].includes(reaction_type)) {
                await pool.query(
                    'DELETE FROM reactions WHERE post_id = $1 AND user_id = $2 AND reaction_type IN ($3, $4, $5)',
                    [req.params.id, req.user.id, 'going', 'interested', 'not_going']
                );
            }
            
            // Add new reaction
            await pool.query(
                'INSERT INTO reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)',
                [req.params.id, req.user.id, reaction_type]
            );
        }
        
        // Redirect back to post or feed
        const referer = req.headers.referer;
        res.redirect(referer || `/posts/${req.params.id}`);
    } catch (error) {
        console.error('Error reacting to post:', error);
        res.status(500).render('error', { 
            error: 'Failed to react to post', 
            csrfToken: req.csrfToken() 
        });
    }
});

// Delete post (author only)
router.post('/posts/:id/delete', authenticateToken, async (req, res) => {
    try {
        // Check if user is author
        const post = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
        
        if (post.rows.length === 0) {
            return res.status(404).render('error', { 
                error: 'Post not found', 
                csrfToken: req.csrfToken() 
            });
        }
        
        if (post.rows[0].user_id !== req.user.id) {
            return res.status(403).render('error', { 
                error: 'Not authorized to delete this post', 
                csrfToken: req.csrfToken() 
            });
        }
        
        // Delete post
        await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
        
        res.redirect('/feed');
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).render('error', { 
            error: 'Failed to delete post', 
            csrfToken: req.csrfToken() 
        });
    }
});

// Follow/unfollow user
router.post('/users/:id/follow', authenticateToken, async (req, res) => {
    try {
        const userToFollowId = req.params.id;
        
        // Can't follow yourself
        if (userToFollowId == req.user.id) {
            return res.status(400).render('error', { 
                error: 'You cannot follow yourself', 
                csrfToken: req.csrfToken() 
            });
        }
        
        // Check if already following
        const existingFollow = await pool.query(
            'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
            [req.user.id, userToFollowId]
        );
        
        if (existingFollow.rows.length > 0) {
            // Unfollow
            await pool.query(
                'DELETE FROM follows WHERE id = $1',
                [existingFollow.rows[0].id]
            );
        } else {
            // Follow
            await pool.query(
                'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
                [req.user.id, userToFollowId]
            );
        }
        
        // Redirect back
        const referer = req.headers.referer;
        res.redirect(referer || `/users/${userToFollowId}`);
    } catch (error) {
        console.error('Error following/unfollowing user:', error);
        res.status(500).render('error', { 
            error: 'Failed to follow/unfollow user', 
            csrfToken: req.csrfToken() 
        });
    }
});

module.exports = router;