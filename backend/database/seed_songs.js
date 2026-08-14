#!/usr/bin/env node
/**
 * WEATHIFY — Song Seeder
 *
 * Fetches tracks from Spotify and inserts them with weather/season/time tags.
 * Run:  node database/seed_songs.js
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { Pool } = require('pg');
const spotifyService = require('../services/spotifyService');

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'weathify_db',
  password: process.env.DB_PASSWORD || '',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
});

// ── Curated playlists of Spotify track IDs, grouped by mood/weather ──
// Each entry: { tags: [weather, season, time], tracks: [spotifyIds] }
const SEED_DATA = [
  // ── SUNNY / SUMMER / MORNING ──────────────────────────────
  {
    tags: { weather: ['sunny'], season: ['summer'], time: ['morning', 'afternoon'] },
    searches: [
      'happy summer vibes',
      'upbeat morning playlist',
      'feel good sunshine',
    ],
  },
  // ── SUNNY / SPRING / MIDDAY ───────────────────────────────
  {
    tags: { weather: ['sunny'], season: ['spring'], time: ['afternoon'] },
    searches: [
      'spring walk playlist',
      'bright cheerful pop',
    ],
  },
  // ── RAINY / AUTUMN / EVENING ──────────────────────────────
  {
    tags: { weather: ['rainy'], season: ['autumn'], time: ['evening', 'night'] },
    searches: [
      'rainy day chill',
      'melancholic autumn',
      'lo-fi rain',
    ],
  },
  // ── RAINY / SPRING / MORNING ──────────────────────────────
  {
    tags: { weather: ['rainy'], season: ['spring'], time: ['morning'] },
    searches: [
      'rainy morning coffee',
      'gentle rain acoustic',
    ],
  },
  // ── CLOUDY / AUTUMN / MIDDAY ──────────────────────────────
  {
    tags: { weather: ['cloudy'], season: ['autumn'], time: ['afternoon', 'evening'] },
    searches: [
      'cloudy day indie',
      'overcast chill',
    ],
  },
  // ── SNOWY / WINTER / NIGHT ────────────────────────────────
  {
    tags: { weather: ['snowy'], season: ['winter'], time: ['night', 'evening'] },
    searches: [
      'winter chill ambient',
      'cozy winter night',
      'snowy evening piano',
    ],
  },
  // ── SNOWY / WINTER / MORNING ──────────────────────────────
  {
    tags: { weather: ['snowy'], season: ['winter'], time: ['morning'] },
    searches: [
      'winter morning acoustic',
      'peaceful snowy morning',
    ],
  },
  // ── STORMY / ANY / NIGHT ──────────────────────────────────
  {
    tags: { weather: ['stormy'], season: ['autumn', 'winter'], time: ['night'] },
    searches: [
      'dark stormy playlist',
      'intense dramatic music',
    ],
  },
  // ── FOGGY / AUTUMN / MORNING ──────────────────────────────
  {
    tags: { weather: ['foggy'], season: ['autumn', 'winter'], time: ['morning', 'evening'] },
    searches: [
      'foggy ambient chill',
      'mysterious atmospheric',
    ],
  },
  // ── WINDY / SPRING / MIDDAY ───────────────────────────────
  {
    tags: { weather: ['windy'], season: ['spring', 'autumn'], time: ['afternoon'] },
    searches: [
      'breezy indie folk',
      'windy day playlist',
    ],
  },
  // ── MORNING GENERAL ───────────────────────────────────────
  {
    tags: { weather: ['sunny', 'cloudy'], season: ['spring', 'summer'], time: ['morning'] },
    searches: [
      'morning motivation playlist',
    ],
  },
  // ── NIGHT GENERAL ─────────────────────────────────────────
  {
    tags: { weather: ['cloudy', 'rainy'], season: ['autumn', 'winter'], time: ['night'] },
    searches: [
      'late night chill',
      'midnight drive playlist',
    ],
  },
  // ── SUMMER EVENING ────────────────────────────────────────
  {
    tags: { weather: ['sunny', 'cloudy'], season: ['summer'], time: ['evening'] },
    searches: [
      'summer sunset playlist',
      'evening summer vibes',
    ],
  },
];

async function insertSong(client, track) {
  // Spotify sometimes returns partial dates like "1985" or "1985-06".
  // PostgreSQL DATE columns need "YYYY-MM-DD".
  let releaseDate = track.release_date || null;
  if (releaseDate) {
    if (/^\d{4}$/.test(releaseDate)) releaseDate += '-01-01';
    else if (/^\d{4}-\d{2}$/.test(releaseDate)) releaseDate += '-01';
  }

  const result = await client.query(
    `INSERT INTO songs
       (spotify_track_id, title, artist, album, duration_ms,
        preview_url, spotify_url, album_art_url, popularity, explicit, release_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (spotify_track_id) DO UPDATE
       SET popularity = EXCLUDED.popularity,
           album_art_url = EXCLUDED.album_art_url
     RETURNING id`,
    [
      track.spotify_track_id,
      track.title,
      track.artist,
      track.album,
      track.duration_ms,
      track.preview_url,
      track.spotify_url,
      track.album_art_url,
      track.popularity,
      track.explicit,
      releaseDate,
    ]
  );
  return result.rows[0].id;
}

async function assignTags(client, songId, tagNames) {
  for (const tagName of tagNames) {
    const tagResult = await client.query(
      'SELECT id FROM tags WHERE LOWER(name) = LOWER($1)',
      [tagName]
    );
    if (tagResult.rows.length > 0) {
      const weight = 1.0 + Math.random() * 0.5; // 1.0–1.5 weight
      await client.query(
        `INSERT INTO song_tags (song_id, tag_id, weight)
         VALUES ($1, $2, $3)
         ON CONFLICT (song_id, tag_id) DO UPDATE SET weight = GREATEST(song_tags.weight, $3)`,
        [songId, tagResult.rows[0].id, weight.toFixed(2)]
      );
    }
  }
}

async function run() {
  const client = await pool.connect();
  let totalSongs = 0;
  let totalTags = 0;

  console.log('[seed_songs] Starting song seeding...\n');

  try {
    await client.query('BEGIN');

    for (const group of SEED_DATA) {
      const allTagNames = [
        ...group.tags.weather,
        ...group.tags.season,
        ...group.tags.time,
      ];

      for (const searchQuery of group.searches) {
        console.log(`[seed_songs] Searching Spotify: "${searchQuery}"`);

        try {
          await client.query('SAVEPOINT sp');
          const tracks = await spotifyService.searchTracks(searchQuery, 5);

          for (const track of tracks) {
            const songId = await insertSong(client, track);
            await assignTags(client, songId, allTagNames);
            totalSongs++;
            totalTags += allTagNames.length;
            console.log(`  ✓ ${track.title} — ${track.artist}  [${allTagNames.join(', ')}]`);
          }

          await client.query('RELEASE SAVEPOINT sp');
          // Be polite to the Spotify API
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          await client.query('ROLLBACK TO SAVEPOINT sp');
          console.error(`  ✗ Search failed for "${searchQuery}":`, err.message);
        }
      }
    }

    await client.query('COMMIT');

    // Final stats
    const songCount = await client.query('SELECT COUNT(*) FROM songs');
    const tagCount = await client.query('SELECT COUNT(*) FROM song_tags');

    console.log('\n[seed_songs] ────────────────────────────────────');
    console.log(`  Songs in DB  : ${songCount.rows[0].count}`);
    console.log(`  Tag mappings : ${tagCount.rows[0].count}`);
    console.log(`  New inserts  : ~${totalSongs} songs, ~${totalTags} tag assignments`);
    console.log('[seed_songs] ────────────────────────────────────');
    console.log('[seed_songs] ✓ Done!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed_songs] ✗ Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
