/* ============================================================
   Weathify — Admin Dashboard JavaScript
   Handles: auth, view switching, analytics charts,
            song management, tag management,
            Spotify search, edit/delete modals.
   ============================================================ */

'use strict';

/* ── Utility helpers ───────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const show = (el) => el?.classList.remove('hidden');
const hide = (el) => el?.classList.add('hidden');
const cap  = (s)  => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ============================================================
   AdminApp Class
   ============================================================ */
class AdminApp {
  constructor() {
    this.admin       = null;
    this.allTags     = [];
    this.currentPage = 1;
    this.pageSize    = 20;
    this.searchTimer = null;
    this.editSongTags= new Set(); // tag IDs currently assigned to song being edited

    this._bindEvents();
    this._init();
  }

  /* ── Init & Auth ────────────────────────────────────────── */
  async _init() {
    const loginScreen = $('adminLoginScreen');
    const dashboard   = $('adminDashboard');

    // Try to restore existing session
    try {
      const data = await apiFetch('/auth/admin/me');
      this.admin = data.admin;
      hide(loginScreen);
      show(dashboard);
      $('adminUsernameDisplay').textContent = this.admin.username;
      this._loadOverview();
    } catch {
      show(loginScreen);
      hide(dashboard);
    }
  }

  _bindEvents() {
    /* Login form */
    $('adminLoginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._login();
    });

    /* Top-bar logout */
    $('adminLogoutBtn')?.addEventListener('click', () => this._logout());

    /* Sidebar navigation */
    document.querySelectorAll('.sidenav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this._switchView(view);
      });
    });

    /* Overview */
    $('refreshStatsBtn')?.addEventListener('click', () => this._loadOverview());

    /* Songs view */
    $('addSongBtn')?.addEventListener('click', () => this._openAddSongModal());
    $('songSearchInput')?.addEventListener('input', (e) => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.currentPage = 1;
        this._loadSongs(1, e.target.value);
      }, 350);
    });

    /* Add Song Modal */
    $('closeAddSongModal')?.addEventListener('click',  () => this._closeModal('addSongModal'));
    $('addSongModal')?.addEventListener('click', (e) => {
      if (e.target === $('addSongModal')) this._closeModal('addSongModal');
    });
    $('spotifySearchInput')?.addEventListener('input', (e) => {
      clearTimeout(this.spotifySearchTimer);
      this.spotifySearchTimer = setTimeout(() => {
        this._searchSpotify(e.target.value);
      }, 450);
    });

    /* Edit Song Modal */
    $('closeEditSongModal')?.addEventListener('click', () => this._closeModal('editSongModal'));
    $('cancelEditBtn')?.addEventListener('click',      () => this._closeModal('editSongModal'));
    $('editSongModal')?.addEventListener('click', (e) => {
      if (e.target === $('editSongModal')) this._closeModal('editSongModal');
    });
    $('editSongForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._saveEditSong();
    });

    /* Tags view */
    $('addTagBtn')?.addEventListener('click',        () => this._openAddTagModal());
    $('closeAddTagModal')?.addEventListener('click', () => this._closeModal('addTagModal'));
    $('cancelAddTagBtn')?.addEventListener('click',  () => this._closeModal('addTagModal'));
    $('addTagModal')?.addEventListener('click', (e) => {
      if (e.target === $('addTagModal')) this._closeModal('addTagModal');
    });
    $('addTagForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._createTag();
    });
  }

  /* ── Auth ───────────────────────────────────────────────── */
  async _login() {
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value;
    const errorEl  = $('loginError');
    const submitBtn= $('loginSubmitBtn');

    hide(errorEl);
    submitBtn.disabled   = true;
    submitBtn.textContent = 'Signing in…';

    try {
      const data = await apiFetch('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      this.admin = data.admin;
      hide($('adminLoginScreen'));
      show($('adminDashboard'));
      $('adminUsernameDisplay').textContent = this.admin.username;
      this._loadOverview();
    } catch (err) {
      show(errorEl);
      errorEl.textContent = err.message || 'Invalid credentials. Please try again.';
    } finally {
      submitBtn.disabled   = false;
      submitBtn.textContent = 'Sign In';
    }
  }

  async _logout() {
    try { await apiFetch('/auth/admin/logout', { method: 'POST' }); } catch { /* ignore */ }
    this.admin = null;
    show($('adminLoginScreen'));
    hide($('adminDashboard'));
  }

  /* ── View switching ─────────────────────────────────────── */
  _switchView(viewName) {
    // Update sidebar buttons
    document.querySelectorAll('.sidenav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Show/hide view panels
    ['overview', 'songs', 'tags'].forEach(name => {
      const el = $(`view-${name}`);
      if (name === viewName) {
        el.classList.remove('hidden');
        el.classList.add('active');
      } else {
        el.classList.remove('active');
        el.classList.add('hidden');
      }
    });

    // Lazy-load data on first visit
    switch (viewName) {
      case 'overview': this._loadOverview(); break;
      case 'songs':    this._loadSongs();    break;
      case 'tags':     this._loadTags();     break;
    }
  }

  /* ── Overview / Analytics ───────────────────────────────── */
  async _loadOverview() {
    try {
      const stats = await apiFetch('/api/admin/dashboard/stats');
      this._renderStats(stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  _renderStats(stats) {
    // Headline numbers
    $('statTotal').textContent      = (stats.total_events ?? 0).toLocaleString();
    $('statTopWeather').textContent = cap(stats.weather?.[0]?.weather_condition  || '—');
    $('statTopTime').textContent    = cap(stats.time_of_day?.[0]?.time_of_day    || '—');
    $('statTopSeason').textContent  = cap(stats.seasons?.[0]?.season             || '—');

    // Bar charts
    this._renderBarChart('chartWeather',
      stats.weather   || [],
      'weather_condition',
      'usage_count'
    );
    this._renderBarChart('chartTime',
      stats.time_of_day || [],
      'time_of_day',
      'usage_count'
    );
    this._renderBarChart('chartSeason',
      stats.seasons   || [],
      'season',
      'usage_count'
    );

    // Locations chart (combined city + country label)
    const locData = (stats.locations || []).map(l => ({
      label: `${l.location_city}, ${l.location_country}`,
      value: Number(l.usage_count),
    }));
    this._renderBarChartRaw('chartLocations', locData);
  }

  _renderBarChart(containerId, data, labelKey, valueKey) {
    const rows = data.map(d => ({
      label: d[labelKey],
      value: Number(d[valueKey]),
    }));
    this._renderBarChartRaw(containerId, rows);
  }

  _renderBarChartRaw(containerId, rows) {
    const container = $(containerId);
    if (!container) return;

    if (!rows || rows.length === 0) {
      container.innerHTML = '<p class="chart-empty">No data yet.</p>';
      return;
    }

    const max = Math.max(...rows.map(r => r.value), 1);
    container.innerHTML = rows.map(row => {
      const pct = Math.round((row.value / max) * 100);
      return `
        <div class="bar-row">
          <div class="bar-row__label" title="${esc(row.label)}">${esc(cap(row.label))}</div>
          <div class="bar-row__track">
            <div class="bar-row__fill" style="width:${pct}%"></div>
          </div>
          <div class="bar-row__value">${row.value.toLocaleString()}</div>
        </div>
      `;
    }).join('');
  }

  /* ── Songs ──────────────────────────────────────────────── */
  async _loadSongs(page = 1, search = '') {
    const tbody = $('songsTableBody');
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Loading…</td></tr>`;

    try {
      const data = await apiFetch(
        `/api/admin/songs?page=${page}&limit=${this.pageSize}&search=${encodeURIComponent(search)}`
      );

      this.currentPage = data.page;
      this._renderSongsTable(data.songs);
      this._renderPagination(data.page, Math.ceil(data.total / data.limit), search);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Error: ${esc(err.message)}</td></tr>`;
    }
  }

  _renderSongsTable(songs) {
    const tbody = $('songsTableBody');

    if (!songs || songs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No songs found.</td></tr>`;
      return;
    }

    tbody.innerHTML = songs.map(song => {
      const tags = (song.tags || [])
        .filter(Boolean)
        .map(t => `<span class="tag">${esc(t)}</span>`)
        .join('');

      return `
        <tr>
          <td>
            <img
              class="table-art"
              src="${esc(song.album_art_url || '/images/placeholder.svg')}"
              alt="${esc(song.title)}"
              onerror="this.src='/images/placeholder.svg'"
            >
          </td>
          <td>${esc(song.title)}</td>
          <td>${esc(song.artist)}</td>
          <td>${esc(song.album || '—')}</td>
          <td>
            <div class="table-tags">
              ${tags || '<span style="color:var(--text-400);font-size:0.8rem">No tags</span>'}
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button
                class="icon-btn"
                title="Edit / Assign Tags"
                onclick="adminApp._openEditSongModal('${esc(song.id)}')"
              >
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M11 2L14 5L5 14H2V11L11 2Z"
                        stroke="currentColor" stroke-width="1.5"
                        stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button
                class="icon-btn icon-btn--danger"
                title="Delete Song"
                onclick="adminApp._deleteSong('${esc(song.id)}', '${esc(song.title)}')"
              >
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M2 4H14M5 4V2H11V4M6 7V12M10 7V12M3 4L4 14H12L13 4"
                        stroke="currentColor" stroke-width="1.5"
                        stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  _renderPagination(current, total, search = '') {
    const container = $('songsPagination');
    if (total <= 1) { container.innerHTML = ''; return; }

    let html = '';

    // Prev
    html += `<button class="page-btn" ${current <= 1 ? 'disabled' : ''}
      onclick="adminApp._loadSongs(${current - 1}, '${esc(search)}')">← Prev</button>`;

    // Page numbers (show up to 5 around current)
    const start = Math.max(1, current - 2);
    const end   = Math.min(total, current + 2);

    if (start > 1) html += `<button class="page-btn" onclick="adminApp._loadSongs(1,'${esc(search)}')">1</button>`;
    if (start > 2) html += `<span class="page-info">…</span>`;

    for (let i = start; i <= end; i++) {
      html += `<button class="page-btn ${i === current ? 'active' : ''}"
        onclick="adminApp._loadSongs(${i},'${esc(search)}')">${i}</button>`;
    }

    if (end < total - 1) html += `<span class="page-info">…</span>`;
    if (end < total)     html += `<button class="page-btn" onclick="adminApp._loadSongs(${total},'${esc(search)}')">${total}</button>`;

    // Next
    html += `<button class="page-btn" ${current >= total ? 'disabled' : ''}
      onclick="adminApp._loadSongs(${current + 1}, '${esc(search)}')">Next →</button>`;

    container.innerHTML = html;
  }

  /* ── Add Song Modal ─────────────────────────────────────── */
  _openAddSongModal() {
    $('spotifySearchInput').value = '';
    $('spotifyResults').innerHTML = '<p class="empty-hint">Start typing to search Spotify…</p>';
    this._openModal('addSongModal');
  }

  async _searchSpotify(query) {
    const container = $('spotifyResults');

    if (!query.trim()) {
      container.innerHTML = '<p class="empty-hint">Start typing to search Spotify…</p>';
      return;
    }

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:1.5rem;color:var(--text-400)">
        <div class="spinner"></div> Searching…
      </div>`;

    try {
      const data = await apiFetch(
        `/api/admin/spotify/search?q=${encodeURIComponent(query)}&limit=10`
      );

      if (!data.tracks || data.tracks.length === 0) {
        container.innerHTML = '<p class="empty-hint">No results found.</p>';
        return;
      }

      container.innerHTML = data.tracks.map(track => `
        <div class="spotify-result-item"
             onclick="adminApp._importTrack('${esc(track.spotify_track_id)}', this)">
          <img
            class="spotify-result-item__art"
            src="${esc(track.album_art_url || '/images/placeholder.svg')}"
            alt="${esc(track.title)}"
            onerror="this.src='/images/placeholder.svg'"
          >
          <div class="spotify-result-item__info">
            <div class="spotify-result-item__title">${esc(track.title)}</div>
            <div class="spotify-result-item__meta">
              ${esc(track.artist)} · ${esc(track.album || '')}
            </div>
          </div>
          <span class="spotify-result-item__add">+ Add</span>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<p class="empty-hint" style="color:var(--error)">Error: ${esc(err.message)}</p>`;
    }
  }

  async _importTrack(spotifyTrackId, rowEl) {
    const addBtn = rowEl?.querySelector('.spotify-result-item__add');
    if (addBtn) {
      addBtn.textContent = 'Adding…';
      addBtn.style.pointerEvents = 'none';
    }

    try {
      await apiFetch('/api/admin/songs', {
        method: 'POST',
        body: JSON.stringify({ spotify_track_id: spotifyTrackId }),
      });

      if (addBtn) {
        addBtn.textContent = '✓ Added';
        addBtn.style.background = 'rgba(34,197,94,0.15)';
        addBtn.style.borderColor = 'var(--success)';
        addBtn.style.color = '#86efac';
      }

      // Refresh songs table in background
      this._loadSongs(this.currentPage, $('songSearchInput')?.value || '');
    } catch (err) {
      if (addBtn) {
        addBtn.textContent = err.message === 'Song already exists' ? '✓ Exists' : '✗ Error';
        addBtn.style.pointerEvents = 'none';
      }
    }
  }

  /* ── Edit Song Model ────────────────────────────────────── */
  async _openEditSongModal(songId) {
    try {
      // Load song details
      const song = await apiFetch(`/api/admin/songs/${songId}`);

      // Load all tags (if not already loaded)
      if (this.allTags.length === 0) {
        const tagData = await apiFetch('/api/admin/tags');
        this.allTags = tagData.tags || [];
      }

      // Populate form fields
      $('editSongId').value     = song.id;
      $('editSongTitle').value  = song.title;
      $('editSongArtist').value = song.artist;
      $('editSongAlbum').value  = song.album || '';

      // Build set of currently-assigned tag IDs
      this.editSongTags = new Set(
        (song.tags || []).filter(Boolean).map(t => t.tag_id)
      );

      // Build tag assignment UI
      this._buildTagAssignmentUI(this.allTags);

      this._openModal('editSongModal');
    } catch (err) {
      alert(`Could not load song: ${err.message}`);
    }
  }

  _buildTagAssignmentUI(tags) {
    const grid = $('tagAssignmentGrid');

    const groups = {
      weather:    { label: 'Weather',     tags: [] },
      season:     { label: 'Season',      tags: [] },
      time_of_day:{ label: 'Time of Day', tags: [] },
    };

    tags.forEach(tag => {
      if (groups[tag.category]) {
        groups[tag.category].tags.push(tag);
      }
    });

    grid.innerHTML = Object.entries(groups).map(([, group]) => `
      <div class="tag-assignment-group">
        <div class="tag-assignment-group__label">${esc(group.label)}</div>
        <div class="tag-assignment-options">
          ${group.tags.map(tag => `
            <button
              type="button"
              class="tag-toggle ${this.editSongTags.has(tag.id) ? 'active' : ''}"
              data-tag-id="${esc(tag.id)}"
              onclick="adminApp._toggleTagAssignment('${esc(tag.id)}', this)"
            >${esc(cap(tag.name))}</button>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  _toggleTagAssignment(tagId, btn) {
    if (this.editSongTags.has(tagId)) {
      this.editSongTags.delete(tagId);
      btn.classList.remove('active');
    } else {
      this.editSongTags.add(tagId);
      btn.classList.add('active');
    }
  }

  async _saveEditSong() {
    const songId = $('editSongId').value;
    const title  = $('editSongTitle').value.trim();
    const artist = $('editSongArtist').value.trim();
    const album  = $('editSongAlbum').value.trim();

    try {
      // Update metadata
      await apiFetch(`/api/admin/songs/${songId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, artist, album }),
      });

      // Re-assign tags: remove all, then add selected
      // Get current tags for this song
      const currentSong = await apiFetch(`/api/admin/songs/${songId}`);
      const currentTagIds = new Set(
        (currentSong.tags || []).filter(Boolean).map(t => t.tag_id)
      );

      // Remove tags no longer selected
      for (const tagId of currentTagIds) {
        if (!this.editSongTags.has(tagId)) {
          await apiFetch(`/api/admin/songs/${songId}/tags/${tagId}`, {
            method: 'DELETE',
          }).catch(() => {}); // ignore if already gone
        }
      }

      // Add newly selected tags
      for (const tagId of this.editSongTags) {
        if (!currentTagIds.has(tagId)) {
          await apiFetch(`/api/admin/songs/${songId}/tags`, {
            method: 'POST',
            body: JSON.stringify({ tag_id: tagId, weight: 1.0 }),
          }).catch(() => {});
        }
      }

      this._closeModal('editSongModal');
      this._loadSongs(this.currentPage, $('songSearchInput')?.value || '');
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  }

  /* ── Delete Song ────────────────────────────────────────── */
  async _deleteSong(songId, songTitle) {
    if (!confirm(`Delete "${songTitle}"?\n\nThis cannot be undone.`)) return;

    try {
      await apiFetch(`/api/admin/songs/${songId}`, { method: 'DELETE' });
      this._loadSongs(this.currentPage, $('songSearchInput')?.value || '');
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  /* ── Tags ───────────────────────────────────────────────── */
  async _loadTags() {
    try {
      const data = await apiFetch('/api/admin/tags');
      this.allTags = data.tags || [];
      this._renderTagClouds(this.allTags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }

  _renderTagClouds(tags) {
    const clouds = {
      weather:     $('tagCloudWeather'),
      season:      $('tagCloudSeason'),
      time_of_day: $('tagCloudTime'),
    };

    // Clear all
    Object.values(clouds).forEach(el => { if (el) el.innerHTML = ''; });

    if (!tags || tags.length === 0) {
      Object.values(clouds).forEach(el => {
        if (el) el.innerHTML = '<p style="color:var(--text-400);font-size:0.85rem">No tags.</p>';
      });
      return;
    }

    tags.forEach(tag => {
      const cloud = clouds[tag.category];
      if (!cloud) return;

      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `
        ${esc(cap(tag.name))}
        <button class="tag-chip__delete" title="Delete tag"
                onclick="adminApp._deleteTag('${esc(tag.id)}', '${esc(tag.name)}')">
          <svg viewBox="0 0 12 12" fill="none">
            <path d="M9 3L3 9M3 3L9 9"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      `;
      cloud.appendChild(chip);
    });
  }

  _openAddTagModal() {
    $('addTagForm').reset();
    this._openModal('addTagModal');
  }

  async _createTag() {
    const name        = $('newTagName').value.trim().toLowerCase();
    const category    = $('newTagCategory').value;
    const description = $('newTagDescription').value.trim();

    if (!name || !category) return;

    try {
      await apiFetch('/api/admin/tags', {
        method: 'POST',
        body: JSON.stringify({ name, category, description }),
      });

      this._closeModal('addTagModal');
      await this._loadTags();
    } catch (err) {
      alert(`Failed to create tag: ${err.message}`);
    }
  }

  async _deleteTag(tagId, tagName) {
    if (!confirm(`Delete tag "${tagName}"?\n\nThis will remove it from all songs.`)) return;

    try {
      await apiFetch(`/api/admin/tags/${tagId}`, { method: 'DELETE' });
      alert(`Tag "${tagName}" deleted successfully.`);
      this._loadTags(); // Refresh the tags list
    } catch (error) {
      alert(`Error deleting tag: ${error.message}`);
    }
  }

  /* ── Modal helpers ──────────────────────────────────────── */
  _openModal(id) {
    show($(id));
    document.body.style.overflow = 'hidden';
  }

  _closeModal(id) {
    hide($(id));
    document.body.style.overflow = '';
  }
}

/* ── Bootstrap ─────────────────────────────────────────────── */
let adminApp;
document.addEventListener('DOMContentLoaded', () => {
  adminApp = new AdminApp();
  window.adminApp = adminApp; // expose for inline onclick handlers
});