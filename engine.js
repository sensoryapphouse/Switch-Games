// Switch Games: one input router, explicit screen states and fixed-step simulation.
let canvas, ctx, currentGame = null, currentGameType = null, pendingGameType = null;
let currentPage = 0, returnPage = 0, dialogId = null, lastFocus = null;
let paused = false, scanIndex = 0, scanTimer = null, overlayShownAt = 0;
let keyboardNavigation = false;
let simulationTime = 0, lastFrame = null, accumulator = 0, recoveryUntil = 0;
const STEP = 1000 / 60, LOCKOUT = 600, gamesPerPage = 6;
function gameNow() { return simulationTime; }
const settings = { speed: 5, soundEnabled: true, scanMode: 'auto', scanSpeed: 2000,
    debounce: 0, practiceMode: false, switchMode: 1, holdPause: 2500,
    largeText: true, reducedMotion: false, spokenScan: false };
const switchModeSettings = {}, gameSpeedSettings = {}, highScores = {};
const input = { left: false, right: false, leftPressed: false, rightPressed: false };
const sources = new Map(), lastPress = {left: -Infinity, right: -Infinity};
const holdTimers = new Map();
let audioContext = null, lastSoundAt = -Infinity;
const gameIds = ['space-invaders','snake','breakout','bubble-shooter','tetris','pong','flappy','dino',
    'helicopter','rhythm','tank','asteroids','skiing','balance','simon','whack','airhockey',
    'lander','fruit','stack','penalty','pinball','brickbuilder','spacedodge','wireloop'];
const icons = ['space-invaders','snake','breakout','bubble','tetris','pong','flappy','dino',
    'helicopter','rhythm','tank','asteroids','skiing','balance','simon','whack','airhockey',
    'lander','fruit','stack','penalty','pinball','brickbuilder','spacedodge','wireloop'];
const allGames = gameIds.map((id,i) => ({id, icon: icons[i]+'-icon'}));
function gameClasses() { return [SpaceInvaders,Snake,Breakout,BubbleShooter,Tetris,Pong,Flappy,Dino,
    Helicopter,Rhythm,Tank,Asteroids,Skiing,Balance,Simon,Whack,AirHockey,Lander,Fruit,Stack,
    Penalty,Pinball,BrickBuilder,SpaceDodge,WireLoop]; }
const $ = id => document.getElementById(id);
const finite = (v,min,max,fallback) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fallback;
function loadSettings() {
    const saved = storage.read('switchGameSettings', {});
    if (saved && typeof saved === 'object') {
        for (const key of ['soundEnabled','practiceMode','largeText','reducedMotion','spokenScan'])
            if (typeof saved[key] === 'boolean') settings[key] = saved[key];
        for (const [key,min,max] of [['speed',1,10],['scanSpeed',500,10000],['debounce',0,1000],['holdPause',0,10000]])
            settings[key] = finite(saved[key],min,max,settings[key]);
        if (['auto','step','off'].includes(saved.scanMode)) settings.scanMode = saved.scanMode;
        if ([1,2].includes(saved.switchMode)) settings.switchMode = saved.switchMode;
    }
    for (const [key,target,min,max] of [['switchModeSettings',switchModeSettings,1,2],['switchGameSpeeds',gameSpeedSettings,1,10],['switchGameHighScores',highScores,0,1e12]]) {
        const data = storage.read(key, {});
        if (!data || typeof data !== 'object') continue;
        for (const id of gameIds) if (Number.isFinite(data[id]) && data[id]>=min && data[id]<=max && Number.isInteger(data[id])) target[id]=data[id];
    }
}
function saveSettings() { storage.write('switchGameSettings',settings); }
function getSwitchMode(id) { return switchModeSettings[id] || settings.switchMode; }
function setSwitchMode(id,mode) { switchModeSettings[id]=mode; storage.write('switchModeSettings',switchModeSettings); }
function getGameSpeed(id) { return gameSpeedSettings[id] || settings.speed; }
function setGameSpeed(id,speed) { gameSpeedSettings[id]=speed; storage.write('switchGameSpeeds',gameSpeedSettings); }
function getHighScore(id) { return highScores[id] || 0; }
function setHighScore(id,score) { highScores[id]=score; storage.write('switchGameHighScores',highScores); }
function initAudio() {
    if (!settings.soundEnabled) return;
    try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (Audio && !audioContext) audioContext = new Audio();
        if (audioContext?.state === 'suspended') audioContext.resume().catch(()=>{});
    } catch { /* Audio is optional. */ }
}
function playSound(type) {
    if (!settings.soundEnabled || !audioContext || performance.now()-lastSoundAt<60) return;
    lastSoundAt=performance.now();
    const osc=audioContext.createOscillator(), gain=audioContext.createGain(), now=audioContext.currentTime;
    osc.connect(gain); gain.connect(audioContext.destination);
    const tones={low:220,high:660,move:330,hit:440,score:880,jump:550,shoot:770,beep:440,gameover:180,fanfare:1047};
    osc.frequency.setValueAtTime(tones[type]||440,now);
    gain.gain.setValueAtTime(0.08,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.18);
    osc.onended=()=>{osc.disconnect();gain.disconnect();}; osc.start(now); osc.stop(now+0.2);
}
function announce(text, speak=false) {
    $('live-status').textContent=text;
    if (speak && settings.spokenScan && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel(); const utterance=new window.SpeechSynthesisUtterance(text);
        utterance.lang=currentLanguage; window.speechSynthesis.speak(utterance);
    }
}
function getTotalPages() { return Math.ceil(allGames.length/gamesPerPage); }
function renderPage() {
    const grid=$('games-grid'); grid.replaceChildren();
    allGames.slice(currentPage*gamesPerPage,(currentPage+1)*gamesPerPage).forEach(game=>{
        const button=document.createElement('button');button.className='game-button';button.dataset.game=game.id;
        const icon=document.createElement('span');icon.className='game-icon '+game.icon;icon.setAttribute('aria-hidden','true');
        const label=document.createElement('span');label.className='game-label';label.textContent=getGameName(game.id);
        button.append(icon,label);button.addEventListener('click',()=>{initAudio();startGame(game.id);});grid.append(button);
    });
    $('prev-page-btn').disabled=currentPage===0; $('next-page-btn').disabled=currentPage===getTotalPages()-1;
    $('page-indicator').textContent=`${currentPage+1} / ${getTotalPages()}`;
    resetScan();
}
function nextPage() { if (currentPage<getTotalPages()-1) {currentPage++;renderPage();} }
function prevPage() { if (currentPage>0) {currentPage--;renderPage();} }
function visible(el) { return !!el && !el.disabled && !el.closest('[hidden]') && el.getClientRects().length>0; }
function scanTargets() {
    const root = dialogId ? $(dialogId) : $('main-menu');
    return [...root.querySelectorAll('button,select,input')].filter(visible);
}
function scanLabel(el) { return el.getAttribute('aria-label') || el.textContent.trim(); }
function applyScanFocus() {
    document.querySelectorAll('.scan-focus').forEach(el=>el.classList.remove('scan-focus'));
    if (keyboardNavigation || settings.scanMode==='off' || (currentGame && !dialogId)) return;
    const targets=scanTargets();if (!targets.length) return;
    scanIndex=((scanIndex%targets.length)+targets.length)%targets.length;
    targets[scanIndex].classList.add('scan-focus');targets[scanIndex].scrollIntoView({block:'nearest'});
    announce(scanLabel(targets[scanIndex]),true);
}
function resetScan() { scanIndex=0; applyScanFocus(); ensureAutoScanTimer(); }
function ensureAutoScanTimer() {
    clearTimeout(scanTimer);
    if (keyboardNavigation || settings.scanMode!=='auto' || (currentGame&&!dialogId) || document.hidden) return;
    const guard=dialogId ? Math.max(0,overlayShownAt+LOCKOUT-performance.now()) : 0;
    scanTimer=setTimeout(()=>{scanAdvance();ensureAutoScanTimer();},settings.scanSpeed+guard);
}
function scanAdvance() { scanIndex++; applyScanFocus();playSound('move'); }
function scanSelect() {
    if (dialogId && performance.now()-overlayShownAt<LOCKOUT) return;
    const targets=scanTargets();targets[scanIndex%targets.length]?.click();
    ensureAutoScanTimer();
}
function trapFocus(e) {
    if (!dialogId || e.key!=='Tab') return;
    const controls=scanTargets();if (!controls.length) return;
    const index=controls.indexOf(document.activeElement);
    if (e.shiftKey && index<=0) {e.preventDefault();controls.at(-1).focus();}
    else if (!e.shiftKey && (index===controls.length-1 || index<0)) {e.preventDefault();controls[0].focus();}
}
function openDialog(id) {
    if (!dialogId) lastFocus=document.activeElement;
    document.querySelectorAll('.overlay').forEach(el=>el.hidden=el.id!==id);
    dialogId=id; $('main-menu').inert=true; $('game-screen').inert=true;
    overlayShownAt=performance.now(); clearInputs();
    $(id).querySelector('button')?.focus();resetScan();
}
function closeDialog() {
    document.querySelectorAll('.overlay').forEach(el=>el.hidden=true);
    dialogId=null;$('main-menu').inert=false;$('game-screen').inert=false;
    if (lastFocus?.isConnected && visible(lastFocus)) lastFocus.focus();
    lastFrame=null;accumulator=0;resetScan();
}
function startGame(type) {
    pendingGameType=type;$('instructions-title').textContent=getGameName(type);
    updateInstructions();openDialog('instructions');
}
function updateInstructions() {
    if (!pendingGameType) return;
    $('instructions-text').textContent=getGameInstructions(pendingGameType,getSwitchMode(pendingGameType));
    $('game-mode-btn').textContent=`${ui('switches')}: ${getSwitchMode(pendingGameType)}`;
    $('game-speed-value').textContent=getGameSpeed(pendingGameType);
}
function actuallyStartGame(type) {
    const Game=gameClasses()[gameIds.indexOf(type)];if (!Game) return;
    returnPage=currentPage;currentGameType=type;pendingGameType=null;
    $('main-menu').classList.remove('active');$('game-screen').classList.add('active');
    closeDialog();paused=false;simulationTime=0;recoveryUntil=0;clearInputs();
    currentGame=new Game();currentGame.switchMode=getSwitchMode(type);currentGame.init();
    canvas.setAttribute('aria-label',getGameName(type));
    lastGameStatus='';lastGameAnnouncement=0;
    $('canvas-description').textContent=getGameName(type)+'. '+getGameInstructions(type,currentGame.switchMode);
    updateControls();resizeCanvas();resetScan();$('pause-btn').focus();
    announce(getGameName(type)+'. '+ui('holdHint'));
}
function goToMainMenu() {
    const wasPlaying=!!currentGame;
    currentGame=null;pendingGameType=null;paused=false;clearInputs();closeDialog();
    $('game-screen').classList.remove('active');$('main-menu').classList.add('active');
    if(wasPlaying)currentPage=returnPage;renderPage();
    const button=document.querySelector(`[data-game="${currentGameType}"]`);(button||$('menu-settings-btn')).focus();
}
function restartGame() { if (currentGameType) actuallyStartGame(currentGameType); }
function pauseGame() { if (!currentGame || dialogId==='game-over') return;paused=true;openDialog('pause-dialog');announce(ui('paused')); }
function resumeGame() { if (!currentGame) return;clearInputs();closeDialog();paused=false;lastFrame=null;accumulator=0; }
function openSettings() { if (currentGame) paused=true;updateSettings();openDialog('settings-dialog'); }
function settingsBack() { if (currentGame) pauseGame();else closeDialog(); }
function updateSettings() {
    $('profile-btn').textContent=`${ui('switches')}: ${settings.switchMode}`;
    $('scan-mode-btn').textContent=`${ui('scan')}: ${ui(settings.scanMode)}`;
    $('scan-speed-btn').textContent=`${ui('scan')}: ${(settings.scanSpeed/1000).toLocaleString(currentLanguage)} s`;
    $('debounce-btn').textContent=`${ui('debounce')}: ${settings.debounce} ms`;
    $('hold-btn').textContent=`${ui('pause')}: ${settings.holdPause ? settings.holdPause/1000+' s' : ui('off')}`;
    for (const [id,key,label] of [['practice-btn','practiceMode','practice'],['sound-btn','soundEnabled','sound'],['speech-btn','spokenScan','speech'],['text-btn','largeText','largeText'],['motion-btn','reducedMotion','reduceMotion']]) {
        $(id).textContent=ui(label)+': '+ui(settings[key]?'on':'off');$(id).setAttribute('aria-pressed',String(settings[key]));
    }
    document.body.classList.toggle('large-text',settings.largeText);
    document.body.classList.toggle('reduce-motion',settings.reducedMotion);
    $('menu-help').textContent=ui(settings.scanMode==='auto'?'autoHint':settings.scanMode==='step'?'stepHint':'offHint');
    $('hold-help').textContent=settings.holdPause ? ui('holdHint') : ui('pause')+': P';
}
function changedSettings() {saveSettings();updateSettings();updateControls();ensureAutoScanTimer();applyScanFocus();}
function updateControls() {
    const vertical=['pong','airhockey'].includes(currentGameType), one=currentGame?.switchMode===1;
    const labels=vertical ? [ui('up'),ui('down')] : [ui('left'),ui('right')];
    if (one || ['flappy','helicopter','lander','bubble-shooter','stack'].includes(currentGameType)) labels.fill(ui('action'));
    ['left','right'].forEach((side,i)=>{$(side+'-btn').textContent=labels[i];$(side+'-btn').setAttribute('aria-label',labels[i]);});
    $('practice-badge').hidden=!settings.practiceMode;
}
// A logical playing area keeps hitboxes, goals and control coverage consistent across devices.
// Resizing only changes presentation, never the positions in an active round.
function resizeCanvas() {
    if (!canvas) return;
    const rect=$('play-area').getBoundingClientRect();
    const scale=Math.min(rect.width/canvas.width,rect.height/canvas.height);
    canvas.style.width=Math.max(1,canvas.width*scale)+'px';canvas.style.height=Math.max(1,canvas.height*scale)+'px';
}
function clearInputs() {
    sources.clear();holdTimers.forEach(clearTimeout);holdTimers.clear();
    for (const side of ['left','right']) {input[side]=input[side+'Pressed']=false;$(side+'-btn')?.classList.remove('pressed');}
}
function syncHeld() {
    for (const side of ['left','right']) {input[side]=[...sources.values()].includes(side);$(side+'-btn').classList.toggle('pressed',input[side]);}
}
function switchDown(side,source='keyboard:'+side) {
    if (sources.has(source)) return;
    if(keyboardNavigation){keyboardNavigation=false;applyScanFocus();ensureAutoScanTimer();}
    sources.set(source,side);initAudio();
    if (currentGame&&!dialogId&&!paused&&settings.holdPause) holdTimers.set(source,setTimeout(()=>{if(sources.has(source))pauseGame();},settings.holdPause));
    if (!currentGame && settings.scanMode==='off') holdTimers.set(source,setTimeout(()=>{
        if(sources.has(source)){settings.scanMode='auto';saveSettings();openSettings();}
    },2500));
    const now=performance.now();if (now-lastPress[side]<settings.debounce) {syncHeld();return;}
    lastPress[side]=now;
    if (dialogId || !currentGame) {
        if (settings.scanMode==='auto') scanSelect();
        else if (settings.scanMode==='step') {if(side==='right')scanAdvance();else scanSelect();}
    } else {input[side+'Pressed']=true;syncHeld();}
}
function switchUp(side,source='keyboard:'+side) {
    sources.delete(source);clearTimeout(holdTimers.get(source));holdTimers.delete(source);syncHeld();
}
const padPrevious=new Map();
function pollGamepad() {
    if(document.hidden)return;
    const pads=navigator.getGamepads?.()||[];const seen=new Set();
    for (const pad of pads) {
        if (!pad) continue;
        // Face buttons 0/1 and dpad/axis operate the same two logical switches everywhere.
        const held={left:!!(pad.buttons[2]?.pressed||pad.buttons[3]?.pressed||pad.buttons[14]?.pressed||pad.axes[0]<-0.5),
            right:!!(pad.buttons[0]?.pressed||pad.buttons[1]?.pressed||pad.buttons[15]?.pressed||pad.axes[0]>0.5)};
        for(const side of ['left','right']) {
            const key='pad:'+pad.index+':'+side;seen.add(key);
            if (held[side]&&!padPrevious.get(key)) switchDown(side,key);
            else if (!held[side]&&padPrevious.get(key)) switchUp(side,key);
            padPrevious.set(key,held[side]);
        }
    }
    for (const [key,held] of padPrevious) if (!seen.has(key)) {if(held)switchUp(key.endsWith('left')?'left':'right',key);padPrevious.delete(key);}
}
function showGameOver() {
    const score=currentGame.score, best=getHighScore(currentGameType), record=score>best;
    if (record) setHighScore(currentGameType,score);
    $('final-score').textContent=score;$('best-score').textContent=Math.max(best,score);
    $('new-record').hidden=!record;$('new-record').textContent=getTranslation('newRecord');
    $('encouragement').textContent=getTranslation('encourage'+(1+Math.floor(Math.random()*4)));
    playSound(record?'fanfare':'gameover');openDialog('game-over');
    announce(getTranslation('gameOver')+'. '+getTranslation('score')+': '+score);
    if(record&&!settings.reducedMotion&&!matchMedia('(prefers-reduced-motion: reduce)').matches)spawnConfetti();
}
function spawnConfetti() {
    for(let i=0;i<20;i++) {const c=document.createElement('span');c.className='confetti';c.setAttribute('aria-hidden','true');c.style.left=Math.random()*100+'%';c.style.background=['#ff0066','#00ffff','#ffff00'][i%3];c.style.width=c.style.height='8px';c.style.animationDuration='2s';$('game-over').append(c);setTimeout(()=>c.remove(),2200);}
}
// Per-game recovery preserves the round; completed timers are explicitly renewed.
function recoverPractice(g) {
    switch(currentGameType) {
        case 'space-invaders': g.enemyBullets=[];g.enemies.forEach(e=>e.y=Math.min(e.y,canvas.height/2));break;
        case 'snake': { const size=g.snake.length;g.dir=0;g.snake=Array.from({length:Math.min(size,10)},(_,i)=>({x:300-i*20,y:300}));break; }
        case 'breakout':g.ball.x=canvas.width/2;g.ball.y=canvas.height/2;g.ball.dy=-Math.abs(g.ball.dy);break;
        case 'bubble-shooter': {const score=g.score;g.createBubbles();g.score=score;break;}
        case 'tetris':g.grid=Array.from({length:g.gh},()=>Array(g.gw).fill(0));g.spawn();break;
        case 'pong':g.aiScore=0;g.resetBall();break;
        case 'flappy':g.bird.y=canvas.height/2;g.bird.vy=0;g.pipes=[];break;
        case 'dino':g.obstacles=[];g.dino.y=g.ground;g.dino.vy=0;g.jumping=false;break;
        case 'helicopter':g.heli.y=canvas.height/2;g.heli.vy=0;g.walls=[];break;
        case 'rhythm':g.misses=0;g.notes=[];break;
        case 'tank':g.enemies=[];break;
        case 'asteroids':g.asteroids.forEach(a=>{a.x=20;a.y=20;});break;
        case 'skiing':g.trees=[];break;
        case 'balance':g.ball.x=canvas.width/2;g.ball.vx=0;g.platform.angle=0;g.platform.angVel=0;break;
        case 'simon':g.playerSeq=[];g.showingSeq=true;g.showIndex=0;g.showTimer=0;g.flash=null;g.inputEnabled=false;break;
        case 'whack':g.timeLeft=30000;break;
        case 'airhockey':g.aiScore=0;g.resetPuck(1);break;
        case 'lander':g.lander={x:canvas.width/2,y:50,vx:0,vy:0,fuel:100};break;
        case 'fruit':g.misses=0;g.fruits=[];break;
        case 'stack':g.current={x:0,w:g.blocks.at(-1).w,dir:1,speed:3};break;
        case 'penalty':g.misses=0;g.ball=null;g.shooting=false;g.preparing=true;g.prepTimer=1000;break;
        case 'pinball':g.balls=3;g.ball={x:canvas.width/2,y:canvas.height/2,vx:2,vy:-4,r:10};break;
        case 'brickbuilder':g.grid=Array.from({length:g.gridH},()=>Array(g.gridW).fill(0));g.spawnBlock();break;
        case 'spacedodge':g.asteroids=[];g.shield=3000;break;
        case 'wireloop':g.lives=3;g.ringY=g.getWireY(g.ringPos);g.touchTimer=0;break;
    }
    g.gameOver=false;clearInputs();recoveryUntil=simulationTime+1000;announce(ui('practice'));
}
function fixedUpdate() {
    if (!currentGame || dialogId || paused) return;
    simulationTime+=STEP;
    if (simulationTime<recoveryUntil) return;
    currentGame.update(0.5+getGameSpeed(currentGameType)/10);
    input.leftPressed=input.rightPressed=false;
    if (currentGame.gameOver) {if(settings.practiceMode)recoverPractice(currentGame);else showGameOver();}
}
function runGameLoop(timestamp) {
    pollGamepad();
    if (lastFrame===null) lastFrame=timestamp;
    const elapsed=Math.min(100,Math.max(0,timestamp-lastFrame));lastFrame=timestamp;
    if (currentGame&&!paused&&!dialogId&&!document.hidden) {
        accumulator+=elapsed;
        while(accumulator>=STEP) {fixedUpdate();accumulator-=STEP;if(dialogId)break;}
    } else accumulator=0;
    if (currentGame && !paused && !dialogId && !document.hidden) {
        ctx.save();currentGame.draw();ctx.restore();
        $('score-value').textContent=currentGame.score;$('level-value').textContent=currentGame.level;
        updateAccessibleGameState();
    }
    requestAnimationFrame(runGameLoop);
}
let lastGameStatus='',lastGameAnnouncement=0;
function updateAccessibleGameState() {
    const g=currentGame;let message='';
    if(currentGameType==='simon')message=g.showingSeq?ui('watch')+(g.flash===null?'':' '+ui(g.flash===0?'left':'right')):(g.inputEnabled?ui('yourTurn')+' '+ui((g.switchMode===1?g.answerScan:g.sequence[g.playerSeq.length])===0?'left':'right'):'');
    if(currentGameType==='whack')message=g.moles.map((m,i)=>m.up?ui(i===0?'left':'right'):'').filter(Boolean).join(' ');
    if(currentGameType==='fruit')message=[0,1].filter(side=>g.fruits.some(f=>!f.sliced&&f.side===side&&f.y<canvas.height-50)).map(side=>ui(side===0?'left':'right')).join(' ');
    $('game-cue').textContent=message;
    // Clear an expired cue too, so a new target on the same side is announced.
    if(message!==lastGameStatus){announce(message,!!message);lastGameStatus=message;}
    if(simulationTime-lastGameAnnouncement>5000){$('game-status').textContent=getTranslation('score')+': '+g.score+'. '+getTranslation('level')+': '+g.level;lastGameAnnouncement=simulationTime;}
}
function setupEventListeners() {
    $('prev-page-btn').onclick=prevPage;$('next-page-btn').onclick=nextPage;
    $('menu-settings-btn').onclick=$('settings-btn').onclick=openSettings;
    $('pause-btn').onclick=pauseGame;$('home-btn').onclick=goToMainMenu;
    $('resume-btn').onclick=resumeGame;$('pause-menu-btn').onclick=goToMainMenu;
    $('pause-settings-btn').onclick=openSettings;
    $('restart-btn').onclick=restartGame;$('menu-btn').onclick=goToMainMenu;
    $('instructions-close-btn').onclick=()=>{pendingGameType=null;closeDialog();};
    $('start-game-btn').onclick=()=>{if(pendingGameType)actuallyStartGame(pendingGameType);};
    $('game-mode-btn').onclick=()=>{setSwitchMode(pendingGameType,getSwitchMode(pendingGameType)===1?2:1);updateInstructions();};
    for(const [id,delta]of [['slower-btn',-1],['faster-btn',1]])$(id).onclick=()=>{setGameSpeed(pendingGameType,Math.max(1,Math.min(10,getGameSpeed(pendingGameType)+delta)));updateInstructions();};
    $('settings-close-btn').onclick=settingsBack;
    $('profile-btn').onclick=()=>{settings.switchMode=settings.switchMode===1?2:1;settings.scanMode=settings.switchMode===1?'auto':'step';for(const key of gameIds)delete switchModeSettings[key];storage.write('switchModeSettings',switchModeSettings);changedSettings();};
    $('scan-mode-btn').onclick=()=>{const modes=['auto','step','off'];settings.scanMode=modes[(modes.indexOf(settings.scanMode)+1)%modes.length];changedSettings();};
    for(const [id,key,values]of [['scan-speed-btn','scanSpeed',[1000,1500,2000,3000,4000,6000,8000,10000]],['debounce-btn','debounce',[0,100,200,300,500,750,1000]],['hold-btn','holdPause',[0,1500,2500,4000,6000]]])$(id).onclick=()=>{settings[key]=values[(values.indexOf(settings[key])+1)%values.length];changedSettings();};
    for(const [id,key]of [['practice-btn','practiceMode'],['sound-btn','soundEnabled'],['speech-btn','spokenScan'],['text-btn','largeText'],['motion-btn','reducedMotion']])$(id).onclick=()=>{settings[key]=!settings[key];changedSettings();};
    $('language-btn').onclick=()=>{const root=$('language-options');root.replaceChildren();availableLanguages.filter(l=>translations[l.code]).forEach(l=>{const b=document.createElement('button');b.textContent=l.name;b.lang=l.code;b.onclick=()=>{setLanguage(l.code);openSettings();};root.append(b);});openDialog('language-dialog');};
    $('language-back-btn').onclick=openSettings;
    document.addEventListener('keydown',e=>{
        trapFocus(e);
        if(e.key==='Tab') {
            keyboardNavigation=true;clearTimeout(scanTimer);
            document.querySelectorAll('.scan-focus').forEach(el=>el.classList.remove('scan-focus'));
            return;
        }
        if(e.key==='Escape'||e.key==='Home') {e.preventDefault();if(dialogId==='instructions')$('instructions-close-btn').click();else if(dialogId==='settings-dialog')settingsBack();else if(dialogId==='language-dialog')openSettings();else goToMainMenu();return;}
        if(e.key.toLowerCase()==='p'&&currentGame&&!e.repeat){e.preventDefault();if(paused)resumeGame();else pauseGame();return;}
        if(e.target.matches('input,select,textarea,[contenteditable="true"]'))return;
        const side=['ArrowLeft','1','3'].includes(e.key)?'left':['ArrowRight','2','4'].includes(e.key)?'right':null;
        if(side){e.preventDefault();if(!e.repeat)switchDown(side,'key:'+e.code);}
        else if([' ','Enter'].includes(e.key)&&!e.target.closest('button,a')) {e.preventDefault();if(!e.repeat)switchDown('left','key:'+e.code);}
    });
    document.addEventListener('keyup',e=>{const source='key:'+e.code;if(sources.has(source))switchUp(sources.get(source),source);});
    for(const side of ['left','right']) {
        const button=$(side+'-btn');
        button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);switchDown(side,'pointer:'+e.pointerId);});
        for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>switchUp(side,'pointer:'+e.pointerId));
        button.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)switchDown(side,'button:'+side);}});
        button.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();switchUp(side,'button:'+side);}});
        button.addEventListener('click',e=>{if(e.detail===0&&!sources.has('button:'+side)){switchDown(side,'activation:'+side);switchUp(side,'activation:'+side);}});
    }
    window.addEventListener('blur',()=>{clearInputs();if(currentGame&&!dialogId)pauseGame();});
    document.addEventListener('visibilitychange',()=>{clearInputs();if(document.hidden&&currentGame&&!dialogId)pauseGame();lastFrame=null;ensureAutoScanTimer();});
    window.addEventListener('resize',resizeCanvas);
}
document.addEventListener('DOMContentLoaded',()=>{
    loadSettings();loadLanguage();canvas=$('game-canvas');canvas.width=600;canvas.height=600;ctx=canvas.getContext('2d');
    setupEventListeners();updateSettings();renderPage();resizeCanvas();requestAnimationFrame(runGameLoop);
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
});
