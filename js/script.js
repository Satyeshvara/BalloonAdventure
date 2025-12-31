const START_TIME = new Date("January 1, 2026 00:00:00 GMT+0530").getTime();
const END_TIME = new Date("January 1, 2026 12:00:00 GMT+0530").getTime();

const DURATION_MS = END_TIME - START_TIME;

const progressValueElement = document.getElementById("progress-value");

function updateDeploymentProgress() {
    const now = Date.now();

    if (now < START_TIME) {
        progressValueElement.textContent = "0.00%";
        return;
    }

    if (now >= END_TIME) {
        progressValueElement.textContent = "100.00%";
        clearInterval(progressInterval);
        return;
    }

    const elapsed = now - START_TIME;
    const percentage = (elapsed / DURATION_MS) * 100;
    progressValueElement.textContent = percentage.toFixed(2) + "%";
}

updateDeploymentProgress();
const progressInterval = setInterval(updateDeploymentProgress, 100);