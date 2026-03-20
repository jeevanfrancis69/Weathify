# Weathify — Project Structure Reference
```
weathify/
│
├── config/
│   └── database.js          # pg Pool setup, query() and transaction() helpers
│
├── database/
│   ├── schema.sql           # Full DB schema: tables, indexes, default tags
│   ├── seed_admin.js        # Admin account seeder
│   └── seed_songs.js        # Sample songs + tag assignments from Spotify
│
├── docs/
│   ├── ALGORITHM.md         # Scoring formula, examples, SQL pattern
│   ├── DEPLOYMENT.md        # Heroku / Railway / DigitalOcean guides
│   └── STRUCTURE.md         # This file
│
├── middleware/
│   └── auth.js              # authenticateUser, authenticateAdmin,
│                            #   requireAdminRole, optionalAuth
│
├── public/                  # Static frontend (served by Express)
│   ├── css/
│   │   ├── style.css        # Base styles (landing)
│   │   ├── admin.css        # Admin dashboard styles
│   │   ├── auth.css         # Login / register pages
│   │   ├── dashboard.css    # User dashboard
│   │   └── player.css       # Player / playlist UI
│   ├── images/
│   │   └── placeholder.svg  # Fallback album art
│   ├── js/
│   │   ├── admin.js         # Admin dashboard SPA logic
│   │   ├── dashboard.js     # User dashboard logic
│   │   ├── login.js         # Login form logic
│   │   ├── player.js        # Spotify player + controls
│   │   ├── playlist.js      # Playlist page logic
│   │   └── register.js      # Registration form logic
│   ├── index.html           # Landing page
│   ├── login.html           # Login page
│   ├── register.html        # Registration page
│   ├── dashboard.html       # User dashboard
│   ├── playlist.html        # Playlist view
│   └── admin.html           # Admin panel
│
├── routes/
│   ├── auth.js              # /auth/* — user & admin auth (no Spotify)
│   ├── recommendations.js   # /api/recommendations/* — recommend, search, likes, playlist
│   ├── admin.js             # /api/admin/* — songs, tags, stats, Spotify search
│   └── spotify.js           # /api/spotify/* — Spotify OAuth + token management
│
├── services/
│   ├── analyticsService.js     # logEvent(), getDashboardStats(), ...
│   ├── recommendationService.js # getRecommendations(), searchSongs()
│   ├── spotifyService.js        # getTrack(), searchTracks(), getAccessToken()
│   └── weatherService.js        # getWeatherByCoordinates(), getSeason(), ...
│
├── .env.example             # Template — copy to .env and fill in values
├── .gitignore
├── package.json
├── README.md
├── server.js                # Express app entry point
└── setup.sh                 # Interactive DB + admin password setup script
```

## API Surface

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/login` | — | User login |
| POST | `/auth/logout` | User | User logout (clear cookie) |
| GET  | `/auth/me` | User | Current authenticated user info |
| POST | `/auth/admin/login` | — | Admin login |
| POST | `/auth/admin/logout` | Admin | Admin logout |
| GET  | `/auth/admin/me` | Admin | Current admin info |

### Spotify (user connection)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/spotify/login` | User | Initiate Spotify OAuth |
| GET | `/api/spotify/callback` | User | OAuth callback (also exposed at `/callback`) |
| GET | `/api/spotify/token` | User | Get/refresh Spotify access token |
| DELETE | `/api/spotify/disconnect` | User | Disconnect Spotify for current user |

### Recommendations & Playlist

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/recommendations` | Optional | Get recommendations (GPS or manual context) |
| GET  | `/api/recommendations/search` | — | Search songs in library |
| POST | `/api/recommendations/like` | User | Like a song for the current user |
| DELETE | `/api/recommendations/unlike/:song_id` | User | Remove song from user playlist |
| GET  | `/api/playlist` | User | Get current user's liked songs |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/dashboard/stats` | Admin | Analytics overview |
| GET | `/api/admin/songs` | Admin | List songs (paginated, searchable) |
| GET | `/api/admin/songs/:id` | Admin | Single song with tags |
| POST | `/api/admin/songs` | Admin | Add song from Spotify by track ID |
| PUT | `/api/admin/songs/:id` | Admin | Update song metadata |
| DELETE | `/api/admin/songs/:id` | Admin | Delete song |
| POST | `/api/admin/songs/:id/tags` | Admin | Assign tag to song |
| DELETE | `/api/admin/songs/:id/tags/:tagId` | Admin | Remove tag from song |
| GET | `/api/admin/tags` | Admin | List all tags |
| POST | `/api/admin/tags` | Admin | Create new tag |
| DELETE | `/api/admin/tags/:id` | Admin | Delete tag (and remove mappings) |
| GET | `/api/admin/spotify/search` | Admin | Search Spotify catalogue |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check endpoint |

## Database Schema Summary

| Table | Purpose |
|-------|---------|
| `users` | Registered users (local auth: username/email/password) |
| `admins` | Admin accounts (local auth, roles) |
| `songs` | Track metadata from Spotify |
| `tags` | Predefined weather/season/time labels |
| `song_tags` | Many-to-many: songs ↔ tags with weight |
| `liked_songs` | Per-user liked/playlist songs with context |
| `analytics` | Anonymised recommendation request events |
| `spotify_tokens` | Stored Spotify access/refresh tokens per user |
| `sessions` | Active user sessions (server-side) |

## Environment Variables Quick Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_*` | Yes | PostgreSQL connection |
| `SPOTIFY_CLIENT_ID` | Yes | Spotify app ID |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app secret |
| `SPOTIFY_REDIRECT_URI` | Yes | Must match Spotify dashboard (e.g. `http://localhost:3000/callback`) |
| `OPENWEATHER_API_KEY` | Yes | OpenWeatherMap key |
| `JWT_SECRET` | Yes | Token signing secret (64+ chars) |
| `SESSION_SECRET` | Yes | Session signing secret (64+ chars) |
| `FRONTEND_URL` | Yes | Used for CORS + redirects |
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | No | Default `3000` |
```

---

**DATABASE & DOCUMENTATION COMPLETE**

All backend files are now fully output. Here is the complete backend file list for your GitHub repository:
```
weathify/
├── .env.example
├── .gitignore
├── package.json
├── server.js
├── setup.sh
├── config/
│   ├── database.js
│   └── passport.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js
│   ├── recommendations.js
│   └── admin.js
├── services/
│   ├── analyticsService.js
│   ├── recommendationService.js
│   ├── spotifyService.js
│   └── weatherService.js
├── database/
│   ├── schema.sql
│   └── seed.sql
└── docs/
    ├── ALGORITHM.md
    ├── DEPLOYMENT.md
    └── STRUCTURE.md