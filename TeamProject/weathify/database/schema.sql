-- Weathify Database Schema

-- Create database (run this separately if needed)
-- CREATE DATABASE weathify;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    preferences JSONB DEFAULT '{}'
);

-- Mood tags (predefined: Energetic, Calm, Chill, Sad, Melancholy, Flow)
CREATE TABLE IF NOT EXISTS mood_tags (
    tag_id SERIAL PRIMARY KEY,
    tag_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weather conditions
CREATE TABLE IF NOT EXISTS weather_conditions (
    condition_id SERIAL PRIMARY KEY,
    condition_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Seasons
CREATE TABLE IF NOT EXISTS seasons (
    season_id SERIAL PRIMARY KEY,
    season_name VARCHAR(20) UNIQUE NOT NULL
);

-- Time periods (morning, afternoon, evening, night)
CREATE TABLE IF NOT EXISTS time_periods (
    period_id SERIAL PRIMARY KEY,
    period_name VARCHAR(20) UNIQUE NOT NULL,
    start_hour INTEGER,
    end_hour INTEGER
);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
    song_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    duration_ms INTEGER,
    spotify_id VARCHAR(100),
    preview_url TEXT,
    album_art_url TEXT,
    release_year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER REFERENCES users(user_id)
);

-- Song mood tags (many-to-many relationship with weights)
CREATE TABLE IF NOT EXISTS song_mood_tags (
    song_id INTEGER REFERENCES songs(song_id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES mood_tags(tag_id) ON DELETE CASCADE,
    weight DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0 for scoring
    PRIMARY KEY (song_id, tag_id)
);

-- Song weather associations
CREATE TABLE IF NOT EXISTS song_weather (
    song_id INTEGER REFERENCES songs(song_id) ON DELETE CASCADE,
    condition_id INTEGER REFERENCES weather_conditions(condition_id) ON DELETE CASCADE,
    weight DECIMAL(3,2) DEFAULT 1.0,
    PRIMARY KEY (song_id, condition_id)
);

-- Song season associations
CREATE TABLE IF NOT EXISTS song_seasons (
    song_id INTEGER REFERENCES songs(song_id) ON DELETE CASCADE,
    season_id INTEGER REFERENCES seasons(season_id) ON DELETE CASCADE,
    weight DECIMAL(3,2) DEFAULT 1.0,
    PRIMARY KEY (song_id, season_id)
);

-- Song time period associations
CREATE TABLE IF NOT EXISTS song_time_periods (
    song_id INTEGER REFERENCES songs(song_id) ON DELETE CASCADE,
    period_id INTEGER REFERENCES time_periods(period_id) ON DELETE CASCADE,
    weight DECIMAL(3,2) DEFAULT 1.0,
    PRIMARY KEY (song_id, period_id)
);

-- User listening history
CREATE TABLE IF NOT EXISTS listening_history (
    history_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(song_id) ON DELETE CASCADE,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    weather_condition VARCHAR(50),
    season VARCHAR(20),
    time_period VARCHAR(20),
    completion_percentage INTEGER DEFAULT 0
);

-- User playlists
CREATE TABLE IF NOT EXISTS playlists (
    playlist_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    weather_condition VARCHAR(50),
    season VARCHAR(20),
    time_period VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_auto_generated BOOLEAN DEFAULT FALSE
);

-- Playlist songs
CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id INTEGER REFERENCES playlists(playlist_id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(song_id) ON DELETE CASCADE,
    position INTEGER,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, song_id)
);

-- Admin roles
CREATE TABLE IF NOT EXISTS admin_roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}'
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
    admin_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES admin_roles(role_id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES admin_users(admin_id)
);

-- System analytics (anonymized)
CREATE TABLE IF NOT EXISTS usage_analytics (
    analytics_id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    weather_condition VARCHAR(50),
    season VARCHAR(20),
    time_period VARCHAR(20),
    request_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    UNIQUE(date, weather_condition, season, time_period)
);

-- Indexes for performance
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_artist ON songs(artist);
CREATE INDEX idx_listening_history_user ON listening_history(user_id);
CREATE INDEX idx_listening_history_played_at ON listening_history(played_at);
CREATE INDEX idx_playlists_user ON playlists(user_id);
CREATE INDEX idx_usage_analytics_date ON usage_analytics(date);
