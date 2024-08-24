let intervalId;
let remainingTime;

self.onmessage = function(e) {
  if (e.data.action === 'start') {
    remainingTime = e.data.time;
    clearInterval(intervalId);
    intervalId = setInterval(() => {
      remainingTime--;
      self.postMessage({ remainingTime });
      if (remainingTime <= 0) {
        clearInterval(intervalId);
        self.postMessage({ finished: true });
      }
    }, 1000);
  } else if (e.data.action === 'stop') {
    clearInterval(intervalId);
  } else if (e.data.action === 'pause') {
    clearInterval(intervalId);
  } else if (e.data.action === 'resume') {
    clearInterval(intervalId);
    intervalId = setInterval(() => {
      remainingTime--;
      self.postMessage({ remainingTime });
      if (remainingTime <= 0) {
        clearInterval(intervalId);
        self.postMessage({ finished: true });
      }
    }, 1000);
  }
};
