// GAME 25: PINBALL
class Pinball {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 3, vy: -5, r: 10 };
        this.leftFlipper = { angle: 0.3, active: false };
        this.rightFlipper = { angle: -0.3, active: false };
        this.flipperLen = (canvas.width / 2 - 40) / (2 * Math.cos(0.3)); this.flipperY = canvas.height - 80;
        this.guides = [
            [canvas.width * 0.12, canvas.height * 0.5, canvas.width * 0.25, this.flipperY - 5],
            [canvas.width * 0.88, canvas.height * 0.5, canvas.width * 0.75, this.flipperY - 5]
        ];
        this.bumpers = [];
        this.createBumpers();
        this.balls = 3;
    }
    createBumpers() {
        this.bumpers = [
            { x: canvas.width * 0.3, y: canvas.height * 0.25, r: 25, points: 100 },
            { x: canvas.width * 0.7, y: canvas.height * 0.25, r: 25, points: 100 },
            { x: canvas.width * 0.5, y: canvas.height * 0.35, r: 30, points: 150 },
            { x: canvas.width * 0.25, y: canvas.height * 0.5, r: 20, points: 50 },
            { x: canvas.width * 0.75, y: canvas.height * 0.5, r: 20, points: 50 },
        ];
        for (let i = 0; i < this.level; i++) {
            this.bumpers.push({ x: Math.random() * (canvas.width - 100) + 50, y: Math.random() * (canvas.height * 0.4) + 50, r: 15 + Math.random() * 15, points: 75 });
        }
    }
    update(sm) {
        this.leftFlipper.active = input.left || (this.switchMode === 1 && input.right);
        this.rightFlipper.active = input.right || (this.switchMode === 1 && input.left);
        
        const targetL = this.leftFlipper.active ? -0.5 : 0.3;
        const targetR = this.rightFlipper.active ? 0.5 : -0.3;
        this.leftFlipper.angle += (targetL - this.leftFlipper.angle) * 0.3 * sm;
        this.rightFlipper.angle += (targetR - this.rightFlipper.angle) * 0.3 * sm;
        
        this.ball.vy += 0.2 * sm;
        this.ball.x += this.ball.vx * sm;
        this.ball.y += this.ball.vy * sm;
        
        if (this.ball.x <= this.ball.r) { this.ball.x = this.ball.r; this.ball.vx = Math.abs(this.ball.vx); playSound('hit'); }
        if (this.ball.x >= canvas.width - this.ball.r) { this.ball.x = canvas.width - this.ball.r; this.ball.vx = -Math.abs(this.ball.vx); playSound('hit'); }
        if (this.ball.y <= this.ball.r) { this.ball.y = this.ball.r; this.ball.vy = Math.abs(this.ball.vy); playSound('hit'); }
        // Side guide walls: deflect ball back toward flippers
        this.guides.forEach(guide => this.checkGuideCollision(guide));
        
        if (this.ball.y > canvas.height + 50) {
            this.balls--;
            if (this.balls <= 0) { this.gameOver = true; return; }
            this.ball = { x: canvas.width / 2, y: canvas.height / 2, vx: (Math.random() - 0.5) * 6, vy: -5, r: 10 };
            playSound('low');
        }
        
        // Flipper collision
        this.checkFlipperCollision(canvas.width * 0.25, this.flipperY, this.leftFlipper.angle, 1);
        this.checkFlipperCollision(canvas.width * 0.75, this.flipperY, this.rightFlipper.angle, -1);
        
        // Bumper collision
        this.bumpers.forEach(b => {
            const dx = this.ball.x - b.x, dy = this.ball.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < this.ball.r + b.r) {
                const angle = Math.atan2(dy, dx);
                this.ball.vx = Math.cos(angle) * 8;
                this.ball.vy = Math.sin(angle) * 8;
                this.ball.x = b.x + Math.cos(angle) * (this.ball.r + b.r + 1);
                this.ball.y = b.y + Math.sin(angle) * (this.ball.r + b.r + 1);
                this.score += b.points * this.level;
                b.hit = 5;
                playSound('score');
            }
            if (b.hit > 0) b.hit -= sm;
        });
        
        if (this.score >= this.level * 1000) { this.level++; this.createBumpers(); playSound('score'); }
    }
    checkGuideCollision([x1, y1, x2, y2]) {
        const dx = x2 - x1, dy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((this.ball.x-x1)*dx+(this.ball.y-y1)*dy)/(dx*dx+dy*dy)));
        const px = x1+t*dx, py = y1+t*dy;
        const distance = Math.hypot(this.ball.x-px, this.ball.y-py);
        if (distance >= this.ball.r+2.5 || distance === 0) return;
        const nx = (this.ball.x-px)/distance, ny = (this.ball.y-py)/distance;
        const dot = this.ball.vx*nx+this.ball.vy*ny;
        this.ball.x = px+nx*(this.ball.r+3); this.ball.y = py+ny*(this.ball.r+3);
        if (dot < 0) { this.ball.vx -= 2*dot*nx; this.ball.vy -= 2*dot*ny; playSound('hit'); }
    }
    checkFlipperCollision(fx, fy, angle, dir) {
        const endX = fx + Math.cos(angle) * this.flipperLen * dir;
        const endY = fy + Math.sin(angle) * this.flipperLen;
        const dx = endX - fx, dy = endY - fy;
        const t = Math.max(0, Math.min(1, ((this.ball.x - fx) * dx + (this.ball.y - fy) * dy) / (dx * dx + dy * dy)));
        const closestX = fx + t * dx, closestY = fy + t * dy;
        const distSq = (this.ball.x - closestX) ** 2 + (this.ball.y - closestY) ** 2;
        if (distSq < (this.ball.r + 8) ** 2 && this.ball.vy > 0) {
            const flipperSpeed = (this.leftFlipper.active || this.rightFlipper.active) ? 15 : 5;
            this.ball.vy = -flipperSpeed;
            this.ball.vx += angle * 10 * dir;
            playSound('hit');
        }
    }
    draw() {
        ctx.fillStyle = '#1a1a3a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Bumpers
        this.bumpers.forEach(b => {
            ctx.fillStyle = b.hit > 0 ? '#ffffff' : '#ff6600';
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 3; ctx.stroke();
        });
        
        // Side guide walls
        ctx.strokeStyle = '#888'; ctx.lineWidth = 5; ctx.lineCap = 'butt';
        this.guides.forEach(([x1,y1,x2,y2]) => { ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); });

        // Flippers
        ctx.strokeStyle = '#ff0066'; ctx.lineWidth = 16; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.25, this.flipperY);
        ctx.lineTo(canvas.width * 0.25 + Math.cos(this.leftFlipper.angle) * this.flipperLen, this.flipperY + Math.sin(this.leftFlipper.angle) * this.flipperLen);
        ctx.stroke();
        ctx.strokeStyle = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.75, this.flipperY);
        ctx.lineTo(canvas.width * 0.75 - Math.cos(this.rightFlipper.angle) * this.flipperLen, this.flipperY + Math.sin(this.rightFlipper.angle) * this.flipperLen);
        ctx.stroke();
        
        // Ball
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(this.ball.x - 3, this.ball.y - 3, 4, 0, Math.PI * 2); ctx.fill();
        
        // Balls remaining
        ctx.fillStyle = '#fff'; ctx.font = '16px system-ui';
        ctx.fillText(`${ui("balls")}: ${this.balls}`, 10, 25);
    }
}

// GAME 26: BRICK BUILDER
class BrickBuilder {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.gridW = 10; this.gridH = 15;
        this.cellW = Math.floor((canvas.width - 40) / this.gridW);
        this.cellH = 25;
        this.offsetX = (canvas.width - this.gridW * this.cellW) / 2;
        this.offsetY = canvas.height - this.gridH * this.cellH - 20;
        this.grid = Array(this.gridH).fill(null).map(() => Array(this.gridW).fill(0));
        this.current = null;
        this.currentX = 0;
        this.currentDir = 1; // For 1-switch auto-move
        this.dropTimer = 0;
        this.dropInterval = 1000;
        this.spawnBlock();
    }
    spawnBlock() {
        const colors = ['#ff0066', '#ff6600', '#ffff00', '#00ff66', '#00ffff', '#ff00ff'];
        const widths = [1, 2, 2, 3, 3, 4];
        const w = widths[Math.floor(Math.random() * widths.length)];
        this.current = { w, color: colors[Math.floor(Math.random() * colors.length)] };
        this.currentX = Math.floor((this.gridW - w) / 2);
        
        // Check if spawn position is blocked
        for (let i = 0; i < this.current.w; i++) {
            if (this.grid[0][this.currentX + i]) { this.gameOver = true; return; }
        }
    }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: auto-move, press to drop immediately
            this.currentX += this.currentDir * 0.1 * sm;
            if (this.currentX <= 0) { this.currentX = 0; this.currentDir = 1; }
            if (this.currentX + this.current.w >= this.gridW) { this.currentX = this.gridW - this.current.w; this.currentDir = -1; }
            if (input.leftPressed || input.rightPressed) { this.dropBlock(); playSound('hit'); }
        } else {
            // 2-switch: normal left/right movement
            if (input.leftPressed && this.currentX > 0) {
                let canMove = true;
                for (let i = 0; i < this.current.w; i++) {
                    const checkY = this.getDropY(this.currentX - 1);
                    if (this.currentX - 1 + i < 0) canMove = false;
                }
                if (canMove) { this.currentX--; playSound('move'); }
            }
            if (input.rightPressed && this.currentX + this.current.w < this.gridW) {
                let canMove = true;
                if (canMove) { this.currentX++; playSound('move'); }
            }
        }
        
        if (this.switchMode === 1) return; // one-switch players choose when to drop
        this.dropTimer += 16 * sm;
        if (this.dropTimer >= this.dropInterval / (1 + this.level * 0.2)) {
            this.dropTimer = 0;
            this.dropBlock();
        }
    }
    getDropY(x) {
        x = Math.max(0, Math.min(this.gridW - this.current.w, Math.round(x)));
        for (let y = 0; y < this.gridH; y++) {
            for (let i = 0; i < this.current.w; i++) {
                if (x + i < this.gridW && this.grid[y][x + i]) return y - 1;
            }
        }
        return this.gridH - 1;
    }
    dropBlock() {
        this.currentX = Math.max(0, Math.min(this.gridW - this.current.w, Math.round(this.currentX)));
        const dropY = this.getDropY(this.currentX);
        if (dropY < 0) { this.gameOver = true; return; }
        
        for (let i = 0; i < this.current.w; i++) {
            if (this.currentX + i < this.gridW) {
                this.grid[dropY][this.currentX + i] = this.current.color;
            }
        }
        playSound('hit');
        
        // Check for complete rows
        let cleared = 0;
        for (let y = this.gridH - 1; y >= 0; y--) {
            if (this.grid[y].every(c => c !== 0)) {
                this.grid.splice(y, 1);
                this.grid.unshift(Array(this.gridW).fill(0));
                cleared++;
                y++;
            }
        }
        if (cleared > 0) {
            this.score += [0, 100, 300, 500, 800][Math.min(cleared, 4)] * this.level;
            playSound('score');
            if (this.score >= this.level * 500) this.level++;
        }
        
        this.spawnBlock();
    }
    draw() {
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grid background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(this.offsetX, this.offsetY, this.gridW * this.cellW, this.gridH * this.cellH);
        
        // Grid
        for (let y = 0; y < this.gridH; y++) {
            for (let x = 0; x < this.gridW; x++) {
                if (this.grid[y][x]) {
                    ctx.fillStyle = this.grid[y][x];
                    ctx.fillRect(this.offsetX + x * this.cellW + 1, this.offsetY + y * this.cellH + 1, this.cellW - 2, this.cellH - 2);
                }
            }
        }
        
        // Current block preview (drop position)
        if (this.current) {
            const dropY = this.getDropY(this.currentX);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(this.offsetX + this.currentX * this.cellW, this.offsetY + dropY * this.cellH, this.current.w * this.cellW, this.cellH);
            
            // Current block at top
            ctx.fillStyle = this.current.color;
            ctx.fillRect(this.offsetX + this.currentX * this.cellW + 1, this.offsetY + 1, this.current.w * this.cellW - 2, this.cellH - 2);
        }
        
        // Border
        ctx.strokeStyle = '#ff0066'; ctx.lineWidth = 3;
        ctx.strokeRect(this.offsetX, this.offsetY, this.gridW * this.cellW, this.gridH * this.cellH);
    }
}

// GAME 27: SPACE DODGE
class SpaceDodge {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.ship = { x: canvas.width / 2, y: canvas.height - 80, w: 30, h: 40, dir: 1 };
        this.asteroids = [];
        this.powerups = [];
        this.stars = [];
        for (let i = 0; i < 50; i++) this.stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, speed: 1 + Math.random() * 3 });
        this.spawnTimer = 0;
        this.shield = 0;
    }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: auto-move, press to change direction
            if (input.leftPressed || input.rightPressed) { this.ship.dir *= -1; playSound('move'); }
            this.ship.x += 5 * sm * this.ship.dir;
            if (this.ship.x <= this.ship.w / 2 + 10) { this.ship.x = this.ship.w / 2 + 10; this.ship.dir = 1; }
            if (this.ship.x >= canvas.width - this.ship.w / 2 - 10) { this.ship.x = canvas.width - this.ship.w / 2 - 10; this.ship.dir = -1; }
        } else {
            // 2-switch: normal left/right
            if (input.left && this.ship.x > this.ship.w / 2 + 10) this.ship.x -= 6 * sm;
            if (input.right && this.ship.x < canvas.width - this.ship.w / 2 - 10) this.ship.x += 6 * sm;
        }
        
        // Stars
        this.stars.forEach(s => { s.y += s.speed * sm * 2; if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; } });
        
        // Spawn
        this.spawnTimer += 16 * sm;
        if (this.spawnTimer > 500 / (1 + this.level * 0.1)) {
            this.spawnTimer = 0;
            if (Math.random() > 0.15) {
                this.asteroids.push({ x: Math.random() * (canvas.width - 60) + 30, y: -40, r: 15 + Math.random() * 25, rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.1 });
            } else {
                this.powerups.push({ x: Math.random() * (canvas.width - 40) + 20, y: -20, type: Math.random() > 0.5 ? 'shield' : 'point' });
            }
        }
        
        // Asteroids
        this.asteroids = this.asteroids.filter(a => {
            a.y += (3 + this.level * 0.5) * sm;
            a.rot += a.rotSpeed * sm;
            if (Math.hypot(this.ship.x - a.x, this.ship.y - a.y) < a.r + 15) {
                if (this.shield > 0) { this.shield = 0; playSound('hit'); return false; }
                else { this.gameOver = true; }
            }
            return a.y < canvas.height + 50;
        });
        
        // Powerups
        this.powerups = this.powerups.filter(p => {
            p.y += 4 * sm;
            if (Math.hypot(this.ship.x - p.x, this.ship.y - p.y) < 30) {
                if (p.type === 'shield') { this.shield = 1; playSound('score'); }
                else { this.score += 50 * this.level; playSound('score'); }
                return false;
            }
            return p.y < canvas.height + 30;
        });
        
        this.score += Math.floor(sm);
        if (this.score > this.level * 500) { this.level++; playSound('score'); }
    }
    draw() {
        ctx.fillStyle = '#000011'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Stars
        this.stars.forEach(s => { ctx.fillStyle = `rgba(255,255,255,${0.3 + s.speed * 0.2})`; ctx.fillRect(s.x, s.y, 2, 2); });
        
        // Asteroids
        this.asteroids.forEach(a => {
            ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
            ctx.fillStyle = '#666'; ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const r = a.r * (0.7 + Math.sin(i * 3) * 0.3);
                if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath(); ctx.fill();
            ctx.restore();
        });
        
        // Powerups
        this.powerups.forEach(p => {
            if (p.type === 'shield') { ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill(); }
            else { ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill(); }
        });
        
        // Ship
        ctx.fillStyle = this.shield > 0 ? '#00ffff' : '#0088ff';
        ctx.beginPath();
        ctx.moveTo(this.ship.x, this.ship.y - this.ship.h / 2);
        ctx.lineTo(this.ship.x - this.ship.w / 2, this.ship.y + this.ship.h / 2);
        ctx.lineTo(this.ship.x, this.ship.y + this.ship.h / 4);
        ctx.lineTo(this.ship.x + this.ship.w / 2, this.ship.y + this.ship.h / 2);
        ctx.closePath(); ctx.fill();
        
        // Shield effect
        if (this.shield > 0) {
            ctx.strokeStyle = 'rgba(0,255,255,0.5)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(this.ship.x, this.ship.y, 25, 0, Math.PI * 2); ctx.stroke();
        }
        
        // Engine glow
        ctx.fillStyle = '#ff6600';
        ctx.beginPath(); ctx.moveTo(this.ship.x - 8, this.ship.y + this.ship.h / 2);
        ctx.lineTo(this.ship.x + 8, this.ship.y + this.ship.h / 2);
        ctx.lineTo(this.ship.x, this.ship.y + this.ship.h / 2 + 15 + Math.random() * 5);
        ctx.fill();
    }
}


// GAME 29: WIRE LOOP
class WireLoop {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.generateWire();
        this.ringPos = 0; this.completedScore = 0;
        this.touching = false;
        this.touchTimer = 0;
        this.lives = 3;
    }
    generateWire() {
        this.wirePoints = [];
        const segments = 12 + this.level * 3;
        let y = canvas.height / 2;
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * (canvas.width - 100) + 50;
            y += (Math.random() - 0.5) * (18 + this.level * 3);
            y = Math.max(130, Math.min(canvas.height - 130, y));
            this.wirePoints.push({ x, y });
        }
        this.ringY = this.wirePoints[0].y;
    }
    getWireY(pos) {
        const idx = Math.floor(pos * (this.wirePoints.length - 1));
        const nextIdx = Math.min(idx + 1, this.wirePoints.length - 1);
        const t = (pos * (this.wirePoints.length - 1)) - idx;
        return this.wirePoints[idx].y * (1 - t) + this.wirePoints[nextIdx].y * t;
    }
    getWireX(pos) {
        return pos * (canvas.width - 100) + 50;
    }
    update(sm) {
        // Manual advance: right = forward, left = back (2-switch); either = forward (1-switch)
        const advanceSpeed = 0.004 * sm * (1 + this.level * 0.05);
        if (this.switchMode === 1) {
            if (input.left || input.right) this.ringPos += advanceSpeed;
        } else {
            if (input.right) this.ringPos += advanceSpeed;
            if (input.left) this.ringPos -= advanceSpeed * 0.5;
        }
        this.ringPos = Math.max(0, Math.min(1, this.ringPos));

        // Ring Y follows wire, but with inertia (fast advance through bends = lag = touching)
        const wireY = this.getWireY(this.ringPos);
        this.ringY += (wireY - this.ringY) * 0.15 * sm;

        // Touch detection: ring center vs wire center; bigger ring means more tolerance
        const dist = Math.abs(this.ringY - wireY);
        if (dist > 28) {
            if (!this.touching) { this.touching = true; playSound('low'); }
            this.touchTimer += 16 * sm;
            if (this.touchTimer > 600) {
                this.lives--;
                this.touchTimer = 0;
                this.ringY = wireY;
                playSound('hit');
                if (this.lives <= 0) this.gameOver = true;
            }
        } else {
            this.touching = false;
            this.touchTimer = 0;
        }

        this.score = this.completedScore + Math.floor(this.ringPos * 1000);
        if (this.ringPos >= 1) {
            this.completedScore += 1000;
            this.level++;
            this.ringPos = 0;
            this.ringY = canvas.height / 2;
            this.generateWire();
            playSound('score');
        }
    }
    draw() {
        ctx.fillStyle = '#0a2a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Wire
        ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 8;
        ctx.beginPath();
        this.wirePoints.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.stroke();

        // Ring (bigger radius = 50)
        const ringX = this.getWireX(this.ringPos);
        const ringActualY = this.ringY;

        ctx.strokeStyle = this.touching ? '#ff0000' : '#ffff00';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(ringX, ringActualY, 50, 0, Math.PI * 2);
        ctx.stroke();

        // Handle
        ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ringX, ringActualY + 50);
        ctx.lineTo(ringX, ringActualY + 90);
        ctx.stroke();

        // Progress bar
        ctx.fillStyle = '#333'; ctx.fillRect(50, 20, canvas.width - 100, 15);
        ctx.fillStyle = '#00ff00'; ctx.fillRect(50, 20, (canvas.width - 100) * this.ringPos, 15);

        // Lives
        ctx.fillStyle = '#ff0000'; ctx.font = '16px Arial';
        for (let i = 0; i < this.lives; i++) ctx.fillText('♥', 55 + i * 25, 60);

        // Hint: which button to press
        ctx.fillStyle = '#aaa'; ctx.font = '16px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(this.switchMode === 1 ? ui('forward') : '① '+ui('reverse')+'  ② '+ui('forward'), canvas.width / 2, canvas.height - 15, canvas.width - 24);

        if (this.touching) {
            ctx.fillStyle = '#ff0000'; ctx.font = '16px system-ui'; ctx.textAlign = 'center';
            ctx.fillText(ui('touching'), canvas.width / 2, canvas.height - 40);
        }
    }
}
