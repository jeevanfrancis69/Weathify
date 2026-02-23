const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendationService');
const weatherService = require('../services/weatherService');
const analyticsService = require('../services/analyticsService');
const { authenticateUser, optionalAuth } = require('../middleware/auth');
const { query } = require('../config/database');

// Get personalized recommendations
router.post('/', optionalAuth, async (req, res) => {
  try {
    console.log('[Recommendations] Received request:', req.body);
    
    const { latitude, longitude, weather, season, time_of_day } = req.body;

    let context = {};

    if (latitude && longitude) {
      console.log('[Recommendations] Fetching weather by coords');
      const weatherData = await weatherService.getWeatherByCoordinates(latitude, longitude);
      const hemisphere = weatherService.getHemisphere(latitude);
      
      context = {
        weather: weatherData.condition,
        season: season || weatherService.getSeason(new Date(), hemisphere),
        time_of_day: time_of_day || weatherService.getTimeOfDay(),
      };

      console.log('[Recommendations] Context:', context);

      await analyticsService.logEvent({
        event_type: 'recommendation_request',
        weather_condition: context.weather,
        season: context.season,
        time_of_day: context.time_of_day,
        location_city: weatherData.city,
        location_country: weatherData.country,
        metadata: { user_id: req.user?.id },
      });
    } else if (weather) {
      console.log('[Recommendations] Using manual weather');
      context = {
        weather: weather,
        season: season || weatherService.getSeason(),
        time_of_day: time_of_day || weatherService.getTimeOfDay(),
      };

      console.log('[Recommendations] Context:', context);

      await analyticsService.logEvent({
        event_type: 'recommendation_request',
        weather_condition: context.weather,
        season: context.season,
        time_of_day: context.time_of_day,
        metadata: { manual_selection: true, user_id: req.user?.id },
      });
    } else {
      console.error('[Recommendations] Missing required fields');
      return res.status(400).json({
        error: 'Either coordinates or weather condition is required',
      });
    }

    console.log('[Recommendations] Calling recommendation service');
    const recommendations = await recommendationService.getRecommendations(context);
    
    console.log('[Recommendations] Got', recommendations.songs?.length || 0, 'songs');

    res.json(recommendations);
  } catch (error) {
    console.error('[Recommendations] Error:', error);
    res.status(500).json({ error: 'Failed to get recommendations', message: error.message });
  }
});

// Search songs
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const songs = await recommendationService.searchSongs(q, parseInt(limit));
    res.json({ songs });
  } catch (error) {
    console.error('Error searching songs:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.post('/like', authenticateUser, async (req, res) => {
  try {
    const { song_id, weather, season, time_of_day } = req.body;

    if (!song_id) {
      return res.status(400).json({ error: 'song_id required' });
    }

    // Check if already liked
    const existing = await query(
      'SELECT id FROM liked_songs WHERE user_id = $1 AND song_id = $2',
      [req.user.id, song_id]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, message: 'Already liked' });
    }

    // Insert
    await query(
      `INSERT INTO liked_songs (user_id, song_id, weather, season, time_of_day)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, song_id, weather, season, time_of_day]
    );

    return res.json({ success: true, message: 'Song liked' });
  } catch (error) {
    console.error('[Like song] Error:', error);
    return res.status(500).json({ error: 'Failed to like song' });
  }
});

router.delete('/unlike/:song_id', authenticateUser, async (req, res) => {
  try {
    const { song_id } = req.params;

    const result = await query(
      'DELETE FROM liked_songs WHERE user_id = $1 AND song_id = $2 RETURNING id',
      [req.user.id, song_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not in playlist' });
    }

    return res.json({ success: true, message: 'Song removed from playlist' });
  } catch (error) {
    console.error('[Unlike song] Error:', error);
    return res.status(500).json({ error: 'Failed to unlike song' });
  }
});

// ── Get user's liked songs (playlist) ────────────────────────
router.get('/playlist', authenticateUser, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        s.id, s.spotify_track_id, s.title, s.artist, s.album,
        s.spotify_url, s.album_art_url, s.popularity,
        ls.weather, ls.season, ls.time_of_day, ls.liked_at
      FROM liked_songs ls
      JOIN songs s ON ls.song_id = s.id
      WHERE ls.user_id = $1
      ORDER BY ls.liked_at DESC`,
      [req.user.id]
    );

    return res.json({ songs: result.rows });
  } catch (error) {
    console.error('[Playlist] Error:', error);
    return res.status(500).json({ error: 'Failed to load playlist' });
  }
});


module.exports = router;