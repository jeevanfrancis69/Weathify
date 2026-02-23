const { query } = require('../config/database');

class AnalyticsService {
  // Log an analytics event
  async logEvent(eventData) {
    try {
      const {
        event_type,
        weather_condition,
        season,
        time_of_day,
        location_city,
        location_country,
        metadata = {},
      } = eventData;

      await query(
        `
        INSERT INTO analytics 
          (event_type, weather_condition, season, time_of_day, 
           location_city, location_country, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          event_type,
          weather_condition,
          season,
          time_of_day,
          location_city,
          location_country,
          JSON.stringify(metadata),
        ]
      );
    } catch (error) {
      console.error('Error logging analytics event:', error);
      // Don't throw - analytics failure shouldn't break the app
    }
  }

  // Get most used weather types
  async getMostUsedWeather(limit = 10) {
    try {
      const result = await query(
        `
        SELECT 
          weather_condition,
          COUNT(*) as usage_count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM analytics
        WHERE weather_condition IS NOT NULL
        GROUP BY weather_condition
        ORDER BY usage_count DESC
        LIMIT $1
        `,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting weather analytics:', error);
      return [];
    }
  }

  // Get most used time of day
  async getMostUsedTimeOfDay(limit = 10) {
    try {
      const result = await query(
        `
        SELECT 
          time_of_day,
          COUNT(*) as usage_count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM analytics
        WHERE time_of_day IS NOT NULL
        GROUP BY time_of_day
        ORDER BY usage_count DESC
        LIMIT $1
        `,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting time of day analytics:', error);
      return [];
    }
  }

  // Get most used seasons
  async getMostUsedSeasons() {
    try {
      const result = await query(
        `
        SELECT 
          season,
          COUNT(*) as usage_count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM analytics
        WHERE season IS NOT NULL
        GROUP BY season
        ORDER BY usage_count DESC
        `
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting season analytics:', error);
      return [];
    }
  }

  // Get location distribution
  async getLocationDistribution(limit = 20) {
    try {
      const result = await query(
        `
        SELECT 
          location_city,
          location_country,
          COUNT(*) as usage_count
        FROM analytics
        WHERE location_city IS NOT NULL AND location_country IS NOT NULL
        GROUP BY location_city, location_country
        ORDER BY usage_count DESC
        LIMIT $1
        `,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting location distribution:', error);
      return [];
    }
  }

  // Get usage over time (daily)
  async getUsageOverTime(days = 30) {
    try {
      const result = await query(
        `
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as event_count
        FROM analytics
        WHERE timestamp >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
        `
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting usage over time:', error);
      return [];
    }
  }

  // Get comprehensive dashboard stats
  async getDashboardStats() {
    try {
      const [
        weatherStats,
        timeStats,
        seasonStats,
        locationStats,
        usageStats,
        totalEvents,
      ] = await Promise.all([
        this.getMostUsedWeather(5),
        this.getMostUsedTimeOfDay(4),
        this.getMostUsedSeasons(),
        this.getLocationDistribution(10),
        this.getUsageOverTime(30),
        this.getTotalEvents(),
      ]);

      return {
        weather: weatherStats,
        time_of_day: timeStats,
        seasons: seasonStats,
        locations: locationStats,
        usage_over_time: usageStats,
        total_events: totalEvents,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {};
    }
  }

  // Get total events count
  async getTotalEvents() {
    try {
      const result = await query('SELECT COUNT(*) as total FROM analytics');
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error('Error getting total events:', error);
      return 0;
    }
  }
}

module.exports = new AnalyticsService();