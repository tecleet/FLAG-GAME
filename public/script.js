const socket = io();

// DOM Elements
const flagImage = document.getElementById('flag-image');
const countdownEl = document.getElementById('countdown');
const winnersList = document.getElementById('winners-list');
const scoreboardList = document.getElementById('scoreboard-list');
const roundStatus = document.getElementById('round-status');
const revealBar = document.getElementById('reveal-bar');
const logs = document.getElementById('system-logs');
const chatFeed = document.getElementById('chat-feed');
const overlayText = document.getElementById('overlay-text');
const connectionStatus = document.getElementById('connection-status');

// Settings Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const videoIdInput = document.getElementById('video-id-input');
const mockModeCheck = document.getElementById('mock-mode-check');
const durationSlider = document.getElementById('duration-slider');
const durationVal = document.getElementById('duration-val');
const blurSlider = document.getElementById('blur-slider');
const blurVal = document.getElementById('blur-val');

// Audio
const synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
    voices = synth.getVoices();
}

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {
    if (synth.speaking || text === '') return;
    const utterThis = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha')) || voices[0];
    utterThis.voice = voice;
    synth.speak(utterThis);
}

function addLog(message) {
    const div = document.createElement('div');
    div.textContent = `> ${new Date().toLocaleTimeString()} ${message}`;
    logs.prepend(div);
    if (logs.children.length > 20) logs.lastChild.remove();
}

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

durationSlider.addEventListener('input', (e) => {
    durationVal.textContent = `${e.target.value}s`;
});

blurSlider.addEventListener('input', (e) => {
    blurVal.textContent = e.target.value;
});

saveSettingsBtn.addEventListener('click', () => {
    const newSettings = {
        videoId: videoIdInput.value.trim(),
        mockMode: mockModeCheck.checked,
        duration: durationSlider.value,
        blurIntensity: blurSlider.value
    };

    socket.emit('updateSettings', newSettings);
    addLog('Settings updated. Applying...');
    settingsModal.classList.add('hidden');
});

socket.on('connect', () => {
    connectionStatus.textContent = 'CONNECTED';
    connectionStatus.style.color = '#0f0';
    addLog('System Online. Connected to server.');
});

socket.on('disconnect', () => {
    connectionStatus.textContent = 'DISCONNECTED';
    connectionStatus.style.color = '#f00';
    addLog('Connection lost. Attempting to reconnect...');
});

socket.on('stateUpdate', (state) => {
    updateHUD(state);

    if (settingsModal.classList.contains('hidden')) {
        syncSettings(state.settings);
    }
});

socket.on('roundStart', (data) => {
    addLog(`Round Started. Target acquired.`);
    speak("New round starting. Identify the flag.");
    overlayText.style.display = 'none';
    flagImage.classList.remove('glitch-active');
});

socket.on('roundEnd', (data) => {
    addLog(`Round Ended. Country: ${data.country.name}`);

    flagImage.style.filter = 'blur(0px)';

    if (data.winners.length > 0) {
        speak(`We have a winner! It was ${data.country.name}.`);
    } else {
        speak(`Time is up. It was ${data.country.name}. Nobody got it.`);
        flagImage.classList.add('glitch-active');
    }

    overlayText.textContent = data.country.name.toUpperCase();
    overlayText.style.display = 'block';
});

socket.on('winner', (winner) => {
    addLog(`WINNER: ${winner.username} [${winner.rank}]`);
    speak(`${winner.username} took ${winner.rank}!`);
});

socket.on('chatMessage', (data) => {
    const div = document.createElement('div');
    div.classList.add('chat-message');
    div.textContent = `${data.user}: ${data.message}`;
    chatFeed.prepend(div);
    if (chatFeed.children.length > 10) chatFeed.lastChild.remove();
});

socket.on('systemLog', (msg) => {
    addLog(msg);
});

function updateHUD(state) {
    countdownEl.textContent = `00:${state.countdown.toString().padStart(2, '0')}`;
    if (state.countdown <= 3 && state.status === 'PLAYING') {
        countdownEl.style.color = '#f00';
    } else {
        countdownEl.style.color = '#ff003c';
    }

    roundStatus.textContent = state.status;

    const intensity = state.settings.blurIntensity || 5;
    const maxBlur = 20 * (intensity / 5);

    const blurAmount = maxBlur - (state.revealLevel * (maxBlur / 5));

    if (state.status === 'PLAYING') {
        flagImage.style.filter = `blur(${Math.max(0, blurAmount)}px)`;
    } else if (state.status === 'ROUND_OVER') {
        flagImage.style.filter = 'blur(0px)';
    }

    if (state.currentCountry) {
        const code = state.currentCountry.code.toLowerCase();
        const url = `https://flagcdn.com/w640/${code}.png`;
        if (flagImage.src !== url) {
            flagImage.src = url;
        }
    }

    const progress = (state.revealLevel / 5) * 100;
    revealBar.style.width = `${progress}%`;

    renderScoreboard(state.scoreboard);

    if (state.winners.length === 0) {
        winnersList.innerHTML = '';
    } else if (winnersList.children.length !== state.winners.length) {
         for (let i = winnersList.children.length; i < state.winners.length; i++) {
             const w = state.winners[i];
             const div = document.createElement('div');
             div.classList.add('winner-entry');
             div.textContent = `${w.rank}: ${w.username}`;
             winnersList.appendChild(div);
         }
    }
}

function renderScoreboard(scoreboardData) {
    scoreboardList.innerHTML = '';
    scoreboardData.forEach((player, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span style="color:var(--primary-color)">#${index + 1}</span>
            ${player.username}
            <span style="float:right; color:var(--tertiary-color)">${player.wins} WINS</span>
        `;
        scoreboardList.appendChild(li);
    });
}

function syncSettings(settings) {
    if (!settings) return;
    if (document.activeElement !== videoIdInput) videoIdInput.value = settings.videoId || '';
    mockModeCheck.checked = settings.mockMode;
    durationSlider.value = settings.duration;
    durationVal.textContent = `${settings.duration}s`;
    blurSlider.value = settings.blurIntensity;
    blurVal.textContent = settings.blurIntensity;
}
