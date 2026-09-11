"use client";


import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { toast } from "sonner";

interface handlerProp {
    onConnectionSuccess: () => void;
}

export default function SpotifyCallbackHandler( { onConnectionSuccess }: handlerProp) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
            const connected = searchParams.get("spotify_connected");
            const failure = searchParams.get("spotify_error");

            if (!connected && !failure) return;

            if (connected){
                toast.success("Sucessfully connected to Spotify" , { id: "spotify-success" })
                onConnectionSuccess();
            } else if (failure) {
                toast.error(`Failed to connect to Spotify: ${decodeURIComponent(failure)}`, { id: "spotify-error" })
            }

            const timeoutId = setTimeout(() => {
                router.replace(pathname)
            }, 100);

            return () => clearTimeout(timeoutId);

        }, [searchParams, pathname, router]);

        return null;
}