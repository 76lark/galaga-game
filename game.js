// ============================================
// ★ GRADIUS TRIBUTE ★
// 횡스크롤 슈팅 - 그라디우스 스타일
// 아이템 자동 적용 + 누적 강화
// ============================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiOverlay = document.getElementById('ui-overlay');

let W, H;
function resizeCanvas() {
    // 모바일: 화면 전체를 채움 (가로 모드 기준)
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => { setTimeout(resizeCanvas, 100); });
document.addEventListener('fullscreenchange', () => { setTimeout(resizeCanvas, 100); });
document.addEventListener('webkitfullscreenchange', () => { setTimeout(resizeCanvas, 100); });

// 전체화면 + 가로 잠금
function goFullscreen() {
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (rfs) {
        rfs.call(el).then(() => {
            // 화면 방향을 가로로 잠금
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
            setTimeout(resizeCanvas, 200);
        }).catch(() => {});
    }
}

// 게임 시작 시 자동으로 전체화면 시도 (모바일)
function tryFullscreenOnStart() {
    if (isMobile && !document.fullscreenElement && !document.webkitFullscreenElement) {
        goFullscreen();
    }
}

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);

// 게임 상태
const STATE = { TITLE:0, PLAYING:1, GAMEOVER:2, BOSS_WARNING:3, PAUSED:4 };
let gameState = STATE.TITLE;
let score = 0, lives = 3, stage = 1, frame = 0;
let highScore = parseInt(localStorage.getItem('gradiusHigh') || '0');
let shakeTimer = 0, shakeIntensity = 0;
let bossWarningTimer = 0;
let totalKills = 0, maxCombo = 0;
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

// 모바일: UI 오버레이/스코어 화면 위에서도 탭으로 게임 시작 가능하게
uiOverlay.addEventListener('click', () => { if (gameState === STATE.TITLE) startGame(); });
uiOverlay.addEventListener('touchend', (e) => { e.preventDefault(); if (gameState === STATE.TITLE) startGame(); }, { passive: false });
document.getElementById('score-screen').addEventListener('click', (e) => {
    if (e.target.id === 'player-name' || e.target.id === 'save-score-btn') return;
    if (gameState === STATE.GAMEOVER) startGame();
});
document.getElementById('score-screen').addEventListener('touchend', (e) => {
    if (e.target.id === 'player-name' || e.target.id === 'save-score-btn') return;
    e.preventDefault();
    if (gameState === STATE.GAMEOVER) startGame();
}, { passive: false });

function handleTouch(e) {
    e.preventDefault();
    if (gameState === STATE.TITLE) { startGame(); return; }
    if (gameState === STATE.GAMEOVER) {
        startGame();
        return;
    }
    if (gameState !== STATE.PLAYING) return;
    const touch = e.touches[0];
    if (!touchActive) { touchStartX = touch.clientX; touchStartY = touch.clientY; touchActive = true; }
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
// 파워업 상태 (자동 적용 + 누적)
// ============================================
const powerState = {
    speedLevel: 0,     // 0~5
    missileLevel: 0,   // 0~3
    bulletLevel: 1,    // 1~5 (기본탄 강화)
    laserLevel: 0,     // 0~3
    optionCount: 0,    // 0~4
    shieldHP: 0        // 0~5
};
let options = []; // 옵션(분신) 위치 배열
let powerUpMessages = []; // 화면에 표시할 파워업 메시지

// 아이템 종류
const ITEM_TYPES = [
    { id: 'SPEED', label: 'S', color: '#0f0', desc: 'SPEED UP' },
    { id: 'MISSILE', label: 'M', color: '#f80', desc: 'MISSILE' },
    { id: 'BULLET', label: 'P', color: '#0ff', desc: 'POWER UP' },
    { id: 'LASER', label: 'L', color: '#f0f', desc: 'LASER' },
    { id: 'OPTION', label: 'O', color: '#ff0', desc: 'OPTION' },
    { id: 'SHIELD', label: '?', color: '#48f', desc: 'SHIELD' }
];

// 플레이어
const player = {
    x: 80, y: 240, width: 32, height: 16, speed: 3.5,
    fireRate: 10, fireCooldown: 0,
    alive: true, invincible: 0, combo: 0,
    trail: []
};

// 게임 오브젝트
let playerBullets = [], enemyBullets = [], enemies = [], items = [], particles = [], damageNumbers = [];
let boss = null;
let scrollSpeed = 1.5;

// ============================================
// 배경
// ============================================
let stars = [], bgLayers = [];
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) stars.push({ x: Math.random()*VW, y: Math.random()*VH, speed: Math.random()*2+0.5, size: Math.random()*1.5+0.5 });
    bgLayers = [];
    for (let i = 0; i < 3; i++) bgLayers.push({ x: Math.random()*VW, y: Math.random()*VH, r: Math.random()*80+30, color: `hsla(${200+Math.random()*60},50%,15%,0.04)`, speed: Math.random()*0.3+0.1 });
}
initStars();

// ============================================
// 게임 시작
// ============================================
function startGame() {
    sfx.init(); sfx.resume(); sfx.stopBGM(); sfx.gameStart();
    tryFullscreenOnStart();
    gameState = STATE.PLAYING;
    uiOverlay.style.display = 'none';
    hideScoreScreen();
    score = 0; lives = 5; stage = 1; frame = 0; totalKills = 0; maxCombo = 0;
    player.x = 80; player.y = 240; player.alive = true;
    player.invincible = 90; player.speed = 3.5; player.fireRate = 10;
    player.fireCooldown = 0; player.combo = 0; player.trail = [];
    playerBullets = []; enemyBullets = []; items = []; particles = []; damageNumbers = [];
    boss = null; options = []; powerUpMessages = [];
    resetPowerState();
    spawnWave();
    setTimeout(() => sfx.playStageMusic(stage), 600);
}

function resetPowerState() {
    powerState.speedLevel = 0;
    powerState.missileLevel = 0;
    powerState.bulletLevel = 1;
    powerState.laserLevel = 0;
    powerState.optionCount = 0;
    powerState.shieldHP = 0;
    options = [];
}

function togglePause() {
    if (gameState === STATE.PLAYING) { gameState = STATE.PAUSED; document.getElementById('pause-btn').textContent = '▶'; }
    else if (gameState === STATE.PAUSED) { gameState = STATE.PLAYING; document.getElementById('pause-btn').textContent = '⏸'; }
}

// ============================================
// 아이템 자동 적용 (먹으면 바로 효과, 누적 강화)
// ============================================
function applyItem(itemType) {
    let msg = '';
    switch (itemType.id) {
        case 'SPEED':
            if (powerState.speedLevel < 5) { powerState.speedLevel++; player.speed = 3.5 + powerState.speedLevel * 0.8; }
            msg = `SPEED Lv.${powerState.speedLevel}`;
            break;
        case 'MISSILE':
            if (powerState.missileLevel < 3) powerState.missileLevel++;
            msg = `MISSILE Lv.${powerState.missileLevel}`;
            break;
        case 'BULLET':
            if (powerState.bulletLevel < 5) { powerState.bulletLevel++; player.fireRate = Math.max(5, 10 - powerState.bulletLevel); }
            msg = `POWER Lv.${powerState.bulletLevel}`;
            break;
        case 'LASER':
            if (powerState.laserLevel < 3) powerState.laserLevel++;
            msg = `LASER Lv.${powerState.laserLevel}`;
            break;
        case 'OPTION':
            if (powerState.optionCount < 4) {
                powerState.optionCount++;
                options.push({ x: player.x, y: player.y });
            }
            msg = `OPTION x${powerState.optionCount}`;
            break;
        case 'SHIELD':
            powerState.shieldHP = Math.min(5, powerState.shieldHP + 2);
            msg = `SHIELD +2 (${powerState.shieldHP})`;
            break;
    }
    sfx.powerUp();
    powerUpMessages.push({ text: msg, color: itemType.color, life: 90, x: player.x, y: player.y - 20 });
}

// ============================================
// 웨이브 생성 (스테이지 전환 없이 연속)
// ============================================
let wavePattern = 0, waveSpawnTimer = 0, waveTotalToSpawn = 0, waveSpawned = 0, waveSpawnInterval = 60;
let stageTransitionMsg = 0; // 스테이지 전환 메시지 타이머

function spawnWave() {
    wavePattern = 0; waveSpawned = 0; waveSpawnTimer = 0;
    if (stage % 5 === 0) {
        bossWarningTimer = 90; gameState = STATE.BOSS_WARNING;
        sfx.bossWarning(); waveTotalToSpawn = 0; return;
    }
    waveTotalToSpawn = 8 + stage * 2;
    waveSpawnInterval = Math.max(35, 70 - stage * 2);
    const batchSize = Math.min(4 + Math.floor(stage / 2), waveTotalToSpawn);
    spawnEnemyBatch(batchSize);
    waveSpawned += batchSize;
}

function updateWaveSpawning() {
    if (waveSpawned >= waveTotalToSpawn) return;
    waveSpawnTimer++;
    if (waveSpawnTimer >= waveSpawnInterval) {
        waveSpawnTimer = 0;
        const batchSize = Math.min(4 + Math.floor(stage / 2), waveTotalToSpawn - waveSpawned);
        spawnEnemyBatch(batchSize);
        waveSpawned += batchSize;
    }
}

function spawnEnemyBatch(count) {
    const patterns = ['line', 'sine', 'circle', 'vshape'];
    const pat = patterns[wavePattern % patterns.length];
    wavePattern++;
    for (let i = 0; i < count; i++) {
        let ex = VW + 40 + i * 35, ey = 50 + Math.random() * (VH - 100);
        let type = 'grunt';
        if (Math.random() < 0.1 + stage * 0.02) type = 'mid';
        if (Math.random() < 0.03 + stage * 0.01) type = 'heavy';
        enemies.push(mkEnemy(ex, ey, type, pat, i, count));
    }
}

function mkEnemy(x, y, type, pattern, idx, total) {
    let hp = 1, w = 20, h = 16, pts = 100, speed = 1.5 + stage * 0.08;
    if (type === 'mid') { hp = 1 + Math.floor(stage/4); w = 26; h = 22; pts = 300; speed *= 0.8; }
    if (type === 'heavy') { hp = 2 + Math.floor(stage/3); w = 30; h = 26; pts = 500; speed *= 0.6; }
    return { x, y, width: w, height: h, type, hp, maxHp: hp, alive: true, pts, speed, pattern, idx, total, time: 0, startX: x, startY: y, flashTimer: 0, dropItem: Math.random() < 0.08 };
}

function spawnBoss() {
    const bossHP = 30 + stage * 8;
    const isFinal = stage >= 20;
    boss = { x: VW+60, y: VH/2, targetX: VW-100, width: 70, height: 70, hp: bossHP, maxHp: bossHP, alive: true, phase: 0, phaseTimer: 0, moveDir: 1, moveSpeed: 1.2, attackTimer: 0, flashTimer: 0, isFinal };
    enemies = []; waveTotalToSpawn = 0; waveSpawned = 0;
    gameState = STATE.PLAYING;
    sfx.playBossMusic(isFinal);
}

// ============================================
// 메인 업데이트
// ============================================
function update() {
    frame++;
    stars.forEach(s => { s.x -= s.speed * scrollSpeed; if (s.x < 0) { s.x = VW; s.y = Math.random() * VH; } });
    bgLayers.forEach(p => { p.x -= p.speed * scrollSpeed; if (p.x < -p.r) { p.x = VW + p.r; p.y = Math.random() * VH; } });

    if (gameState === STATE.PAUSED) return;
    if (gameState === STATE.BOSS_WARNING) { bossWarningTimer--; if (bossWarningTimer <= 0) spawnBoss(); return; }
    if (gameState !== STATE.PLAYING) return;
    if (shakeTimer > 0) shakeTimer--;
    if (stageTransitionMsg > 0) stageTransitionMsg--;

    updatePlayer();
    updatePlayerBullets();
    updateWaveSpawning();
    updateEnemies();
    updateEnemyBullets();
    if (boss && boss.alive) updateBoss();
    updateItems();
    updateParticles();
    updateOptions();
    powerUpMessages.forEach(m => { m.y -= 0.6; m.life--; });
    powerUpMessages = powerUpMessages.filter(m => m.life > 0);
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
    if (touchActive) { dx += touchDragX; dy += touchDragY; }
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len > 0) { dx /= len; dy /= len; }
    player.x += dx * player.speed;
    player.y += dy * player.speed;
    player.x = Math.max(20, Math.min(VW - 20, player.x));
    player.y = Math.max(24, Math.min(VH - 40, player.y));
    player.trail.unshift({ x: player.x, y: player.y });
    if (player.trail.length > 200) player.trail.pop();
    player.fireCooldown--;
    if (player.fireCooldown <= 0) { firePlayerBullets(); player.fireCooldown = player.fireRate; }
    if (player.invincible > 0) player.invincible--;
}

// ============================================
// 발사
// ============================================
function firePlayerBullets() {
    const lvl = powerState.bulletLevel;
    const lsr = powerState.laserLevel;
    if (lsr > 0) {
        // 레이저 (레벨에 따라 굵기/길이 증가)
        playerBullets.push({ x: player.x+18, y: player.y, vx: 14, vy: 0, width: 30+lsr*10, height: 1+lsr, type: 'laser', pierce: true });
        sfx.shootLaser();
    } else {
        // 기본탄 (레벨에 따라 발수 증가)
        if (lvl >= 1) playerBullets.push({ x: player.x+18, y: player.y, vx: 10, vy: 0, width: 12, height: 3, type: 'normal' });
        if (lvl >= 2) playerBullets.push({ x: player.x+14, y: player.y-6, vx: 10, vy: -0.5, width: 10, height: 2, type: 'normal' });
        if (lvl >= 3) playerBullets.push({ x: player.x+14, y: player.y+6, vx: 10, vy: 0.5, width: 10, height: 2, type: 'normal' });
        if (lvl >= 4) playerBullets.push({ x: player.x+10, y: player.y-10, vx: 8, vy: -2, width: 10, height: 2, type: 'normal' });
        if (lvl >= 5) playerBullets.push({ x: player.x+10, y: player.y+10, vx: 8, vy: 2, width: 10, height: 2, type: 'normal' });
        sfx.shoot();
    }
    // 미사일
    if (powerState.missileLevel > 0 && frame % (25 - powerState.missileLevel * 5) === 0) {
        playerBullets.push({ x: player.x, y: player.y+10, vx: 2, vy: 4, width: 5, height: 8, type: 'missile' });
        if (powerState.missileLevel >= 2) playerBullets.push({ x: player.x, y: player.y-10, vx: 2, vy: -4, width: 5, height: 8, type: 'missile_up' });
        sfx.shootMissile();
    }
    // 옵션 발사
    options.forEach(opt => {
        if (lsr > 0) playerBullets.push({ x: opt.x+10, y: opt.y, vx: 14, vy: 0, width: 25+lsr*5, height: 1+lsr*0.5, type: 'laser', pierce: true });
        else playerBullets.push({ x: opt.x+10, y: opt.y, vx: 10, vy: 0, width: 10, height: 2, type: 'option_bullet' });
    });
}

function updatePlayerBullets() {
    playerBullets.forEach(b => {
        b.x += b.vx; b.y += b.vy;
        if (b.type === 'missile' && b.y > VH - 30) { b.vy = 0; b.vx = 5; }
        if (b.type === 'missile_up' && b.y < 30) { b.vy = 0; b.vx = 5; }
    });
    playerBullets = playerBullets.filter(b => b.x < VW+50 && b.x > -20 && b.y < VH+20 && b.y > -20);
}

// ============================================
// 옵션 업데이트
// ============================================
function updateOptions() {
    options.forEach((opt, i) => {
        const delay = (i + 1) * 16;
        if (player.trail.length > delay) {
            const t = player.trail[delay];
            opt.x += (t.x - opt.x) * 0.25;
            opt.y += (t.y - opt.y) * 0.25;
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
        switch (e.pattern) {
            case 'line': e.x -= e.speed; break;
            case 'sine': e.x -= e.speed; e.y = e.startY + Math.sin(e.time * 0.05) * 55; break;
            case 'circle': e.x -= e.speed * 0.7; e.y = e.startY + Math.sin(e.time * 0.04 + e.idx) * 40; break;
            case 'vshape': e.x -= e.speed; e.y = e.startY + (e.idx - e.total/2) * 6 * Math.sin(e.time * 0.03); break;
        }
        if (e.x < -50) e.alive = false;
        if (e.time > 60 && Math.random() < 0.003 + stage * 0.0008) {
            const a = Math.atan2(player.y - e.y, player.x - e.x);
            enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a)*(2.5+stage*0.1), vy: Math.sin(a)*(2.5+stage*0.1), size: 4 });
        }
    });
}

// ============================================
// 보스 업데이트
// ============================================
function updateBoss() {
    const b = boss;
    if (b.x > b.targetX) { b.x -= 1.5; return; }
    b.phaseTimer++; if (b.flashTimer > 0) b.flashTimer--;
    b.y += b.moveSpeed * b.moveDir;
    if (b.y < 80 || b.y > VH - 80) b.moveDir *= -1;
    const hpRatio = b.hp / b.maxHp;
    b.attackTimer++;
    if (hpRatio > 0.6) {
        if (b.attackTimer % 45 === 0) {
            enemyBullets.push({ x: b.x-40, y: b.y, vx: -4, vy: 0, size: 5 });
            enemyBullets.push({ x: b.x-40, y: b.y-15, vx: -3.5, vy: -0.8, size: 4 });
            enemyBullets.push({ x: b.x-40, y: b.y+15, vx: -3.5, vy: 0.8, size: 4 });
        }
    } else if (hpRatio > 0.3) {
        if (b.attackTimer % 50 === 0) { for (let i=-2;i<=2;i++) { const a=Math.PI+i*0.2; enemyBullets.push({x:b.x-35,y:b.y,vx:Math.cos(a)*3.5,vy:Math.sin(a)*3.5,size:4}); } }
        b.moveSpeed = 1.5;
    } else {
        if (b.attackTimer % 35 === 0) { for (let i=0;i<8;i++) { const a=(Math.PI*2/8)*i+b.phaseTimer*0.03; enemyBullets.push({x:b.x,y:b.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,size:3}); } }
        b.moveSpeed = 2.0;
    }
}

function updateEnemyBullets() {
    enemyBullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
    enemyBullets = enemyBullets.filter(b => b.x > -20 && b.x < VW+20 && b.y > -20 && b.y < VH+20);
}
function updateItems() { items.forEach(it => { it.x -= 1.2; it.time++; }); items = items.filter(it => it.x > -30); }
function updateParticles() { particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life--; }); particles = particles.filter(p => p.life > 0); }

// ============================================
// 충돌
// ============================================
function checkCollisions() {
    playerBullets.forEach(b => {
        if (boss && boss.alive && hitTest(b, boss)) {
            if (!b.pierce) b.x = VW+100;
            boss.hp--; boss.flashTimer = 8; sfx.hitEnemy();
            createExplosion(b.x, b.y, '#fff', 3);
            if (boss.hp <= 0) {
                boss.alive = false; score += 10000+stage*2000; totalKills++;
                sfx.explodeBoss(); shakeTimer = 30; shakeIntensity = 12;
                for (let i=0;i<50;i++) createExplosion(boss.x+(Math.random()-0.5)*80, boss.y+(Math.random()-0.5)*80, `hsl(${Math.random()*360},100%,60%)`, 4);
                damageNumbers.push({x:boss.x,y:boss.y,text:`BOSS +${10000+stage*2000}`,life:60,color:'#f0f'});
                // 보스 처치 시 아이템 3개 드롭
                for (let i=0;i<3;i++) dropItem(boss.x+(Math.random()-0.5)*60, boss.y+(Math.random()-0.5)*40);
            }
        }
        enemies.forEach(e => {
            if (!e.alive) return;
            if (hitTest(b, e)) {
                if (!b.pierce) b.x = VW+100;
                e.hp--; e.flashTimer = 5;
                if (e.hp <= 0) {
                    e.alive = false; player.combo++; totalKills++;
                    if (player.combo > maxCombo) maxCombo = player.combo;
                    const bonus = Math.min(player.combo, 8);
                    const pts = e.pts * bonus; score += pts;
                    createExplosion(e.x, e.y, getEnemyColor(e.type), 10);
                    sfx.explodeEnemy();
                    if (player.combo > 1) sfx.combo(player.combo);
                    damageNumbers.push({x:e.x,y:e.y,text:pts.toString(),life:30,color:'#ff0'});
                    if (e.dropItem) dropItem(e.x, e.y);
                } else { sfx.hitEnemy(); }
            }
        });
    });
    // 적 총알 vs 플레이어
    if (player.alive && player.invincible <= 0) {
        enemyBullets.forEach(b => {
            if (Math.sqrt((b.x-player.x)**2+(b.y-player.y)**2) < 13) { b.x = -100; playerHit(); }
        });
        enemies.forEach(e => {
            if (!e.alive) return;
            if (hitTest(player, e)) { e.alive = false; createExplosion(e.x,e.y,'#f80',8); playerHit(); }
        });
    }
    // 아이템 획득 (넓은 판정)
    for (let i = items.length-1; i >= 0; i--) {
        const it = items[i];
        if (Math.abs(it.x - player.x) < 24 && Math.abs(it.y - player.y) < 20) {
            items.splice(i, 1);
            applyItem(it.itemType);
            createExplosion(it.x, it.y, it.itemType.color, 6);
        }
    }
}

function dropItem(x, y) {
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    items.push({ x, y, width: 20, height: 20, time: 0, itemType: type });
}

function hitTest(a, b) { return Math.abs(a.x-b.x) < (a.width+b.width)/2 && Math.abs(a.y-b.y) < (a.height+b.height)/2; }
function getEnemyColor(type) { return type === 'heavy' ? '#f0f' : type === 'mid' ? '#f80' : '#4f4'; }
function createExplosion(x, y, color, count=10) {
    for (let i=0;i<count;i++) { const a=(Math.PI*2/count)*i+Math.random()*0.3, sp=Math.random()*3+1; particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:25+Math.random()*15,maxLife:40,color,size:Math.random()*3+1.5}); }
}

function playerHit() {
    if (powerState.shieldHP > 0) {
        powerState.shieldHP--; shakeTimer = 5; shakeIntensity = 3;
        createExplosion(player.x, player.y, '#08f', 6); sfx.shieldBlock(); return;
    }
    lives--; player.combo = 0; shakeTimer = 15; shakeIntensity = 8;
    createExplosion(player.x, player.y, '#0ff', 20); sfx.playerHit();
    if (lives <= 0) {
        player.alive = false; gameState = STATE.GAMEOVER; sfx.stopBGM();
        if (score > highScore) { highScore = score; localStorage.setItem('gradiusHigh', highScore.toString()); }
        sfx.playGameOverMusic();
        setTimeout(() => showScoreScreen(), 1500);
    } else {
        player.invincible = 180;
        // 파워 1단계 다운 (전부 리셋 아님)
        if (powerState.bulletLevel > 1) powerState.bulletLevel--;
        if (powerState.missileLevel > 0) powerState.missileLevel--;
        if (powerState.laserLevel > 0) powerState.laserLevel--;
        if (powerState.speedLevel > 0) { powerState.speedLevel--; player.speed = 3.5 + powerState.speedLevel * 0.8; }
        player.fireRate = Math.max(5, 10 - powerState.bulletLevel);
    }
}

// 스테이지 클리어 → 멈추지 않고 바로 다음 스테이지
function checkWaveClear() {
    if (waveSpawned < waveTotalToSpawn) return;
    const allDead = enemies.filter(e => e.alive).length === 0 && (!boss || !boss.alive);
    if (!allDead) return;
    if (boss && !boss.alive) boss = null;
    // 바로 다음 스테이지로 (멈춤 없음)
    stage++;
    score += (stage - 1) * 2000;
    stageTransitionMsg = 120; // 2초간 "STAGE X" 표시
    sfx.stageClear();
    // BGM 변경
    if (stage % 5 !== 0) sfx.playStageMusic(stage);
    spawnWave();
}

// ============================================
// 렌더링
// ============================================
function render() {
    const scX = W/VW, scY = H/VH;
    ctx.save(); ctx.scale(scX, scY);
    if (shakeTimer > 0) ctx.translate((Math.random()-0.5)*shakeIntensity, (Math.random()-0.5)*shakeIntensity);
    // 배경
    ctx.fillStyle = '#020210'; ctx.fillRect(0, 0, VW, VH);
    bgLayers.forEach(p => { const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r); g.addColorStop(0,p.color); g.addColorStop(1,'transparent'); ctx.fillStyle=g; ctx.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2); });
    stars.forEach(s => { ctx.fillStyle=`rgba(200,220,255,${0.4+s.speed*0.3})`; ctx.fillRect(s.x,s.y,s.size,s.size*0.5); });

    if (gameState === STATE.PLAYING || gameState === STATE.GAMEOVER || gameState === STATE.PAUSED) renderGame();
    if (gameState === STATE.BOSS_WARNING) renderBossWarning();
    if (gameState === STATE.PAUSED) renderPause();
    ctx.restore();
}

function renderBossWarning() {
    const alpha = Math.sin(frame*0.2)*0.3+0.7;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f00'; ctx.font = 'bold 28px "Courier New"'; ctx.textAlign = 'center';
    ctx.shadowColor = '#f00'; ctx.shadowBlur = 20;
    ctx.fillText('⚠ WARNING ⚠', VW/2, VH/2-10);
    ctx.font = '16px "Courier New"'; ctx.fillStyle = '#ff0';
    ctx.fillText('BOSS APPROACHING', VW/2, VH/2+20);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1; drawHUD();
}

function renderPause() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VW/2, VH/2);
    ctx.font = '12px "Courier New"'; ctx.fillStyle = '#aaa';
    ctx.fillText('Press P to resume', VW/2, VH/2+25);
}

function renderGame() {
    // 플레이어 총알
    playerBullets.forEach(b => {
        if (b.type === 'laser') {
            ctx.shadowColor = '#0ff'; ctx.shadowBlur = 6;
            const lg = ctx.createLinearGradient(b.x-b.width/2,b.y,b.x+b.width/2,b.y);
            lg.addColorStop(0,'#fff'); lg.addColorStop(0.5,'#0ef'); lg.addColorStop(1,'#06a');
            ctx.fillStyle = lg; ctx.fillRect(b.x-b.width/2, b.y-b.height/2, b.width, b.height);
            ctx.shadowBlur = 0;
        } else if (b.type === 'missile' || b.type === 'missile_up') {
            ctx.fillStyle = '#f80';
            ctx.beginPath(); ctx.moveTo(b.x+3,b.y); ctx.lineTo(b.x-3,b.y-3); ctx.lineTo(b.x-3,b.y+3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,200,100,0.4)'; ctx.beginPath(); ctx.arc(b.x-4,b.y,2,0,Math.PI*2); ctx.fill();
        } else {
            ctx.shadowColor = '#0ff'; ctx.shadowBlur = 3;
            ctx.fillStyle = '#0ef'; ctx.fillRect(b.x-b.width/2, b.y-1.5, b.width, 3);
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
        const grad = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.size);
        grad.addColorStop(0,'#fff'); grad.addColorStop(0.5,'#f84'); grad.addColorStop(1,'rgba(255,0,0,0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(b.x,b.y,b.size+1,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    });

    // 아이템 (크고 눈에 띄게 - 깜빡이는 캡슐)
    items.forEach(it => {
        const bob = Math.sin(it.time * 0.12) * 3;
        const blink = Math.sin(it.time * 0.2) * 0.3 + 0.7;
        ctx.save(); ctx.translate(it.x, it.y + bob);
        ctx.globalAlpha = blink;
        // 큰 빛나는 원형 배경
        ctx.shadowColor = it.itemType.color; ctx.shadowBlur = 12;
        ctx.fillStyle = '#000'; ctx.strokeStyle = it.itemType.color; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // 내부 색상 채움
        ctx.fillStyle = it.itemType.color + '44';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
        // 글자 (크게)
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.itemType.label, 0, 1);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
    });

    // 옵션 (분신) - 밝은 오렌지 구체
    options.forEach((opt, i) => {
        ctx.save(); ctx.translate(opt.x, opt.y);
        ctx.shadowColor = '#f80'; ctx.shadowBlur = 10;
        const g = ctx.createRadialGradient(0,0,0,0,0,8);
        g.addColorStop(0,'#fff'); g.addColorStop(0.4,'#fa0'); g.addColorStop(1,'#840');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.restore();
    });

    // 플레이어
    if (player.alive && (player.invincible <= 0 || Math.floor(frame/3)%2 === 0)) drawPlayer();
    // 실드
    if (powerState.shieldHP > 0) {
        ctx.strokeStyle = `rgba(0,180,255,${0.5+Math.sin(frame*0.1)*0.2})`;
        ctx.lineWidth = 2.5; ctx.shadowColor = '#08f'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.ellipse(player.x-2, player.y, 22, 16, 0, 0, Math.PI*2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // 파티클
    particles.forEach(p => { ctx.globalAlpha=p.life/(p.maxLife||40); ctx.fillStyle=p.color; ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size); });
    ctx.globalAlpha = 1;

    // 데미지 넘버
    damageNumbers.forEach(d => { ctx.globalAlpha=Math.min(1,d.life/20); ctx.fillStyle=d.color; ctx.font='bold 11px "Courier New"'; ctx.textAlign='center'; ctx.fillText(d.text,d.x,d.y); });
    ctx.globalAlpha = 1;

    // 파워업 메시지 (화면 중앙 상단에 표시)
    powerUpMessages.forEach(m => {
        ctx.globalAlpha = Math.min(1, m.life / 30);
        ctx.fillStyle = m.color; ctx.font = 'bold 13px "Courier New"'; ctx.textAlign = 'center';
        ctx.shadowColor = m.color; ctx.shadowBlur = 6;
        ctx.fillText(m.text, m.x, m.y);
        ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // 스테이지 전환 메시지 (멈추지 않고 표시만)
    if (stageTransitionMsg > 0) {
        const alpha = stageTransitionMsg > 90 ? (120 - stageTransitionMsg) / 30 : Math.min(1, stageTransitionMsg / 30);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff0'; ctx.font = 'bold 22px "Courier New"'; ctx.textAlign = 'center';
        ctx.shadowColor = '#ff0'; ctx.shadowBlur = 10;
        ctx.fillText(`STAGE ${stage}`, VW/2, VH/2 - 30);
        ctx.font = '12px "Courier New"'; ctx.fillStyle = '#0ff';
        ctx.fillText(`+${(stage-1)*2000}`, VW/2, VH/2);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    drawHUD();
    drawPowerStatus();
}

// ============================================
// 플레이어 그리기 (만화풍 빅바이퍼)
// ============================================
function drawPlayer() {
    ctx.save(); ctx.translate(player.x, player.y);

    // 엔진 불꽃 (만화풍 - 밝고 역동적)
    const fLen = 12 + Math.random() * 8;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-18-fLen*0.3, 0); ctx.lineTo(-18, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4cf';
    ctx.beginPath(); ctx.moveTo(-18, -4); ctx.lineTo(-18-fLen, 0); ctx.lineTo(-18, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,100,255,0.4)';
    ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-16-fLen*0.7, 0); ctx.lineTo(-16, 6); ctx.closePath(); ctx.fill();

    // 본체 (만화풍 - 둥글고 볼륨감 있는 빅바이퍼)
    // 메인 바디 (그라데이션)
    const bodyGrad = ctx.createLinearGradient(0, -10, 0, 10);
    bodyGrad.addColorStop(0, '#4488cc'); bodyGrad.addColorStop(0.3, '#ffffff');
    bodyGrad.addColorStop(0.5, '#ddeeff'); bodyGrad.addColorStop(1, '#224488');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.quadraticCurveTo(16, -7, 6, -8);
    ctx.quadraticCurveTo(-4, -9, -16, -5);
    ctx.lineTo(-18, -3); ctx.lineTo(-18, 3);
    ctx.quadraticCurveTo(-4, 9, 6, 8);
    ctx.quadraticCurveTo(16, 7, 20, 0);
    ctx.closePath(); ctx.fill();

    // 외곽선 (만화풍 두꺼운 라인)
    ctx.strokeStyle = '#113366'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.quadraticCurveTo(16, -7, 6, -8);
    ctx.quadraticCurveTo(-4, -9, -16, -5);
    ctx.lineTo(-18, -3); ctx.lineTo(-18, 3);
    ctx.quadraticCurveTo(-4, 9, 6, 8);
    ctx.quadraticCurveTo(16, 7, 20, 0);
    ctx.closePath(); ctx.stroke();

    // 날개 (상)
    const wingGrad = ctx.createLinearGradient(0, -8, 0, -18);
    wingGrad.addColorStop(0, '#3366aa'); wingGrad.addColorStop(1, '#112244');
    ctx.fillStyle = wingGrad;
    ctx.beginPath(); ctx.moveTo(2, -8); ctx.lineTo(-6, -18); ctx.lineTo(-14, -16); ctx.lineTo(-10, -8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#113366'; ctx.lineWidth = 1.2; ctx.stroke();
    // 날개 (하)
    ctx.fillStyle = wingGrad;
    ctx.beginPath(); ctx.moveTo(2, 8); ctx.lineTo(-6, 18); ctx.lineTo(-14, 16); ctx.lineTo(-10, 8); ctx.closePath(); ctx.fill();
    ctx.stroke();

    // 콕핏 (밝은 하이라이트)
    const cockpitGrad = ctx.createRadialGradient(8, -2, 0, 8, -2, 5);
    cockpitGrad.addColorStop(0, '#ffffff'); cockpitGrad.addColorStop(0.5, '#88ddff');
    cockpitGrad.addColorStop(1, '#2266aa');
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath(); ctx.ellipse(8, -1, 5, 3, -0.1, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#1155aa'; ctx.lineWidth = 0.8; ctx.stroke();

    // 기수 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.ellipse(14, -3, 4, 1.5, -0.3, 0, Math.PI*2); ctx.fill();

    // 날개팁 에너지 (파워 레벨 표시)
    if (powerState.bulletLevel >= 3 || powerState.laserLevel >= 1) {
        ctx.fillStyle = `hsl(${frame*4%360},100%,70%)`;
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(-6, -18, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-6, 18, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

// ============================================
// 적 그리기 (만화풍)
// ============================================
// 적 그리기 (동물 아이콘)
// ============================================
const ENEMY_ANIMALS = {
    grunt: ['🐛', '🦟', '🐝', '🪲', '🦗', '🐜'],
    mid: ['🦇', '🦅', '🦉', '🐍', '🦂', '🕷️'],
    heavy: ['🐉', '🦖', '🐊', '🦈', '🐙', '🦑']
};

function drawEnemy(e) {
    ctx.save(); ctx.translate(e.x, e.y);
    const flash = e.flashTimer > 0;
    const animals = ENEMY_ANIMALS[e.type] || ENEMY_ANIMALS.grunt;
    const animalIdx = (e.idx || 0) % animals.length;
    const emoji = animals[animalIdx];
    const size = e.type === 'heavy' ? 26 : e.type === 'mid' ? 22 : 18;

    // 피격 시 흰색 배경 플래시
    if (flash) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2); ctx.fill();
    }

    // 동물 이모지
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 2);

    // HP바 (대형/중형만)
    if (e.maxHp > 1) {
        const barW = size * 0.8;
        ctx.fillStyle = '#333'; ctx.fillRect(-barW/2, size*0.55, barW, 3);
        ctx.fillStyle = e.type === 'heavy' ? '#f0f' : '#f80';
        ctx.fillRect(-barW/2, size*0.55, barW * (e.hp / e.maxHp), 3);
    }
    ctx.restore();
}

// ============================================
// 보스 그리기 (스테이지마다 다른 보스)
// ============================================
const BOSS_DESIGNS = [
    { emoji: '🐲', name: 'DRAGON', bodyColor: '#440000', coreColor: '#ff4400', lineColor: '#ff6600' },
    { emoji: '👾', name: 'ALIEN', bodyColor: '#002244', coreColor: '#00ffff', lineColor: '#0088ff' },
    { emoji: '🤖', name: 'MECHA', bodyColor: '#222222', coreColor: '#ffff00', lineColor: '#888888' },
    { emoji: '👹', name: 'DEMON', bodyColor: '#330022', coreColor: '#ff00ff', lineColor: '#aa0066' },
    { emoji: '🦑', name: 'KRAKEN', bodyColor: '#001133', coreColor: '#44ffaa', lineColor: '#006644' },
    { emoji: '💀', name: 'DEATH', bodyColor: '#111111', coreColor: '#ffffff', lineColor: '#444444' },
    { emoji: '🐺', name: 'FENRIR', bodyColor: '#1a1a2a', coreColor: '#8888ff', lineColor: '#4444aa' },
    { emoji: '🦁', name: 'BEAST', bodyColor: '#2a1a00', coreColor: '#ffaa00', lineColor: '#885500' }
];

function drawBoss() {
    const b = boss; ctx.save(); ctx.translate(b.x, b.y);
    const pulse = Math.sin(frame * 0.04) * 0.03 + 1, flash = b.flashTimer > 0;
    ctx.scale(pulse, pulse);

    const designIdx = (Math.floor(stage / 5) - 1) % BOSS_DESIGNS.length;
    const design = BOSS_DESIGNS[designIdx >= 0 ? designIdx : 0];

    // 메인 바디
    const bodyG = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
    bodyG.addColorStop(0, flash ? '#555' : design.bodyColor);
    bodyG.addColorStop(0.8, flash ? '#222' : '#000');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(-50, 0); ctx.quadraticCurveTo(-45, -35, -20, -40);
    ctx.quadraticCurveTo(10, -38, 40, -20); ctx.quadraticCurveTo(55, -5, 50, 0);
    ctx.quadraticCurveTo(55, 5, 40, 20); ctx.quadraticCurveTo(10, 38, -20, 40);
    ctx.quadraticCurveTo(-45, 35, -50, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = flash ? '#f44' : design.lineColor; ctx.lineWidth = 2.5; ctx.stroke();

    // 장갑 디테일
    ctx.strokeStyle = flash ? '#f88' : design.lineColor + '88'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-35, -25); ctx.lineTo(-15, -15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-35, 25); ctx.lineTo(-15, 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, -15); ctx.lineTo(15, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 15); ctx.lineTo(15, 8); ctx.stroke();

    // 보스 이모지 (중앙에 크게)
    ctx.font = '36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(design.emoji, 0, 0);

    // 코어 글로우
    ctx.shadowColor = flash ? '#f00' : design.coreColor; ctx.shadowBlur = 15;
    ctx.strokeStyle = design.coreColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // 에너지 링
    ctx.strokeStyle = `${design.coreColor}44`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 45, 25, frame * 0.01, 0, Math.PI * 2); ctx.stroke();

    // 포대
    ctx.fillStyle = '#333'; ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
    [[-52, -8, 14, 6], [-52, 2, 14, 6], [32, -18, 12, 5], [32, 13, 12, 5]].forEach(([rx, ry, rw, rh]) => {
        ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh);
    });

    // 보스 이름
    ctx.fillStyle = design.coreColor; ctx.font = 'bold 9px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(design.name, 0, -48);

    // HP바
    ctx.fillStyle = '#111'; ctx.fillRect(-40, 52, 80, 6);
    const hpR = b.hp / b.maxHp;
    ctx.fillStyle = hpR > 0.5 ? '#0f0' : hpR > 0.25 ? '#ff0' : '#f00';
    ctx.fillRect(-40, 52, 80 * hpR, 6);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.strokeRect(-40, 52, 80, 6);

    ctx.restore();
}

// ============================================
// HUD
// ============================================
function drawHUD() {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${score.toString().padStart(8,'0')}`, 8, 16);
    ctx.textAlign = 'center'; ctx.fillStyle = '#aaa';
    ctx.fillText(`HIGH ${highScore.toString().padStart(8,'0')}`, VW/2, 16);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ff0';
    ctx.fillText(`STAGE ${stage}`, VW-8, 16);
    // 라이프
    for (let i=0;i<lives;i++) { ctx.fillStyle='#0cf'; ctx.beginPath(); ctx.moveTo(18+i*18,VH-8); ctx.lineTo(12+i*18,VH-2); ctx.lineTo(24+i*18,VH-2); ctx.closePath(); ctx.fill(); }
    // 콤보
    if (player.combo > 1) { ctx.textAlign='center'; ctx.fillStyle=`hsl(${frame*5%360},100%,70%)`; ctx.font='bold 12px "Courier New"'; ctx.fillText(`${player.combo} COMBO!`,VW/2,32); }
    if (boss && boss.alive) { ctx.textAlign='center'; ctx.fillStyle='#f44'; ctx.font='bold 10px "Courier New"'; ctx.fillText('★ BOSS BATTLE ★',VW/2,44); }
}

// ============================================
// 파워 상태 표시 (우측 하단)
// ============================================
function drawPowerStatus() {
    const sx = VW - 130, sy = VH - 55;
    ctx.fillStyle = 'rgba(0,0,20,0.7)'; ctx.fillRect(sx-4, sy-2, 128, 50);
    ctx.strokeStyle = '#335'; ctx.lineWidth = 1; ctx.strokeRect(sx-4, sy-2, 128, 50);
    ctx.font = '9px "Courier New"'; ctx.textAlign = 'left';
    const stats = [
        { label: 'SPD', level: powerState.speedLevel, max: 5, color: '#0f0' },
        { label: 'POW', level: powerState.bulletLevel-1, max: 4, color: '#0ff' },
        { label: 'MSL', level: powerState.missileLevel, max: 3, color: '#f80' },
        { label: 'LSR', level: powerState.laserLevel, max: 3, color: '#f0f' },
        { label: 'OPT', level: powerState.optionCount, max: 4, color: '#ff0' },
        { label: 'SLD', level: powerState.shieldHP, max: 5, color: '#48f' }
    ];
    stats.forEach((s, i) => {
        const x = sx + (i % 3) * 42;
        const y = sy + Math.floor(i / 3) * 22;
        ctx.fillStyle = '#888'; ctx.fillText(s.label, x, y + 8);
        for (let j = 0; j < s.max; j++) {
            ctx.fillStyle = j < s.level ? s.color : '#222';
            ctx.fillRect(x + j * 8, y + 11, 6, 4);
        }
    });
}

// ============================================
// 스코어보드
// ============================================
const BLOB_URL = 'https://jsonblob.com/api/jsonBlob';
let onlineBlobId = localStorage.getItem('gradiusBlobId') || '';
function getToday() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function getLocalScores() { try { return JSON.parse(localStorage.getItem('gradiusScores')||'[]'); } catch { return []; } }
function saveLocalScores(s) { localStorage.setItem('gradiusScores', JSON.stringify(s)); }

async function fetchOnlineScores() {
    if (!onlineBlobId) return null;
    try { const res = await fetch(`${BLOB_URL}/${onlineBlobId}`, {headers:{'Content-Type':'application/json','Accept':'application/json'}}); if (res.ok) { const d=await res.json(); return d.scores||[]; } } catch(e) {}
    return null;
}
async function pushOnlineScore(entry) {
    try {
        let scores = await fetchOnlineScores(); if (!scores) scores = getLocalScores();
        scores.push(entry); scores.sort((a,b)=>b.score-a.score); if (scores.length>200) scores.length=200;
        const body = JSON.stringify({scores});
        if (!onlineBlobId) { const res=await fetch(BLOB_URL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body}); if(res.ok){const loc=res.headers.get('Location')||res.headers.get('location');if(loc){onlineBlobId=loc.split('/').pop();localStorage.setItem('gradiusBlobId',onlineBlobId);}} }
        else { await fetch(`${BLOB_URL}/${onlineBlobId}`,{method:'PUT',headers:{'Content-Type':'application/json','Accept':'application/json'},body}); }
        return scores;
    } catch(e) { return null; }
}

function showScoreScreen() {
    const el=document.getElementById('score-screen');
    document.getElementById('final-score').textContent=`SCORE: ${score.toLocaleString()} | STAGE ${stage} | KILLS ${totalKills} | MAX COMBO ${maxCombo}`;
    document.getElementById('name-input-area').style.display='block';
    document.getElementById('player-name').value=localStorage.getItem('gradiusLastName')||'';
    renderLeaderboards(); el.style.display='block';
    setTimeout(()=>document.getElementById('player-name').focus(),100);
}
function hideScoreScreen() { document.getElementById('score-screen').style.display='none'; }

async function saveScore() {
    const name=document.getElementById('player-name').value.trim()||'???';
    localStorage.setItem('gradiusLastName',name);
    const entry={name,score,stage,kills:totalKills,combo:maxCombo,date:getToday()};
    const local=getLocalScores(); local.push(entry); local.sort((a,b)=>b.score-a.score); if(local.length>200)local.length=200; saveLocalScores(local);
    document.getElementById('name-input-area').style.display='none';
    const online=await pushOnlineScore(entry); if(online) saveLocalScores(online);
    renderLeaderboards();
}
async function renderLeaderboards() {
    const today=getToday(); let scores=await fetchOnlineScores(); if(!scores) scores=getLocalScores(); else saveLocalScores(scores);
    const todayS=scores.filter(s=>s.date===today).sort((a,b)=>b.score-a.score).slice(0,20);
    const allS=[...scores].sort((a,b)=>b.score-a.score).slice(0,20);
    document.getElementById('today-scores').innerHTML=todayS.length===0?'<span style="color:#666">기록 없음</span>':todayS.map((s,i)=>`<div style="color:${i===0?'#ff0':'#ccc'}">${i+1}. ${s.name} ${s.score.toLocaleString()} (S${s.stage})</div>`).join('');
    document.getElementById('all-scores').innerHTML=allS.length===0?'<span style="color:#666">기록 없음</span>':allS.map((s,i)=>`<div style="color:${i===0?'#ff0':'#ccc'}">${i+1}. ${s.name} ${s.score.toLocaleString()} (S${s.stage})</div>`).join('');
}
async function showTitleScores() {
    let scores=await fetchOnlineScores(); if(!scores) scores=getLocalScores();
    const top5=[...scores].sort((a,b)=>b.score-a.score).slice(0,5);
    const el=document.getElementById('title-scores');
    if(el) el.innerHTML=top5.length===0?'':'<div style="margin-top:10px;color:#f80;font-size:11px;">🏆 TOP SCORES</div>'+top5.map((s,i)=>`<div style="color:${i===0?'#ff0':'#aaa'};font-size:11px;">${i+1}. ${s.name} - ${s.score.toLocaleString()}</div>`).join('');
}

// ============================================
// 유틸리티 & 게임 루프
// ============================================
function toggleMute() { const m=sfx.toggleMute(); document.getElementById('mute-btn').textContent=m?'🔇':'🔊'; }
document.getElementById('player-name').addEventListener('keydown', e => { if(e.code==='Enter'){e.preventDefault();saveScore();} });

function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }
uiOverlay.style.display = 'block';
showTitleScores();
gameLoop();
