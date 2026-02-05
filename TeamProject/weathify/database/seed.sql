-- Seed data for Weathify

-- Insert predefined mood tags
INSERT INTO mood_tags (tag_name, description) VALUES
('Energetic', 'High-energy, upbeat songs perfect for motivation and activity'),
('Calm', 'Peaceful, relaxing songs for unwinding and meditation'),
('Chill', 'Laid-back, easy-going vibes for relaxation'),
('Sad', 'Emotional, melancholic songs for reflective moments'),
('Melancholy', 'Bittersweet, contemplative music with depth'),
('Flow', 'Smooth, continuous rhythms perfect for focus and productivity')
ON CONFLICT (tag_name) DO NOTHING;

-- Insert weather conditions
INSERT INTO weather_conditions (condition_name, description) VALUES
('Clear', 'Clear skies, sunny weather'),
('Clouds', 'Cloudy, overcast conditions'),
('Rain', 'Rainy weather, drizzle to heavy rain'),
('Drizzle', 'Light rain, misty conditions'),
('Thunderstorm', 'Stormy weather with thunder and lightning'),
('Snow', 'Snowy conditions'),
('Mist', 'Foggy, misty atmosphere'),
('Fog', 'Dense fog conditions')
ON CONFLICT (condition_name) DO NOTHING;

-- Insert seasons
INSERT INTO seasons (season_name) VALUES
('Spring'),
('Summer'),
('Autumn'),
('Winter')
ON CONFLICT (season_name) DO NOTHING;

-- Insert time periods
INSERT INTO time_periods (period_name, start_hour, end_hour) VALUES
('Morning', 5, 11),
('Afternoon', 12, 16),
('Evening', 17, 20),
('Night', 21, 4)
ON CONFLICT (period_name) DO NOTHING;

-- Insert admin roles
INSERT INTO admin_roles (role_name, permissions) VALUES
('Super Admin', '{"all": true}'),
('Content Manager', '{"manage_songs": true, "manage_tags": true}'),
('Analytics Viewer', '{"view_analytics": true}')
ON CONFLICT (role_name) DO NOTHING;

-- Sample songs (You'll add real songs through the admin panel)
INSERT INTO songs (title, artist, album, duration_ms, preview_url, album_art_url, release_year) VALUES
('Sunny Days Ahead', 'Demo Artist', 'Sample Album', 180000, NULL, NULL, 2024),
('Rainy Night Blues', 'Demo Artist', 'Sample Album', 210000, NULL, NULL, 2024),
('Winter Wonderland Chill', 'Demo Artist', 'Sample Album', 195000, NULL, NULL, 2024),
('Summer Vibes', 'Demo Artist', 'Sample Album', 200000, NULL, NULL, 2024),
('Morning Energy', 'Demo Artist', 'Sample Album', 175000, NULL, NULL, 2024),
('Evening Calm', 'Demo Artist', 'Sample Album', 220000, NULL, NULL, 2024),
('Flow State', 'Demo Artist', 'Sample Album', 240000, NULL, NULL, 2024),
('Melancholy Autumn', 'Demo Artist', 'Sample Album', 205000, NULL, NULL, 2024)
ON CONFLICT DO NOTHING;

-- Associate sample songs with mood tags
-- Song 1: Sunny Days Ahead - Energetic
INSERT INTO song_mood_tags (song_id, tag_id, weight)
SELECT 1, tag_id, 1.0 FROM mood_tags WHERE tag_name = 'Energetic';

-- Song 2: Rainy Night Blues - Sad, Melancholy
INSERT INTO song_mood_tags (song_id, tag_id, weight)
SELECT 2, tag_id, 0.9 FROM mood_tags WHERE tag_name = 'Sad'
UNION ALL
SELECT 2, tag_id, 0.8 FROM mood_tags WHERE tag_name = 'Melancholy';

-- Song 3: Winter Wonderland Chill - Chill, Calm
INSERT INTO song_mood_tags (song_id, tag_id, weight)
SELECT 3, tag_id, 1.0 FROM mood_tags WHERE tag_name = 'Chill'
UNION ALL
SELECT 3, tag_id, 0.7 FROM mood_tags WHERE tag_name = 'Calm';

-- Song 4: Summer Vibes - Energetic, Chill
INSERT INTO song_mood_tags (song_id, tag_id, weight)
SELECT 4, tag_id, 0.9 FROM mood_tags WHERE tag_name = 'Energetic'
UNION ALL
SELECT 4, tag_id, 0.6 FROM mood_tags WHERE tag_name = 'Chill';

-- Song 5: Morning Energy - Energetic, Flow
INSERT INTO song_mood_tags (song_id, tag_id, weight)
SELECT 5, tag_id, 1.0 FROM mood_tags WHERE tag_name = 'Energetic'
UNION ALL
SELECT 5, tag_id, 0.8 FROM mood_tags WHERE tag_name = 'Flow';

-- Song 6: Evening Calm - Calm, Chill
INSERT INTO song_mood_tags (song_id, tag_id, weight)
SELECT 6, tag_id, 1.0 FROM mood_tags WHERE tag_name = 'Calm'
UNION ALL
SELECT 6, tag_id, 0.9 FROM mood_tags WHERE tag_name = 'Chill';

-- Song 7: Flow State - Flow, Calm
INSERT INTO song_mood_tags (song_id, tag_id, weight)
SELECT 7, tag_id, 1.0 FROM mood_tags WHERE tag_name = 'Flow'
UNION ALL
SELECT 7, tag_id, 0.7 FROM mood_tags WHERE tag_name = 'Calm';

-- Song 8: Melancholy Autumn - Melancholy, Sad
INSERT INTO song_mood_tags (song_id, tag_id, weight)
SELECT 8, tag_id, 1.0 FROM mood_tags WHERE tag_name = 'Melancholy'
UNION ALL
SELECT 8, tag_id, 0.8 FROM mood_tags WHERE tag_name = 'Sad';

-- Associate songs with weather conditions
INSERT INTO song_weather (song_id, condition_id, weight)
SELECT 1, condition_id, 1.0 FROM weather_conditions WHERE condition_name = 'Clear'
UNION ALL
SELECT 2, condition_id, 1.0 FROM weather_conditions WHERE condition_name = 'Rain'
UNION ALL
SELECT 3, condition_id, 1.0 FROM weather_conditions WHERE condition_name = 'Snow'
UNION ALL
SELECT 4, condition_id, 1.0 FROM weather_conditions WHERE condition_name = 'Clear'
UNION ALL
SELECT 5, condition_id, 0.8 FROM weather_conditions WHERE condition_name = 'Clear'
UNION ALL
SELECT 6, condition_id, 0.9 FROM weather_conditions WHERE condition_name = 'Clouds'
UNION ALL
SELECT 7, condition_id, 0.7 FROM weather_conditions WHERE condition_name IN ('Clouds', 'Rain')
UNION ALL
SELECT 8, condition_id, 0.9 FROM weather_conditions WHERE condition_name IN ('Clouds', 'Rain');

-- Associate songs with seasons
INSERT INTO song_seasons (song_id, season_id, weight)
SELECT 1, season_id, 0.9 FROM seasons WHERE season_name = 'Spring'
UNION ALL
SELECT 2, season_id, 0.8 FROM seasons WHERE season_name IN ('Autumn', 'Winter')
UNION ALL
SELECT 3, season_id, 1.0 FROM seasons WHERE season_name = 'Winter'
UNION ALL
SELECT 4, season_id, 1.0 FROM seasons WHERE season_name = 'Summer'
UNION ALL
SELECT 5, season_id, 0.7 FROM seasons WHERE season_name IN ('Spring', 'Summer')
UNION ALL
SELECT 6, season_id, 0.8 FROM seasons WHERE season_name IN ('Autumn', 'Spring')
UNION ALL
SELECT 7, season_id, 0.6 FROM seasons WHERE season_name IN ('Spring', 'Summer', 'Autumn', 'Winter')
UNION ALL
SELECT 8, season_id, 1.0 FROM seasons WHERE season_name = 'Autumn';

-- Associate songs with time periods
INSERT INTO song_time_periods (song_id, period_id, weight)
SELECT 1, period_id, 0.9 FROM time_periods WHERE period_name IN ('Morning', 'Afternoon')
UNION ALL
SELECT 2, period_id, 1.0 FROM time_periods WHERE period_name IN ('Evening', 'Night')
UNION ALL
SELECT 3, period_id, 0.8 FROM time_periods WHERE period_name IN ('Evening', 'Night')
UNION ALL
SELECT 4, period_id, 0.9 FROM time_periods WHERE period_name IN ('Afternoon', 'Evening')
UNION ALL
SELECT 5, period_id, 1.0 FROM time_periods WHERE period_name = 'Morning'
UNION ALL
SELECT 6, period_id, 1.0 FROM time_periods WHERE period_name IN ('Evening', 'Night')
UNION ALL
SELECT 7, period_id, 0.8 FROM time_periods WHERE period_name IN ('Morning', 'Afternoon')
UNION ALL
SELECT 8, period_id, 0.9 FROM time_periods WHERE period_name IN ('Evening', 'Night');
