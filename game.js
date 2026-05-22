// ============================================
// ★ GRADIUS TRIBUTE ★
// 횡스크롤 슈팅 - 그라디우스 스타일
// 파워업 게이지 + 옵션 + 보스전
// ============================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiOverlay = document.getElementById('ui-overlay');

let W, H;
function resizeCanvas() {
    const ratio = 640 / 480;
    if (window.innerWidth / window.innerHeight < ratio) { W = window.innerWidth; H = W / ratio; }
    else { H = window.innerHeight; W = H * ratio; }
    canvas.width = W; canvas.height = H;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);

// ============================================
// 게임 상태
// ============================================
const STATE = { TITLE:0, PLAYING:1, GAMEOVER:2, STAGE_CLEAR:3, BOSS_WARNING:4, PAUSED:5 };
let gameState = STATE.TITLE;
let score = 0, lives = 3, stage = 1, frame = 0;
let highScore = parseInt(localStorage.getItem('gradiusHigh') || '0');
let shakeTimer = 0, shakeIntensity = 0;
let stageClearTimer = 0, bossWarningTimer = 0;
let totalKills = 0, maxCombo = 0;

// 가상 해상도 (내부 좌표계)
const VW = 640, VH = 480;

// ============================================
// 입력
// ============================================
const keys = {};
let touchDragX = 0, touchDragY = 0, touchActive = false;
let touchStartX = 0, touchStartY = 0;

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        if (document.activeElement === document.getElementById('player-name')) return;
        e.preventDefault();
        if (gameState === STATE.TITLE || gameState === STATE.GAMEOVER) startGame();
    }
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'KeyM') toggleMute();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('touchstart', handleTouch, { passive: false });
canvas.addEventListener('touchmove', handleTouch, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

function handleTouch(e) {
    e.preventDefault();
    if (gameState === STATE.TITLE) { startGame(); return; }
    if (gameState === STATE.GAMEOVER) {
        if (document.getElementById('name-input-area').style.display === 'none') startGame();
        return;
    }
    if (gameState !== STATE.PLAYING) return;
    const touch = e.touches[0];
    if (!touchActive) {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchActive = true;
    }
    touchDragX = (touch.clientX - touchStartX) * 0.08;
    touchDragY = (touch.clientY - touchStartY) * 0.08;
    touchStartX += (touch.clientX - touchStartX) * 0.05;
    touchStartY += (touch.clientY - touchStartY) * 0.05;
}
function handleTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length === 0) { touchDragX = 0; touchDragY = 0; touchActive = false; }
}

// ============================================
// 파워업 시스템 (그라디우스 스타일 게이지)
// SPEED → MISSILE → DOUBLE → LASER → OPTION → SHIELD
// ============================================
const POWER_GAUGE = ['SPEED','MISSILE','DOUBLE','LASER','OPTION','SHIELD'];
let powerGaugePos = -1; // 현재 게이지 커서 (-1 = 없음)
let powerCapsules = 0;  // 모은 캡슐 수

// 플레이어 파워업 상태
const powerState = {
    speedLevel: 0,    // 0~4
    hasMissile: false,
    hasDouble: false,
    hasLaser: false,
    options: [],      // 옵션(분신) 배열
    hasShield: false,
    shieldHP: 0
};

// ============================================
// 플레이어
// ============================================
const player = {
    x: 80, y: 240, width: 32, height: 16, speed: 3.5,
    fireRate: 10, fireCooldown: 0,
    alive: true, invincible: 0, combo: 0,
    trail: [] // 옵션 추적용
};

// 게임 오브젝트
let playerBullets = [], enemyBullets = [], enemies = [], capsules = [], particles = [], damageNumbers = [];
let boss = null;
let scrollSpeed = 1.5;
let stageClearFireworks = [];

// ============================================
// 배경 (우주 + 지형)
// ============================================
let stars = [], bgLayers = [];
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * VW, y: Math.random() * VH,
            speed: Math.random() * 2 + 0.5, size: Math.random() * 1.5 + 0.5
        });
    }
    bgLayers = [];
    for (let i = 0; i < 3; i++) {
        bgLayers.push({
            x: Math.random() * VW, y: Math.random() * VH,
            r: Math.random() * 80 + 30,
            color: `hsla(${200 + Math.random() * 60}, 50%, 15%, 0.04)`,
            speed: Math.random() * 0.3 + 0.1
        });
    }
}
initStars();

// 지형 (상하 장애물 - 그라디우스 특유의 지형)
let terrainTop = [], terrainBottom = [];
function initTerrain() {
    terrainTop = []; terrainBottom = [];
    for (let i = 0; i < VW + 100; i += 4) {
        terrainTop.push(0);
        terrainBottom.push(VH);
    }
}
initTerrain();

// ============================================
// 게임 시작
// ============================================
function startGame() {
    sfx.init(); sfx.resume(); sfx.gameStart();
    gameState = STATE.PLAYING;
    uiOverlay.style.display = 'none';
    hideScoreScreen();
    score = 0; lives = 3; stage = 1; frame = 0; totalKills = 0; maxCombo = 0;
    player.x = 80; player.y = 240; player.alive = true;
    player.invincible = 90; player.speed = 3.5; player.fireRate = 10;
    player.fireCooldown = 0; player.combo = 0; player.trail = [];
    playerBullets = []; enemyBullets = []; capsules = []; particles = []; damageNumbers = [];
    boss = null;
    resetPowerState();
    initTerrain();
    spawnWave();
    setTimeout(() => sfx.playStageMusic(stage), 600);
}

function resetPowerState() {
    powerGaugePos = -1; powerCapsules = 0;
    powerState.speedLevel = 0;
    powerState.hasMissile = false;
    powerState.hasDouble = false;
    powerState.hasLaser = false;
    powerState.options = [];
    powerState.hasShield = false;
    powerState.shieldHP = 0;
}

// ============================================
// 일시정지
// ============================================
function togglePause() {
    if (gameState === STATE.PLAYING) {
        gameState = STATE.PAUSED;
        document.getElementById('pause-btn').textContent = '▶';
    } else if (gameState === STATE.PAUSED) {
        gameState = STATE.PLAYING;
        document.getElementById('pause-btn').textContent = '⏸';
    }
}

// ============================================
// 파워업 적용
// ============================================
function activatePower() {
    if (powerGaugePos < 0) return;
    const power = POWER_GAUGE[powerGaugePos];
    sfx.powerUp();
    switch (power) {
        case 'SPEED':
            if (powerState.speedLevel < 4) {
                powerState.speedLevel++;
                player.speed = 3.5 + powerState.speedLevel * 1.0;
            }
            break;
        case 'MISSILE':
            powerState.hasMissile = true;
            break;
        case 'DOUBLE':
            powerState.hasDouble = true;
            powerState.hasLaser = false;
            break;
        case 'LASER':
            powerState.hasLaser = true;
            powerState.hasDouble = false;
            break;
        case 'OPTION':
            if (powerState.options.length < 4) {
                powerState.options.push({ x: player.x, y: player.y, trailIdx: 0 });
            }
            break;
        case 'SHIELD':
            powerState.hasShield = true;
            powerState.shieldHP = 3;
            break;
    }
    powerGaugePos = -1;
    powerCapsules = 0;
}

// ============================================
// 웨이브 생성
// ============================================
let waveEnemiesLeft = 0;
let wavePattern = 0;

function spawnWave() {
    enemies = []; boss = null;
    wavePattern = 0;
    // 5스테이지마다 보스
    if (stage % 5 === 0) {
        bossWarningTimer = 90;
        gameState = STATE.BOSS_WARNING;
        sfx.bossWarning();
        return;
    }
    const count = 12 + stage * 3;
    waveEnemiesLeft = count;
    scheduleEnemyWaves(count);
}

function scheduleEnemyWaves(total) {
    let spawned = 0;
    const interval = setInterval(() => {
        if (gameState !== STATE.PLAYING && gameState !== STATE.BOSS_WARNING) {
            clearInterval(interval); return;
        }
        const batchSize = Math.min(4 + Math.floor(stage / 2), total - spawned);
        spawnEnemyBatch(batchSize);
        spawned += batchSize;
        if (spawned >= total) clearInterval(interval);
    }, 1200);
}

function spawnEnemyBatch(count) {
    const patterns = ['line', 'sine', 'circle', 'vshape'];
    const pat = patterns[wavePattern % patterns.length];
    wavePattern++;
    for (let i = 0; i < count; i++) {
        let ex = VW + 40 + i * 35;
        let ey = 60 + Math.random() * (VH - 120);
        let type = 'grunt';
        if (Math.random() < 0.2) type = 'mid';
        if (Math.random() < 0.08) type = 'heavy';
        const e = mkEnemy(ex, ey, type, pat, i, count);
        enemies.push(e);
    }
}

function mkEnemy(x, y, type, pattern, idx, total) {
    let hp = 1, w = 20, h = 16, pts = 100, speed = 2 + stage * 0.15;
    if (type === 'mid') { hp = 2 + Math.floor(stage / 3); w = 24; h = 20; pts = 300; speed *= 0.8; }
    if (type === 'heavy') { hp = 4 + Math.floor(stage / 2); w = 28; h = 24; pts = 500; speed *= 0.6; }
    return {
        x, y, width: w, height: h, type, hp, maxHp: hp,
        alive: true, pts, speed, pattern, idx, total,
        time: 0, startX: x, startY: y,
        flashTimer: 0, hasCapsule: Math.random() < 0.12
    };
}

function spawnBoss() {
    const bossHP = 50 + stage * 15;
    const isFinal = stage >= 20;
    boss = {
        x: VW + 60, y: VH / 2, targetX: VW - 100, width: 70, height: 70,
        hp: bossHP, maxHp: bossHP, alive: true,
        phase: 0, phaseTimer: 0, moveDir: 1, moveSpeed: 1.2,
        attackTimer: 0, flashTimer: 0, type: 'BOSS',
        isFinal: isFinal
    };
    enemies = [];
    gameState = STATE.PLAYING;
    sfx.playBossMusic(isFinal);
}

// ============================================
// 메인 업데이트
// ============================================
function update() {
    frame++;
    // 배경 스크롤
    stars.forEach(s => { s.x -= s.speed * scrollSpeed; if (s.x < 0) { s.x = VW; s.y = Math.random() * VH; } });
    bgLayers.forEach(p => { p.x -= p.speed * scrollSpeed; if (p.x < -p.r) { p.x = VW + p.r; p.y = Math.random() * VH; } });

    if (gameState === STATE.PAUSED) return;
    if (gameState === STATE.BOSS_WARNING) { bossWarningTimer--; if (bossWarningTimer <= 0) spawnBoss(); return; }
    if (gameState === STATE.STAGE_CLEAR) { updateStageClear(); return; }
    if (gameState !== STATE.PLAYING) return;
    if (shakeTimer > 0) shakeTimer--;

    updatePlayer();
    updatePlayerBullets();
    updateEnemies();
    updateEnemyBullets();
    if (boss && boss.alive) updateBoss();
    updateCapsules();
    updateParticles();
    updateOptions();
    damageNumbers.forEach(d => { d.x -= 0.5; d.y -= 0.8; d.life--; });
    damageNumbers = damageNumbers.filter(d => d.life > 0);
    checkCollisions();
    checkWaveClear();
}

// ============================================
// 플레이어 업데이트
// ============================================
function updatePlayer() {
    if (!player.alive) return;
    let dx = 0, dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) dx = -1;
    if (keys['ArrowRight'] || keys['KeyD']) dx = 1;
    if (keys['ArrowUp'] || keys['KeyW']) dy = -1;
    if (keys['ArrowDown'] || keys['KeyS']) dy = 1;
    // 터치
    if (touchActive) { dx += touchDragX; dy += touchDragY; }
    // 정규화
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }
    player.x += dx * player.speed;
    player.y += dy * player.speed;
    player.x = Math.max(16, Math.min(VW - 16, player.x));
    player.y = Math.max(20, Math.min(VH - 20, player.y));
    // 트레일 기록 (옵션 추적용)
    player.trail.unshift({ x: player.x, y: player.y });
    if (player.trail.length > 200) player.trail.pop();
    // 자동 발사
    player.fireCooldown--;
    if (player.fireCooldown <= 0) {
        firePlayerBullets();
        player.fireCooldown = player.fireRate;
    }
    if (player.invincible > 0) player.invincible--;
    // 파워업 활성화 (Enter 또는 더블탭)
    if (keys['Enter'] && powerGaugePos >= 0) {
        keys['Enter'] = false;
        activatePower();
    }
}

// ============================================
// 플레이어 발사
// ============================================
function firePlayerBullets() {
    if (powerState.hasLaser) {
        // 레이저 (관통)
        playerBullets.push({ x: player.x + 16, y: player.y, vx: 12, vy: 0, width: 40, height: 3, type: 'laser', pierce: true });
        sfx.shootLaser();
    } else if (powerState.hasDouble) {
        // 더블 (전방 + 위 대각선)
        playerBullets.push({ x: player.x + 16, y: player.y, vx: 9, vy: 0, width: 12, height: 3, type: 'normal' });
        playerBullets.push({ x: player.x + 8, y: player.y - 6, vx: 7, vy: -5, width: 12, height: 3, type: 'normal' });
        sfx.shoot();
    } else {
        // 기본 발사
        playerBullets.push({ x: player.x + 16, y: player.y, vx: 9, vy: 0, width: 12, height: 3, type: 'normal' });
        sfx.shoot();
    }
    // 미사일
    if (powerState.hasMissile && frame % 20 === 0) {
        playerBullets.push({ x: player.x, y: player.y + 8, vx: 3, vy: 4, width: 6, height: 10, type: 'missile' });
        sfx.shootMissile();
    }
    // 옵션도 발사
    powerState.options.forEach(opt => {
        if (powerState.hasLaser) {
            playerBullets.push({ x: opt.x + 10, y: opt.y, vx: 12, vy: 0, width: 35, height: 2, type: 'laser', pierce: true });
        } else {
            playerBullets.push({ x: opt.x + 10, y: opt.y, vx: 9, vy: 0, width: 10, height: 2, type: 'option_bullet' });
        }
    });
}

function updatePlayerBullets() {
    playerBullets.forEach(b => {
        b.x += b.vx; b.y += b.vy;
        // 미사일은 아래로 떨어지다가 바닥에서 수평 이동
        if (b.type === 'missile') {
            if (b.y > VH - 30) { b.vy = 0; b.vx = 4; }
        }
    });
    playerBullets = playerBullets.filter(b => b.x < VW + 50 && b.x > -20 && b.y < VH + 20 && b.y > -20);
}

// ============================================
// 옵션 (분신) 업데이트
// ============================================
function updateOptions() {
    powerState.options.forEach((opt, i) => {
        const delay = (i + 1) * 18;
        if (player.trail.length > delay) {
            const target = player.trail[delay];
            opt.x += (target.x - opt.x) * 0.3;
            opt.y += (target.y - opt.y) * 0.3;
        }
    });
}

// ============================================
// 적 업데이트
// ============================================
function updateEnemies() {
    enemies.forEach(e => {
        if (!e.alive) return;
        e.time++;
        if (e.flashTimer > 0) e.flashTimer--;
        // 패턴별 이동
        switch (e.pattern) {
            case 'line':
                e.x -= e.speed;
                break;
            case 'sine':
                e.x -= e.speed;
                e.y = e.startY + Math.sin(e.time * 0.05) * 60;
                break;
            case 'circle':
                e.x -= e.speed * 0.7;
                e.y = e.startY + Math.sin(e.time * 0.04 + e.idx) * 40;
                break;
            case 'vshape':
                e.x -= e.speed;
                const offset = (e.idx - e.total / 2) * 8;
                e.y = e.startY + offset * Math.sin(e.time * 0.03);
                break;
        }
        // 화면 밖으로 나가면 제거
        if (e.x < -50) e.alive = false;
        // 발사 (확률)
        if (e.time > 30 && Math.random() < 0.008 + stage * 0.002) {
            const angle = Math.atan2(player.y - e.y, player.x - e.x);
            enemyBullets.push({
                x: e.x - e.width / 2, y: e.y,
                vx: Math.cos(angle) * (3 + stage * 0.2),
                vy: Math.sin(angle) * (3 + stage * 0.2),
                size: 4
            });
        }
    });
}

// ============================================
// 보스 업데이트
// ============================================
function updateBoss() {
    const b = boss;
    // 등장 이동
    if (b.x > b.targetX) { b.x -= 1.5; return; }
    b.phaseTimer++;
    if (b.flashTimer > 0) b.flashTimer--;
    // 상하 이동
    b.y += b.moveSpeed * b.moveDir;
    if (b.y < 80 || b.y > VH - 80) b.moveDir *= -1;
    // HP 비율에 따른 공격 패턴
    const hpRatio = b.hp / b.maxHp;
    b.attackTimer++;
    if (hpRatio > 0.6) {
        // 페이즈1: 직선탄
        if (b.attackTimer % 30 === 0) {
            enemyBullets.push({ x: b.x - 40, y: b.y, vx: -5, vy: 0, size: 5 });
            enemyBullets.push({ x: b.x - 40, y: b.y - 15, vx: -4.5, vy: -1, size: 4 });
            enemyBullets.push({ x: b.x - 40, y: b.y + 15, vx: -4.5, vy: 1, size: 4 });
        }
    } else if (hpRatio > 0.3) {
        // 페이즈2: 부채꼴
        if (b.attackTimer % 40 === 0) {
            for (let i = -3; i <= 3; i++) {
                const angle = Math.PI + i * 0.2;
                enemyBullets.push({ x: b.x - 35, y: b.y, vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4, size: 4 });
            }
        }
        b.moveSpeed = 1.8;
    } else {
        // 페이즈3: 원형탄 + 조준탄
        if (b.attackTimer % 25 === 0) {
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 / 12) * i + b.phaseTimer * 0.03;
                enemyBullets.push({ x: b.x, y: b.y, vx: Math.cos(angle) * 3.5, vy: Math.sin(angle) * 3.5, size: 3 });
            }
        }
        if (b.attackTimer % 50 === 0) {
            const a = Math.atan2(player.y - b.y, player.x - b.x);
            for (let i = 0; i < 3; i++) {
                enemyBullets.push({ x: b.x - 30, y: b.y, vx: Math.cos(a) * (5 + i), vy: Math.sin(a) * (5 + i), size: 5 });
            }
        }
        b.moveSpeed = 2.5;
    }
}

function updateEnemyBullets() {
    enemyBullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
    enemyBullets = enemyBullets.filter(b => b.x > -20 && b.x < VW + 20 && b.y > -20 && b.y < VH + 20);
}

function updateCapsules() {
    capsules.forEach(c => { c.x -= 1.5; c.time++; });
    capsules = capsules.filter(c => c.x > -20);
}

function updateParticles() {
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life--; });
    particles = particles.filter(p => p.life > 0);
}

// ============================================
// 충돌 판정
// ============================================
function checkCollisions() {
    // 플레이어 총알 vs 적
    playerBullets.forEach(b => {
        if (boss && boss.alive) {
            if (hitTest(b, boss)) {
                if (!b.pierce) b.x = VW + 100;
                boss.hp--; boss.flashTimer = 8;
                sfx.hitEnemy();
                createExplosion(b.x, b.y, '#fff', 3);
                if (boss.hp <= 0) {
                    boss.alive = false;
                    score += 10000 + stage * 2000;
                    totalKills++;
                    sfx.explodeBoss();
                    shakeTimer = 30; shakeIntensity = 12;
                    for (let i = 0; i < 50; i++) {
                        createExplosion(boss.x + (Math.random() - 0.5) * 80, boss.y + (Math.random() - 0.5) * 80, `hsl(${Math.random()*360},100%,60%)`, 4);
                    }
                    damageNumbers.push({ x: boss.x, y: boss.y, text: `BOSS +${10000+stage*2000}`, life: 60, color: '#f0f' });
                }
            }
        }
        enemies.forEach(e => {
            if (!e.alive) return;
            if (hitTest(b, e)) {
                if (!b.pierce) b.x = VW + 100;
                e.hp--; e.flashTimer = 5;
                if (e.hp <= 0) {
                    e.alive = false; player.combo++; totalKills++;
                    if (player.combo > maxCombo) maxCombo = player.combo;
                    const bonus = Math.min(player.combo, 8);
                    const pts = e.pts * bonus; score += pts;
                    createExplosion(e.x, e.y, getEnemyColor(e.type), 10);
                    sfx.explodeEnemy();
                    if (player.combo > 1) sfx.combo(player.combo);
                    damageNumbers.push({ x: e.x, y: e.y, text: pts.toString(), life: 30, color: '#ff0' });
                    // 캡슐 드롭
                    if (e.hasCapsule) {
                        capsules.push({ x: e.x, y: e.y, width: 16, height: 12, time: 0 });
                    }
                } else { sfx.hitEnemy(); }
            }
        });
    });

    // 적 총알 vs 플레이어
    if (player.alive && player.invincible <= 0) {
        enemyBullets.forEach(b => {
            const dx = b.x - player.x, dy = b.y - player.y;
            if (Math.sqrt(dx * dx + dy * dy) < 14) {
                b.x = -100; playerHit();
            }
        });
        // 적 충돌
        enemies.forEach(e => {
            if (!e.alive) return;
            if (hitTest(player, e)) { e.alive = false; createExplosion(e.x, e.y, '#f80', 8); playerHit(); }
        });
    }
    // 캡슐 획득
    for (let i = capsules.length - 1; i >= 0; i--) {
        const c = capsules[i];
        if (Math.abs(c.x - player.x) < 20 && Math.abs(c.y - player.y) < 16) {
            capsules.splice(i, 1);
            sfx.getCapsule();
            // 파워 게이지 전진
            powerGaugePos = (powerGaugePos + 1) % POWER_GAUGE.length;
            powerCapsules++;
            createExplosion(c.x, c.y, '#f80', 5);
        }
    }
}

function hitTest(a, b) {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
           Math.abs(a.y - b.y) < (a.height + b.height) / 2;
}

function getEnemyColor(type) {
    if (type === 'heavy') return '#f0f';
    if (type === 'mid') return '#f80';
    return '#4f4';
}

function createExplosion(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 / count) * i + Math.random() * 0.3;
        const sp = Math.random() * 3 + 1;
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 25 + Math.random() * 15, maxLife: 40, color, size: Math.random() * 3 + 1.5 });
    }
}

function playerHit() {
    if (powerState.hasShield && powerState.shieldHP > 0) {
        powerState.shieldHP--;
        shakeTimer = 5; shakeIntensity = 3;
        createExplosion(player.x, player.y, '#08f', 6);
        sfx.shieldBlock();
        if (powerState.shieldHP <= 0) powerState.hasShield = false;
        return;
    }
    lives--; player.combo = 0;
    shakeTimer = 15; shakeIntensity = 8;
    createExplosion(player.x, player.y, '#0ff', 20);
    sfx.playerHit();
    if (lives <= 0) {
        player.alive = false;
        gameState = STATE.GAMEOVER;
        sfx.stopBGM();
        if (score > highScore) { highScore = score; localStorage.setItem('gradiusHigh', highScore.toString()); }
        sfx.playGameOverMusic();
        setTimeout(() => showScoreScreen(), 1500);
    } else {
        player.invincible = 120;
        // 파워다운 (그라디우스 특유의 죽으면 파워 리셋)
        resetPowerState();
        player.speed = 3.5;
        player.fireRate = 10;
    }
}

function checkWaveClear() {
    const allDead = enemies.filter(e => e.alive).length === 0 && (!boss || !boss.alive);
    if (!allDead) return;
    // 아직 스폰 중이면 대기
    if (enemies.length === 0 && frame < 60) return;
    if (boss && !boss.alive) boss = null;
    gameState = STATE.STAGE_CLEAR;
    stageClearTimer = 80;
    stageClearFireworks = [];
    enemyBullets = [];
    sfx.stopBGM();
    sfx.stageClear();
    score += stage * 2000;
}

// ============================================
// 스테이지 클리어 연출
// ============================================
function updateStageClear() {
    stageClearTimer--;
    stageClearFireworks.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--;
    });
    stageClearFireworks = stageClearFireworks.filter(p => p.life > 0);
    if (stageClearTimer % 12 === 0 && stageClearTimer > 10) {
        createFirework(100 + Math.random() * (VW - 200), 50 + Math.random() * (VH - 150));
    }
    if (stageClearTimer <= 0) {
        stage++;
        gameState = STATE.PLAYING;
        stageClearFireworks = [];
        sfx.playStageMusic(stage);
        spawnWave();
    }
}

function createFirework(x, y) {
    const hue = Math.random() * 360, cnt = 15;
    for (let i = 0; i < cnt; i++) {
        const a = (Math.PI * 2 / cnt) * i, sp = Math.random() * 4 + 2;
        stageClearFireworks.push({
            x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
            life: 35 + Math.random() * 20, maxLife: 55,
            color: `hsl(${hue + Math.random() * 40},100%,${50 + Math.random() * 30}%)`,
            size: Math.random() * 3 + 1.5
        });
    }
}

// ============================================
// 렌더링
// ============================================
function render() {
    const scX = W / VW, scY = H / VH;
    ctx.save();
    ctx.scale(scX, scY);
    if (shakeTimer > 0) ctx.translate((Math.random() - 0.5) * shakeIntensity, (Math.random() - 0.5) * shakeIntensity);

    // 배경
    ctx.fillStyle = '#020210';
    ctx.fillRect(0, 0, VW, VH);
    // 성운
    bgLayers.forEach(p => {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, p.color); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    });
    // 별
    stars.forEach(s => {
        const a = 0.4 + s.speed * 0.3;
        ctx.fillStyle = `rgba(200,220,255,${a})`;
        ctx.fillRect(s.x, s.y, s.size, s.size * 0.5);
    });

    if (gameState === STATE.PLAYING || gameState === STATE.GAMEOVER || gameState === STATE.PAUSED) renderGame();
    if (gameState === STATE.STAGE_CLEAR) { renderStageClear(); drawHUD(); }
    if (gameState === STATE.BOSS_WARNING) renderBossWarning();
    if (gameState === STATE.PAUSED) renderPause();

    ctx.restore();
}

function renderBossWarning() {
    const alpha = Math.sin(frame * 0.2) * 0.3 + 0.7;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f00'; ctx.font = 'bold 28px "Courier New"'; ctx.textAlign = 'center';
    ctx.shadowColor = '#f00'; ctx.shadowBlur = 20;
    ctx.fillText('⚠ WARNING ⚠', VW / 2, VH / 2 - 10);
    ctx.font = '16px "Courier New"'; ctx.fillStyle = '#ff0';
    ctx.fillText('BOSS APPROACHING', VW / 2, VH / 2 + 20);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    drawHUD();
}

function renderPause() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VW / 2, VH / 2);
    ctx.font = '12px "Courier New"'; ctx.fillStyle = '#aaa';
    ctx.fillText('Press P to resume', VW / 2, VH / 2 + 25);
}

function renderGame() {
    // 플레이어 총알
    playerBullets.forEach(b => {
        if (b.type === 'laser') {
            ctx.shadowColor = '#0ff'; ctx.shadowBlur = 6;
            const lg = ctx.createLinearGradient(b.x - b.width / 2, b.y, b.x + b.width / 2, b.y);
            lg.addColorStop(0, '#fff'); lg.addColorStop(0.5, '#0ef'); lg.addColorStop(1, '#06a');
            ctx.fillStyle = lg;
            ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
            ctx.shadowBlur = 0;
        } else if (b.type === 'missile') {
            ctx.fillStyle = '#f80';
            ctx.beginPath();
            ctx.moveTo(b.x + 3, b.y - 3); ctx.lineTo(b.x - 3, b.y); ctx.lineTo(b.x + 3, b.y + 3);
            ctx.closePath(); ctx.fill();
            // 연기
            ctx.fillStyle = 'rgba(200,200,200,0.3)';
            ctx.beginPath(); ctx.arc(b.x - 4, b.y, 2, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.shadowColor = '#0ff'; ctx.shadowBlur = 4;
            ctx.fillStyle = '#0ef';
            ctx.fillRect(b.x - b.width / 2, b.y - 1.5, b.width, 3);
            ctx.shadowBlur = 0;
        }
    });

    // 적
    enemies.forEach(e => { if (e.alive) drawEnemy(e); });

    // 보스
    if (boss && boss.alive) drawBoss();

    // 적 총알
    enemyBullets.forEach(b => {
        ctx.shadowColor = '#f44'; ctx.shadowBlur = 4;
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size);
        grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, '#f84'); grad.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size + 1, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    });

    // 캡슐
    capsules.forEach(c => {
        const bob = Math.sin(c.time * 0.1) * 2;
        ctx.save(); ctx.translate(c.x, c.y + bob);
        ctx.fillStyle = '#f40'; ctx.shadowColor = '#f80'; ctx.shadowBlur = 6;
        // 캡슐 모양 (그라디우스 특유의 빨간 캡슐)
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff0';
        ctx.beginPath(); ctx.ellipse(0, 0, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.restore();
    });

    // 옵션 (분신)
    powerState.options.forEach((opt, i) => {
        ctx.save(); ctx.translate(opt.x, opt.y);
        ctx.shadowColor = '#f80'; ctx.shadowBlur = 8;
        ctx.fillStyle = `hsl(${30 + i * 20}, 100%, 55%)`;
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-1, -1, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.restore();
    });

    // 플레이어
    if (player.alive && (player.invincible <= 0 || Math.floor(frame / 3) % 2 === 0)) {
        drawPlayer();
    }
    // 실드 표시
    if (powerState.hasShield && powerState.shieldHP > 0) {
        ctx.strokeStyle = `rgba(0,150,255,${0.4 + Math.sin(frame * 0.1) * 0.2})`;
        ctx.lineWidth = 2; ctx.shadowColor = '#08f'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(player.x, player.y, 20, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // 파티클
    particles.forEach(p => {
        ctx.globalAlpha = p.life / (p.maxLife || 40);
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 2;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    // 데미지 넘버
    damageNumbers.forEach(d => {
        ctx.globalAlpha = Math.min(1, d.life / 20);
        ctx.fillStyle = d.color; ctx.font = 'bold 11px "Courier New"'; ctx.textAlign = 'center';
        ctx.fillText(d.text, d.x, d.y);
    });
    ctx.globalAlpha = 1;

    drawHUD();
    drawPowerGauge();
}

function renderStageClear() {
    stageClearFireworks.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.shadowColor = p.color; ctx.shadowBlur = 4;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    const prog = 1 - (stageClearTimer / 80);
    const sc = Math.min(1, prog * 3);
    ctx.save(); ctx.translate(VW / 2, VH / 2); ctx.scale(sc, sc);
    ctx.shadowColor = '#ff0'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff0'; ctx.font = 'bold 26px "Courier New"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`STAGE ${stage} CLEAR!`, 0, 0);
    ctx.fillStyle = '#0ff'; ctx.font = 'bold 16px "Courier New"';
    ctx.fillText(`+${stage * 2000}`, 0, 30);
    ctx.shadowBlur = 0; ctx.restore();
    if (player.alive) drawPlayer();
}

// ============================================
// 플레이어 그리기 (그라디우스 빅바이퍼 스타일)
// ============================================
function drawPlayer() {
    ctx.save(); ctx.translate(player.x, player.y);
    // 엔진 글로우
    const fLen = 8 + Math.random() * 5;
    const eg = ctx.createLinearGradient(-16, 0, -16 - fLen, 0);
    eg.addColorStop(0, '#fff'); eg.addColorStop(0.3, '#4df'); eg.addColorStop(0.7, '#08f'); eg.addColorStop(1, 'transparent');
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.moveTo(-16, -3); ctx.lineTo(-16 - fLen, 0); ctx.lineTo(-16, 3); ctx.closePath(); ctx.fill();
    // 보조 엔진
    ctx.beginPath(); ctx.moveTo(-14, -7); ctx.lineTo(-14 - fLen * 0.5, -7); ctx.lineTo(-14, -5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-14, 7); ctx.lineTo(-14 - fLen * 0.5, 7); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill();

    // 본체 (빅바이퍼 형태 - 날렵한 전투기)
    ctx.shadowColor = '#08f'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#1a2a4a';
    ctx.beginPath();
    ctx.moveTo(18, 0);      // 기수
    ctx.lineTo(10, -5);
    ctx.lineTo(2, -6);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-16, -4);
    ctx.lineTo(-16, 4);
    ctx.lineTo(-8, 7);
    ctx.lineTo(2, 6);
    ctx.lineTo(10, 5);
    ctx.closePath(); ctx.fill();

    // 날개 (상하 델타윙)
    ctx.fillStyle = '#0a1a3a';
    ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-10, -14); ctx.lineTo(-14, -12); ctx.lineTo(-8, -7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(-10, 14); ctx.lineTo(-14, 12); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();

    // 네온 라인
    ctx.strokeStyle = '#0cf'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(10, -5); ctx.lineTo(-2, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(10, 5); ctx.lineTo(-2, 6); ctx.stroke();
    // 날개 라인
    ctx.strokeStyle = '#06a'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-10, -14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(-10, 14); ctx.stroke();

    // 콕핏
    const cg = ctx.createRadialGradient(6, 0, 0, 6, 0, 4);
    cg.addColorStop(0, '#8ef'); cg.addColorStop(0.7, '#06a'); cg.addColorStop(1, '#024');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(6, 0, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.shadowBlur = 0; ctx.restore();
}

// ============================================
// 적 그리기
// ============================================
function drawEnemy(e) {
    ctx.save(); ctx.translate(e.x, e.y);
    const flash = e.flashTimer > 0;
    if (e.type === 'heavy') {
        // 대형 적 - 육각형 장갑
        ctx.fillStyle = flash ? '#fff' : '#2a0a3a';
        ctx.shadowColor = '#f0f'; ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 2; ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : `hsl(${280 + Math.sin(frame * 0.1) * 20},100%,60%)`;
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        if (e.maxHp > 1) { ctx.fillStyle = '#333'; ctx.fillRect(-10, 16, 20, 2); ctx.fillStyle = '#f0f'; ctx.fillRect(-10, 16, 20 * (e.hp / e.maxHp), 2); }
    } else if (e.type === 'mid') {
        // 중형 적 - 다이아몬드
        ctx.fillStyle = flash ? '#fff' : '#1a1a0a';
        ctx.shadowColor = '#f80'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(0, -10); ctx.lineTo(-12, 0); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = flash ? '#fff' : '#f80'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(16, -3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(16, 3); ctx.stroke();
        ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    } else {
        // 소형 적 - 삼각 드론
        ctx.fillStyle = flash ? '#fff' : '#0a2a1a';
        ctx.shadowColor = '#0f0'; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -7); ctx.lineTo(-6, 0); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4f4';
        ctx.beginPath(); ctx.arc(-4, 0, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.restore();
}

// ============================================
// 보스 그리기
// ============================================
function drawBoss() {
    const b = boss;
    ctx.save(); ctx.translate(b.x, b.y);
    const pulse = Math.sin(frame * 0.04) * 0.03 + 1;
    const flash = b.flashTimer > 0;
    ctx.scale(pulse, pulse);

    // 거대 전함 (그라디우스 보스 스타일)
    ctx.shadowColor = flash ? '#f00' : '#80f'; ctx.shadowBlur = 12;
    // 메인 바디
    ctx.fillStyle = flash ? '#333' : '#0a0a2a';
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    ctx.lineTo(-40, -30); ctx.lineTo(-20, -40); ctx.lineTo(20, -35);
    ctx.lineTo(40, -20); ctx.lineTo(50, 0);
    ctx.lineTo(40, 20); ctx.lineTo(20, 35);
    ctx.lineTo(-20, 40); ctx.lineTo(-40, 30);
    ctx.closePath(); ctx.fill();

    // 장갑 패널
    ctx.strokeStyle = flash ? '#f44' : '#40f'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-40, -30); ctx.lineTo(-25, -15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-40, 30); ctx.lineTo(-25, 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40, -20); ctx.lineTo(25, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40, 20); ctx.lineTo(25, 10); ctx.stroke();

    // 코어 (약점)
    const coreColor = flash ? '#f00' : `hsl(${frame * 2 % 360},100%,50%)`;
    ctx.fillStyle = coreColor; ctx.shadowColor = coreColor; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();

    // 포대
    ctx.fillStyle = '#333';
    ctx.fillRect(-55, -8, 12, 6); ctx.fillRect(-55, 2, 12, 6);
    ctx.fillRect(35, -15, 10, 5); ctx.fillRect(35, 10, 10, 5);

    // 에너지 링
    ctx.strokeStyle = `hsla(${frame * 3 % 360},100%,60%,0.3)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 45, 25, frame * 0.01, 0, Math.PI * 2); ctx.stroke();

    // HP바
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#222'; ctx.fillRect(-40, 48, 80, 5);
    const hpRatio = b.hp / b.maxHp;
    ctx.fillStyle = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.25 ? '#ff0' : '#f00';
    ctx.fillRect(-40, 48, 80 * hpRatio, 5);
    ctx.strokeStyle = '#666'; ctx.lineWidth = 0.5; ctx.strokeRect(-40, 48, 80, 5);

    ctx.restore();
}

// ============================================
// HUD
// ============================================
function drawHUD() {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${score.toString().padStart(8, '0')}`, 8, 16);
    ctx.textAlign = 'center'; ctx.fillStyle = '#aaa';
    ctx.fillText(`HIGH ${highScore.toString().padStart(8, '0')}`, VW / 2, 16);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ff0';
    ctx.fillText(`STAGE ${stage}`, VW - 8, 16);
    // 라이프
    for (let i = 0; i < lives; i++) {
        ctx.fillStyle = '#0cf';
        ctx.beginPath(); ctx.moveTo(18 + i * 18, VH - 10); ctx.lineTo(12 + i * 18, VH - 4); ctx.lineTo(24 + i * 18, VH - 4); ctx.closePath(); ctx.fill();
    }
    // 콤보
    if (player.combo > 1) {
        ctx.textAlign = 'center'; ctx.fillStyle = `hsl(${frame * 5 % 360},100%,70%)`;
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillText(`${player.combo} COMBO!`, VW / 2, 32);
    }
    // 보스전 표시
    if (boss && boss.alive) {
        ctx.textAlign = 'center'; ctx.fillStyle = '#f44'; ctx.font = 'bold 10px "Courier New"';
        ctx.fillText('★ BOSS BATTLE ★', VW / 2, 44);
    }
}

// ============================================
// 파워 게이지 (하단 표시)
// ============================================
function drawPowerGauge() {
    const gaugeY = VH - 22;
    const startX = VW / 2 - (POWER_GAUGE.length * 52) / 2;
    ctx.font = 'bold 9px "Courier New"'; ctx.textAlign = 'center';
    POWER_GAUGE.forEach((name, i) => {
        const x = startX + i * 52 + 26;
        const active = i === powerGaugePos;
        ctx.fillStyle = active ? 'rgba(255,128,0,0.3)' : 'rgba(50,50,80,0.5)';
        ctx.fillRect(x - 24, gaugeY - 7, 48, 14);
        ctx.strokeStyle = active ? '#f80' : '#444';
        ctx.lineWidth = active ? 2 : 0.5;
        ctx.strokeRect(x - 24, gaugeY - 7, 48, 14);
        ctx.fillStyle = active ? '#ff0' : '#888';
        ctx.fillText(name, x, gaugeY + 3);
    });
    // 안내
    if (powerGaugePos >= 0) {
        ctx.fillStyle = '#0ff'; ctx.font = '9px "Courier New"'; ctx.textAlign = 'right';
        ctx.fillText('[ENTER] 파워업 적용', VW - 10, gaugeY + 3);
    }
}

// ============================================
// 스코어보드
// ============================================
const BLOB_URL = 'https://jsonblob.com/api/jsonBlob';
let onlineBlobId = localStorage.getItem('gradiusBlobId') || '';

function getToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function getLocalScores() { try { return JSON.parse(localStorage.getItem('gradiusScores') || '[]'); } catch { return []; } }
function saveLocalScores(s) { localStorage.setItem('gradiusScores', JSON.stringify(s)); }

async function fetchOnlineScores() {
    if (!onlineBlobId) return null;
    try {
        const res = await fetch(`${BLOB_URL}/${onlineBlobId}`, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } });
        if (res.ok) { const data = await res.json(); return data.scores || []; }
    } catch (e) {}
    return null;
}

async function pushOnlineScore(newEntry) {
    try {
        let scores = await fetchOnlineScores();
        if (!scores) scores = getLocalScores();
        scores.push(newEntry);
        scores.sort((a, b) => b.score - a.score);
        if (scores.length > 200) scores.length = 200;
        const body = JSON.stringify({ scores });
        if (!onlineBlobId) {
            const res = await fetch(BLOB_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body });
            if (res.ok) { const loc = res.headers.get('Location') || res.headers.get('location'); if (loc) { onlineBlobId = loc.split('/').pop(); localStorage.setItem('gradiusBlobId', onlineBlobId); } }
        } else {
            await fetch(`${BLOB_URL}/${onlineBlobId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body });
        }
        return scores;
    } catch (e) { return null; }
}

function showScoreScreen() {
    const el = document.getElementById('score-screen');
    document.getElementById('final-score').textContent = `SCORE: ${score.toLocaleString()} | STAGE ${stage} | KILLS ${totalKills} | MAX COMBO ${maxCombo}`;
    document.getElementById('name-input-area').style.display = 'block';
    document.getElementById('player-name').value = localStorage.getItem('gradiusLastName') || '';
    renderLeaderboards();
    el.style.display = 'block';
    setTimeout(() => document.getElementById('player-name').focus(), 100);
}
function hideScoreScreen() { document.getElementById('score-screen').style.display = 'none'; }

async function saveScore() {
    const name = document.getElementById('player-name').value.trim() || '???';
    localStorage.setItem('gradiusLastName', name);
    const entry = { name, score, stage, kills: totalKills, combo: maxCombo, date: getToday() };
    const local = getLocalScores();
    local.push(entry); local.sort((a, b) => b.score - a.score);
    if (local.length > 200) local.length = 200;
    saveLocalScores(local);
    document.getElementById('name-input-area').style.display = 'none';
    document.getElementById('save-score-btn').textContent = '저장중...';
    const online = await pushOnlineScore(entry);
    if (online) saveLocalScores(online);
    document.getElementById('save-score-btn').textContent = '저장';
    renderLeaderboards();
}

async function renderLeaderboards() {
    const today = getToday();
    let scores = await fetchOnlineScores();
    if (!scores) scores = getLocalScores();
    else saveLocalScores(scores);
    const todayS = scores.filter(s => s.date === today).sort((a, b) => b.score - a.score).slice(0, 20);
    const allS = [...scores].sort((a, b) => b.score - a.score).slice(0, 20);
    document.getElementById('today-scores').innerHTML = todayS.length === 0 ? '<span style="color:#666">기록 없음</span>' :
        todayS.map((s, i) => `<div style="color:${i === 0 ? '#ff0' : '#ccc'}">${i+1}. ${s.name} ${s.score.toLocaleString()} (S${s.stage})</div>`).join('');
    document.getElementById('all-scores').innerHTML = allS.length === 0 ? '<span style="color:#666">기록 없음</span>' :
        allS.map((s, i) => `<div style="color:${i === 0 ? '#ff0' : '#ccc'}">${i+1}. ${s.name} ${s.score.toLocaleString()} (S${s.stage})</div>`).join('');
}

async function showTitleScores() {
    let scores = await fetchOnlineScores();
    if (!scores) scores = getLocalScores();
    const top5 = [...scores].sort((a, b) => b.score - a.score).slice(0, 5);
    const el = document.getElementById('title-scores');
    if (el) {
        el.innerHTML = top5.length === 0 ? '' :
            '<div style="margin-top:10px;color:#f80;font-size:11px;">🏆 TOP SCORES</div>' +
            top5.map((s, i) => `<div style="color:${i === 0 ? '#ff0' : '#aaa'};font-size:11px;">${i+1}. ${s.name} - ${s.score.toLocaleString()}</div>`).join('');
    }
}

// ============================================
// 유틸리티
// ============================================
function toggleMute() {
    const m = sfx.toggleMute();
    document.getElementById('mute-btn').textContent = m ? '🔇' : '🔊';
}

document.getElementById('player-name').addEventListener('keydown', e => {
    if (e.code === 'Enter') { e.preventDefault(); saveScore(); }
});

// ============================================
// 게임 루프
// ============================================
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

uiOverlay.style.display = 'block';
showTitleScores();
gameLoop();
