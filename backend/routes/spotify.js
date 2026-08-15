const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateUser } = require('../middleware/auth');
const { query } = require('../config/database');
const { getAccessTokenUserAuth } = require('../services/spotifyService');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/callback';

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-top-read'
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
        redirect_uri: SPOTIFY_REDIRECT_URI, // matching credentials as a security check
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


// called because URI redirect is set to this
router.get('/callback', spotifyCallbackHandler);

// ── Get current user's Spotify access token ───────────────────
router.get('/token', authenticateUser, async (req,res) => {
  const userID = req.user.id;
  const access_token = await getAccessTokenUserAuth(userID);

  if (access_token === null) {
    console.log("[Spotify | Routes] Could not get user's Spotify token");
    return res.status(500).json({ error: 'Failed to get Spotify token' , connected:false});
  }

  return res.json({access_token, connected:true})
});



// Get Spotify user profile data //
router.get('/profile', authenticateUser , async (req, res) => {
  try {
    const userID = req.user.id;
    const access_token = await getAccessTokenUserAuth(userID);

    if (!access_token) {
      return res.status(403).json({error : 'Could not find Spotify token'});
    }

    const profileData = await axios.get("https://api.spotify.com/v1/me", {
      headers : {Authorization: `Bearer ${access_token}`}
    });

    const responseCode = profileData.status;
    return res.json(profileData.data);

  } catch(error) {
    const status = error.response?.status;
    switch (status) {
      case 401:
        return res.status(401).json({error : "Bad or expired token"});
      case 403:
        return res.status(403).json({error : "Bad OAuth request"});
      case 429:
        return res.status(429).json({error : "Rate limits exceeded"});
      default:
        console.error("[Spotify | Routes] Could not get user's profile :(" , error.message)
        return res.status(500).json({error: "Something went wrong fetching profile"});
    }
  }
});

// Get Spotify user top items//
router.get('/topitems', authenticateUser , async (req, res) => {
  try {
    const userID = req.user.id;
    const access_token = await getAccessTokenUserAuth(userID);

    if (!access_token) {
      return res.status(403).json({error : 'Could not find Spotify token'});
    }

    const response = await axios.get("https://api.spotify.com/v1/me/top/artists", {
      headers : {Authorization: `Bearer ${access_token}`}
    });

    const responseCode = response.status;
    return res.json(response.data);

  } catch(error) {
    const status = error.response?.status;
    switch (status) {
      case 401:
        return res.status(401).json({error : "Bad or expired token"});
      case 403:
        return res.status(403).json({error : "Bad OAuth request"});
      case 429:
        return res.status(429).json({error : "Rate limits exceeded"});
      default:
        console.error("[Spotify | Routes] Could not get user's top items :(" , error.message)
        return res.status(500).json({error: "Something went wrong fetching user's top items"});
    }
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
