'use strict';

const $ = (id) => document.getElementById(id);
const show = (el) => el?.classList.remove('hidden');
const hide = (el) => el?.classList.add('hidden');
const esc = (str) => String(str || '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

class PlaylistApp {
  constructor() {
    this.user = null;
    this._checkAuth();
    this._bindEvents();
  }

  async _checkAuth() {
    try {
      const res = await fetch('/auth/me', {
      credentials: 'include'  // ← ADDED
    });

      if (!res.ok) throw new Error('Not authenticated');

      const data = await res.json();
      this.user = data.user;

      const greeting = $('userGreeting');
      if (greeting) {
        const firstName = (this.user.full_name || this.user.username).split(' ')[0];
        greeting.textContent = `Hi, ${firstName}`;
      }

      this._loadPlaylist();
    } catch {
      window.location.href = '/login.html';
    }
  }

  _bindEvents() {
    $('logoutBtn')?.addEventListener('click', async () => {
      await fetch('/auth/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  }

  async _loadPlaylist() {
  const grid = $('playlistGrid');
  const loading = $('loadingState');

  show(loading);

  try {
    // ✓ CORRECT path (matches server.js mounting)
    const res = await fetch('/api/recommendations/playlist', {
      credentials: 'include'  // ← ADDED
    });
    if (!res.ok) throw new Error('Failed to load playlist');

    const data = await res.json();
    this._renderPlaylist(data.songs || []);
  } catch (err) {
    console.error('[Playlist] Error:', err);
    grid.innerHTML = `
      <div class="empty-state">
        <p>Could not load your playlist.</p>
        <a href="/dashboard.html" class="btn btn-outline btn-sm">Back to Dashboard</a>
      </div>
    `;
  } finally {
    hide(loading);
  }
}

  _renderPlaylist(songs) {
    const grid = $('playlistGrid');

    if (songs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <p>You haven't liked any songs yet.</p>
          <a href="/dashboard.html" class="btn btn-primary btn-sm">Discover Music</a>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();
    songs.forEach(song => fragment.appendChild(this._buildSongCard(song)));
    grid.appendChild(fragment);
  }

  _buildSongCard(song) {
  const card = document.createElement('div');
  card.className = 'song-card';

  const tags = [song.weather, song.season, song.time_of_day]
    .filter(Boolean)
    .map(t => `<span class="tag-pill">${esc(t)}</span>`)
    .join('');

  card.innerHTML = `
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
        <button class="btn-remove" 
                data-song-id="${song.id}" 
                title="Remove from playlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Remove
        </button>
        <a href="${esc(song.spotify_url)}" target="_blank" rel="noopener" class="btn-play">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02z"/>
          </svg>
          Play
        </a>
      </div>
      <div class="song-card__meta">
        Saved on ${new Date(song.liked_at).toLocaleDateString()}
      </div>
    </div>`;

  // Bind remove button
  const removeBtn = card.querySelector('.btn-remove');
  removeBtn?.addEventListener('click', () => {
    this._removeSong(song.id, card);
  });

  return card;
}
  async _removeSong(songId, cardElement) {
  try {
    const res = await fetch(`/api/recommendations/unlike/${songId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Failed to remove song');

    // Animate removal
    cardElement.style.opacity = '0';
    cardElement.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
      cardElement.remove();
      
      // Check if playlist is now empty
      const grid = $('playlistGrid');
      if (!grid.querySelector('.song-card')) {
        grid.innerHTML = `
          <div class="empty-state">
            <p>You haven't liked any songs yet.</p>
            <a href="/dashboard.html" class="btn btn-primary btn-sm">Discover Music</a>
          </div>
        `;
      }
    }, 300);

    this._showToast('Removed from playlist', 'info');
  } catch (err) {
    console.error('[Remove] Error:', err);
    this._showToast('Could not remove song', 'error');
  }
}

_showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  
  const bgColors = {
    success: '#065f46',
    error: '#7f1d1d',
    info: '#1e3a8a',
  };

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    background: bgColors[type] || bgColors.info,
    color: '#f8fafc',
    padding: '0.875rem 1.5rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    zIndex: '9999',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    animation: 'slideIn 0.3s ease',
  });

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}  



}
    

const playlistApp = new PlaylistApp();
window.playlistApp = playlistApp;