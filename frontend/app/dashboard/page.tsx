'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

    function handlePlay(song: Song) {
        const index = songs.findIndex((item) => item.id === song.id);
        localStorage.setItem('playerQueue', JSON.stringify(songs));
        localStorage.setItem('playerQueueIndex', String(index));
        localStorage.setItem('playerQueueSource', 'dashboard');
        window.open(song.spotify_url, '_blank', 'noopener,noreferrer');
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
