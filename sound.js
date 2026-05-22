// ============================================
// GALAGA SUPREME - Sound Engine (Mario Style)
// ============================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.muted = false;
        this.masterVolume = 0.3;
        this.bgmPlaying = false;
        this.bgmNodes = [];
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
    playTone(freq, dur, type='square', vol=0.3, delay=0) {
        if (!this.initialized || this.muted) return;
        const c = this.ctx, now = c.currentTime + delay;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(vol * this.masterVolume, now);
        g.gain.setValueAtTime(vol * this.masterVolume, now + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        o.connect(g); g.connect(c.destination);
        o.start(now); o.stop(now + dur);
    }
    playSlide(f1, f2, dur, type='square', vol=0.3) {
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
    playNoise(dur, vol=0.3) {
        if (!this.initialized || this.muted) return;
        const c = this.ctx, now = c.currentTime;
        const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const n = c.createBufferSource(); n.buffer = buf;
        const g = c.createGain();
        g.gain.setValueAtTime(vol * this.masterVolume, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(2000, now);
        f.frequency.exponentialRampToValueAtTime(100, now + dur);
        n.connect(f); f.connect(g); g.connect(c.destination);
        n.start(now); n.stop(now + dur);
    }

    // BGM - 마리오풍 루프 멜로디
    startBGM() {
        if (!this.initialized || this.muted || this.bgmPlaying) return;
        this.bgmPlaying = true;
        this._playBGMLoop();
    }
    stopBGM() { this.bgmPlaying = false; }
    _playBGMLoop() {
        if (!this.bgmPlaying || this.muted) return;
        // 마리오풍 베이스라인 + 멜로디
        const melody = [
            [330,0.12],[330,0.12],[0,0.06],[330,0.12],[0,0.06],[262,0.12],[330,0.12],[0,0.06],
            [392,0.2],[0,0.1],[196,0.2],[0,0.15],
            [262,0.12],[0,0.06],[196,0.12],[0,0.06],[165,0.12],[0,0.06],
            [220,0.12],[0,0.06],[247,0.12],[0,0.06],[233,0.06],[220,0.12],[0,0.06],
            [196,0.1],[330,0.1],[392,0.1],[440,0.12],[0,0.06],[349,0.1],[392,0.1],[0,0.06],
            [330,0.12],[0,0.06],[262,0.1],[294,0.1],[247,0.12],[0,0.15]
        ];
        let t = 0;
        melody.forEach(([freq, dur]) => {
            if (freq > 0) this.playTone(freq, dur * 0.9, 'square', 0.12, t);
            t += dur;
        });
        // 베이스
        const bass = [
            [131,0.2],[165,0.2],[196,0.2],[165,0.2],
            [131,0.2],[165,0.2],[196,0.2],[220,0.2],
            [175,0.2],[196,0.2],[220,0.2],[196,0.2],
            [131,0.2],[165,0.2],[196,0.2],[165,0.2]
        ];
        let tb = 0;
        bass.forEach(([freq, dur]) => {
            this.playTone(freq, dur * 0.8, 'triangle', 0.08, tb);
            tb += dur;
        });
        setTimeout(() => this._playBGMLoop(), t * 1000);
    }

    // SFX
    shoot() { this.playSlide(900, 400, 0.06, 'square', 0.1); }
    shootPower() { this.playSlide(1100, 500, 0.05, 'square', 0.08); this.playSlide(800, 400, 0.05, 'square', 0.06); }
    hitEnemy() { this.playSlide(300, 600, 0.07, 'square', 0.15); }
    explodeEnemy() { this.playSlide(400, 800, 0.06, 'square', 0.18); this.playTone(200, 0.12, 'triangle', 0.12); }
    explodeBoss() {
        this.playNoise(0.4, 0.3); this.playSlide(200, 800, 0.1, 'square', 0.2);
        setTimeout(() => { if(!this.muted&&this.initialized) { this.playSlide(600,1200,0.1,'square',0.18); this.playTone(80,0.3,'triangle',0.2); }}, 120);
    }
    playerHit() { this.playSlide(600, 100, 0.25, 'square', 0.25); this.playTone(150, 0.25, 'triangle', 0.18); }
    itemPickup() { if(!this.initialized||this.muted)return; this.playTone(988,0.07,'square',0.2); this.playTone(1319,0.12,'square',0.2,0.07); }
    powerUp() { if(!this.initialized||this.muted)return; [523,659,784,1047,1319,1568].forEach((f,i)=>this.playTone(f,0.07,'square',0.18,i*0.05)); }
    shield() { if(!this.initialized||this.muted)return; [392,523,659,784,659,784,1047].forEach((f,i)=>this.playTone(f,0.06,'square',0.15,i*0.04)); }
    oneUp() { if(!this.initialized||this.muted)return; [262,330,392,523,659,784].forEach((f,i)=>this.playTone(f,0.1,'triangle',0.2,i*0.07)); }
    stageClear() {
        if(!this.initialized||this.muted)return;
        [[523,0.1],[659,0.1],[784,0.1],[1047,0.15],[784,0.1],[1047,0.2],[1319,0.25]].reduce((t,[f,d])=>{this.playTone(f,d,'square',0.2,t);return t+d*0.8;},0);
    }
    gameOver() {
        if(!this.initialized||this.muted)return;
        [[494,0.2],[440,0.2],[392,0.2],[330,0.3],[262,0.15],[220,0.4]].reduce((t,[f,d])=>{this.playTone(f,d,'triangle',0.22,t);return t+d+0.05;},0);
    }
    gameStart() {
        if(!this.initialized||this.muted)return;
        [[330,0.08],[330,0.08],[330,0.1],[262,0.08],[330,0.1],[392,0.18]].reduce((t,[f,d])=>{this.playTone(f,d,'square',0.18,t);return t+d+0.02;},0);
    }
    bossWarning() {
        if(!this.initialized||this.muted)return;
        for(let i=0;i<4;i++) { this.playTone(150,0.15,'square',0.2,i*0.3); this.playTone(200,0.1,'square',0.15,i*0.3+0.15); }
    }
    combo(n) { this.playTone(400+Math.min(n,12)*80,0.05,'square',0.1); this.playTone((400+Math.min(n,12)*80)*1.5,0.03,'square',0.07,0.03); }
    shieldBlock() { this.playSlide(800,400,0.07,'square',0.18); this.playTone(600,0.08,'triangle',0.12); }
    toggleMute() { this.muted=!this.muted; if(this.muted)this.bgmPlaying=false; return this.muted; }
}
const sfx = new SoundEngine();
