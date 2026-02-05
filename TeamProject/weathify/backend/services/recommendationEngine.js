const pool = require('../config/database');

/**
 * WEATHIFY RECOMMENDATION ALGORITHM
 * 
 * This algorithm scores songs based on how well they match the current context:
 * - Weather condition (rain, sunny, cloudy, snow, etc.)
 * - Season (spring, summer, autumn, winter)
 * - Time of day (morning, afternoon, evening, night)
 * 
 * Each song has weighted associations with these contexts stored in the database.
 * The algorithm calculates a composite score and returns the best matches.
 */

class RecommendationEngine {
  
  /**
   * Get song recommendations based on context
   * @param {Object} context - { weather, season, timePeriod, limit }
   * @returns {Array} Recommended songs with scores
   */
  async getRecommendations(context) {
    const { weather, season, timePeriod, limit = 20 } = context;
    
    try {
      // Build the scoring query
      const query = `
        WITH song_scores AS (
          SELECT 
            s.song_id,
            s.title,
            s.artist,
            s.album,
            s.duration_ms,
            s.spotify_id,
            s.preview_url,
            s.album_art_url,
            
            -- Weather score
            COALESCE(
              (SELECT sw.weight 
               FROM song_weather sw
               JOIN weather_conditions wc ON sw.condition_id = wc.condition_id
               WHERE sw.song_id = s.song_id AND wc.condition_name = $1
               LIMIT 1), 
              0
            ) * 1.0 AS weather_score,
            
            -- Season score
            COALESCE(
              (SELECT ss.weight 
               FROM song_seasons ss
               JOIN seasons se ON ss.season_id = se.season_id
               WHERE ss.song_id = s.song_id AND se.season_name = $2
               LIMIT 1), 
              0
            ) * 0.8 AS season_score,
            
            -- Time period score
            COALESCE(
              (SELECT stp.weight 
               FROM song_time_periods stp
               JOIN time_periods tp ON stp.period_id = tp.period_id
               WHERE stp.song_id = s.song_id AND tp.period_name = $3
               LIMIT 1), 
              0
            ) * 0.9 AS time_score,
            
            -- Get mood tags as JSON array
            (SELECT json_agg(json_build_object('tag', mt.tag_name, 'weight', smt.weight))
             FROM song_mood_tags smt
             JOIN mood_tags mt ON smt.tag_id = mt.tag_id
             WHERE smt.song_id = s.song_id
            ) AS mood_tags
            
          FROM songs s
        )
        SELECT 
          song_id,
          title,
          artist,
          album,
          duration_ms,
          spotify_id,
          preview_url,
          album_art_url,
          weather_score,
          season_score,
          time_score,
          mood_tags,
          -- Calculate composite score (weighted average)
          (weather_score + season_score + time_score) / 2.7 AS total_score
        FROM song_scores
        WHERE (weather_score + season_score + time_score) > 0
        ORDER BY total_score DESC, RANDOM()
        LIMIT $4;
      `;
      
      const result = await pool.query(query, [weather, season, timePeriod, limit]);
      
      return result.rows.map(song => ({
        ...song,
        scores: {
          weather: parseFloat(song.weather_score),
          season: parseFloat(song.season_score),
          time: parseFloat(song.time_score),
          total: parseFloat(song.total_score)
        },
        moodTags: song.mood_tags || []
      }));
      
    } catch (error) {
      console.error('Recommendation engine error:', error);
      throw error;
    }
  }
  
  /**
   * Get recommendations by mood tag
   * @param {String} moodTag - Mood tag name
   * @param {Number} limit - Number of results
   */
  async getByMood(moodTag, limit = 20) {
    try {
      const query = `
        SELECT 
          s.song_id,
          s.title,
          s.artist,
          s.album,
          s.duration_ms,
          s.spotify_id,
          s.preview_url,
          s.album_art_url,
          smt.weight,
          (SELECT json_agg(json_build_object('tag', mt.tag_name, 'weight', smt2.weight))
           FROM song_mood_tags smt2
           JOIN mood_tags mt ON smt2.tag_id = mt.tag_id
           WHERE smt2.song_id = s.song_id
          ) AS mood_tags
        FROM songs s
        JOIN song_mood_tags smt ON s.song_id = smt.song_id
        JOIN mood_tags mt ON smt.tag_id = mt.tag_id
        WHERE mt.tag_name = $1
        ORDER BY smt.weight DESC, RANDOM()
        LIMIT $2;
      `;
      
      const result = await pool.query(query, [moodTag, limit]);
      return result.rows;
      
    } catch (error) {
      console.error('Get by mood error:', error);
      throw error;
    }
  }
  
  /**
   * Get context explanation for recommendations
   */
  getContextExplanation(context) {
    const { weather, season, timePeriod } = context;
    
    const weatherDescriptions = {
      'Clear': 'sunny skies',
      'Clouds': 'cloudy weather',
      'Rain': 'rainy conditions',
      'Drizzle': 'light drizzle',
      'Thunderstorm': 'thunderstorms',
      'Snow': 'snowy weather',
      'Mist': 'misty atmosphere',
      'Fog': 'foggy conditions'
    };
    
    const timeDescriptions = {
      'Morning': 'morning',
      'Afternoon': 'afternoon',
      'Evening': 'evening',
      'Night': 'night'
    };
    
    const weatherDesc = weatherDescriptions[weather] || weather.toLowerCase();
    const timeDesc = timeDescriptions[timePeriod] || timePeriod.toLowerCase();
    const seasonDesc = season.toLowerCase();
    
    return `Songs perfectly matched for a ${seasonDesc} ${timeDesc} with ${weatherDesc}`;
  }
  
  /**
   * Create auto-generated playlist for user
   */
  async createContextPlaylist(userId, context) {
    const recommendations = await this.getRecommendations(context);
    const explanation = this.getContextExplanation(context);
    
    try {
      // Create playlist
      const playlistQuery = `
        INSERT INTO playlists (user_id, name, description, weather_condition, season, time_period, is_auto_generated)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING playlist_id;
      `;
      
      const playlistName = `${context.season} ${context.timePeriod} - ${context.weather}`;
      const playlistResult = await pool.query(playlistQuery, [
        userId,
        playlistName,
        explanation,
        context.weather,
        context.season,
        context.timePeriod
      ]);
      
      const playlistId = playlistResult.rows[0].playlist_id;
      
      // Add songs to playlist
      for (let i = 0; i < recommendations.length; i++) {
        await pool.query(
          'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3)',
          [playlistId, recommendations[i].song_id, i + 1]
        );
      }
      
      return {
        playlistId,
        name: playlistName,
        description: explanation,
        songs: recommendations
      };
      
    } catch (error) {
      console.error('Create playlist error:', error);
      throw error;
    }
  }
}

module.exports = new RecommendationEngine();
