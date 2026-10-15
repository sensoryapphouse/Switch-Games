// No third-party dependencies: node --test tests/*.test.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
function harness(width=600,height=600) {
    let now=10000, nextTimer=0;
    const timers=new Map(), nodes=new Map(), saved=new Map(), events={};
    const noop=()=>{};
    const ctx=new Proxy({
        arc(x,y,r){assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&r>=0);},
        createRadialGradient(){return {addColorStop:noop};}
    },{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
    function node(id='',tag='button') {
        const classes=new Set();
        const n={id,tagName:tag.toUpperCase(),children:[],dataset:{},style:{},attributes:{},hidden:false,disabled:false,inert:false,textContent:'',isConnected:true,
            classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle(c,on){if(on===undefined)on=!classes.has(c);on?classes.add(c):classes.delete(c);}},
            setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k]??null;},
            getClientRects(){return this.hidden?[]:[{}];},getBoundingClientRect(){return {width:1000,height:700};},
            matches(){return false;},closest(){return null;},scrollIntoView:noop,
            append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},
            addEventListener(k,f){(this.listeners??={})[k]=f;},
            click(){this.onclick?.();this.listeners?.click?.({detail:1});},
            focus(){document.activeElement=this;},remove:noop,
            querySelectorAll(){return this.children.flatMap(c=>[c,...c.querySelectorAll()]).filter(c=>c.tagName==='BUTTON');},
            querySelector(){return this.querySelectorAll()[0]||null;},
            getContext:()=>ctx};
        if(id)nodes.set(id,n);
        return n;
    }
    for(const match of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"/g))node(match[2],match[1]);
    const overlays=['instructions','pause-dialog','game-over','settings-dialog','language-dialog'];
    for(const id of overlays) {
        const section=html.slice(html.indexOf('<section id="'+id+'"'));
        nodes.get(id).children=[...section.slice(0,section.indexOf('</section>')).matchAll(/<button[^>]*id="([^"]+)"/g)].map(m=>nodes.get(m[1]));
        nodes.get(id).hidden=true;
    }
    nodes.get('main-menu').children=['menu-settings-btn','prev-page-btn','games-grid','next-page-btn'].map(id=>nodes.get(id));
    nodes.get('main-menu').classList.add('active');
    nodes.get('game-canvas').width=width;nodes.get('game-canvas').height=height;
    const document={body:node('body','body'),documentElement:{},activeElement:null,hidden:false,
        getElementById:id=>nodes.get(id),createElement:tag=>node('',tag),
        addEventListener:(k,f)=>events[k]=f,
        querySelectorAll(sel){if(sel==='.overlay')return overlays.map(id=>nodes.get(id));if(sel==='.scan-focus')return [...nodes.values()].filter(n=>n.classList.contains('scan-focus'));return [];},
        querySelector:()=>null};
    document.activeElement=document.body;
    const sb={console,document,performance:{now:()=>now},window:{addEventListener:noop,AudioContext:null},
        navigator:{getGamepads:()=>[]},matchMedia:()=>({matches:true}),
        localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},
        setTimeout:(f,delay)=>{timers.set(++nextTimer,{f,at:now+delay});return nextTimer;},
        clearTimeout:id=>timers.delete(id),requestAnimationFrame:noop,Math:Object.create(Math)};
    vm.createContext(sb);
    for(const file of ['storage.js','i18n.js',...fs.readdirSync(path.join(root,'lang')).map(f=>'lang/'+f),'ui-locales.js','games1.js','games2.js','games3.js','games4.js','engine.js'])
        vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sb,{filename:file});
    const run=code=>vm.runInContext(code,sb);
    run("canvas=$('game-canvas');ctx=canvas.getContext('2d');settings.soundEnabled=false;");
    return {run,sb,nodes,saved,events,advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.f();}}};
}
test('one-switch Tetris scans whole integer columns',()=>{
    const h=harness();assert.equal(h.run("let g=new Tetris();g.switchMode=1;g.init();let x=g.px;for(let i=0;i<26;i++)g.update(1);g.px!==x&&Number.isInteger(g.px)"),true);
});
test('one-switch Brick Builder drops into real grid cells',()=>{
    const h=harness();assert.equal(h.run("let g=new BrickBuilder();g.switchMode=1;g.init();g.update(1);g.dropBlock();g.grid[14].some(Boolean)&&Object.keys(g.grid[14]).every(k=>/^\\d+$/.test(k))"),true);
});
test('two-switch Tetris can reach the right-hand columns',()=>{
    const h=harness();assert.equal(h.run("let g=new Tetris();g.init();g.px=0;simulationTime=1000;input.leftPressed=true;g.update(1);g.px===g.gw-g.piece.shape[0].length"),true);
});
test('one-switch Brick Builder does not force an automatic drop',()=>{
    const h=harness();assert.equal(h.run("let g=new BrickBuilder();g.switchMode=1;g.init();for(let i=0;i<150;i++)g.update(1);g.grid.every(row=>row.every(cell=>!cell))"),true);
});
test('all Lunar Lander pads remain reachable',()=>{
    const h=harness();assert.equal(h.run("let g=new Lander();g.init();let ok=true;for(let i=0;i<15;i++){g.lander.y=540;g.lander.vy=0;g.update(1);ok&&=g.lander.x>g.padX&&g.lander.x<g.padX+g.padW;}ok&&!g.gameOver"),true);
});
test('one missed fruit counts once',()=>{
    const h=harness();assert.equal(h.run("let g=new Fruit();g.init();g.fruits=[{x:100,y:655,vy:2,vx:0,side:0,r:25,sliced:false}];for(let i=0;i<5;i++)g.update(1);g.misses===1&&!g.gameOver"),true);
});
test('one switch slices right-side fruit',()=>{
    const h=harness();assert.equal(h.run("let g=new Fruit();g.switchMode=1;g.init();g.fruits=[{x:450,y:200,vy:0,vx:0,side:1,r:25,sliced:false}];input.leftPressed=true;g.update(1);g.fruits[0].sliced"),true);
});
test('one switch hits a right-hand mole',()=>{
    const h=harness();assert.equal(h.run("let g=new Whack();g.switchMode=1;g.init();g.moles[1].up=true;g.moles[1].timer=1000;input.leftPressed=true;g.update(1);!g.moles[1].up&&g.score===10"),true);
});
test('one-switch Simon can select either scanned answer',()=>{
    const h=harness();assert.equal(h.run("let g=new Simon();g.switchMode=1;g.init();g.sequence=[1];g.showingSeq=false;g.inputEnabled=true;for(let i=0;i<125;i++)g.update(1);input.leftPressed=true;g.update(1);!g.gameOver&&g.score===10"),true);
});
test('Simon waits using simulation time, not an orphaned timeout',()=>{
    const h=harness();assert.equal(h.run("let g=new Simon();g.init();g.sequence=[0];g.showingSeq=false;g.inputEnabled=true;input.leftPressed=true;g.update(1);input.leftPressed=false;g.init();for(let i=0;i<40;i++)g.update(1);g.sequence.length===1"),true);
});
test('one switch operates both Pinball flippers',()=>{
    const h=harness();assert.equal(h.run("let g=new Pinball();g.switchMode=1;g.init();input.left=true;g.update(1);g.leftFlipper.active&&g.rightFlipper.active"),true);
});
test('Pinball drain width stays constant across screen widths',()=>{
    for(const width of [375,600,1000,1568]) {
        const h=harness(width);assert.ok(Math.abs(h.run("let g=new Pinball();g.init();canvas.width/2-2*Math.cos(.3)*g.flipperLen")-40)<1e-8);
    }
});
test('Pinball guides reflect an approaching ball using visible geometry',()=>{
    const h=harness();assert.equal(h.run("let g=new Pinball();g.init();let [x1,y1,x2,y2]=g.guides[0];let dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;g.ball.x=(x1+x2)/2+nx*5;g.ball.y=(y1+y2)/2+ny*5;g.ball.vx=-nx;g.ball.vy=-ny;g.checkGuideCollision(g.guides[0]);g.ball.vx*nx+g.ball.vy*ny>0"),true);
});
test('Air Hockey non-goal walls bounce instead of teleporting',()=>{
    const h=harness();assert.equal(h.run("let g=new AirHockey();g.init();g.puck={x:16,y:50,r:15,vx:-2.5,vy:0};g.update(1);g.puck.x===15&&g.puck.vx>0&&g.aiScore===0"),true);
});
test('Dino standing hits a bird; ducking passes underneath',()=>{
    for(const duck of [false,true]) {const h=harness();assert.equal(h.run("let g=new Dino();g.init();input.right="+duck+";g.obstacles=[{x:100,y:g.ground-30,w:30,h:20,type:'bird'}];g.update(1);g.gameOver"),!duck);}
});
test('Wire Loop retains completed-level score',()=>{
    const h=harness();assert.equal(h.run("let g=new WireLoop();g.init();g.ringPos=.999;input.right=true;g.update(1);input.right=false;g.update(1);g.score===1000"),true);
});
test('all 25 games update/draw in both switch modes at three logical sizes',()=>{
    for(const [w,hgt]of [[600,600],[375,500],[1000,600]])for(const mode of [1,2]){
        const h=harness(w,hgt);
        h.run("for(const Game of gameClasses()){let g=new Game();g.switchMode="+mode+";g.init();for(let n=0;n<300&&!g.gameOver;n++){simulationTime+=STEP;input.left=n%60<10;input.right=n%60>40;input.leftPressed=n%60===0;input.rightPressed=n%60===41;g.update(1);g.draw();if(!Number.isFinite(g.score))throw Error(Game.name+' non-finite score');}}");
    }
});
test('120Hz and 60Hz run equal simulation steps',()=>{
    const clocks=[];
    for(const hz of [60,120]) {const h=harness();h.run("currentGame={score:0,level:1,update(){this.score++;},draw(){}};currentGameType='snake';");for(let i=0;i<=hz*10;i++)h.run('runGameLoop('+(i*1000/hz)+')');clocks.push(h.run('currentGame.score'));}
    assert.ok(Math.abs(clocks[0]-clocks[1])<=1);assert.ok(Math.abs(clocks[0]-600)<=1);
});
test('corrupted/unavailable storage does not break load or save',()=>{
    const h=harness();h.saved.set('switchGameSettings','{broken');assert.doesNotThrow(()=>h.run('loadSettings()'));
    h.run("localStorage.getItem=()=>{throw Error('blocked')};localStorage.setItem=()=>{throw Error('quota')};loadSettings();saveSettings();loadLanguage();");
});
test('invalid persisted values are rejected',()=>{
    const h=harness();h.saved.set('switchGameSettings',JSON.stringify({speed:999,scanSpeed:0,debounce:'300'}));h.saved.set('switchGameSpeeds',JSON.stringify({snake:-20}));h.run('loadSettings()');assert.equal(h.run("settings.speed===5&&settings.scanSpeed===2000&&settings.debounce===0&&getGameSpeed('snake')===5"),true);
});
test('idle gamepad does not overwrite keyboard input',()=>{
    const h=harness();h.run("currentGame={};switchDown('left','key:ArrowLeft');navigator.getGamepads=()=>[{index:0,buttons:[],axes:[0,0]}];pollGamepad();");assert.equal(h.run('input.left'),true);
});
test('overlapping keyboard switches release independently',()=>{
    const h=harness();h.run("currentGame={};switchDown('left','key:Digit1');switchDown('left','key:Digit3');switchUp('left','key:Digit1');");assert.equal(h.run('input.left'),true);h.run("switchUp('left','key:Digit3')");assert.equal(h.run('input.left'),false);
});
test('held gamepad selection does not reopen instructions or reset lockout',()=>{
    const h=harness();h.run("renderPage();settings.scanMode='step';navigator.getGamepads=()=>[{index:0,buttons:[{pressed:false},{pressed:false},{pressed:true}],axes:[0,0]}];scanIndex=1;pollGamepad();");
    assert.equal(h.run('dialogId'),'instructions');const shown=h.run('overlayShownAt');h.advance(2000);h.run('pollGamepad()');assert.equal(h.run('overlayShownAt'),shown);
});
test('hold-to-pause clears input and exposes the pause dialog',()=>{
    const h=harness();h.run("currentGame={};switchDown('left','key:Digit1');");h.advance(2500);assert.equal(h.run("dialogId==='pause-dialog'&&paused&&!input.left"),true);
});
test('opening settings freezes simulation and exposes settings to scanning',()=>{
    const h=harness();h.run("currentGame={score:0,update(){this.score++;},draw(){}};openSettings();fixedUpdate();");assert.equal(h.run('currentGame.score'),0);assert.equal(h.run("scanTargets().some(b=>b.id==='profile-btn')"),true);
});
test('instructions start/back/settings remain inside the scan target list',()=>{
    const h=harness();h.run("startGame('snake')");
    assert.equal(h.run("['start-game-btn','game-mode-btn','slower-btn','faster-btn','instructions-close-btn'].every(id=>scanTargets().some(b=>b.id===id))"),true);
});
test('returning from a game preserves its selection page',()=>{
    const h=harness();h.run("currentPage=3;actuallyStartGame('pinball');goToMainMenu();");assert.equal(h.run('currentPage'),3);
});
test('the first scan target gets a full selectable interval after lockout',()=>{
    const h=harness();h.run("settings.scanSpeed=500;startGame('snake');");h.advance(500);assert.equal(h.run('scanIndex'),0);h.advance(600);assert.equal(h.run('scanIndex'),1);
});
test('native Tab navigation suspends automatic scanning until a switch is used',()=>{
    const h=harness();h.run('setupEventListeners();renderPage();');h.events.keydown({key:'Tab',shiftKey:false,preventDefault(){}});h.advance(10000);assert.equal(h.run('scanIndex'),0);assert.equal(h.run('keyboardNavigation'),true);h.run("switchDown('right','key:ArrowRight')");assert.equal(h.run('keyboardNavigation'),false);
});
test('the single-script static bundle parses and contains all game implementations',()=>{
    const bundle=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.doesNotThrow(()=>new vm.Script(bundle));
    for(const name of ['Balance','Simon','WireLoop','Pinball'])assert.match(bundle,new RegExp('class '+name+' \\{'));
});
test('practice recovery retains score, level and round timer',()=>{
    const h=harness();assert.equal(h.run("currentGameType='balance';let g=new Balance();g.init();g.score=80;g.timer=8000;g.level=4;g.gameOver=true;recoverPractice(g);g.score===80&&g.timer===8000&&g.level===4&&!g.gameOver"),true);
});
test('practice recovery is implemented for all games',()=>{
    const h=harness();h.run("for(let i=0;i<gameIds.length;i++){currentGameType=gameIds[i];let g=new (gameClasses()[i])();g.init();g.score=42;g.level=3;g.gameOver=true;recoverPractice(g);if(g.gameOver||g.score!==42||g.level!==3)throw Error(currentGameType);g.draw();}");
});
test('41 language schemas, UI strings and mode-aware instructions are complete',()=>{
    const h=harness();assert.equal(h.run('Object.keys(translations).length'),41);
    assert.equal(h.run("Object.entries(uiRows).every(([code,row])=>row.split('|').length===uiKeys.length&&translations[code])"),true);
    assert.equal(h.run("Object.keys(translations).every(code=>{currentLanguage=code;return gameIds.every(id=>translations[code].games[id]&&translations[code].instructions[id]&&getGameInstructions(id,1)!==getGameInstructions(id,2));})"),true);
    assert.equal(h.run("Object.values(translations).every(d=>Object.keys(d.games).length===25&&Object.keys(d.instructions).length===25)"),true);
});
test('language change sets document language and RTL direction',()=>{
    const h=harness();h.run("setLanguage('ar');");assert.equal(h.sb.document.documentElement.lang,'ar');assert.equal(h.sb.document.documentElement.dir,'rtl');
});
test('HTML has semantic dialogs and no inaccessible hidden inputs',()=>{
    for(const id of ['instructions','pause-dialog','game-over','settings-dialog','language-dialog'])assert.match(html,new RegExp('id="'+id+'"[^>]*role="dialog"[^>]*aria-modal="true"'));
    assert.doesNotMatch(html,/<input[^>]*type="(?:checkbox|radio)"/);
    assert.match(html,/aria-describedby="canvas-description game-status"/);
});
test('PWA shell names existing files and has no external font dependency',()=>{
    const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.match(sw,/cache.addAll/);
    for(const file of ['manifest.webmanifest','app-icon.svg','icon-192.png','icon-512.png','storage.js','ui-locales.js'])assert.ok(fs.existsSync(path.join(root,file)));
    assert.doesNotMatch(fs.readFileSync(path.join(root,'style.css'),'utf8'),/@import|fonts.googleapis/);
});
