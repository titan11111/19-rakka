// HTML要素の取得
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreDisplay = document.getElementById('finalScore');
const newHighScoreDisplay = document.getElementById('newHighScore');
const restartButton = document.getElementById('restartButton');
const startButton = document.getElementById('startButton');
const startScreen = document.getElementById('startScreen');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const upButton = document.getElementById('upButton');

// パワーアップ表示要素
const speedBoostTimeDisplay = document.getElementById('speedBoostTime');
const shieldTimeDisplay = document.getElementById('shieldTime');
const starCountDisplay = document.getElementById('starCount');

// ゲームの状態変数
let player;
let obstacles = [];
let items = [];
let particles = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameOver = false;
let gameStarted = false;
let gameLoopId;

// ゲーム設定
const GAME_WIDTH = 300;
const GAME_HEIGHT = 400;
// プレイヤーサイズを1.5倍に拡大
const PLAYER_SIZE = 37.5;
const PLAYER_SPEED = 4;
let GRAVITY = 0.008;
const OBSTACLE_HEIGHT = 15;
let OBSTACLE_SPEED = 0.2;
let OBSTACLE_SPAWN_INTERVAL = 1200;
const ITEM_SIZE = 20;
const ITEM_SPEED = 0.15;
const MIN_OBSTACLE_GAP = 80;

let lastObstacleSpawnTime = 0;
let lastItemSpawnTime = 0;
let lastDifficultyScore = -1;

// パワーアップ効果
let speedBoostTime = 0;
let shieldTime = 0;
let starCount = 0;

// 効果音（Web Audio API使用）
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'sine') {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// 効果音関数
function playJumpSound() { playSound(440, 0.1); }
function playItemSound() { playSound(660, 0.2); }
function playPowerUpSound() { playSound(880, 0.3); }
function playGameOverSound() { playSound(220, 0.5, 'sawtooth'); }
function playHitSound() { playSound(150, 0.2, 'square'); }

// キャンバスのリサイズと初期化
function resizeCanvas() {
    const containerWidth = canvas.parentElement.clientWidth;
    const containerHeight = canvas.parentElement.clientHeight;

    let newWidth = Math.min(containerWidth, GAME_WIDTH);
    let newHeight = newWidth * (GAME_HEIGHT / GAME_WIDTH);

    if (newHeight > containerHeight) {
        newHeight = containerHeight;
        newWidth = newHeight * (GAME_WIDTH / GAME_HEIGHT);
    }

    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
}

// プレイヤークラス
function Player() {
    this.x = GAME_WIDTH / 2 - PLAYER_SIZE / 2;
    this.y = 50;
    this.width = PLAYER_SIZE;
    this.height = PLAYER_SIZE;
    this.velocityY = 0;
    this.isMovingLeft = false;
    this.isMovingRight = false;
    this.expression = 'normal';
    this.hasShield = false;
    this.shieldFlashTime = 0;

    this.draw = function() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const size = this.width;

        // シールド効果
        if (this.hasShield) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + Math.sin(this.shieldFlashTime * 0.3) * 0.3})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size * 0.7, 0, 2 * Math.PI);
            ctx.stroke();
            this.shieldFlashTime++;
        }

        // 体（黄色の楕円）
        ctx.fillStyle = speedBoostTime > 0 ? '#FFFF00' : '#FFD700';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, size * 0.4, size * 0.35, 0, 0, 2 * Math.PI);
        ctx.fill();

        // 耳
        ctx.fillStyle = speedBoostTime > 0 ? '#FFFF00' : '#FFD700';
        ctx.beginPath();
        ctx.moveTo(centerX - size * 0.25, centerY - size * 0.3);
        ctx.lineTo(centerX - size * 0.15, centerY - size * 0.45);
        ctx.lineTo(centerX - size * 0.05, centerY - size * 0.3);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(centerX + size * 0.05, centerY - size * 0.3);
        ctx.lineTo(centerX + size * 0.15, centerY - size * 0.45);
        ctx.lineTo(centerX + size * 0.25, centerY - size * 0.3);
        ctx.fill();

        // 耳の先端
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(centerX - size * 0.15, centerY - size * 0.42, size * 0.05, size * 0.08, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + size * 0.15, centerY - size * 0.42, size * 0.05, size * 0.08, 0, 0, 2 * Math.PI);
        ctx.fill();

        // 目
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(centerX - size * 0.12, centerY - size * 0.1, size * 0.06, size * 0.08, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + size * 0.12, centerY - size * 0.1, size * 0.06, size * 0.08, 0, 0, 2 * Math.PI);
        ctx.fill();

        // 目のハイライト
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(centerX - size * 0.1, centerY - size * 0.12, size * 0.02, size * 0.03, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + size * 0.14, centerY - size * 0.12, size * 0.02, size * 0.03, 0, 0, 2 * Math.PI);
        ctx.fill();

        // 鼻
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, size * 0.02, size * 0.02, 0, 0, 2 * Math.PI);
        ctx.fill();

        // 口
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (this.expression === 'happy') {
            ctx.arc(centerX, centerY + size * 0.05, size * 0.1, 0, Math.PI);
        } else if (this.expression === 'worried') {
            ctx.arc(centerX, centerY + size * 0.15, size * 0.1, Math.PI, 2 * Math.PI);
        } else if (this.expression === 'excited') {
            ctx.arc(centerX, centerY + size * 0.05, size * 0.15, 0, Math.PI);
        } else if (this.expression === 'surprised') {
            ctx.arc(centerX, centerY + size * 0.1, size * 0.1, 0, 2 * Math.PI);
        } else {
            ctx.moveTo(centerX - size * 0.08, centerY + size * 0.1);
            ctx.lineTo(centerX + size * 0.08, centerY + size * 0.1);
        }
        ctx.stroke();

        // ほっぺ
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.ellipse(centerX - size * 0.25, centerY + size * 0.05, size * 0.05, size * 0.04, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + size * 0.25, centerY + size * 0.05, size * 0.05, size * 0.04, 0, 0, 2 * Math.PI);
        ctx.fill();
    };

    this.update = function() {
        this.velocityY += GRAVITY;
        this.y += this.velocityY;

        const currentSpeed = speedBoostTime > 0 ? PLAYER_SPEED * 1.8 : PLAYER_SPEED;
        
        if (this.isMovingLeft) {
            this.x -= currentSpeed;
        }
        if (this.isMovingRight) {
            this.x += currentSpeed;
        }

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > GAME_WIDTH) this.x = GAME_WIDTH - this.width;

        if (speedBoostTime > 0) {
            this.expression = 'excited';
        } else if (this.velocityY > 2) {
            this.expression = 'surprised';
        } else if (this.velocityY > 1.5) {
            this.expression = 'worried';
        } else if (this.velocityY < 0.5) {
            this.expression = 'happy';
        } else {
            this.expression = 'normal';
        }

        this.hasShield = shieldTime > 0;

        if (this.y + this.height > GAME_HEIGHT) {
            this.y = GAME_HEIGHT - this.height;
            endGame();
        }
    };
}

// 障害物クラス
function Obstacle(x, y, width, height, type = 'pillar') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.vx = 0;
    this.minX = 0;
    this.maxX = GAME_WIDTH - width;
    this.bobOffset = Math.random() * Math.PI * 2;

    if (this.type === 'pillar') {
        const colorSets = [
            ['#e74c3c', '#c0392b'],
            ['#3498db', '#2980b9'],
            ['#2ecc71', '#27ae60'],
            ['#9b59b6', '#8e44ad'],
            ['#f1c40f', '#f39c12']
        ];
        this.colors = colorSets[Math.floor(Math.random() * colorSets.length)];
    }

    this.draw = function() {
        if (this.type === 'pillar') {
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            const [c1, c2] = this.colors;
            gradient.addColorStop(0, c1);
            gradient.addColorStop(1, c2);

            ctx.fillStyle = gradient;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.strokeStyle = c2;
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        } else {
            ctx.font = `${this.height}px serif`;
            ctx.textBaseline = 'top';
            const emojiMap = {
                cloud: '☁️',
                crow: '🐦‍⬛',
                helicopter: '🚁',
                ufo: '🛸'
            };
            ctx.fillText(emojiMap[this.type] || '⬛', this.x, this.y);
        }
    };

    this.update = function() {
        this.y -= OBSTACLE_SPEED;
        if (this.type !== 'pillar') {
            this.x += this.vx;
            if (this.x < this.minX || this.x + this.width > this.maxX) {
                this.vx *= -1;
                this.x += this.vx;
            }
            if (this.type === 'ufo') {
                this.y += Math.sin((Date.now() / 200) + this.bobOffset) * 0.5;
            }
        }
    };
}

// アイテムクラス
function Item(x, y, type) {
    this.x = x;
    this.y = y;
    this.width = ITEM_SIZE;
    this.height = ITEM_SIZE;
    this.type = type; // 'speed', 'shield', 'star'
    this.bobOffset = Math.random() * Math.PI * 2;
    this.time = 0;

    this.draw = function() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2 + Math.sin(this.time * 0.1 + this.bobOffset) * 3;
        const size = this.width;

        if (this.type === 'speed') {
            // スピードアップ（雷）
            ctx.fillStyle = '#FFFF00';
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - size * 0.2, centerY - size * 0.3);
            ctx.lineTo(centerX + size * 0.1, centerY - size * 0.1);
            ctx.lineTo(centerX - size * 0.1, centerY);
            ctx.lineTo(centerX + size * 0.2, centerY + size * 0.3);
            ctx.lineTo(centerX - size * 0.1, centerY + size * 0.1);
            ctx.lineTo(centerX + size * 0.1, centerY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'shield') {
            // シールド
            ctx.fillStyle = '#00FFFF';
            ctx.strokeStyle = '#0080FF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size * 0.3, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${size * 0.4}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('🛡️', centerX, centerY + size * 0.1);
        } else if (this.type === 'star') {
            // スター
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2;
            this.drawStar(centerX, centerY, size * 0.3, size * 0.15, 5);
        }
    };

    this.drawStar = function(x, y, outerRadius, innerRadius, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points;
            const pointX = x + Math.cos(angle) * radius;
            const pointY = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(pointX, pointY);
            else ctx.lineTo(pointX, pointY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    };

    this.update = function() {
        this.y -= ITEM_SPEED;
        this.time++;
    };
}

// パーティクルクラス
function Particle(x, y, color, size) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.color = color;
    this.size = size;
    this.life = 30;
    this.maxLife = 30;

    this.update = function() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // 重力
        this.life--;
    };

    this.draw = function() {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color.replace('1)', `${alpha})`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        ctx.fill();
    };
}

// パーティクル生成
function createParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, Math.random() * 3 + 1));
    }
}

// ゲーム初期化
function initGame() {
    GRAVITY = 0.008;
    OBSTACLE_SPEED = 0.2;
    OBSTACLE_SPAWN_INTERVAL = 1200;
    lastDifficultyScore = -1;
    
    player = new Player();
    obstacles = [];
    items = [];
    particles = [];
    score = 0;
    gameOver = false;
    
    speedBoostTime = 0;
    shieldTime = 0;
    starCount = 0;
    
    updateDisplays();
    
    gameOverOverlay.style.display = 'none';
    startScreen.style.display = 'none';
    
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
    }
    gameLoopId = requestAnimationFrame(gameLoop);
}

// 表示更新
function updateDisplays() {
    scoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;
    speedBoostTimeDisplay.textContent = Math.ceil(speedBoostTime / 60);
    shieldTimeDisplay.textContent = Math.ceil(shieldTime / 60);
    starCountDisplay.textContent = starCount;
}

// アイテム生成
function spawnItem() {
    const types = ['slow', 'shield', 'star']; // スピードアップ→スローダウンに変更
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * (GAME_WIDTH - ITEM_SIZE);
    const y = GAME_HEIGHT;
    items.push(new Item(x, y, type));
}

function canSpawnObstacle() {
    if (obstacles.length === 0) return true;
    const maxY = Math.max(...obstacles.map(o => o.y + o.height));
    return maxY < GAME_HEIGHT - MIN_OBSTACLE_GAP;
}

// 当たり判定
function checkCollision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

// ゲームオーバー処理
function endGame() {
    if (gameOver) return;
    gameOver = true;
    cancelAnimationFrame(gameLoopId);
    playGameOverSound();
    finalScoreDisplay.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        newHighScoreDisplay.style.display = 'block';
    } else {
        newHighScoreDisplay.style.display = 'none';
    }
    gameOverOverlay.style.display = 'flex';
}

// ゲームループ
function gameLoop(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();

    if (score - lastDifficultyScore >= 30) {
        GRAVITY += 0.001;
        OBSTACLE_SPEED += 0.02;
        if (OBSTACLE_SPAWN_INTERVAL > 500) OBSTACLE_SPAWN_INTERVAL -= 50;
        lastDifficultyScore = score;
    }

    GRAVITY = OBSTACLE_SPEED * 0.04;

    player.update();
    player.draw();

    obstacles.forEach(o => o.update());
    obstacles = obstacles.filter(o => o.y + o.height > 0);
    obstacles.forEach(o => o.draw());

    items.forEach(i => i.update());
    items = items.filter(i => i.y + i.height > 0);
    items.forEach(i => i.draw());

    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => p.draw());

    for (let o of obstacles) {
        if (checkCollision(player, o)) {
            if (shieldTime > 0) {
                playHitSound();
                createParticles(player.x + player.width / 2, player.y + player.height / 2, 'rgba(0,255,255,1)', 8);
                shieldTime = 0;
                break;
            } else {
                endGame();
                return;
            }
        }
    }

    for (let i = 0; i < items.length; i++) {
        if (checkCollision(player, items[i])) {
            const item = items.splice(i, 1)[0];
            playItemSound();
            if (item.type === 'slow') {
                speedBoostTime = 300;
                createParticles(item.x, item.y, 'rgba(173,216,230,1)', 12); // 羽＝淡い青
            } else if (item.type === 'shield') {
                shieldTime = 300;
                createParticles(item.x, item.y, 'rgba(0,255,255,1)', 12);
            } else if (item.type === 'star') {
                starCount++;
                score += 5;
                createParticles(item.x, item.y, 'rgba(255,215,0,1)', 12);
            }
            break;
        }
    }

    if (speedBoostTime > 0) speedBoostTime--;
    if (shieldTime > 0) shieldTime--;

    score++;
    updateDisplays();

    if (now - lastObstacleSpawnTime > OBSTACLE_SPAWN_INTERVAL && canSpawnObstacle()) {
        spawnObstacle();
        lastObstacleSpawnTime = now;
    }

    if (now - lastItemSpawnTime > 2000) {
        spawnItem();
        lastItemSpawnTime = now;
    }

    gameLoopId = requestAnimationFrame(gameLoop);
}

function spawnObstacle() {
    const difficulty = Math.floor(score / 100);

    const baseGapWidth = GAME_WIDTH * 0.8;
    const gapWidth = Math.max(baseGapWidth - difficulty * 15, PLAYER_SIZE * 2);
    const gapX = Math.random() * (GAME_WIDTH - gapWidth);

    const safeLaneWidth = PLAYER_SIZE * 1.5;
    const safeLaneX = gapX + Math.random() * (gapWidth - safeLaneWidth);

    if (gapX > 0) {
        obstacles.push(new Obstacle(0, GAME_HEIGHT, gapX, OBSTACLE_HEIGHT, 'pillar'));
    }
    if (gapX + gapWidth < GAME_WIDTH) {
        obstacles.push(new Obstacle(
            gapX + gapWidth,
            GAME_HEIGHT,
            GAME_WIDTH - (gapX + gapWidth),
            OBSTACLE_HEIGHT,
            'pillar'
        ));
    }

    const dynamicTypes = ['cloud', 'crow', 'helicopter', 'ufo'];
    for (let i = 0; i < difficulty; i++) {
        const type = dynamicTypes[Math.floor(Math.random() * dynamicTypes.length)];
        const size = type === 'cloud' ? 40 : 30;
        const blockWidth = size;
        const blockHeight = size;
        const side = Math.random() < 0.5 ? 'left' : 'right';
        let minX, maxX;
        if (side === 'left') {
            minX = gapX;
            maxX = safeLaneX - blockWidth;
        } else {
            minX = safeLaneX + safeLaneWidth;
            maxX = gapX + gapWidth - blockWidth;
        }
        if (maxX <= minX) continue;
        const blockX = Math.random() * (maxX - minX) + minX;
        const blockY = GAME_HEIGHT + i * (OBSTACLE_HEIGHT + 5);
        const obstacle = new Obstacle(blockX, blockY, blockWidth, blockHeight, type);
        obstacle.minX = minX;
        obstacle.maxX = maxX;
        obstacle.vx = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
        obstacles.push(obstacle);
    }
}

startButton.addEventListener('click', () => {
    gameStarted = true;
    resizeCanvas();
    initGame();
});

restartButton.addEventListener('click', () => {
    initGame();
});

leftButton.addEventListener('touchstart', () => player.isMovingLeft = true);
leftButton.addEventListener('touchend', () => player.isMovingLeft = false);
rightButton.addEventListener('touchstart', () => player.isMovingRight = true);
rightButton.addEventListener('touchend', () => player.isMovingRight = false);
let upInterval;
upButton.addEventListener('touchstart', () => {
    upInterval = setInterval(() => {
        player.velocityY -= 0.5;
    }, 100);
});
upButton.addEventListener('touchend', () => clearInterval(upInterval));

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') player.isMovingLeft = true;
    if (e.key === 'ArrowRight') player.isMovingRight = true;
    if (e.key === 'ArrowUp') player.velocityY -= 0.5;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') player.isMovingLeft = false;
    if (e.key === 'ArrowRight') player.isMovingRight = false;
});
