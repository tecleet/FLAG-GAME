const EventEmitter = require('events');
const { getRandomCountry, extractFirstFlag } = require('./flagService');

class GameManager extends EventEmitter {
    constructor() {
        super();
        this.state = {
            status: 'WAITING', // WAITING, PLAYING, ROUND_OVER
            currentCountry: null, // { code, name }
            revealLevel: 0, // 0 = most blurred, 5 = clear
            countdown: 10,
            winners: [], // { username, rank: 'Gold'|'Silver'|'Bronze', countryCode }
            scoreboard: {} // { username: { wins: 0, streak: 0, totalCorrect: 0, lastWinRound: 0 } }
        };

        this.roundCount = 0;
        this.roundDuration = 10; // seconds
        this.blurInterval = 2; // seconds
        this.timers = {};
    }

    start() {
        this.startRound();
    }

    startRound() {
        this.clearTimers();

        const country = getRandomCountry();
        this.state.currentCountry = country;
        this.state.status = 'PLAYING';
        this.state.revealLevel = 0;
        this.state.countdown = this.roundDuration;
        this.state.winners = [];
        this.roundCount++;

        console.log(`Starting round ${this.roundCount}: ${country.name} (${country.code})`);
        this.emitStateUpdate();
        this.emit('roundStart', country);

        // Game Loop Tick (1s)
        this.timers.tick = setInterval(() => {
            this.state.countdown--;

            // Increase reveal level every 2 seconds
            // 10, 8, 6, 4, 2 -> Reveal level 0, 1, 2, 3, 4
            // Max level 5
            const elapsed = this.roundDuration - this.state.countdown;
            if (elapsed > 0 && elapsed % this.blurInterval === 0) {
                 if (this.state.revealLevel < 5) {
                     this.state.revealLevel++;
                 }
            }

            this.emitStateUpdate();

            if (this.state.countdown <= 0) {
                this.endRound();
            }
        }, 1000);
    }

    endRound() {
        this.clearTimers();
        this.state.status = 'ROUND_OVER';
        this.state.revealLevel = 5; // Fully revealed

        // Update streaks: Reset streaks for anyone who didn't win this round?
        // That seems too harsh if thousands are playing.
        // Let's stick to "Win Streaks" as consecutive wins.
        // If a user has a streak > 0 but didn't win this round, reset it.
        // Actually, maybe only reset if they participated?
        // For simplicity: If you have a streak, you must win to keep it.
        // Iterate over all users in scoreboard with streak > 0.
        // If not in this.state.winners, streak = 0.

        const winnersUsernames = new Set(this.state.winners.map(w => w.username));
        for (const username in this.state.scoreboard) {
            if (this.state.scoreboard[username].streak > 0 && !winnersUsernames.has(username)) {
                this.state.scoreboard[username].streak = 0;
            }
        }

        this.emitStateUpdate();
        this.emit('roundEnd', {
            country: this.state.currentCountry,
            winners: this.state.winners
        });

        console.log(`Round ended. Winners: ${this.state.winners.length}`);

        // Start next round after delay
        this.timers.nextRound = setTimeout(() => {
            this.startRound();
        }, 5000);
    }

    clearTimers() {
        if (this.timers.tick) clearInterval(this.timers.tick);
        if (this.timers.nextRound) clearTimeout(this.timers.nextRound);
    }

    processGuess(username, text) {
        if (this.state.status !== 'PLAYING') return;

        // Check if user already won this round
        if (this.state.winners.find(w => w.username === username)) return;

        const guessedIso = extractFirstFlag(text);
        if (!guessedIso) return;

        // Compare codes (case insensitive)
        if (guessedIso === this.state.currentCountry.code) {
            // Correct guess
            const rankIndex = this.state.winners.length;
            let rank = 'Participant';
            if (rankIndex === 0) rank = 'Gold';
            else if (rankIndex === 1) rank = 'Silver';
            else if (rankIndex === 2) rank = 'Bronze';

            // Only top 3 get ranks? Or everyone gets credit?
            // "1st = Gold, 2nd = Silver, 3rd = Bronze".
            // Others are just correct guesses?
            // "Show winners on screen". Usually limited to top 3.

            const winner = {
                username,
                rank,
                countryCode: guessedIso,
                timestamp: Date.now()
            };

            this.state.winners.push(winner);
            this.updateScoreboard(username, true);

            this.emit('winner', winner);
            this.emitStateUpdate();

            // If 3 winners found, maybe we don't end round immediately but let others guess?
            // Or maybe we do.
            // Let's just let the time run out.
        }
    }

    updateScoreboard(username, isWin) {
        if (!this.state.scoreboard[username]) {
            this.state.scoreboard[username] = { wins: 0, streak: 0, totalCorrect: 0, lastWinRound: 0 };
        }

        const stats = this.state.scoreboard[username];
        if (isWin) {
            stats.wins++; // Total correct guesses (wins)
            stats.streak++;
            stats.totalCorrect++;
            stats.lastWinRound = this.roundCount;
        }
    }

    emitStateUpdate() {
        this.emit('stateUpdate', this.getState());
    }

    getState() {
        // Return a safe copy of state
        // We need to transform the scoreboard into a sorted list for the frontend
        const sortedScoreboard = Object.entries(this.state.scoreboard)
            .map(([username, stats]) => ({ username, ...stats }))
            .sort((a, b) => b.wins - a.wins || b.streak - a.streak) // Sort by wins, then streak
            .slice(0, 5); // Top 5

        return {
            status: this.state.status,
            currentCountry: this.state.currentCountry, // In production, hide this if strictly anti-cheat
            revealLevel: this.state.revealLevel,
            countdown: this.state.countdown,
            winners: this.state.winners,
            scoreboard: sortedScoreboard
        };
    }
}

module.exports = GameManager;
