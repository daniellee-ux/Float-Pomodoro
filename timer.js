const minutesInput = document.getElementById('minutes');
const secondsInput = document.getElementById('seconds');
const startButton = document.getElementById('startButton');
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

    // Reset states
    isPaused = false;

    totalTime = remainingTime = minutes * 60 + seconds;
    updateTimerDisplay();

    isTimerRunning = true;
    startButton.disabled = true;
    stopButton.disabled = false;

    // Clean up existing worker if any
    if (worker) {
        worker.terminate();
    }
    
    // Create new worker
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
    
    // Start the timer
    worker.postMessage({ action: 'start', time: totalTime });
    startPictureInPicture();
}

function stopCountdown() {
    if (!worker) return;
    
    isTimerRunning = false;
    isPaused = false;
    remainingTime = totalTime;
    updateTimerDisplay();
    
    startButton.disabled = false;
    stopButton.disabled = true;
    
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else if (pipVideo.webkitPresentationMode === "picture-in-picture") {
        pipVideo.webkitSetPresentationMode("inline");
    }
    
    // Clean up worker
    worker.postMessage({ action: 'stop' });
    worker.terminate();
    worker = null;
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
        ctx.arc(centerX, centerY, radius - 2, 0, 2* Math.PI);
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
        ctx.arc(centerX, centerY, radius - 15, 0, 2* Math.PI);
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
    console.log('Starting Picture-in-Picture');
    if (document.pictureInPictureElement) {
        console.log('Exiting existing PiP');
        await document.exitPictureInPicture().catch(console.error);
    }

    console.log('Drawing countdown');
    drawCountdown(); // Ensure the canvas is drawn

    // Ensure the canvas has content before capturing
    await new Promise(resolve => setTimeout(resolve, 100));

    const stream = canvas.captureStream(30);
    console.log('Stream tracks:', stream.getTracks());

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
        console.log('Video track settings:', videoTrack.getSettings());
    } else {
        console.error('No video track found in the stream');
    }

    pipVideo.srcObject = stream;
    console.log('Stream set to video element');

    try {
        await pipVideo.play();
        console.log('Video playback started');

        // Wait a short time to ensure video is actually playing
        await new Promise(resolve => setTimeout(resolve, 100));

        if (pipVideo.webkitSupportsPresentationMode && typeof pipVideo.webkitSetPresentationMode === "function") {
            console.log('Using Safari PiP mode');
            drawCountdown(); // Force a redraw
            await pipVideo.webkitSetPresentationMode("picture-in-picture");
            console.log('Safari PiP mode activated');
        } else {
            console.log('Using standard PiP mode');
            await pipVideo.requestPictureInPicture();
            console.log('Standard PiP mode activated');
        }

        // Force an update after entering PiP mode
        setTimeout(() => {
            console.log('Forcing update after PiP activation');
            drawCountdown();
            updatePiP();
        }, 100);
    } catch (error) {
        console.error('Error starting video playback:', error);
    }
}

let isPiPLoggingEnabled = true; // Control logging in PiP

function updatePiP() {
    if (document.pictureInPictureElement || 
        (pipVideo.webkitPresentationMode && pipVideo.webkitPresentationMode === "picture-in-picture")) {
        if (isPiPLoggingEnabled) {
            console.log('PiP is active, updating');
        }
        drawCountdown();
        requestAnimationFrame(updatePiP);
    } else {
        if (isPiPLoggingEnabled) {
            console.log('PiP not active, stopping updates');
        }
        isPiPLoggingEnabled = false; // Disable logging when exiting PiP
    }
}

// Ensure this event listener is present
pipVideo.addEventListener('webkitpresentationmodechanged', (event) => {
    if (event.target.webkitPresentationMode === "picture-in-picture") {
        isPiPLoggingEnabled = true; // Re-enable logging when entering PiP
        console.log("Entered PiP mode in Safari");
        setTimeout(() => {
            drawCountdown();
            updatePiP();
        }, 100);
    } else if (event.target.webkitPresentationMode === "inline") {
        isPiPLoggingEnabled = false; // Disable logging when exiting PiP
        console.log("Exited PiP mode in Safari");
    }
});

// Add this new function to log the current state
function logState() {
    console.log('Current state:');
    console.log('- isTimerRunning:', isTimerRunning);
    console.log('- isPaused:', isPaused);
    console.log('- remainingTime:', remainingTime);
    console.log('- totalTime:', totalTime);
    console.log('- currentTab:', currentTab);
    console.log('- PiP active:', !!document.pictureInPictureElement || (pipVideo.webkitPresentationMode === "picture-in-picture"));
}

// Call logState at key points
startButton.addEventListener('click', () => {
    console.log('Start button clicked');
    logState();
    startCountdown();
});

stopButton.addEventListener('click', () => {
    console.log('Stop button clicked');
    logState();
    stopCountdown();
});

document.addEventListener("visibilitychange", function() {
    if (document.hidden && isTimerRunning) {
        cancelAnimationFrame(animationFrameId);
        clearInterval(intervalId);
        lastUpdateTime = Date.now();
        intervalId = setInterval(() => {
            if (isTimerRunning && !isPaused) {
                const currentTime = Date.now();
                const deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds
                lastUpdateTime = currentTime;

                remainingTime -= deltaTime;
                if (remainingTime <= 0) {
                    stopCountdown();
                    alert('Countdown finished!');
                    return;
                }
                updateTimerDisplay();
                drawCountdown(); // Ensure the canvas is updated
            }
        }, 1000);
    } else {
        lastUpdateTime = Date.now();
        clearInterval(intervalId);
        animationFrameId = requestAnimationFrame(updatePiP); // Changed from updateTimer to updatePiP
    }
});

minutesInput.value = '25';
secondsInput.value = '00';
totalTime = remainingTime = 25 * 60;
updateTimerDisplay();
