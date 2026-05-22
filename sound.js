// ============================================
// GALAGA Sound System - Super Mario Style
// Web Audio API 레트로 사운드
// ============================================

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.muted = false;
        this.masterVolume = 0.35;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, duration, type = 'square', volume = 0.3, delay = 0) {
        if (!this.initialized || this.muted) return;
        const ctx = this.ctx;
        const now = ctx.currentTime + delay;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(volume * this.masterVolume, now);
        gain.gain.setValueAtTime(volume * this.masterVolume, now + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    playSlide(startFreq, endFreq, duration, type = 'square', volume = 0.3) {
        if (!this.initialized || this.muted) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        gain.gain.setValueAtTime(volume * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    playNoise(duration, volume = 0.3) {
        if (!this.initialized || this.muted) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + duration);
    }

    // ============================================
    // 슈퍼마리오 스타일 사운드 이펙트
    // ============================================

    // 플레이어 발사 - 마리오 파이어볼 느낌
    shoot() {
        this.playSlide(900, 400, 0.07, 'square', 0.12);
    }

    // 파워업 발사
    shootPower() {
        this.playSlide(1100, 500, 0.06, 'square', 0.1);
        this.playSlide(800, 400, 0.06, 'square', 0.08);
    }

    // 적 피격 - 마리오 밟기 느낌
    hitEnemy() {
        this.playSlide(300, 600, 0.08, 'square', 0.2);
    }

    // 적 파괴 - 마리오 적 처치
    explodeEnemy() {
        this.playSlide(400, 800, 0.06, 'square', 0.2);
        this.playTone(200, 0.15, 'triangle', 0.15);
    }

    // 보스 파괴 - 쿠파 처치 느낌
    explodeBoss() {
        this.playSlide(200, 800, 0.1, 'square', 0.25);
        this.playNoise(0.3, 0.2);
        setTimeout(() => {
            if (!this.muted && this.initialized) {
                this.playSlide(600, 1200, 0.1, 'square', 0.2);
                this.playTone(100, 0.2, 'triangle', 0.2);
            }
        }, 120);
    }

    // 플레이어 피격 - 마리오 데미지
    playerHit() {
        this.playSlide(600, 100, 0.3, 'square', 0.3);
        this.playTone(150, 0.3, 'triangle', 0.2);
    }

    // 아이템 획득 - 마리오 코인 느낌
    itemPickup() {
        if (!this.initialized || this.muted) return;
        this.playTone(988, 0.08, 'square', 0.25);
        this.playTone(1319, 0.15, 'square', 0.25, 0.08);
    }

    // 파워업 획득 - 마리오 파워업 (버섯)
    powerUp() {
        if (!this.initialized || this.muted) return;
        const notes = [523, 659, 784, 1047, 1319, 1568];
        notes.forEach((freq, i) => {
            this.playTone(freq, 0.08, 'square', 0.2, i * 0.06);
        });
    }

    // 실드 획득 - 마리오 스타 시작 느낌
    shield() {
        if (!this.initialized || this.muted) return;
        const notes = [392, 523, 659, 784, 659, 784, 1047];
        notes.forEach((freq, i) => {
            this.playTone(freq, 0.07, 'square', 0.18, i * 0.05);
        });
    }

    // 1UP - 마리오 1UP 사운드
    oneUp() {
        if (!this.initialized || this.muted) return;
        const notes = [330, 392, 523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            this.playTone(freq, 0.12, 'triangle', 0.25, i * 0.08);
        });
    }

    // 스테이지 클리어 - 마리오 스테이지 클리어 멜로디
    stageClear() {
        if (!this.initialized || this.muted) return;
        // 도솔미도(높)솔미 - 마리오 깃발 느낌
        const notes = [
            [523, 0.1], [659, 0.1], [784, 0.1],
            [1047, 0.15], [784, 0.1], [1047, 0.2],
            [1319, 0.3]
        ];
        let t = 0;
        notes.forEach(([freq, dur]) => {
            this.playTone(freq, dur, 'square', 0.22, t);
            t += dur * 0.8;
        });
    }

    // 게임 오버 - 마리오 게임오버 느낌
    gameOver() {
        if (!this.initialized || this.muted) return;
        const notes = [
            [494, 0.2], [440, 0.2], [392, 0.2],
            [330, 0.3], [262, 0.15], [220, 0.4]
        ];
        let t = 0;
        notes.forEach(([freq, dur]) => {
            this.playTone(freq, dur, 'triangle', 0.25, t);
            t += dur + 0.05;
        });
    }

    // 게임 시작 - 마리오 시작 팡파레
    gameStart() {
        if (!this.initialized || this.muted) return;
        const notes = [
            [330, 0.08], [330, 0.08], [330, 0.12],
            [262, 0.08], [330, 0.12], [392, 0.2]
        ];
        let t = 0;
        notes.forEach(([freq, dur]) => {
            this.playTone(freq, dur, 'square', 0.2, t);
            t += dur + 0.03;
        });
    }

    // 콤보 - 점점 높아지는 음
    combo(count) {
        const freq = 500 + Math.min(count, 10) * 100;
        this.playTone(freq, 0.06, 'square', 0.12);
        this.playTone(freq * 1.5, 0.04, 'square', 0.08, 0.04);
    }

    // 실드 피격 - 블록 부딪히는 느낌
    shieldBlock() {
        this.playSlide(800, 400, 0.08, 'square', 0.2);
        this.playTone(600, 0.1, 'triangle', 0.15);
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}

// 전역 사운드 엔진
const sfx = new SoundEngine();
