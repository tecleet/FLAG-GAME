const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const GameManager = require('./services/gameManager');
const { getRandomCountry } = require('./services/flagService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Game Instance
const game = new GameManager();

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected');

    // Send current state to new client
    socket.emit('stateUpdate', game.getState());

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Game Events -> Broadcast
game.on('stateUpdate', (state) => {
    io.emit('stateUpdate', state);
});

game.on('roundStart', (country) => {
    io.emit('roundStart', { name: country.name }); // Don't send code? game.getState() sends it anyway.
});

game.on('roundEnd', (data) => {
    io.emit('roundEnd', data);
});

game.on('winner', (winner) => {
    io.emit('winner', winner);
});

// Start Game
game.start();

// Mock Chat Generator (Simulates YouTube Live Chat)
// In a real app, you would use 'youtube-chat' or Google API to listen to messages.
/*
const { LiveChat } = require('youtube-chat');
const liveChat = new LiveChat({ channelId: 'CHANNEL_ID' });
liveChat.on('chat', (chatItem) => {
   const username = chatItem.author.name;
   const message = chatItem.message.map(m => m.text).join('');
   game.processGuess(username, message);
});
liveChat.start();
*/

console.log('Mock Chat started. Simulating players...');

const mockUsers = [
    'Neo', 'Trinity', 'Morpheus', 'Cipher', 'Tank', 'Dozer', 'Switch', 'Apoc', 'Mouse',
    'AgentSmith', 'Oracle', 'Sera', 'Merovingian', 'Persephone', 'Keymaker'
];

function generateMockChat() {
    if (game.state.status !== 'PLAYING') return;

    // 30% chance to generate a message every tick
    if (Math.random() > 0.3) return;

    const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
    const roll = Math.random();

    let message = '';

    if (roll < 0.1) {
        // 10% chance to guess CORRECTLY (if lucky)
        // Simulate a smart user finding the flag
        // To make it realistic, they guess correctly more often when revealLevel is higher
        const chance = (game.state.revealLevel + 1) * 0.15;
        if (Math.random() < chance) {
             // Need to construct the emoji from the code
             const code = game.state.currentCountry.code;
             const emoji = code.split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
             message = emoji;
        } else {
             // Guess a random wrong flag
             const randomC = getRandomCountry();
             const emoji = randomC.code.split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
             message = emoji;
        }
    } else if (roll < 0.3) {
        // 20% chance to guess a random flag
        const randomC = getRandomCountry();
        const emoji = randomC.code.split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
        message = emoji;
    } else {
        // 70% chance to say random text
        const texts = ['Pog', 'LUL', 'Rigged', 'What is that?', 'Blurry', 'Hype', 'Cyberpunk', 'Too hard', 'EZ'];
        message = texts[Math.floor(Math.random() * texts.length)];
    }

    if (message) {
        // console.log(`[Chat] ${user}: ${message}`);
        game.processGuess(user, message);

        // Also emit chat to frontend for visual effect (optional)
        io.emit('chatMessage', { user, message });
    }
}

setInterval(generateMockChat, 500); // Check every 500ms

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to play`);
});
