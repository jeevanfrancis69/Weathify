# Weathify — Project Structure Reference
```
weathify/
│
├── config/
│   ├── database.js          # pg Pool setup, query() and transaction() helpers
│   └── passport.js          # Spotify OAuth strategy, serialize/deserialize
│
├── database/
│   ├── schema.sql           # Full DB schema: tables, indexes, triggers, seed tags
│   └── seed.sql             # Sample songs, tag assignments, analytics rows
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
│   │   ├── style.css        # Main styles — landing page + user dashboard
│   │   └── admin.css        # Admin dashboard styles
│   ├── images/
│   │   └── placeholder.svg  # Fallback album art
│   ├── js/
│   │   ├── app.js           # User-facing SPA logic
│   │   └── admin.js         # Admin dashboard SPA logic
│   ├── index.html           # Landing page + user dashboard (single file)
│   └── admin.html           # Admin panel
│
├── routes/
│   ├── auth.js              # /auth/* — Spotify OAuth, admin login/logout
│   ├── recommendations.js   # /api/recommendations — POST + search GET
│   └── admin.js             # /api/admin/* — songs, tags, stats, Spotify search
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

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/spotify` | — | Initiate Spotify OAuth |
| GET | `/auth/spotify/callback` | — | OAuth callback |
| POST | `/auth/admin/login` | — | Admin login |
| POST | `/auth/logout` | User | User logout |
| POST | `/auth/admin/logout` | Admin | Admin logout |
| GET | `/auth/me` | User | Current user info |
| GET | `/auth/admin/me` | Admin | Current admin info |
| POST | `/api/recommendations` | Optional | Get recommendations |
| GET | `/api/recommendations/search` | — | Search songs |
| GET | `/api/admin/dashboard/stats` | Admin | Analytics overview |
| GET | `/api/admin/songs` | Admin | List songs (paginated) |
| GET | `/api/admin/songs/:id` | Admin | Single song with tags |
| POST | `/api/admin/songs` | Admin | Add song from Spotify |
| PUT | `/api/admin/songs/:id` | Admin | Update song metadata |
| DELETE | `/api/admin/songs/:id` | Admin | Delete song |
| POST | `/api/admin/songs/:id/tags` | Admin | Assign tag to song |
| DELETE | `/api/admin/songs/:id/tags/:tagId` | Admin | Remove tag from song |
| GET | `/api/admin/tags` | Admin | List all tags |
| POST | `/api/admin/tags` | Admin | Create new tag |
| GET | `/api/admin/spotify/search` | Admin | Search Spotify catalogue |
| GET | `/health` | — | Health check |

## Database Schema Summary

| Table | Purpose |
|-------|---------|
| `users` | Spotify OAuth users |
| `admins` | Admin accounts (local auth) |
| `songs` | Track metadata from Spotify |
| `tags` | Predefined weather/season/time labels |
| `song_tags` | Many-to-many: songs ↔ tags with weight |
| `analytics` | Anonymised request events |
| `sessions` | Active user sessions |

## Environment Variables Quick Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_*` | Yes | PostgreSQL connection |
| `SPOTIFY_CLIENT_ID` | Yes | Spotify app ID |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app secret |
| `SPOTIFY_REDIRECT_URI` | Yes | Must match Spotify dashboard |
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