import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [songs, setSongs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [songsRes, analyticsRes] = await Promise.all([
        adminAPI.getSongs(1, 50),
        adminAPI.getAnalytics()
      ]);
      
      setSongs(songsRes.data.songs);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <span className="logo-icon">🌤️</span>
              <span className="logo-text">Weathify Admin</span>
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

      <div className="container admin-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading"></div>
            <p>Loading admin panel...</p>
          </div>
        ) : (
          <>
            {/* Analytics Overview */}
            {analytics && (
              <div className="analytics-grid">
                <div className="stat-card card">
                  <h3>Total Songs</h3>
                  <p className="stat-value">{analytics.overview.totalSongs}</p>
                </div>
                <div className="stat-card card">
                  <h3>Total Users</h3>
                  <p className="stat-value">{analytics.overview.totalUsers}</p>
                </div>
                <div className="stat-card card">
                  <h3>Total Playlists</h3>
                  <p className="stat-value">{analytics.overview.totalPlaylists}</p>
                </div>
              </div>
            )}

            {/* Songs Management */}
            <div className="songs-section">
              <div className="section-header">
                <h2>Manage Songs</h2>
                <button className="btn btn-primary">Add New Song</button>
              </div>

              <div className="songs-table card">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Artist</th>
                      <th>Album</th>
                      <th>Mood Tags</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map(song => (
                      <tr key={song.song_id}>
                        <td>{song.title}</td>
                        <td>{song.artist}</td>
                        <td>{song.album || 'N/A'}</td>
                        <td>
                          {song.mood_tags?.map(tag => (
                            <span key={tag.tag} className="mood-tag">
                              {tag.tag}
                            </span>
                          ))}
                        </td>
                        <td>
                          <button className="btn-icon">✏️</button>
                          <button className="btn-icon">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-note card">
              <p><strong>Note:</strong> This is a basic admin dashboard. You can expand it with forms to add/edit songs, manage tags, view detailed analytics, and more. The API endpoints are ready!</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
