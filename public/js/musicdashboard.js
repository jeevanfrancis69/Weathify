function formatTime(ms) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// ── Dashboard progress updater ────────────────────────────────
// Called by both the state listener AND the tick interval so the
// dashboard slider + timestamps stay live between SDK events.
function dashboardUpdateProgress(posMs, durMs) {
    const slider = document.querySelector('.progress-slider');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal   = document.getElementById('time-total');

    if (slider) {
        const pct = durMs > 0 ? (posMs / durMs) * 100 : 0;
        slider.value = pct;
        slider.style.setProperty('--value', pct + '%');
    }
    if (timeCurrent) timeCurrent.textContent = formatTime(posMs);
    if (timeTotal)   timeTotal.textContent   = formatTime(durMs);
}

// ── Dashboard play/pause icon sync ───────────────────────────
function dashboardSyncPlayIcon(isPlaying) {
    // Support both a bare <svg> with id="play-icon" AND a wrapper button
    const icon = document.getElementById('play-icon');
    if (!icon) return;
    if (isPlaying) {
        icon.innerHTML = `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`;
    } else {
        icon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"/>`;
    }
}

// ── Tick interval handle (dashboard-local) ────────────────────
let _dashTickInterval = null;

function startDashTick(posMs, durMs) {
    stopDashTick();
    let pos = posMs;
    _dashTickInterval = setInterval(() => {
        pos += 250;
        if (pos > durMs) { stopDashTick(); return; }
        dashboardUpdateProgress(pos, durMs);
    }, 250);
}

function stopDashTick() {
    if (_dashTickInterval) { clearInterval(_dashTickInterval); _dashTickInterval = null; }
}

document.addEventListener('DOMContentLoaded', async () => {

    await window.weathifyPlayer.init();

    while (!window.weathifyPlayer._ready) {
        await new Promise(r => setTimeout(r, 100));
    }

    // Transfer playback to this device
    await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${window.weathifyPlayer.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            device_ids: [window.weathifyPlayer.deviceId],
            play: true
        })
    });

    // ── Restore UI from last known track (instant, before SDK responds) ──
    const saved = localStorage.getItem('playerCurrentTrack');
    if (saved) {
        const song = JSON.parse(saved);
        const trackTitle  = document.getElementById('track-title');
        const trackArtist = document.getElementById('track-artist');
        const cover       = document.getElementById('album-cover');

        if (trackTitle)  trackTitle.textContent  = song.title;
        if (trackArtist) trackArtist.textContent = song.artist;
        if (cover) {
            cover.style.backgroundImage    = `url(${song.album_art_url})`;
            cover.style.backgroundSize     = 'cover';
            cover.style.backgroundPosition = 'center';
        }
    }

    // ── Sync once from live SDK state ────────────────────────
    const state = await window.weathifyPlayer.player.getCurrentState();
    if (state) {
        const track = state.track_window.current_track;

        document.getElementById('track-title').textContent  = track.name;
        document.getElementById('track-artist').textContent =
            track.artists.map(a => a.name).join(', ');

        const cover = document.getElementById('album-cover');
        if (cover) {
            cover.style.backgroundImage    = `url(${track.album.images[0].url})`;
            cover.style.backgroundSize     = 'cover';
            cover.style.backgroundPosition = 'center';
        }

        dashboardUpdateProgress(state.position, state.duration);
        dashboardSyncPlayIcon(!state.paused);

        // Kick off tick if already playing
        if (!state.paused) startDashTick(state.position, state.duration);
    }

    // ── 1. Unified state listener ────────────────────────────
    if (window.weathifyPlayer?.player) {
        window.weathifyPlayer.player.addListener('player_state_changed', (state) => {
            if (!state) return;

            // Sync slider + timestamps
            dashboardUpdateProgress(state.position, state.duration);

            // Sync play/pause icon
            dashboardSyncPlayIcon(!state.paused);

            // Sync track info (in case track changed)
            const track = state.track_window?.current_track;
            if (track) {
                const titleEl  = document.getElementById('track-title');
                const artistEl = document.getElementById('track-artist');
                const cover    = document.getElementById('album-cover');

                if (titleEl)  titleEl.textContent  = track.name;
                if (artistEl) artistEl.textContent = track.artists.map(a => a.name).join(', ');
                if (cover) {
                    cover.style.backgroundImage    = `url(${track.album.images[0].url})`;
                    cover.style.backgroundSize     = 'cover';
                    cover.style.backgroundPosition = 'center';
                }
            }

            // Restart / stop the local tick
            if (!state.paused) {
                startDashTick(state.position, state.duration);
            } else {
                stopDashTick();
            }
        });
    }

    // ── 2. Control buttons ───────────────────────────────────
    const btnPlay = document.getElementById('btn-play');
    // Try both common class names for next/prev
    const btnNext = document.querySelector('.btn-next, .btn-skip-next');
    const btnPrev = document.querySelector('.btn-previous, .btn-skip-prev');
    const progressSlider = document.getElementById('progress-slider')
                        || document.querySelector('.progress-slider');

    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            window.weathifyPlayer?.togglePlay();
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            window.weathifyPlayer?.nextTrack();
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            window.weathifyPlayer?.previousTrack();
        });
    }

    // ── 3. Seek ──────────────────────────────────────────────
    if (progressSlider) {
        progressSlider.addEventListener('input', () => {
            const player = window.weathifyPlayer;
            if (player && player.currentTrack) {
                const pct = progressSlider.value / 100;
                const ms  = Math.round(pct * player.currentTrack.duration_ms);
                player.seek(ms);
            }
        });
    }
});


// ── Edge hover navigation ─────────────────────────────────────
const EDGE_WIDTH  = 50;
const HOVER_DELAY = 300;
let hoverTimer    = null;
let isNavigating  = false;

const currentPage = window.location.pathname.split('/').pop()
             
let leftPage, rightPage = null;

if (currentPage === 'musicdashboard.html') {
    leftPage  = 'playlist.html';
    rightPage = null;
// } else if (currentPage === 'musicdashboard.html') {
//     leftPage  = 'playlist.html';
//     rightPage = null;
}

document.addEventListener('mousemove', (e) => {
    if (isNavigating) return;
    const mouseX      = e.clientX;
    const windowWidth = window.innerWidth;

    if (mouseX < EDGE_WIDTH && leftPage !== null) {
        if (!hoverTimer) {
            hoverTimer = setTimeout(() => navigateWithSlide('left', leftPage), HOVER_DELAY);
        }
    } else if (mouseX > windowWidth - EDGE_WIDTH && rightPage !== null) {
        if (!hoverTimer) {
            hoverTimer = setTimeout(() => navigateWithSlide('right', rightPage), HOVER_DELAY);
        }
    } else {
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    }
});


function navigateWithSlide(direction, url) {
    isNavigating = true;

    const pageWrapper = document.createElement('div');
    pageWrapper.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        transition:transform 0.5s ease-in-out;
        background-color:#121212; z-index:9998;`;

    while (document.body.firstChild) pageWrapper.appendChild(document.body.firstChild);
    document.body.appendChild(pageWrapper);

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed; top:0; left:${direction === 'left' ? '-100%' : '100%'};
        width:100%; height:100%; background-color:#121212; z-index:9999;
        transition:left 0.5s ease-in-out; backdrop-filter:blur(20px);`;
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.left            = '0';
        pageWrapper.style.transform   = direction === 'left' ? 'translateX(100%)' : 'translateX(-100%)';
        pageWrapper.style.filter      = 'blur(10px)';
    }, 10);

    setTimeout(() => { window.location.href = url; }, 300);
}
