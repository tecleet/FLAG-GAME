const EventEmitter = require('events');
const { getRandomCountry, extractFirstFlag } = require('./flagService');

class GameManager extends EventEmitter {
    constructor() {
        super();
        this.settings = { duration: 10, blurIntensity: 5, mockMode: true, videoId: '' };
        this.state = {
            status: 'WAITING', currentCountry: null, revealLevel: 0, countdown: 10,
            winners: [], scoreboard: {}, settings: this.settings
        };
        this.roundCount = 0;
        this.roundDuration = this.settings.duration;
        this.blurInterval = 2;
        this.timers = {};
    }

    start() { this.startRound(); }

    updateSettings(newSettings) {
        if (newSettings.duration) {
            this.settings.duration = parseInt(newSettings.duration);
            this.roundDuration = this.settings.duration;
        }
        if (newSettings.blurIntensity) this.settings.blurIntensity = parseInt(newSettings.blurIntensity);
        if (newSettings.mockMode !== undefined) this.settings.mockMode = newSettings.mockMode;
        if (newSettings.videoId !== undefined) this.settings.videoId = newSettings.videoId;

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
        this.state.countdown = this.settings.duration;
        this.roundDuration = this.settings.duration;
        this.blurInterval = Math.max(1, Math.floor(this.roundDuration / 5));
        this.state.winners = [];
        this.roundCount++;

        console.log(`Starting round ${this.roundCount}: ${country.name} (${country.code})`);
        this.emitStateUpdate();
        this.emit('roundStart', country);

        this.timers.tick = setInterval(() => {
            this.state.countdown--;
            const elapsed = this.roundDuration - this.state.countdown;
            if (elapsed > 0 && elapsed % this.blurInterval === 0) {
                 if (this.state.revealLevel < 5) this.state.revealLevel++;
            }
            this.emitStateUpdate();
            if (this.state.countdown <= 0) this.endRound();
        }, 1000);
    }

    endRound() {
        this.clearTimers();
        this.state.status = 'ROUND_OVER';
        this.state.revealLevel = 5;

        const winnersUsernames = new Set(this.state.winners.map(w => w.username));
        for (const username in this.state.scoreboard) {
            if (this.state.scoreboard[username].streak > 0 && !winnersUsernames.has(username)) {
                this.state.scoreboard[username].streak = 0;
            }
        }
        this.emitStateUpdate();
        this.emit('roundEnd', { country: this.state.currentCountry, winners: this.state.winners });
        this.timers.nextRound = setTimeout(() => { this.startRound(); }, 5000);
    }

    clearTimers() {
        if (this.timers.tick) clearInterval(this.timers.tick);
        if (this.timers.nextRound) clearTimeout(this.timers.nextRound);
    }

    processGuess(username, text) {
        if (this.state.status !== 'PLAYING') return;
        if (this.state.winners.find(w => w.username === username)) return;

        const guessedIso = extractFirstFlag(text);
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
            winners: this.state.winners, scoreboard: sortedScoreboard, settings: this.settings
        };
    }
}

module.exports = GameManager;
