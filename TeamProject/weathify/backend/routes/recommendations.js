const express = require('express');
const recommendationEngine = require('../services/recommendationEngine');
const weatherService = require('../services/weatherService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Get personalized recommendations based on location
 * POST /api/recommendations/personalized
 */
router.post('/personalized', authenticateToken, async (req, res) => {
  const { latitude, longitude, hemisphere = 'north' } = req.body;
  
  try {
    // Get context (weather, season, time)
    const context = await weatherService.getContext(latitude, longitude, hemisphere);
    
    // Get recommendations
    const recommendations = await recommendationEngine.getRecommendations({
      weather: context.weather,
      season: context.season,
      timePeriod: context.timePeriod,
      limit: 20
    });
    
    // Get explanation
    const explanation = recommendationEngine.getContextExplanation({
      weather: context.weather,
      season: context.season,
      timePeriod: context.timePeriod
    });
    
    res.json({
      context: {
        weather: context.weather,
        weatherDetails: context.weatherDetails,
        season: context.season,
        timePeriod: context.timePeriod,
        timestamp: context.timestamp
      },
      explanation,
      recommendations,
      total: recommendations.length
    });
    
  } catch (error) {
    console.error('Personalized recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/**
 * Get recommendations with manual weather input
 * POST /api/recommendations/manual
 */
router.post('/manual', authenticateToken, async (req, res) => {
  const { weather, season, timePeriod } = req.body;
  
  try {
    // Validate inputs
    if (!weather || !season || !timePeriod) {
      return res.status(400).json({ 
        error: 'Weather, season, and time period are required' 
      });
    }
    
    // Get recommendations
    const recommendations = await recommendationEngine.getRecommendations({
      weather,
      season,
      timePeriod,
      limit: 20
    });
    
    const explanation = recommendationEngine.getContextExplanation({
      weather,
      season,
      timePeriod
    });
    
    res.json({
      context: { weather, season, timePeriod },
      explanation,
      recommendations,
      total: recommendations.length
    });
    
  } catch (error) {
    console.error('Manual recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/**
 * Get recommendations by mood tag
 * GET /api/recommendations/mood/:moodTag
 */
router.get('/mood/:moodTag', authenticateToken, async (req, res) => {
  const { moodTag } = req.params;
  
  try {
    const recommendations = await recommendationEngine.getByMood(moodTag, 20);
    
    res.json({
      mood: moodTag,
      recommendations,
      total: recommendations.length
    });
    
  } catch (error) {
    console.error('Mood recommendations error:', error);
    res.status(500).json({ error: 'Failed to get mood recommendations' });
  }
});

/**
 * Create playlist from current context
 * POST /api/recommendations/create-playlist
 */
router.post('/create-playlist', authenticateToken, async (req, res) => {
  const { latitude, longitude, hemisphere = 'north' } = req.body;
  const userId = req.user.userId;
  
  try {
    // Get context
    const context = await weatherService.getContext(latitude, longitude, hemisphere);
    
    // Create playlist
    const playlist = await recommendationEngine.createContextPlaylist(userId, {
      weather: context.weather,
      season: context.season,
      timePeriod: context.timePeriod
    });
    
    res.json({
      message: 'Playlist created successfully',
      playlist
    });
    
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

/**
 * Get current weather context
 * POST /api/recommendations/context
 */
router.post('/context', async (req, res) => {
  const { latitude, longitude, hemisphere = 'north' } = req.body;
  
  try {
    const context = await weatherService.getContext(latitude, longitude, hemisphere);
    
    res.json({
      weather: context.weather,
      weatherDetails: context.weatherDetails,
      season: context.season,
      timePeriod: context.timePeriod,
      timestamp: context.timestamp
    });
    
  } catch (error) {
    console.error('Context error:', error);
    res.status(500).json({ error: 'Failed to get context' });
  }
});

module.exports = router;
