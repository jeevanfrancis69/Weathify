import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verify: () => api.get('/auth/verify'),
};

// Recommendations API
export const recommendationsAPI = {
  getPersonalized: (location) => api.post('/recommendations/personalized', location),
  getManual: (context) => api.post('/recommendations/manual', context),
  getByMood: (mood) => api.get(`/recommendations/mood/${mood}`),
  getContext: (location) => api.post('/recommendations/context', location),
  createPlaylist: (location) => api.post('/recommendations/create-playlist', location),
};

// Admin API
export const adminAPI = {
  getSongs: (page, limit) => api.get(`/admin/songs?page=${page}&limit=${limit}`),
  addSong: (songData) => api.post('/admin/songs', songData),
  updateSong: (songId, songData) => api.put(`/admin/songs/${songId}`, songData),
  deleteSong: (songId) => api.delete(`/admin/songs/${songId}`),
  getMoodTags: () => api.get('/admin/tags/moods'),
  addMoodTag: (tagData) => api.post('/admin/tags/moods', tagData),
  deleteMoodTag: (tagId) => api.delete(`/admin/tags/moods/${tagId}`),
  getAnalytics: () => api.get('/admin/analytics'),
};

export default api;
