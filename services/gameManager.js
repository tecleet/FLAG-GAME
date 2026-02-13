const EventEmitter = require('events');
const { getRandomCountry, extractFirstFlag, textToIso } = require('./flagService');

class GameManager extends EventEmitter {
    constructor() {
        super();
        this.settings = {
            duration: 10,
            blurIntensity: 5,
            mockMode: true,
            videoId: '',
            streamLatency: 25
        };

        this.state = {
            status: 'WAITING',
            currentCountry: null,
            revealLevel: 0,
            countdown: 10,
            winners: [],
            scoreboard: {},
            settings: this.settings,
            activeGuessing: false
        };

        this.roundCount = 0;
        this.visualDuration = this.settings.duration;
        this.totalRoundDuration = this.visualDuration + this.settings.streamLatency;
        this.blurInterval = 2;
        this.timers = {};
    }

    start() { this.startRound(); }

    updateSettings(newSettings) {
        if (newSettings.duration) {
            this.settings.duration = parseInt(newSettings.duration);
        }
        if (newSettings.blurIntensity) this.settings.blurIntensity = parseInt(newSettings.blurIntensity);
        if (newSettings.mockMode !== undefined) this.settings.mockMode = newSettings.mockMode;
        if (newSettings.videoId !== undefined) this.settings.videoId = newSettings.videoId;
        if (newSettings.streamLatency !== undefined) this.settings.streamLatency = parseInt(newSettings.streamLatency);

        // Recalculate durations immediately so tests/logic see the new values
        this.visualDuration = this.settings.duration;
        this.totalRoundDuration = this.visualDuration + this.settings.streamLatency;

        this.state.settings = this.settings;
        this.emitStateUpdate();
        this.emit('settingsUpdated', this.settings);
    }

    startRound() {
        this.clearTimers();
        const country = getRandomCountry();
        this.state.currentCountry = country;
        this.state.status = 'PLAYING';
        this.state.revealLevel = 0;

        // Duration logic
        this.visualDuration = this.settings.duration;
        this.totalRoundDuration = this.visualDuration + this.settings.streamLatency;

        // Countdown is purely visual (for the HUD)
        this.state.countdown = this.visualDuration;

        this.blurInterval = Math.max(1, Math.floor(this.visualDuration / 5));

        this.state.winners = [];
        this.state.activeGuessing = true;
        this.roundCount++;

        console.log(`Starting round ${this.roundCount}: ${country.name} (${country.code}). Total duration: ${this.totalRoundDuration}s (Visual: ${this.visualDuration}s + Latency: ${this.settings.streamLatency}s)`);

        this.emitStateUpdate();
        this.emit('roundStart', country);

        // Round Timer (Total Duration)
        let elapsedTotal = 0;

        this.timers.tick = setInterval(() => {
            elapsedTotal++;

            // Visual Countdown logic
            if (this.state.countdown > 0) {
                this.state.countdown--;
            } else {
                // Visual countdown ended, but round continues for latency
            }

            // Blur Logic (Only during visual phase)
            if (elapsedTotal <= this.visualDuration) {
                if (elapsedTotal % this.blurInterval === 0 && this.state.revealLevel < 5) {
                    this.state.revealLevel++;
                }
            }

            this.emitStateUpdate();

            // End Condition
            if (elapsedTotal >= this.totalRoundDuration) {
                this.endRound();
            }
        }, 1000);
    }

    endRound() {
        this.clearTimers();
        this.state.status = 'ROUND_OVER';
        this.state.activeGuessing = false;
        this.state.revealLevel = 5;

        // Streak logic
        const winnersUsernames = new Set(this.state.winners.map(w => w.username));
        for (const username in this.state.scoreboard) {
            if (this.state.scoreboard[username].streak > 0 && !winnersUsernames.has(username)) {
                this.state.scoreboard[username].streak = 0;
            }
        }

        this.emitStateUpdate();
        this.emit('roundEnd', { country: this.state.currentCountry, winners: this.state.winners });

        // Wait before next round
        this.timers.nextRound = setTimeout(() => { this.startRound(); }, 5000);
    }

    clearTimers() {
        if (this.timers.tick) clearInterval(this.timers.tick);
        if (this.timers.nextRound) clearTimeout(this.timers.nextRound);
    }

    processGuess(username, text) {
        if (!this.state.activeGuessing) return;
        if (this.state.winners.find(w => w.username === username)) return;

        // 1. Try Emoji
        let guessedIso = extractFirstFlag(text);

        // 2. Try Text
        if (!guessedIso) {
            guessedIso = textToIso(text);
        }

        if (guessedIso) {
            this.handleGuessResult(username, guessedIso);
        }
    }

    handleGuessResult(username, guessedIso) {
        if (!guessedIso) return;

        if (guessedIso === this.state.currentCountry.code) {
            const rankIndex = this.state.winners.length;
            let rank = 'Participant';
            if (rankIndex === 0) rank = 'Gold';
            else if (rankIndex === 1) rank = 'Silver';
            else if (rankIndex === 2) rank = 'Bronze';

            const winner = { username, rank, countryCode: guessedIso, timestamp: Date.now() };
            this.state.winners.push(winner);
            this.updateScoreboard(username, true);
            this.emit('winner', winner);
            this.emitStateUpdate();
        }
    }

    updateScoreboard(username, isWin) {
        if (!this.state.scoreboard[username]) this.state.scoreboard[username] = { wins: 0, streak: 0, totalCorrect: 0, lastWinRound: 0 };
        const stats = this.state.scoreboard[username];
        if (isWin) { stats.wins++; stats.streak++; stats.totalCorrect++; stats.lastWinRound = this.roundCount; }
    }

    emitStateUpdate() { this.emit('stateUpdate', this.getState()); }

    getState() {
        const sortedScoreboard = Object.entries(this.state.scoreboard)
            .map(([username, stats]) => ({ username, ...stats }))
            .sort((a, b) => b.wins - a.wins || b.streak - a.streak).slice(0, 5);
        return {
            status: this.state.status, currentCountry: this.state.currentCountry,
            revealLevel: this.state.revealLevel, countdown: this.state.countdown,
            winners: this.state.winners, scoreboard: sortedScoreboard, settings: this.settings,
            visualDuration: this.visualDuration,
            totalDuration: this.totalRoundDuration
        };
    }
}

module.exports = GameManager;
