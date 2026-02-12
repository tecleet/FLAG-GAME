const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { LiveChat } = require('youtube-chat');
const GameManager = require('./services/gameManager');
const { getRandomCountry } = require('./services/flagService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const game = new GameManager();
let liveChat = null;

async function startYouTubeListener(videoId) {
    if (liveChat) {
        liveChat.stop();
        liveChat = null;
    }

    if (!videoId) return;

    console.log(`Starting YouTube Listener for Video ID: ${videoId}`);

    try {
        liveChat = new LiveChat({ liveId: videoId });

        liveChat.on('chat', (chatItem) => {
            const username = chatItem.author.name;
            const message = chatItem.message.map(m => m.text).join('');
            game.processGuess(username, message);
            io.emit('chatMessage', { user: username, message });
        });

        liveChat.on('error', (err) => {
            console.error('YouTube Chat Error:', err);
            io.emit('systemLog', `YouTube Error: ${err.message}`);
        });

        const ok = await liveChat.start();
        if (!ok) {
            console.log("Failed to start YouTube chat listener");
            io.emit('systemLog', 'Failed to connect to YouTube Chat.');
        } else {
            console.log("YouTube Chat connected!");
            io.emit('systemLog', 'Connected to YouTube Chat.');
        }

    } catch (err) {
        console.error("Exception starting YouTube listener:", err);
        io.emit('systemLog', `Connection Error: ${err.message}`);
    }
}

io.on('connection', (socket) => {
    console.log('New client connected');
    socket.emit('stateUpdate', game.getState());

    socket.on('updateSettings', (newSettings) => {
        console.log('Received settings update:', newSettings);
        const oldVideoId = game.settings.videoId;
        game.updateSettings(newSettings);

        if (newSettings.videoId && newSettings.videoId !== oldVideoId) {
            startYouTubeListener(newSettings.videoId);
        }

        io.emit('stateUpdate', game.getState());
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

game.on('stateUpdate', (state) => {
    io.emit('stateUpdate', state);
});

game.on('roundStart', (country) => {
    io.emit('roundStart', { name: country.name });
});

game.on('roundEnd', (data) => {
    io.emit('roundEnd', data);
});

game.on('winner', (winner) => {
    io.emit('winner', winner);
});

game.start();

// Mock Chat Generator
const mockUsers = [
    'Neo', 'Trinity', 'Morpheus', 'Cipher', 'Tank', 'Dozer', 'Switch', 'Apoc', 'Mouse',
    'AgentSmith', 'Oracle', 'Sera', 'Merovingian', 'Persephone', 'Keymaker'
];

function generateMockChat() {
    if (!game.settings.mockMode) return;
    if (game.state.status !== 'PLAYING') return;

    // 30% chance to generate a message every tick
    if (Math.random() > 0.3) return;

    const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
    const roll = Math.random();

    let message = '';

    if (roll < 0.1) {
        // Correct guess (lucky)
        const chance = (game.state.revealLevel + 1) * 0.15;
        if (Math.random() < chance) {
             const code = game.state.currentCountry.code;
             const emoji = code.split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
             message = emoji;
        } else {
             const randomC = getRandomCountry();
             const emoji = randomC.code.split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
             message = emoji;
        }
    } else if (roll < 0.3) {
        const randomC = getRandomCountry();
        const emoji = randomC.code.split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
        message = emoji;
    } else {
        const texts = ['Pog', 'LUL', 'Rigged', 'What is that?', 'Blurry', 'Hype', 'Cyberpunk', 'Too hard', 'EZ'];
        message = texts[Math.floor(Math.random() * texts.length)];
    }

    if (message) {
        game.processGuess(user, message);
        io.emit('chatMessage', { user, message });
    }
}

setInterval(generateMockChat, 500);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to play`);
});
