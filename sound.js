// ============================================
// GRADIUS TRIBUTE - Sound Engine
// 스테이지별 순차 BGM + 보스/게임오버 전용 BGM
// ============================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.muted = false;
        this.masterVolume = 0.35;
        this.bgmPlaying = false;
        this.bgmAudio = null;
        this.currentTrackIndex = -1;

        // BGM 트랙 목록 (스테이지용 - 순차 재생)
        this.stageTracks = [
            'bgm/stage1.mp3',
            'bgm/stage2.mp3',
            'bgm/stage3.mp3',
            'bgm/stage4.mp3',
            'bgm/stage5.mp3',
            'bgm/stage6.mp3',
            'bgm/stage7.mp3',
            'bgm/stage8.mp3'
        ];
        this.bossTrack = 'bgm/boss.mp3';
        this.bossFinalTrack = 'bgm/boss_final.mp3';
        this.gameoverTrack = 'bgm/gameover.mp3';
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch(e) {}
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    // ============================================
    // BGM 관리
    // ============================================
    startBGM(file, loop = true) {
        if (this.muted) return;
        this.stopBGM();
        this.bgmPlaying = true;
        this.bgmAudio = new Audio(file);
        this.bgmAudio.volume = 0.45;
        this.bgmAudio.loop = loop;
        this.bgmAudio.play().catch(() => { this.bgmAudio = null; });
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            this.bgmAudio = null;
        }
    }

    // 스테이지 번호에 따라 순차적으로 BGM 재생
    playStageMusic(stageNum) {
        // 스테이지 번호를 0-based index로 변환, 트랙 수를 넘으면 순환
        const idx = (stageNum - 1) % this.stageTracks.length;
        this.currentTrackIndex = idx;
        this.startBGM(this.stageTracks[idx]);
    }

    // 보스전 BGM
    playBossMusic(isFinalBoss = false) {
        if (isFinalBoss) {
            this.startBGM(this.bossFinalTrack);
        } else {
            this.startBGM(this.bossTrack);
        }
    }

    // 게임오버 BGM (루프 안 함)
    playGameOverMusic() {
        this.startBGM(this.gameoverTrack, false);
    }

    // ============================================
    // 톤 생성 유틸리티
    // ============================================
    playTone(freq, dur, type = 'square', vol = 0.3, delay = 0) {
        if (!this.initialized || this.muted) return;
        const c = this.ctx, now = c.currentTime + delay;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(vol * this.masterVolume, now);
        g.gain.setValueAtTime(vol * this.masterVolume, now + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        o.connect(g); g.connect(c.destination);
        o.start(now); o.stop(now + dur);
    }

    playSlide(f1, f2, dur, type = 'square', vol = 0.3) {
        if (!this.initialized || this.muted) return;
        const c = this.ctx, now = c.currentTime;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f1, now);
        o.frequency.exponentialRampToValueAtTime(f2, now + dur);
        g.gain.setValueAtTime(vol * this.masterVolume, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        o.connect(g); g.connect(c.destination);
        o.start(now); o.stop(now + dur);
    }

    playNoise(dur, vol = 0.25) {
        if (!this.initialized || this.muted) return;
        const c = this.ctx, now = c.currentTime;
        const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const n = c.createBufferSource(); n.buffer = buf;
        const g = c.createGain(), f = c.createBiquadFilter();
        g.gain.setValueAtTime(vol * this.masterVolume, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        f.type = 'lowpass';
        f.frequency.setValueAtTime(1500, now);
        f.frequency.exponentialRampToValueAtTime(80, now + dur);
        n.connect(f); f.connect(g); g.connect(c.destination);
        n.start(now); n.stop(now + dur);
    }

    playPiano(freq, dur, vol = 0.25, delay = 0) {
        if (!this.initialized || this.muted) return;
        const c = this.ctx, now = c.currentTime + delay;
        const v = vol * this.masterVolume;
        const o1 = c.createOscillator();
        o1.type = 'triangle';
        o1.frequency.setValueAtTime(freq, now);
        const masterGain = c.createGain();
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(v, now + 0.008);
        masterGain.gain.linearRampToValueAtTime(v * 0.65, now + 0.04);
        masterGain.gain.setValueAtTime(v * 0.65, now + dur * 0.5);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.15);
        o1.connect(masterGain);
        masterGain.connect(c.destination);
        o1.start(now); o1.stop(now + dur + 0.2);
    }

    // ============================================
    // SFX
    // ============================================
    shoot() { this.playSlide(880, 440, 0.06, 'triangle', 0.08); }
    shootLaser() { this.playTone(220, 0.15, 'sawtooth', 0.12); this.playSlide(440, 880, 0.08, 'sine', 0.06); }
    shootMissile() { this.playSlide(200, 100, 0.1, 'square', 0.1); this.playNoise(0.05, 0.08); }
    hitEnemy() { this.playSlide(300, 700, 0.06, 'square', 0.1); }
    explodeEnemy() { this.playNoise(0.15, 0.18); this.playSlide(400, 800, 0.06, 'square', 0.12); }
    explodeBoss() {
        this.playNoise(0.5, 0.35);
        this.playSlide(150, 600, 0.15, 'sawtooth', 0.2);
        this.playTone(80, 0.4, 'sine', 0.25);
        setTimeout(() => { if (!this.muted && this.initialized) { this.playNoise(0.3, 0.2); } }, 150);
        setTimeout(() => { if (!this.muted && this.initialized) { this.playNoise(0.2, 0.15); } }, 350);
    }
    playerHit() { this.playSlide(600, 80, 0.3, 'square', 0.2); this.playNoise(0.2, 0.15); }
    powerUp() {
        if (!this.initialized || this.muted) return;
        [523, 659, 784, 1047].forEach((f, i) => this.playPiano(f, 0.1, 0.2, i * 0.05));
    }
    getCapsule() { this.playSlide(600, 1200, 0.08, 'sine', 0.15); }
    shieldBlock() { this.playSlide(800, 400, 0.07, 'triangle', 0.12); }
    oneUp() {
        if (!this.initialized || this.muted) return;
        [262, 330, 392, 523, 659, 784].forEach((f, i) => this.playPiano(f, 0.12, 0.2, i * 0.06));
    }
    stageClear() {
        if (!this.initialized || this.muted) return;
        [[523,0.15],[659,0.15],[784,0.15],[1047,0.2],[784,0.15],[1047,0.25],[1319,0.35]]
            .reduce((t, [f, d]) => { this.playPiano(f, d, 0.3, t); return t + d * 0.8; }, 0);
    }
    gameStart() {
        if (!this.initialized || this.muted) return;
        [[330,0.1],[330,0.1],[330,0.12],[262,0.1],[330,0.12],[392,0.2]]
            .reduce((t, [f, d]) => { this.playPiano(f, d, 0.25, t); return t + d + 0.02; }, 0);
    }
    bossWarning() {
        if (!this.initialized || this.muted) return;
        for (let i = 0; i < 4; i++) {
            this.playTone(120, 0.15, 'square', 0.2, i * 0.3);
            this.playTone(180, 0.1, 'square', 0.15, i * 0.3 + 0.15);
        }
    }
    combo(n) { this.playPiano(400 + Math.min(n, 12) * 80, 0.08, 0.12); }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) { this.stopBGM(); }
        else if (typeof gameState !== 'undefined' && gameState === 1) { /* resume handled by caller */ }
        if (this.bgmAudio) this.bgmAudio.muted = this.muted;
        return this.muted;
    }
}

const sfx = new SoundEngine();
