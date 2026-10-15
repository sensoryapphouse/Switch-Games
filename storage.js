// Preferences must never prevent a child from opening or playing a game.
const storage = {
    read(key, fallback = null) {
        try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); }
        catch { return fallback; }
    },
    write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch { return false; }
    }
};
