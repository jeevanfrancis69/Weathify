const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Get all songs with pagination
 * GET /api/admin/songs?page=1&limit=50
 */
router.get('/songs', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM songs');
    const total = parseInt(countResult.rows[0].count);
    
    const songsResult = await pool.query(
      `SELECT s.*, 
        (SELECT json_agg(json_build_object('tag', mt.tag_name, 'weight', smt.weight))
         FROM song_mood_tags smt
         JOIN mood_tags mt ON smt.tag_id = mt.tag_id
         WHERE smt.song_id = s.song_id) AS mood_tags,
        (SELECT json_agg(json_build_object('condition', wc.condition_name, 'weight', sw.weight))
         FROM song_weather sw
         JOIN weather_conditions wc ON sw.condition_id = wc.condition_id
         WHERE sw.song_id = s.song_id) AS weather_tags,
        (SELECT json_agg(json_build_object('season', se.season_name, 'weight', ss.weight))
         FROM song_seasons ss
         JOIN seasons se ON ss.season_id = se.season_id
         WHERE ss.song_id = s.song_id) AS season_tags,
        (SELECT json_agg(json_build_object('period', tp.period_name, 'weight', stp.weight))
         FROM song_time_periods stp
         JOIN time_periods tp ON stp.period_id = tp.period_id
         WHERE stp.song_id = s.song_id) AS time_tags
       FROM songs s
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.json({
      songs: songsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get songs error:', error);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

/**
 * Add new song
 * POST /api/admin/songs
 */
router.post('/songs', async (req, res) => {
  const {
    title,
    artist,
    album,
    duration_ms,
    spotify_id,
    preview_url,
    album_art_url,
    release_year,
    moodTags,
    weatherTags,
    seasonTags,
    timeTags
  } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert song
    const songResult = await client.query(
      `INSERT INTO songs (title, artist, album, duration_ms, spotify_id, preview_url, album_art_url, release_year, added_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, artist, album, duration_ms, spotify_id, preview_url, album_art_url, release_year, req.user.userId]
    );
    
    const songId = songResult.rows[0].song_id;
    
    // Add mood tags
    if (moodTags && moodTags.length > 0) {
      for (const tag of moodTags) {
        await client.query(
          `INSERT INTO song_mood_tags (song_id, tag_id, weight)
           SELECT $1, tag_id, $2 FROM mood_tags WHERE tag_name = $3`,
          [songId, tag.weight || 1.0, tag.name]
        );
      }
    }
    
    // Add weather tags
    if (weatherTags && weatherTags.length > 0) {
      for (const tag of weatherTags) {
        await client.query(
          `INSERT INTO song_weather (song_id, condition_id, weight)
           SELECT $1, condition_id, $2 FROM weather_conditions WHERE condition_name = $3`,
          [songId, tag.weight || 1.0, tag.name]
        );
      }
    }
    
    // Add season tags
    if (seasonTags && seasonTags.length > 0) {
      for (const tag of seasonTags) {
        await client.query(
          `INSERT INTO song_seasons (song_id, season_id, weight)
           SELECT $1, season_id, $2 FROM seasons WHERE season_name = $3`,
          [songId, tag.weight || 1.0, tag.name]
        );
      }
    }
    
    // Add time tags
    if (timeTags && timeTags.length > 0) {
      for (const tag of timeTags) {
        await client.query(
          `INSERT INTO song_time_periods (song_id, period_id, weight)
           SELECT $1, period_id, $2 FROM time_periods WHERE period_name = $3`,
          [songId, tag.weight || 1.0, tag.name]
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Song added successfully',
      song: songResult.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add song error:', error);
    res.status(500).json({ error: 'Failed to add song' });
  } finally {
    client.release();
  }
});

/**
 * Update song
 * PUT /api/admin/songs/:songId
 */
router.put('/songs/:songId', async (req, res) => {
  const { songId } = req.params;
  const updates = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE songs 
       SET title = COALESCE($1, title),
           artist = COALESCE($2, artist),
           album = COALESCE($3, album),
           duration_ms = COALESCE($4, duration_ms),
           spotify_id = COALESCE($5, spotify_id),
           preview_url = COALESCE($6, preview_url),
           album_art_url = COALESCE($7, album_art_url),
           release_year = COALESCE($8, release_year)
       WHERE song_id = $9
       RETURNING *`,
      [
        updates.title,
        updates.artist,
        updates.album,
        updates.duration_ms,
        updates.spotify_id,
        updates.preview_url,
        updates.album_art_url,
        updates.release_year,
        songId
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json({
      message: 'Song updated successfully',
      song: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update song error:', error);
    res.status(500).json({ error: 'Failed to update song' });
  }
});

/**
 * Delete song
 * DELETE /api/admin/songs/:songId
 */
router.delete('/songs/:songId', async (req, res) => {
  const { songId } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM songs WHERE song_id = $1 RETURNING *',
      [songId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json({ message: 'Song deleted successfully' });
    
  } catch (error) {
    console.error('Delete song error:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

/**
 * Get all mood tags
 * GET /api/admin/tags/moods
 */
router.get('/tags/moods', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mood_tags ORDER BY tag_name');
    res.json({ tags: result.rows });
  } catch (error) {
    console.error('Get mood tags error:', error);
    res.status(500).json({ error: 'Failed to fetch mood tags' });
  }
});

/**
 * Add new mood tag
 * POST /api/admin/tags/moods
 */
router.post('/tags/moods', async (req, res) => {
  const { tag_name, description } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO mood_tags (tag_name, description) VALUES ($1, $2) RETURNING *',
      [tag_name, description]
    );
    
    res.status(201).json({
      message: 'Mood tag created successfully',
      tag: result.rows[0]
    });
    
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Tag already exists' });
    } else {
      console.error('Add mood tag error:', error);
      res.status(500).json({ error: 'Failed to add mood tag' });
    }
  }
});

/**
 * Delete mood tag
 * DELETE /api/admin/tags/moods/:tagId
 */
router.delete('/tags/moods/:tagId', async (req, res) => {
  const { tagId } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM mood_tags WHERE tag_id = $1 RETURNING *',
      [tagId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json({ message: 'Mood tag deleted successfully' });
    
  } catch (error) {
    console.error('Delete mood tag error:', error);
    res.status(500).json({ error: 'Failed to delete mood tag' });
  }
});

/**
 * Get system analytics
 * GET /api/admin/analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    // Get total songs
    const songsCount = await pool.query('SELECT COUNT(*) as count FROM songs');
    
    // Get total users
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    
    // Get total playlists
    const playlistsCount = await pool.query('SELECT COUNT(*) as count FROM playlists');
    
    // Get most active weather conditions
    const weatherStats = await pool.query(`
      SELECT weather_condition, SUM(request_count) as total_requests
      FROM usage_analytics
      WHERE weather_condition IS NOT NULL
      GROUP BY weather_condition
      ORDER BY total_requests DESC
      LIMIT 5
    `);
    
    // Get recent activity
    const recentActivity = await pool.query(`
      SELECT date, SUM(request_count) as requests, SUM(unique_users) as users
      FROM usage_analytics
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `);
    
    res.json({
      overview: {
        totalSongs: parseInt(songsCount.rows[0].count),
        totalUsers: parseInt(usersCount.rows[0].count),
        totalPlaylists: parseInt(playlistsCount.rows[0].count)
      },
      weatherStats: weatherStats.rows,
      recentActivity: recentActivity.rows
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
