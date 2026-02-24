# 🎵 Weathify — Music That Matches Your Weather

Weathify recommends songs based on your current weather conditions, time of day,
and season. Built with Node.js, PostgreSQL, and vanilla JavaScript — no frontend
framework required.

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [API Reference](#api-reference)
8. [Admin Dashboard](#admin-dashboard)
9. [Project Structure](#project-structure)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## Features

### Users
- **Spotify OAuth** — one-click login, no passwords stored
- **Automatic weather detection** via browser geolocation + OpenWeatherMap
- **Manual weather selection** if location is denied
- **Context-aware recommendations** — weather × season × time of day
- **Transparent explanations** — "These songs were selected for a rainy autumn evening"
- **Auto-refresh** every 30 minutes when weather/time changes
- **Direct Spotify links** — no illegal streaming, compliant with API ToS
- **Responsive** — works on desktop and mobile

### Admins
- Separate login (username + password, no Spotify required)
- **Overview dashboard** — weather usage, time-of-day breakdown, season stats, top locations
- **Song management** — import from Spotify, edit metadata, delete
- **Tag assignment** — assign weather / season / time-of-day tags with weights
- **Tag management** — add custom tags per category
- **Anonymised analytics** — no personal user data visible
- **Role-based access** — `admin` (full) and `read_only` roles

---

## Technology Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js 18+ | LTS, wide hosting support |
| Framework | Express.js | Minimal, well-understood |
| Database | **PostgreSQL** | Superior indexing, JSONB, window functions |
| Auth (users) | Passport.js + Spotify OAuth | No password storage |
| Auth (admin) | JWT + bcrypt | Stateless, secure |
| Music API | Spotify Web API | Track metadata + OAuth |
| Weather API | OpenWeatherMap | Free tier, reliable |
| Frontend | Vanilla JS / CSS | Zero build step, fast load |

> **Why PostgreSQL over MySQL?**
> PostgreSQL's `ARRAY_AGG`, window functions (`SUM OVER`), and `JSONB` type
> make the tag-scoring query and analytics aggregations significantly cleaner
> and more performant than equivalent MySQL queries.

---

## Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- **PostgreSQL** ≥ 13
- A [Spotify Developer App](https://developer.spotify.com/dashboard)
- An [OpenWeatherMap API key](https://openweathermap.org/api) (free tier is fine)

---

## Quick Start
```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/weathify.git
cd weathify

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Open .env and fill in all values (see Environment Variables below)

# 4. Set up database (interactive)
chmod +x setup.sh
./setup.sh

# 5. (Optional) Load sample songs
psql -U postgres -d weathify_db -f database/seed.sql

# 6. Start development server
npm run dev

# 7. Open browser
# Main site:       http://localhost:3000
# Admin dashboard: http://localhost:3000/admin.html
# Health check:    http://localhost:3000/health
# Quick run: sudo systemctl start postgresql
# npm run dev
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
| `SPOTIFY_REDIRECT_URI` | Yes | Must match Spotify Dashboard exactly |
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

# Run schema (creates all tables, indexes, default tags, default admin)
psql -U postgres -d weathify_db -f database/schema.sql

# Optional: load sample songs
psql -U postgres -d weathify_db -f database/seed.sql
```

### Via setup script (recommended)
```bash
./setup.sh
```

The script creates the database, runs the schema, and lets you change the
default admin password interactively.

### Default admin account

| Username | Password |
|----------|----------|
| `admin`  | `password` |

> ⚠️ **Change this immediately.** Use `setup.sh` or run:
> ```bash
> node -e "require('bcrypt').hash('YOUR_PASSWORD',10).then(console.log)"
> # Then paste the hash into:
> psql -U postgres -d weathify_db \
>   -c "UPDATE admins SET password_hash='\$2b\$10\$...' WHERE username='admin';"
> ```

---

## API Reference

### Authentication

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/auth/spotify` | — | Redirect to Spotify OAuth |
| `GET` | `/auth/spotify/callback` | — | OAuth callback |
| `POST` | `/auth/logout` | — | Clear user session |
| `GET` | `/auth/me` | — | Get current user |
| `POST` | `/auth/admin/login` | `{username, password}` | Admin login |
| `POST` | `/auth/admin/logout` | — | Clear admin session |
| `GET` | `/auth/admin/me` | — | Get current admin |

### Recommendations

| Method | Path | Body / Query | Description |
|--------|------|-------------|-------------|
| `POST` | `/api/recommendations` | `{latitude, longitude}` | Recommendations by GPS |
| `POST` | `/api/recommendations` | `{weather, season, time_of_day}` | Recommendations by manual context |
| `GET` | `/api/recommendations/search` | `?q=query&limit=20` | Search song library |

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

Default credentials: `admin` / `password` *(change immediately)*

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
- Delete tags *(removes from all songs)*

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
│   ├── database.js          # pg Pool + query helpers
│   └── passport.js          # Spotify OAuth strategy
├── database/
│   ├── schema.sql           # Tables, indexes, triggers, default data
│   └── seed.sql             # Sample songs + tag assignments
├── docs/
│   ├── ALGORITHM.md         # Recommendation scoring explained
│   ├── DEPLOYMENT.md        # Production deployment guide
│   └── STRUCTURE.md         # File reference
├── middleware/
│   └── auth.js              # JWT middleware for users and admins
├── public/
│   ├── css/
│   │   ├── style.css        # Main styles (landing + dashboard)
│   │   └── admin.css        # Admin dashboard styles
│   ├── images/
│   │   └── placeholder.svg  # Fallback album art
│   ├── js/
│   │   ├── app.js           # User-facing SPA
│   │   └── admin.js         # Admin dashboard SPA
│   ├── index.html           # Landing page + user dashboard
│   └── admin.html           # Admin interface
├── routes/
│   ├── auth.js              # OAuth + login/logout endpoints
│   ├── recommendations.js   # Recommendation + search endpoints
│   └── admin.js             # Admin CRUD endpoints
├── services/
│   ├── analyticsService.js  # Event logging + stats queries
│   ├── recommendationService.js # Scoring algorithm
│   ├── spotifyService.js    # Spotify API wrapper
│   └── weatherService.js    # OpenWeatherMap wrapper + time/season helpers
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
3. Load seed data: `psql -U postgres -d weathify_db -f database/seed.sql`

### Port already in use
```bash
lsof -i :3000       # find the PID
kill -9 <PID>       # kill it
```

### Admin login fails
The default password hash in `schema.sql` is for the string `password`.
If it was generated differently, reset it:
```bash
node -e "require('bcrypt').hash('admin123',10).then(console.log)"
# Copy the output hash, then:
psql -U postgres -d weathify_db \
  -c "UPDATE admins SET password_hash='\$2b\$10\$...' WHERE username='admin';"
```

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
```

---

## ✅ COMPLETE — ALL FILES OUTPUT

Here is the full file inventory for your GitHub repository:
```
weathify/                          ← root
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── server.js
├── setup.sh
│
├── config/
│   ├── database.js
│   └── passport.js
│
├── middleware/
│   └── auth.js
│
├── routes/
│   ├── auth.js
│   ├── recommendations.js
│   └── admin.js
│
├── services/
│   ├── analyticsService.js
│   ├── recommendationService.js
│   ├── spotifyService.js
│   └── weatherService.js
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── docs/
│   ├── ALGORITHM.md
│   ├── DEPLOYMENT.md
│   └── STRUCTURE.md
│
└── public/
    ├── index.html
    ├── admin.html
    ├── css/
    │   ├── style.css
    │   └── admin.css
    ├── js/
    │   ├── app.js
    │   └── admin.js
    └── images/
        └── placeholder.svg