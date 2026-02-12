const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const { query } = require('../config/database');
require('dotenv').config();

// Spotify OAuth Strategy
passport.use(
  new SpotifyStrategy(
    {
      clientID: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      callbackURL: process.env.SPOTIFY_REDIRECT_URI,
    },
    async (accessToken, refreshToken, expires_in, profile, done) => {
      try {
        // Check if user exists
        let result = await query(
          'SELECT * FROM users WHERE spotify_id = $1',
          [profile.id]
        );

        let user;

        if (result.rows.length === 0) {
          // Create new user
          const insertResult = await query(
            `
            INSERT INTO users 
              (spotify_id, email, display_name, profile_image_url, 
               access_token, refresh_token, token_expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            `,
            [
              profile.id,
              profile.emails?.[0]?.value,
              profile.displayName,
              profile.photos?.[0]?.value,
              accessToken,
              refreshToken,
              new Date(Date.now() + expires_in * 1000),
            ]
          );
          user = insertResult.rows[0];
        } else {
          // Update existing user
          const updateResult = await query(
            `
            UPDATE users 
            SET access_token = $1,
                refresh_token = $2,
                token_expires_at = $3,
                last_login = CURRENT_TIMESTAMP
            WHERE spotify_id = $4
            RETURNING *
            `,
            [
              accessToken,
              refreshToken,
              new Date(Date.now() + expires_in * 1000),
              profile.id,
            ]
          );
          user = updateResult.rows[0];
        }

        return done(null, user);
      } catch (error) {
        console.error('Passport Spotify error:', error);
        return done(error, null);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;