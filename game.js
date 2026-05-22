// ============================================
// ★ GALAGA SUPREME ★
// 보스전 + 다양한 패턴 + BGM + 업적 + 일시정지
// ============================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiOverlay = document.getElementById('ui-overlay');

let W, H;
function resizeCanvas() {
    const ratio = 480 / 720;
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
let highScore = parseInt(localStorage.getItem('galagaHigh')||'0');
let shakeTimer = 0, shakeIntensity = 0;
let stageClearTimer = 0, bossWarningTimer = 0;
let paused = false, prevState = STATE.PLAYING;
let totalKills = 0, maxCombo = 0;

// ============================================
// 입력
// ============================================
const keys = {};
let touchLeft = false, touchRight = false;

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

canvas.addEventListener('touchstart', handleTouch, {passive:false});
canvas.addEventListener('touchmove', handleTouch, {passive:false});
canvas.addEventListener('touchend', handleTouchEnd, {passive:false});

let touchStartX = 0;
let touchCurrentX = 0;
let touchActive = false;

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
        touchActive = true;
    }
    touchCurrentX = touch.clientX;
    const dx = touchCurrentX - touchStartX;
    touchLeft = false; touchRight = false;
    if (dx < -8) touchLeft = true;
    if (dx > 8) touchRight = true;
    // 드래그 기준점을 서서히 따라오게 (부드러운 조작)
    touchStartX += (touchCurrentX - touchStartX) * 0.05;
}
function handleTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length === 0) { touchLeft = false; touchRight = false; touchActive = false; }
    else handleTouch(e);
}

// ============================================
// 플레이어
// ============================================
const player = {
    x:240, y:640, width:30, height:30, speed:5,
    fireRate:12, fireCooldown:0, bulletLevel:2,
    shieldHP:0, invincible:0, alive:true, combo:0
};

// 게임 오브젝트
let playerBullets=[], enemyBullets=[], enemies=[], items=[], particles=[], damageNumbers=[];
let boss = null;
let enemyFormation = {offsetX:0, dir:1, speed:0.3};
let stageClearFireworks = [];

// 아이템
const ITEM_TYPES = {
    POWER_UP:{color:'#f80',label:'🔥',desc:'파워업'},
    SPEED_UP:{color:'#0f0',label:'⚡',desc:'스피드'},
    SHIELD:{color:'#08f',label:'🛡',desc:'실드'},
    LIFE:{color:'#f0f',label:'♥',desc:'1UP'}
};

// 별 배경
let stars = [], bgParticles = [];
function initStars() {
    stars = [];
    for (let i=0;i<120;i++) stars.push({x:Math.random()*480,y:Math.random()*720,speed:Math.random()*2+0.3,size:Math.random()*2+0.5,tw:Math.random()*6.28});
    bgParticles = [];
    for (let i=0;i<15;i++) bgParticles.push({x:Math.random()*480,y:Math.random()*720,r:Math.random()*50+20,color:`hsla(${Math.random()*360},60%,20%,0.03)`,speed:Math.random()*0.2+0.05});
}
initStars();

// ============================================
// 게임 시작
// ============================================
function startGame() {
    sfx.init(); sfx.resume(); sfx.gameStart();
    gameState = STATE.PLAYING;
    uiOverlay.style.display = 'none';
    hideScoreScreen();
    score=0; lives=3; stage=1; frame=0; totalKills=0; maxCombo=0;
    player.x=240; player.y=640; player.alive=true;
    player.invincible=60; player.bulletLevel=2; player.speed=5;
    player.fireRate=12; player.shieldHP=0; player.combo=0;
    playerBullets=[]; enemyBullets=[]; items=[]; particles=[]; damageNumbers=[];
    boss=null;
    spawnWave();
    setTimeout(()=>sfx.playStageMusic(stage), 800);
}

// ============================================
// 일시정지
// ============================================
function togglePause() {
    if (gameState === STATE.PLAYING) {
        prevState = STATE.PLAYING;
        gameState = STATE.PAUSED;
        paused = true;
        document.getElementById('pause-btn').textContent = '▶';
    } else if (gameState === STATE.PAUSED) {
        gameState = prevState;
        paused = false;
        document.getElementById('pause-btn').textContent = '⏸';
    }
}

// ============================================
// 웨이브 생성 (보스 스테이지 포함)
// ============================================
function spawnWave() {
    enemies = []; boss = null;
    enemyFormation = {offsetX:0, dir:1, speed:0.25 + stage*0.06};

    // 5스테이지마다 보스
    if (stage % 5 === 0) {
        bossWarningTimer = 90;
        gameState = STATE.BOSS_WARNING;
        sfx.bossWarning();
        return;
    }

    const cols = Math.min(8, 5 + Math.floor(stage/2));
    const sx = (480 - (cols-1)*50) / 2;
    const patterns = ['standard','v_shape','diamond'];
    const pattern = patterns[stage % patterns.length];

    if (pattern === 'standard') {
        for(let c=0;c<cols;c++) enemies.push(mkEnemy(sx+c*50, 65, 'boss_e'));
        for(let r=0;r<2;r++) for(let c=0;c<cols;c++) enemies.push(mkEnemy(sx+c*50, 110+r*38, 'mid'));
        for(let r=0;r<2;r++) for(let c=0;c<cols;c++) enemies.push(mkEnemy(sx+c*50, 190+r*38, 'grunt'));
    } else if (pattern === 'v_shape') {
        for(let c=0;c<cols;c++) {
            const row = Math.abs(c - Math.floor(cols/2));
            enemies.push(mkEnemy(sx+c*50, 60+row*25, 'boss_e'));
            enemies.push(mkEnemy(sx+c*50, 130+row*20, 'mid'));
            enemies.push(mkEnemy(sx+c*50, 200+row*15, 'grunt'));
        }
    } else {
        const cx=240, cy=140;
        for(let i=0;i<cols*2;i++) {
            const a = (Math.PI*2/cols/2)*i;
            const r = 50 + (i%2)*35;
            enemies.push(mkEnemy(cx+Math.cos(a)*r, cy+Math.sin(a)*r*0.6, i%3===0?'boss_e':i%2===0?'mid':'grunt'));
        }
    }
}

function spawnBoss() {
    const bossHP = 30 + stage * 10;
    boss = {
        x:240, y:-60, targetY:100, width:60, height:60,
        hp:bossHP, maxHp:bossHP, alive:true,
        phase:0, phaseTimer:0, moveDir:1, moveSpeed:1.5,
        attackTimer:0, flashTimer:0, type:'BOSS',
        minionTimer:0
    };
    // 보스전 호위 적 생성
    enemies = [];
    for(let i=0;i<4;i++) {
        enemies.push(mkEnemy(80+i*100, 200, 'mid'));
        enemies.push(mkEnemy(100+i*100, 240, 'grunt'));
    }
    enemyFormation = {offsetX:0, dir:1, speed:0.3};
    gameState = STATE.PLAYING;
}

function mkEnemy(bx, by, type) {
    let hp=1, w=22, h=22, pts=100;
    if(type==='boss_e'){hp=2+Math.floor(stage/3);w=28;h=28;pts=400;}
    else if(type==='mid'){hp=1+Math.floor(stage/5);w=24;h=24;pts=200;}
    return {x:bx,y:by,baseX:bx,baseY:by,width:w,height:h,type,hp,maxHp:hp,
        alive:true,pts,diving:false,diveTime:0,diveSpeed:0,
        enterTime:Math.random()*40,entered:false,flashTimer:0};
}

function dropItem(x,y) {
    const r=Math.random();
    let type;
    if(r<0.40)type='POWER_UP'; else if(r<0.65)type='SPEED_UP';
    else if(r<0.85)type='SHIELD'; else type='LIFE';
    items.push({x,y,type,width:20,height:20,vy:1.5,time:0});
}

function getEnemyColor(type) {
    if(type==='boss_e')return '#f0f'; if(type==='mid')return '#f80'; return '#4f4';
}

// ============================================
// 메인 업데이트
// ============================================
function update() {
    frame++;
    // 배경
    stars.forEach(s=>{s.y+=s.speed;s.tw+=0.04;if(s.y>720){s.y=0;s.x=Math.random()*480;}});
    bgParticles.forEach(p=>{p.y+=p.speed;if(p.y>720+p.r){p.y=-p.r;p.x=Math.random()*480;}});

    if(gameState===STATE.PAUSED) return;
    if(gameState===STATE.BOSS_WARNING) { bossWarningTimer--; if(bossWarningTimer<=0) spawnBoss(); return; }
    if(gameState===STATE.STAGE_CLEAR) { updateStageClear(); return; }
    if(gameState!==STATE.PLAYING) return;
    if(shakeTimer>0) shakeTimer--;

    // 플레이어
    if(player.alive) {
        let dir=0;
        if(keys['ArrowLeft']||keys['KeyA']||touchLeft) dir=-1;
        if(keys['ArrowRight']||keys['KeyD']||touchRight) dir=1;
        player.x += dir * player.speed;
        player.x = Math.max(20, Math.min(460, player.x));
        player.fireCooldown--;
        if(player.fireCooldown<=0) { firePlayerBullets(); player.fireCooldown=player.fireRate; }
        if(player.invincible>0) player.invincible--;
    }

    updatePlayerBullets();
    if(boss && boss.alive) { updateBoss(); updateEnemies(); }
    else updateEnemies();
    updateEnemyBullets();
    updateItems();
    updateParticles();
    damageNumbers.forEach(d=>{d.y-=1;d.life--;});
    damageNumbers=damageNumbers.filter(d=>d.life>0);
    checkCollisions();
    checkWaveClear();
}

// ============================================
// 플레이어 발사
// ============================================
function firePlayerBullets() {
    const bx=player.x, by=player.y-18, lvl=player.bulletLevel;
    if(lvl>=3) sfx.shootPower(); else sfx.shoot();
    const bullets = [];
    if(lvl===1) bullets.push([bx,by,0,-9]);
    else if(lvl===2) { bullets.push([bx-5,by,0,-9],[bx+5,by,0,-9]); }
    else if(lvl===3) { bullets.push([bx,by,0,-10],[bx-10,by+4,-1,-9],[bx+10,by+4,1,-9]); }
    else if(lvl===4) { bullets.push([bx-5,by,0,-10],[bx+5,by,0,-10],[bx-12,by+4,-1.5,-9],[bx+12,by+4,1.5,-9]); }
    else { bullets.push([bx,by-4,0,-11],[bx-7,by,0,-10],[bx+7,by,0,-10],[bx-14,by+4,-2,-9],[bx+14,by+4,2,-9]); }
    bullets.forEach(([x,y,vx,vy])=>playerBullets.push({x,y,vx,vy,width:4,height:14,trail:[]}));
}

function updatePlayerBullets() {
    playerBullets.forEach(b=>{b.trail.push({x:b.x,y:b.y});if(b.trail.length>5)b.trail.shift();b.x+=b.vx;b.y+=b.vy;});
    playerBullets=playerBullets.filter(b=>b.y>-20&&b.x>-20&&b.x<500);
}

// ============================================
// 보스 업데이트
// ============================================
function updateBoss() {
    const b = boss;
    // 등장
    if(b.y < b.targetY) { b.y += 1.5; return; }
    b.phaseTimer++;
    if(b.flashTimer>0) b.flashTimer--;

    // 이동
    b.x += b.moveSpeed * b.moveDir;
    if(b.x < 60 || b.x > 420) b.moveDir *= -1;

    // 공격 패턴 (HP에 따라 변화)
    const hpRatio = b.hp / b.maxHp;
    b.attackTimer++;

    if(hpRatio > 0.6) {
        // 페이즈1: 단발
        if(b.attackTimer % 40 === 0) {
            enemyBullets.push({x:b.x,y:b.y+30,vx:0,vy:4,size:5});
        }
    } else if(hpRatio > 0.3) {
        // 페이즈2: 부채꼴
        if(b.attackTimer % 50 === 0) {
            for(let i=-2;i<=2;i++) {
                const angle = Math.PI/2 + i*0.25;
                enemyBullets.push({x:b.x,y:b.y+30,vx:Math.cos(angle)*3.5,vy:Math.sin(angle)*3.5,size:4});
            }
        }
        b.moveSpeed = 2;
    } else {
        // 페이즈3: 원형탄
        if(b.attackTimer % 35 === 0) {
            for(let i=0;i<8;i++) {
                const angle = (Math.PI*2/8)*i + b.phaseTimer*0.05;
                enemyBullets.push({x:b.x,y:b.y+20,vx:Math.cos(angle)*3,vy:Math.sin(angle)*3,size:4});
            }
        }
        b.moveSpeed = 2.5;
    }

    // 보스전 중 미니언 추가 소환 (120프레임마다)
    b.minionTimer++;
    if(b.minionTimer % 120 === 0) {
        const side = Math.random() < 0.5 ? 60 : 420;
        enemies.push(mkEnemy(side, 180+Math.random()*60, Math.random()<0.5?'mid':'grunt'));
    }

    // 보스 20번 공격당할 때마다 아이템 1개 드롭
    const hitsReceived = b.maxHp - b.hp;
    if(hitsReceived > 0 && hitsReceived % 20 === 0 && b.flashTimer === 12) {
        dropItem(b.x + (Math.random()-0.5)*40, b.y + 40);
    }
}

// ============================================
// 적 업데이트
// ============================================
function updateEnemies() {
    enemyFormation.offsetX += enemyFormation.speed * enemyFormation.dir;
    if(Math.abs(enemyFormation.offsetX)>30) enemyFormation.dir*=-1;

    enemies.forEach(e=>{
        if(!e.alive) return;
        if(!e.entered){e.enterTime--;if(e.enterTime<=0)e.entered=true;return;}
        if(e.flashTimer>0)e.flashTimer--;
        if(!e.diving){
            e.x=e.baseX+enemyFormation.offsetX;
            e.y=e.baseY+Math.sin(frame*0.02+e.baseX*0.1)*3;
        } else {
            e.diveTime++;
            e.x+=Math.sin(e.diveTime*0.06)*3;
            e.y+=e.diveSpeed;
            e.x=Math.max(e.width/2, Math.min(480-e.width/2, e.x));
            // 화면 55% 이하에서만 공격
            if(e.y < 720*0.55 && Math.random()<0.02) {
                const a=Math.atan2(player.y-e.y,player.x-e.x);
                enemyBullets.push({x:e.x,y:e.y+e.height/2,vx:Math.cos(a)*3.5,vy:Math.sin(a)*3.5,size:4});
            }
            // 70% 이하로 내려오면 공격 중지하고 천천히 복귀
            if(e.y > 720*0.7) {
                e.diveSpeed = -2; // 위로 올라감
            }
            // 원래 위치 근처로 돌아오면 다이빙 종료
            if(e.diveSpeed < 0 && e.y <= e.baseY + 10) {
                e.diving=false;
                e.y=e.baseY;
            }
        }
    });

    // 다이빙
    if(frame%Math.max(35,75-stage*4)===0) {
        const c=enemies.filter(e=>e.alive&&!e.diving&&e.entered);
        if(c.length>0){const d=c[Math.floor(Math.random()*c.length)];d.diving=true;d.diveTime=0;d.diveSpeed=2.5+Math.random()*1.5+stage*0.15;}
    }
    // 편대 발사
    if(frame%Math.max(25,55-stage*3)===0) {
        const s=enemies.filter(e=>e.alive&&!e.diving&&e.entered&&e.y<720*0.55);
        if(s.length>0){const sh=s[Math.floor(Math.random()*s.length)];enemyBullets.push({x:sh.x,y:sh.y+sh.height/2,vx:0,vy:3+stage*0.25,size:4});}
    }
}

function updateEnemyBullets() {
    enemyBullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;});
    enemyBullets=enemyBullets.filter(b=>b.y<740&&b.y>-10&&b.x>-10&&b.x<500);
}
function updateItems() { items.forEach(i=>{i.y+=i.vy;i.time++;}); items=items.filter(i=>i.y<740); }
function updateParticles() { particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.04;p.life--;}); particles=particles.filter(p=>p.life>0); }

// ============================================
// 충돌
// ============================================
function checkCollisions() {
    // 총알 vs 적/보스
    playerBullets.forEach(b=>{
        if(boss && boss.alive) {
            if(Math.abs(b.x-boss.x)<boss.width/2+5 && Math.abs(b.y-boss.y)<boss.height/2+5) {
                b.y=-100; boss.hp--; boss.flashTimer=12;
                sfx.hitEnemy();
                createExplosion(b.x,b.y,'#fff',3);
                if(boss.hp<=0) {
                    boss.alive=false;
                    score += 5000 + stage*1000;
                    totalKills++;
                    sfx.explodeBoss();
                    shakeTimer=25; shakeIntensity=10;
                    for(let i=0;i<40;i++) createExplosion(boss.x+(Math.random()-0.5)*60, boss.y+(Math.random()-0.5)*60, `hsl(${Math.random()*360},100%,60%)`,5);
                    damageNumbers.push({x:boss.x,y:boss.y,text:`BOSS +${5000+stage*1000}`,life:60,color:'#f0f'});
                }
            }
        }
        enemies.forEach(e=>{
            if(!e.alive||!e.entered) return;
            if(Math.abs(b.x-e.x)<(b.width+e.width)/2 && Math.abs(b.y-e.y)<(b.height+e.height)/2) {
                b.y=-100; e.hp--; e.flashTimer=5;
                if(e.hp<=0) {
                    e.alive=false; player.combo++; totalKills++;
                    if(player.combo>maxCombo) maxCombo=player.combo;
                    const bonus=Math.min(player.combo,10);
                    const pts=e.pts*bonus; score+=pts;
                    createExplosion(e.x,e.y,getEnemyColor(e.type),14);
                    if(e.type==='boss_e') sfx.explodeBoss(); else sfx.explodeEnemy();
                    if(player.combo>1) sfx.combo(player.combo);
                    damageNumbers.push({x:e.x,y:e.y,text:pts.toString(),life:35,color:'#ff0'});
                    if(Math.random()<0.15) dropItem(e.x,e.y);
                } else { sfx.hitEnemy(); createExplosion(b.x,b.y,'#fff',3); }
            }
        });
    });

    // 적 총알 vs 플레이어
    if(player.alive && player.invincible<=0) {
        enemyBullets.forEach(b=>{
            const dx=b.x-player.x, dy=b.y-player.y;
            if(Math.sqrt(dx*dx+dy*dy)<14) { b.y=800; playerHit(); }
        });
        enemies.forEach(e=>{
            if(!e.alive||!e.diving) return;
            if(Math.abs(e.x-player.x)<(e.width+player.width)/2 && Math.abs(e.y-player.y)<(e.height+player.height)/2) {
                e.alive=false; createExplosion(e.x,e.y,'#f80',10); playerHit();
            }
        });
    }

    // 아이템
    for(let i=items.length-1;i>=0;i--) {
        const it=items[i];
        if(Math.abs(it.x-player.x)<(it.width+player.width)/2 && Math.abs(it.y-player.y)<(it.height+player.height)/2) {
            applyItem(it.type); items.splice(i,1);
            for(let j=0;j<8;j++) particles.push({x:it.x,y:it.y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:20,maxLife:20,color:ITEM_TYPES[it.type].color,size:3});
        }
    }
}

function applyItem(type) {
    switch(type) {
        case 'POWER_UP': player.bulletLevel=Math.min(5,player.bulletLevel+1); sfx.powerUp();
            damageNumbers.push({x:player.x,y:player.y-30,text:'POWER UP!',life:45,color:'#f80'}); break;
        case 'SPEED_UP': player.speed=Math.min(8,player.speed+0.5); player.fireRate=Math.max(6,player.fireRate-1); sfx.itemPickup();
            damageNumbers.push({x:player.x,y:player.y-30,text:'SPEED UP!',life:45,color:'#0f0'}); break;
        case 'SHIELD': player.shieldHP=3; sfx.shield();
            damageNumbers.push({x:player.x,y:player.y-30,text:'SHIELD!',life:45,color:'#08f'}); break;
        case 'LIFE': lives=Math.min(5,lives+1); sfx.oneUp();
            damageNumbers.push({x:player.x,y:player.y-30,text:'1UP!',life:45,color:'#f0f'}); break;
    }
}

function playerHit() {
    if(player.shieldHP>0) { player.shieldHP--; shakeTimer=5; shakeIntensity=3; createExplosion(player.x,player.y,'#08f',8); sfx.shieldBlock(); return; }
    lives--; player.combo=0; shakeTimer=15; shakeIntensity=6;
    createExplosion(player.x,player.y,'#0ff',20); sfx.playerHit();
    if(lives<=0) {
        player.alive=false; gameState=STATE.GAMEOVER; sfx.stopBGM();
        if(score>highScore){highScore=score;localStorage.setItem('galagaHigh',highScore.toString());}
        sfx.gameOver();
        setTimeout(()=>showScoreScreen(),1500);
    } else { player.invincible=120; }
}

function checkWaveClear() {
    const allDead = enemies.filter(e=>e.alive).length===0 && (!boss || !boss.alive);
    if(!allDead) return;
    if(boss && !boss.alive) boss=null; // 보스 클리어
    gameState=STATE.STAGE_CLEAR; stageClearTimer=60; stageClearFireworks=[];
    enemyBullets=[]; items=[]; player.combo=0;
    player.bulletLevel=2; player.speed=5; player.fireRate=12; player.shieldHP=0;
    sfx.stageClear();
    score += stage*1000;
    for(let i=0;i<3;i++) setTimeout(()=>{if(gameState===STATE.STAGE_CLEAR)createFirework(80+Math.random()*320,80+Math.random()*250);},i*150);
}

// ============================================
// 스테이지 클리어 연출
// ============================================
function createFirework(x,y) {
    const hue=Math.random()*360, cnt=18+Math.floor(Math.random()*10);
    for(let i=0;i<cnt;i++){const a=(Math.PI*2/cnt)*i,sp=Math.random()*5+2;
        stageClearFireworks.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,life:45+Math.random()*25,maxLife:70,color:`hsl(${hue+Math.random()*40},100%,${50+Math.random()*30}%)`,size:Math.random()*3+2,trail:[]});}
}
function updateStageClear() {
    stageClearTimer--;
    stageClearFireworks.forEach(p=>{p.trail.push({x:p.x,y:p.y});if(p.trail.length>5)p.trail.shift();p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.vx*=0.98;p.life--;});
    stageClearFireworks=stageClearFireworks.filter(p=>p.life>0);
    if(stageClearTimer%15===0&&stageClearTimer>10) createFirework(60+Math.random()*360,60+Math.random()*200);
    if(stageClearTimer<=0){stage++;gameState=STATE.PLAYING;stageClearFireworks=[];sfx.playStageMusic(stage);spawnWave();}
}

function createExplosion(x,y,color,count=12) {
    for(let i=0;i<count;i++){const a=(Math.PI*2/count)*i+Math.random()*0.3,sp=Math.random()*4+1.5;
        particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:28+Math.random()*20,maxLife:48,color,size:Math.random()*4+2});}
}

// ============================================
// 렌더링
// ============================================
function render() {
    const scX=W/480, scY=H/720;
    ctx.save(); ctx.scale(scX,scY);
    if(shakeTimer>0){ctx.translate((Math.random()-0.5)*shakeIntensity,(Math.random()-0.5)*shakeIntensity);}

    // 배경
    ctx.fillStyle='#030308'; ctx.fillRect(0,0,480,720);
    bgParticles.forEach(p=>{const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);g.addColorStop(0,p.color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2);});
    stars.forEach(s=>{const a=(Math.sin(s.tw)*0.3+0.7)*(s.speed/2.5);ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.fillRect(s.x,s.y,s.size,s.size);});

    if(gameState===STATE.PLAYING||gameState===STATE.GAMEOVER||gameState===STATE.PAUSED) renderGame();
    if(gameState===STATE.STAGE_CLEAR) { renderStageClear(); drawHUD(); }
    if(gameState===STATE.BOSS_WARNING) renderBossWarning();
    if(gameState===STATE.PAUSED) renderPause();

    ctx.restore();
}

function renderBossWarning() {
    const alpha = Math.sin(frame*0.2)*0.3+0.7;
    ctx.globalAlpha=alpha;
    ctx.fillStyle='#f00'; ctx.font='bold 32px "Courier New"'; ctx.textAlign='center';
    ctx.shadowColor='#f00'; ctx.shadowBlur=20;
    ctx.fillText('⚠ WARNING ⚠',240,340);
    ctx.font='18px "Courier New"'; ctx.fillStyle='#ff0';
    ctx.fillText(`BOSS APPROACHING`,240,380);
    ctx.shadowBlur=0; ctx.globalAlpha=1;
    drawHUD();
}

function renderPause() {
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,480,720);
    ctx.fillStyle='#fff'; ctx.font='bold 28px "Courier New"'; ctx.textAlign='center';
    ctx.fillText('PAUSED',240,350);
    ctx.font='14px "Courier New"'; ctx.fillStyle='#aaa';
    ctx.fillText('Press P or tap ⏸ to resume',240,385);
}

function renderGame() {
    // 플레이어 총알 (레이저 빔)
    playerBullets.forEach(b=>{
        b.trail.forEach((t,i)=>{ctx.fillStyle=`rgba(0,200,255,${i/b.trail.length*0.3})`;ctx.fillRect(t.x-1,t.y-5,2,10);});
        ctx.shadowColor='#0ff';ctx.shadowBlur=8;
        const lg=ctx.createLinearGradient(b.x,b.y-7,b.x,b.y+7);
        lg.addColorStop(0,'#fff');lg.addColorStop(0.5,'#0ef');lg.addColorStop(1,'#06a');
        ctx.fillStyle=lg;ctx.fillRect(b.x-2,b.y-7,4,14);
        ctx.shadowBlur=0;
    });

    // 적
    enemies.forEach(e=>{if(!e.alive||!e.entered)return; drawEnemy(e);});

    // 보스
    if(boss && boss.alive) drawBoss();

    // 적 총알 (에너지 볼트)
    enemyBullets.forEach(b=>{
        ctx.shadowColor='#f44';ctx.shadowBlur=6;
        const grad=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.size);
        grad.addColorStop(0,'#fff');grad.addColorStop(0.4,'#f84');grad.addColorStop(1,'rgba(255,0,0,0)');
        ctx.fillStyle=grad;
        ctx.beginPath();ctx.arc(b.x,b.y,b.size+2,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#f44';ctx.beginPath();ctx.arc(b.x,b.y,b.size*0.6,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
    });

    // 아이템
    items.forEach(it=>{
        const info=ITEM_TYPES[it.type], bob=Math.sin(it.time*0.1)*3;
        ctx.save();ctx.translate(it.x,it.y+bob);
        ctx.shadowColor=info.color;ctx.shadowBlur=10;ctx.fillStyle=info.color;
        ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(info.label,0,1);ctx.shadowBlur=0;ctx.restore();
    });

    // 플레이어
    if(player.alive&&(player.invincible<=0||Math.floor(frame/3)%2===0)) drawPlayer();
    if(player.alive&&player.shieldHP>0){
        ctx.strokeStyle=`rgba(0,150,255,${0.4+Math.sin(frame*0.1)*0.2})`;ctx.lineWidth=2;
        ctx.shadowColor='#08f';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(player.x,player.y,22,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
    }

    // 파티클
    particles.forEach(p=>{ctx.globalAlpha=p.life/(p.maxLife||48);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=3;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);});
    ctx.globalAlpha=1;ctx.shadowBlur=0;

    // 데미지 넘버
    damageNumbers.forEach(d=>{ctx.globalAlpha=Math.min(1,d.life/30);ctx.fillStyle=d.color;ctx.font='bold 13px "Courier New"';ctx.textAlign='center';ctx.fillText(d.text,d.x,d.y);});
    ctx.globalAlpha=1;

    drawHUD();
}

function renderStageClear() {
    stageClearFireworks.forEach(p=>{
        p.trail.forEach((t,i)=>{ctx.globalAlpha=(i/p.trail.length)*(p.life/p.maxLife)*0.5;ctx.fillStyle=p.color;ctx.fillRect(t.x-p.size*0.3,t.y-p.size*0.3,p.size*0.6,p.size*0.6);});
        ctx.globalAlpha=p.life/p.maxLife;ctx.shadowColor=p.color;ctx.shadowBlur=6;ctx.fillStyle=p.color;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    const prog=1-(stageClearTimer/60), sc=Math.min(1,prog*4), al=stageClearTimer>10?1:stageClearTimer/10;
    ctx.save();ctx.translate(240,320);ctx.scale(sc,sc);ctx.globalAlpha=al;
    ctx.shadowColor='#ff0';ctx.shadowBlur=15;ctx.fillStyle='#ff0';ctx.font='bold 30px "Courier New"';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(`STAGE ${stage} CLEAR!`,0,0);
    ctx.shadowColor='#0ff';ctx.shadowBlur=8;ctx.fillStyle='#0ff';ctx.font='bold 18px "Courier New"';
    ctx.fillText(`+${stage*1000}`,0,38);
    ctx.shadowBlur=0;ctx.restore();ctx.globalAlpha=1;
    if(player.alive) drawPlayer();
}

// ============================================
// 그리기 함수들
// ============================================
function drawPlayer() {
    ctx.save();ctx.translate(player.x,player.y);
    // 엔진 글로우 (네온 블루 제트)
    const fh=8+Math.random()*6;
    const g=ctx.createLinearGradient(0,14,0,14+fh);
    g.addColorStop(0,'#fff');g.addColorStop(0.2,'#4df');g.addColorStop(0.6,'#08f');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(-5,14);ctx.lineTo(0,14+fh);ctx.lineTo(5,14);ctx.closePath();ctx.fill();
    // 보조 엔진
    ctx.beginPath();ctx.moveTo(-12,12);ctx.lineTo(-10,12+fh*0.6);ctx.lineTo(-8,12);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(8,12);ctx.lineTo(10,12+fh*0.6);ctx.lineTo(12,12);ctx.closePath();ctx.fill();

    // 본체 (미래형 전투기 - 각진 스텔스 디자인)
    ctx.shadowColor='#0af';ctx.shadowBlur=8;
    ctx.fillStyle='#1a2a3a';
    ctx.beginPath();
    ctx.moveTo(0,-20);ctx.lineTo(-4,-12);ctx.lineTo(-7,-2);ctx.lineTo(-6,8);ctx.lineTo(-4,14);
    ctx.lineTo(4,14);ctx.lineTo(6,8);ctx.lineTo(7,-2);ctx.lineTo(4,-12);ctx.closePath();ctx.fill();

    // 외장 아머 (밝은 라인)
    ctx.strokeStyle='#0cf';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(-4,-12);ctx.lineTo(-7,-2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(4,-12);ctx.lineTo(7,-2);ctx.stroke();

    // 날개 (삼각 델타윙)
    ctx.fillStyle='#0a1a2a';
    ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(-22,10);ctx.lineTo(-18,12);ctx.lineTo(-6,8);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(22,10);ctx.lineTo(18,12);ctx.lineTo(6,8);ctx.closePath();ctx.fill();
    // 날개 네온 라인
    ctx.strokeStyle='#08f';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(-22,10);ctx.stroke();
    ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(22,10);ctx.stroke();

    // 콕핏 (홀로그램 블루)
    const cg=ctx.createRadialGradient(0,-6,0,0,-6,5);
    cg.addColorStop(0,'#8ef');cg.addColorStop(0.7,'#06a');cg.addColorStop(1,'#024');
    ctx.fillStyle=cg;
    ctx.beginPath();ctx.ellipse(0,-6,3.5,5,0,0,Math.PI*2);ctx.fill();

    // 파워 레벨 표시 (윙팁 에너지)
    if(player.bulletLevel>=3){
        ctx.fillStyle=`hsl(${frame*3%360},100%,70%)`;
        ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=6;
        ctx.beginPath();ctx.arc(-20,10,2.5,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(20,10,2.5,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowBlur=0;ctx.restore();
}

function drawEnemy(e) {
    ctx.save();ctx.translate(e.x,e.y);
    const pulse=Math.sin(frame*0.08+e.baseX)*0.06+1, flash=e.flashTimer>0;
    ctx.scale(pulse,pulse);

    if(e.type==='boss_e'){
        // SF 드론 - 육각형 + 홀로그램 코어
        ctx.fillStyle=flash?'#fff':'#2a0a3a';
        ctx.shadowColor='#f0f';ctx.shadowBlur=8;
        ctx.beginPath();
        for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/2;ctx.lineTo(Math.cos(a)*14,Math.sin(a)*14);}
        ctx.closePath();ctx.fill();
        // 내부 에너지 코어
        ctx.fillStyle=flash?'#fff':`hsl(${280+Math.sin(frame*0.1)*20},100%,60%)`;
        ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();
        // 회전하는 링
        ctx.strokeStyle='rgba(200,0,255,0.5)';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.ellipse(0,0,12,5,frame*0.03,0,Math.PI*2);ctx.stroke();
        // HP바
        if(e.maxHp>1){ctx.fillStyle='#333';ctx.fillRect(-10,16,20,2.5);ctx.fillStyle='#f0f';ctx.fillRect(-10,16,20*(e.hp/e.maxHp),2.5);}
    } else if(e.type==='mid'){
        // SF 중형기 - 다이아몬드 + 에너지 날개
        ctx.fillStyle=flash?'#fff':'#1a1a0a';
        ctx.shadowColor='#f80';ctx.shadowBlur=6;
        ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(-10,0);ctx.lineTo(0,12);ctx.lineTo(10,0);ctx.closePath();ctx.fill();
        // 에너지 날개
        ctx.strokeStyle=flash?'#fff':'#f80';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(-16,-4);ctx.stroke();
        ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(16,-4);ctx.stroke();
        // 중앙 눈
        ctx.fillStyle=flash?'#fff':'#ff0';
        ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
    } else {
        // SF 소형 드론 - 삼각 + 추진기
        ctx.fillStyle=flash?'#fff':'#0a2a1a';
        ctx.shadowColor='#0f0';ctx.shadowBlur=5;
        ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(-9,6);ctx.lineTo(0,3);ctx.lineTo(9,6);ctx.closePath();ctx.fill();
        // 추진기 글로우
        ctx.fillStyle=flash?'#fff':'#4f4';
        ctx.beginPath();ctx.arc(-5,6,2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(5,6,2,0,Math.PI*2);ctx.fill();
        // 센서
        ctx.fillStyle='#8f8';
        ctx.beginPath();ctx.arc(0,-3,2,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowBlur=0;ctx.restore();
}

function drawBoss() {
    const b=boss;ctx.save();ctx.translate(b.x,b.y);
    const pulse=Math.sin(frame*0.05)*0.03+1, flash=b.flashTimer>0;
    ctx.scale(pulse,pulse);

    // SF 거대 전함 외형 (얼굴 주변 메카닉 프레임)
    // 외곽 메카닉 아머
    ctx.fillStyle='#0a0a1a';
    ctx.shadowColor=flash?'#f00':'#80f';ctx.shadowBlur=15;
    ctx.beginPath();
    ctx.moveTo(0,-42);ctx.lineTo(-25,-35);ctx.lineTo(-40,-15);ctx.lineTo(-45,5);
    ctx.lineTo(-40,30);ctx.lineTo(-25,42);ctx.lineTo(0,45);
    ctx.lineTo(25,42);ctx.lineTo(40,30);ctx.lineTo(45,5);
    ctx.lineTo(40,-15);ctx.lineTo(25,-35);ctx.closePath();ctx.fill();

    // 메카닉 디테일 라인
    ctx.strokeStyle=flash?'#f44':'#60f';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(-25,-35);ctx.lineTo(-20,-20);ctx.stroke();
    ctx.beginPath();ctx.moveTo(25,-35);ctx.lineTo(20,-20);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-40,-15);ctx.lineTo(-30,-5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(40,-15);ctx.lineTo(30,-5);ctx.stroke();
    // 에너지 도트
    ctx.fillStyle=`hsl(${frame*2%360},100%,60%)`;
    ctx.beginPath();ctx.arc(-35,5,3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(35,5,3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(-30,25,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(30,25,2,0,Math.PI*2);ctx.fill();

    // 얼굴 영역 (메카닉 프레임 안에 인간 얼굴)
    ctx.shadowBlur=0;

    // 짧은 머리카락
    ctx.fillStyle=flash?'#444':'#1a1a1a';
    ctx.beginPath();ctx.ellipse(0,-18,24,14,0,Math.PI+0.3,Math.PI*2-0.3);ctx.fill();
    ctx.beginPath();ctx.ellipse(-24,-5,5,12,0.2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(24,-5,5,12,-0.2,0,Math.PI*2);ctx.fill();

    // 얼굴
    ctx.fillStyle=flash?'#daa':'#f0c8a0';
    ctx.beginPath();ctx.ellipse(0,5,26,28,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=flash?'#c99':'#e8b890';
    ctx.beginPath();ctx.ellipse(0,26,18,8,0,0,Math.PI);ctx.fill();

    // 안경
    ctx.strokeStyle='#2a2a2a';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.ellipse(-9,-2,10,8,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(9,-2,10,8,0,0,Math.PI*2);ctx.stroke();
    ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-1,-3);ctx.quadraticCurveTo(0,-5,1,-3);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-19,-3);ctx.lineTo(-25,-5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(19,-3);ctx.lineTo(25,-5);ctx.stroke();

    if(!flash) {
        // 평소: 웃는 눈
        ctx.fillStyle='#111';
        ctx.beginPath();ctx.ellipse(-9,-2,3,2.2,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(9,-2,3,2.2,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';
        ctx.beginPath();ctx.arc(-7.5,-3,1.2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(10.5,-3,1.2,0,Math.PI*2);ctx.fill();
        // 웃는 입
        ctx.fillStyle='#c06040';
        ctx.beginPath();ctx.moveTo(-13,16);ctx.quadraticCurveTo(-6,24,0,24);ctx.quadraticCurveTo(6,24,13,16);ctx.quadraticCurveTo(6,19,0,19);ctx.quadraticCurveTo(-6,19,-13,16);ctx.fill();
        ctx.fillStyle='#fff';ctx.fillRect(-9,16,18,5);
        ctx.fillStyle='#b05040';ctx.beginPath();ctx.moveTo(-11,21);ctx.quadraticCurveTo(0,27,11,21);ctx.quadraticCurveTo(0,24,-11,21);ctx.fill();
    } else {
        // 피격: 아픈 표정
        ctx.strokeStyle='#f00';ctx.lineWidth=2.5;
        ctx.beginPath();ctx.moveTo(-12,-5);ctx.lineTo(-6,1);ctx.stroke();
        ctx.beginPath();ctx.moveTo(-6,-5);ctx.lineTo(-12,1);ctx.stroke();
        ctx.beginPath();ctx.moveTo(6,-5);ctx.lineTo(12,1);ctx.stroke();
        ctx.beginPath();ctx.moveTo(12,-5);ctx.lineTo(6,1);ctx.stroke();
        // 찡그린 입
        ctx.strokeStyle='#a04030';ctx.lineWidth=2.5;
        ctx.beginPath();ctx.moveTo(-11,18);ctx.quadraticCurveTo(-5,22,0,18);ctx.quadraticCurveTo(5,14,11,18);ctx.stroke();
        // 땀
        ctx.fillStyle='rgba(100,180,255,0.7)';
        ctx.beginPath();ctx.ellipse(22,-8,2.5,3.5,0.3,0,Math.PI*2);ctx.fill();
    }

    // 볼 홍조
    ctx.fillStyle='rgba(255,120,100,0.15)';
    ctx.beginPath();ctx.ellipse(-18,10,6,5,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(18,10,6,5,0,0,Math.PI*2);ctx.fill();

    // 코
    ctx.fillStyle=flash?'#daa':'#e0b080';
    ctx.beginPath();ctx.ellipse(0,7,5,4,0,0,Math.PI*2);ctx.fill();

    // 회전하는 에너지 링 (SF 요소)
    ctx.strokeStyle=`hsla(${frame*3%360},100%,60%,0.4)`;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(0,0,42,20,frame*0.02,0,Math.PI*2);ctx.stroke();

    // HP바
    ctx.fillStyle='#222';ctx.fillRect(-42,48,84,5);
    const hpRatio=b.hp/b.maxHp;
    ctx.fillStyle=hpRatio>0.5?'#0f0':hpRatio>0.25?'#ff0':'#f00';
    ctx.fillRect(-42,48,84*hpRatio,5);
    // HP바 프레임
    ctx.strokeStyle='#666';ctx.lineWidth=1;ctx.strokeRect(-42,48,84,5);

    ctx.restore();
}

// ============================================
// HUD
// ============================================
function drawHUD() {
    ctx.fillStyle='#fff';ctx.font='bold 13px "Courier New"';ctx.textAlign='left';
    ctx.fillText(`SCORE ${score.toString().padStart(8,'0')}`,8,18);
    ctx.textAlign='center';ctx.fillStyle='#aaa';ctx.fillText(`HIGH ${highScore.toString().padStart(8,'0')}`,240,18);
    ctx.textAlign='right';ctx.fillStyle='#ff0';ctx.fillText(`STAGE ${stage}`,472,18);
    // 라이프
    for(let i=0;i<lives;i++){ctx.fillStyle='#0cf';ctx.beginPath();ctx.moveTo(18+i*20,708);ctx.lineTo(12+i*20,716);ctx.lineTo(24+i*20,716);ctx.closePath();ctx.fill();}
    // 파워
    ctx.textAlign='right';ctx.fillStyle='#f80';ctx.font='11px "Courier New"';ctx.fillText(`PWR Lv.${player.bulletLevel}`,472,714);
    if(player.shieldHP>0){ctx.textAlign='left';ctx.fillStyle='#08f';ctx.fillText(`🛡x${player.shieldHP}`,90,714);}
    // 콤보
    if(player.combo>1){ctx.textAlign='center';ctx.fillStyle=`hsl(${frame*5%360},100%,70%)`;ctx.font='bold 14px "Courier New"';ctx.fillText(`${player.combo} COMBO!`,240,42);}
    // 보스 스테이지 표시
    if(stage%5===0&&boss&&boss.alive){ctx.textAlign='center';ctx.fillStyle='#f44';ctx.font='bold 11px "Courier New"';ctx.fillText('★ BOSS BATTLE ★',240,32);}
}

// ============================================
// 스코어보드 (온라인 공유 + 로컬 백업)
// jsonblob.com 무료 API (키 불필요)
// ============================================
const BLOB_ID = 'galaga-supreme-scores';
const BLOB_URL = 'https://jsonblob.com/api/jsonBlob';
let onlineBlobId = localStorage.getItem('galagaBlobId') || '';

function getToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function getLocalScores(){try{return JSON.parse(localStorage.getItem('galagaScores')||'[]');}catch{return[];}}
function saveLocalScores(s){localStorage.setItem('galagaScores',JSON.stringify(s));}

// 온라인 점수 가져오기
async function fetchOnlineScores() {
    if(!onlineBlobId) return null;
    try {
        const res = await fetch(`${BLOB_URL}/${onlineBlobId}`, {
            headers: {'Content-Type':'application/json','Accept':'application/json'}
        });
        if(res.ok) { const data = await res.json(); return data.scores || []; }
    } catch(e) {}
    return null;
}

// 온라인 점수 저장 (최초 생성 또는 업데이트)
async function pushOnlineScore(newEntry) {
    try {
        let scores = await fetchOnlineScores();
        if(!scores) scores = getLocalScores();
        scores.push(newEntry);
        scores.sort((a,b)=>b.score-a.score);
        if(scores.length > 200) scores.length = 200;
        const body = JSON.stringify({scores});

        if(!onlineBlobId) {
            // 최초 생성
            const res = await fetch(BLOB_URL, {
                method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body
            });
            if(res.ok) {
                const loc = res.headers.get('Location') || res.headers.get('location');
                if(loc) { onlineBlobId = loc.split('/').pop(); localStorage.setItem('galagaBlobId', onlineBlobId); }
            }
        } else {
            // 업데이트
            await fetch(`${BLOB_URL}/${onlineBlobId}`, {
                method:'PUT', headers:{'Content-Type':'application/json','Accept':'application/json'}, body
            });
        }
        return scores;
    } catch(e) { return null; }
}

function showScoreScreen() {
    const el=document.getElementById('score-screen');
    document.getElementById('final-score').textContent=`SCORE: ${score.toLocaleString()} | STAGE ${stage} | KILLS ${totalKills} | MAX COMBO ${maxCombo}`;
    document.getElementById('name-input-area').style.display='block';
    document.getElementById('player-name').value=localStorage.getItem('galagaLastName')||'';
    renderLeaderboards();
    el.style.display='block';
    setTimeout(()=>document.getElementById('player-name').focus(),100);
}
function hideScoreScreen(){document.getElementById('score-screen').style.display='none';}

async function saveScore() {
    const name=document.getElementById('player-name').value.trim()||'???';
    localStorage.setItem('galagaLastName',name);
    const entry = {name,score,stage,kills:totalKills,combo:maxCombo,date:getToday()};

    // 로컬 저장
    const local=getLocalScores();
    local.push(entry);
    local.sort((a,b)=>b.score-a.score);
    if(local.length>200)local.length=200;
    saveLocalScores(local);

    document.getElementById('name-input-area').style.display='none';
    document.getElementById('save-score-btn').textContent='저장중...';

    // 온라인 저장
    const online = await pushOnlineScore(entry);
    if(online) {
        saveLocalScores(online); // 온라인 데이터로 로컬 동기화
    }
    document.getElementById('save-score-btn').textContent='저장';
    renderLeaderboards();
}

async function renderLeaderboards() {
    const today=getToday();
    // 온라인 점수 시도, 실패 시 로컬
    let scores = await fetchOnlineScores();
    if(!scores) scores = getLocalScores();
    else saveLocalScores(scores); // 온라인 성공 시 로컬 동기화

    const todayS=scores.filter(s=>s.date===today).sort((a,b)=>b.score-a.score).slice(0,20);
    const allS=[...scores].sort((a,b)=>b.score-a.score).slice(0,20);
    document.getElementById('today-scores').innerHTML=todayS.length===0?'<span style="color:#666">기록 없음</span>':
        todayS.map((s,i)=>`<div style="color:${i===0?'#ff0':'#ccc'}">${i+1}. ${s.name} ${s.score.toLocaleString()} (S${s.stage})</div>`).join('');
    document.getElementById('all-scores').innerHTML=allS.length===0?'<span style="color:#666">기록 없음</span>':
        allS.map((s,i)=>`<div style="color:${i===0?'#ff0':'#ccc'}">${i+1}. ${s.name} ${s.score.toLocaleString()} (S${s.stage})</div>`).join('');
}

// 타이틀 화면에 스코어 표시
async function showTitleScores() {
    let scores = await fetchOnlineScores();
    if(!scores) scores = getLocalScores();
    const top5 = [...scores].sort((a,b)=>b.score-a.score).slice(0,5);
    const el = document.getElementById('title-scores');
    if(el) {
        el.innerHTML = top5.length===0 ? '' :
            '<div style="margin-top:10px;color:#f80;font-size:11px;">🏆 TOP SCORES</div>' +
            top5.map((s,i)=>`<div style="color:${i===0?'#ff0':'#aaa'};font-size:11px;">${i+1}. ${s.name} - ${s.score.toLocaleString()}</div>`).join('');
    }
}

// ============================================
// 유틸리티
// ============================================
function toggleMute(){const m=sfx.toggleMute();document.getElementById('mute-btn').textContent=m?'🔇':'🔊';}
document.getElementById('player-name').addEventListener('keydown',e=>{if(e.code==='Enter'){e.preventDefault();saveScore();}});

// ============================================
// 게임 루프
// ============================================
function gameLoop(){update();render();requestAnimationFrame(gameLoop);}
uiOverlay.style.display='block';
showTitleScores(); // 타이틀에 스코어 표시
gameLoop();
