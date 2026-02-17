
const btnPlay = document.querySelector('.btn-play');



if (btnPlay) {
    let isPlaying = false;

    function setPlayIcon() {
        btnPlay.innerHTML = isPlaying
        ? '<i data-lucide="pause"></i>'
        : '<i data-lucide="play"></i>';

        lucide.createIcons();
    }



    btnPlay.addEventListener('click', () => {
        isPlaying = !isPlaying;
        setPlayIcon();
    });

    setPlayIcon();
}

const slider = document.querySelector('.progress-slider');

if (slider) {
    function updateSlider() {
        const percent = (slider.value / slider.max) * 100;
        slider.style.setProperty("--value", percent + "%");
    }

    slider.addEventListener('input', updateSlider);
    updateSlider();

}

const EDGE_WIDTH = 50; // pixels from edge to trigger navigation
const HOVER_DELAY = 300;
let hoverTimer = null;
let isNavigating = false;

const currentPage = window.location.pathname.split('/').pop(); 
console.log('🔍 Current page detected:', currentPage); // DEBUG


//500ms before navigating
let leftPage, rightPage;

if (currentPage === 'testswitch.html') {
    leftPage = null;
    rightPage = 'musicdashboard.html';
    console.log('✅ On testswitch - right should go to musicdashboard'); // DEBUG
}
else if (currentPage === 'musicdashboard.html') {
    leftPage = 'testswitch.html';
    rightPage = null;
    console.log('✅ On musicdashboard - left should go to testswitch'); // DEBUG

}

console.log('📍 leftPage:', leftPage, 'rightPage:', rightPage); // DEBUG


document.addEventListener('mousemove', (e) => {
    if (isNavigating) return;

    const mouseX = e.clientX;
    const windowWidth = window.innerWidth;

    if (mouseX < EDGE_WIDTH && leftPage !== null) {
        console.log('🖱️ Mouse in LEFT zone'); // DEBUG

        if (!hoverTimer) {
            console.log('⏱️ Starting LEFT timer...'); // DEBUG
            hoverTimer = setTimeout(() => {
                console.log('🚀 Navigating LEFT to:', leftPage); // DEBUG
                navigateWithSlide('left' , leftPage);
            }, HOVER_DELAY);
        }
    } 
    
    else if (mouseX > windowWidth - EDGE_WIDTH && rightPage !== null)
    {
        console.log('🖱️ Mouse in RIGHT zone'); // DEBUG
        if (!hoverTimer) {
            console.log('⏱️ Starting RIGHT timer...'); // DEBUG
            hoverTimer = setTimeout(() => {
                console.log('🚀 Navigating RIGHT to:', rightPage); // DEBUG
                navigateWithSlide('right', rightPage);
            }, HOVER_DELAY);
        }
    }
     
    else {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    }
});


function navigateWithSlide(direction, url) {
    console.log('🎬 navigateWithSlide called - direction:', direction, 'url:', url); // DEBUG
    isNavigating = true;

    const pageWrapper = document.createElement('div');
    pageWrapper.style.position = 'fixed';
    pageWrapper.style.top = '0';
    pageWrapper.style.left = '0';
    pageWrapper.style.width = '100%';
    pageWrapper.style.height = '100%';
    pageWrapper.style.transition = 'transform 0.5s ease-in-out';
    pageWrapper.style.backgroundColor = '#121212';
    pageWrapper.style.zIndex = '9998';

    
    while (document.body.firstChild) {
        pageWrapper.appendChild(document.body.firstChild);
    }
    document.body.appendChild(pageWrapper);

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = direction === 'left' ? '-100%' : '100%';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = '#121212';
    overlay.style.zIndex = '9999';
    overlay.style.transition = 'left 0.5s ease-in-out';
    overlay.style.backdropFilter = 'blur(20px)';

    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.left = '0';
        pageWrapper.style.transform = direction === 'left' ? 'translateX(100%)' : 'translateX(-100%)';
        pageWrapper.style.filter = 'blur(10px)';
    }, 10);

    setTimeout(() => {
        console.log('🌐 Actually navigating to:', url); // DEBUG
        window.location.href = url;
    }, 650);
}