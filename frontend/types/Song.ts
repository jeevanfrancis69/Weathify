export type Song = {
    id: number;
    title: string;
    artist: string;
    album_art_url: string | null;
    spotify_track_id: string;
    spotify_url: string;
    matched_tags: string[];
};