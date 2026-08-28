export type Song = {
    id: number;
    title: string;
    artist: string;
    album: string;
    album_art_url: string | null;
    spotify_track_id: string;
    spotify_url: string;
    matched_tags: string[];
    relevance_score: string;
    duration_ms: number;
    explicit: boolean;
    popularity: number | null;
    preview_url: string | null;
    release_date: string;
};