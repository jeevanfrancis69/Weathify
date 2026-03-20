# Weathify Recommendation Algorithm

## Overview

The recommendation system uses a **weighted tag-based scoring algorithm** to match
songs with the user's current context. Every song in the library is tagged with one
or more descriptors across three categories, and scored at query time against the
user's live context.

---

## 1. Context Detection

Before scoring can begin, the system resolves three context variables:

| Variable     | Source (auto)             | Source (manual)    |
|-------------|---------------------------|--------------------|
| `weather`   | OpenWeatherMap API → categorised | Dropdown selection |
| `season`    | Derived from current date + hemisphere | Dropdown selection |
| `time_of_day` | Derived from current server/client time | Dropdown selection |

### Weather Categories
```
sunny | rainy | cloudy | snowy | stormy | foggy | windy
```

### Season Logic
```
Northern hemisphere:
  Mar–May  → spring
  Jun–Aug  → summer
  Sep–Nov  → autumn
  Dec–Feb  → winter

Southern hemisphere: inverted
```

### Time of Day Logic
```
05:00–11:59 → morning
12:00–16:59 → afternoon
17:00–20:59 → evening
21:00–04:59 → night
```

---

## 2. Tag-Based Scoring

Each song can hold multiple tags across the three categories.
Each tag relationship carries a **weight** (0.0–1.0) set by an admin.

### Score Formula
```
Score(song) = Σ ( tag_weight × context_multiplier )

Where context_multiplier:
  weather  match  → 3.0   (highest priority)
  season   match  → 2.0
  time     match  → 2.0
  any other tag   → 1.0   (non-matching tags ignored in HAVING clause)
```

### SQL Implementation
```sql
SELECT
    s.*,
    COALESCE(
        SUM(
            CASE
                WHEN t.name = $weather    THEN st.weight * 3.0
                WHEN t.name = $season     THEN st.weight * 2.0
                WHEN t.name = $time_of_day THEN st.weight * 2.0
                ELSE st.weight * 1.0
            END
        ), 0
    ) AS relevance_score,
    ARRAY_AGG(DISTINCT t.name) AS matched_tags
FROM songs s
LEFT JOIN song_tags st ON s.id = st.song_id
LEFT JOIN tags       t  ON st.tag_id = t.id
GROUP BY s.id
HAVING SUM(...) > 0
ORDER BY relevance_score DESC, s.popularity DESC
LIMIT $limit;
```

The `HAVING > 0` clause ensures only songs with at least one matching tag
are returned. Popularity is used as a secondary sort key.

---

## 3. Worked Example

**Context:** `rainy` · `autumn` · `evening`

| Song              | Tags (weight)                          | Score Calculation                           | Total |
|-------------------|----------------------------------------|---------------------------------------------|-------|
| November Rain     | rainy(1.0), autumn(1.0), evening(0.9) | 1.0×3 + 1.0×2 + 0.9×2                     | **8.8** |
| Riders on the Storm | rainy(1.0), stormy(0.9), night(1.0), autumn(0.8) | 1.0×3 + 0.8×2                | **4.6** |
| Autumn Leaves     | autumn(1.0), cloudy(0.8), evening(0.9) | 1.0×2 + 0.9×2                             | **3.8** |
| Hotel California  | evening(1.0), night(0.9), autumn(0.8) | 1.0×2 + 0.8×2                              | **3.6** |
| Walking on Sunshine | sunny(1.0), summer(1.0), afternoon(0.9) | (no matches → excluded)                 | **0**   |

**Result order:** November Rain → Riders on the Storm → Autumn Leaves → Hotel California

---

## 4. Diversity Filter

To prevent the same artist from dominating a playlist, a post-query
diversity pass is applied in JavaScript:
```
maxPerArtist = 2

for each song in scored_results:
    if artist_count[song.artist] < maxPerArtist:
        add to final_list
        artist_count[song.artist]++
    if final_list.length >= limit:
        break
```

Additionally, the bottom 20% of the final list is lightly shuffled
to introduce freshness across repeated requests for the same context.

---

## 5. Fallback Strategy

If the main scoring query fails (for example due to a database error), the
service falls back to returning the top‑`N` songs ordered by popularity:
```
SELECT
    id, spotify_track_id, title, artist, album,
    duration_ms, preview_url, spotify_url, album_art_url,
    popularity, explicit, release_date
FROM songs
ORDER BY popularity DESC
LIMIT $limit;
```

In this case the explanation text is a generic message such as:
"Here are some popular tracks you might enjoy."

---

## 6. Performance Characteristics

| Concern              | Solution                                              |
|----------------------|-------------------------------------------------------|
| Slow tag joins       | Composite index on `(song_id, tag_id)` in song_tags  |
| High-traffic contexts | Response can be cached by context key (weather+season+time) |
| Cold start (0 songs) | Fallback returns popularity-ranked results           |
| Artist repetition    | Diversity filter caps at 2 songs per artist          |
| Stale results        | 20% shuffle ensures variance on repeated hits        |

---

## 7. Extending the Algorithm

The system is intentionally simple and transparent. Future improvements could include:

- **User preference weighting**: boost genres the user has previously clicked
- **Temporal decay**: reduce weight of recently played songs
- **BPM/energy matching**: match song energy to weather intensity
- **Collaborative filtering**: "users in rainy weather also liked…"
- **Redis caching**: cache context → song_ids with a short TTL