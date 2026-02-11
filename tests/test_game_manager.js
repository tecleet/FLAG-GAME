const GameManager = require('../services/gameManager');

const game = new GameManager();
let tickCount = 0;

console.log('Testing Game Manager...');

game.on('stateUpdate', (state) => {
    console.log(`State update: ${state.status}, Countdown: ${state.countdown}, Reveal: ${state.revealLevel}`);
    if (state.status === 'ROUND_OVER') {
        console.log('Round Over!');
        console.log('Winners:', state.winners);
        console.log('Scoreboard:', state.scoreboard);
        process.exit(0);
    }
});

game.on('roundStart', (country) => {
    console.log(`Round started: ${country.name}`);

    // Simulate guesses
    setTimeout(() => {
        console.log('User1 guesses correctly');
        game.processGuess('User1', `Flag is ${country.code}`); // Should extract code?
        // Wait, extractFirstFlag expects emoji, not code text.
        // My mock guess needs to be an emoji.
        // I need to convert code back to emoji for the test.
        // Or I can just patch `extractFirstFlag` or modify test.
        // Let's use `emojiToIso` logic in reverse or just hardcode if we know the country.
        // But country is random.

        // I'll update the test to use `country-code-emoji` to generate emoji for the random country.
        // Or just implement `isoToEmoji`.
    }, 2000);
});

// Since I can't easily generate emoji from code without the library (which I haven't implemented in `flagService`),
// I will implement `isoToEmoji` in the test script for convenience.
function isoToEmoji(code) {
    return code.split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}

// Override the processGuess call in the test above
game.on('roundStart', (country) => {
    console.log(`Round started: ${country.name} (${country.code})`);
    const flagEmoji = isoToEmoji(country.code);

    setTimeout(() => {
        console.log(`User1 guesses: ${flagEmoji}`);
        game.processGuess('User1', `I think it is ${flagEmoji}`);
    }, 2000);

    setTimeout(() => {
        console.log(`User2 guesses wrong: 🏁`);
        game.processGuess('User2', `It is 🏁`);
    }, 4000);

    setTimeout(() => {
        console.log(`User3 guesses: ${flagEmoji}`);
        game.processGuess('User3', `${flagEmoji} is the answer`);
    }, 6000);
});

game.start();

// Run for 15 seconds to cover a full round (10s) + end delay
setTimeout(() => {
    console.log('Test timed out');
    process.exit(1);
}, 15000);
