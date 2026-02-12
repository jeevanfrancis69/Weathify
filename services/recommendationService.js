const { query } = require('../config/database');

class RecommendationService {
  // Main recommendation function
  async getRecommendations(context, limit = 20) {
    const { weather, season, time_of_day } = context;

    try {
      // Get recommended songs using weighted tag scoring
      const result = await query(
        `
        SELECT 
          s.id,
          s.spotify_track_id,
          s.title,
          s.artist,
          s.album,
          s.duration_ms,
          s.preview_url,
          s.spotify_url,
          s.album_art_url,
          s.popularity,
          s.explicit,
          s.release_date,
          COALESCE(
            SUM(
              CASE 
                WHEN t.name = $1 THEN st.weight * 3.0
                WHEN t.name = $2 THEN st.weight * 2.0
                WHEN t.name = $3 THEN st.weight * 2.0
                ELSE st.weight * 1.0
              END
            ), 0
          ) as relevance_score,
          ARRAY_AGG(DISTINCT t.name) as matched_tags
        FROM songs s
        LEFT JOIN song_tags st ON s.id = st.song_id
        LEFT JOIN tags t ON st.tag_id = t.id
        GROUP BY s.id
        HAVING COALESCE(SUM(
          CASE 
            WHEN t.name = $1 THEN st.weight * 3.0
            WHEN t.name = $2 THEN st.weight * 2.0
            WHEN t.name = $3 THEN st.weight * 2.0
            ELSE st.weight * 1.0
          END
        ), 0) > 0
        ORDER BY relevance_score DESC, s.popularity DESC
        LIMIT $4
        `,
        [weather, season, time_of_day, limit * 2] // Get more for diversity filtering
      );

      // Apply diversity filtering
      const diversifiedSongs = this.applyDiversityFilter(result.rows, limit);

      return {
        songs: diversifiedSongs,
        context: {
          weather,
          season,
          time_of_day,
        },
        explanation: this.generateExplanation(weather, season, time_of_day),
      };
    } catch (error) {
      console.error('Error getting recommendations:', error);
      
      // Fallback: Return popular songs
      return this.getFallbackRecommendations(limit);
    }
  }

  // Apply diversity filter to avoid same artist repetition
  applyDiversityFilter(songs, limit) {
    const artistCount = {};
    const diversified = [];
    const maxPerArtist = 2;

    for (const song of songs) {
      const artist = song.artist;
      
      if (!artistCount[artist]) {
        artistCount[artist] = 0;
      }

      if (artistCount[artist] < maxPerArtist) {
        diversified.push(song);
        artistCount[artist]++;
      }

      if (diversified.length >= limit) {
        break;
      }
    }

    // Add randomness (shuffle last 20% of results)
    const staticCount = Math.floor(diversified.length * 0.8);
    const staticPart = diversified.slice(0, staticCount);
    const shufflePart = this.shuffleArray(diversified.slice(staticCount));

    return [...staticPart, ...shufflePart];
  }

  // Shuffle array (Fisher-Yates algorithm)
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Generate human-readable explanation
  generateExplanation(weather, season, time_of_day) {
    const weatherDescriptions = {
      sunny: 'bright and sunny',
      rainy: 'rainy',
      cloudy: 'cloudy',
      snowy: 'snowy',
      stormy: 'stormy',
      foggy: 'foggy',
    };

    const timeDescriptions = {
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night',
    };

    return `These songs were selected for a ${weatherDescriptions[weather] || weather} ${
      season
    } ${timeDescriptions[time_of_day] || time_of_day}. Perfect soundtrack for your current vibe.`;
  }

  // Fallback recommendations (popular songs)
  async getFallbackRecommendations(limit = 20) {
    try {
      const result = await query(
        `
        SELECT 
          id, spotify_track_id, title, artist, album,
          duration_ms, preview_url, spotify_url, album_art_url,
          popularity, explicit, release_date
        FROM songs
        ORDER BY popularity DESC
        LIMIT $1
        `,
        [limit]
      );

      return {
        songs: result.rows,
        context: {},
        explanation: 'Here are some popular tracks you might enjoy.',
      };
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return {
        songs: [],
        context: {},
        explanation: 'No recommendations available at the moment.',
      };
    }
  }

  // Search songs by query
  async searchSongs(searchQuery, limit = 20) {
    try {
      const result = await query(
        `
        SELECT 
          id, spotify_track_id, title, artist, album,
          duration_ms, preview_url, spotify_url, album_art_url,
          popularity, explicit, release_date
        FROM songs
        WHERE 
          title ILIKE $1 OR 
          artist ILIKE $1 OR 
          album ILIKE $1
        ORDER BY popularity DESC
        LIMIT $2
        `,
        [`%${searchQuery}%`, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error searching songs:', error);
      throw error;
    }
  }
}

module.exports = new RecommendationService();