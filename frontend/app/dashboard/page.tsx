'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SpotifyPlayer from 'react-spotify-web-playback';
import { toast } from 'sonner';
import { UserAuth } from '@/hooks/UserAuth';
import type { Song } from '@/types/Song';
import type { WeatherContext, WeatherData } from '@/types/Weather';
import LoadingSpinner from '@/components/LoadingSpinner';
import Navbar from '@/components/Navbar';
import WeatherCard from '@/components/dashboard/WeatherCardComponent';
import RecommendationComponent from '@/components/dashboard/Recommendations';
import ManualWeatherModal from '@/components/dashboard/ManualWeatherModal';

type RecommendationResponse = {
    songs?: Song[];
    explanation?: string;
    context?: WeatherContext;
    weatherData?: WeatherData;
    error?: string;
};

type ManualWeatherValues = {
    weather: NonNullable<WeatherContext['weather']>;
    season: NonNullable<WeatherContext['season']>;
    time_of_day: NonNullable<WeatherContext['time_of_day']>;
};

function toSpotifyTrackUris(trackId: string): string[] {
    const input = String(trackId || '').trim();
    const match = input.match(/(?:open\.spotify\.com\/track\/|spotify:track:)([a-zA-Z0-9]+)/i);
    const cleanId = (match ? match[1] : input).replace(/[^a-zA-Z0-9]/g, '');

    return cleanId ? [`spotify:track:${cleanId}`] : [];
}

async function readJsonResponse(response: Response): Promise<RecommendationResponse> {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[Dashboard] Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned invalid response');
    }

    return response.json() as Promise<RecommendationResponse>;
}

function cacheRecommendations(data: RecommendationResponse) {
    try {
        localStorage.setItem('dashLastRecommendations', JSON.stringify(data));
        if (data.context) {
            localStorage.setItem('dashLastContext', JSON.stringify(data.context));
        }
    } catch (error) {
        console.error('[Dashboard Cache]:', error);
    }
}

export default function DashboardPage() {
    const { user, loading: authLoading, error: authError } = UserAuth();
    const router = useRouter();
    const [songs, setSongs] = useState<Song[]>([]);
    const [explanation, setExplanation] = useState('');
    const [likedSongs, setLikedSongs] = useState<Set<Song['id']>>(new Set());
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [songsLoading, setSongsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [weatherContext, setWeatherContext] = useState<WeatherContext | null>(null);
    const [showManualModal, setShowManualModal] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
    const [spotifyConnected, setSpotifyConnected] = useState(false);
    const [activeTrackUris, setActiveTrackUris] = useState<string[]>([]);
    const [activeSongIndex, setActiveSongIndex] = useState(-1);
    const activeTrackRef = useRef<Song | null>(null);
    const activeSongIndexRef = useRef(-1);
    const autoAdvancedTrackRef = useRef<string | null>(null);
    const premiumToastShown = useRef(false);

    useEffect(() => {
        async function loadSpotifyToken() {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_EXPRESS_API_URL}/api/spotify/token`, {
                    credentials: 'include',
                });
                const data = await response.json() as { access_token?: string; connected?: boolean };

                if (!response.ok) {
                    throw new Error(data.connected === false ? 'Spotify is not connected.' : `HTTP ${response.status}`);
                }

                if (data.connected && data.access_token) {
                    console.log("[Load Spot Token: Access Token and Spotify is Connected]")
                    setSpotifyToken(data.access_token);
                    setSpotifyConnected(true);
                }
            } catch (error) {
                console.error('[Dashboard] Could not load Spotify token:', error);
                toast.error('We could not check your Spotify connection. You can still open songs in Spotify.');
            }
        }

        void loadSpotifyToken();
    }, []);

    useEffect(() => {
        if (!authLoading && (authError || !user)) {
            router.push('/login');
        }
    }, [authError, authLoading, router, user]);

    useEffect(() => {
        document.title = 'Weathify – Your Soundtrack';
    }, []);

    useEffect(() => {
        document.body.style.overflow = showManualModal ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [showManualModal]);

    const spotifyPlayerWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const wrapper = spotifyPlayerWrapperRef.current;
        if (!wrapper) return;

        const hideNativeSkipButtons = () => {
            wrapper.querySelectorAll('button').forEach((btn) => {
                if (!btn.classList.contains('rswp__toggle')) {
                    btn.style.display = 'none';
                }
            });
        };

        hideNativeSkipButtons();

        // SpotifyPlayer re-renders its internals on progress/track updates,
        // so keep re-hiding whenever the DOM inside the wrapper changes.
        const observer = new MutationObserver(hideNativeSkipButtons);
        observer.observe(wrapper, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, [activeTrackUris]);


    const updateRecommendationState = useCallback((data: RecommendationResponse) => {
        const nextSongs = data.songs || [];
        setSongs(nextSongs);
        setExplanation(data.explanation || '');
        setWeatherContext(data.context || null);
        if (data.weatherData) {
            setWeatherData(data.weatherData);
        }
        setShowAll(false);
        setErrorMessage(nextSongs.length ? null : 'No songs found for this context.');
        cacheRecommendations(data);
    }, []);

    const fetchByCoords = useCallback(async (latitude: number, longitude: number) => {
        setSongsLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_EXPRESS_API_URL}/api/recommendations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ latitude, longitude }),
            });
            const data = await readJsonResponse(response);

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            updateRecommendationState(data);
        } catch (error) {
            console.error('[Dashboard] Fetch error:', error);
            setSongs([]);
            setErrorMessage(`Could not fetch weather: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSongsLoading(false);
        }
    }, [updateRecommendationState]);

    const fetchByContext = useCallback(async (context: ManualWeatherValues | WeatherContext) => {
        setSongsLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_EXPRESS_API_URL}/api/recommendations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(context),
            });
            const data = await readJsonResponse(response);

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            updateRecommendationState(data);
        } catch (error) {
            console.error('[Dashboard] Fetch error:', error);
            setSongs([]);
            setErrorMessage(`Could not get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSongsLoading(false);
        }
    }, [updateRecommendationState]);

    const requestLocation = useCallback(async () => {
        const playing = localStorage.getItem('playerCurrentTrack');
        const cachedRecs = localStorage.getItem('dashLastRecommendations');
        const cachedContext = localStorage.getItem('dashLastContext');

        if (playing && cachedRecs) {
            try {
                const data = JSON.parse(cachedRecs) as RecommendationResponse;
                const context = cachedContext
                    ? JSON.parse(cachedContext) as WeatherContext
                    : data.context;
                updateRecommendationState({ ...data, context });
                return;
            } catch (error) {
                console.error('[Dashboard] Could not restore cached recommendations:', error);
            }
        }

        if (!('geolocation' in navigator)) {
            setShowManualModal(true);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => void fetchByCoords(position.coords.latitude, position.coords.longitude),
            () => setShowManualModal(true),
            { timeout: 8000, maximumAge: 300000 },
        );
    }, [fetchByCoords, updateRecommendationState]);

    const loadLikedSongs = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_EXPRESS_API_URL}/api/recommendations/playlist`, {
                credentials: 'include',
            });
            if (!response.ok) {
                return;
            }

            const data = await response.json() as { songs?: Song[] };
            setLikedSongs(new Set((data.songs || []).map((song) => song.id)));
        } catch (error) {
            console.error('[Dashboard] Could not load liked songs:', error);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void loadLikedSongs();
            void requestLocation();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [loadLikedSongs, requestLocation, user]);

    const refresh = useCallback(() => {
        localStorage.removeItem('dashLastRecommendations');
        localStorage.removeItem('dashLastContext');

        if (weatherContext) {
            void fetchByContext(weatherContext);
        } else {
            void requestLocation();
        }
    }, [fetchByContext, requestLocation, weatherContext]);

    useEffect(() => {
        if (!user) {
            return;
        }

        const interval = window.setInterval(() => {
            console.log('[Dashboard] Auto-refreshing recommendations...');
            refresh();
        }, 15 * 60 * 1000);

        return () => window.clearInterval(interval);
    }, [refresh, user]);

    async function handleLogout() {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_EXPRESS_API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('[Dashboard] Logout failed:', error);
        }
        router.push('/login');
    }

    async function handleLike(song: Song) {
        const isLiked = likedSongs.has(song.id);

        try {
            const response = await fetch(
                isLiked ? `${process.env.NEXT_PUBLIC_EXPRESS_API_URL}/api/recommendations/unlike/${song.id}` : `${process.env.NEXT_PUBLIC_EXPRESS_API_URL}/api/recommendations/like`,
                {
                    method: isLiked ? 'DELETE' : 'POST',
                    headers: isLiked ? undefined : { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: isLiked ? undefined : JSON.stringify({
                        song_id: song.id,
                        weather: weatherContext?.weather,
                        season: weatherContext?.season,
                        time_of_day: weatherContext?.time_of_day,
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setLikedSongs((current) => {
                const next = new Set(current);
                if (isLiked) {
                    next.delete(song.id);
                } else {
                    next.add(song.id);
                }
                return next;
            });
        } catch (error) {
            console.error('[Dashboard] Could not update liked song:', error);
        }
    }

    const handlePlaySong = useCallback((trackId: string, song: Song) => {
        const uris = toSpotifyTrackUris(trackId);
        if (!uris.length) {
            toast.error('This song has an invalid Spotify track ID.');
            return;
        }

        premiumToastShown.current = false;

        if (!spotifyConnected || !spotifyToken) {
            toast.error('Connect your Spotify account for in-app playback.');
            window.open(song.spotify_url, '_blank', 'noopener,noreferrer');
            return;
        }

        setActiveTrackUris(uris); // launches the Web Player SDK
        activeTrackRef.current = song;
    }, [spotifyConnected, spotifyToken]);

    function handlePlay(song: Song) {
        const index = songs.findIndex((item) => item.id === song.id);
        localStorage.setItem('playerQueue', JSON.stringify(songs));
        localStorage.setItem('playerQueueIndex', String(index));
        localStorage.setItem('playerQueueSource', 'dashboard');
        activeSongIndexRef.current = index;
        setActiveSongIndex(index);
        autoAdvancedTrackRef.current = null;
        handlePlaySong(song.spotify_track_id, song);
    }

    const playNextSong = useCallback(() => {
        if (!songs.length) {
            return;
        }

        const currentIndex = activeSongIndexRef.current >= 0 ? activeSongIndexRef.current : activeSongIndex;
        const nextIndex = (currentIndex + 1 + songs.length) % songs.length;
        const nextSong = songs[nextIndex];
        activeSongIndexRef.current = nextIndex;
        setActiveSongIndex(nextIndex);
        handlePlaySong(nextSong.spotify_track_id, nextSong);
    }, [activeSongIndex, handlePlaySong, songs]);

    const playPreviousSong = useCallback(() => {
        if (!songs.length) {
            return;
        }

        const currentIndex = activeSongIndexRef.current >= 0 ? activeSongIndexRef.current : activeSongIndex;
        const previousIndex = (currentIndex - 1 + songs.length) % songs.length;
        const previousSong = songs[previousIndex];
        activeSongIndexRef.current = previousIndex;
        setActiveSongIndex(previousIndex);
        handlePlaySong(previousSong.spotify_track_id, previousSong);
    }, [activeSongIndex, handlePlaySong, songs]);

    function handlePlayerCallback(state: {
        status: string;
        errorType?: string | null;
        error?: string;
        progressMs?: number;
        track?: { id: string; durationMs: number };
    }) {
        if (state.status !== 'ERROR') {
            const trackId = state.track?.id;
            const durationMs = state.track?.durationMs || 0;
            const hasReachedEnd = Boolean(
                trackId
                && durationMs > 0
                && (state.progressMs || 0) >= durationMs - 1000,
            );

            if (trackId && hasReachedEnd && autoAdvancedTrackRef.current !== trackId) {
                autoAdvancedTrackRef.current = trackId;
                playNextSong();
            }

            return;
        }

        const isPremiumError = state.errorType === 'account'
            || state.errorType === 'authentication'
            || /premium|account|authentication/i.test(state.error || '');

        if (isPremiumError) {
            if (!premiumToastShown.current) {
                toast.error('Spotify Premium is required for interactive playback. Opening this song in Spotify.');
                premiumToastShown.current = true;
            }
            setActiveTrackUris([]);
            const track = activeTrackRef.current;
            if (track) {
                window.open(track.spotify_url, '_blank', 'noopener,noreferrer');
            }
        } else {
            toast.error(state.error || 'Spotify playback failed.');
        }
    }

    function handleManualSubmit(values: ManualWeatherValues) {
        setShowManualModal(false);
        localStorage.removeItem('dashLastRecommendations');
        localStorage.removeItem('dashLastContext');
        void fetchByContext(values);
    }

    if (authLoading || !user) {
        return <LoadingSpinner />;
    }

    return (
        <>
            <link rel="stylesheet" href="/css/style.css" />
            <link rel="stylesheet" href="/css/dashboard.css" />
            <link rel="stylesheet" href="/css/player.css" />

            <Navbar user={user} onLogout={() => void handleLogout()} />

            <main className="dashboard-wrap container">
                <WeatherCard
                    context={weatherContext}
                    data={weatherData}
                    onManualClick={() => setShowManualModal(true)}
                    onRefreshClick={refresh}
                />

                <RecommendationComponent
                    explanation={explanation}
                    songs={songs}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    likedSongs={likedSongs}
                    onLike={handleLike}
                    onPlay={handlePlay}
                    isLoading={songsLoading}
                    errorMessage={errorMessage}
                    showAll={showAll}
                    onShowAll={() => setShowAll(true)}
                    onManualClick={() => setShowManualModal(true)}
                />
            </main>

            {spotifyToken && activeTrackUris.length > 0 && (
                <>
                    {/* Your preferred layout container bar */}
                    <div
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            width: '100%',
                            zIndex: 1000,
                            background: '#0d0d17',
                            boxShadow: '0 -2px 10px rgba(0,0,0,0.5)',
                            boxSizing: 'border-box',
                            padding: '0 24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                height: '90px',
                                gap: '16px'
                            }}
                        >
                            {/* COLUMN 1: Your custom far-left Previous button */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <button
                                    type="button"
                                    aria-label="Previous song"
                                    title="Previous song"
                                    onClick={playPreviousSong}
                                    disabled={!songs.length}
                                    style={{
                                        border: 0,
                                        borderRadius: '999px',
                                        padding: '10px',
                                        color: '#fff',
                                        background: '#2a2a3a',
                                        cursor: songs.length ? 'pointer' : 'not-allowed',
                                        opacity: songs.length ? 1 : 0.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseOver={(e) => { if(songs.length) e.currentTarget.style.background = '#3e3e56'; }}
                                    onMouseOut={(e) => { if(songs.length) e.currentTarget.style.background = '#2a2a3a'; }}
                                >
                                    <svg xmlns="http://w3.org" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="4" y="5" width="2" height="14" rx="1" />
                                        <path d="M19 19V5l-11 7z" />
                                    </svg>
                                </button>
                            </div>

                            {/* COLUMN 2: The Core SDK Timeline & Center Play Button */}
                            <div className="spotify-player-wrapper" ref={spotifyPlayerWrapperRef} style={{ flex: 1, minWidth: 0 }}>
                                <SpotifyPlayer
                                    token={spotifyToken}
                                    uris={activeTrackUris}
                                    play
                                    layout="responsive"
                                    callback={handlePlayerCallback}
                                    hideAttribution
                                    styles={{
                                        bgColor: '#0d0d17',
                                        color: '#fff',
                                        sliderColor: '#a78bfa',
                                        sliderTrackColor: '#2a2a3a',
                                        trackNameColor: '#fff',
                                        trackArtistColor: '#9ca3af',
                                        loaderColor: '#a78bfa',
                                        activeColor: '#a78bfa',
                                        height: 90,
                                    }}
                                />
                            </div>

                            {/* COLUMN 3: Your custom far-right Next button */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <button
                                    type="button"
                                    aria-label="Next song"
                                    title="Next song"
                                    onClick={playNextSong}
                                    disabled={!songs.length}
                                    style={{
                                        border: 0,
                                        borderRadius: '999px',
                                        padding: '10px',
                                        color: '#fff',
                                        background: '#2a2a3a',
                                        cursor: songs.length ? 'pointer' : 'not-allowed',
                                        opacity: songs.length ? 1 : 0.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseOver={(e) => { if(songs.length) e.currentTarget.style.background = '#3e3e56'; }}
                                    onMouseOut={(e) => { if(songs.length) e.currentTarget.style.background = '#2a2a3a'; }}
                                >
                                    <svg xmlns="http://w3.org" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M5 5v14l11-7z" />
                                        <rect x="18" y="5" width="2" height="14" rx="1" />
                                    </svg>
                                </button>
                            </div>

                        </div>
                    </div>
                </>
            )}

            {showManualModal && (
                <ManualWeatherModal
                    open
                    context={weatherContext}
                    onClose={() => setShowManualModal(false)}
                    onSubmit={handleManualSubmit}
                />
            )}
        </>
    );
}
