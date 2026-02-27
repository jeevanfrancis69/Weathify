'use strict';

/* ── Weather SVG icons (same as app.js) ──────────────────── */
const WEATHER_ICONS = {
  sunny: `<svg viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12 2V4M12 20V22M2 12H4M20 12H22 M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07 M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  cloudy: `<svg viewBox="0 0 24 24" fill="none">
    <path d="M6.5 19C4.01 19 2 16.99 2 14.5C2 12.24 3.61 10.36 5.75 10.04 C5.9 7.76 7.79 6 10.08 6C11.69 6 13.1 6.86 13.89 8.15 C14.36 8.05 14.85 8 15.35 8C18.49 8 21 10.51 21 13.65 C21 16.79 18.49 19 15.35 19H6.5Z"
          stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`,
  rainy: `<svg viewBox="0 0 24 24" fill="none">
    <path d="M6.5 16C4.01 16 2 13.99 2 11.5C2 9.24 3.61 7.36 5.75 7.04 C5.9 4.76 7.79 3 10.08 3C11.69 3 13.1 3.86 13.89 5.15 C14.36 5.05 14.85 5 15.35 5C18.49 5 21 7.51 21 10.65 C21 13.49 18.88 15.82 16.13 16H6.5Z"
          stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 19V21M12 19V21M16 19V21M10 21.5V22.5M14 21.5V22.5"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  snowy: `<svg viewBox="0 0 24 24" fill="none">
    <path d="M12 2V22M12 2L9 5M12 2L15 5M12 22L9 19M12 22L15 19"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2 12H22M2 12L5 9M2 12L5 15M22 12L19 9M22 12L19 15"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  stormy: `<svg viewBox="0 0 24 24" fill="none">
    <path d="M13 12L10 17H14L11 22"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6 16C3.79 16 2 14.21 2 12C2 9.79 3.79 8 6 8H6.27 C6.64 5.72 8.62 4 11 4C13.38 4 15.36 5.72 15.73 8H16 C18.21 8 20 9.79 20 12C20 14.21 18.21 16 16 16"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  foggy: `<svg viewBox="0 0 24 24" fill="none">
    <path d="M3 12H21M3 8H21M3 16H17"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
};

const WEATHER_EMOJI = {
  sunny:'☀️', cloudy:'☁️', rainy:'🌧️',
  snowy:'❄️', stormy:'⛈️', foggy:'🌫️',
};

/* ── Helpers ──────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const show = (el) => el?.classList.remove('hidden');
const hide = (el) => el?.classList.add('hidden');
const esc = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
};

/* ── App ──────────────────────────────────────────────────── */
class DashboardApp {
  constructor() {
    this.user    = null;
    this.context = null;
    this.likedSongIds = new Set();

    this._checkAuth();
    this._bindEvents();
    this._initPlayer();
  }

  async _initPlayer() {
    // Check for Spotify connection callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify_connected') === 'true') {
      this._showToast('Spotify connected! You can now play music directly.', 'success');
      // Clean URL
      window.history.replaceState({}, '', '/dashboard.html');
    } else if (params.get('spotify_error')) {
      this._showToast(`Spotify connection failed: ${params.get('spotify_error')}`, 'error');
      window.history.replaceState({}, '', '/dashboard.html');
    }

    // Initialize the Web Playback SDK player
    if (window.weathifyPlayer) {
      await window.weathifyPlayer.init();
    }
  }

  async _checkAuth() {
  try {
    console.log('[Auth] Starting auth check...');
    console.log('[Auth] Document.cookie:', document.cookie || '(empty - httpOnly cookies are invisible to JS but still sent)');
    console.log('[Auth] Current URL:', window.location.href);
    
    const res = await fetch('/auth/me', {
      credentials: 'include'
    });
    
    console.log('[Auth] /auth/me response status:', res.status);
    
    // Clone response so we can read body for debug AND parse
    const resClone = res.clone();
    const rawText = await resClone.text();
    console.log('[Auth] /auth/me raw response:', rawText.substring(0, 300));
    
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errorData = JSON.parse(rawText);
        errorMsg = `${res.status} - ${errorData.error}`;
      } catch(e) { errorMsg += ` (non-JSON: ${rawText.substring(0, 100)})`; }
      throw new Error(`Auth failed: ${errorMsg}`);
    }

    const data = JSON.parse(rawText);
    console.log('[Auth] ✓ User authenticated:', data.user.username);

    this.user = data.user;

    const greeting = $('userGreeting');
    if (greeting) {
      const firstName = (this.user.full_name || this.user.username).split(' ')[0];
      greeting.textContent = `Hi, ${firstName} 👋`;
    }

    document.title = 'Weathify – Your Soundtrack';

    await this._loadLikedSongs();
    this._requestLocation();
    this._startRefreshTimer();

  } catch (err) {
    console.error('[Auth] ✗ Not authenticated:', err.message);
    window.location.href = '/login.html';
  }
}

  async _loadLikedSongs() {
  try {
    const res = await fetch('/api/recommendations/playlist', {
      credentials: 'include'  // ← ADDED
    });
    
    if (!res.ok) return;

    const data = await res.json();
    this.likedSongIds = new Set(data.songs.map(s => s.id));
    console.log('[Dashboard] Loaded', this.likedSongIds.size, 'liked songs');
  } catch (err) {
    console.error('[Dashboard] Could not load liked songs:', err);
  }
}

  _bindEvents() {
    $('logoutBtn')?.addEventListener('click', () => this._logout());
    $('manualWeatherBtn')?.addEventListener('click', () => this._openManualModal());
    $('refreshBtn')?.addEventListener('click', () => this._refresh());
    $('closeManualModal')?.addEventListener('click', () => this._closeManualModal());
    $('cancelManualBtn')?.addEventListener('click', () => this._closeManualModal());

    $('manualWeatherForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._onManualSubmit();
    });

    $('manualModal')?.addEventListener('click', (e) => {
      if (e.target === $('manualModal')) this._closeManualModal();
    });
  }

  async _logout() {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    window.location.href = '/login.html';
  }

  _requestLocation() {
    if (!('geolocation' in navigator)) {
      this._openManualModal();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => this._fetchByCoords(pos.coords.latitude, pos.coords.longitude),
      () => this._openManualModal(),
      { timeout: 8000, maximumAge: 300000 }
    );
  }

  async _fetchByCoords(lat, lon) {
  this._setLoading(true);
  
  try {
    console.log('[Dashboard] Fetching recommendations for coords:', lat, lon);
    
    const res = await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ latitude: lat, longitude: lon }),
    });

    console.log('[Dashboard] Response status:', res.status);

    // Check if response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('[Dashboard] Non-JSON response:', text.substring(0, 200));
      throw new Error('Server returned invalid response');
    }

    const data = await res.json();
    console.log('[Dashboard] Received data:', data);

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    if (!data.songs || data.songs.length === 0) {
      console.warn('[Dashboard] No songs returned');
      this._renderError('No songs found for this weather. The music library may be empty.');
      
      // Still render weather card if we have weather data
      if (data.context) {
        this._renderWeather(data.context, data.weatherData);
      }
      return;
    }

    this._renderWeather(data.context, data.weatherData);
    this._renderRecommendations(data);

  } catch (err) {
    console.error('[Dashboard] Fetch error:', err);
    this._renderError(`Could not fetch weather: ${err.message}`);
  } finally {
    this._setLoading(false);
  }
}

  async _fetchByContext(weather, season, time_of_day) {
  this._setLoading(true);
  
  try {
    console.log('[Dashboard] Fetching recommendations for context:', { weather, season, time_of_day });
    
    const res = await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ weather, season, time_of_day }),
    });

    console.log('[Dashboard] Response status:', res.status);

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('[Dashboard] Non-JSON response:', text.substring(0, 200));
      throw new Error('Server returned invalid response');
    }

    const data = await res.json();
    console.log('[Dashboard] Received data:', data);

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    if (!data.songs || data.songs.length === 0) {
      console.warn('[Dashboard] No songs returned');
      this._renderError('No songs match this weather context. The music library may need more songs.');
      
      if (data.context) {
        this._renderWeather(data.context, null);
      }
      return;
    }

    this._renderWeather(data.context, null);
    this._renderRecommendations(data);
    this.context = data.context;

  } catch (err) {
    console.error('[Dashboard] Fetch error:', err);
    this._renderError(`Could not get recommendations: ${err.message}`);
  } finally {
    this._setLoading(false);
  }
}

  _startRefreshTimer() {
    // Auto-refresh recommendations every 15 minutes
    if (this._refreshInterval) clearInterval(this._refreshInterval);
    this._refreshInterval = setInterval(() => {
      console.log('[Dashboard] Auto-refreshing recommendations...');
      this._refresh();
    }, 15 * 60 * 1000);
  }

  _refresh() {
    if (this.context) {
      this._fetchByContext(this.context.weather, this.context.season, this.context.time_of_day);
    } else {
      this._requestLocation();
    }
  }

  _renderWeather(context, weatherData) {
    if (!context) return;
    const { weather, season, time_of_day } = context;

    const iconEl   = $('weatherIconLarge');
    const condEl   = $('weatherConditionText');
    const locEl    = $('weatherLocationText');
    const tempEl   = $('weatherTempText');
    const badgesEl = $('weatherContextBadges');

    if (iconEl)  iconEl.innerHTML = WEATHER_ICONS[weather] || WEATHER_ICONS.cloudy;
    if (condEl)  condEl.textContent = `${WEATHER_EMOJI[weather] || ''} ${cap(weather)}`;
    if (locEl)   locEl.textContent = weatherData?.city
      ? `${weatherData.city}, ${weatherData.country}`
      : 'Manual selection';
    if (tempEl)  tempEl.textContent = weatherData?.temperature != null
      ? `${weatherData.temperature}°C`
      : '';

    if (badgesEl) {
      badgesEl.innerHTML = [season, time_of_day]
        .filter(Boolean)
        .map(v => `<span class="context-badge">${cap(v)}</span>`)
        .join('');
    }

    this.context = context;
  }

  _renderRecommendations(data) {
    const { songs = [], explanation = '' } = data;
    const grid  = $('songsGrid');
    const expEl = $('recExplanation');

    if (expEl) expEl.textContent = explanation;
    if (!grid) return;

    Array.from(grid.children).forEach(c => { if (c.id !== 'loadingState') c.remove(); });

    if (songs.length === 0) {
      grid.insertAdjacentHTML('beforeend', `
        <div class="empty-state">
          <p>No songs found for this context.</p>
          <button class="btn btn-outline btn-sm" onclick="dashApp._openManualModal()">
            Try different settings
          </button>
        </div>
      `);
      return;
    }

    const INITIAL_COUNT = 3;
    const fragment = document.createDocumentFragment();

    songs.forEach((song, i) => {
      const card = this._buildSongCard(song);
      if (i >= INITIAL_COUNT) card.classList.add('song-card--hidden');
      fragment.appendChild(card);
    });

    grid.appendChild(fragment);

    // Add "Show More" button if there are more than 3 songs
    if (songs.length > INITIAL_COUNT) {
      const wrapper = document.createElement('div');
      wrapper.className = 'show-more-wrapper';
      wrapper.innerHTML = `
        <button class="btn btn-outline show-more-btn" id="showMoreBtn">
          Show More (${songs.length - INITIAL_COUNT} more)
        </button>`;
      grid.after(wrapper);

      wrapper.querySelector('#showMoreBtn').addEventListener('click', () => {
        grid.querySelectorAll('.song-card--hidden').forEach(card => {
          card.classList.remove('song-card--hidden');
        });
        wrapper.remove();
      });
    }
  }

  _buildSongCard(song) {
  const a = document.createElement('div');
  a.className = 'song-card';

  const tags = (song.matched_tags || [])
    .filter(Boolean).slice(0, 3)
    .map(t => `<span class="tag-pill">${esc(t)}</span>`)
    .join('');

  // ── Check if song is already liked ─────────────────────────
  const isLiked = this.likedSongIds.has(song.id);

  a.innerHTML = `
    <img class="song-card__art"
         src="${esc(song.album_art_url || '/images/placeholder.svg')}"
         alt="${esc(song.title)}"
         loading="lazy"
         onerror="this.src='/images/placeholder.svg'">
    <div class="song-card__body">
      <div class="song-card__title">${esc(song.title)}</div>
      <div class="song-card__artist">${esc(song.artist)}</div>
      ${tags ? `<div class="song-card__tags">${tags}</div>` : ''}
      <div class="song-card__actions">
        <button class="btn-like ${isLiked ? 'liked' : ''}" 
                data-song-id="${song.id}" 
                title="${isLiked ? 'Unlike this song' : 'Like this song'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="btn-play" 
                data-spotify-track-id="${esc(song.spotify_track_id)}"
                data-song-title="${esc(song.title)}"
                data-song-artist="${esc(song.artist)}"
                data-song-art="${esc(song.album_art_url || '')}"
                title="Play on Spotify">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Play
        </button>
      </div>
    </div>`;

  const likeBtn = a.querySelector('.btn-like');
  likeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    this._likeSong(song, likeBtn);
  });

  const playBtn = a.querySelector('.btn-play');
  playBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    this._playSong(song);
  });

  return a;
}

async _likeSong(song, button) {
  const isLiked = this.likedSongIds.has(song.id);

  try {
    if (isLiked) {
      // ── Unlike (remove from playlist) ──────────────────────
      const res = await fetch(`/api/recommendations/unlike/${song.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to unlike song');

      this.likedSongIds.delete(song.id);
      button.classList.remove('liked');
      button.title = 'Like this song';
      button.querySelector('svg').setAttribute('fill', 'none');

      this._showToast('Removed from your playlist', 'info');
    } else {
      // ── Like (add to playlist) ─────────────────────────────
      const res = await fetch('/api/recommendations/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          song_id: song.id,
          weather: this.context?.weather,
          season: this.context?.season,
          time_of_day: this.context?.time_of_day,
        }),
      });

      if (!res.ok) throw new Error('Failed to like song');

      this.likedSongIds.add(song.id);
      button.classList.add('liked');
      button.title = 'Unlike this song';
      button.querySelector('svg').setAttribute('fill', 'currentColor');

      this._showToast('Song saved to your playlist!', 'success');
    }
  } catch (err) {
    console.error('[Like] Error:', err);
    this._showToast('Could not save song', 'error');
  }
}

async _playSong(song) {
  console.log('[Dashboard] _playSong called:', song.title, '→ trackId:', song.spotify_track_id);
  const player = window.weathifyPlayer;
  if (!player) {
    window.open(song.spotify_url, '_blank');
    return;
  }

  const success = await player.play(song.spotify_track_id, {
    title: song.title,
    artist: song.artist,
    album_art_url: song.album_art_url,
    spotify_track_id: song.spotify_track_id,
  });

  if (!success && song.spotify_url) {
    // Fallback: open Spotify URL if SDK fails
    window.open(song.spotify_url, '_blank');
  }
}

_showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    background: type === 'error' ? '#7f1d1d' : '#065f46',
    color: '#f8fafc',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    zIndex: '9999',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  });

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

  _renderError(msg) {
    const grid = $('songsGrid');
    if (!grid) return;
    Array.from(grid.children).forEach(c => { if (c.id !== 'loadingState') c.remove(); });
    document.querySelector('.show-more-wrapper')?.remove();
    grid.insertAdjacentHTML('beforeend', `
      <div class="empty-state">
        <p>${esc(msg)}</p>
        <button class="btn btn-outline btn-sm" onclick="dashApp._openManualModal()">
          Set weather manually
        </button>
      </div>`);
  }

  _setLoading(on) {
    const spinner = $('loadingState');
    const grid    = $('songsGrid');
    if (!spinner || !grid) return;

    if (on) {
      show(spinner);
      Array.from(grid.children).forEach(c => { if (c.id !== 'loadingState') c.remove(); });
      // Remove any leftover Show More button
      document.querySelector('.show-more-wrapper')?.remove();
    } else {
      hide(spinner);
    }
  }

  _openManualModal() {
    const modal = $('manualModal');
    if (!modal) return;

    if (this.context) {
      const sw = $('selectWeather');
      const ss = $('selectSeason');
      const st = $('selectTime');
      if (sw) sw.value = this.context.weather || '';
      if (ss) ss.value = this.context.season || '';
      if (st) st.value = this.context.time_of_day || '';
    }

    show(modal);
    document.body.style.overflow = 'hidden';
  }

  _closeManualModal() {
    const modal = $('manualModal');
    if (!modal) return;
    hide(modal);
    document.body.style.overflow = '';
  }

  _onManualSubmit() {
    const weather     = $('selectWeather')?.value;
    const season      = $('selectSeason')?.value;
    const time_of_day = $('selectTime')?.value;

    if (!weather || !season || !time_of_day) return;

    this._closeManualModal();
    this._fetchByContext(weather, season, time_of_day);
  }
}

const dashApp = new DashboardApp();
window.dashApp = dashApp;