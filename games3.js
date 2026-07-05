// GAME 17: BALANCE
class Balance {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.platform = { angle: 0, angVel: 0, tiltDir: 1 };
        this.ball = { x: canvas.width / 2, vx: 0 };
        this.timer = 0;
    }
    update(sm) {
        if (this.switchMode === 1) {
            // 1-switch: auto-tilt, press to change direction
            if (input.leftPressed || input.rightPressed) { this.platform.tiltDir *= -1; playSound('move'); }
            this.platform.angVel += 0.002 * sm * this.platform.tiltDir;
        } else {
            // 2-switch: normal left/right tilt
            if (input.left) this.platform.angVel -= 0.003 * sm;
            if (input.right) this.platform.angVel += 0.003 * sm;
        }
        this.platform.angVel *= 0.98;
        this.platform.angle += this.platform.angVel * sm;
        this.platform.angle = Math.max(-0.5, Math.min(0.5, this.platform.angle));
        this.ball.vx += Math.sin(this.platform.angle) * 0.12 * sm * (1 + this.level * 0.08);
        this.ball.vx *= 0.99;
        this.ball.x += this.ball.vx * sm;
        const platW = 300 - this.level * 10;
        const minX = canvas.width / 2 - platW / 2 + 15;
        const maxX = canvas.width / 2 + platW / 2 - 15;
        if (this.ball.x < minX || this.ball.x > maxX) this.gameOver = true;
        this.timer += 16 * sm;
        this.score = Math.floor(this.timer / 100);
        if (this.timer > this.level * 5000) { this.level++; playSound('score'); }
        // Auto-nudge: after 4 seconds of stability, add a small random perturbation
        if (this.timer > 0 && this.timer % 4000 < 16 * sm + 1) {
            this.platform.angVel += (Math.random() - 0.5) * 0.012;
        }
    }
    draw() {
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const platW = 300 - this.level * 10, platH = 15, platY = canvas.height / 2 + 50;
        ctx.save(); ctx.translate(canvas.width / 2, platY); ctx.rotate(this.platform.angle);
        ctx.fillStyle = '#8B4513'; ctx.fillRect(-platW / 2, -platH / 2, platW, platH);
        ctx.restore();
        ctx.fillStyle = '#654321'; ctx.fillRect(canvas.width / 2 - 10, platY, 20, canvas.height / 2 - 50);
        const ballY = platY - platH / 2 - 20 + Math.sin(this.platform.angle) * (this.ball.x - canvas.width / 2);
        ctx.fillStyle = '#ff0066'; ctx.beginPath(); ctx.arc(this.ball.x, ballY, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '14px "Press Start 2P"'; ctx.textAlign = 'center';
        ctx.fillText(`TIME: ${Math.floor(this.timer / 1000)}s`, canvas.width / 2, 40);
    }
}

// GAME 18: SIMON SAYS
class Simon {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.sequence = []; this.playerSeq = []; this.showingSeq = false;
        this.showIndex = 0; this.showTimer = 0; this.inputEnabled = false;
        this.flash = null; this.flashTimer = 0;
        this.addToSequence();
    }
    addToSequence() {
        this.sequence.push(Math.random() > 0.5 ? 0 : 1);
        this.playerSeq = []; this.showingSeq = true; this.showIndex = 0; this.showTimer = 0; this.inputEnabled = false;
    }
    update(sm) {
        if (this.flash !== null) {
            this.flashTimer += 16 * sm;
            if (this.flashTimer > 200) { this.flash = null; this.flashTimer = 0; }
        }
        if (this.showingSeq) {
            this.showTimer += 16 * sm;
            if (this.showTimer > 600) {
                this.showTimer = 0;
                if (this.showIndex < this.sequence.length) {
                    this.flash = this.sequence[this.showIndex];
                    this.flashTimer = 0;
                    if (this.flash === 0) playSound('low'); else playSound('high');
                    this.showIndex++;
                } else { this.showingSeq = false; this.inputEnabled = true; }
            }
        }
        if (this.inputEnabled) {
            if (input.leftPressed) { this.playerSeq.push(0); this.flash = 0; this.flashTimer = 0; playSound('low'); this.checkInput(); }
            if (input.rightPressed) { this.playerSeq.push(1); this.flash = 1; this.flashTimer = 0; playSound('high'); this.checkInput(); }
        }
    }
    checkInput() {
        const i = this.playerSeq.length - 1;
        if (this.playerSeq[i] !== this.sequence[i]) { this.gameOver = true; return; }
        if (this.playerSeq.length === this.sequence.length) {
            this.score += 10 * this.level; this.level = this.sequence.length;
            playSound('score');
            setTimeout(() => this.addToSequence(), 500);
            this.inputEnabled = false;
        }
    }
    draw() {
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const bw = 120, bh = 120, gap = 40;
        const lx = canvas.width / 2 - bw - gap / 2, rx = canvas.width / 2 + gap / 2, by = canvas.height / 2 - bh / 2;
        ctx.fillStyle = this.flash === 0 ? '#ff6666' : '#ff0066';
        ctx.beginPath(); ctx.roundRect(lx, by, bw, bh, 20); ctx.fill();
        ctx.fillStyle = this.flash === 1 ? '#66ffff' : '#00ffff';
        ctx.beginPath(); ctx.roundRect(rx, by, bw, bh, 20); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '14px "Press Start 2P"'; ctx.textAlign = 'center';
        if (this.showingSeq) {
            ctx.fillText('WATCH...', canvas.width / 2, 60);
            // Highlight which button is being shown
            if (this.flash !== null) {
                const arrowX = this.flash === 0 ? lx + bw / 2 : rx + bw / 2;
                ctx.font = '28px Arial'; ctx.fillText('▼', arrowX, by - 10);
            }
        } else if (this.inputEnabled) {
            ctx.fillText('YOUR TURN!', canvas.width / 2, 60);
            // Show which button to press next
            if (this.playerSeq.length < this.sequence.length) {
                const next = this.sequence[this.playerSeq.length];
                const arrowX = next === 0 ? lx + bw / 2 : rx + bw / 2;
                const arrowLabel = next === 0 ? 'LEFT' : 'RIGHT';
                ctx.fillStyle = '#ffff00'; ctx.font = '28px Arial'; ctx.fillText('▼', arrowX, by - 10);
                ctx.font = '10px "Press Start 2P"'; ctx.fillText(`PRESS ${arrowLabel}`, arrowX, by - 35);
            }
        }
        ctx.fillStyle = '#fff'; ctx.font = '14px "Press Start 2P"';
        ctx.fillText(`ROUND: ${this.sequence.length}`, canvas.width / 2, canvas.height - 40);
    }
}

// GAME 19: WHACK-A-MOLE
class Whack {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.moles = [{ side: 0, up: false, timer: 0 }, { side: 1, up: false, timer: 0 }];
        this.spawnTimer = 0; this.misses = 0; this.timeLeft = 30000;
    }
    update(sm) {
        this.timeLeft -= 16 * sm;
        if (this.timeLeft <= 0) { this.gameOver = true; return; }
        this.spawnTimer += 16 * sm;
        if (this.spawnTimer > 1000 / (1 + this.level * 0.2)) {
            this.spawnTimer = 0;
            const side = Math.floor(Math.random() * 2);
            if (!this.moles[side].up) { this.moles[side].up = true; this.moles[side].timer = 1500 / (1 + this.level * 0.2); }
        }
        this.moles.forEach(m => {
            if (m.up) { m.timer -= 16 * sm; if (m.timer <= 0) { m.up = false; this.misses++; } }
        });
        if (input.leftPressed && this.moles[0].up) { this.moles[0].up = false; this.score += 10 * this.level; playSound('hit');
            if (this.score % 100 === 0) this.level++; }
        else if (input.leftPressed) { playSound('low'); }
        if (input.rightPressed && this.moles[1].up) { this.moles[1].up = false; this.score += 10 * this.level; playSound('hit');
            if (this.score % 100 === 0) this.level++; }
        else if (input.rightPressed) { playSound('low'); }
    }
    draw() {
        ctx.fillStyle = '#228B22'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const holeW = 100, holeH = 60, gap = 80;
        const lx = canvas.width / 2 - holeW - gap / 2, rx = canvas.width / 2 + gap / 2, hy = canvas.height / 2;
        [{ x: lx, m: this.moles[0] }, { x: rx, m: this.moles[1] }].forEach(({ x, m }) => {
            ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(x + holeW / 2, hy + holeH / 2, holeW / 2, holeH / 3, 0, 0, Math.PI * 2); ctx.fill();
            if (m.up) { ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.ellipse(x + holeW / 2, hy, 35, 40, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x + holeW / 2 - 10, hy - 10, 5, 0, Math.PI * 2); ctx.arc(x + holeW / 2 + 10, hy - 10, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ff6666'; ctx.beginPath(); ctx.ellipse(x + holeW / 2, hy + 10, 8, 5, 0, 0, Math.PI * 2); ctx.fill(); }
        });
        ctx.fillStyle = '#fff'; ctx.font = '14px "Press Start 2P"'; ctx.textAlign = 'center';
        ctx.fillText(`TIME: ${Math.ceil(this.timeLeft / 1000)}`, canvas.width / 2, 40);
    }
}

// GAME 20: AIR HOCKEY (left-right orientation)
class AirHockey {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.player = { x: 50, y: canvas.height / 2, r: 30, dir: 1 };
        this.ai = { x: canvas.width - 50, y: canvas.height / 2, r: 30, speed: 2.5 + this.level * 0.3 };
        this.puck = { x: canvas.width / 2, y: canvas.height / 2, r: 15, vx: 2.5, vy: (Math.random() - 0.5) * 3 };
        this.aiScore = 0;
        this.goalH = 160;
    }
    update(sm) {
        // Player paddle moves up/down
        if (this.switchMode === 1) {
            if (input.leftPressed || input.rightPressed) { this.player.dir *= -1; playSound('move'); }
            this.player.y += 5 * sm * this.player.dir;
            if (this.player.y <= this.player.r + 10) { this.player.y = this.player.r + 10; this.player.dir = 1; }
            if (this.player.y >= canvas.height - this.player.r - 10) { this.player.y = canvas.height - this.player.r - 10; this.player.dir = -1; }
        } else {
            if (input.left && this.player.y > this.player.r + 10) this.player.y -= 6 * sm;
            if (input.right && this.player.y < canvas.height - this.player.r - 10) this.player.y += 6 * sm;
        }
        // AI tracks puck vertically
        if (this.puck.y < this.ai.y - 5) this.ai.y -= this.ai.speed * sm;
        else if (this.puck.y > this.ai.y + 5) this.ai.y += this.ai.speed * sm;
        this.ai.y = Math.max(this.ai.r + 10, Math.min(canvas.height - this.ai.r - 10, this.ai.y));
        // Puck movement
        this.puck.x += this.puck.vx * sm; this.puck.y += this.puck.vy * sm;
        // Top/bottom walls
        if (this.puck.y <= this.puck.r || this.puck.y >= canvas.height - this.puck.r) { this.puck.vy *= -1; playSound('hit'); }
        const goalTop = canvas.height / 2 - this.goalH / 2;
        const goalBot = canvas.height / 2 + this.goalH / 2;
        // Left wall (player side — concede)
        if (this.puck.x <= this.puck.r) {
            if (this.puck.y > goalTop && this.puck.y < goalBot) {
                this.aiScore++; playSound('low'); if (this.aiScore >= 5) this.gameOver = true;
            } else { this.puck.vx = Math.abs(this.puck.vx); playSound('hit'); }
            this.resetPuck(1);
        }
        // Right wall (AI side — score)
        if (this.puck.x >= canvas.width - this.puck.r) {
            if (this.puck.y > goalTop && this.puck.y < goalBot) {
                this.score += 10; playSound('score'); if (this.score % 50 === 0) { this.level++; this.ai.speed += 0.3; }
            } else { this.puck.vx = -Math.abs(this.puck.vx); playSound('hit'); }
            this.resetPuck(-1);
        }
        // Player paddle collision
        if (Math.hypot(this.puck.x - this.player.x, this.puck.y - this.player.y) < this.puck.r + this.player.r) {
            this.puck.vx = Math.abs(this.puck.vx) + 1;
            this.puck.vy = (this.puck.y - this.player.y) * 0.18;
            playSound('hit');
        }
        // AI paddle collision
        if (Math.hypot(this.puck.x - this.ai.x, this.puck.y - this.ai.y) < this.puck.r + this.ai.r) {
            this.puck.vx = -(Math.abs(this.puck.vx) + 1);
            this.puck.vy = (this.puck.y - this.ai.y) * 0.18;
            playSound('hit');
        }
    }
    resetPuck(dir) { this.puck = { x: canvas.width / 2, y: canvas.height / 2, r: 15, vx: 2.5 * dir, vy: (Math.random() - 0.5) * 3 }; }
    draw() {
        ctx.fillStyle = '#1a3a5c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Center line and circle
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2); ctx.stroke();
        // Goal posts (walls beside goal openings)
        const gt = canvas.height / 2 - this.goalH / 2, gb = canvas.height / 2 + this.goalH / 2;
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 8, gt); ctx.fillRect(0, gb, 8, canvas.height - gb);
        ctx.fillRect(canvas.width - 8, 0, 8, gt); ctx.fillRect(canvas.width - 8, gb, 8, canvas.height - gb);
        // Goal zones (glowing)
        ctx.fillStyle = 'rgba(255,0,102,0.15)'; ctx.fillRect(0, gt, 20, this.goalH);
        ctx.fillStyle = 'rgba(0,255,255,0.15)'; ctx.fillRect(canvas.width - 20, gt, 20, this.goalH);
        // Player (red, left)
        ctx.fillStyle = '#ff0066'; ctx.beginPath(); ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        // AI (cyan, right)
        ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(this.ai.x, this.ai.y, this.ai.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.stroke();
        // Puck
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.puck.x, this.puck.y, this.puck.r, 0, Math.PI * 2); ctx.fill();
        // Scores
        ctx.font = '16px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        ctx.fillText(`${Math.floor(this.score / 10)}`, canvas.width / 4, 40);
        ctx.fillText(`${this.aiScore}`, canvas.width * 3 / 4, 40);
    }
}

// GAME 21: LUNAR LANDER
class Lander {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.lander = { x: canvas.width / 2, y: 50, vx: 0, vy: 0, fuel: 100 };
        this.gravity = 0.008; this.thrust = 0.15;
        this.padW = 140; this.padX = canvas.width / 2 - this.padW / 2;
    }
    update(sm) {
        // Both switches fire upward rockets (no lateral movement)
        if ((input.left || input.right) && this.lander.fuel > 0) {
            this.lander.vy -= this.thrust * sm;
            this.lander.fuel -= 0.25 * sm;
            playSound('move');
        }
        this.lander.vy += this.gravity * sm * (1 + this.level * 0.08);
        this.lander.y += this.lander.vy * sm;
        // Slight horizontal drift only from vx (starts at 0, no lateral control)
        this.lander.x += this.lander.vx * sm;
        if (this.lander.x < 20) { this.lander.x = 20; this.lander.vx = 0; }
        if (this.lander.x > canvas.width - 20) { this.lander.x = canvas.width - 20; this.lander.vx = 0; }
        const groundY = canvas.height - 40;
        if (this.lander.y >= groundY - 20) {
            if (this.lander.x > this.padX && this.lander.x < this.padX + this.padW && Math.abs(this.lander.vy) < 2.5) {
                this.score += 100 * this.level; playSound('score'); this.level++;
                const newPadW = Math.max(80, 140 - this.level * 6);
                this.padX = Math.random() * (canvas.width - newPadW - 40) + 20;
                this.padW = newPadW;
                this.lander = { x: canvas.width / 2, y: 50, vx: 0, vy: 0, fuel: Math.min(100, this.lander.fuel + 35) };
            } else this.gameOver = true;
        }
    }
    draw() {
        ctx.fillStyle = '#000022'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 50; i++) { ctx.fillStyle = '#fff'; ctx.fillRect((i * 73) % canvas.width, (i * 47) % (canvas.height - 80), 1, 1); }
        ctx.fillStyle = '#444'; ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
        ctx.fillStyle = '#00ff00'; ctx.fillRect(this.padX, canvas.height - 45, this.padW, 5);
        ctx.fillStyle = '#ccc'; ctx.beginPath();
        ctx.moveTo(this.lander.x, this.lander.y - 15); ctx.lineTo(this.lander.x - 15, this.lander.y + 10);
        ctx.lineTo(this.lander.x - 10, this.lander.y + 10); ctx.lineTo(this.lander.x - 12, this.lander.y + 18);
        ctx.lineTo(this.lander.x + 12, this.lander.y + 18); ctx.lineTo(this.lander.x + 10, this.lander.y + 10);
        ctx.lineTo(this.lander.x + 15, this.lander.y + 10); ctx.closePath(); ctx.fill();
        if ((input.left || input.right) && this.lander.fuel > 0) {
            ctx.fillStyle = '#ff6600'; ctx.beginPath();
            ctx.moveTo(this.lander.x - 5, this.lander.y + 18); ctx.lineTo(this.lander.x + 5, this.lander.y + 18);
            ctx.lineTo(this.lander.x, this.lander.y + 35); ctx.fill();
        }
        ctx.fillStyle = '#0f0'; ctx.fillRect(10, 10, this.lander.fuel, 15);
        ctx.strokeStyle = '#fff'; ctx.strokeRect(10, 10, 100, 15);
        ctx.fillStyle = '#fff'; ctx.font = '10px "Press Start 2P"'; ctx.fillText(`VY:${this.lander.vy.toFixed(1)}`, 10, 45);
    }
}

// GAME 22: FRUIT NINJA
class Fruit {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.fruits = []; this.timer = 0; this.misses = 0;
        this.slashL = []; this.slashR = [];
    }
    update(sm) {
        this.timer += 16 * sm;
        if (this.timer > 1000 / (1 + this.level * 0.2)) {
            this.timer = 0;
            const side = Math.random() > 0.5 ? 0 : 1;
            const colors = ['#ff0000', '#ff9900', '#00ff00', '#ffff00', '#ff00ff'];
            this.fruits.push({ x: side === 0 ? canvas.width * 0.25 : canvas.width * 0.75, y: canvas.height + 30,
                vy: -12 - this.level, vx: (Math.random() - 0.5) * 4, side, r: 25 + Math.random() * 10,
                color: colors[Math.floor(Math.random() * colors.length)], sliced: false });
        }
        this.fruits = this.fruits.filter(f => {
            f.vy += 0.3 * sm; f.y += f.vy * sm; f.x += f.vx * sm;
            if (f.y > canvas.height + 50 && !f.sliced) { this.misses++; if (this.misses >= 5) this.gameOver = true; }
            return f.y < canvas.height + 100;
        });
        if (input.leftPressed) { this.slashL.push({ t: 10 });
            this.fruits.forEach(f => { if (!f.sliced && f.side === 0 && f.y < canvas.height - 50) { f.sliced = true; this.score += 10 * this.level; playSound('hit');
                if (this.score % 100 === 0) this.level++; } }); }
        if (input.rightPressed) { this.slashR.push({ t: 10 });
            this.fruits.forEach(f => { if (!f.sliced && f.side === 1 && f.y < canvas.height - 50) { f.sliced = true; this.score += 10 * this.level; playSound('hit');
                if (this.score % 100 === 0) this.level++; } }); }
        this.slashL = this.slashL.filter(s => { s.t -= sm; return s.t > 0; });
        this.slashR = this.slashR.filter(s => { s.t -= sm; return s.t > 0; });
    }
    draw() {
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (this.slashL.length) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(0, canvas.height); ctx.lineTo(canvas.width / 2, 0); ctx.stroke(); }
        if (this.slashR.length) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(canvas.width, canvas.height); ctx.lineTo(canvas.width / 2, 0); ctx.stroke(); }
        this.fruits.forEach(f => {
            if (f.sliced) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(f.x - 10, f.y, f.r / 2, 0, Math.PI * 2); ctx.arc(f.x + 10, f.y, f.r / 2, 0, Math.PI * 2); ctx.fill(); }
            else { ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.3, 0, Math.PI * 2); ctx.fill(); }
        });
        ctx.fillStyle = '#ff0000'; ctx.font = '20px Arial';
        for (let i = 0; i < 5 - this.misses; i++) ctx.fillText('♥', 20 + i * 25, 35);
    }
}

// GAME 23: STACK TOWER
class Stack {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.blocks = [{ x: canvas.width / 2, w: 150, y: canvas.height - 30 }];
        this.current = { x: 0, w: 150, dir: 1, speed: 3 };
        this.blockH = 25; this.dropping = false;
    }
    update(sm) {
        if (this.dropping) return;
        this.current.x += this.current.dir * this.current.speed * sm * (1 + this.level * 0.1);
        if (this.current.x <= 0 || this.current.x + this.current.w >= canvas.width) this.current.dir *= -1;
        if (input.leftPressed || input.rightPressed) {
            const last = this.blocks[this.blocks.length - 1];
            const overlapL = Math.max(this.current.x, last.x - last.w / 2);
            const overlapR = Math.min(this.current.x + this.current.w, last.x + last.w / 2);
            const overlapW = overlapR - overlapL;
            if (overlapW <= 0) { this.gameOver = true; return; }
            const newX = overlapL + overlapW / 2;
            this.blocks.push({ x: newX, w: overlapW, y: last.y - this.blockH });
            this.score += Math.floor(overlapW); playSound('hit');
            if (overlapW > this.current.w * 0.95) { this.score += 50; playSound('score'); }
            this.current = { x: 0, w: overlapW, dir: 1, speed: 3 + this.blocks.length * 0.2 };
            if (this.blocks.length % 5 === 0) this.level++;
            if (this.blocks[this.blocks.length - 1].y < 100) this.blocks.forEach(b => b.y += this.blockH);
        }
    }
    draw() {
        ctx.fillStyle = '#0a0a2a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const colors = ['#ff0066', '#ff6600', '#ffff00', '#00ff66', '#00ffff', '#6666ff'];
        this.blocks.forEach((b, i) => { ctx.fillStyle = colors[i % colors.length];
            ctx.fillRect(b.x - b.w / 2, b.y, b.w, this.blockH - 2); });
        const topY = this.blocks[this.blocks.length - 1].y - this.blockH;
        ctx.fillStyle = colors[this.blocks.length % colors.length];
        ctx.fillRect(this.current.x, topY, this.current.w, this.blockH - 2);
    }
}

// GAME 24: PENALTY KICK
class Penalty {
    constructor() { this.score = 0; this.level = 1; this.gameOver = false; this.switchMode = 2; }
    init() {
        this.score = 0; this.level = 1; this.gameOver = false;
        this.keeper = { x: canvas.width / 2, targetX: canvas.width / 2, speed: 2 + this.level * 0.2 };
        this.ball = null; this.shooting = false; this.round = 0; this.misses = 0;
        this.goalW = 300; this.goalH = 100; this.goalY = 80;
        this.preparing = true; this.prepTimer = 1000;
        this.shootDir = 1; // For 1-switch mode
    }
    update(sm) {
        if (this.preparing) { this.prepTimer -= 16 * sm; if (this.prepTimer <= 0) { this.preparing = false; this.prepTimer = 1000; } return; }
        if (!this.shooting) {
            this.keeper.targetX = canvas.width / 2 + Math.sin(Date.now() / 700) * (this.goalW / 2 - 30);
            this.keeper.x += (this.keeper.targetX - this.keeper.x) * 0.06 * sm;
            if (this.switchMode === 1) {
                // 1-switch: press to shoot, alternates left/right
                if (input.leftPressed || input.rightPressed) { 
                    this.ball = { x: canvas.width / 2, y: canvas.height - 100, targetX: canvas.width / 2 + this.shootDir * this.goalW / 3, vy: -15 }; 
                    this.shooting = true; playSound('hit'); 
                    this.shootDir *= -1; // Alternate direction
                }
            } else {
                // 2-switch: left shoots left, right shoots right
                if (input.leftPressed) { this.ball = { x: canvas.width / 2, y: canvas.height - 100, targetX: canvas.width / 2 - this.goalW / 3, vy: -15 }; this.shooting = true; playSound('hit'); }
                if (input.rightPressed) { this.ball = { x: canvas.width / 2, y: canvas.height - 100, targetX: canvas.width / 2 + this.goalW / 3, vy: -15 }; this.shooting = true; playSound('hit'); }
            }
        } else {
            this.ball.y += this.ball.vy * sm;
            this.ball.x += (this.ball.targetX - this.ball.x) * 0.1 * sm;
            this.keeper.x += (this.ball.targetX - this.keeper.x) * 0.025 * sm * this.keeper.speed;
            if (this.ball.y <= this.goalY + this.goalH) {
                const saved = Math.abs(this.ball.x - this.keeper.x) < 40;
                if (saved) { this.misses++; playSound('low'); if (this.misses >= 3) this.gameOver = true; }
                else { this.score += 10 * this.level; playSound('score'); }
                this.round++; if (this.round % 5 === 0) { this.level++; this.keeper.speed += 0.2; }
                this.shooting = false; this.ball = null; this.preparing = true;
            }
        }
    }
    draw() {
        ctx.fillStyle = '#228B22'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const gx = (canvas.width - this.goalW) / 2;
        ctx.fillStyle = '#fff'; ctx.fillRect(gx, this.goalY, this.goalW, this.goalH);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 5;
        ctx.strokeRect(gx, this.goalY, this.goalW, this.goalH);
        ctx.beginPath(); ctx.moveTo(gx, this.goalY); ctx.lineTo(gx - 20, this.goalY + this.goalH + 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx + this.goalW, this.goalY); ctx.lineTo(gx + this.goalW + 20, this.goalY + this.goalH + 20); ctx.stroke();
        ctx.fillStyle = '#ff0066'; ctx.fillRect(this.keeper.x - 25, this.goalY + this.goalH - 60, 50, 60);
        ctx.fillStyle = '#ffccaa'; ctx.beginPath(); ctx.arc(this.keeper.x, this.goalY + this.goalH - 70, 15, 0, Math.PI * 2); ctx.fill();
        if (this.ball) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, 15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); }
        else if (!this.shooting) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height - 100, 15, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#fff'; ctx.font = '12px "Press Start 2P"'; ctx.textAlign = 'center';
        ctx.fillText(`SAVES LEFT: ${3 - this.misses}`, canvas.width / 2, 40);
        if (this.preparing) ctx.fillText('GET READY...', canvas.width / 2, canvas.height / 2);
    }
}
