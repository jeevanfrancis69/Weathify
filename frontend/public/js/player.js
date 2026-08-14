'use strict';

/**
 * Weathify Spotify Web Playback SDK Player
 * 
 * Floating island mini-player that only appears when a song is playing.
 */
class WeathifyPlayer {
  constructor() {
    this.player = null;
    this.deviceId = null;
    this.token = null;
    this.connected = false;
    this.isPlaying = false;
    this.currentTrack = null;
    this.progressInterval = null;
    this._ready = false;
    this._initPromise = null;
    this._islandRendered = false;
    this._pendingTrackId = null; // track the ID we REQUESTED

    // Circular queue state
    this._queue = [];        // array of song objects
    this._queueIndex = -1;   // current position
    this._queueSource = 'dashboard'; // 'dashboard' | 'liked'
  }

  /* ── Queue helpers ──────────────────────────────────────── */

  _loadQueue() {
    try {
      const raw  = localStorage.getItem('playerQueue');
      const idx  = localStorage.getItem('playerQueueIndex');
      const src  = localStorage.getItem('playerQueueSource') || 'dashboard';
      this._queue       = raw  ? JSON.parse(raw)  : [];
      this._queueIndex  = idx  != null ? parseInt(idx, 10) : -1;
      this._queueSource = src;
    } catch { this._queue = []; this._queueIndex = -1; }
  }

  _saveQueue() {
    localStorage.setItem('playerQueue', JSON.stringify(this._queue));
    localStorage.setItem('playerQueueIndex', String(this._queueIndex));
    localStorage.setItem('playerQueueSource', this._queueSource);
  }

  _stepQueue(direction) {
    this._loadQueue();
    if (!this._queue.length) return null;
    this._queueIndex = (this._queueIndex + direction + this._queue.length) % this._queue.length;
    this._saveQueue();
    return this._queue[this._queueIndex];
  }

  /* ── Initialise ─────────────────────────────────────────── */

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    try {
      const tokenRes = await fetch('/api/spotify/token', { credentials: 'include' });
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.connected) {
        console.log('[Player] Spotify not connected');
        this.connected = false;
        return false;
      }

      this.token = tokenData.access_token;
      this.connected = true;

      if (!window.Spotify) await this._loadSDK();
      await this._initPlayerSDK();
      return true;
    } catch (err) {
      console.error('[Player] Init failed:', err);
      this._ready = false;
      return false;
    }
  }

  _loadSDK() {
    return new Promise((resolve, reject) => {
      if (window.Spotify) return resolve();
      window.onSpotifyWebPlaybackSDKReady = () => { console.log('[Player] SDK loaded'); resolve(); };
      const s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      s.onerror = () => reject(new Error('SDK load failed'));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error('SDK load timeout')), 10000);
    });
  }

  _initPlayerSDK() {
    return new Promise((resolve, reject) => {
      this.player = new window.Spotify.Player({
        name: 'Weathify Player',
        getOAuthToken: async (cb) => {
          try {
            const r = await fetch('/api/spotify/token', { credentials: 'include' });
            const d = await r.json();
            if (d.access_token) { this.token = d.access_token; cb(d.access_token); }
          } catch { cb(this.token); }
        },
        volume: 0.5,
      });

      this.player.addListener('initialization_error', ({ message }) => {
        console.error('[Player] Init error:', message); reject(new Error(message));
      });
      this.player.addListener('authentication_error', ({ message }) => {
        console.error('[Player] Auth error:', message);
        this._ready = false;
        this._showToast('Authentication error! ', 'error' );
        reject(new Error(message));
      });

      this.player.addListener('account_error', ({ message }) => {
        console.error('[Player] Account error (Premium required):', message);
        this._ready = false;
        this._showToast('Spotify Premium is required for playback.', 'error');
        reject(new Error(message));
      });
      this.player.addListener('playback_error', ({ message }) => {
        console.error('[Player] Playback error:', message);
      });

      this.player.addListener('ready', ({ device_id }) => {
        console.log('[Player] Ready – device:', device_id);
        this.deviceId = device_id;
        this._ready = true;
        resolve();
      });

      this.player.addListener('not_ready', ({ device_id }) => {
        console.log('[Player] Device offline:', device_id);
        this._ready = false;
      });

      this.player.addListener('player_state_changed', (state) => {
        if (!state) return;
        this._onStateChanged(state);
      });

      this.player.connect().then(ok => { if (!ok) reject(new Error('Connection failed')); });
    });
  }

  /* ── Playback controls ──────────────────────────────────── */

  async play(spotifyTrackId, songMeta) {
    console.log('[Player] play() called with trackId:', spotifyTrackId, 'meta:', songMeta?.title);
    console.log(this.deviceId);
    if (!this._ready || !this.deviceId) {
      console.warn('[Player] Not ready, attempting init…');
      const ok = await this.init();
      if (!ok) {
        this._showToast('Connect Spotify to play music.', 'info');
        return false;
      }
    }

    // ── Clean the track ID ────────────────────────────────
    let cleanId = String(spotifyTrackId || '').trim();
    if (cleanId.includes('open.spotify.com/track/')) {
      cleanId = cleanId.split('track/')[1].split(/[?#]/)[0];
    }
    if (cleanId.startsWith('spotify:track:')) {
      cleanId = cleanId.replace('spotify:track:', '');
    }
    // Strip anything that isn't alphanumeric
    cleanId = cleanId.replace(/[^a-zA-Z0-9]/g, '');

    if (!cleanId) {
      console.error('[Player] Invalid track ID after cleaning:', spotifyTrackId);
      return false;
    }

    this._pendingTrackId = cleanId;
    const uri = `spotify:track:${cleanId}`;
    console.log('[Player] Sending play request → URI:', uri);

    try {
      // Immediately show island with our local metadata
      if (songMeta) {
        this.currentTrack = { ...songMeta, spotify_track_id: cleanId };
        this._showIsland(this.currentTrack);
      }

      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ uris: [uri] }),
      });

      if (res.status === 403) {
        const body = await res.text();
        console.log("[Player] 403 response body : " , body);
        this._hideIsland();
        return false;
      }
      if (!res.ok) {
        const txt = await res.text();
        console.error('[Player] Play failed:', res.status, txt);
        this._showToast('Playback failed – check console.', 'error');
        return false;
      }

      this.isPlaying = true;
      this._updateToggleBtn();
      this._syncCardButtons();
      return true;
    } catch (err) {
      console.error('[Player] Play error:', err);
      return false;
    }
  }

  async togglePlay() { if (this.player) await this.player.togglePlay(); }

  async nextTrack() {
    const song = this._stepQueue(1);
    if (song) {
      await this.play(song.spotify_track_id, {
        title: song.title,
        artist: song.artist,
        album_art_url: song.album_art_url,
        spotify_track_id: song.spotify_track_id,
      });
    } else if (this.player) {
      await this.player.nextTrack();
    }
  }

  async previousTrack() {
    const song = this._stepQueue(-1);
    if (song) {
      await this.play(song.spotify_track_id, {
        title: song.title,
        artist: song.artist,
        album_art_url: song.album_art_url,
        spotify_track_id: song.spotify_track_id,
      });
    } else if (this.player) {
      await this.player.previousTrack();
    }
  }

  async setVolume(v) {
    if (!this.player) return;
    await this.player.setVolume(v);
    const icon = document.getElementById('islandVolIcon');
    if (!icon) return;
    if (v === 0) icon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A9.02 9.02 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a10.9 10.9 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    else if (v < 0.5) icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
    else icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
  }

  async seek(ms) { if (this.player) await this.player.seek(ms); }

  /* ── State changes from SDK ─────────────────────────────── */

  _onStateChanged(state) {
    const track = state.track_window?.current_track;
    this.isPlaying = !state.paused;

    if (track) {
      console.log('[Player] State changed → playing:', track.name, 'by', track.artists?.[0]?.name, '| id:', track.id);
      if (this._pendingTrackId && track.id !== this._pendingTrackId) {
        console.warn('[Player] MISMATCH! We requested', this._pendingTrackId, 'but Spotify is playing', track.id);
      }
      this.currentTrack = {
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album?.name || '',
        album_art_url: track.album.images[0]?.url || track.album.images[1]?.url,
        duration_ms: track.duration_ms,
        spotify_track_id: track.id,
      };
      // Keep queue index in sync with what Spotify is actually playing
      this._loadQueue();
      const qi = this._queue.findIndex(s => s.spotify_track_id === track.id);
      if (qi !== -1) { this._queueIndex = qi; this._saveQueue(); }
      // Persist current track for musicdashboard
      localStorage.setItem('playerCurrentTrack', JSON.stringify(this.currentTrack));
    }

    if (this.isPlaying && this.currentTrack) {
      this._showIsland(this.currentTrack);
    } else if (!this.isPlaying) {
      this._updateToggleBtn();
    }

    this._updateProgress(state.position, state.duration);
    localStorage.setItem('playerPosition', state.position);

    // Continuous progress tick
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.isPlaying) {
      let pos = state.position;
      const dur = state.duration;
      this.progressInterval = setInterval(() => {
        pos += 250;
        if (pos > dur) { clearInterval(this.progressInterval); return; }
        this._updateProgress(pos, dur);
      }, 250);
    }

    this._syncCardButtons();
  }

  /* ── Island UI ──────────────────────────────────────────── */

  _showIsland(track) {
    if (window.location.pathname.includes('musicdashboard.html')) {
    return;
}
    let island = document.getElementById('playerIsland');

    if (!island) {
      island = document.createElement('div');
      island.id = 'playerIsland';
      island.className = 'player-island';
      island.innerHTML = `
        <input type="range" class="player-island__slider" id="islandSlider"
               min="0" max="1000" value="0" step="1">
        <div class="player-island__body">
          <img class="player-island__art" id="islandArt"
               src="/images/placeholder.svg" alt=""
               onerror="this.src='/images/placeholder.svg'">
          <div class="player-island__info" id="islandInfoLink" style="cursor:pointer;" title="Open player">
            <div class="player-island__title" id="islandTitle">—</div>
            <div class="player-island__artist" id="islandArtist">—</div>
          </div>
          <div class="player-island__controls">
            <button class="player-island__btn" id="islandPrev" title="Previous">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button class="player-island__btn player-island__btn--play" id="islandToggle" title="Play / Pause">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" id="islandToggleIcon">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <button class="player-island__btn" id="islandNext" title="Next">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>
        </div>`;
      document.body.appendChild(island);
      this._islandRendered = true;

      // Bind
      document.getElementById('islandToggle')?.addEventListener('click', () => this.togglePlay());
      document.getElementById('islandPrev')?.addEventListener('click', () => this.previousTrack());
      document.getElementById('islandNext')?.addEventListener('click', () => this.nextTrack());

      // Draggable progress slider
      const slider = document.getElementById('islandSlider');
      slider?.addEventListener('input', () => {
        const pct = slider.value / 1000;
        const ms  = Math.round(pct * (this.currentTrack?.duration_ms || 0));
        this.seek(ms);
        this._tintSlider(slider);
      });

      // Click track info → open musicdashboard
      document.getElementById('islandInfoLink')?.addEventListener('click', () => {
        window.location.href = '/musicdashboard.html';
      });
    }

    // Update content
    const art    = document.getElementById('islandArt');
    const title  = document.getElementById('islandTitle');
    const artist = document.getElementById('islandArtist');
    if (track.album_art_url && art) art.src = track.album_art_url;
    if (title) title.textContent = track.title || 'Unknown';
    if (artist) artist.textContent = track.artist || 'Unknown';
    this._updateToggleBtn();

    // Slide in
    requestAnimationFrame(() => island.classList.add('player-island--visible'));
  }

  _hideIsland() {
    const island = document.getElementById('playerIsland');
    if (island) island.classList.remove('player-island--visible');
  }

  _updateToggleBtn() {
    const icon = document.getElementById('islandToggleIcon');
    if (!icon) return;
    if (this.isPlaying) {
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
    } else {
      icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }
  }

  _updateProgress(posMs, durMs) {
    // Island slider
    const slider = document.getElementById('islandSlider');
    if (slider) {
      const pct = durMs > 0 ? posMs / durMs : 0;
      slider.value = Math.round(pct * 1000);
      this._tintSlider(slider);
    }
    if (this.currentTrack) this.currentTrack.duration_ms = durMs;

    // Dashboard elements (when on musicdashboard page)
    if (window.location.pathname.includes('musicdashboard')) {
      if (typeof dashboardUpdateProgress === 'function') {
        dashboardUpdateProgress(posMs, durMs);
      }
    }
  }

  _tintSlider(slider) {
    const pct = (slider.value / slider.max) * 100;
    slider.style.background = `linear-gradient(to right, #7c6af7 ${pct}%, #2a2a2a ${pct}%)`;
  }

  /* ── Card button sync ───────────────────────────────────── */

  _syncCardButtons() {
    const currentId = this.currentTrack?.spotify_track_id;
    document.querySelectorAll('.btn-play').forEach(btn => {
      const trackId = btn.dataset.spotifyTrackId;
      const isThis = trackId === currentId && this.isPlaying;
      btn.classList.toggle('btn-play--active', isThis);
      const txt = btn.childNodes[btn.childNodes.length - 1];
      if (txt && txt.nodeType === Node.TEXT_NODE) {
        txt.textContent = isThis ? ' Playing' : ' Play';
      }
    });
  }

  /* ── Toasts ─────────────────────────────────────────────── */

  _showToast(msg, type = 'info') {
    const t = document.createElement('div');
    const bg = { error: '#991b1b', success: '#166534', info: '#1e3a8a' }[type] || '#1e3a8a';
    Object.assign(t.style, {
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: '10000',
      background: bg, color: '#f8fafc', padding: '0.75rem 1.5rem',
      borderRadius: '10px', fontSize: '0.85rem', fontWeight: '500',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      transition: 'opacity 0.3s', opacity: '0',
    });
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 350); }, 3500);
  }

  /* ── Cleanup ────────────────────────────────────────────── */

  destroy() {
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.player) { this.player.disconnect(); this.player = null; }
  }
}

// ── Global singleton ─────────────────────────────────────────
window.weathifyPlayer = new WeathifyPlayer();

/* ── Island slider CSS injected once ───────────────────────── */
(function injectIslandSliderCSS() {
  if (document.getElementById('_islandSliderStyle')) return;
  const s = document.createElement('style');
  s.id = '_islandSliderStyle';
  s.textContent = `
    .player-island__slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 3px;
      border-radius: 999px;
      outline: none;
      cursor: pointer;
      display: block;
      background: linear-gradient(to right, #7c6af7 0%, #2a2a2a 0%);
      margin-bottom: 4px;
    }
    .player-island__slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #f0f0f0;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s, transform 0.12s;
    }
    .player-island:hover .player-island__slider::-webkit-slider-thumb {
      opacity: 1;
    }
    .player-island__slider:hover::-webkit-slider-thumb {
      transform: scale(1.3);
    }
  `;
  document.head.appendChild(s);
})();
