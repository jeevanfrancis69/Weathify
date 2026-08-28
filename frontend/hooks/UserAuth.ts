import { useState, useEffect } from 'react';
import type { User } from "@/types/User";

interface AuthMeResponse {
    user: User;
}

interface ErrorResponse {
    error: string;
}


interface UserAuthenticationResponse {
    user: User | null;
    loading: boolean;
    error: string | null;
}



export function UserAuth(): UserAuthenticationResponse {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_EXPRESS_API_URL}/auth/me`, {
                    credentials: 'include'
                });

                const rawText = await res.text();

                if (!res.ok) {
                    let errorMsg = `HTTP ${res.status}`;
                    try {
                        const errorData: ErrorResponse = JSON.parse(rawText);
                        errorMsg = `${res.status} - ${errorData.error}`;
                    } catch {
                        errorMsg += ` (non-JSON: ${rawText.substring(0, 100)})`;
                    }
                    throw new Error(`Auth failed: ${errorMsg}`);
                }

                const data: AuthMeResponse = JSON.parse(rawText);
                setUser(data.user);

            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
            } finally {
                setLoading(false);
            }
        }

        checkAuth();
    }, []);

    return { user, loading , error}
}
