'use strict';

async function initProfile() {
    try {
        const result = await fetch('/api/spotify/token');
        const resultJSON = await result.json();

        if (resultJSON.connected === true){
            window.dashApp._showToast("Spotify Connected & Authenticated!")
            return resultJSON.access_token;
        } else {
            window.dashApp._showToast(resultJSON.error);
            return;
        }

    } catch (err) {
        console.error(err);
        window.dashApp._showToast('Something went wrong. Please try again.');
    }
}
