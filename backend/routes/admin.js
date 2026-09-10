const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateAdmin, requireAdminRole } = require('../middleware/auth');
const spotifyService = require('../services/spotifyService');
const analyticsService = require('../services/analyticsService');

// All admin routes require authentication
router.use(authenticateAdmin);

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get all songs with pagination
router.get('/songs', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*) FROM songs WHERE title ILIKE $1 OR artist ILIKE $1`,
      [`%${search}%`]
    );

    const result = await query(
      `
      SELECT 
        s.*,
        ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
      FROM songs s
      LEFT JOIN song_tags st ON s.id = st.song_id
      LEFT JOIN tags t ON st.tag_id = t.id
      WHERE s.title ILIKE $1 OR s.artist ILIKE $1
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [`%${search}%`, limit, offset]
    );

    res.json({
      songs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Error getting songs:', error);
    res.status(500).json({ error: 'Failed to get songs' });
  }
});

// Get single song with tags
router.get('/songs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `
      SELECT 
        s.*,
        json_agg(
          json_build_object(
            'tag_id', t.id,
            'tag_name', t.name,
            'category', t.category,
            'weight', st.weight
          )
        ) FILTER (WHERE t.id IS NOT NULL) as tags
      FROM songs s
      LEFT JOIN song_tags st ON s.id = st.song_id
      LEFT JOIN tags t ON st.tag_id = t.id
      WHERE s.id = $1
      GROUP BY s.id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting song:', error);
    res.status(500).json({ error: 'Failed to get song' });
  }
});

// Add song from Spotify
router.post('/songs', requireAdminRole(['admin']), async (req, res) => {
  try {
    const { spotify_track_id } = req.body;

    if (!spotify_track_id) {
      return res.status(400).json({ error: 'Spotify track ID required' });
    }

    // Check if song already exists
    const existing = await query(
      'SELECT id FROM songs WHERE spotify_track_id = $1',
      [spotify_track_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Song already exists' });
    }

    // Fetch from Spotify
    const trackData = await spotifyService.getTrack(spotify_track_id);

    // Normalize partial Spotify dates ("1985" → "1985-01-01")
    let releaseDate = trackData.release_date || null;
    if (releaseDate) {
      if (/^\d{4}$/.test(releaseDate)) releaseDate += '-01-01';
      else if (/^\d{4}-\d{2}$/.test(releaseDate)) releaseDate += '-01';
    }

    // Insert into database
    const result = await query(
      `
      INSERT INTO songs 
        (spotify_track_id, title, artist, album, duration_ms, 
         preview_url, spotify_url, album_art_url, popularity, explicit, release_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        trackData.spotify_track_id,
        trackData.title,
        trackData.artist,
        trackData.album,
        trackData.duration_ms,
        trackData.preview_url,
        trackData.spotify_url,
        trackData.album_art_url,
        trackData.popularity,
        trackData.explicit,
        releaseDate,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding song:', error);
    res.status(500).json({ error: 'Failed to add song' });
  }
});

// Update song metadata
router.put('/songs/:id', requireAdminRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, album } = req.body;

    const result = await query(
      `
      UPDATE songs 
      SET title = COALESCE($1, title),
          artist = COALESCE($2, artist),
          album = COALESCE($3, album),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [title, artist, album, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ error: 'Failed to update song' });
  }
});

// Delete song
router.delete('/songs/:id', requireAdminRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM songs WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ success: true, message: 'Song deleted' });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// Assign tags to song
router.post('/songs/:id/tags', requireAdminRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { tag_id, weight = 1.0 } = req.body;

    if (!tag_id) {
      return res.status(400).json({ error: 'Tag ID required' });
    }

    const result = await query(
      `
      INSERT INTO song_tags (song_id, tag_id, weight)
      VALUES ($1, $2, $3)
      ON CONFLICT (song_id, tag_id) 
      DO UPDATE SET weight = $3
      RETURNING *
      `,
      [id, tag_id, weight]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning tag:', error);
    res.status(500).json({ error: 'Failed to assign tag' });
  }
});

// Remove tag from song
router.delete('/songs/:id/tags/:tagId', requireAdminRole(['admin']), async (req, res) => {
  try {
    const { id, tagId } = req.params;

    await query(
      'DELETE FROM song_tags WHERE song_id = $1 AND tag_id = $2',
      [id, tagId]
    );

    res.json({ success: true, message: 'Tag removed' });
  } catch (error) {
    console.error('Error removing tag:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
  }
});

// Get all tags
router.get('/tags', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM tags ORDER BY category, name'
    );

    res.json({ tags: result.rows });
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// Create new tag
router.post('/tags', requireAdminRole(['admin']), async (req, res) => {
  try {
    const { name, category, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category required' });
    }

    const result = await query(
      `
      INSERT INTO tags (name, category, description)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [name.toLowerCase(), category, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Delete a tag
router.delete('/tags/:id', requireAdminRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM tags WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ success: true, message: 'Tag deleted', tag: result.rows[0] });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Search Spotify
router.get('/spotify/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const tracks = await spotifyService.searchTracks(q, parseInt(limit));
    res.json({ tracks });
  } catch (error) {
    console.error('Error searching Spotify:', error);
    res.status(500).json({ error: 'Spotify search failed' });
  }
});

module.exports = router;