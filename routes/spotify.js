const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateUser } = require('../middleware/auth');
const { query } = require('../config/database');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/callback';

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

// ── Redirect user to Spotify authorization ────────────────────
router.get('/login', authenticateUser, (req, res) => {
  const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64');
  // state param has to travel as plain text in the URL. Since URL cannot contain raw JSON with characters such as {}, "< :,
  // they need heavy escaping

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
    show_dialog: 'false',
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// ── Handle Spotify OAuth callback (also exported for root /callback) ──
async function spotifyCallbackHandler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    console.error('[Spotify OAuth] Authorization error:', error);
    return res.redirect('/dashboard.html?spotify_error=' + encodeURIComponent(error));
  }

  if (!code || !state) {
    return res.redirect('/dashboard.html?spotify_error=missing_params');
  }

  let userId;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
    userId = decoded.userId;
  } catch (e) {
    console.error('[Spotify OAuth] Invalid state:', e);
    return res.redirect('/dashboard.html?spotify_error=invalid_state');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Store tokens in DB
    await query(
      `INSERT INTO spotify_tokens (user_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET access_token = $2, refresh_token = $3, expires_at = $4, updated_at = NOW()`,
      [userId, access_token, refresh_token, expiresAt]
    );

    console.log('[Spotify OAuth] Tokens stored for user:', userId);
    return res.redirect('/dashboard.html?spotify_connected=true');
  } catch (err) {
    console.error('[Spotify OAuth] Token exchange error:', err.response?.data || err.message);
    return res.redirect('/dashboard.html?spotify_error=token_exchange_failed');
  }
}

router.get('/callback', spotifyCallbackHandler);

// ── Get current user's Spotify access token ───────────────────
router.get('/token', authenticateUser, async (req, res) => {
  try {
    const result = await query(
      'SELECT access_token, refresh_token, expires_at FROM spotify_tokens WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spotify not connected', connected: false });
    }

    let { access_token, refresh_token, expires_at } = result.rows[0];

    // Refresh if expired (or expiring within 60s)
    if (new Date(expires_at) <= new Date(Date.now() + 60000)) {
      console.log('[Spotify Token] Refreshing expired token for user:', req.user.id);
      try {
        const refreshResponse = await axios.post(
          'https://accounts.spotify.com/api/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token,
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(
                `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
              ).toString('base64')}`,
            },
          }
        );

        access_token = refreshResponse.data.access_token;
        const newExpiresAt = new Date(Date.now() + refreshResponse.data.expires_in * 1000);
        const newRefreshToken = refreshResponse.data.refresh_token || refresh_token;

        await query(
          `UPDATE spotify_tokens 
           SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
           WHERE user_id = $4`,
          [access_token, newRefreshToken, newExpiresAt, req.user.id]
        );
      } catch (refreshError) {
        console.error('[Spotify Token] Refresh failed:', refreshError.response?.data || refreshError.message);
        // Delete invalid tokens
        await query('DELETE FROM spotify_tokens WHERE user_id = $1', [req.user.id]);
        return res.status(401).json({ error: 'Spotify session expired. Please reconnect.', connected: false });
      }
    }

    return res.json({ access_token, connected: true });
  } catch (error) {
    console.error('[Spotify Token] Error:', error);
    return res.status(500).json({ error: 'Failed to get Spotify token' });
  }
});

// ── Disconnect Spotify ────────────────────────────────────────
router.delete('/disconnect', authenticateUser, async (req, res) => {
  try {
    await query('DELETE FROM spotify_tokens WHERE user_id = $1', [req.user.id]);
    return res.json({ success: true, message: 'Spotify disconnected' });
  } catch (error) {
    console.error('[Spotify Disconnect] Error:', error);
    return res.status(500).json({ error: 'Failed to disconnect Spotify' });
  }
});

module.exports = router;
module.exports.spotifyCallback = spotifyCallbackHandler;
