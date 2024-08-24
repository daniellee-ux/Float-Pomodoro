const minutesInput = document.getElementById('minutes');
const secondsInput = document.getElementById('seconds');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const countdownDisplay = document.getElementById('countdown');
const pipVideo = document.getElementById('pipVideo');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const timeTimer = document.getElementById('timeTimer');
const timeTimerDisk = document.getElementById('timeTimerDisk');
const timeTimerOverlay = document.getElementById('timeTimerOverlay');

let countdownInterval;
let remainingTime;
let totalTime;
let isPaused = false;
let currentTab = 'numeric';
let isTimerRunning = false;
let lastUpdateTime;
let animationFrameId;
let intervalId;
let worker;

startButton.addEventListener('click', startCountdown);
pauseButton.addEventListener('click', togglePause);
stopButton.addEventListener('click', stopCountdown);

minutesInput.addEventListener('input', updatePreview);
secondsInput.addEventListener('input', updatePreview);

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        updateTimerDisplay();
    });
});

function updatePreview() {
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    totalTime = remainingTime = minutes * 60 + seconds;
    updateTimerDisplay();
}

function startCountdown() {
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    if (minutes === 0 && seconds === 0) {
        alert('Please enter a valid time.');
        return;
    }

    totalTime = remainingTime = minutes * 60 + seconds;
    updateTimerDisplay();

    isTimerRunning = true;
    startButton.disabled = true;
    pauseButton.disabled = false;
    stopButton.disabled = false;

    if (worker) {
        worker.terminate();
    }
    worker = new Worker('timerWorker.js');
    worker.onmessage = function(e) {
        if (e.data.finished) {
            stopCountdown();
            alert('Countdown finished!');
        } else {
            remainingTime = e.data.remainingTime;
            updateTimerDisplay();
        }
    };
    worker.postMessage({ action: 'start', time: totalTime });

    startPictureInPicture().catch(error => {
        console.error('PiP failed, but timer will continue:', error);
    });
}

function togglePause() {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    if (isPaused) {
        worker.postMessage({ action: 'pause' });
    } else {
        worker.postMessage({ action: 'resume' });
    }
}

function stopCountdown() {
    isTimerRunning = false;
    remainingTime = totalTime;
    updateTimerDisplay();
    startButton.disabled = false;
    pauseButton.disabled = true;
    stopButton.disabled = true;
    isPaused = false;
    pauseButton.textContent = 'Pause';
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    }
    if (worker) {
        worker.postMessage({ action: 'stop' });
        worker.terminate();
        worker = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);
    const timeString = `${padZero(minutes)}:${padZero(seconds)}`;
    countdownDisplay.textContent = timeString;
    timeTimerOverlay.textContent = timeString;
    
    const progress = 1 - (remainingTime / totalTime);
    timeTimerDisk.style.background = `conic-gradient(from 0deg, transparent ${progress * 100}%, red ${progress * 100}%)`;
    
    if (currentTab === 'numeric') {
        countdownDisplay.style.display = 'block';
        timeTimer.style.display = 'none';
    } else {
        countdownDisplay.style.display = 'none';
        timeTimer.style.display = 'block';
    }
    
    drawCountdown();
}

function padZero(num) {
    return Math.floor(num).toString().padStart(2, '0');
}

function drawCountdown() {
    canvas.width = 200;
    canvas.height = 200;
    ctx.fillStyle = '#e0e5ec';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (currentTab === 'numeric') {
        ctx.fillStyle = '#4a4a4a';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(countdownDisplay.textContent, canvas.width / 2, canvas.height / 2);
    } else {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 90;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#f0f5fc';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#d1d9e6';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const progress = 1 - (remainingTime / totalTime);
        ctx.arc(centerX, centerY, radius - 5, -Math.PI / 2, (-Math.PI / 2) + (2 * Math.PI * progress), true);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = 'red';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 15, 0, 2 * Math.PI);
        ctx.fillStyle = '#e0e5ec';
        ctx.fill();

        ctx.fillStyle = '#4a4a4a';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(timeTimerOverlay.textContent, centerX, centerY);
    }
}

async function startPictureInPicture() {
    const isPiPSupported = document.pictureInPictureEnabled || 
                           (pipVideo.webkitSupportsPresentationMode && 
                            typeof pipVideo.webkitSetPresentationMode === 'function');

    if (!isPiPSupported) {
        console.warn('Picture-in-Picture not supported');
        alert('Picture-in-Picture mode is not supported in this browser. The timer will continue to run in the background.');
        return;
    }

    drawCountdown();
    const stream = canvas.captureStream();
    pipVideo.srcObject = stream;
    await pipVideo.play();

    try {
        if (pipVideo.webkitSupportsPresentationMode && typeof pipVideo.webkitSetPresentationMode === 'function') {
            // Safari
            await pipVideo.webkitSetPresentationMode('picture-in-picture');
        } else {
            // Other browsers
            await pipVideo.requestPictureInPicture();
        }
        
        function updatePiP() {
            if ((pipVideo.webkitPresentationMode === 'picture-in-picture') || document.pictureInPictureElement) {
                drawCountdown();
                requestAnimationFrame(updatePiP);
            }
        }
        updatePiP();
    } catch (error) {
        console.error('Failed to enter Picture-in-Picture mode:', error);
        alert('Failed to enter Picture-in-Picture mode. The timer will continue to run in the background.');
    }
}

document.addEventListener('visibilitychange', function() {
    if (!document.hidden && isTimerRunning) {
        // Refresh the display when the tab becomes visible again
        updateTimerDisplay();
    }
});

minutesInput.value = '25';
secondsInput.value = '00';
totalTime = remainingTime = 25 * 60;
updateTimerDisplay();
updateTimerDisplay();
