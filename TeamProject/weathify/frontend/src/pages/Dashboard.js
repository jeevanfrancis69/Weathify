import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { recommendationsAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [context, setContext] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  
  // Manual input state
  const [weather, setWeather] = useState('Clear');
  const [season, setSeason] = useState('Summer');
  const [timePeriod, setTimePeriod] = useState('Afternoon');

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchRecommendations(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Location error:', error);
          setManualMode(true);
          setLoading(false);
        }
      );
    } else {
      setManualMode(true);
    }
  };

  const fetchRecommendations = async (lat, lon) => {
    setLoading(true);
    setError('');

    try {
      const response = await recommendationsAPI.getPersonalized({
        latitude: lat,
        longitude: lon,
        hemisphere: 'north'
      });

      setContext(response.data.context);
      setRecommendations(response.data.recommendations);
    } catch (err) {
      setError('Failed to fetch recommendations. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManualRecommendations = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await recommendationsAPI.getManual({
        weather,
        season,
        timePeriod
      });

      setContext({ weather, season, timePeriod: timePeriod });
      setRecommendations(response.data.recommendations);
    } catch (err) {
      setError('Failed to fetch recommendations. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherEmoji = (weatherType) => {
    const emojis = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Fog': '🌫️'
    };
    return emojis[weatherType] || '🌤️';
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <span className="logo-icon">🌤️</span>
              <span className="logo-text">Weathify</span>
            </div>
            <div className="user-menu">
              <span className="user-name">👋 {user?.username}</span>
              <button onClick={logout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container dashboard-content">
        {/* Context Display */}
        {context && !manualMode && (
          <div className="context-card card fade-in-up">
            <div className="context-header">
              <div className="weather-display">
                <span className="weather-emoji">{getWeatherEmoji(context.weather)}</span>
                <div>
                  <h3>Your Current Vibe</h3>
                  <p className="context-location">
                    {context.weatherDetails?.city && `${context.weatherDetails.city}, ${context.weatherDetails.country}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setManualMode(true)} 
                className="btn btn-secondary btn-sm"
              >
                Manual Input
              </button>
            </div>
            <div className="context-details">
              <div className="context-item">
                <span className="label">Weather</span>
                <span className="value">{context.weather}</span>
              </div>
              <div className="context-item">
                <span className="label">Season</span>
                <span className="value">{context.season}</span>
              </div>
              <div className="context-item">
                <span className="label">Time</span>
                <span className="value">{context.timePeriod}</span>
              </div>
              {context.weatherDetails?.temperature && (
                <div className="context-item">
                  <span className="label">Temperature</span>
                  <span className="value">{context.weatherDetails.temperature}°C</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Input Mode */}
        {manualMode && (
          <div className="manual-input card fade-in-up">
            <h3>Manual Weather Input</h3>
            <p className="input-subtitle">Select your current conditions</p>
            
            <div className="manual-form">
              <div className="form-group">
                <label>Weather</label>
                <select value={weather} onChange={(e) => setWeather(e.target.value)}>
                  <option value="Clear">☀️ Clear/Sunny</option>
                  <option value="Clouds">☁️ Cloudy</option>
                  <option value="Rain">🌧️ Rainy</option>
                  <option value="Drizzle">🌦️ Drizzle</option>
                  <option value="Thunderstorm">⛈️ Thunderstorm</option>
                  <option value="Snow">❄️ Snowy</option>
                  <option value="Mist">🌫️ Misty/Foggy</option>
                </select>
              </div>

              <div className="form-group">
                <label>Season</label>
                <select value={season} onChange={(e) => setSeason(e.target.value)}>
                  <option value="Spring">🌸 Spring</option>
                  <option value="Summer">☀️ Summer</option>
                  <option value="Autumn">🍂 Autumn</option>
                  <option value="Winter">❄️ Winter</option>
                </select>
              </div>

              <div className="form-group">
                <label>Time of Day</label>
                <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)}>
                  <option value="Morning">🌅 Morning</option>
                  <option value="Afternoon">☀️ Afternoon</option>
                  <option value="Evening">🌆 Evening</option>
                  <option value="Night">🌙 Night</option>
                </select>
              </div>

              <button 
                onClick={fetchManualRecommendations} 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? <span className="loading"></span> : 'Get Recommendations'}
              </button>
              
              {!context && (
                <button 
                  onClick={() => { setManualMode(false); requestLocation(); }} 
                  className="btn btn-secondary"
                >
                  Use My Location Instead
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="loading"></div>
            <p>Finding your perfect soundtrack...</p>
          </div>
        )}

        {/* Recommendations */}
        {!loading && recommendations.length > 0 && (
          <div className="recommendations-section">
            <h2 className="section-title">
              Your Personalized Playlist
              <span className="song-count">{recommendations.length} songs</span>
            </h2>
            
            <div className="songs-list">
              {recommendations.map((song, index) => (
                <div key={song.song_id} className="song-card card" style={{animationDelay: `${index * 0.05}s`}}>
                  <div className="song-number">{index + 1}</div>
                  <div className="song-info">
                    <h4 className="song-title">{song.title}</h4>
                    <p className="song-artist">{song.artist}</p>
                    {song.album && <p className="song-album">{song.album}</p>}
                  </div>
                  <div className="song-metadata">
                    <div className="mood-tags">
                      {song.moodTags?.slice(0, 2).map((tag, i) => (
                        <span key={i} className="mood-tag">{tag.tag}</span>
                      ))}
                    </div>
                    <div className="match-score">
                      <span className="score-label">Match</span>
                      <span className="score-value">{Math.round(song.scores.total * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && recommendations.length === 0 && context && (
          <div className="empty-state">
            <span className="empty-icon">🎵</span>
            <h3>No songs found for this combination</h3>
            <p>Try adjusting your weather settings or check back later as we add more songs!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
