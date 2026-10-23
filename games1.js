// GAME 1: SPACE INVADERS
class SpaceInvaders {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.player = { x: canvas.width / 2, y: canvas.height - 40, speed: 5, dir: 1 };
        this.bullets = []; this.enemyBullets = []; this.lastShot = 0;
        this.enemies = []; this.enemyDir = 1; this.enemySpeed = 1; this.createEnemies();
    }
    createEnemies() {
        this.enemies = [];
        const rows = 3 + Math.floor(this.level / 2), cols = Math.min(8, 5 + this.level);
        const w = 35, h = 25, pad = 15, sx = (canvas.width - cols * (w + pad)) / 2;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
            this.enemies.push({ x: sx + c * (w + pad), y: 50 + r * (h + pad), w, h, type: r % 3 });
        this.enemySpeed = 1 + this.level * 0.3;
    }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: auto-move, press either to change direction
            if (input.leftPressed || input.rightPressed) { this.player.dir *= -1; playSound('move'); }
            this.player.x += this.player.speed * sm * this.player.dir;
            if (this.player.x <= 25) { this.player.x = 25; this.player.dir = 1; }
            if (this.player.x >= canvas.width - 25) { this.player.x = canvas.width - 25; this.player.dir = -1; }
        } else {
            // 2-switch: normal left/right
            if (input.left && this.player.x > 25) this.player.x -= this.player.speed * sm;
            if (input.right && this.player.x < canvas.width - 25) this.player.x += this.player.speed * sm;
        }
        if (gameNow() - this.lastShot > 500 / sm) {
            this.bullets.push({ x: this.player.x, y: this.player.y - 10 }); playSound('shoot'); this.lastShot = gameNow();
        }
        this.bullets = this.bullets.filter(b => { b.y -= 8 * sm; return b.y > 0; });
        this.enemyBullets = this.enemyBullets.filter(b => { b.y += 4 * sm; return b.y < canvas.height; });
        if (Math.random() < 0.02 * sm && this.enemies.length) {
            const e = this.enemies[Math.floor(Math.random() * this.enemies.length)];
            this.enemyBullets.push({ x: e.x + e.w / 2, y: e.y + e.h });
        }
        let edge = false;
        this.enemies.forEach(e => { e.x += this.enemyDir * this.enemySpeed * sm; if (e.x <= 0 || e.x + e.w >= canvas.width) edge = true; });
        if (edge) { this.enemyDir *= -1; this.enemies.forEach(e => { e.y += 20; if (e.y + e.h >= this.player.y) this.gameOver = true; }); }
        for (let bi=this.bullets.length-1;bi>=0;bi--) {
            const b=this.bullets[bi];
            const ei=this.enemies.findIndex(e=>b.x>e.x&&b.x<e.x+e.w&&b.y>e.y&&b.y<e.y+e.h);
            if(ei>=0){this.bullets.splice(bi,1);this.enemies.splice(ei,1);this.score+=10*this.level;playSound('hit');}
        }
        this.enemyBullets.forEach(b => { if (Math.abs(b.x - this.player.x) < 25 && Math.abs(b.y - this.player.y) < 15) this.gameOver = true; });
        if (!this.enemies.length) { this.level++; playSound('score'); this.createEnemies(); }
    }
    draw() {
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 50; i++) { ctx.fillStyle = '#fff'; ctx.fillRect((i * 73) % canvas.width, (i * 97) % canvas.height, 2, 2); }
        ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.moveTo(this.player.x, this.player.y - 15);
        ctx.lineTo(this.player.x - 25, this.player.y + 10); ctx.lineTo(this.player.x + 25, this.player.y + 10); ctx.fill();
        ctx.fillStyle = '#ffff00'; this.bullets.forEach(b => ctx.fillRect(b.x - 2, b.y, 4, 15));
        ctx.fillStyle = '#ff0066'; this.enemyBullets.forEach(b => ctx.fillRect(b.x - 2, b.y, 4, 10));
        const cols = ['#ff0066', '#ff6600', '#ff00ff'];
        this.enemies.forEach(e => { ctx.fillStyle = cols[e.type]; ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = '#fff'; ctx.fillRect(e.x + 6, e.y + 6, 5, 5); ctx.fillRect(e.x + e.w - 11, e.y + 6, 5, 5); });
    }
}

// GAME 2: SNAKE
class Snake {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false; this.gridSize = 20; this.dir = 0;
        const sx = Math.floor(canvas.width / 2 / 20) * 20, sy = Math.floor(canvas.height / 2 / 20) * 20;
        this.snake = [{ x: sx, y: sy }, { x: sx - 20, y: sy }, { x: sx - 40, y: sy }];
        this.food = this.spawn(); this.timer = 0; this.interval = 150;
    }
    spawn() { let f; do { f = { x: Math.floor(Math.random() * (canvas.width / 20)) * 20, y: Math.floor(Math.random() * (canvas.height / 20)) * 20 };
        } while (this.snake.some(s => s.x === f.x && s.y === f.y)); return f; }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: press either button to turn right
            if (input.leftPressed || input.rightPressed) { this.dir = (this.dir + 1) % 4; playSound('move'); }
        } else {
            // 2-switch: left turns left, right turns right
            if (input.leftPressed) { this.dir = (this.dir + 3) % 4; playSound('move'); }
            if (input.rightPressed) { this.dir = (this.dir + 1) % 4; playSound('move'); }
        }
        this.timer += 16 * sm;
        if (this.timer >= this.interval) {
            this.timer = 0; const h = { ...this.snake[0] };
            if (this.dir === 0) h.x += 20; else if (this.dir === 1) h.y += 20; else if (this.dir === 2) h.x -= 20; else h.y -= 20;
            const growing = h.x === this.food.x && h.y === this.food.y;
            // The last cell is vacated on this same move unless food is eaten.
            const body = growing ? this.snake : this.snake.slice(0, -1);
            if (h.x < 0 || h.x >= canvas.width || h.y < 0 || h.y >= canvas.height || body.some(s => s.x === h.x && s.y === h.y)) { this.gameOver = true; return; }
            this.snake.unshift(h);
            if (h.x === this.food.x && h.y === this.food.y) { this.score += 10; playSound('score'); this.food = this.spawn();
                if (this.score % 50 === 0) { this.level++; this.interval = Math.max(50, this.interval - 10); }
            } else this.snake.pop();
        }
    }
    draw() {
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.snake.forEach((s, i) => { ctx.fillStyle = i === 0 ? '#00ffff' : `rgba(0,255,200,${1 - i / this.snake.length * 0.5})`;
            ctx.beginPath(); ctx.arc(s.x + 10, s.y + 10, 8, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = '#ff0066'; ctx.beginPath(); ctx.arc(this.food.x + 10, this.food.y + 10, 8, 0, Math.PI * 2); ctx.fill();
    }
}

// GAME 3: BREAKOUT
class Breakout {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.paddle = { x: canvas.width / 2, y: canvas.height - 30, w: 100, h: 15, speed: 8, dir: 1 };
        this.ball = { x: canvas.width / 2, y: canvas.height - 50, r: 8, dx: 4, dy: -4 };
        this.createBricks();
    }
    createBricks() {
        this.bricks = []; const rows = 4 + this.level, cols = Math.floor(canvas.width / 70);
        const w = 60, h = 20, pad = 10, sx = (canvas.width - cols * (w + pad) + pad) / 2;
        const colors = ['#ff0066', '#ff6600', '#ffff00', '#00ff66', '#00ffff', '#6666ff'];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
            this.bricks.push({ x: sx + c * (w + pad), y: 50 + r * (h + pad), w, h, color: colors[r % 6] });
    }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: auto-move paddle, press either to change direction
            if (input.leftPressed || input.rightPressed) { this.paddle.dir *= -1; playSound('move'); }
            this.paddle.x += this.paddle.speed * sm * this.paddle.dir;
            if (this.paddle.x <= this.paddle.w / 2) { this.paddle.x = this.paddle.w / 2; this.paddle.dir = 1; }
            if (this.paddle.x >= canvas.width - this.paddle.w / 2) { this.paddle.x = canvas.width - this.paddle.w / 2; this.paddle.dir = -1; }
        } else {
            // 2-switch: normal left/right
            if (input.left && this.paddle.x > this.paddle.w / 2) this.paddle.x -= this.paddle.speed * sm;
            if (input.right && this.paddle.x < canvas.width - this.paddle.w / 2) this.paddle.x += this.paddle.speed * sm;
        }
        const previousY = this.ball.y;
        this.ball.x += this.ball.dx * sm; this.ball.y += this.ball.dy * sm;
        if (this.ball.x <= this.ball.r || this.ball.x >= canvas.width - this.ball.r) { this.ball.dx *= -1; playSound('hit'); }
        if (this.ball.y <= this.ball.r) { this.ball.dy *= -1; playSound('hit'); }
        if (this.ball.y >= canvas.height) { this.gameOver = true; return; }
        const paddleTop = this.paddle.y - this.paddle.h / 2;
        if (this.ball.dy > 0 && previousY + this.ball.r <= paddleTop && this.ball.y + this.ball.r >= paddleTop && this.ball.x >= this.paddle.x - this.paddle.w / 2 && this.ball.x <= this.paddle.x + this.paddle.w / 2) {
            this.ball.y = paddleTop - this.ball.r;
            this.ball.dx = (this.ball.x - this.paddle.x) / (this.paddle.w / 2) * 6; this.ball.dy = -Math.abs(this.ball.dy); playSound('hit');
        }
        for (let i = this.bricks.length - 1; i >= 0; i--) { const b = this.bricks[i];
            if (this.ball.x + this.ball.r > b.x && this.ball.x - this.ball.r < b.x + b.w && this.ball.y + this.ball.r > b.y && this.ball.y - this.ball.r < b.y + b.h) {
                this.bricks.splice(i, 1); this.score += 10 * this.level; playSound('score'); this.ball.dy *= -1; break;
            }
        }
        if (!this.bricks.length) { this.level++; playSound('score'); this.ball = { x: canvas.width / 2, y: canvas.height - 50, r: 8, dx: 4 * (Math.random() > 0.5 ? 1 : -1), dy: -4 - this.level * 0.5 }; this.createBricks(); }
    }
    draw() {
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.bricks.forEach(b => { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h); });
        ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.roundRect(this.paddle.x - this.paddle.w / 2, this.paddle.y - this.paddle.h / 2, this.paddle.w, this.paddle.h, 5); ctx.fill();
        ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2); ctx.fill();
    }
}

// GAME 4: BUBBLE SHOOTER
class BubbleShooter {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false; this.r = 18;
        this.colors = ['#ff0066', '#00ffff', '#ffff00', '#00ff66', '#ff6600'];
        this.shooter = { x: canvas.width / 2, y: canvas.height - 50, angle: -Math.PI / 2, dir: 1 };
        this.current = { color: this.colors[Math.floor(Math.random() * 3)] };
        this.flying = null; this.bubbles = []; this.createBubbles();
    }
    createBubbles() {
        this.bubbles = []; const rows = 4 + Math.floor(this.level / 2), cols = Math.floor(canvas.width / (this.r * 2));
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const off = r % 2 ? this.r : 0, x = c * this.r * 2 + this.r + off;
            if (x + this.r <= canvas.width) this.bubbles.push({ x, y: r * this.r * 1.7 + this.r + 20, color: this.colors[Math.floor(Math.random() * Math.min(3 + this.level, 5))] });
        }
    }
    update(sm) {
        this.shooter.angle += this.shooter.dir * 0.02 * sm;
        if (this.shooter.angle <= -Math.PI + 0.3) this.shooter.dir = 1;
        else if (this.shooter.angle >= -0.3) this.shooter.dir = -1;
        if ((input.leftPressed || input.rightPressed) && !this.flying) {
            this.flying = { x: this.shooter.x, y: this.shooter.y, dx: Math.cos(this.shooter.angle) * 10, dy: Math.sin(this.shooter.angle) * 10, color: this.current.color };
            playSound('shoot');
        }
        if (this.flying) {
            this.flying.x += this.flying.dx * sm; this.flying.y += this.flying.dy * sm;
            if (this.flying.x <= this.r || this.flying.x >= canvas.width - this.r) { this.flying.dx *= -1; playSound('hit'); }
            if (this.flying.y <= 20 + this.r) this.attach();
            else for (const b of this.bubbles) if (Math.hypot(this.flying.x - b.x, this.flying.y - b.y) < this.r * 1.8) { this.attach(); break; }
        }
        for (const b of this.bubbles) if (b.y + this.r >= this.shooter.y - 30) { this.gameOver = true; return; }
        if (!this.bubbles.length) { this.level++; playSound('score'); this.createBubbles(); }
    }
    attach() {
        // Snap to the closest FREE hex cell, not the occupied cell we hit.
        // Enumerating only whole cells also keeps wall shots inside the table.
        const top = this.r + 20, spacing = this.r * 1.7;
        const rows = Math.ceil((this.shooter.y - top) / spacing);
        let cell = null, distance = Infinity;
        for (let row = 0; row <= rows; row++) {
            const off = row % 2 ? this.r : 0, y = top + row * spacing;
            for (let x = this.r + off; x + this.r <= canvas.width; x += this.r * 2) {
                if (this.bubbles.some(b => Math.abs(b.x - x) < .1 && Math.abs(b.y - y) < .1)) continue;
                if (row && !this.bubbles.some(b => Math.hypot(b.x - x, b.y - y) < this.r * 2.2)) continue;
                const d = Math.hypot(this.flying.x - x, this.flying.y - y);
                if (d < distance) { distance = d; cell = { x, y }; }
            }
        }
        if (!cell) { this.flying = null; this.gameOver = true; return; }
        const nb = { ...cell, color: this.flying.color }; this.bubbles.push(nb);
        const matches = this.findMatches(nb);
        if (matches.length >= 3) { matches.forEach(m => { const i = this.bubbles.indexOf(m); if (i > -1) this.bubbles.splice(i, 1); });
            this.score += matches.length * 10; playSound('score'); }
        this.flying = null; this.current = { color: this.colors[Math.floor(Math.random() * Math.min(3 + this.level, 5))] };
    }
    findMatches(b, visited = new Set()) {
        const m = [b]; visited.add(b);
        for (const o of this.bubbles) if (!visited.has(o) && o.color === b.color && Math.hypot(b.x - o.x, b.y - o.y) < this.r * 2.2) m.push(...this.findMatches(o, visited));
        return m;
    }
    draw() {
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#ff0066'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(canvas.width, 20); ctx.stroke();
        const bubble = (b,r) => {
            ctx.fillStyle=b.color; ctx.beginPath();ctx.arc(b.x,b.y,r,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
            ctx.fillStyle='#06101c';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(String(this.colors.indexOf(b.color)+1),b.x,b.y);ctx.textBaseline='alphabetic';
        };
        this.bubbles.forEach(b => bubble(b,this.r));
        if (this.flying) bubble(this.flying,this.r);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(this.shooter.x, this.shooter.y);
        ctx.lineTo(this.shooter.x + Math.cos(this.shooter.angle) * 60, this.shooter.y + Math.sin(this.shooter.angle) * 60); ctx.stroke();
        bubble({x:this.shooter.x,y:this.shooter.y,color:this.current.color},this.r*0.8);
    }
}

// GAME 5: TETRIS
class Tetris {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false; this.gw = 10; this.gh = 20;
        this.cs = Math.min(Math.floor((canvas.width - 40) / this.gw), Math.floor((canvas.height - 40) / this.gh));
        this.ox = (canvas.width - this.gw * this.cs) / 2; this.oy = 20;
        this.grid = Array(this.gh).fill(null).map(() => Array(this.gw).fill(0));
        this.shapes = [[[[1,1,1,1]],'#00ffff'],[[[1,1],[1,1]],'#ffff00'],[[[0,1,0],[1,1,1]],'#ff00ff'],
            [[[1,0],[1,0],[1,1]],'#ff6600'],[[[0,1],[0,1],[1,1]],'#0066ff'],[[[1,1,0],[0,1,1]],'#00ff00'],[[[0,1,1],[1,1,0]],'#ff0066']];
        this.piece = null; this.px = 0; this.py = 0; this.timer = 0; this.interval = 1000; this.lastInput = 0;
        this.moveDir = 1; this.moveTimer = 0;
        this.spawn();
    }
    spawn() {
        const t = this.shapes[Math.floor(Math.random() * this.shapes.length)];
        this.piece = { shape: t[0].map(r => [...r]), color: t[1] };
        this.px = Math.floor((this.gw - this.piece.shape[0].length) / 2); this.py = 0;
        if (this.collides(this.px, this.py, this.piece.shape)) this.gameOver = true;
    }
    rotate(s) { const r = s.length, c = s[0].length, n = []; for (let i = 0; i < c; i++) { n.push([]); for (let j = r - 1; j >= 0; j--) n[i].push(s[j][i]); } return n; }
    collides(x, y, s) {
        for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++)
            if (s[r][c] && (x + c < 0 || x + c >= this.gw || y + r >= this.gh || (y + r >= 0 && this.grid[y + r][x + c]))) return true;
        return false;
    }
    lock() {
        for (let r = 0; r < this.piece.shape.length; r++) for (let c = 0; c < this.piece.shape[r].length; c++)
            if (this.piece.shape[r][c] && this.py + r >= 0) this.grid[this.py + r][this.px + c] = this.piece.color;
        let cleared = 0;
        for (let r = this.gh - 1; r >= 0; r--) if (this.grid[r].every(c => c)) { this.grid.splice(r, 1); this.grid.unshift(Array(this.gw).fill(0)); cleared++; r++; }
        if (cleared) { this.score += [0, 100, 300, 500, 800][cleared] * this.level; playSound('score');
            if (this.score >= this.level * 500) { this.level++; this.interval = Math.max(100, 1000 - (this.level - 1) * 100); } }
        this.spawn();
    }
    update(sm) {
        const now = gameNow();
        if (this.switchMode === 1) {
            // 1-switch: auto-move horizontally, press to rotate
            this.moveTimer += 16 * sm;
            if (this.moveTimer >= 400) {
                this.moveTimer = 0;
                if (this.collides(this.px + this.moveDir, this.py, this.piece.shape)) this.moveDir *= -1;
                if (!this.collides(this.px + this.moveDir, this.py, this.piece.shape)) this.px += this.moveDir;
            }
            if (input.leftPressed || input.rightPressed) { 
                const rot = this.rotate(this.piece.shape); 
                if (!this.collides(this.px, this.py, rot)) { this.piece.shape = rot; playSound('move'); } 
            }
        } else {
            // 2-switch: left moves, right rotates
            if (now - this.lastInput > 150) {
                if (input.leftPressed) {
                    // With only move and rotate available, cycling past the left
                    // edge must also make the right-hand columns reachable.
                    const x = this.px > 0 ? this.px - 1 : this.gw - this.piece.shape[0].length;
                    if (!this.collides(x, this.py, this.piece.shape)) { this.px=x;playSound('move'); }
                    this.lastInput=now;
                }
                if (input.rightPressed) { const rot = this.rotate(this.piece.shape); if (!this.collides(this.px, this.py, rot)) { this.piece.shape = rot; playSound('move'); } this.lastInput = now; }
            }
        }
        this.timer += 16 * sm;
        if (this.timer >= this.interval) { this.timer = 0; if (!this.collides(this.px, this.py + 1, this.piece.shape)) this.py++; else this.lock(); }
    }
    draw() {
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(this.ox, this.oy, this.gw * this.cs, this.gh * this.cs);
        for (let r = 0; r < this.gh; r++) for (let c = 0; c < this.gw; c++) if (this.grid[r][c]) { ctx.fillStyle = this.grid[r][c]; ctx.fillRect(this.ox + c * this.cs + 1, this.oy + r * this.cs + 1, this.cs - 2, this.cs - 2); }
        if (this.piece) for (let r = 0; r < this.piece.shape.length; r++) for (let c = 0; c < this.piece.shape[r].length; c++)
            if (this.piece.shape[r][c]) { ctx.fillStyle = this.piece.color; ctx.fillRect(this.ox + (this.px + c) * this.cs + 1, this.oy + (this.py + r) * this.cs + 1, this.cs - 2, this.cs - 2); }
        ctx.strokeStyle = '#ff0066'; ctx.lineWidth = 3; ctx.strokeRect(this.ox, this.oy, this.gw * this.cs, this.gh * this.cs);
    }
}


// GAME 7: PONG
class Pong {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.player = { y: canvas.height / 2, h: 80, speed: 6, dir: 1 };
        // Keep the opponent slower than a well-angled return at every level.
        this.ai = { y: canvas.height / 2, h: 80, speed: Math.min(3.5, 2.2 + this.level * 0.15) };
        this.ball = { x: canvas.width / 2, y: canvas.height / 2, r: 10, dx: 5, dy: 3 };
        this.pw = 15; this.aiScore = 0;
    }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: auto-move paddle, press either to change direction
            if (input.leftPressed || input.rightPressed) { this.player.dir *= -1; playSound('move'); }
            this.player.y += this.player.speed * sm * this.player.dir;
            if (this.player.y <= this.player.h / 2) { this.player.y = this.player.h / 2; this.player.dir = 1; }
            if (this.player.y >= canvas.height - this.player.h / 2) { this.player.y = canvas.height - this.player.h / 2; this.player.dir = -1; }
        } else {
            // 2-switch: left=up, right=down
            if (input.left && this.player.y > this.player.h / 2) this.player.y -= this.player.speed * sm;
            if (input.right && this.player.y < canvas.height - this.player.h / 2) this.player.y += this.player.speed * sm;
        }
        if (this.ball.y < this.ai.y) this.ai.y -= this.ai.speed * sm; else if (this.ball.y > this.ai.y) this.ai.y += this.ai.speed * sm;
        this.ai.y = Math.max(this.ai.h / 2, Math.min(canvas.height - this.ai.h / 2, this.ai.y));
        const previousX = this.ball.x;
        this.ball.x += this.ball.dx * sm; this.ball.y += this.ball.dy * sm;
        if (this.ball.y <= this.ball.r) { this.ball.y = this.ball.r; this.ball.dy = Math.abs(this.ball.dy); playSound('hit'); }
        if (this.ball.y >= canvas.height - this.ball.r) { this.ball.y = canvas.height - this.ball.r; this.ball.dy = -Math.abs(this.ball.dy); playSound('hit'); }
        if (this.ball.dx < 0 && previousX - this.ball.r >= 30 && this.ball.x - this.ball.r <= 30 && Math.abs(this.ball.y - this.player.y) < this.player.h / 2) {
            this.ball.x = 30 + this.ball.r;
            this.ball.dx = Math.abs(this.ball.dx); this.ball.dy = (this.ball.y - this.player.y) / (this.player.h / 2) * 5; playSound('hit');
        }
        if (this.ball.dx > 0 && previousX + this.ball.r <= canvas.width - 30 && this.ball.x + this.ball.r >= canvas.width - 30 && Math.abs(this.ball.y - this.ai.y) < this.ai.h / 2) {
            this.ball.x = canvas.width - 30 - this.ball.r;
            this.ball.dx = -Math.abs(this.ball.dx); this.ball.dy = (this.ball.y - this.ai.y) / (this.ai.h / 2) * 5; playSound('hit');
        }
        if (this.ball.x < 0) { this.aiScore++; if (this.aiScore >= 5) this.gameOver = true; this.resetBall(); }
        if (this.ball.x > canvas.width) { this.score += 10; playSound('score'); if (this.score % 50 === 0) { this.level++; this.ai.speed = Math.min(3.5, 2.2 + this.level * 0.15); } this.resetBall(); }
    }
    resetBall() { this.ball = { x: canvas.width / 2, y: canvas.height / 2, r: 10, dx: 5 * (Math.random() > 0.5 ? 1 : -1), dy: (Math.random() - 0.5) * 6 }; }
    draw() {
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.setLineDash([10, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#00ffff'; ctx.fillRect(15, this.player.y - this.player.h / 2, this.pw, this.player.h);
        ctx.fillStyle = '#ff0066'; ctx.fillRect(canvas.width - 15 - this.pw, this.ai.y - this.ai.h / 2, this.pw, this.ai.h);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2); ctx.fill();
        ctx.font = '20px system-ui'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText(Math.floor(this.score / 10), canvas.width / 4, 40); ctx.fillText(this.aiScore, canvas.width * 3 / 4, 40);
    }
}

// GAME 8: FLAPPY BIRD
class Flappy {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.bird = { x: canvas.width * 0.3, y: canvas.height / 2, vy: 0, r: 15 };
        this.pipes = []; this.pipeTimer = 0; this.gravity = 0.22; this.jumpForce = -5;
    }
    update(sm) {
        if (input.leftPressed || input.rightPressed) { this.bird.vy = this.jumpForce; playSound('jump'); }
        this.bird.vy += this.gravity * sm; this.bird.y += this.bird.vy * sm;
        if (this.bird.y < 0 || this.bird.y > canvas.height) { this.gameOver = true; return; }
        this.pipeTimer += 16 * sm;
        if (this.pipeTimer > 1800 / (1 + this.level * 0.1)) {
            this.pipeTimer = 0; const gap = Math.max(100, 150 - this.level * 5), gapY = Math.random() * (canvas.height - gap - 100) + 50;
            this.pipes.push({ x: canvas.width, gapY, gap, w: 60, passed: false });
        }
        this.pipes = this.pipes.filter(p => {
            p.x -= 1.8 * sm * (1 + this.level * 0.08);
            if (this.bird.x + this.bird.r > p.x && this.bird.x - this.bird.r < p.x + p.w) {
                if (this.bird.y - this.bird.r < p.gapY || this.bird.y + this.bird.r > p.gapY + p.gap) this.gameOver = true;
            }
            if (!p.passed && p.x + p.w < this.bird.x) { p.passed = true; this.score += 10; playSound('score'); if (this.score % 50 === 0) this.level++; }
            return p.x > -p.w;
        });
    }
    draw() {
        ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.pipes.forEach(p => { ctx.fillStyle = '#00aa00';
            ctx.fillRect(p.x, 0, p.w, p.gapY); ctx.fillRect(p.x, p.gapY + p.gap, p.w, canvas.height - p.gapY - p.gap);
            ctx.fillStyle = '#00cc00'; ctx.fillRect(p.x - 5, p.gapY - 20, p.w + 10, 20); ctx.fillRect(p.x - 5, p.gapY + p.gap, p.w + 10, 20);
        });
        ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(this.bird.x, this.bird.y, this.bird.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.moveTo(this.bird.x + this.bird.r, this.bird.y);
        ctx.lineTo(this.bird.x + this.bird.r + 10, this.bird.y - 3); ctx.lineTo(this.bird.x + this.bird.r + 10, this.bird.y + 3); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(this.bird.x + 5, this.bird.y - 3, 3, 0, Math.PI * 2); ctx.fill();
    }
}
