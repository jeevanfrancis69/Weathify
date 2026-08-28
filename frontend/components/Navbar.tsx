import {User} from "@/types/User"


function WeathifyLogo() {
    return(
        <div className="logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M3 9C3 9 4.5 7 7 7C9.5 7 10.5 9 13 9C15.5 9 16.5 7 19 7C21.5 7 22 9 22 9"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M3 14C3 14 4.5 12 7 12C9.5 12 10.5 14 13 14C15.5 14 16.5 12 19 12C21.5 12 22 14 22 14"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span> Weathify </span>
        </div>
    )
}

function SpotifyLogo() {
    return(
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
    )
}

function Profile() {
    return(
        <a href="/profile" className="btn btn-outline btn-sm" id = "profileButton">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="4"/>
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            </svg>
        </a>
    )
}


export default function Navbar(users: User | null ) {
    const firstName = users?.full_name ? users.full_name.split(' ')[0] : '';

    return(
        <nav className="navbar">
            <div className="container nav-container">
                <WeathifyLogo/>
                <div className="nav-links">
                    {/* Profile Button */}

                    <Profile/>

                    {/* Playlist Button */}
                    <a href="/playlist" className="btn btn-outline btn-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M9 18V5L21 3V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Playlist
                    </a>
                    {/* Connect Spotify Button */}
                    <a href={`${process.env.NEXT_PUBLIC_API_URL}/api/spotify/login`} className="btn btn-spotify btn-sm" id="spotifyConnectBtn" title="Connect your Spotify account for in-app playback">
                        <SpotifyLogo/>
                        <span id="spotifyBtnText">Connect Spotify</span>
                    </a>
                    <span className="user-greeting" id="userGreeting">
                        {users ? `Hi, ${firstName} 👋` : `Log In yo`}
                    </span>
                    <button className="btn btn-outline btn-sm" id="logoutBtn">Log Out</button>
                </div>
            </div>
        </nav>
        
    )
};