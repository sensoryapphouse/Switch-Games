// ============================================
// SWITCH GAMES - Core Engine
// ============================================

let audioContext = null;

function initAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!settings.soundEnabled || !audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain); gain.connect(audioContext.destination);
    
    const t = audioContext.currentTime;
    switch(type) {
        case 'shoot': osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
            gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(); osc.stop(t + 0.1); break;
        case 'hit': osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
            gain.gain.setValueAtTime(0.4, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(); osc.stop(t + 0.15); break;
        case 'score': osc.frequency.setValueAtTime(523, t); osc.frequency.setValueAtTime(659, t + 0.1); osc.frequency.setValueAtTime(784, t + 0.2);
            gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            osc.start(); osc.stop(t + 0.3); break;
        case 'gameover': osc.frequency.setValueAtTime(400, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.5);
            gain.gain.setValueAtTime(0.5, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.start(); osc.stop(t + 0.5); break;
        case 'move': osc.frequency.setValueAtTime(200, t); gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05); osc.start(); osc.stop(t + 0.05); break;
        case 'jump': osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
            gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(); osc.stop(t + 0.1); break;
        case 'beep': osc.frequency.setValueAtTime(440, t); gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1); osc.start(); osc.stop(t + 0.1); break;
        case 'low': osc.frequency.setValueAtTime(220, t); gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2); osc.start(); osc.stop(t + 0.2); break;
        case 'high': osc.frequency.setValueAtTime(880, t); gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2); osc.start(); osc.stop(t + 0.2); break;
        case 'fanfare':
            osc.frequency.setValueAtTime(523, t); osc.frequency.setValueAtTime(659, t + 0.12);
            osc.frequency.setValueAtTime(784, t + 0.24); osc.frequency.setValueAtTime(1047, t + 0.36);
            osc.frequency.setValueAtTime(784, t + 0.5); osc.frequency.setValueAtTime(1047, t + 0.62);
            gain.gain.setValueAtTime(0.35, t); gain.gain.setValueAtTime(0.35, t + 0.7);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);
            osc.start(); osc.stop(t + 1.0); break;
    }
}

let currentGame = null, gameLoop = null, canvas, ctx, currentGameType = null;
const settings = {
    speed: 5, soundEnabled: true,
    scanMode: 'step',   // menu switch access: 'off' | 'step' (right=move, left=select) | 'auto' (timed highlight, any switch selects)
    scanSpeed: 1500,    // ms per highlight step in auto mode
    debounce: 0,        // ms to ignore repeat presses (tremor filter), 0 = off
    practiceMode: false // games never end: crash re-starts the round, score kept
};
const switchModeSettings = {}; // Stores per-game switch mode: { 'snake': 1, 'breakout': 2, ... }
const gameSpeedSettings = {};  // Stores per-game speed override: { 'snake': 3, ... }
const highScores = {};         // Stores per-game best score: { 'snake': 120, ... }
const input = { left: false, right: false, leftPressed: false, rightPressed: false };

// Pagination
let currentPage = 0;
const gamesPerPage = 6;
const allGames = [
    { id: 'space-invaders', name: 'SPACE INVADERS', icon: 'space-invaders-icon' },
    { id: 'snake', name: 'SNAKEY', icon: 'snake-icon' },
    { id: 'breakout', name: 'BREAKOUT', icon: 'breakout-icon' },
    { id: 'bubble-shooter', name: 'BUBBLE SHOOT', icon: 'bubble-icon' },
    { id: 'tetris', name: 'TETRIS', icon: 'tetris-icon' },
    { id: 'pong', name: 'PONG', icon: 'pong-icon' },
    { id: 'flappy', name: 'FLAPPY BIRD', icon: 'flappy-icon' },
    { id: 'dino', name: 'DINO RUNNER', icon: 'dino-icon' },
    { id: 'helicopter', name: 'HELICOPTER', icon: 'helicopter-icon' },
    { id: 'rhythm', name: 'RHYTHM', icon: 'rhythm-icon' },
    { id: 'tank', name: 'TANK BATTLE', icon: 'tank-icon' },
    { id: 'asteroids', name: 'ASTEROIDS', icon: 'asteroids-icon' },
    { id: 'skiing', name: 'SKIING', icon: 'skiing-icon' },
    { id: 'balance', name: 'BALANCE', icon: 'balance-icon' },
    { id: 'simon', name: 'SIMON SAYS', icon: 'simon-icon' },
    { id: 'whack', name: 'WHACK-A-MOLE', icon: 'whack-icon' },
    { id: 'airhockey', name: 'AIR HOCKEY', icon: 'airhockey-icon' },
    { id: 'lander', name: 'LUNAR LANDER', icon: 'lander-icon' },
    { id: 'fruit', name: 'FRUIT NINJA', icon: 'fruit-icon' },
    { id: 'stack', name: 'STACK TOWER', icon: 'stack-icon' },
    { id: 'penalty', name: 'PENALTY KICK', icon: 'penalty-icon' },
    { id: 'pinball', name: 'PINBALL', icon: 'pinball-icon' },
    { id: 'brickbuilder', name: 'BRICK BUILDER', icon: 'brickbuilder-icon' },
    { id: 'spacedodge', name: 'SPACE DODGE', icon: 'spacedodge-icon' },
    { id: 'wireloop', name: 'WIRE LOOP', icon: 'wireloop-icon' },
];

function getTotalPages() {
    return Math.ceil(allGames.length / gamesPerPage);
}

function renderPage() {
    const grid = document.getElementById('games-grid');
    grid.innerHTML = '';
    
    const start = currentPage * gamesPerPage;
    const end = Math.min(start + gamesPerPage, allGames.length);
    
    for (let i = start; i < end; i++) {
        const game = allGames[i];
        const btn = document.createElement('button');
        btn.className = 'game-button';
        btn.dataset.game = game.id;
        const gameName = typeof getGameName === 'function' ? getGameName(game.id) : game.name;
        btn.innerHTML = `<div class="game-icon ${game.icon}"></div><span class="game-label">${gameName}</span>`;
        btn.addEventListener('click', () => { initAudio(); startGame(game.id); });
        grid.appendChild(btn);
    }
    
    // Update navigation buttons
    document.getElementById('prev-page-btn').disabled = currentPage === 0;
    document.getElementById('next-page-btn').disabled = currentPage >= getTotalPages() - 1;
    
    // Update page indicator
    const indicator = document.getElementById('page-indicator');
    indicator.innerHTML = '';
    for (let i = 0; i < getTotalPages(); i++) {
        const dot = document.createElement('div');
        dot.className = 'page-dot' + (i === currentPage ? ' active' : '');
        dot.addEventListener('click', () => { currentPage = i; renderPage(); playSound('move'); });
        indicator.appendChild(dot);
    }
    
    // Reset gamepad selection
    gamepadMenuIndex = 0;
    const buttons = document.querySelectorAll('.game-button');
    if (buttons.length > 0) updateMenuFocus(buttons);
    // Reset switch scanning to the first tile
    scanIndex = 0;
    applyScanFocus();
}

function nextPage() {
    if (currentPage < getTotalPages() - 1) {
        currentPage++;
        renderPage();
        playSound('move');
    }
}

function prevPage() {
    if (currentPage > 0) {
        currentPage--;
        renderPage();
        playSound('move');
    }
}

function loadSettings() {
    const s = localStorage.getItem('switchGameSettings');
    if (s) {
        const p = JSON.parse(s);
        settings.speed = p.speed || 5;
        settings.soundEnabled = p.soundEnabled !== false;
        if (['off', 'step', 'auto'].includes(p.scanMode)) settings.scanMode = p.scanMode;
        if (p.scanSpeed >= 500 && p.scanSpeed <= 4000) settings.scanSpeed = p.scanSpeed;
        if (p.debounce >= 0 && p.debounce <= 1000) settings.debounce = p.debounce;
        settings.practiceMode = p.practiceMode === true;
    }
    const sm = localStorage.getItem('switchModeSettings');
    if (sm) { Object.assign(switchModeSettings, JSON.parse(sm)); }
    const gs = localStorage.getItem('switchGameSpeeds');
    if (gs) { Object.assign(gameSpeedSettings, JSON.parse(gs)); }
    const hs = localStorage.getItem('switchGameHighScores');
    if (hs) { Object.assign(highScores, JSON.parse(hs)); }
}
function saveSettings() { localStorage.setItem('switchGameSettings', JSON.stringify(settings)); }
function saveSwitchModeSettings() { localStorage.setItem('switchModeSettings', JSON.stringify(switchModeSettings)); }
function getSwitchMode(gameType) { return switchModeSettings[gameType] || 2; }
function setSwitchMode(gameType, mode) { switchModeSettings[gameType] = mode; saveSwitchModeSettings(); }
function getGameSpeed(gameType) { return gameSpeedSettings[gameType] || settings.speed; }
function setGameSpeed(gameType, speed) { gameSpeedSettings[gameType] = speed; localStorage.setItem('switchGameSpeeds', JSON.stringify(gameSpeedSettings)); }
function getHighScore(gameType) { return highScores[gameType] || 0; }
function setHighScore(gameType, score) { highScores[gameType] = score; localStorage.setItem('switchGameHighScores', JSON.stringify(highScores)); }

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadLanguage();
    document.getElementById('speed-slider').value = settings.speed;
    document.getElementById('sound-toggle').checked = settings.soundEnabled;
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    setupEventListeners(); setupGamepad(); resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Language selector
    document.getElementById('language-select').addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });
    
    // Instructions settings toggle
    document.getElementById('instructions-settings-btn').addEventListener('click', () => {
        const panel = document.getElementById('instructions-settings-panel');
        const btn = document.getElementById('instructions-settings-btn');
        panel.classList.toggle('hidden');
        btn.classList.toggle('active');
    });
    
    // Instructions close button - return to main menu
    document.getElementById('instructions-close-btn').addEventListener('click', () => {
        document.getElementById('instructions').classList.add('hidden');
        pendingGameType = null;
    });
    
    // Instructions settings - sync with main settings
    document.getElementById('instructions-speed-slider').addEventListener('input', e => {
        settings.speed = parseInt(e.target.value);
        document.getElementById('speed-slider').value = settings.speed;
        saveSettings();
        if (pendingGameType) setGameSpeed(pendingGameType, settings.speed);
    });
    
    document.getElementById('instructions-sound-toggle').addEventListener('change', e => {
        settings.soundEnabled = e.target.checked;
        document.getElementById('sound-toggle').checked = settings.soundEnabled;
        saveSettings();
    });
    
    // Menu settings panel (scan mode, scan speed, debounce, practice mode)
    document.getElementById('menu-settings-btn').addEventListener('click', () => {
        document.getElementById('menu-settings-panel').classList.toggle('hidden');
    });
    const scanRadios = document.querySelectorAll('input[name="scan-mode"]');
    scanRadios.forEach(r => {
        r.checked = (r.value === settings.scanMode);
        r.addEventListener('change', () => {
            settings.scanMode = r.value; saveSettings();
            scanIndex = 0; applyScanFocus(); ensureAutoScanTimer();
        });
    });
    const scanSpeedSlider = document.getElementById('scan-speed-slider');
    scanSpeedSlider.value = settings.scanSpeed;
    scanSpeedSlider.addEventListener('input', e => {
        settings.scanSpeed = parseInt(e.target.value); saveSettings(); ensureAutoScanTimer();
    });
    const debounceSlider = document.getElementById('debounce-slider');
    debounceSlider.value = settings.debounce;
    debounceSlider.addEventListener('input', e => {
        settings.debounce = parseInt(e.target.value); saveSettings();
    });
    const practiceToggle = document.getElementById('practice-toggle');
    practiceToggle.checked = settings.practiceMode;
    practiceToggle.addEventListener('change', e => {
        settings.practiceMode = e.target.checked; saveSettings();
    });
    ensureAutoScanTimer();

    // Initialize pagination
    renderPage();
    document.getElementById('prev-page-btn').addEventListener('click', prevPage);
    document.getElementById('next-page-btn').addEventListener('click', nextPage);
    
    // Start menu gamepad polling
    function pollMenuGamepad() {
        const mainMenu = document.getElementById('main-menu');
        const gameOver = document.getElementById('game-over');
        const instructions = document.getElementById('instructions');
        if (mainMenu.classList.contains('active') || !gameOver.classList.contains('hidden') || !instructions.classList.contains('hidden')) {
            pollGamepad();
        }
        requestAnimationFrame(pollMenuGamepad);
    }
    pollMenuGamepad();
});

function resizeCanvas() {
    const h = document.querySelector('.game-header'), c = document.querySelector('.game-controls');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - (h?.offsetHeight || 60) - (c?.offsetHeight || 100);
}

function setupEventListeners() {
    document.getElementById('home-btn').addEventListener('click', goToMainMenu);
    document.getElementById('settings-btn').addEventListener('click', () => document.getElementById('settings-panel').classList.toggle('hidden'));
    document.getElementById('speed-slider').addEventListener('input', e => {
        settings.speed = parseInt(e.target.value); saveSettings();
        if (currentGameType) setGameSpeed(currentGameType, settings.speed);
    });
    document.getElementById('sound-toggle').addEventListener('change', e => { settings.soundEnabled = e.target.checked; saveSettings(); });
    
    const lb = document.getElementById('left-btn'), rb = document.getElementById('right-btn');
    ['mousedown', 'touchstart'].forEach(e => {
        lb.addEventListener(e, ev => { ev.preventDefault(); switchDown('left'); });
        rb.addEventListener(e, ev => { ev.preventDefault(); switchDown('right'); });
    });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(e => {
        lb.addEventListener(e, () => switchUp('left'));
        rb.addEventListener(e, () => switchUp('right'));
    });
    document.addEventListener('keydown', e => {
        if (['ArrowLeft', '1', '3'].includes(e.key) && !e.repeat) switchDown('left');
        if (['ArrowRight', '2', '4'].includes(e.key) && !e.repeat) switchDown('right');
        if (e.key === 'Escape') {
            if (document.getElementById('game-screen').classList.contains('active')) {
                goToMainMenu();
            } else if (!document.getElementById('instructions').classList.contains('hidden')) {
                document.getElementById('instructions').classList.add('hidden');
                pendingGameType = null;
            }
        }
    });
    document.addEventListener('keyup', e => {
        if (['ArrowLeft', '1', '3'].includes(e.key)) switchUp('left');
        if (['ArrowRight', '2', '4'].includes(e.key)) switchUp('right');
    });
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('menu-btn').addEventListener('click', goToMainMenu);
    document.getElementById('start-game-btn').addEventListener('click', () => {
        if (pendingGameType) {
            actuallyStartGame(pendingGameType);
            pendingGameType = null;
        }
    });
}

// ============================================
// SWITCH INPUT (central entry point for keyboard + on-screen buttons)
// ============================================
const lastSwitchDown = { left: 0, right: 0 };

function switchDown(side) {
    const now = Date.now();
    if (settings.debounce > 0 && now - lastSwitchDown[side] < settings.debounce) return;
    lastSwitchDown[side] = now;
    initAudio();
    document.getElementById(side === 'left' ? 'left-btn' : 'right-btn').classList.add('pressed');
    if (handleUiSwitch(side)) return; // consumed by menu / overlay navigation
    input[side] = true;
    input[side + 'Pressed'] = true;
}

function switchUp(side) {
    input[side] = false;
    document.getElementById(side === 'left' ? 'left-btn' : 'right-btn').classList.remove('pressed');
}

// Routes a switch press to whatever UI is on screen. Returns true if consumed.
function handleUiSwitch(side) {
    const gameOverVisible = !document.getElementById('game-over').classList.contains('hidden');
    const instructionsVisible = !document.getElementById('instructions').classList.contains('hidden');
    if (gameOverVisible) { gameOverSwitch(side); return true; }
    if (instructionsVisible) { instructionsSwitch(side); return true; }
    if (document.getElementById('main-menu').classList.contains('active')) { menuSwitch(side); return true; }
    return false;
}

// ============================================
// MENU SCANNING (switch access to menus & overlays)
// ============================================
let scanIndex = 0;
let gameOverScanIndex = 0;
let autoScanTimer = null;
let overlayShownAt = 0;             // when game-over / instructions appeared
const OVERLAY_LOCKOUT = 1000;       // ignore switch presses this long after an overlay opens

function getMenuScanTargets() {
    const targets = [...document.querySelectorAll('.game-button')];
    const next = document.getElementById('next-page-btn');
    const prev = document.getElementById('prev-page-btn');
    if (!next.disabled) targets.push(next);
    if (!prev.disabled) targets.push(prev);
    return targets;
}

function applyScanFocus() {
    document.querySelectorAll('.scan-focus').forEach(el => el.classList.remove('scan-focus'));
    if (settings.scanMode === 'off') return;
    const targets = getMenuScanTargets();
    if (!targets.length) return;
    if (scanIndex >= targets.length) scanIndex = 0;
    // Scanning owns the highlight; clear the gamepad one to avoid two highlights
    document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus'));
    targets[scanIndex].classList.add('scan-focus');
}

function scanAdvance() {
    const targets = getMenuScanTargets();
    if (!targets.length) return;
    scanIndex = (scanIndex + 1) % targets.length;
    applyScanFocus();
    playSound('move');
}

function scanSelect() {
    const targets = getMenuScanTargets();
    if (!targets.length) return;
    if (scanIndex >= targets.length) scanIndex = 0;
    const target = targets[scanIndex];
    playSound('beep');
    target.click();
    // Page nav re-renders the grid; restart the scan from the first tile
    if (target.classList.contains('nav-btn')) { scanIndex = 0; applyScanFocus(); }
}

function menuSwitch(side) {
    if (settings.scanMode === 'off') return;
    if (settings.scanMode === 'auto') { scanSelect(); return; }
    if (side === 'right') scanAdvance(); else scanSelect();
}

function gameOverSwitch(side) {
    if (Date.now() - overlayShownAt < OVERLAY_LOCKOUT) return;
    if (settings.scanMode === 'auto') {
        // Auto scan alternates the highlight between the two buttons; any switch selects
        const buttons = [document.getElementById('restart-btn'), document.getElementById('menu-btn')];
        playSound('beep');
        buttons[gameOverScanIndex % 2].click();
    } else {
        if (side === 'left') restartGame(); else goToMainMenu();
    }
}

function instructionsSwitch(side) {
    if (Date.now() - overlayShownAt < OVERLAY_LOCKOUT) return;
    document.getElementById('start-game-btn').click();
}

function applyGameOverScanFocus() {
    const rb = document.getElementById('restart-btn'), mb = document.getElementById('menu-btn');
    rb.classList.remove('scan-focus'); mb.classList.remove('scan-focus');
    if (settings.scanMode !== 'auto') return;
    (gameOverScanIndex % 2 === 0 ? rb : mb).classList.add('scan-focus');
}

function ensureAutoScanTimer() {
    if (autoScanTimer) clearInterval(autoScanTimer);
    autoScanTimer = setInterval(() => {
        if (settings.scanMode !== 'auto') return;
        const gameOverVisible = !document.getElementById('game-over').classList.contains('hidden');
        if (gameOverVisible) {
            gameOverScanIndex = (gameOverScanIndex + 1) % 2;
            applyGameOverScanFocus();
            playSound('move');
        } else if (document.getElementById('main-menu').classList.contains('active')) {
            scanAdvance();
        }
    }, settings.scanSpeed);
}

let gamepadIndex = null;
let gamepadMenuIndex = 0;
let gamepadLastNav = 0;
const NAV_DELAY = 200;

function setupGamepad() {
    window.addEventListener('gamepadconnected', e => gamepadIndex = e.gamepad.index);
    window.addEventListener('gamepaddisconnected', () => gamepadIndex = null);
}

function pollGamepad() {
    if (gamepadIndex === null) return;
    const g = navigator.getGamepads()[gamepadIndex]; if (!g) return;
    
    const now = Date.now();
    const dpadLeft = g.buttons[14]?.pressed || g.axes[0] < -0.5;
    const dpadRight = g.buttons[15]?.pressed || g.axes[0] > 0.5;
    const dpadUp = g.buttons[12]?.pressed || g.axes[1] < -0.5;
    const dpadDown = g.buttons[13]?.pressed || g.axes[1] > 0.5;
    const btnA = g.buttons[0]?.pressed;
    const btnB = g.buttons[1]?.pressed;
    const btnX = g.buttons[2]?.pressed;
    const btnY = g.buttons[3]?.pressed;
    const shoulderL = g.buttons[4]?.pressed;
    const shoulderR = g.buttons[5]?.pressed;
    
    // Check if we're on the main menu
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu.classList.contains('active')) {
        const buttons = document.querySelectorAll('.game-button');
        const cols = getMenuColumns();
        
        if (now - gamepadLastNav > NAV_DELAY) {
            // Navigate within page grid
            if (dpadUp) { 
                gamepadMenuIndex = Math.max(0, gamepadMenuIndex - cols); 
                gamepadLastNav = now; 
                updateMenuFocus(buttons); 
                playSound('move');
            }
            if (dpadDown) { 
                gamepadMenuIndex = Math.min(buttons.length - 1, gamepadMenuIndex + cols); 
                gamepadLastNav = now; 
                updateMenuFocus(buttons); 
                playSound('move');
            }
            if (dpadLeft) {
                if (gamepadMenuIndex % cols === 0 && currentPage > 0) {
                    // At left edge, go to previous page
                    currentPage--;
                    renderPage();
                    gamepadMenuIndex = cols - 1; // Move to right side of previous page
                    const newButtons = document.querySelectorAll('.game-button');
                    updateMenuFocus(newButtons);
                } else if (gamepadMenuIndex > 0) {
                    gamepadMenuIndex--;
                    updateMenuFocus(buttons);
                    playSound('move');
                }
                gamepadLastNav = now;
            }
            if (dpadRight) {
                const atRightEdge = (gamepadMenuIndex + 1) % cols === 0 || gamepadMenuIndex === buttons.length - 1;
                if (atRightEdge && currentPage < getTotalPages() - 1) {
                    // At right edge, go to next page
                    currentPage++;
                    renderPage();
                    gamepadMenuIndex = 0; // Move to left side of next page
                    const newButtons = document.querySelectorAll('.game-button');
                    updateMenuFocus(newButtons);
                } else if (gamepadMenuIndex < buttons.length - 1) {
                    gamepadMenuIndex++;
                    updateMenuFocus(buttons);
                    playSound('move');
                }
                gamepadLastNav = now;
            }
            
            // Shoulder buttons for quick page navigation
            if (shoulderL && currentPage > 0) { 
                prevPage(); 
                gamepadLastNav = now; 
            }
            if (shoulderR && currentPage < getTotalPages() - 1) { 
                nextPage(); 
                gamepadLastNav = now; 
            }
        }
        
        if (btnA || btnB || btnX || btnY) {
            if (buttons[gamepadMenuIndex] && now - gamepadLastNav > NAV_DELAY) {
                gamepadLastNav = now;
                initAudio();
                startGame(buttons[gamepadMenuIndex].dataset.game);
            }
        }
    } else {
        // In game - D-pad and face buttons control left/right actions
        const l = dpadLeft || btnX || btnY;
        const r = dpadRight || btnA || btnB;
        
        if (l && !input.left) { input.left = true; input.leftPressed = true; document.getElementById('left-btn').classList.add('pressed'); }
        else if (!l) { input.left = false; document.getElementById('left-btn').classList.remove('pressed'); }
        
        if (r && !input.right) { input.right = true; input.rightPressed = true; document.getElementById('right-btn').classList.add('pressed'); }
        else if (!r) { input.right = false; document.getElementById('right-btn').classList.remove('pressed'); }
        
        // Handle game over screen navigation
        const gameOver = document.getElementById('game-over');
        if (!gameOver.classList.contains('hidden') && now - overlayShownAt > OVERLAY_LOCKOUT) {
            if ((btnA || btnB) && now - gamepadLastNav > NAV_DELAY) {
                gamepadLastNav = now;
                restartGame();
            }
            if ((btnX || btnY) && now - gamepadLastNav > NAV_DELAY) {
                gamepadLastNav = now;
                goToMainMenu();
            }
        }

        // Handle instructions screen
        const instructions = document.getElementById('instructions');
        if (!instructions.classList.contains('hidden') && now - overlayShownAt > OVERLAY_LOCKOUT) {
            if ((btnA || btnB || btnX || btnY) && now - gamepadLastNav > NAV_DELAY) {
                gamepadLastNav = now;
                if (pendingGameType) {
                    actuallyStartGame(pendingGameType);
                    pendingGameType = null;
                }
            }
        }
    }
}

function getMenuColumns() {
    const width = window.innerWidth;
    if (width <= 480) return 2;
    return 3;
}

function updateMenuFocus(buttons) {
    // Gamepad takes over the highlight; drop any switch-scan highlight
    document.querySelectorAll('.scan-focus').forEach(el => el.classList.remove('scan-focus'));
    buttons.forEach((btn, i) => {
        btn.classList.remove('gamepad-focus');
        if (i === gamepadMenuIndex) {
            btn.classList.add('gamepad-focus');
        }
    });
}

let returnPage = 0;

function goToMainMenu() {
    if (gameLoop) { cancelAnimationFrame(gameLoop); gameLoop = null; }
    currentGame = null; input.left = input.right = false;
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('main-menu').classList.add('active');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('settings-panel').classList.add('hidden');
    document.getElementById('instructions').classList.add('hidden');
    currentPage = returnPage;
    gamepadMenuIndex = 0;
    renderPage();
}

function showInstructions(gameType) {
    const gameName = typeof getGameName === 'function' ? getGameName(gameType) : gameType;
    const instructionText = typeof getGameInstructions === 'function' ? getGameInstructions(gameType) : '';
    
    if (!instructionText) { actuallyStartGame(gameType); return; }
    
    document.getElementById('instructions-title').textContent = gameName;
    document.getElementById('instructions-text').textContent = instructionText;
    
    // Reset settings panel state (collapsed by default)
    document.getElementById('instructions-settings-panel').classList.add('hidden');
    document.getElementById('instructions-settings-btn').classList.remove('active');
    
    // Sync settings values (speed shows this game's remembered speed)
    document.getElementById('instructions-speed-slider').value = getGameSpeed(gameType);
    document.getElementById('instructions-sound-toggle').checked = settings.soundEnabled;
    
    // Set switch mode radio to saved value
    const savedMode = getSwitchMode(gameType);
    const radios = document.querySelectorAll('input[name="switch-mode"]');
    radios.forEach(r => r.checked = (parseInt(r.value) === savedMode));
    
    document.getElementById('instructions').classList.remove('hidden');
    overlayShownAt = Date.now(); // lockout so the press that picked the game doesn't also start it

    pendingGameType = gameType;
}

let pendingGameType = null;

function startGame(type) {
    showInstructions(type);
}

function actuallyStartGame(type) {
    // Save the selected switch mode
    const selectedMode = document.querySelector('input[name="switch-mode"]:checked');
    if (selectedMode) {
        setSwitchMode(type, parseInt(selectedMode.value));
    }
    
    returnPage = currentPage;
    currentGameType = type;
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('settings-panel').classList.add('hidden');
    document.getElementById('instructions').classList.add('hidden');
    document.getElementById('speed-slider').value = getGameSpeed(type);
    document.getElementById('practice-badge').classList.toggle('hidden', !settings.practiceMode);
    resizeCanvas();
    
    const games = { 'space-invaders': SpaceInvaders, 'snake': Snake, 'breakout': Breakout, 'bubble-shooter': BubbleShooter,
        'tetris': Tetris, 'pong': Pong, 'flappy': Flappy, 'dino': Dino, 'helicopter': Helicopter,
        'rhythm': Rhythm, 'tank': Tank, 'asteroids': Asteroids, 'skiing': Skiing,
        'balance': Balance, 'simon': Simon, 'whack': Whack, 'airhockey': AirHockey, 'lander': Lander, 'fruit': Fruit,
        'stack': Stack, 'penalty': Penalty, 'pinball': Pinball, 'brickbuilder': BrickBuilder, 'spacedodge': SpaceDodge,
        'wireloop': WireLoop };
    currentGame = new games[type]();
    currentGame.switchMode = getSwitchMode(type); // Pass switch mode to game
    currentGame.init();
    runGameLoop();
}

function restartGame() { document.getElementById('game-over').classList.add('hidden'); if (currentGame) { currentGame.init(); runGameLoop(); } }

function runGameLoop() {
    if (!currentGame) return;
    pollGamepad();
    currentGame.update(0.5 + getGameSpeed(currentGameType) / 10);
    currentGame.draw();
    const scoreText = typeof getTranslation === 'function' ? getTranslation('score') : 'SCORE';
    const levelText = typeof getTranslation === 'function' ? getTranslation('level') : 'LEVEL';
    document.getElementById('score-display').innerHTML = `<span data-i18n="score">${scoreText}</span>: ${currentGame.score}`;
    document.getElementById('level-display').innerHTML = `<span data-i18n="level">${levelText}</span>: ${currentGame.level}`;
    input.leftPressed = input.rightPressed = false;
    if (!currentGame.gameOver) gameLoop = requestAnimationFrame(runGameLoop);
    else if (settings.practiceMode) {
        // Practice mode: no game over — restart the round, keep score and level
        const s = currentGame.score, l = currentGame.level;
        currentGame.gameOver = false;
        currentGame.init();
        currentGame.score = s;
        currentGame.level = l;
        playSound('low');
        gameLoop = requestAnimationFrame(runGameLoop);
    } else {
        showGameOver();
    }
}

function showGameOver() {
    const score = currentGame.score;
    const previousBest = getHighScore(currentGameType);
    const isRecord = score > 0 && score > previousBest;
    if (isRecord) setHighScore(currentGameType, score);

    document.getElementById('final-score').textContent = score;
    document.getElementById('best-score').textContent = Math.max(score, previousBest);

    const recordEl = document.getElementById('new-record');
    recordEl.classList.toggle('hidden', !isRecord);
    if (isRecord) recordEl.textContent = getTranslation('newRecord');

    const encourageEl = document.getElementById('encouragement');
    if (isRecord) {
        encourageEl.textContent = '';
    } else {
        const n = 1 + Math.floor(Math.random() * 4);
        encourageEl.textContent = getTranslation('encourage' + n);
    }

    if (isRecord) { playSound('fanfare'); spawnConfetti(); }
    else playSound('gameover');

    overlayShownAt = Date.now(); // lockout so a press in flight at death doesn't instantly restart
    gameOverScanIndex = 0;
    applyGameOverScanFocus();
    document.getElementById('game-over').classList.remove('hidden');
}

function spawnConfetti() {
    const overlay = document.getElementById('game-over');
    const colors = ['#ff0066', '#00ffff', '#ffff00', '#00ff66', '#ff6600', '#ff00ff'];
    for (let i = 0; i < 60; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDelay = Math.random() * 0.8 + 's';
        c.style.animationDuration = (1.8 + Math.random() * 1.5) + 's';
        c.style.width = c.style.height = (6 + Math.random() * 6) + 'px';
        overlay.appendChild(c);
        setTimeout(() => c.remove(), 4000);
    }
}
