// Real Google Chrome + DevTools Protocol, real-time requestAnimationFrame and
// trusted switch keys. Run mode workers separately; each uses its own profile.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decide} from './chrome-controller.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const mode=Number(option('--mode','1'));
let port=0; // Chrome chooses an unused port; never attach to an existing browser.
const seconds=Number(option('--seconds','20')),diagnosticSeconds=Number(option('--diagnostic-seconds','12'));
const filter=option('--games','').split(',').filter(Boolean),label=option('--label','baseline');
if(![1,2].includes(mode)||![seconds,diagnosticSeconds].every(n=>Number.isFinite(n)&&n>=0&&n<=3600)||!(/^[a-zA-Z0-9_-]+$/).test(label))throw Error('Invalid mode, duration or report label');
const out=path.join(root,'test-results','chrome',label,'mode-'+mode);fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'switch-games-chrome-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost'),relative=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)||relative.startsWith('.')){res.writeHead(403);res.end();return;}
    try{const data=fs.readFileSync(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const chromeCandidates=process.platform==='win32'
    ? [process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).map(dir=>path.join(dir,'Google','Chrome','Application','chrome.exe'))
    : process.platform==='darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'];
const chromePath=process.env.CHROME_PATH||chromeCandidates.find(file=>fs.existsSync(file));
if(!chromePath||!fs.existsSync(chromePath))throw Error('Chrome not found. Set CHROME_PATH to the Chrome executable.');
const chrome=spawn(chromePath,[
    '--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port,'--user-data-dir='+profile,
    '--mute-audio','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--window-size=1280,900','about:blank'
],{windowsHide:true,stdio:['ignore','ignore',fs.openSync(path.join(out,'chrome.log'),'a')]});
let ws, sequence=0;const pending=new Map(),exceptions=[],failedRequests=[];
for(const [signal,code] of [['SIGINT',130],['SIGTERM',143]])process.once(signal,()=>{chrome.kill('SIGTERM');ws?.close();server.close();process.exit(code);});
const report={browser:null,mode,label,base,profile,bundleSHA256:createHash('sha256').update(fs.readFileSync(path.join(root,'app.js'))).digest('hex'),started:new Date().toISOString(),soundPolicy:'Application sound and spoken names off before load; Chrome --mute-audio; AudioContext creation monitored',
    configuration:{ordinarySeconds:seconds,diagnosticSeconds,speed:5,scanMode:'step',holdPause:0,practiceMode:false},
    method:'Headless installed Google Chrome, real-time RAF, closed-loop trusted CDP keyboard inputs; later-level fixtures explicitly diagnostic, never counted as earned progression',cases:[]};
const save=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
function send(method,params={}){const id=++sequence;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value;}
async function waitUntil(expression,timeout=5000){const until=Date.now()+timeout;do{if(await evaluate(expression))return true;await sleep(30);}while(Date.now()<until);return false;}
async function advanceSimulation(ms){const target=await evaluate('simulationTime')+ms;if(!await waitUntil('simulationTime>='+target))throw Error('Simulation did not advance for diagnostic probe');}
async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'png'});const file=path.join(out,name+'.png');fs.writeFileSync(file,Buffer.from(r.data,'base64'));return path.relative(root,file);}
const held=new Set();
async function key(side,down){const key=side==='left'?'ArrowLeft':'ArrowRight';await send('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key,code:key,windowsVirtualKeyCode:side==='left'?37:39});down?held.add(side):held.delete(side);}
async function release(){for(const side of [...held])await key(side,false);}
async function apply(plan){
    for(const side of ['left','right']){const want=!!plan[side];if(want&&!held.has(side))await key(side,true);else if(!want&&held.has(side))await key(side,false);}
    if(plan.pulse){await sleep(20);await release();}
}
const prepareLevel=level=>`(()=>{const g=currentGame;g.level=${level};
    if(currentGameType==='space-invaders')g.createEnemies();
    if(currentGameType==='snake')g.interval=Math.max(50,150-(g.level-1)*10);
    if(currentGameType==='breakout'){g.createBricks();g.ball.dy=-4-g.level*.5;}
    if(currentGameType==='bubble-shooter')g.createBubbles();
    if(currentGameType==='tetris')g.interval=Math.max(100,1000-(g.level-1)*100);
    if(currentGameType==='pong')g.ai.speed=Math.min(3.5,2.2+g.level*.15);
    if(currentGameType==='helicopter')g.gap=Math.max(100,200-(g.level-1)*10);
    if(currentGameType==='asteroids'){g.asteroids=[];for(let i=0;i<2+g.level;i++)g.spawnAsteroid();}
    if(currentGameType==='skiing')g.scroll=(g.level-1)*2000;
    if(currentGameType==='balance')g.timer=(g.level-1)*5000;
    if(currentGameType==='simon'){g.sequence=Array.from({length:g.level},()=>Math.random()>.5?1:0);g.playerSeq=[];g.showingSeq=true;g.showIndex=0;g.showTimer=0;g.inputEnabled=false;}
    if(currentGameType==='airhockey')g.ai.speed=2.5+g.level*.3;
    if(currentGameType==='lander'){g.padW=Math.max(80,140-g.level*6);g.padX=300-g.padW/2;}
    if(currentGameType==='penalty')g.keeper.speed=2+g.level*.2;
    if(currentGameType==='pinball')g.createBumpers();
    if(currentGameType==='stack'){g.blocks=Array.from({length:Math.max(1,(g.level-1)*5)},(_,i)=>({x:300,w:150,y:570-i*25}));if(g.blocks.at(-1).y<100)g.blocks.forEach(b=>b.y+=150);g.current.speed=3+g.blocks.length*.2;}
    if(currentGameType==='wireloop'){g.generateWire();g.completedScore=(g.level-1)*1000;}
    return {level:g.level,mode:g.switchMode};})()`;
async function start(id){await release();await evaluate(`goToMainMenu();setSwitchMode(${JSON.stringify(id)},${mode});startGame(${JSON.stringify(id)});document.getElementById('start-game-btn').click();window.__chromePlayer={last:{},target:null};`);}
async function play(id,level,duration,diagnostic){
    await start(id);if(diagnostic)await evaluate(prepareLevel(level));
    const phase={kind:diagnostic?'diagnostic-level-fixture':'ordinary-play',initialLevel:level,durationRequested:duration,samples:0,maxLevel:level,maxScore:0,inputs:0,naturalGameOvers:0,issues:[],screenshots:[]};
    const startAt=Date.now();let lastScore=-1,progressAt=Date.now();
    while(Date.now()-startAt<duration*1000){
        const state=await evaluate('window.__decide()');phase.samples++;
        if(state.sound||state.spoken||state.audioContexts){phase.issues.push({type:'sound-policy',state});break;}
        if(state.invalid?.length||state.gridGhosts?.length||state.geometryIssues?.length){phase.issues.push({type:'invalid-game-state',invalid:state.invalid,gridGhosts:state.gridGhosts,geometryIssues:state.geometryIssues});break;}
        phase.maxLevel=Math.max(phase.maxLevel,state.level);phase.maxScore=Math.max(phase.maxScore,state.score);phase.lastState=state;
        if(state.score!==lastScore){lastScore=state.score;progressAt=Date.now();}
        if(state.dialog==='game-over'){phase.naturalGameOvers++;phase.screenshots.push(await screenshot(id+'-L'+level+'-game-over'));break;}
        if(state.dialog){phase.issues.push({type:'unexpected-dialog',dialog:state.dialog});break;}
        phase.inputs+=Number(!!state.plan?.left)+Number(!!state.plan?.right);
        await apply(state.plan||{});await sleep(65);
    }
    await release();phase.elapsedSeconds=(Date.now()-startAt)/1000;phase.secondsSinceProgress=(Date.now()-progressAt)/1000;
    phase.simulatedSeconds=(phase.lastState?.simulationTime||0)/1000;
    phase.screenshots.push(await screenshot(id+'-L'+level+'-'+(diagnostic?'diagnostic':'ordinary')));
    if(phase.lastState?.dialog!=='game-over'){
        await evaluate('currentGame.gameOver=true');await waitUntil("dialogId==='game-over'");
        phase.forcedEndForNavigationOnly=true;
    }
    phase.gameOverShown=await evaluate("dialogId==='game-over'");
    await evaluate("document.getElementById('restart-btn').click()");await sleep(150);
    phase.restartWorks=await evaluate('currentGame!==null&&!currentGame.gameOver&&dialogId===null');
    await evaluate('pauseGame()');phase.pauseWorks=await evaluate("dialogId==='pause-dialog'&&paused");
    await evaluate('resumeGame()');phase.resumeWorks=await evaluate('!paused&&dialogId===null');
    await evaluate('goToMainMenu()');phase.menuWorks=await evaluate("currentGame===null&&document.getElementById('main-menu').classList.contains('active')");
    return phase;
}
async function probes(){
    const results=[];
    await start('pinball');await advanceSimulation(80);
    const rest=await evaluate('currentGame.flipperY+Math.sin(currentGame.rightFlipper.angle)*currentGame.flipperLen');
    await key('right',true);await advanceSimulation(200);
    const active=await evaluate('currentGame.flipperY+Math.sin(currentGame.rightFlipper.angle)*currentGame.flipperLen');
    results.push({name:'right-flipper-lifts',passed:active<rest,rest,active,screenshot:await screenshot('probe-right-flipper')});await release();
    if(mode===2){
        await start('pinball');await key('left',true);await advanceSimulation(200);
        await evaluate('(()=>{const g=currentGame;g.bumpers=[];const angle=g.rightFlipper.angle;g.ball.x=canvas.width*.75-Math.cos(angle)*g.flipperLen*.5;g.ball.y=g.flipperY+Math.sin(angle)*g.flipperLen*.5-2;g.ball.vx=0;g.ball.vy=1;})()');await advanceSimulation(34);
        const vy=await evaluate('currentGame.ball.vy');results.push({name:'inactive-flipper-not-powered-by-other-switch',passed:vy>=-6,vy});await release();
    }
    await start('breakout');await evaluate('currentGame.ball={x:300,y:590,r:8,dx:0,dy:1};');await advanceSimulation(34);
    const bounce=await evaluate('({vy:currentGame.ball.dy,over:currentGame.gameOver})');
    results.push({name:'ball-below-paddle-not-saved-from-underneath',passed:bounce.vy>0,...bounce,screenshot:await screenshot('probe-breakout-underside')});
    await start('snake');await evaluate('currentGame.snake=[{x:100,y:100},{x:100,y:120},{x:120,y:120},{x:120,y:100}];currentGame.dir=0;currentGame.food={x:400,y:400};currentGame.timer=150;');await advanceSimulation(34);
    const tail=await evaluate('({over:currentGame.gameOver,head:currentGame.snake[0]})');
    results.push({name:'snake-may-enter-vacating-tail-cell',passed:!tail.over,...tail,screenshot:await screenshot('probe-snake-tail')});
    await start('simon');await evaluate('currentGame.addToSequence()');
    const round=await evaluate('({round:currentGame.sequence.length,level:currentGame.level})');
    results.push({name:'simon-round-and-level-agree',passed:round.round===round.level,...round});
    await start('wireloop');await key(mode===1?'left':'right',true);await advanceSimulation(1000);await release();
    const stopped=await evaluate('currentGame.ringPos');await sleep(300);const after=await evaluate('currentGame.ringPos');
    results.push({name:'wireloop-stops-on-release',passed:stopped===after,stopped,after});
    await evaluate('goToMainMenu()');
    report.probes=results;save();console.log(JSON.stringify({event:'probes',mode,results}));
}
async function extendedProbes(){
    const results=[];
    const press=async(key,code=key)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code});};
    for(const key of ['Escape','Home']){
        await evaluate('currentPage=3;renderPage()');await start('pinball');
        await press(key);const state=await evaluate('({page:currentPage,menu:!currentGame,focus:document.activeElement?.dataset.game})');
        results.push({name:key+'-restores-menu-page',passed:state.page===3&&state.menu&&state.focus==='pinball',...state});
    }
    await start('lander');await key('left',true);await press('p','KeyP');
    const pausedAt=await evaluate('simulationTime');await sleep(250);
    const pause=await evaluate('({time:simulationTime,paused,clear:!input.left&&!input.right,dialog:dialogId})');
    await release();await press('p','KeyP');
    const resumed=await waitUntil('!paused&&!dialogId&&simulationTime>'+pausedAt);
    results.push({name:'P-pauses-freezes-clears-and-resumes',passed:pause.paused&&pause.time===pausedAt&&pause.clear&&resumed,...pause,resumed});
    await evaluate('settings.holdPause=250');await key('left',true);await sleep(400);
    results.push({name:'hold-to-pause-clears-input',passed:await evaluate("paused&&dialogId==='pause-dialog'&&!input.left")});
    await release();await evaluate('settings.holdPause=0;resumeGame()');
    const button=await evaluate("(()=>{const r=$('left-btn').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...button,id:1}]});await sleep(80);
    const touchHeld=await evaluate('input.left');
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(80);
    results.push({name:'touch-switch-press-release',passed:touchHeld&&await evaluate('!input.left')});
    await evaluate('openSettings()');
    await press('Tab');const first=await evaluate('document.activeElement.id');
    const last=await evaluate('scanTargets().at(-1).id');
    await evaluate('scanTargets().at(-1).focus()');await press('Tab');
    results.push({name:'settings-tab-focus-wraps',passed:await evaluate('document.activeElement.id===scanTargets()[0].id'),first,last});
    await evaluate('settingsBack();goToMainMenu();currentPage=0;renderPage();settings.scanMode="step";resetScan()');
    await key('right',true);await release();const scan=await evaluate('scanIndex');
    await key('left',true);await release();
    results.push({name:'two-switch-menu-scan-select',passed:scan===1&&await evaluate("dialogId==='instructions'"),scan});
    await evaluate('goToMainMenu()');
    for(const [width,height] of [[375,667],[667,375],[1280,900]]){
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
        await evaluate('settings.largeText=true;settings.reducedMotion=true;updateSettings()');await start('simon');await sleep(100);
        const layout=await evaluate("(()=>{const c=canvas.getBoundingClientRect(),p=$('play-area').getBoundingClientRect();return {width:innerWidth,height:innerHeight,canvas:{x:c.x,y:c.y,w:c.width,h:c.height},fits:c.left>=p.left-.5&&c.right<=p.right+.5&&c.top>=p.top-.5&&c.bottom<=p.bottom+.5&&c.width>0,overflow:document.documentElement.scrollWidth>innerWidth};})()");
        results.push({name:'large-text-game-layout-'+width+'x'+height,passed:layout.fits&&!layout.overflow,...layout,screenshot:await screenshot('ui-layout-'+width+'x'+height)});
        await evaluate('openSettings();setLanguage("ar");updateSettings()');await sleep(100);
        const rtl=await evaluate("({rtl:document.documentElement.dir==='rtl',overflow:document.documentElement.scrollWidth>innerWidth,switchOrder:$('left-btn').getBoundingClientRect().x<$('right-btn').getBoundingClientRect().x})");
        results.push({name:'RTL-settings-layout-'+width+'x'+height,passed:rtl.rtl&&!rtl.overflow&&rtl.switchOrder,...rtl,screenshot:await screenshot('ui-rtl-'+width+'x'+height)});
        await evaluate('setLanguage("en");settings.largeText=false;updateSettings();goToMainMenu()');
    }
    await start('pong');await evaluate('currentGame.ball={x:25,y:300,r:10,dx:-5,dy:0};');await advanceSimulation(17);
    const behind=await evaluate('({dx:currentGame.ball.dx,x:currentGame.ball.x})');
    results.push({name:'pong-no-save-from-behind-player',passed:behind.dx<0&&behind.x<25,...behind});
    await start('pong');await evaluate(prepareLevel(3));
    await evaluate('currentGame.ball={x:100,y:100,r:10,dx:5,dy:4.8};currentGame.ai.y=100;');await advanceSimulation(1800);
    const goal=await evaluate('({score:currentGame.score,aiSpeed:currentGame.ai.speed})');
    results.push({name:'pong-level-3-steep-shot-can-score',passed:goal.score>0,...goal});
    await start('bubble-shooter');await evaluate("(()=>{const g=currentGame;g.bubbles=[{x:18,y:38,color:g.colors[0]}];g.flying={x:18,y:38,dx:0,dy:-1,color:g.colors[1]};g.attach();})()");
    const cells=await evaluate('currentGame.bubbles.map(b=>({x:b.x,y:b.y}))');
    results.push({name:'bubbles-never-share-a-cell',passed:new Set(cells.map(b=>b.x+','+b.y)).size===cells.length,cells,screenshot:await screenshot('probe-bubble-occupied')});
    const audio=await evaluate('({sound:settings.soundEnabled,spoken:settings.spokenScan,contexts:window.__audioContexts})');
    results.push({name:'extended-probes-silent',passed:!audio.sound&&!audio.spoken&&!audio.contexts,...audio});
    await evaluate('goToMainMenu()');report.extendedProbes=results;save();console.log(JSON.stringify({event:'extended-probes',mode,results}));
}
async function paceProbes(){
    await start('spacedodge');await evaluate("setGameSpeed('spacedodge',1)");await sleep(1200);
    const state=await evaluate('({score:currentGame.score,time:simulationTime,sound:settings.soundEnabled,spoken:settings.spokenScan,contexts:window.__audioContexts})');
    report.paceProbes=[{name:'slow-Space-Dodge-still-earns-survival-points',passed:state.score>0&&!state.sound&&!state.spoken&&!state.contexts,...state,screenshot:await screenshot('probe-slow-spacedodge')}];
    await evaluate("setGameSpeed('spacedodge',5);goToMainMenu()");save();console.log(JSON.stringify({event:'pace-probes',mode,results:report.paceProbes}));
}
async function cueProbes(){
    await start('whack');
    await evaluate("window.__cueEvents=[];window.__cueObserver=new MutationObserver(()=>window.__cueEvents.push($('live-status').textContent));window.__cueObserver.observe($('live-status'),{childList:true,characterData:true,subtree:true});currentGame.spawnTimer=-1000000;currentGame.moles[0].up=true;currentGame.moles[0].timer=10000;");
    await advanceSimulation(50);await evaluate('currentGame.moles[0].up=false');await advanceSimulation(50);
    await evaluate('currentGame.moles[0].up=true;currentGame.moles[0].timer=10000');await advanceSimulation(50);
    const cue=await evaluate("({events:window.__cueEvents,left:ui('left'),sound:settings.soundEnabled,contexts:window.__audioContexts})");
    await evaluate('window.__cueObserver.disconnect()');
    report.cueProbes=[{name:'repeated-same-side-moles-announce-each-appearance',passed:cue.events.filter(t=>t===cue.left).length===2&&!cue.sound&&!cue.contexts,...cue}];
    await evaluate('goToMainMenu()');save();console.log(JSON.stringify({event:'cue-probes',mode,results:report.cueProbes}));
}
async function puzzleProbes(){
    await start('tetris');
    await evaluate("(()=>{const g=currentGame;g.grid=Array.from({length:20},(_,y)=>Array.from({length:10},(_,x)=>y>=16&&x!==9?'#00ffff':0));g.piece={shape:[[1],[1],[1],[1]],color:'#ff0066'};g.px=9;g.py=16;g.timer=1000;g.score=400;})()");
    await waitUntil('currentGame.score!==400||currentGame.gameOver');
    const state=await evaluate('({score:currentGame.score,level:currentGame.level,filled:currentGame.grid.flat().filter(Boolean).length,interval:currentGame.interval,sound:settings.soundEnabled,contexts:window.__audioContexts})');
    report.puzzleProbes=[{name:'diagnostic-Tetris-four-line-clear-advances-level',passed:state.score===1200&&state.level===2&&state.filled===0&&state.interval===900&&!state.sound&&!state.contexts,...state,screenshot:await screenshot('probe-tetris-line-clear')}];
    await evaluate('goToMainMenu()');save();console.log(JSON.stringify({event:'puzzle-probes',mode,results:report.puzzleProbes}));
}
async function penaltyProbes(){
    await start('penalty');await evaluate("(()=>{const g=currentGame;g.level=10;g.keeper={x:420,targetX:420,speed:4};g.preparing=false;g.shooting=true;g.ball={x:300,y:500,targetX:200,vy:-15};})()");
    await waitUntil('!currentGame.shooting');
    const state=await evaluate('({score:currentGame.score,misses:currentGame.misses,sound:settings.soundEnabled,contexts:window.__audioContexts})');
    report.penaltyProbes=[{name:'well-placed-level-10-penalty-can-score',passed:state.score>0&&state.misses===0&&!state.sound&&!state.contexts,...state,screenshot:await screenshot('probe-penalty-level-10')}];
    await evaluate('goToMainMenu()');save();console.log(JSON.stringify({event:'penalty-probes',mode,results:report.penaltyProbes}));
}
try{
    let targets;
    for(let n=0;n<100;n++){try{port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();break;}catch{await sleep(100);}}
    if(!targets)throw Error('Chrome DevTools endpoint did not start');
    const target=targets.find(t=>t.type==='page');ws=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
    ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}
        else if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails);
        else if(m.method==='Network.loadingFailed')failedRequests.push(m.params);
    });
    await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setBypassServiceWorker',{bypass:true});
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    report.browser=await send('Browser.getVersion');
    await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('switchGameSettings',JSON.stringify({soundEnabled:false,spokenScan:false,speed:5,scanMode:'step',switchMode:${mode},holdPause:0,practiceMode:false}));window.__audioContexts=0;for(const name of ['AudioContext','webkitAudioContext']){const Original=window[name];if(Original)window[name]=class extends Original{constructor(...args){window.__audioContexts++;super(...args);}};}`});
    await send('Page.navigate',{url:base});
    for(let n=0;n<100;n++){if(await evaluate("document.readyState==='complete'&&typeof currentGame!=='undefined'&&typeof canvas!=='undefined'&&!!canvas"))break;await sleep(100);}
    await evaluate('window.__decide='+decide.toString());
    const ids=await evaluate('gameIds');
    console.log(JSON.stringify({event:'started',mode,browser:report.browser.product,base,games:filter.length?filter:ids}));
    if(args.includes('--probes'))await probes();
    if(args.includes('--extended-probes'))await extendedProbes();
    if(args.includes('--pace-probes'))await paceProbes();
    if(args.includes('--cue-probes'))await cueProbes();
    if(args.includes('--puzzle-probes'))await puzzleProbes();
    if(args.includes('--penalty-probes'))await penaltyProbes();
    for(const id of ids.filter(id=>!filter.length||filter.includes(id))){
        const entry={id,mode,phases:[],exceptions:[]},exceptionStart=exceptions.length;
        console.log(JSON.stringify({event:'game',id,mode}));
        for(const level of [1,2,3]){
            if(level===1&&seconds<=0)continue;
            if(level>1&&diagnosticSeconds<=0)continue;
            const phase=await play(id,level,level===1?seconds:diagnosticSeconds,level>1);entry.phases.push(phase);
            console.log(JSON.stringify({event:'phase',id,mode,level,elapsed:phase.elapsedSeconds,maxLevel:phase.maxLevel,maxScore:phase.maxScore,deaths:phase.naturalGameOvers,issues:phase.issues}));
        }
        entry.exceptions=exceptions.slice(exceptionStart);entry.passed=entry.phases.every(p=>!p.issues.length&&p.gameOverShown&&p.restartWorks&&p.pauseWorks&&p.resumeWorks&&p.menuWorks)&&!entry.exceptions.length;
        report.cases.push(entry);save();console.log(JSON.stringify({event:'completed-game',id,mode,passed:entry.passed}));
    }
    report.completed=new Date().toISOString();report.exceptions=exceptions;report.failedRequests=failedRequests;
    report.technicalChecksPassed=!exceptions.length&&report.cases.every(c=>c.passed)&&['probes','extendedProbes','paceProbes','cueProbes','puzzleProbes','penaltyProbes'].every(key=>(report[key]||[]).every(p=>p.passed));
    if(!report.technicalChecksPassed)process.exitCode=1;save();
    console.log(JSON.stringify({event:'finished',mode,cases:report.cases.length,passed:report.cases.filter(c=>c.passed).length,out}));
}catch(error){report.fatal=String(error.stack||error);save();console.error(report.fatal);process.exitCode=1;}
finally{await release().catch(()=>{});for(const {timer}of pending.values())clearTimeout(timer);pending.clear();ws?.close();chrome.kill('SIGTERM');server.close();server.closeAllConnections();}
// Reports are saved synchronously above; Windows may retain DevTools handles.
process.exit(process.exitCode||0);
