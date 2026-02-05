# 🚀 Weathify Quick Start Guide

Get Weathify running in 5 minutes!

## Prerequisites Checklist

- [ ] Node.js installed (v16+)
- [ ] PostgreSQL installed and running
- [ ] OpenWeatherMap API key obtained
- [ ] Git installed

## Step-by-Step Setup

### 1. Database Setup (5 minutes)

```bash
# Start PostgreSQL service
# Windows: Check Services
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE weathify;
\q
```

### 2. Backend Setup (2 minutes)

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your values:
# - Set DB_PASSWORD to your PostgreSQL password
# - Set OPENWEATHER_API_KEY to your API key
# - Set JWT_SECRET to any random string
nano .env  # or use any text editor

# Initialize database (creates tables and sample data)
npm run init-db

# Start backend server
npm run dev
```

You should see:
```
✅ Connected to PostgreSQL database
🌤️  WEATHIFY API SERVER 🎵
Server running on port 5000
```

### 3. Frontend Setup (2 minutes)

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start React app
npm start
```

Your browser should open to `http://localhost:3000`

### 4. Test the Application

1. Click **"Sign Up"** on the landing page
2. Create an account with any email/username/password
3. Click **"Allow"** when asked for location (or use manual input)
4. See your personalized music recommendations!

## Common Issues

### "Cannot connect to database"
- Make sure PostgreSQL is running
- Check DB_PASSWORD in backend/.env matches your PostgreSQL password
- Verify database "weathify" exists: `psql -U postgres -l`

### "Port 5000 already in use"
- Change PORT in backend/.env to another port (e.g., 5001)
- Update REACT_APP_API_URL in frontend/.env accordingly

### "OpenWeatherMap API error"
- Verify your API key is correct in backend/.env
- Make sure your API key is activated (can take a few minutes)
- Check you haven't exceeded free tier limits (60 calls/minute)

### Frontend won't connect to backend
- Make sure both servers are running
- Check REACT_APP_API_URL in frontend/.env is correct
- Verify FRONTEND_URL in backend/.env matches your frontend port

## Default Login Credentials

For testing, you can create an admin user:

```bash
# Connect to database
psql -U postgres -d weathify

# Make your user an admin (replace 1 with your user_id)
INSERT INTO admin_users (user_id, role_id) VALUES (1, 1);

\q
```

## Next Steps

1. **Add Real Songs**: Use the admin panel to add actual songs
2. **Configure Tags**: Assign weather/season/time/mood tags to songs
3. **Test Recommendations**: Try different weather conditions
4. **Customize**: Modify the UI colors in frontend/src/App.css

## Getting Help

- Check the main README.md for detailed documentation
- Review code comments for explanations
- Open an issue on GitHub if stuck

## API Testing with Curl

Test the API without the frontend:

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Login (save the token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get recommendations (use token from login)
curl -X POST http://localhost:5000/api/recommendations/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"weather":"Rain","season":"Autumn","timePeriod":"Evening"}'
```

## Development Tips

- **Backend**: Use `npm run dev` for hot-reload with nodemon
- **Frontend**: React auto-reloads on file changes
- **Database**: Use pgAdmin or TablePlus for visual database management
- **API Testing**: Use Postman or Insomnia for easier API testing

## Deployment Checklist

When ready to deploy:

- [ ] Set NODE_ENV=production in backend
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Use production PostgreSQL database
- [ ] Set up proper CORS origins
- [ ] Add rate limiting
- [ ] Configure error logging
- [ ] Set up monitoring

---

Happy coding! 🎵🌤️
