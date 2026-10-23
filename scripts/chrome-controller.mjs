// Closed-loop test player. Reads live state through DevTools; it does not move
// sprites, award points, disable collisions or call update()/draw() directly.
export function decide() {
    const g=currentGame,id=currentGameType,m=g?.switchMode;
    if(!g)return {dialog:dialogId};
    const now=simulationTime, C=window.__chromePlayer ||= {last:{},target:null};
    const pulse=(side,condition=true,interval=240)=>{
        if(!condition||now-(C.last[side]||-10000)<interval)return {};
        C.last[side]=now;return {[side]:true,pulse:true};
    };
    const aim=(position,target,dir=1,speed=5)=>m===1?
        pulse('left',Math.abs(position-target)>12&&Math.sign(target-position)!==dir,Math.max(80,900/speed)):
        {left:position>target+8,right:position<target-8};
    const angular=(angle,target,dir=1)=>{
        const delta=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));
        return m===1?pulse('left',Math.abs(delta)>.15&&Math.sign(delta)!==dir,220):{left:delta<-.05,right:delta>.05};
    };
    let plan={};
    if(id==='space-invaders'){
        const enemy=[...g.enemies].sort((a,b)=>Math.abs(a.x-g.player.x)-Math.abs(b.x-g.player.x))[0];
        let target=enemy?enemy.x+enemy.w/2:300;
        const threat=g.enemyBullets.find(b=>Math.abs(b.x-g.player.x)<40&&g.player.y-b.y<130&&b.y<g.player.y);
        if(threat)target=g.player.x+(g.player.x>300?-90:90);
        plan=aim(g.player.x,target,g.player.dir,g.player.speed);
    }else if(id==='snake'){
        if(g.timer>g.interval-100){
            const head=g.snake[0],dirs=[[20,0],[0,20],[-20,0],[0,-20]];
            const safe=d=>{const [dx,dy]=dirs[d],x=head.x+dx,y=head.y+dy;return x>=0&&x<600&&y>=0&&y<600&&!g.snake.slice(0,-1).some(s=>s.x===x&&s.y===y);};
            const choices=(m===1?[g.dir,(g.dir+1)%4]:[g.dir,(g.dir+1)%4,(g.dir+3)%4]).filter(safe);
            choices.sort((a,b)=>{const distance=d=>Math.abs(head.x+dirs[d][0]-g.food.x)+Math.abs(head.y+dirs[d][1]-g.food.y);return distance(a)-distance(b);});
            const direction=choices[0];if(direction!==undefined&&direction!==g.dir)plan=pulse(direction===(g.dir+3)%4?'left':m===1?'left':'right',true,100);
        }
    }else if(id==='breakout'){
        let target=g.ball.x;if(g.ball.dy>0){const span=canvas.width-2*g.ball.r;target=g.ball.x+g.ball.dx*Math.max(0,(g.paddle.y-g.paddle.h/2-g.ball.r-g.ball.y)/g.ball.dy)-g.ball.r;target=((target%(span*2))+span*2)%(span*2);if(target>span)target=span*2-target;target+=g.ball.r;}
        plan=aim(g.paddle.x,Math.max(50,Math.min(550,target)),g.paddle.dir,g.paddle.speed);
    }else if(id==='bubble-shooter'){
        const targets=g.bubbles.filter(b=>b.color===g.current.color);
        const target=(targets.length?targets:[...g.bubbles]).sort((a,b)=>b.y-a.y)[0];
        if(target&&!g.flying){const angle=Math.atan2(target.y-g.shooter.y,target.x-g.shooter.x);plan=pulse('left',Math.abs(g.shooter.angle-angle)<.09,500);}
    }else if(id==='tetris'){
        // Evaluate legal rotations/columns for low stack height and few holes.
        const shapes=[g.piece.shape];for(let r=0;r<3;r++)shapes.push(g.rotate(shapes.at(-1)));
        let best=null;
        shapes.forEach((shape,rotation)=>{for(let x=0;x<=g.gw-shape[0].length;x++){
            if(g.collides(x,g.py,shape))continue;let y=g.py;while(!g.collides(x,y+1,shape))y++;
            const grid=g.grid.map(row=>[...row]);shape.forEach((row,dy)=>row.forEach((v,dx)=>{if(v&&y+dy>=0)grid[y+dy][x+dx]=1;}));
            let holes=0,heights=[];for(let c=0;c<10;c++){let seen=false,h=0;for(let r=0;r<20;r++){if(grid[r][c]){if(!seen)h=20-r;seen=true;}else if(seen)holes++;}heights.push(h);}
            const lines=grid.filter(r=>r.every(Boolean)).length;
            const cost=holes*30+heights.reduce((a,b)=>a+b,0)+heights.slice(1).reduce((v,h,i)=>v+Math.abs(h-heights[i]),0)-lines*40;
            if(!best||cost<best.cost)best={x,rotation,cost};
        }});
        if(best){if(best.rotation)plan=pulse(m===1?'left':'right',true,220);else if(m===2&&g.px!==best.x)plan=pulse('left',true,200);}
    }else if(id==='pong'||id==='airhockey'){
        const b=g.ball||g.puck,p=g.player,velocity=b.dy??b.vy;
        let target=b.y;if((b.dx??b.vx)<0){const span=canvas.height-2*b.r,face=id==='pong'?40:85;target=b.y+velocity*Math.max(0,(b.x-face)/Math.abs(b.dx??b.vx))-b.r;target=((target%(span*2))+span*2)%(span*2);if(target>span)target=span*2-target;target+=b.r;}
        // Aim off-centre instead of returning a dead-centre, endless rally.
        target+=target>300?-(id==='pong'?30:28):(id==='pong'?30:28);
        plan=aim(p.y,Math.max(45,Math.min(555,target)),p.dir,p.speed||5);
    }else if(id==='flappy'){
        const pipe=g.pipes.filter(p=>p.x+p.w>g.bird.x-10).sort((a,b)=>a.x-b.x)[0];
        const target=pipe?pipe.gapY+pipe.gap*.6:300;
        plan=pulse('left',g.bird.y>target-8&&g.bird.vy>-.5,220);
    }else if(id==='dino'){
        const o=g.obstacles.filter(o=>o.x+o.w>g.dino.x).sort((a,b)=>a.x-b.x)[0];
        if(o){if(o.type==='bird'&&m===2)plan={right:o.x<200};else plan=pulse('left',o.x<g.dino.x+150&&!g.jumping,250);}
    }else if(id==='helicopter'){
        const top=g.walls.filter(w=>!w.bottom&&w.x+30>g.heli.x).sort((a,b)=>a.x-b.x)[0];
        const target=top?top.y+top.h+g.gap/2-g.heli.h/2:280;
        plan={left:g.heli.y+g.heli.vy*8>target};
    }else if(id==='rhythm'){
        const note=g.notes.find(n=>!n.hit&&Math.abs(n.y-g.hitY)<30);if(note)plan=pulse(m===1||note.lane===0?'left':'right',true,100);
    }else if(id==='tank'||id==='asteroids'){
        const p=g.tank||g.ship,objects=g.enemies||g.asteroids;
        const target=[...objects].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
        if(target)plan=angular(p.angle,Math.atan2(target.y-p.y,target.x-p.x),p.rotDir);
    }else if(id==='skiing'){
        const gate=g.gates.filter(g=>!g.passed).sort((a,b)=>b.y-a.y)[0];let target=gate?gate.x+gate.w/2:300;
        const tree=g.trees.filter(t=>t.y<105&&t.y>-80).sort((a,b)=>b.y-a.y)[0];
        if(tree&&Math.abs(tree.x-g.skier.x)<55)target=g.skier.x+(tree.x>300?-90:90);
        plan=aim(g.skier.x,target,g.skier.dir,g.skier.speed);
    }else if(id==='balance'){
        const target=-((g.ball.x-300)*.0015+g.ball.vx*.07+g.platform.angVel*2);
        plan=m===1?pulse('left',Math.sign(target-g.platform.angle)!==g.platform.tiltDir,250):{left:g.platform.angle>target+.007,right:g.platform.angle<target-.007};
    }else if(id==='simon'){
        if(g.inputEnabled){const next=g.sequence[g.playerSeq.length];plan=pulse(m===1?'left':next===0?'left':'right',m!==1||g.answerScan===next,300);}
    }else if(id==='whack'){
        const index=g.moles.findIndex(m=>m.up);if(index>=0)plan=pulse(m===1||index===0?'left':'right',true,200);
    }else if(id==='lander'){
        const distance=540-g.lander.y;
        const desired=Math.min(1.7,Math.max(.5,distance*.01));
        plan={left:g.lander.vy>desired};
    }else if(id==='fruit'){
        for(const side of [0,1])if(g.fruits.some(f=>!f.sliced&&f.side===side&&f.y<550)){plan=pulse(m===1||side===0?'left':'right',true,220);if(plan.pulse)break;}
    }else if(id==='stack'){
        const last=g.blocks.at(-1);plan=pulse('left',Math.abs(g.current.x+g.current.w/2-last.x)<Math.max(5,last.w*.08),300);
    }else if(id==='penalty'){
        if(!g.preparing&&!g.shooting){const targetSide=g.keeper.x>300?'left':'right',targetX=m===1?300+g.shootDir*100:(targetSide==='left'?200:400);plan=pulse(m===1?'left':targetSide,Math.abs(g.keeper.x-targetX)>175,300);}
    }else if(id==='pinball'){
        plan={left:g.ball.y>g.flipperY-100,right:m===2&&g.ball.y>g.flipperY-100};
    }else if(id==='brickbuilder'){
        const scores=[];for(let x=0;x<=g.gridW-g.current.w;x++)scores.push({x,y:g.getDropY(x)});
        const target=scores.sort((a,b)=>b.y-a.y||a.x-b.x)[0];
        if(m===1)plan=pulse('left',Math.round(g.currentX)===target?.x,400);
        else if(target)plan=pulse(g.currentX>target.x?'left':'right',g.currentX!==target.x,200);
    }else if(id==='spacedodge'){
        const near=g.asteroids.filter(a=>a.y>g.ship.y-160&&a.y<g.ship.y+25).sort((a,b)=>b.y-a.y)[0];
        let target=300;if(near&&Math.abs(near.x-g.ship.x)<near.r+45)target=g.ship.x+(near.x>300?-120:120);
        plan=aim(g.ship.x,target,g.ship.dir,6);
    }else if(id==='wireloop')plan={right:m===2,left:m===1};
    const invalid=[];
    const walk=(o,p='',depth=0)=>{if(depth>5||!o||typeof o!=='object')return;for(const[k,v]of Object.entries(o)){if(typeof v==='number'&&!Number.isFinite(v))invalid.push(p+k);else if(v&&typeof v==='object')walk(v,p+k+'.',depth+1);}};
    walk(g);
    const geometryIssues=[];
    if(id==='pinball'){
        if(g.bumpers.length>9)geometryIssues.push('too-many-bumpers');
        for(let i=0;i<g.bumpers.length;i++)for(let j=i+1;j<g.bumpers.length;j++){
            const a=g.bumpers[i],b=g.bumpers[j];if(Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r)geometryIssues.push('overlapping-bumpers:'+i+','+j);
        }
    }
    if(id==='bubble-shooter'){
        const cells=new Set();for(const b of g.bubbles){
            const cell=b.x.toFixed(2)+','+b.y.toFixed(2);
            if(cells.has(cell))geometryIssues.push('duplicate-bubble:'+cell);
            cells.add(cell);if(b.x<g.r||b.x+g.r>canvas.width)geometryIssues.push('bubble-outside-wall:'+cell);
        }
    }
    return {plan,dialog:dialogId,score:g.score,level:g.level,over:g.gameOver,simulationTime,invalid,
        geometryIssues,
        sound:settings.soundEnabled,spoken:settings.spokenScan,audioContexts:window.__audioContexts||0,
        bounds:{x:g.bird?.x??g.player?.x??g.skier?.x??g.heli?.x??g.lander?.x,y:g.bird?.y??g.player?.y??g.heli?.y??g.lander?.y},
        objects:g.enemies?.length??g.bricks?.length??g.bubbles?.length??g.asteroids?.length??g.fruits?.length,
        gridGhosts:g.grid?.flatMap((row,i)=>Object.keys(row).filter(k=>!/^\d+$/.test(k)).map(k=>i+':'+k)),
        bubbleCells:g.bubbles?.map(b=>({x:b.x,y:b.y,color:b.color}))};
}
