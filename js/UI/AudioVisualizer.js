/*
    File: js/AudioVisualizer.js
    Description: Manages the visualizer bar animations using an external AnalyserNode.
*/

let analyser, frequencyData;
let visualizerBars = [];
let isInitialized = false;
let visualizerElement;

const VIS_BAR_COUNT = 16;

/**
 * The main animation loop for the visualizer.
 */
function visualizerLoop() {
    if (isInitialized && visualizerElement.style.display === 'flex') {
        analyser.getByteFrequencyData(frequencyData);
        
        const binCount = analyser.frequencyBinCount;
        const barWidth = Math.floor(binCount / VIS_BAR_COUNT);

        for (let i = 0; i < VIS_BAR_COUNT; i++) {
            const amplitude = frequencyData[i * barWidth];
            const percent = amplitude / 255;
            const height = Math.max(5, percent * 100); 
            
            if (visualizerBars[i]) {
                visualizerBars[i].style.height = `${height}%`;
            }
        }
    }
    requestAnimationFrame(visualizerLoop);
}

/**
 * Sets up the visualizer with an existing AnalyserNode.
 * @param {AnalyserNode} analyserNode - The web audio analyser.
 * @param {HTMLElement} visElement - The container element.
 */
export function init(analyserNode, visElement) {
    if (isInitialized) return;

    analyser = analyserNode;
    visualizerElement = visElement;
    
    frequencyData = new Uint8Array(analyser.frequencyBinCount);

    // Create the visualizer bars
    visualizerElement.innerHTML = '';
    visualizerBars = [];
    for (let i = 0; i < VIS_BAR_COUNT; i++) {
        const bar = document.createElement('div');
        bar.classList.add('vis-bar');
        visualizerElement.appendChild(bar);
        visualizerBars.push(bar);
    }
    
    isInitialized = true;
    visualizerLoop();
}

export function show() {
    if (isInitialized) {
        visualizerElement.style.display = 'flex';
    }
}

export function hide() {
    if (isInitialized) {
        visualizerElement.style.display = 'none';
    }
}

export function setPaused(isPaused) {
    if (isInitialized && isPaused) {
        visualizerBars.forEach(bar => bar.style.height = '5%');
    }
}