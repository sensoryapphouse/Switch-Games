// GAME 9: DINO RUNNER
class Dino {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.ground = canvas.height - 35;
        this.dino = { x: 80, y: this.ground, w: 40, h: 50, vy: 0, ducking: false };
        this.obstacles = []; this.timer = 0; this.speed = 6; this.jumping = false;
    }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: press either button to jump (no ducking)
            if ((input.leftPressed || input.rightPressed) && !this.jumping && this.dino.y >= this.ground) { this.dino.vy = -15; this.jumping = true; playSound('jump'); }
            this.dino.ducking = false;
        } else {
            // 2-switch: left=jump, right=duck
            if (input.leftPressed && !this.jumping && this.dino.y >= this.ground) { this.dino.vy = -15; this.jumping = true; playSound('jump'); }
            if (input.right) this.dino.ducking = true; else this.dino.ducking = false;
        }
        this.dino.vy += 0.8 * sm; this.dino.y += this.dino.vy * sm;
        if (this.dino.y >= this.ground) { this.dino.y = this.ground; this.dino.vy = 0; this.jumping = false; }
        const h = this.dino.ducking ? 25 : 50;
        this.timer += 16 * sm;
        if (this.timer > 1500 / (1 + this.level * 0.1)) {
            this.timer = 0;
            const type = this.switchMode === 1 ? 'cactus' : (Math.random() > 0.7 ? 'bird' : 'cactus'); // No birds in 1-switch mode
            if (type === 'cactus') this.obstacles.push({ x: canvas.width, y: this.ground, w: 20, h: 40, type });
            else this.obstacles.push({ x: canvas.width, y: this.ground - 30, w: 30, h: 20, type });
        }
        this.obstacles = this.obstacles.filter(o => {
            o.x -= this.speed * sm * (1 + this.level * 0.1);
            if (o.x < this.dino.x + this.dino.w && o.x + o.w > this.dino.x &&
                this.dino.y > o.y - o.h && this.dino.y - h < o.y) this.gameOver = true;
            return o.x > -50;
        });
        this.score++; if (this.score % 500 === 0) { this.level++; playSound('score'); }
    }
    draw() {
        ctx.fillStyle = '#f7f7f7'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#555'; ctx.fillRect(0, this.ground, canvas.width, 5);
        const h = this.dino.ducking ? 25 : 50;
        ctx.fillStyle = '#555'; ctx.fillRect(this.dino.x, this.dino.y - h, this.dino.w, h);
        ctx.fillStyle = '#333'; ctx.fillRect(this.dino.x + 25, this.dino.y - h, 20, 20);
        ctx.fillStyle = '#fff'; ctx.fillRect(this.dino.x + 35, this.dino.y - h + 3, 5, 5);
        this.obstacles.forEach(o => {
            if (o.type === 'cactus') { ctx.fillStyle = '#228B22'; ctx.fillRect(o.x, o.y - o.h, o.w, o.h); }
            else { ctx.fillStyle = '#666'; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y - o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
        });
    }
}

// GAME 10: HELICOPTER
class Helicopter {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.heli = { x: 100, y: canvas.height / 2, vy: 0, w: 50, h: 25 };
        this.walls = []; this.gap = 200; this.timer = 0; this.ceilY = 50; this.floorY = canvas.height - 50;
    }
    update(sm) {
        // Both modes work the same - any button thrusts up
        if (input.left || input.right) this.heli.vy -= 0.5 * sm; else this.heli.vy += 0.28 * sm;
        this.heli.vy = Math.max(-5, Math.min(5, this.heli.vy));
        this.heli.y += this.heli.vy * sm;
        if (this.heli.y < this.ceilY || this.heli.y + this.heli.h > this.floorY) { this.gameOver = true; return; }
        this.timer += 16 * sm;
        if (this.timer > 800) {
            this.timer = 0;
            const h = Math.random() * (this.floorY - this.ceilY - this.gap - 50) + 25;
            this.walls.push({ x: canvas.width, y: this.ceilY, h, bottom: false });
            this.walls.push({ x: canvas.width, y: this.ceilY + h + this.gap, h: this.floorY - this.ceilY - h - this.gap, bottom: true });
        }
        this.walls = this.walls.filter(w => {
            w.x -= 2.5 * sm * (1 + this.level * 0.08);
            if (this.heli.x + this.heli.w > w.x && this.heli.x < w.x + 30) {
                if (!w.bottom && this.heli.y < w.y + w.h) this.gameOver = true;
                if (w.bottom && this.heli.y + this.heli.h > w.y) this.gameOver = true;
            }
            return w.x > -30;
        });
        this.score++; if (this.score % 500 === 0) { this.level++; this.gap = Math.max(100, this.gap - 10); playSound('score'); }
    }
    draw() {
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#2a2a3a'; ctx.fillRect(0, 0, canvas.width, this.ceilY); ctx.fillRect(0, this.floorY, canvas.width, canvas.height - this.floorY);
        ctx.fillStyle = '#ff0066'; this.walls.forEach(w => ctx.fillRect(w.x, w.y, 30, w.h));
        // Helicopter body
        const hx = this.heli.x, hy = this.heli.y, hw = this.heli.w, hh = this.heli.h;
        // Main fuselage
        ctx.fillStyle = '#00aacc';
        ctx.beginPath(); ctx.roundRect(hx, hy, hw, hh, 5); ctx.fill();
        // Cockpit bubble
        ctx.fillStyle = '#66ddff';
        ctx.beginPath(); ctx.ellipse(hx + hw * 0.25, hy + hh * 0.45, hw * 0.22, hh * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        // Tail boom
        ctx.fillStyle = '#0088aa';
        ctx.fillRect(hx + hw - 5, hy + hh * 0.3, hw * 0.35, hh * 0.2);
        // Tail rotor
        ctx.fillStyle = '#aaa';
        ctx.fillRect(hx + hw + hw * 0.35 - 2, hy - 6, 4, hh + 12);
        // Main rotor blade (animated by using heli.x as seed)
        const rotAngle = (typeof settings !== 'undefined' && settings.reducedMotion) ? 0 : (gameNow() * 0.01) % (Math.PI * 2);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx + hw * 0.45 + Math.cos(rotAngle) * 40, hy - 3 + Math.sin(rotAngle) * 4);
        ctx.lineTo(hx + hw * 0.45 - Math.cos(rotAngle) * 40, hy - 3 - Math.sin(rotAngle) * 4);
        ctx.stroke();
        // Landing skids
        ctx.strokeStyle = '#666'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(hx + 5, hy + hh); ctx.lineTo(hx + 5, hy + hh + 8); ctx.lineTo(hx + hw * 0.5, hy + hh + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx + hw - 5, hy + hh); ctx.lineTo(hx + hw - 5, hy + hh + 8); ctx.lineTo(hx + hw * 0.5, hy + hh + 8); ctx.stroke();
    }
}

// GAME 11: RHYTHM
class Rhythm {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.notes = []; this.timer = 0; this.hitY = canvas.height - 80; this.combo = 0; this.misses = 0;
    }
    update(sm) {
        this.timer += 16 * sm;
        if (this.timer > 600 / (1 + this.level * 0.1)) {
            this.timer = 0;
            const lane = this.switchMode === 1 ? 0 : (Math.random() > 0.5 ? 0 : 1);
            this.notes.push({ lane, y: -30, hit: false });
        }
        this.notes = this.notes.filter(n => {
            n.y += 5 * sm * (1 + this.level * 0.2);
            if (n.y > this.hitY + 50 && !n.hit) { this.misses++; this.combo = 0; if (this.misses >= 10) this.gameOver = true; return false; }
            return n.y < canvas.height + 30;
        });
        const hitWindow = 40;
        if (this.switchMode === 1) {
            // 1-switch: either button hits any note
            if (input.leftPressed || input.rightPressed) {
                const hit = this.notes.find(n => !n.hit && Math.abs(n.y - this.hitY) < hitWindow);
                if (hit) { hit.hit = true; this.score += 10 * (1 + Math.floor(this.combo / 10)); this.combo++; playSound('score'); }
                else { playSound('low'); this.combo = 0; }
            }
        } else {
            // 2-switch: match button to lane
            if (input.leftPressed) {
                const hit = this.notes.find(n => n.lane === 0 && !n.hit && Math.abs(n.y - this.hitY) < hitWindow);
                if (hit) { hit.hit = true; this.score += 10 * (1 + Math.floor(this.combo / 10)); this.combo++; playSound('score'); }
                else { playSound('low'); this.combo = 0; }
            }
            if (input.rightPressed) {
                const hit = this.notes.find(n => n.lane === 1 && !n.hit && Math.abs(n.y - this.hitY) < hitWindow);
                if (hit) { hit.hit = true; this.score += 10 * (1 + Math.floor(this.combo / 10)); this.combo++; playSound('score'); }
                else { playSound('low'); this.combo = 0; }
            }
        }
        if (this.score > this.level * 200) this.level++;
    }
    draw() {
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const lw = canvas.width / 4;
        if (this.switchMode === 1) {
            // Single center lane for 1-switch
            const lx = canvas.width / 2 - lw / 2;
            ctx.fillStyle = '#1a1a3a'; ctx.fillRect(lx, 0, lw, canvas.height);
            ctx.fillStyle = 'rgba(255,0,102,0.3)'; ctx.fillRect(lx, this.hitY - 20, lw, 40);
            this.notes.forEach(n => {
                if (n.hit) return;
                ctx.fillStyle = '#ff0066';
                ctx.beginPath(); ctx.arc(canvas.width / 2, n.y, 25, 0, Math.PI * 2); ctx.fill();
            });
        } else {
            // Two lanes for 2-switch
            const lx1 = canvas.width / 2 - lw - 20, lx2 = canvas.width / 2 + 20;
            ctx.fillStyle = '#1a1a3a'; ctx.fillRect(lx1, 0, lw, canvas.height); ctx.fillRect(lx2, 0, lw, canvas.height);
            ctx.fillStyle = 'rgba(255,0,102,0.3)'; ctx.fillRect(lx1, this.hitY - 20, lw, 40); ctx.fillRect(lx2, this.hitY - 20, lw, 40);
            this.notes.forEach(n => {
                if (n.hit) return;
                ctx.fillStyle = n.lane === 0 ? '#ff0066' : '#00ffff';
                const x = n.lane === 0 ? lx1 + lw / 2 : lx2 + lw / 2;
                ctx.beginPath(); ctx.arc(x, n.y, 25, 0, Math.PI * 2); ctx.fill();
            });
        }
        ctx.fillStyle = '#fff'; ctx.font = '16px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`${ui("combo")}: ${this.combo}`, canvas.width / 2, 40);
    }
}

// GAME 12: TANK BATTLE
class Tank {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.tank = { x: canvas.width / 2, y: canvas.height / 2, angle: -Math.PI / 2, w: 40, h: 30, rotDir: 1 };
        this.bullets = []; this.enemies = []; this.lastShot = 0; this.enemyTimer = 0;
    }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: auto-rotate, press to change direction
            if (input.leftPressed || input.rightPressed) { this.tank.rotDir *= -1; playSound('move'); }
            this.tank.angle += 0.03 * sm * this.tank.rotDir;
        } else {
            // 2-switch: normal left/right rotation
            if (input.left) this.tank.angle -= 0.05 * sm;
            if (input.right) this.tank.angle += 0.05 * sm;
        }
        if (gameNow() - this.lastShot > 300) {
            this.bullets.push({ x: this.tank.x + Math.cos(this.tank.angle) * 25, y: this.tank.y + Math.sin(this.tank.angle) * 25,
                dx: Math.cos(this.tank.angle) * 8, dy: Math.sin(this.tank.angle) * 8 });
            playSound('shoot'); this.lastShot = gameNow();
        }
        this.bullets = this.bullets.filter(b => { b.x += b.dx * sm; b.y += b.dy * sm;
            return b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height; });
        this.enemyTimer += 16 * sm;
        if (this.enemyTimer > 2000 / (1 + this.level * 0.2)) {
            this.enemyTimer = 0;
            const side = Math.floor(Math.random() * 4);
            let x, y;
            if (side === 0) { x = Math.random() * canvas.width; y = -20; }
            else if (side === 1) { x = canvas.width + 20; y = Math.random() * canvas.height; }
            else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 20; }
            else { x = -20; y = Math.random() * canvas.height; }
            this.enemies.push({ x, y, r: 20 });
        }
        this.enemies = this.enemies.filter(e => {
            const dx = this.tank.x - e.x, dy = this.tank.y - e.y, dist = Math.hypot(dx, dy);
            e.x += (dx / dist) * 2 * sm * (1 + this.level * 0.1);
            e.y += (dy / dist) * 2 * sm * (1 + this.level * 0.1);
            if (dist < 30) { this.gameOver = true; return false; }
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                if (Math.hypot(this.bullets[i].x - e.x, this.bullets[i].y - e.y) < e.r + 5) {
                    this.bullets.splice(i, 1); this.score += 10 * this.level; playSound('hit');
                    if (this.score % 100 === 0) this.level++;
                    return false;
                }
            }
            return true;
        });
    }
    draw() {
        // Lighter background for better contrast
        ctx.fillStyle = '#2d5a2d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Subtle terrain texture
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < 8; i++) ctx.fillRect((i * 137) % canvas.width, (i * 113) % canvas.height, 40, 25);

        // Draw tank
        ctx.save(); ctx.translate(this.tank.x, this.tank.y); ctx.rotate(this.tank.angle);
        // Treads
        ctx.fillStyle = '#222'; ctx.fillRect(-24, -18, 48, 8); ctx.fillRect(-24, 10, 48, 8);
        ctx.fillStyle = '#333';
        for (let i = -22; i < 22; i += 8) { ctx.fillRect(i, -18, 6, 8); ctx.fillRect(i, 10, 6, 8); }
        // Hull
        ctx.fillStyle = '#6a8a3a'; ctx.fillRect(-18, -12, 36, 24);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-18, -12, 36, 24);
        ctx.fillStyle = '#5a7a2a'; ctx.fillRect(-16, -10, 32, 20);
        // Turret
        ctx.fillStyle = '#7a9a45'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6a8a35'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
        // Barrel
        ctx.fillStyle = '#4a5f20'; ctx.fillRect(10, -3, 22, 6); ctx.fillRect(28, -2, 5, 4);
        // Hatch
        ctx.fillStyle = '#5a7a30'; ctx.beginPath(); ctx.ellipse(-3, -2, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Bullets
        ctx.fillStyle = '#ffff00'; this.bullets.forEach(b => {
            ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,200,0,0.4)'; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffff00';
        });

        // Enemies — draw as enemy tanks
        this.enemies.forEach(e => {
            const s = e.r / 20; // scale
            ctx.save(); ctx.translate(e.x, e.y);
            // Enemy tank body (red tones)
            ctx.fillStyle = '#882222'; ctx.fillRect(-e.r * 0.8, -e.r * 0.5, e.r * 1.6, e.r);
            ctx.fillStyle = '#aa3333'; ctx.fillRect(-e.r * 0.65, -e.r * 0.4, e.r * 1.3, e.r * 0.8);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-e.r * 0.8, -e.r * 0.5, e.r * 1.6, e.r);
            // Turret
            ctx.fillStyle = '#cc4444'; ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.5, e.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            // Aim towards player
            const ang = Math.atan2(this.tank.y - e.y, this.tank.x - e.x);
            ctx.fillStyle = '#993333'; ctx.save(); ctx.rotate(ang);
            ctx.fillRect(e.r * 0.3, -e.r * 0.08, e.r * 0.6, e.r * 0.16);
            ctx.restore();
            // Treads
            ctx.fillStyle = '#551111'; ctx.fillRect(-e.r * 0.8, -e.r * 0.5, e.r * 1.6, e.r * 0.2);
            ctx.fillRect(-e.r * 0.8, e.r * 0.3, e.r * 1.6, e.r * 0.2);
            ctx.restore();
        });
    }
}

// GAME 13: ASTEROIDS
class Asteroids {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.ship = { x: canvas.width / 2, y: canvas.height / 2, angle: -Math.PI / 2, rotDir: 1 };
        this.bullets = []; this.asteroids = []; this.lastShot = 0;
        for (let i = 0; i < 2 + this.level; i++) this.spawnAsteroid();
    }
    spawnAsteroid(x, y, size) {
        size = size || 40;
        if (!x) { const side = Math.floor(Math.random() * 4);
            if (side === 0) { x = Math.random() * canvas.width; y = -size; }
            else if (side === 1) { x = canvas.width + size; y = Math.random() * canvas.height; }
            else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + size; }
            else { x = -size; y = Math.random() * canvas.height; }
        }
        const angle = Math.random() * Math.PI * 2;
        this.asteroids.push({ x, y, dx: Math.cos(angle) * (0.8 + Math.random() * 1.2), dy: Math.sin(angle) * (0.8 + Math.random() * 1.2), r: size });
    }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: auto-rotate, press to change direction
            if (input.leftPressed || input.rightPressed) { this.ship.rotDir *= -1; playSound('move'); }
            this.ship.angle += 0.05 * sm * this.ship.rotDir;
        } else {
            // 2-switch: normal left/right rotation
            if (input.left) this.ship.angle -= 0.08 * sm;
            if (input.right) this.ship.angle += 0.08 * sm;
        }
        if (gameNow() - this.lastShot > 550) {
            this.bullets.push({ x: this.ship.x + Math.cos(this.ship.angle) * 15, y: this.ship.y + Math.sin(this.ship.angle) * 15,
                dx: Math.cos(this.ship.angle) * 10, dy: Math.sin(this.ship.angle) * 10 });
            playSound('shoot'); this.lastShot = gameNow();
        }
        this.bullets = this.bullets.filter(b => { b.x += b.dx * sm; b.y += b.dy * sm;
            return b.x > -10 && b.x < canvas.width + 10 && b.y > -10 && b.y < canvas.height + 10; });
        this.asteroids.forEach(a => { a.x += a.dx * sm; a.y += a.dy * sm;
            if (a.x < -a.r) a.x = canvas.width + a.r; if (a.x > canvas.width + a.r) a.x = -a.r;
            if (a.y < -a.r) a.y = canvas.height + a.r; if (a.y > canvas.height + a.r) a.y = -a.r;
        });
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const a = this.asteroids[i];
            if (Math.hypot(this.ship.x - a.x, this.ship.y - a.y) < a.r + 10) { this.gameOver = true; return; }
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                if (Math.hypot(this.bullets[j].x - a.x, this.bullets[j].y - a.y) < a.r + 3) {
                    this.bullets.splice(j, 1);
                    if (a.r > 15) { this.spawnAsteroid(a.x, a.y, a.r / 2); this.spawnAsteroid(a.x, a.y, a.r / 2); }
                    this.asteroids.splice(i, 1);
                    this.score += Math.floor(50 / a.r * 10) * this.level; playSound('hit');
                    break;
                }
            }
        }
        if (!this.asteroids.length) { this.level++; playSound('score'); for (let i = 0; i < 2 + this.level; i++) this.spawnAsteroid(); }
    }
    draw() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 30; i++) { ctx.fillStyle = '#fff'; ctx.fillRect((i * 73) % canvas.width, (i * 97) % canvas.height, 1, 1); }
        ctx.save(); ctx.translate(this.ship.x, this.ship.y); ctx.rotate(this.ship.angle);
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(15, 0); ctx.lineTo(-10, -10); ctx.lineTo(-5, 0); ctx.lineTo(-10, 10); ctx.closePath(); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#ffff00'; this.bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); });
        ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
        this.asteroids.forEach(a => { ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.stroke(); });
    }
}

// GAME 14: SKIING
class Skiing {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.skier = { x: canvas.width / 2, speed: 5, dir: 1 };
        this.gates = []; this.trees = []; this.timer = 0; this.scroll = 0;
    }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: auto-move, press to change direction
            if (input.leftPressed || input.rightPressed) { this.skier.dir *= -1; playSound('move'); }
            this.skier.x += this.skier.speed * sm * this.skier.dir;
        } else {
            // 2-switch: normal left/right
            if (input.left) this.skier.x -= this.skier.speed * sm;
            if (input.right) this.skier.x += this.skier.speed * sm;
        }
        this.skier.x = Math.max(20, Math.min(canvas.width - 20, this.skier.x));
        const scrollSpeed = 5 * sm * (1 + this.level * 0.2);
        this.scroll += scrollSpeed;
        this.timer += 16 * sm;
        if (this.timer > 1000) {
            this.timer = 0;
            if (Math.random() > 0.3) {
                const gx = Math.random() * (canvas.width - 150) + 50;
                this.gates.push({ x: gx, y: -30, w: 100, passed: false });
            }
            for (let i = 0; i < 2; i++) this.trees.push({ x: Math.random() * canvas.width, y: -30 });
        }
        this.gates = this.gates.filter(g => {
            g.y += scrollSpeed;
            if (g.y > 80 && g.y < 120 && !g.passed) {
                if (this.skier.x > g.x && this.skier.x < g.x + g.w) { this.score += 10 * this.level; g.passed = true; playSound('score'); }
                else { this.score -= 5; g.passed = true; playSound('low'); }
            }
            return g.y < canvas.height + 30;
        });
        this.trees = this.trees.filter(t => {
            t.y += scrollSpeed;
            if (Math.abs(t.x - this.skier.x) < 15 && t.y > 70 && t.y < 110) this.gameOver = true;
            return t.y < canvas.height + 30;
        });
        if (this.scroll > this.level * 2000) { this.level++; playSound('score'); }
    }
    draw() {
        ctx.fillStyle = '#f0f8ff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.gates.forEach(g => { ctx.fillStyle = '#ff0000'; ctx.fillRect(g.x, g.y, 5, 30); ctx.fillRect(g.x + g.w - 5, g.y, 5, 30);
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + g.w, g.y); ctx.stroke(); });
        this.trees.forEach(t => { ctx.fillStyle = '#228B22'; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x - 15, t.y + 30); ctx.lineTo(t.x + 15, t.y + 30); ctx.fill();
            ctx.fillStyle = '#8B4513'; ctx.fillRect(t.x - 3, t.y + 30, 6, 10); });
        const sx = this.skier.x, sy = 90;
        // Head (helmet)
        ctx.fillStyle = '#0055cc'; ctx.beginPath(); ctx.arc(sx, sy - 22, 10, 0, Math.PI * 2); ctx.fill();
        // Face
        ctx.fillStyle = '#ffcc88'; ctx.beginPath(); ctx.arc(sx, sy - 14, 7, 0, Math.PI * 2); ctx.fill();
        // Body (ski suit)
        ctx.fillStyle = '#0055cc'; ctx.fillRect(sx - 7, sy - 8, 14, 20);
        // Poles (angled backward)
        ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx - 7, sy); ctx.lineTo(sx - 20, sy + 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 7, sy); ctx.lineTo(sx + 20, sy + 18); ctx.stroke();
        // Pole circles
        ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.arc(sx - 20, sy + 18, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 20, sy + 18, 3, 0, Math.PI * 2); ctx.fill();
        // Skis
        ctx.fillStyle = '#222'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx - 18, sy + 12); ctx.lineTo(sx + 2, sy + 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx - 2, sy + 14); ctx.lineTo(sx + 18, sy + 12); ctx.stroke();
    }
}
