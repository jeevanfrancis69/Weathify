const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendationService');
const weatherService = require('../services/weatherService');
const analyticsService = require('../services/analyticsService');
const { optionalAuth } = require('../middleware/auth');

// Get personalized recommendations
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { latitude, longitude, weather, season, time_of_day } = req.body;

    let context = {};

    // If coordinates provided, fetch weather
    if (latitude && longitude) {
      const weatherData = await weatherService.getWeatherByCoordinates(latitude, longitude);
      const hemisphere = weatherService.getHemisphere(latitude);
      
      context = {
        weather: weatherData.condition,
        season: season || weatherService.getSeason(new Date(), hemisphere),
        time_of_day: time_of_day || weatherService.getTimeOfDay(),
      };

      // Log analytics
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
      // Manual weather selection
      context = {
        weather: weather,
        season: season || weatherService.getSeason(),
        time_of_day: time_of_day || weatherService.getTimeOfDay(),
      };

      // Log analytics
      await analyticsService.logEvent({
        event_type: 'recommendation_request',
        weather_condition: context.weather,
        season: context.season,
        time_of_day: context.time_of_day,
        metadata: { manual_selection: true, user_id: req.user?.id },
      });
    } else {
      return res.status(400).json({
        error: 'Either coordinates or weather condition is required',
      });
    }

    const recommendations = await recommendationService.getRecommendations(context);

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
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

module.exports = router;