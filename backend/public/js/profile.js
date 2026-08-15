'use strict';


document.addEventListener('DOMContentLoaded',async () => {
    try {
        const responseProfile = await fetch('/api/spotify/profile');
        console.log("Profile Data received!")

        const responseTopItems = await fetch('/api/spotify/topitems');
        console.log("User Top Items received!")

        if (!responseProfile) {
            throw new Error('Request failed with status ${response.status');
        }

        const profileData = await responseProfile.json();
        console.log(profileData);

        const userTopItems = await responseTopItems.json();
        console.log(userTopItems);

        const displayName = document.getElementById('text');
        const profImage = document.getElementById('prof-image');
        displayName.textContent = profileData.display_name;
        profImage.src = profileData.images[0].url;

        const top10Artists = userTopItems.items.slice(0,10);
        const artistRow = document.querySelector('.artist-row');

        let cardsHTML = '';

        top10Artists.forEach(artist => {
            cardsHTML += `<div class = 'artist-card'> <img src = "${artist.images[0].url}" class= "artist-name"> 
            <p class = 'artist-name'>${artist.name}</p></div>`
        });

        artistRow.innerHTML = cardsHTML;


    } catch (error) {
        console.error(error.message);
    }
})