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
    if (synth.speaking) {
        console.error('speechSynthesis.speaking');
        return;
    }
    if (text !== '') {
        const utterThis = new SpeechSynthesisUtterance(text);
        utterThis.onend = function (event) {
            // console.log('SpeechSynthesisUtterance.onend');
        }
        utterThis.onerror = function (event) {
            console.error('SpeechSynthesisUtterance.onerror');
        }

        // Select a futuristic voice if available (e.g., Google US English, or similar)
        // We prefer a female voice for the "System AI" feel.
        const voice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha')) || voices[0];
        utterThis.voice = voice;
        utterThis.pitch = 1;
        utterThis.rate = 1;
        synth.speak(utterThis);
    }
}

function addLog(message) {
    const div = document.createElement('div');
    div.textContent = `> ${new Date().toLocaleTimeString()} ${message}`;
    logs.prepend(div);
    if (logs.children.length > 20) logs.lastChild.remove();
}

// Socket Events
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
});

socket.on('roundStart', (data) => {
    addLog(`Round Started. Target acquired.`);
    speak("New round starting. Identify the flag.");
    overlayText.style.display = 'none';
    flagImage.classList.remove('glitch-active');
});

socket.on('roundEnd', (data) => {
    addLog(`Round Ended. Country: ${data.country.name}`);

    // Reveal fully
    flagImage.style.filter = 'blur(0px)';

    // Announce
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

function updateHUD(state) {
    // Timer
    countdownEl.textContent = `00:${state.countdown.toString().padStart(2, '0')}`;
    if (state.countdown <= 3 && state.status === 'PLAYING') {
        countdownEl.style.color = '#f00';
    } else {
        countdownEl.style.color = '#ff003c';
    }

    // Status
    roundStatus.textContent = state.status;

    // Flag Blur
    // Map revealLevel (0-5) to blur (20px - 0px)
    // Level 0: 20px
    // Level 5: 0px
    const maxBlur = 20;
    const blurAmount = maxBlur - (state.revealLevel * (maxBlur / 5));
    if (state.status === 'PLAYING') {
        flagImage.style.filter = `blur(${Math.max(0, blurAmount)}px)`;
    } else if (state.status === 'ROUND_OVER') {
        flagImage.style.filter = 'blur(0px)';
    }

    // Flag Image
    if (state.currentCountry) {
        const code = state.currentCountry.code.toLowerCase();
        const url = `https://flagcdn.com/w640/${code}.png`;
        if (flagImage.src !== url) {
            flagImage.src = url;
        }
    }

    // Reveal Bar
    const progress = (state.revealLevel / 5) * 100;
    revealBar.style.width = `${progress}%`;

    // Scoreboard
    renderScoreboard(state.scoreboard);

    // Winners List (for current round)
    if (state.winners.length === 0) {
        winnersList.innerHTML = '';
    } else if (winnersList.children.length !== state.winners.length) {
         // Append missing
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
