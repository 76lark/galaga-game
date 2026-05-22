// ============================================
// GALAGA - Enhanced HTML5 Canvas Game
// 자동 발사 + 아이템 + 모바일 터치 지원
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiOverlay = document.getElementById('ui-overlay');
const touchControls = document.getElementById('touch-controls');

// 반응형 캔버스 크기
let W, H;
function resizeCanvas() {
    const ratio = 480 / 700;
    if (window.innerWidth / window.innerHeight < ratio) {
        W = window.innerWidth;
        H = W / ratio;
    } else {
        H = window.innerHeight;
        W = H * ratio;
    }
    canvas.width = W;
    canvas.height = H;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 모바일 감지
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
if (isMobile) {
    touchControls.style.display = 'flex';
}

// 게임 상태
const STATE = { TITLE: 0, PLAYING: 1, GAMEOVER: 2, STAGE_CLEAR: 3 };
let gameState = STATE.TITLE;
let score = 0;
let highScore = parseInt(localStorage.getItem('galagaHigh') || '0');
let lives = 3;
let stage = 1;
let frame = 0;
let shakeTimer = 0;
let shakeIntensity = 0;
let stageClearTimer = 0;
let stageClearFireworks = [];

// 스케일 팩터
function sx(v) { return v * (W / 480); }
function sy(v) { return v * (H / 700); }

// ============================================
// 입력 처리
// ============================================
const keys = {};
let touchLeft = false;
let touchRight = false;

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        // 이름 입력 중이면 무시
        if (document.activeElement === document.getElementById('player-name')) return;
        e.preventDefault();
        if (gameState === STATE.TITLE || gameState === STATE.GAMEOVER) startGame();
    }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// 터치 이동 (화면 좌우 절반 터치)
canvas.addEventListener('touchstart', handleTouch, { passive: false });
canvas.addEventListener('touchmove', handleTouch, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

function handleTouch(e) {
    e.preventDefault();
    if (gameState === STATE.TITLE) { startGame(); return; }
    if (gameState === STATE.GAMEOVER) {
        // 점수 저장 후에만 재시작 가능
        if (document.getElementById('name-input-area').style.display === 'none') {
            startGame();
        }
        return;
    }
    if (gameState !== STATE.PLAYING) return;
    touchLeft = false; touchRight = false;
    for (let t of e.touches) {
        const rect = canvas.getBoundingClientRect();
        const x = t.clientX - rect.left;
        if (x < W / 2) touchLeft = true;
        else touchRight = true;
    }
}
function handleTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length === 0) { touchLeft = false; touchRight = false; }
    else { handleTouch(e); }
}

// 버튼 터치
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); touchLeft = true; });
btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); touchLeft = false; });
btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); touchRight = true; });
btnRight.addEventListener('touchend', (e) => { e.preventDefault(); touchRight = false; });

// ============================================
// 플레이어
// ============================================
const player = {
    x: 0, y: 0,
    width: 32, height: 32,
    speed: 5,
    fireRate: 12,  // 자동 발사 간격 (프레임)
    fireCooldown: 0,
    bulletLevel: 1, // 1~5 레벨
    shieldHP: 0,
    invincible: 0,
    alive: true,
    combo: 0,
    maxCombo: 0
};

// ============================================
// 게임 오브젝트 배열
// ============================================
let playerBullets = [];
let enemyBullets = [];
let enemies = [];
let items = [];
let particles = [];
let bgParticles = [];
let damageNumbers = [];
let enemyFormation = { offsetX: 0, dir: 1, speed: 0.3 };

// ============================================
// 아이템 종류
// ============================================
const ITEM_TYPES = {
    POWER_UP: { color: '#f80', label: 'P', desc: '파워업' },
    SPEED_UP: { color: '#0f0', label: 'S', desc: '스피드업' },
    SHIELD: { color: '#08f', label: '🛡', desc: '실드' },
    LIFE: { color: '#f0f', label: '♥', desc: '1UP' }
};

// ============================================
// 별 배경
// ============================================
let stars = [];
function initStars() {
    stars = [];
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * 480,
            y: Math.random() * 700,
            speed: Math.random() * 2 + 0.3,
            size: Math.random() * 2 + 0.5,
            twinkle: Math.random() * Math.PI * 2
        });
    }
}
initStars();

// 배경 네뷸라 파티클
function initBgParticles() {
    bgParticles = [];
    for (let i = 0; i < 20; i++) {
        bgParticles.push({
            x: Math.random() * 480,
            y: Math.random() * 700,
            radius: Math.random() * 60 + 30,
            color: `hsla(${Math.random() * 360}, 70%, 30%, 0.03)`,
            speed: Math.random() * 0.3 + 0.1
        });
    }
}
initBgParticles();

// ============================================
// 게임 시작
// ============================================
function startGame() {
    sfx.init();
    sfx.resume();
    sfx.gameStart();
    gameState = STATE.PLAYING;
    uiOverlay.style.display = 'none';
    hideScoreScreen();
    score = 0;
    lives = 3;
    stage = 1;
    frame = 0;
    player.x = 240;
    player.y = 620;
    player.alive = true;
    player.invincible = 60;
    player.bulletLevel = 1;
    player.speed = 5;
    player.fireRate = 12;
    player.shieldHP = 0;
    player.combo = 0;
    playerBullets = [];
    enemyBullets = [];
    items = [];
    particles = [];
    damageNumbers = [];
    spawnWave();
}

// ============================================
// 적 웨이브 생성
// ============================================
function spawnWave() {
    enemies = [];
    enemyFormation = { offsetX: 0, dir: 1, speed: 0.3 + stage * 0.08 };

    const cols = Math.min(8, 6 + Math.floor(stage / 3));
    const startX = (480 - (cols - 1) * 48) / 2;

    // 보스 줄
    for (let c = 0; c < cols; c++) {
        enemies.push(createEnemy(startX + c * 48, 70, 'boss'));
    }
    // 중간 2줄
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < cols; c++) {
            enemies.push(createEnemy(startX + c * 48, 115 + r * 38, 'mid'));
        }
    }
    // 졸개 2줄
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < cols; c++) {
            enemies.push(createEnemy(startX + c * 48, 195 + r * 38, 'grunt'));
        }
    }
}

function createEnemy(bx, by, type) {
    let hp = 1, w = 22, h = 22, pts = 100;
    if (type === 'boss') { hp = 2 + Math.floor(stage / 3); w = 30; h = 30; pts = 400; }
    else if (type === 'mid') { hp = 1 + Math.floor(stage / 4); w = 26; h = 26; pts = 200; }
    return {
        x: bx, y: by, baseX: bx, baseY: by,
        width: w, height: h, type, hp, maxHp: hp,
        alive: true, pts,
        diving: false, diveTime: 0, diveSpeed: 0,
        enterTime: Math.random() * 60,
        entered: false,
        flashTimer: 0
    };
}

// ============================================
// 아이템 드롭
// ============================================
function dropItem(x, y) {
    const rand = Math.random();
    let type;
    if (rand < 0.40) type = 'POWER_UP';
    else if (rand < 0.65) type = 'SPEED_UP';
    else if (rand < 0.85) type = 'SHIELD';
    else type = 'LIFE';

    items.push({
        x, y, type,
        width: 20, height: 20,
        vy: 1.5,
        time: 0
    });
}

function getEnemyColor(type) {
    if (type === 'boss') return '#f0f';
    if (type === 'mid') return '#f80';
    return '#4f4';
}

// ============================================
// 메인 업데이트
// ============================================
function update() {
    frame++;

    // 별 업데이트
    stars.forEach(s => {
        s.y += s.speed;
        s.twinkle += 0.05;
        if (s.y > 700) { s.y = 0; s.x = Math.random() * 480; }
    });
    bgParticles.forEach(p => {
        p.y += p.speed;
        if (p.y > 700 + p.radius) { p.y = -p.radius; p.x = Math.random() * 480; }
    });

    if (gameState === STATE.STAGE_CLEAR) {
        updateStageClear();
        return;
    }
    if (gameState !== STATE.PLAYING) return;
    if (shakeTimer > 0) shakeTimer--;

    // 플레이어 이동
    if (player.alive) {
        let moveDir = 0;
        if (keys['ArrowLeft'] || keys['KeyA'] || touchLeft) moveDir = -1;
        if (keys['ArrowRight'] || keys['KeyD'] || touchRight) moveDir = 1;
        player.x += moveDir * player.speed;
        player.x = Math.max(20, Math.min(460, player.x));

        // 자동 발사
        player.fireCooldown--;
        if (player.fireCooldown <= 0) {
            firePlayerBullets();
            player.fireCooldown = player.fireRate;
        }

        if (player.invincible > 0) player.invincible--;
    }

    updatePlayerBullets();
    updateEnemies();
    updateEnemyBullets();
    updateItems();
    updateParticles();
    updateDamageNumbers();
    checkCollisions();
    checkWaveClear();
}

// ============================================
// 플레이어 발사 (레벨별)
// ============================================
function firePlayerBullets() {
    const bx = player.x, by = player.y - 18;
    const lvl = player.bulletLevel;

    if (lvl >= 3) sfx.shootPower();
    else sfx.shoot();

    if (lvl === 1) {
        playerBullets.push(makeBullet(bx, by, 0, -9));
    } else if (lvl === 2) {
        playerBullets.push(makeBullet(bx - 6, by, 0, -9));
        playerBullets.push(makeBullet(bx + 6, by, 0, -9));
    } else if (lvl === 3) {
        playerBullets.push(makeBullet(bx, by, 0, -10));
        playerBullets.push(makeBullet(bx - 10, by + 5, -1, -9));
        playerBullets.push(makeBullet(bx + 10, by + 5, 1, -9));
    } else if (lvl === 4) {
        playerBullets.push(makeBullet(bx - 6, by, 0, -10));
        playerBullets.push(makeBullet(bx + 6, by, 0, -10));
        playerBullets.push(makeBullet(bx - 14, by + 5, -1.5, -9));
        playerBullets.push(makeBullet(bx + 14, by + 5, 1.5, -9));
    } else {
        playerBullets.push(makeBullet(bx, by - 5, 0, -11));
        playerBullets.push(makeBullet(bx - 8, by, 0, -10));
        playerBullets.push(makeBullet(bx + 8, by, 0, -10));
        playerBullets.push(makeBullet(bx - 16, by + 5, -2, -9));
        playerBullets.push(makeBullet(bx + 16, by + 5, 2, -9));
    }
}

function makeBullet(x, y, vx, vy) {
    return { x, y, vx, vy, width: 4, height: 14, trail: [] };
}

function updatePlayerBullets() {
    playerBullets.forEach(b => {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 5) b.trail.shift();
        b.x += b.vx;
        b.y += b.vy;
    });
    playerBullets = playerBullets.filter(b => b.y > -20 && b.x > -20 && b.x < 500);
}

// ============================================
// 적 업데이트
// ============================================
function updateEnemies() {
    // 편대 이동
    enemyFormation.offsetX += enemyFormation.speed * enemyFormation.dir;
    if (Math.abs(enemyFormation.offsetX) > 35) enemyFormation.dir *= -1;

    enemies.forEach(e => {
        if (!e.alive) return;

        // 등장 애니메이션
        if (!e.entered) {
            e.enterTime--;
            if (e.enterTime <= 0) e.entered = true;
            return;
        }

        if (e.flashTimer > 0) e.flashTimer--;

        if (!e.diving) {
            e.x = e.baseX + enemyFormation.offsetX;
            e.y = e.baseY + Math.sin(frame * 0.02 + e.baseX * 0.1) * 3;
        } else {
            e.diveTime++;
            e.x += Math.sin(e.diveTime * 0.06) * 3.5;
            e.y += e.diveSpeed;
            // 화면 경계 제한
            e.x = Math.max(e.width / 2, Math.min(480 - e.width / 2, e.x));
            // 다이빙 중 발사 (플레이어보다 위에 있을 때만)
            if (e.y < player.y && Math.random() < 0.025) {
                const angle = Math.atan2(player.y - e.y, player.x - e.x);
                enemyBullets.push({
                    x: e.x, y: e.y + e.height / 2,
                    vx: Math.cos(angle) * 4,
                    vy: Math.sin(angle) * 4,
                    size: 4
                });
            }
            // 플레이어 위치 아래로 내려가면 복귀
            if (e.y > player.y + 20) {
                e.diving = false;
                e.y = e.baseY;
            }
        }
    });

    // 랜덤 다이빙
    if (frame % Math.max(40, 80 - stage * 5) === 0) {
        const candidates = enemies.filter(e => e.alive && !e.diving && e.entered);
        if (candidates.length > 0) {
            const diver = candidates[Math.floor(Math.random() * candidates.length)];
            diver.diving = true;
            diver.diveTime = 0;
            diver.diveSpeed = 2.5 + Math.random() * 2 + stage * 0.2;
        }
    }

    // 편대 발사 (플레이어보다 위에 있을 때만)
    if (frame % Math.max(20, 50 - stage * 3) === 0) {
        const shooters = enemies.filter(e => e.alive && !e.diving && e.entered && e.y < player.y);
        if (shooters.length > 0) {
            const s = shooters[Math.floor(Math.random() * shooters.length)];
            enemyBullets.push({
                x: s.x, y: s.y + s.height / 2,
                vx: 0, vy: 3 + stage * 0.3,
                size: 4
            });
        }
    }
}

function updateEnemyBullets() {
    enemyBullets.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
    });
    enemyBullets = enemyBullets.filter(b => b.y < 720 && b.y > -10 && b.x > -10 && b.x < 500);
}

// ============================================
// 아이템 업데이트
// ============================================
function updateItems() {
    items.forEach(item => {
        item.y += item.vy;
        item.time++;
    });
    items = items.filter(i => i.y < 720);
}

// ============================================
// 파티클 업데이트
// ============================================
function updateParticles() {
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);
}

function updateDamageNumbers() {
    damageNumbers.forEach(d => {
        d.y -= 1;
        d.life--;
    });
    damageNumbers = damageNumbers.filter(d => d.life > 0);
}

// ============================================
// 충돌 감지
// ============================================
function checkCollisions() {
    // 플레이어 총알 vs 적
    playerBullets.forEach(b => {
        enemies.forEach(e => {
            if (!e.alive || !e.entered) return;
            if (hitTest(b, e)) {
                b.y = -100;
                e.hp--;
                e.flashTimer = 6;
                if (e.hp <= 0) {
                    e.alive = false;
                    player.combo++;
                    const comboBonus = Math.min(player.combo, 10);
                    const pts = e.pts * comboBonus;
                    score += pts;
                    createExplosion(e.x, e.y, getEnemyColor(e.type), 18);
                    damageNumbers.push({ x: e.x, y: e.y, text: pts.toString(), life: 40, color: '#ff0' });
                    if (e.type === 'boss') sfx.explodeBoss();
                    else sfx.explodeEnemy();
                    if (player.combo > 1) sfx.combo(player.combo);
                    // 아이템 드롭 (15% 확률)
                    if (Math.random() < 0.15) dropItem(e.x, e.y);
                } else {
                    sfx.hitEnemy();
                    createExplosion(b.x, b.y, '#fff', 4);
                }
            }
        });
    });

    // 적 총알 vs 플레이어
    if (player.alive && player.invincible <= 0) {
        enemyBullets.forEach(b => {
            if (hitTestCircle(b, player, 12)) {
                b.y = 800;
                playerHit();
            }
        });
        // 다이빙 적 vs 플레이어
        enemies.forEach(e => {
            if (!e.alive || !e.diving) return;
            if (hitTest(e, player)) {
                e.alive = false;
                createExplosion(e.x, e.y, '#f80', 12);
                playerHit();
            }
        });
    }

    // 아이템 vs 플레이어
    items.forEach((item, idx) => {
        if (hitTest(item, player)) {
            applyItem(item.type);
            items.splice(idx, 1);
            // 획득 이펙트
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x: item.x, y: item.y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 20, maxLife: 20,
                    color: ITEM_TYPES[item.type].color,
                    size: 3
                });
            }
        }
    });
}

function hitTest(a, b) {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
           Math.abs(a.y - b.y) < (a.height + b.height) / 2;
}
function hitTestCircle(bullet, target, radius) {
    const dx = bullet.x - target.x;
    const dy = bullet.y - target.y;
    return Math.sqrt(dx * dx + dy * dy) < radius;
}

// ============================================
// 아이템 적용
// ============================================
function applyItem(type) {
    switch (type) {
        case 'POWER_UP':
            player.bulletLevel = Math.min(5, player.bulletLevel + 1);
            damageNumbers.push({ x: player.x, y: player.y - 30, text: 'POWER UP!', life: 50, color: '#f80' });
            sfx.powerUp();
            break;
        case 'SPEED_UP':
            player.speed = Math.min(8, player.speed + 0.5);
            player.fireRate = Math.max(6, player.fireRate - 1);
            damageNumbers.push({ x: player.x, y: player.y - 30, text: 'SPEED UP!', life: 50, color: '#0f0' });
            sfx.itemPickup();
            break;
        case 'SHIELD':
            player.shieldHP = 3;
            damageNumbers.push({ x: player.x, y: player.y - 30, text: 'SHIELD!', life: 50, color: '#08f' });
            sfx.shield();
            break;
        case 'LIFE':
            lives = Math.min(5, lives + 1);
            damageNumbers.push({ x: player.x, y: player.y - 30, text: '1UP!', life: 50, color: '#f0f' });
            sfx.oneUp();
            break;
    }
}

// ============================================
// 플레이어 피격
// ============================================
function playerHit() {
    if (player.shieldHP > 0) {
        player.shieldHP--;
        shakeTimer = 5;
        shakeIntensity = 3;
        createExplosion(player.x, player.y, '#08f', 8);
        sfx.shieldBlock();
        return;
    }
    lives--;
    player.combo = 0;
    shakeTimer = 15;
    shakeIntensity = 6;
    createExplosion(player.x, player.y, '#0ff', 25);
    sfx.playerHit();
    if (lives <= 0) {
        player.alive = false;
        gameState = STATE.GAMEOVER;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('galagaHigh', highScore.toString());
        }
        sfx.gameOver();
        setTimeout(() => {
            showScoreScreen();
        }, 1500);
    } else {
        player.invincible = 120;
    }
}

// ============================================
// 웨이브 클리어 체크
// ============================================
function checkWaveClear() {
    if (enemies.filter(e => e.alive).length === 0) {
        // 스테이지 클리어 연출 시작
        gameState = STATE.STAGE_CLEAR;
        stageClearTimer = 60; // 1초
        stageClearFireworks = [];
        enemyBullets = [];
        items = [];
        player.combo = 0;
        // 아이템 효과 초기화
        player.bulletLevel = 1;
        player.speed = 5;
        player.fireRate = 12;
        player.shieldHP = 0;
        sfx.stageClear();
        // 스테이지 클리어 보너스
        const bonus = stage * 1000;
        score += bonus;
        // 불꽃놀이 생성
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (gameState === STATE.STAGE_CLEAR) {
                    createFirework(80 + Math.random() * 320, 100 + Math.random() * 300);
                }
            }, i * 200);
        }
    }
}

// 불꽃놀이 생성
function createFirework(x, y) {
    const hue = Math.random() * 360;
    const count = 20 + Math.floor(Math.random() * 15);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const speed = Math.random() * 5 + 2;
        stageClearFireworks.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 50 + Math.random() * 30,
            maxLife: 80,
            color: `hsl(${hue + Math.random() * 40}, 100%, ${50 + Math.random() * 30}%)`,
            size: Math.random() * 4 + 2,
            trail: []
        });
    }
}

// 스테이지 클리어 업데이트
function updateStageClear() {
    stageClearTimer--;

    // 불꽃놀이 파티클 업데이트
    stageClearFireworks.forEach(p => {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // 중력
        p.vx *= 0.98; // 감속
        p.life--;
    });
    stageClearFireworks = stageClearFireworks.filter(p => p.life > 0);

    // 추가 불꽃놀이
    if (stageClearTimer % 15 === 0 && stageClearTimer > 10) {
        createFirework(60 + Math.random() * 360, 80 + Math.random() * 250);
    }

    // 연출 종료 → 다음 스테이지
    if (stageClearTimer <= 0) {
        stage++;
        gameState = STATE.PLAYING;
        stageClearFireworks = [];
        spawnWave();
    }
}

// 스테이지 클리어 렌더링
function renderStageClear() {
    // 불꽃놀이 트레일
    stageClearFireworks.forEach(p => {
        // 트레일
        p.trail.forEach((t, i) => {
            const alpha = (i / p.trail.length) * (p.life / p.maxLife) * 0.6;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(t.x - p.size * 0.4, t.y - p.size * 0.4, p.size * 0.8, p.size * 0.8);
        });
        // 본체
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // 큰 텍스트 애니메이션
    const progress = 1 - (stageClearTimer / 60);
    const textScale = Math.min(1, progress * 4); // 빠르게 커짐
    const textAlpha = stageClearTimer > 10 ? 1 : stageClearTimer / 10;

    ctx.save();
    ctx.translate(240, 300);
    ctx.scale(textScale, textScale);
    ctx.globalAlpha = textAlpha;

    // 글로우 텍스트
    ctx.shadowColor = '#ff0';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff0';
    ctx.font = 'bold 36px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`STAGE ${stage} CLEAR!`, 0, 0);

    // 보너스 점수
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#0ff';
    ctx.font = 'bold 22px "Courier New"';
    ctx.fillText(`+${stage * 1000} BONUS`, 0, 45);

    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;

    // 플레이어도 표시
    if (player.alive) drawPlayer();
}

// ============================================
// 폭발 파티클 생성
// ============================================
function createExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
        const speed = Math.random() * 4 + 1.5;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30 + Math.random() * 25,
            maxLife: 55,
            color,
            size: Math.random() * 4 + 2
        });
    }
}

// ============================================
// 렌더링
// ============================================
function render() {
    const scaleX = W / 480;
    const scaleY = H / 700;

    ctx.save();
    ctx.scale(scaleX, scaleY);

    // 화면 흔들림
    if (shakeTimer > 0) {
        const sx = (Math.random() - 0.5) * shakeIntensity;
        const sy2 = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(sx, sy2);
    }

    // 배경
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, 480, 700);

    // 네뷸라
    bgParticles.forEach(p => {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
    });

    // 별
    stars.forEach(s => {
        const alpha = (Math.sin(s.twinkle) * 0.3 + 0.7) * (s.speed / 2.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    if (gameState === STATE.PLAYING || gameState === STATE.GAMEOVER) {
        renderGame();
    }

    if (gameState === STATE.STAGE_CLEAR) {
        renderStageClear();
        drawHUD();
    }

    ctx.restore();
}

function renderGame() {
    // 플레이어 총알 (트레일 포함)
    playerBullets.forEach(b => {
        // 트레일
        b.trail.forEach((t, i) => {
            const alpha = i / b.trail.length * 0.5;
            ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.fillRect(t.x - 1.5, t.y - 4, 3, 8);
        });
        // 총알 본체
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fff';
        ctx.fillRect(b.x - 2, b.y - 7, 4, 14);
        ctx.fillStyle = '#0ff';
        ctx.fillRect(b.x - 1, b.y - 6, 2, 12);
        ctx.shadowBlur = 0;
    });

    // 적 그리기
    enemies.forEach(e => {
        if (!e.alive || !e.entered) return;
        drawEnemy(e);
    });

    // 적 총알
    enemyBullets.forEach(b => {
        ctx.shadowColor = '#f44';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#f44';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff8';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // 아이템
    items.forEach(item => {
        const info = ITEM_TYPES[item.type];
        const bob = Math.sin(item.time * 0.1) * 3;
        ctx.save();
        ctx.translate(item.x, item.y + bob);
        // 글로우
        ctx.shadowColor = info.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info.label, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    // 플레이어
    if (player.alive) {
        if (player.invincible <= 0 || Math.floor(frame / 3) % 2 === 0) {
            drawPlayer();
        }
        // 실드 표시
        if (player.shieldHP > 0) {
            ctx.strokeStyle = `rgba(0, 150, 255, ${0.4 + Math.sin(frame * 0.1) * 0.2})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = '#08f';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    // 파티클
    particles.forEach(p => {
        const alpha = p.life / (p.maxLife || 50);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // 데미지 넘버
    damageNumbers.forEach(d => {
        const alpha = d.life / 50;
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.fillStyle = d.color;
        ctx.font = 'bold 14px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(d.text, d.x, d.y);
    });
    ctx.globalAlpha = 1;

    // HUD
    drawHUD();
}

// ============================================
// 플레이어 그리기
// ============================================
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);

    // 엔진 불꽃
    const flameH = 6 + Math.random() * 6;
    const grad = ctx.createLinearGradient(0, 16, 0, 16 + flameH);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, '#0ff');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-4, 16);
    ctx.lineTo(0, 16 + flameH);
    ctx.lineTo(4, 16);
    ctx.closePath();
    ctx.fill();

    // 본체
    ctx.fillStyle = '#0cf';
    ctx.shadowColor = '#0cf';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-5, -8);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-5, 10);
    ctx.lineTo(-3, 16);
    ctx.lineTo(3, 16);
    ctx.lineTo(5, 10);
    ctx.lineTo(8, 4);
    ctx.lineTo(5, -8);
    ctx.closePath();
    ctx.fill();

    // 날개
    ctx.fillStyle = '#08a';
    ctx.beginPath();
    ctx.moveTo(-8, 2);
    ctx.lineTo(-18, 12);
    ctx.lineTo(-14, 14);
    ctx.lineTo(-6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.lineTo(18, 12);
    ctx.lineTo(14, 14);
    ctx.lineTo(6, 10);
    ctx.closePath();
    ctx.fill();

    // 코어
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -4, 3, 0, Math.PI * 2);
    ctx.fill();

    // 파워 레벨 표시 (날개 끝 빛)
    if (player.bulletLevel >= 3) {
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(-16, 12, 2, 0, Math.PI * 2);
        ctx.arc(16, 12, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
}

// ============================================
// 적 그리기
// ============================================
function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    const pulse = Math.sin(frame * 0.08 + e.baseX) * 0.08 + 1;
    const flash = e.flashTimer > 0;

    if (e.type === 'boss') {
        ctx.scale(pulse, pulse);
        ctx.fillStyle = flash ? '#fff' : (e.hp > e.maxHp / 2 ? '#f0f' : '#f88');
        ctx.shadowColor = '#f0f';
        ctx.shadowBlur = 8;
        // 나비 형태
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.bezierCurveTo(-8, -14, -16, -6, -16, 2);
        ctx.bezierCurveTo(-16, 10, -10, 14, -4, 10);
        ctx.lineTo(0, 6);
        ctx.lineTo(4, 10);
        ctx.bezierCurveTo(10, 14, 16, 10, 16, 2);
        ctx.bezierCurveTo(16, -6, 8, -14, 0, -14);
        ctx.fill();
        // 눈
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(-4, -2, 2.5, 0, Math.PI * 2);
        ctx.arc(4, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // HP 바
        if (e.maxHp > 1) {
            ctx.fillStyle = '#333';
            ctx.fillRect(-12, 16, 24, 3);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(-12, 16, 24 * (e.hp / e.maxHp), 3);
        }
    } else if (e.type === 'mid') {
        ctx.scale(pulse, pulse);
        ctx.fillStyle = flash ? '#fff' : '#f80';
        ctx.shadowColor = '#f80';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        // 줄무늬
        ctx.fillStyle = flash ? '#ff8' : '#ff0';
        ctx.fillRect(-10, -2, 20, 4);
        // 날개
        ctx.fillStyle = 'rgba(255, 180, 0, 0.7)';
        ctx.beginPath();
        ctx.ellipse(-12, -3, 7, 4, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(12, -3, 7, 4, 0.4, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.scale(pulse, pulse);
        ctx.fillStyle = flash ? '#fff' : '#4f4';
        ctx.shadowColor = '#4f4';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(-11, 3);
        ctx.lineTo(-7, 11);
        ctx.lineTo(0, 7);
        ctx.lineTo(7, 11);
        ctx.lineTo(11, 3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#8f8';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
}

// ============================================
// HUD 그리기
// ============================================
function drawHUD() {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${score.toString().padStart(8, '0')}`, 10, 22);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`HIGH ${highScore.toString().padStart(8, '0')}`, 240, 22);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff0';
    ctx.fillText(`STAGE ${stage}`, 470, 22);

    // 라이프
    for (let i = 0; i < lives; i++) {
        ctx.fillStyle = '#0cf';
        ctx.beginPath();
        ctx.moveTo(20 + i * 22, 685);
        ctx.lineTo(14 + i * 22, 695);
        ctx.lineTo(26 + i * 22, 695);
        ctx.closePath();
        ctx.fill();
    }

    // 파워 레벨 표시
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f80';
    ctx.font = '12px "Courier New"';
    ctx.fillText(`PWR Lv.${player.bulletLevel}`, 470, 692);

    // 실드 표시
    if (player.shieldHP > 0) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#08f';
        ctx.fillText(`SHIELD x${player.shieldHP}`, 100, 692);
    }

    // 콤보 표시
    if (player.combo > 1) {
        ctx.textAlign = 'center';
        ctx.fillStyle = `hsl(${frame * 5 % 360}, 100%, 70%)`;
        ctx.font = 'bold 16px "Courier New"';
        ctx.fillText(`${player.combo} COMBO!`, 240, 50);
    }
}

// ============================================
// 스코어보드 시스템
// ============================================
function getToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getAllScores() {
    try {
        return JSON.parse(localStorage.getItem('galagaScores') || '[]');
    } catch { return []; }
}

function saveAllScores(scores) {
    localStorage.setItem('galagaScores', JSON.stringify(scores));
}

function showScoreScreen() {
    const scoreScreen = document.getElementById('score-screen');
    document.getElementById('final-score').textContent = `SCORE: ${score.toLocaleString()} | STAGE ${stage}`;
    document.getElementById('name-input-area').style.display = 'block';
    document.getElementById('player-name').value = localStorage.getItem('galagaLastName') || '';
    document.getElementById('player-name').focus();

    renderLeaderboards();
    scoreScreen.style.display = 'block';
}

function hideScoreScreen() {
    document.getElementById('score-screen').style.display = 'none';
}

function saveScore() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim() || '???';
    localStorage.setItem('galagaLastName', name);

    const scores = getAllScores();
    scores.push({ name, score, stage, date: getToday() });
    // 최대 100개만 보관
    scores.sort((a, b) => b.score - a.score);
    if (scores.length > 100) scores.length = 100;
    saveAllScores(scores);

    document.getElementById('name-input-area').style.display = 'none';
    renderLeaderboards();
}

function renderLeaderboards() {
    const scores = getAllScores();
    const today = getToday();

    // 오늘 점수
    const todayScores = scores.filter(s => s.date === today).sort((a, b) => b.score - a.score).slice(0, 5);
    const todayEl = document.getElementById('today-scores');
    if (todayScores.length === 0) {
        todayEl.innerHTML = '<span style="color:#666;">기록 없음</span>';
    } else {
        todayEl.innerHTML = todayScores.map((s, i) =>
            `<div style="color:${i===0?'#ff0':'#ccc'}">${i+1}. ${s.name} - ${s.score.toLocaleString()}</div>`
        ).join('');
    }

    // 전체 점수
    const allScores = scores.sort((a, b) => b.score - a.score).slice(0, 5);
    const allEl = document.getElementById('all-scores');
    if (allScores.length === 0) {
        allEl.innerHTML = '<span style="color:#666;">기록 없음</span>';
    } else {
        allEl.innerHTML = allScores.map((s, i) =>
            `<div style="color:${i===0?'#ff0':'#ccc'}">${i+1}. ${s.name} - ${s.score.toLocaleString()}</div>`
        ).join('');
    }
}

// ============================================
// 게임 루프
// ============================================
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// 뮤트 토글
function toggleMute() {
    const muted = sfx.toggleMute();
    document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
}
// M키로도 뮤트 토글
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') toggleMute();
});
// Enter키로 점수 저장
document.getElementById('player-name').addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
        e.preventDefault();
        saveScore();
    }
});

// 시작
uiOverlay.style.display = 'block';
gameLoop();
