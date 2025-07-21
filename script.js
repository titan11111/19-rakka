// ゲームの状態管理
let gameState = {
    screen: 'title', // title, playing, gameOver
    score: 0,
    codes: 0,
    altitude: 10000,
    gameSpeed: 2,
    lives: 3
};

// プレイヤー設定
let player = {
    x: 0,
    y: 0,
    width: 30,
    height: 30,
    speed: 5,
    fallSpeed: 0, // 落下速度（プレイヤーは固定位置）
    invulnerable: false,
    invulnerableTime: 0,
    hasSlowMotion: false,
    hasWarp: false,
    hasInvisible: false,
    activeSkill: null,
    skillCooldown: 0
};

// ゲーム要素の配列
let memoryFragments = [];
let obstacles = [];
let particles = [];
let gravityZones = [];
let terrain = [];

// キャンバスとコンテキスト
let canvas, ctx;
let gameLoop;

// 入力管理
let keys = {};
let touchInput = {
    left: false,
    right: false,
    skill: false
};

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initGame();
    setupEventListeners();
});

function initGame() {
    // キャンバスの初期化
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // キャンバスサイズを設定
    resizeCanvas();
    
    // ゲーム状態をリセット
    resetGameState();
    
    // 初期地形の生成
    generateTerrain();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // プレイヤーの初期位置を設定（画面の下部に固定）
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 150; // 画面下部に固定
}

function resetGameState() {
    gameState.screen = 'title';
    gameState.score = 0;
    gameState.codes = 0;
    gameState.altitude = 10000;
    gameState.gameSpeed = 2;
    gameState.lives = 3;
    
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 150; // 画面下部に固定
    player.fallSpeed = 0;
    player.invulnerable = false;
    player.invulnerableTime = 0;
    player.hasSlowMotion = false;
    player.hasWarp = false;
    player.hasInvisible = false;
    player.activeSkill = null;
    player.skillCooldown = 0;
    
    memoryFragments = [];
    obstacles = [];
    particles = [];
    gravityZones = [];
    terrain = [];
}

function setupEventListeners() {
    // スタートボタン
    document.getElementById('startBtn').addEventListener('click', startGame);
    
    // リスタートボタン
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    
    // キーボード操作
    document.addEventListener('keydown', function(e) {
        keys[e.key] = true;
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (gameState.screen === 'playing') {
                activateSkill();
            }
        }
    });
    
    document.addEventListener('keyup', function(e) {
        keys[e.key] = false;
    });
    
    // タッチ操作
    document.getElementById('leftBtn').addEventListener('touchstart', function(e) {
        e.preventDefault();
        touchInput.left = true;
    });
    
    document.getElementById('leftBtn').addEventListener('touchend', function(e) {
        e.preventDefault();
        touchInput.left = false;
    });
    
    document.getElementById('rightBtn').addEventListener('touchstart', function(e) {
        e.preventDefault();
        touchInput.right = true;
    });
    
    document.getElementById('rightBtn').addEventListener('touchend', function(e) {
        e.preventDefault();
        touchInput.right = false;
    });
    
    document.getElementById('skillBtn').addEventListener('touchstart', function(e) {
        e.preventDefault();
        touchInput.skill = true;
        activateSkill();
    });
    
    document.getElementById('skillBtn').addEventListener('touchend', function(e) {
        e.preventDefault();
        touchInput.skill = false;
    });
    
    // ウィンドウリサイズ対応
    window.addEventListener('resize', function() {
        resizeCanvas();
    });
}

function startGame() {
    gameState.screen = 'playing';
    document.getElementById('titleScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    
    // ゲームループ開始
    gameLoop = setInterval(updateGame, 1000 / 60); // 60FPS
}

function restartGame() {
    clearInterval(gameLoop);
    resetGameState();
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('titleScreen').classList.remove('hidden');
}

function updateGame() {
    if (gameState.screen !== 'playing') return;
    
    // 入力処理
    handleInput();
    
    // プレイヤー更新
    updatePlayer();
    
    // ゲーム要素の更新
    updateMemoryFragments();
    updateObstacles();
    updateParticles();
    updateGravityZones();
    updateTerrain();
    
    // 新しい要素の生成
    generateGameElements();
    
    // 当たり判定
    checkCollisions();
    
    // スコア更新
    updateScore();
    
    // 描画
    render();
    
    // UI更新
    updateUI();
}

function handleInput() {
    // 左右移動
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || touchInput.left) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || touchInput.right) {
        player.x += player.speed;
    }
    
    // 画面端での制限
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
}

function updatePlayer() {
    // プレイヤーは画面下部に固定されているので、y座標は変更しない
    
    // 無敵時間の更新
    if (player.invulnerable) {
        player.invulnerableTime--;
        if (player.invulnerableTime <= 0) {
            player.invulnerable = false;
        }
    }
    
    // スキルクールダウン
    if (player.skillCooldown > 0) {
        player.skillCooldown--;
    }
    
    // アクティブスキルの効果時間管理
    if (player.activeSkill) {
        player.activeSkill.duration--;
        if (player.activeSkill.duration <= 0) {
            deactivateSkill();
        }
    }
}

function updateMemoryFragments() {
    for (let i = memoryFragments.length - 1; i >= 0; i--) {
        let fragment = memoryFragments[i];
        fragment.y += gameState.gameSpeed; // 下に移動
        fragment.rotation += 0.1;
        
        // 画面下に出たら削除
        if (fragment.y > canvas.height + 50) {
            memoryFragments.splice(i, 1);
        }
    }
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obstacle = obstacles[i];
        obstacle.y += gameState.gameSpeed; // 下に移動
        
        // 動くタイプの障害物
        if (obstacle.type === 'moving') {
            obstacle.x += obstacle.speedX;
            if (obstacle.x <= 0 || obstacle.x + obstacle.width >= canvas.width) {
                obstacle.speedX *= -1;
            }
        }
        
        // 画面下に出たら削除
        if (obstacle.y > canvas.height + 50) {
            obstacles.splice(i, 1);
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let particle = particles[i];
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life--;
        particle.alpha = particle.life / particle.maxLife;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function updateGravityZones() {
    for (let i = gravityZones.length - 1; i >= 0; i--) {
        let zone = gravityZones[i];
        zone.y += gameState.gameSpeed; // 下に移動
        
        // 画面下に出たら削除
        if (zone.y > canvas.height + 50) {
            gravityZones.splice(i, 1);
        }
    }
}

function updateTerrain() {
    for (let i = terrain.length - 1; i >= 0; i--) {
        let block = terrain[i];
        block.y += gameState.gameSpeed; // 下に移動
        
        // 画面下に出たら削除
        if (block.y > canvas.height + 50) {
            terrain.splice(i, 1);
        }
    }
}

function generateGameElements() {
    // 記憶片の生成（画面上部から）
    if (Math.random() < 0.02) {
        memoryFragments.push({
            x: Math.random() * (canvas.width - 30),
            y: -30, // 画面上部から出現
            width: 30,
            height: 30,
            rotation: 0,
            type: getRandomFragmentType()
        });
    }
    
    // 障害物の生成（画面上部から）
    if (Math.random() < 0.015) {
        obstacles.push({
            x: Math.random() * (canvas.width - 50),
            y: -50, // 画面上部から出現
            width: 50,
            height: 50,
            type: getRandomObstacleType(),
            speedX: Math.random() * 2 - 1
        });
    }
    
    // 反重力ゾーンの生成（画面上部から）
    if (Math.random() < 0.005) {
        gravityZones.push({
            x: Math.random() * (canvas.width - 100),
            y: -100, // 画面上部から出現
            width: 100,
            height: 100,
            type: 'antiGravity'
        });
    }
    
    // 地形の生成（画面上部から）
    if (Math.random() < 0.01) {
        generateTerrain();
    }
}

function getRandomFragmentType() {
    const types = ['slow', 'warp', 'invisible'];
    return types[Math.floor(Math.random() * types.length)];
}

function getRandomObstacleType() {
    const types = ['static', 'moving', 'spike'];
    return types[Math.floor(Math.random() * types.length)];
}

function generateTerrain() {
    for (let i = 0; i < 3; i++) {
        terrain.push({
            x: Math.random() * (canvas.width - 80),
            y: -100 - i * 150, // 画面上部から出現
            width: 80 + Math.random() * 40,
            height: 20,
            type: 'platform'
        });
    }
}

function checkCollisions() {
    // プレイヤーが無敵状態でない場合のみ当たり判定
    if (!player.invulnerable) {
        // 障害物との当たり判定
        for (let obstacle of obstacles) {
            if (isColliding(player, obstacle)) {
                takeDamage();
                break;
            }
        }
        
        // 地形との当たり判定
        for (let block of terrain) {
            if (isColliding(player, block)) {
                takeDamage();
                break;
            }
        }
    }
    
    // 記憶片との当たり判定
    for (let i = memoryFragments.length - 1; i >= 0; i--) {
        let fragment = memoryFragments[i];
        if (isColliding(player, fragment)) {
            collectMemoryFragment(fragment);
            memoryFragments.splice(i, 1);
            break;
        }
    }
    
    // 反重力ゾーンとの当たり判定
    for (let zone of gravityZones) {
        if (isColliding(player, zone)) {
            applyGravityEffect(zone);
        }
    }
}

function isColliding(obj1, obj2) {
    // 透明化スキルが有効な場合、当たり判定を無効化
    if (player.activeSkill && player.activeSkill.type === 'invisible') {
        return false;
    }
    
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

function takeDamage() {
    gameState.lives--;
    player.invulnerable = true;
    player.invulnerableTime = 120; // 2秒間無敵
    
    // ダメージエフェクト
    createParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff6b6b', 10);
    
    if (gameState.lives <= 0) {
        gameOver();
    }
}

function collectMemoryFragment(fragment) {
    gameState.codes++;
    
    // スキル解放
    switch (fragment.type) {
        case 'slow':
            player.hasSlowMotion = true;
            break;
        case 'warp':
            player.hasWarp = true;
            break;
        case 'invisible':
            player.hasInvisible = true;
            break;
    }
    
    // 回収エフェクト
    createParticles(fragment.x + fragment.width / 2, fragment.y + fragment.height / 2, '#ffd93d', 15);
}

function applyGravityEffect(zone) {
    if (zone.type === 'antiGravity') {
        // 反重力ゾーンでは少し上に押し上げる
        player.y -= 2;
        if (player.y < canvas.height - 200) {
            player.y = canvas.height - 200;
        }
    }
}

function activateSkill() {
    if (player.skillCooldown > 0 || player.activeSkill) return;
    
    let skillType = null;
    
    // 利用可能なスキルの中から選択
    if (player.hasSlowMotion) {
        skillType = 'slow';
    } else if (player.hasWarp) {
        skillType = 'warp';
    } else if (player.hasInvisible) {
        skillType = 'invisible';
    }
    
    if (!skillType) return;
    
    player.activeSkill = {
        type: skillType,
        duration: 300 // 5秒間
    };
    
    player.skillCooldown = 600; // 10秒間のクールダウン
    
    // スキル効果の適用
    switch (skillType) {
        case 'slow':
            gameState.gameSpeed *= 0.3;
            break;
        case 'warp':
            // ワープ効果：プレイヤーを上に移動
            player.y -= 50;
            if (player.y < canvas.height - 200) {
                player.y = canvas.height - 200;
            }
            break;
        case 'invisible':
            // 透明化は当たり判定で処理
            break;
    }
    
    // エフェクト生成
    createParticles(player.x + player.width / 2, player.y + player.height / 2, '#ffd93d', 20);
}

function deactivateSkill() {
    if (!player.activeSkill) return;
    
    switch (player.activeSkill.type) {
        case 'slow':
            gameState.gameSpeed = 2;
            break;
        case 'warp':
            // ワープ後は元の位置に戻る
            player.y = canvas.height - 150;
            break;
    }
    
    player.activeSkill = null;
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            speedX: (Math.random() - 0.5) * 10,
            speedY: (Math.random() - 0.5) * 10,
            color: color,
            life: 60,
            maxLife: 60,
            alpha: 1
        });
    }
}

function updateScore() {
    gameState.score += gameState.gameSpeed;
    gameState.altitude = Math.max(0, 10000 - Math.floor(gameState.score / 10));
    
    // 速度の増加
    if (gameState.score % 1000 === 0) {
        gameState.gameSpeed += 0.1;
    }
}

function gameOver() {
    gameState.screen = 'gameOver';
    clearInterval(gameLoop);
    
    // ゲームオーバー画面を表示
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('hidden');
    
    // 最終スコア表示
    document.getElementById('finalScore').textContent = `距離: ${Math.floor(gameState.score)}m`;
    document.getElementById('finalCodes').textContent = `回収したコード: ${gameState.codes}`;
    
    // 解放したスキルの表示
    let unlockedSkills = [];
    if (player.hasSlowMotion) unlockedSkills.push('スローモーション');
    if (player.hasWarp) unlockedSkills.push('ワープ');
    if (player.hasInvisible) unlockedSkills.push('透明化');
    
    document.getElementById('unlockedSkills').textContent = 
        `解放したスキル: ${unlockedSkills.length > 0 ? unlockedSkills.join(', ') : 'なし'}`;
}

function render() {
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景の描画
    drawBackground();
    
    // パーティクルの描画
    drawParticles();
    
    // 反重力ゾーンの描画
    drawGravityZones();
    
    // 地形の描画
    drawTerrain();
    
    // 障害物の描画
    drawObstacles();
    
    // 記憶片の描画
    drawMemoryFragments();
    
    // プレイヤーの描画
    drawPlayer();
}

function drawBackground() {
    // 星の描画（落下感を出すため、星も下に流れる）
    for (let i = 0; i < 100; i++) {
        const x = (i * 123) % canvas.width;
        const y = ((i * 456 + gameState.score * 3) % (canvas.height + 100)) - 100;
        const alpha = Math.sin(i + gameState.score * 0.01) * 0.5 + 0.5;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
        ctx.fillRect(x, y, 2, 2);
    }
}

function drawParticles() {
    for (let particle of particles) {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, 3, 3);
        ctx.restore();
    }
}

function drawGravityZones() {
    for (let zone of gravityZones) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#4a9eff';
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        
        // 境界線
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        ctx.restore();
    }
}

function drawTerrain() {
    for (let block of terrain) {
        ctx.fillStyle = '#666666';
        ctx.fillRect(block.x, block.y, block.width, block.height);
        
        // ハイライト
        ctx.fillStyle = '#888888';
        ctx.fillRect(block.x, block.y, block.width, 3);
    }
}

function drawObstacles() {
    for (let obstacle of obstacles) {
        switch (obstacle.type) {
            case 'static':
                ctx.fillStyle = '#ff6b6b';
                break;
            case 'moving':
                ctx.fillStyle = '#ff9f40';
                break;
            case 'spike':
                ctx.fillStyle = '#ff4757';
                break;
        }
        
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // スパイクの場合、三角形を描画
        if (obstacle.type === 'spike') {
            ctx.beginPath();
            ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
            ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
            ctx.closePath();
            ctx.fill();
        }
    }
}

function drawMemoryFragments() {
    for (let fragment of memoryFragments) {
        ctx.save();
        ctx.translate(fragment.x + fragment.width / 2, fragment.y + fragment.height / 2);
        ctx.rotate(fragment.rotation);
        
        // タイプに応じた色
        switch (fragment.type) {
            case 'slow':
                ctx.fillStyle = '#4a9eff';
                break;
            case 'warp':
                ctx.fillStyle = '#6bcf7f';
                break;
            case 'invisible':
                ctx.fillStyle = '#ffd93d';
                break;
        }
        
        ctx.fillRect(-fragment.width / 2, -fragment.height / 2, fragment.width, fragment.height);
        
        // 光るエフェクト
        ctx.shadowBlur = 20;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(-fragment.width / 2, -fragment.height / 2, fragment.width, fragment.height);
        
        ctx.restore();
    }
}

function drawPlayer() {
    ctx.save();
    
    // 無敵時間中の点滅
    if (player.invulnerable && Math.floor(player.invulnerableTime / 10) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    // 透明化スキル中の透明度
    if (player.activeSkill && player.activeSkill.type === 'invisible') {
        ctx.globalAlpha = 0.3;
    }
    
    // プレイヤーの描画
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // 光るエフェクト
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffffff';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    ctx.restore();
}

function updateUI() {
    document.getElementById('score').textContent = `距離: ${Math.floor(gameState.score)}m`;
    document.getElementById('codes').textContent = `コード: ${gameState.codes}`;
    document.getElementById('altitude').textContent = `高度: ${gameState.altitude}m`;
    
    // スキル表示
    let skillText = 'スキル: ';
    if (player.activeSkill) {
        switch (player.activeSkill.type) {
            case 'slow':
                skillText += 'スローモーション';
                break;
            case 'warp':
                skillText += 'ワープ';
                break;
            case 'invisible':
                skillText += '透明化';
                break;
        }
    } else if (player.skillCooldown > 0) {
        skillText += `待機中(${Math.ceil(player.skillCooldown / 60)}s)`;
    } else {
        let availableSkills = [];
        if (player.hasSlowMotion) availableSkills.push('スロー');
        if (player.hasWarp) availableSkills.push('ワープ');
        if (player.hasInvisible) availableSkills.push('透明');
        
        skillText += availableSkills.length > 0 ? availableSkills.join('/') : 'なし';
    }
    
    document.getElementById('skillDisplay').textContent = skillText;
}