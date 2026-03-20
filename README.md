# 🎵 Weathify — Music That Matches Your Weather

Weathify recommends songs based on your current weather conditions, time of day,
and season. Built with Node.js, PostgreSQL, and vanilla JavaScript — no frontend
framework required.

---

## Table of Contents

## License

MIT — free for personal and commercial use.

---

*Built with 🎵 by the Weathify team*
- A [Spotify Developer App](https://developer.spotify.com/dashboard)
- An [OpenWeatherMap API key](https://openweathermap.org/api) 

---

## Quick Start
```bash
# 1. Clone this repository
git clone <YOUR_REPO_URL>
cd <YOUR_CLONED_FOLDER>

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Open .env and fill in all DB_*, Spotify and OpenWeather values

# 4. Ensure PostgreSQL is running (example for Ubuntu/Debian)
sudo systemctl start postgresql

# 5. Set up database schema + default admin (interactive)
chmod +x setup.sh
./setup.sh

# 6. (Optional) Seed sample songs from Spotify
# Requires valid SPOTIFY_* credentials in .env
node database/seed_songs.js

# 7. Start development server
npm run dev

# 8. Open browser
# Main site:       http://localhost:3000
# Login page:      http://localhost:3000/login.html
# Dashboard:       http://localhost:3000/dashboard.html
# Admin dashboard: http://localhost:3000/admin.html
# Health check:    http://localhost:3000/health
```



---

## Environment Variables

Copy `.env.example` to `.env` and fill in every value.

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | No | Default `3000` |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | No | Default `5432` |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database user |
| `DB_PASSWORD` | Yes | Database password |
| `SPOTIFY_CLIENT_ID` | Yes | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | Yes | From Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | Yes | Must match Spotify Dashboard exactly (e.g. `http://localhost:3000/callback` in development) |
| `OPENWEATHER_API_KEY` | Yes | From OpenWeatherMap |
| `JWT_SECRET` | Yes | Random string ≥ 64 characters |
| `SESSION_SECRET` | Yes | Random string ≥ 64 characters |
| `FRONTEND_URL` | Yes | Used for CORS and post-OAuth redirect |
| `RATE_LIMIT_WINDOW_MS` | No | Default `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Default `100` |

### Generating secrets
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Database Setup

### Manual setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE weathify_db;"

# Run schema (creates all tables, indexes, default tags)
psql -U postgres -d weathify_db -f database/schema.sql

# Optional: create or reset default admin user
# (uses ADMIN_* env vars if set, otherwise admin / admin123)
node database/seed_admin.js --reset

# Optional: seed sample songs from Spotify
# (requires valid SPOTIFY_* credentials in .env)
node database/seed_songs.js
```

### Via setup script (recommended)
```bash
./setup.sh
```

The script creates the database, runs the schema, and lets you change the
default admin password interactively.

### Default admin account

If you use the seeder defaults, the admin account is:

| Username | Password |
|----------|----------|
| `admin`  | `admin123` |

If you ran `setup.sh` and changed the password interactively, use that value instead.

To (re)set the admin password later, run:
```bash
# Uses ADMIN_USER / ADMIN_PASS / ADMIN_EMAIL from .env if set
ADMIN_PASS="your_new_password" node database/seed_admin.js --reset
```

---

## API Reference

### Authentication

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | `{username, email, password, full_name?}` | Register a new user |
| `POST` | `/auth/login` | `{username, password}` | User login |
| `POST` | `/auth/logout` | — | Clear user session |
| `GET` | `/auth/me` | — | Get current authenticated user |
| `POST` | `/auth/admin/login` | `{username, password}` | Admin login |
| `POST` | `/auth/admin/logout` | — | Clear admin session |
| `GET` | `/auth/admin/me` | — | Get current admin |

### Spotify connection (user)

| Method | Path | Body / Query | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/spotify/login` | — | Redirect logged-in user to Spotify OAuth |
| `GET` | `/api/spotify/callback` | `?code&state` | Spotify OAuth callback (also available at `/callback`) |
| `GET` | `/api/spotify/token` | — | Get or refresh the current user's Spotify access token |
| `DELETE` | `/api/spotify/disconnect` | — | Disconnect Spotify for the current user |

### Recommendations

| Method | Path | Body / Query | Description |
|--------|------|-------------|-------------|
| `POST` | `/api/recommendations` | `{latitude, longitude}` | Recommendations by GPS |
| `POST` | `/api/recommendations` | `{weather, season, time_of_day}` | Recommendations by manual context |
| `GET` | `/api/recommendations/search` | `?q=query&limit=20` | Search song library |
| `POST` | `/api/recommendations/like` | `{song_id, weather?, season?, time_of_day?}` | Like a song for the current user |
| `DELETE` | `/api/recommendations/unlike/:song_id` | — | Remove a song from the user's playlist |
| `GET` | `/api/playlist` | — | Get the current user's liked songs (playlist) |

**Recommendation response:**
```json
{
  "songs": [
    {
      "id": "uuid",
      "spotify_track_id": "3n3Ppam7vgaVa1iaRUc9Lp",
      "title": "Riders on the Storm",
      "artist": "The Doors",
      "album": "L.A. Woman",
      "duration_ms": 428000,
      "spotify_url": "https://open.spotify.com/track/...",
      "album_art_url": "https://i.scdn.co/image/...",
      "popularity": 78,
      "matched_tags": ["rainy", "stormy", "night", "autumn"],
      "relevance_score": "7.6"
    }
  ],
  "context": {
    "weather": "rainy",
    "season": "autumn",
    "time_of_day": "evening"
  },
  "explanation": "These songs were selected for a rainy autumn evening. Perfect soundtrack for your current vibe."
}
```

### Admin (all require admin auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/dashboard/stats` | Analytics overview |
| `GET` | `/api/admin/songs` | List songs (`?page&limit&search`) |
| `GET` | `/api/admin/songs/:id` | Single song with tag details |
| `POST` | `/api/admin/songs` | Import track (`{spotify_track_id}`) |
| `PUT` | `/api/admin/songs/:id` | Update metadata |
| `DELETE` | `/api/admin/songs/:id` | Delete song |
| `POST` | `/api/admin/songs/:id/tags` | Assign tag (`{tag_id, weight}`) |
| `DELETE` | `/api/admin/songs/:id/tags/:tagId` | Remove tag |
| `GET` | `/api/admin/tags` | List all tags |
| `POST` | `/api/admin/tags` | Create tag (`{name, category, description}`) |
| `GET` | `/api/admin/spotify/search` | Search Spotify (`?q&limit`) |

### Health
```
GET /health
→ { "status": "healthy", "timestamp": "...", "uptime": 123.4 }
```

---

## Admin Dashboard

### Accessing

Navigate to `http://localhost:3000/admin.html`

Default credentials (if you used the seeder defaults): `admin` / `admin123` 

### Overview tab
Displays anonymised aggregate analytics:
- Total recommendation requests
- Most-requested weather condition, time of day, season
- Bar charts for each category
- Top locations (city + country)

### Songs tab
- Search existing library
- Import new tracks by searching Spotify
- Edit title / artist / album metadata
- Assign / remove weather, season, and time-of-day tags
- Delete songs

### Tags tab
- View all tags grouped by category
- Create new custom tags
- Delete tags 

### Scoring weights

When assigning tags via the Edit modal, all tags default to weight `1.0`.
To set a custom weight, use the API directly:
```bash
curl -X POST http://localhost:3000/api/admin/songs/{id}/tags \
  -H "Content-Type: application/json" \
  -b "adminToken=YOUR_TOKEN" \
  -d '{"tag_id": "uuid", "weight": 0.7}'
```

---

## Project Structure
```
weathify/
├── config/
│   └── database.js          # pg Pool + query helpers
├── database/
│   ├── schema.sql           # Tables, indexes, default tags
│   ├── seed_admin.js        # Admin account seeder
│   └── seed_songs.js        # Sample songs + tag assignments from Spotify
├── docs/
│   ├── ALGORITHM.md         # Recommendation scoring explained
│   ├── DEPLOYMENT.md        # Production deployment guide
│   └── STRUCTURE.md         # Detailed file reference & API surface
├── middleware/
│   └── auth.js              # Auth helpers for users/admins
├── public/
│   ├── css/
│   │   ├── style.css        # Base styles (landing)
│   │   ├── admin.css        # Admin dashboard styles
│   │   ├── auth.css         # Login / register pages
│   │   ├── dashboard.css    # User dashboard
│   │   └── player.css       # Player / playlist UI
│   ├── images/
│   │   └── placeholder.svg  # Fallback album art
│   ├── js/
│   │   ├── admin.js         # Admin dashboard logic
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
│   └── admin.html           # Admin interface
├── routes/
│   ├── auth.js              # Auth endpoints (users + admins)
│   ├── recommendations.js   # Recommendation, search, likes, playlist
│   ├── admin.js             # Admin CRUD endpoints
│   └── spotify.js           # Spotify OAuth + token management
├── services/
│   ├── analyticsService.js      # Event logging + stats queries
│   ├── recommendationService.js # Scoring algorithm
│   ├── spotifyService.js        # Spotify API wrapper
│   └── weatherService.js        # OpenWeatherMap wrapper + time/season helpers
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── server.js
└── setup.sh
```

---

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for full guides covering:
- Heroku
- Railway
- DigitalOcean App Platform
- DigitalOcean Droplet (manual — Node + Nginx + PM2 + SSL)

### Quick Heroku deploy
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:mini
heroku config:set NODE_ENV=production
heroku config:set SPOTIFY_CLIENT_ID=xxx
heroku config:set SPOTIFY_CLIENT_SECRET=xxx
heroku config:set SPOTIFY_REDIRECT_URI=https://your-app-name.herokuapp.com/auth/spotify/callback
heroku config:set OPENWEATHER_API_KEY=xxx
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
heroku config:set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
heroku config:set FRONTEND_URL=https://your-app-name.herokuapp.com
git push heroku main
heroku pg:psql < database/schema.sql
```

---

## Troubleshooting

### OAuth callback error
Ensure the redirect URI in your Spotify Developer Dashboard **exactly** matches
`SPOTIFY_REDIRECT_URI` in `.env`, including protocol and trailing slash.

### Database connection refused
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Test connection manually
psql -U postgres -d weathify_db
```

### No recommendations returned
1. Check the songs table has entries: `SELECT COUNT(*) FROM songs;`
2. Check tag assignments exist: `SELECT COUNT(*) FROM song_tags;`
3. If empty, (re)seed songs with Spotify: `node database/seed_songs.js` (requires valid SPOTIFY_* env vars)

### Port already in use
```bash
lsof -i :3000       # find the PID
kill -9 <PID>       # kill it
```

### Admin login fails
If you've forgotten or misconfigured the admin password, reset it via the seeder:
```bash
ADMIN_PASS="admin123" node database/seed_admin.js --reset
```
Then log in with `admin` / `admin123` and change it immediately.

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

---

## License

MIT — free for personal and commercial use.

---

*Built with 🎵 by the Weathify team*