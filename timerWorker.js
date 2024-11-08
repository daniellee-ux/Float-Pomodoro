let intervalId = null;
let remainingTime = 0;
let isPaused = false;

function updateTimer() {
    if (!isPaused && remainingTime > 0) {
        remainingTime--;
        self.postMessage({ remainingTime });
        
        if (remainingTime <= 0) {
            clearInterval(intervalId);
            self.postMessage({ finished: true });
        }
    }
}

self.onmessage = function(e) {
    switch (e.data.action) {
        case 'start':
            // Initialize new timer
            remainingTime = e.data.time;
            isPaused = false;
            
            // Clear any existing interval and start new one
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(updateTimer, 1000);
            break;
            
        case 'pause':
            // Just set pause flag, keep interval running
            isPaused = true;
            break;
            
        case 'resume':
            // Just remove pause flag, interval is still running
            isPaused = false;
            break;
            
        case 'stop':
            // Clean up
            isPaused = false;
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            break;
    }
};
