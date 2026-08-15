const axios = require('axios');
require('dotenv').config();

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get Spotify access token (Client Credentials Flow)
  async getAccessTokenAppAuth() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${this.clientId}:${this.clientSecret}`
            ).toString('base64')}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Spotify access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  // Search for tracks by query
  async searchTracks(query, limit = 20) {
    try {
      const token = await this.getAccessTokenAppAuth();
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          q: query,
          type: 'track',
          limit: limit,
        },
      });

      return response.data.tracks.items.map(track => ({
        spotify_track_id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        duration_ms: track.duration_ms,
        preview_url: track.preview_url,
        spotify_url: track.external_urls.spotify,
        album_art_url: track.album.images[0]?.url || null,
        popularity: track.popularity,
        explicit: track.explicit,
        release_date: track.album.release_date,
      }));
    } catch (error) {
      console.error('Error searching Spotify tracks:', error.response?.data || error.message);
      throw new Error('Failed to search Spotify');
    }
  }

  // Get track by ID
  async getTrack(trackId) {
    try {
      const token = await this.getAccessTokenAppAuth();
      const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const track = response.data;
      return {
        spotify_track_id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        duration_ms: track.duration_ms,
        preview_url: track.preview_url,
        spotify_url: track.external_urls.spotify,
        album_art_url: track.album.images[0]?.url || null,
        popularity: track.popularity,
        explicit: track.explicit,
        release_date: track.album.release_date,
      };
    } catch (error) {
      console.error('Error getting Spotify track:', error.response?.data || error.message);
      throw new Error('Failed to get track from Spotify');
    }
  }

  // Get recommendations based on seed tracks
  async getRecommendations(seedTracks, limit = 20) {
    try {
      const token = await this.getAccessTokenAppAuth();
      const response = await axios.get('https://api.spotify.com/v1/recommendations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          seed_tracks: seedTracks.join(','),
          limit: limit,
        },
      });

      return response.data.tracks.map(track => ({
        spotify_track_id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        duration_ms: track.duration_ms,
        preview_url: track.preview_url,
        spotify_url: track.external_urls.spotify,
        album_art_url: track.album.images[0]?.url || null,
        popularity: track.popularity,
        explicit: track.explicit,
      }));
    } catch (error) {
      console.error('Error getting Spotify recommendations:', error.response?.data || error.message);
      throw new Error('Failed to get recommendations from Spotify');
    }
  }
}

module.exports = new SpotifyService();