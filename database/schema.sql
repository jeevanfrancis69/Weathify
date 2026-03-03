-- Weathify Database Schema
-- PostgreSQL 12+

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

-- ============================================================================
-- SONGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spotify_track_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255),
  duration_ms INTEGER,
  preview_url VARCHAR(512),
  spotify_url VARCHAR(512),
  album_art_url VARCHAR(512),
  popularity INTEGER,
  explicit BOOLEAN DEFAULT false,
  release_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(LOWER(artist));
CREATE INDEX IF NOT EXISTS idx_songs_spotify_track_id ON songs(spotify_track_id);

-- ============================================================================
-- TAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(LOWER(name));

-- ============================================================================
-- SONG_TAGS TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS song_tags (
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  weight NUMERIC(5, 2) DEFAULT 1.0 CHECK (weight > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (song_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_song_tags_song_id ON song_tags(song_id);
CREATE INDEX IF NOT EXISTS idx_song_tags_tag_id ON song_tags(tag_id);

-- ============================================================================
-- LIKED_SONGS TABLE (User Playlists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liked_songs (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  weather VARCHAR(100),
  season VARCHAR(50),
  time_of_day VARCHAR(50),
  liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_liked_songs_user_id ON liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_song_id ON liked_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_liked_at ON liked_songs(liked_at DESC);

-- ============================================================================
-- SPOTIFY_TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS spotify_tokens (
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
);

CREATE INDEX IF NOT EXISTS idx_spotify_tokens_user_id ON spotify_tokens(user_id);

-- ============================================================================
-- ANALYTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100),
  weather_condition VARCHAR(100),
  season VARCHAR(50),
  time_of_day VARCHAR(50),
  location_city VARCHAR(255),
  location_country VARCHAR(255),
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_weather ON analytics(weather_condition);
CREATE INDEX IF NOT EXISTS idx_analytics_season ON analytics(season);

-- ============================================================================
-- ADMINS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'read_only')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- ============================================================================
-- SESSIONS TABLE (for session management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(512) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_type VARCHAR(20),
  token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default tags if they don't exist
INSERT INTO tags (name, category, description) VALUES
  ('sunny', 'weather', 'Clear and sunny weather'),
  ('rainy', 'weather', 'Rainy weather'),
  ('cloudy', 'weather', 'Cloudy weather'),
  ('snowy', 'weather', 'Snowy weather'),
  ('foggy', 'weather', 'Foggy weather'),
  ('windy', 'weather', 'Windy weather'),
  ('stormy', 'weather', 'Stormy weather'),
  ('spring', 'season', 'Spring season'),
  ('summer', 'season', 'Summer season'),
  ('autumn', 'season', 'Autumn season'),
  ('winter', 'season', 'Winter season'),
  ('morning', 'time', 'Early morning (5-9 AM)'),
  ('afternoon', 'time', 'Afternoon (12 PM-5 PM)'),
  ('evening', 'time', 'Evening (5-9 PM)'),
  ('night', 'time', 'Night (9 PM-5 AM)')
ON CONFLICT (name) DO NOTHING;
