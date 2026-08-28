// GRID VIEW

import type { Song } from "@/types/Song";

type SongCardProps = {
    song: Song;
    isLiked: boolean;
    view: 'grid' | 'table';
    onLike: (song: Song) => void;
    onPlay: (song: Song) => void;
};

export default function SongCard( props: SongCardProps) {
    const { song, isLiked, onLike, onPlay, view } = props
    const tags = (song.matched_tags || []).filter(Boolean).slice(0, 3);

    if (view === 'table') {
        return (
            <div className="songs-table__row">
                <span className="songs-table__cell songs-table__cell--title">
                    <img
                        className="songs-table__art"
                        src={song.album_art_url || "/images/placeholder.svg"}
                        alt={song.title}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.src = "/images/placeholder.svg"; }}
                    />
                    <span className="songs-table__song-name">{song.title}</span>
                </span>
                <span className="songs-table__cell songs-table__cell--artist">{song.artist}</span>
                <span className="songs-table__cell songs-table__cell--tags">
                    {tags.map((tag) => (
                        <span key={tag} className="tag-pill tag-pill--sm">{tag}</span>
                    ))}
                </span>
                <span className="songs-table__cell songs-table__cell--actions">
                    <button
                        className={`btn-like ${isLiked ? 'liked' : ''}`}
                        title={isLiked ? 'Unlike this song' : 'Like this song'}
                        onClick={(e) => { e.stopPropagation(); onLike(song); }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'}>
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    <button
                        className="btn-play"
                        title="Play on Spotify"
                        onClick={(e) => { e.stopPropagation(); onPlay(song); }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                </span>
            </div>
        );
    }

    return (
        <div className="song-card">
            <img
                className="song-card__art"
                src={song.album_art_url || "/images/placeholder.svg"}
                alt={song.title}
                loading="lazy"
                onError={(e) => { e.currentTarget.src = "/images/placeholder.svg"; }}
            />
            <div className="song-card__body">
                <div className="song-card__title">{song.title}</div>
                <div className="song-card__artist">{song.artist}</div>
                {tags.length > 0 && (
                    <div className="song-card__tags">
                        {tags.map((tag) => (
                            <span key={tag} className="tag-pill">{tag}</span>
                        ))}
                    </div>
                )}
                <div className="song-card__actions">
                    <button
                        className={`btn-like ${isLiked ? 'liked' : ''}`}
                        title={isLiked ? 'Unlike this song' : 'Like this song'}
                        onClick={(e) => { e.stopPropagation(); onLike(song); }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'}>
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    <button
                        className="btn-play"
                        title="Play on Spotify"
                        onClick={(e) => { e.stopPropagation(); onPlay(song); }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Play
                    </button>
                </div>
            </div>
        </div>
    );
}
