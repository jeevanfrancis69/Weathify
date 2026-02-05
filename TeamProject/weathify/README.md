# 🌤️ Weathify - Music That Matches Your Weather

A full-stack music recommendation system that delivers contextual music suggestions based on weather, season, and time of day. Built with React, Node.js, Express, and PostgreSQL.

![Weathify](https://img.shields.io/badge/Status-Ready%20for%20Development-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Scoring Algorithm](#scoring-algorithm)
- [Deployment](#deployment)
- [Contributing](#contributing)

## ✨ Features

### User Features
- **Automatic Weather Detection**: Uses geolocation and OpenWeatherMap API
- **Manual Weather Input**: Option for users who don't want to share location
- **Smart Recommendations**: Tag-based scoring algorithm ranks songs by relevance
- **Context-Aware**: Considers weather, season, and time of day
- **Predefined Mood Tags**: Energetic, Calm, Chill, Sad, Melancholy, Flow
- **Beautiful UI**: Modern, responsive design with smooth animations
- **User Authentication**: Secure JWT-based auth with bcrypt password hashing

### Admin Features
- **Song Management**: Add, edit, and delete songs with metadata
- **Tag Management**: Create and manage mood, weather, season, and time tags
- **Analytics Dashboard**: View system usage and popular conditions
- **Weighted Tag System**: Assign relevance weights to song attributes
- **Role-Based Access**: Admin-only routes with permission controls

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **Framer Motion** (optional) - Animations
- **CSS3** - Modern styling with custom properties

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **OpenWeatherMap API** - Weather data

### DevOps
- **Git** - Version control
- **npm** - Package management
- **Nodemon** - Development hot-reload

## 📁 Project Structure

```
weathify/
├── backend/                 # Node.js/Express backend
│   ├── config/
│   │   └── database.js     # PostgreSQL connection
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js         # Authentication endpoints
│   │   ├── recommendations.js  # Recommendation endpoints
│   │   └── admin.js        # Admin management endpoints
│   ├── services/
│   │   ├── recommendationEngine.js  # Core scoring algorithm
│   │   └── weatherService.js        # OpenWeatherMap integration
│   ├── scripts/
│   │   └── initDatabase.js  # Database initialization
│   ├── .env.example        # Environment variables template
│   ├── package.json
│   └── server.js           # Express server entry point
│
├── frontend/                # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── PrivateRoute.js  # Protected route wrapper
│   │   ├── context/
│   │   │   └── AuthContext.js   # Global auth state
│   │   ├── pages/
│   │   │   ├── LandingPage.js   # Homepage
│   │   │   ├── Login.js         # Login page
│   │   │   ├── Register.js      # Registration page
│   │   │   ├── Dashboard.js     # User dashboard
│   │   │   └── AdminDashboard.js  # Admin panel
│   │   ├── services/
│   │   │   └── api.js          # API client
│   │   ├── App.js              # Main app component
│   │   ├── App.css             # Global styles
│   │   └── index.js            # React entry point
│   ├── .env
│   └── package.json
│
└── database/                # SQL schema and seeds
    ├── schema.sql          # Database structure
    └── seed.sql            # Initial data
```

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v13 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

### Required API Keys

1. **OpenWeatherMap API Key** (Free tier available)
   - Sign up at https://openweathermap.org/api
   - Get your API key from the dashboard

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd weathify
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## ⚙️ Configuration

### Backend Configuration

1. **Create .env file** in the `backend/` directory:

```bash
cd backend
cp .env.example .env
```

2. **Edit the .env file** with your values:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=weathify
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here

# OpenWeatherMap API
OPENWEATHER_API_KEY=your_api_key_here

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Frontend Configuration

The frontend `.env` file is already created with default values:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_NAME=Weathify
```

### Database Setup

1. **Create PostgreSQL Database**:

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE weathify;

# Exit psql
\q
```

2. **Initialize Database** (from backend directory):

```bash
npm run init-db
```

This will:
- Create all necessary tables
- Insert predefined mood tags (Energetic, Calm, Chill, Sad, Melancholy, Flow)
- Add weather conditions, seasons, and time periods
- Seed sample songs for testing

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
The backend will start on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```
The frontend will open automatically at `http://localhost:3000`

### Production Mode

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the build folder with your preferred web server
```

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user.
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword"
}
```

#### POST `/api/auth/login`
Login existing user.
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### GET `/api/auth/verify`
Verify JWT token (requires Authorization header).

### Recommendation Endpoints

#### POST `/api/recommendations/personalized`
Get recommendations based on location (requires auth).
```json
{
  "latitude": 51.5074,
  "longitude": -0.1278,
  "hemisphere": "north"
}
```

#### POST `/api/recommendations/manual`
Get recommendations with manual weather input (requires auth).
```json
{
  "weather": "Rain",
  "season": "Autumn",
  "timePeriod": "Evening"
}
```

#### GET `/api/recommendations/mood/:moodTag`
Get songs by mood tag (requires auth).

### Admin Endpoints (Require Admin Role)

#### GET `/api/admin/songs?page=1&limit=50`
Get all songs with pagination.

#### POST `/api/admin/songs`
Add new song.

#### PUT `/api/admin/songs/:songId`
Update existing song.

#### DELETE `/api/admin/songs/:songId`
Delete song.

#### GET `/api/admin/analytics`
Get system analytics.

## 🗄️ Database Schema

### Core Tables

- **users** - User accounts and authentication
- **songs** - Music catalog with metadata
- **mood_tags** - Predefined mood categories
- **weather_conditions** - Weather types (Clear, Rain, Snow, etc.)
- **seasons** - Spring, Summer, Autumn, Winter
- **time_periods** - Morning, Afternoon, Evening, Night

### Association Tables (Many-to-Many)

- **song_mood_tags** - Songs ↔ Moods (with weights)
- **song_weather** - Songs ↔ Weather (with weights)
- **song_seasons** - Songs ↔ Seasons (with weights)
- **song_time_periods** - Songs ↔ Time periods (with weights)

### Additional Tables

- **playlists** - User-created and auto-generated playlists
- **listening_history** - Track user listening patterns
- **admin_users** - Admin role assignments
- **usage_analytics** - Anonymized usage statistics

## 🧮 Scoring Algorithm

Weathify uses a **weighted tag-based scoring system**:

```
Total Score = (Weather Score × 1.0) + (Season Score × 0.8) + (Time Score × 0.9)
Normalized Score = Total Score / 2.7
```

### How It Works:

1. **Context Detection**: System determines user's weather, season, and time
2. **Tag Matching**: Queries songs with matching context tags
3. **Weight Application**: Each song-tag association has a weight (0.0 to 1.0)
4. **Score Calculation**: Composite score based on weighted matches
5. **Ranking**: Songs sorted by total score, with randomization for ties

### Example:

Song: "Rainy Day Blues"
- Weather: Rain (weight: 1.0) → Score: 1.0
- Season: Autumn (weight: 0.8) → Score: 0.64
- Time: Evening (weight: 0.9) → Score: 0.81
- **Total: 2.45 / 2.7 = 90.7% match**

## 🚢 Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Set environment variables in your platform
2. Ensure PostgreSQL addon is provisioned
3. Run database initialization
4. Deploy from Git repository

### Frontend Deployment (Vercel/Netlify)

1. Build the React app: `npm run build`
2. Deploy the `build` folder
3. Set environment variable: `REACT_APP_API_URL=your-backend-url`

### Database Migration

For production, use a PostgreSQL hosting service:
- **Heroku Postgres**
- **AWS RDS**
- **Supabase**
- **Railway**

## 👨‍🎓 For CS Students

This project is designed to be **manageable for first-year CS students**. Here's what makes it accessible:

### What You'll Learn:
- Full-stack web development
- RESTful API design
- Database design and SQL
- User authentication (JWT)
- React hooks and state management
- API integration
- Algorithm design (scoring system)

### Difficulty Breakdown:
- **Frontend**: ⭐⭐⭐ (React basics, forms, API calls)
- **Backend**: ⭐⭐⭐⭐ (Express routes, database queries)
- **Database**: ⭐⭐⭐ (SQL, relationships, indexing)
- **Algorithm**: ⭐⭐⭐⭐ (Weighted scoring logic)

### Getting Help:
- Read the code comments - they explain everything
- Start with the landing page and work your way in
- The recommendation algorithm is well-documented
- Each API endpoint has clear examples

## 🤝 Contributing

Contributions are welcome! Here are some ideas:

- Add Spotify OAuth integration
- Implement playlist sharing
- Add more sophisticated mood analysis
- Create mobile app (React Native)
- Add song preview playback
- Implement collaborative filtering
- Add weather-based notifications

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- OpenWeatherMap for weather data API
- The React and Node.js communities
- All CS students learning web development

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ for music lovers and weather enthusiasts
