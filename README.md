# Flag Reveal: Emoji Rush — 2077 Edition

A real-time YouTube Live interactive game where viewers guess mystery flags using emojis. Fully automated with a Cyberpunk 2077 aesthetic.

## Features

- **Automated Game Loop**: Random country selection, countdown, blur reveal, and winners detection.
- **YouTube Live Integration**: Connects to real YouTube Live chat via Video ID.
- **Cyberpunk HUD**: Futuristic UI with neon effects, glitch animations, and AI announcer.
- **Interactive Settings**: Configure Round Duration, Blur Difficulty, and Mock Mode via the "CONFIG" button in the HUD.
- **Leaderboard**: Persistent tracking of top players and win streaks.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Server**:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

## YouTube Integration

To play with real YouTube Live Chat:

1. Start a YouTube Live stream (or find an active one).
2. Copy the **Video ID** from the URL (e.g., in `youtube.com/watch?v=dQw4w9WgXcQ`, the ID is `dQw4w9WgXcQ`).
3. In the game HUD, click **CONFIG**.
4. Enter the **Video ID**.
5. Uncheck **MOCK MODE**.
6. Click **APPLY CHANGES**.

The system will connect to the chat and listen for flag emojis.

## Game Rules

1. A blurred flag appears on screen.
2. Viewers must type the correct flag emoji (e.g., 🇺🇸, 🇫🇷, 🇯🇵) in the chat.
3. The flag becomes clearer over time.
4. The first 3 correct guessers win Gold, Silver, and Bronze ranks.
5. Points are tracked on the leaderboard.

## Tech Stack

- **Backend**: Node.js, Express, Socket.io, youtube-chat
- **Frontend**: HTML5, CSS3 (Animations), Vanilla JS, Text-to-Speech API
- **Data**: `iso-3166-1` for country validation.

## License

MIT
