// ============================================
// GALAGA SUPREME - Sound Engine
// 실제 클래식 MP3 BGM + 고품질 SFX
// ============================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.muted = false;
        this.masterVolume = 0.35;
        this.bgmPlaying = false;
        this.bgmTimeout = null;
        this.currentTrack = -1;
        this.bgmAudio = null; // HTML5 Audio for MP3 BGM
    }
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch(e) {}
    }
    resume() { if(this.ctx&&this.ctx.state==='suspended') this.ctx.resume(); }

    // 고품질 피아노 톤 (ADSR 엔벨로프 + 하모닉스)
    // 고품질 피아노 톤 (풍부한 하모닉스 + 리버브 + 코러스)
    playPiano(freq, dur, vol=0.25, delay=0) {
        if(!this.initialized||this.muted) return;
        const c=this.ctx, now=c.currentTime+delay;
        const v = vol * this.masterVolume;

        // 메인 오실레이터 (삼각파 기본음)
        const o1=c.createOscillator();
        o1.type='triangle'; o1.frequency.setValueAtTime(freq, now);

        // 하모닉스 (2배음, 3배음, 4배음, 5배음)
        const harmonics = [
            {ratio:2, vol:0.25, type:'sine'},
            {ratio:3, vol:0.12, type:'sine'},
            {ratio:4, vol:0.06, type:'sine'},
            {ratio:5, vol:0.03, type:'sine'}
        ];
        const oscNodes = [o1];
        const hGains = [];

        harmonics.forEach(h => {
            const o=c.createOscillator(), hg=c.createGain();
            o.type=h.type; o.frequency.setValueAtTime(freq*h.ratio, now);
            hg.gain.setValueAtTime(h.vol, now);
            hg.gain.exponentialRampToValueAtTime(0.001, now+dur*0.8);
            o.connect(hg);
            oscNodes.push(o);
            hGains.push(hg);
        });

        // 마스터 게인 (ADSR 엔벨로프)
        const masterGain=c.createGain();
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(v, now+0.008); // 빠른 어택
        masterGain.gain.linearRampToValueAtTime(v*0.65, now+0.04); // 디케이
        masterGain.gain.setValueAtTime(v*0.65, now+dur*0.5); // 서스테인
        masterGain.gain.exponentialRampToValueAtTime(0.001, now+dur+0.15); // 릴리즈 (여운)

        // 코러스 효과 (약간의 디튠)
        const o1b=c.createOscillator();
        o1b.type='triangle'; o1b.frequency.setValueAtTime(freq*1.002, now);
        const chorusGain=c.createGain(); chorusGain.gain.setValueAtTime(0.15,now);

        // 리버브 (멀티 딜레이)
        const del1=c.createDelay(); del1.delayTime.setValueAtTime(0.06,now);
        const dg1=c.createGain(); dg1.gain.setValueAtTime(0.12,now);
        const del2=c.createDelay(); del2.delayTime.setValueAtTime(0.12,now);
        const dg2=c.createGain(); dg2.gain.setValueAtTime(0.06,now);

        // 연결
        o1.connect(masterGain);
        hGains.forEach(hg=>hg.connect(masterGain));
        o1b.connect(chorusGain); chorusGain.connect(masterGain);

        masterGain.connect(c.destination);
        masterGain.connect(del1); del1.connect(dg1); dg1.connect(c.destination);
        masterGain.connect(del2); del2.connect(dg2); dg2.connect(c.destination);

        // 시작/정지
        const endTime = now+dur+0.2;
        oscNodes.forEach(o=>{o.start(now);o.stop(endTime);});
        o1b.start(now); o1b.stop(endTime);
    }

    // 일반 톤 (SFX용)
    playTone(freq, dur, type='square', vol=0.3, delay=0) {
        if(!this.initialized||this.muted) return;
        const c=this.ctx, now=c.currentTime+delay;
        const o=c.createOscillator(), g=c.createGain();
        o.type=type; o.frequency.setValueAtTime(freq,now);
        g.gain.setValueAtTime(vol*this.masterVolume,now);
        g.gain.setValueAtTime(vol*this.masterVolume,now+dur*0.6);
        g.gain.exponentialRampToValueAtTime(0.001,now+dur);
        o.connect(g); g.connect(c.destination); o.start(now); o.stop(now+dur);
    }
    playSlide(f1,f2,dur,type='square',vol=0.3) {
        if(!this.initialized||this.muted) return;
        const c=this.ctx, now=c.currentTime;
        const o=c.createOscillator(), g=c.createGain();
        o.type=type; o.frequency.setValueAtTime(f1,now);
        o.frequency.exponentialRampToValueAtTime(f2,now+dur);
        g.gain.setValueAtTime(vol*this.masterVolume,now);
        g.gain.exponentialRampToValueAtTime(0.001,now+dur);
        o.connect(g); g.connect(c.destination); o.start(now); o.stop(now+dur);
    }
    playNoise(dur, vol=0.25) {
        if(!this.initialized||this.muted) return;
        const c=this.ctx, now=c.currentTime;
        const buf=c.createBuffer(1,c.sampleRate*dur,c.sampleRate);
        const d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
        const n=c.createBufferSource(); n.buffer=buf;
        const g=c.createGain(), f=c.createBiquadFilter();
        g.gain.setValueAtTime(vol*this.masterVolume,now);
        g.gain.exponentialRampToValueAtTime(0.001,now+dur);
        f.type='lowpass'; f.frequency.setValueAtTime(1500,now);
        f.frequency.exponentialRampToValueAtTime(80,now+dur);
        n.connect(f); f.connect(g); g.connect(c.destination);
        n.start(now); n.stop(now+dur);
    }

    // ============================================
    // BGM - 실제 MP3 (보스/스테이지 A/B)
    // ============================================
    getBGMList() { return ['bgm/stage-a.mp3','bgm/stage-b.mp3','bgm/boss.mp3']; }

    startBGM(type) {
        if(this.muted) return;
        this.stopBGM();
        this.bgmPlaying = true;
        let file;
        if(type === 'boss') { file = 'bgm/boss.mp3'; }
        else if(type === 'a') { file = 'bgm/stage-a.mp3'; }
        else { file = 'bgm/stage-b.mp3'; }
        this.bgmAudio = new Audio(file);
        this.bgmAudio.volume = 0.5;
        this.bgmAudio.loop = true;
        this.bgmAudio.play().catch(()=>{ this.bgmAudio=null; });
    }
    stopBGM() {
        this.bgmPlaying = false;
        if(this.bgmAudio) { this.bgmAudio.pause(); this.bgmAudio.currentTime=0; this.bgmAudio=null; }
        if(this.bgmTimeout) { clearTimeout(this.bgmTimeout); this.bgmTimeout=null; }
    }
    // 스테이지에 따라 A/B 번갈아 재생
    playStageMusic(stageNum) {
        if(stageNum % 5 === 0) this.startBGM('boss');
        else if(stageNum % 2 === 1) this.startBGM('a');
        else this.startBGM('b');
    }
    playRandomBGM() { this.playStageMusic(stage); }

    // ============================================
    // 고품질 SFX
    // ============================================
    shoot() { this.playSlide(880,440,0.06,'triangle',0.1); this.playTone(1200,0.03,'sine',0.05); }
    shootPower() { this.playSlide(1000,500,0.05,'triangle',0.08); this.playTone(700,0.04,'sine',0.05); }
    hitEnemy() { this.playSlide(300,700,0.06,'square',0.12); this.playTone(500,0.04,'triangle',0.08); }
    explodeEnemy() {
        this.playNoise(0.15,0.2); this.playSlide(400,800,0.06,'square',0.15);
        this.playTone(200,0.1,'triangle',0.1);
    }
    explodeBoss() {
        this.playNoise(0.5,0.35); this.playSlide(150,600,0.15,'sawtooth',0.2);
        this.playTone(80,0.4,'sine',0.25);
        setTimeout(()=>{if(!this.muted&&this.initialized){this.playNoise(0.3,0.2);this.playSlide(500,1200,0.1,'square',0.15);}},150);
        setTimeout(()=>{if(!this.muted&&this.initialized){this.playNoise(0.2,0.15);this.playTone(60,0.3,'sine',0.2);}},350);
    }
    playerHit() { this.playSlide(600,80,0.3,'square',0.2); this.playNoise(0.2,0.15); this.playTone(120,0.3,'triangle',0.15); }
    itemPickup() { if(!this.initialized||this.muted)return; this.playPiano(988,0.15,0.3); this.playPiano(1319,0.2,0.3,0.08); }
    powerUp() { if(!this.initialized||this.muted)return; [523,659,784,1047,1319].forEach((f,i)=>this.playPiano(f,0.12,0.25,i*0.06)); }
    shield() { if(!this.initialized||this.muted)return; [392,523,659,784,1047].forEach((f,i)=>this.playPiano(f,0.1,0.2,i*0.05)); }
    oneUp() { if(!this.initialized||this.muted)return; [262,330,392,523,659,784].forEach((f,i)=>this.playPiano(f,0.15,0.25,i*0.08)); }
    stageClear() {
        if(!this.initialized||this.muted)return;
        [[523,0.15],[659,0.15],[784,0.15],[1047,0.2],[784,0.15],[1047,0.25],[1319,0.35]].reduce((t,[f,d])=>{this.playPiano(f,d,0.3,t);return t+d*0.8;},0);
    }
    gameOver() {
        if(!this.initialized||this.muted)return;
        [[494,0.3],[440,0.3],[392,0.3],[330,0.4],[262,0.3],[220,0.5]].reduce((t,[f,d])=>{this.playPiano(f,d,0.3,t);return t+d+0.05;},0);
    }
    gameStart() {
        if(!this.initialized||this.muted)return;
        [[330,0.1],[330,0.1],[330,0.12],[262,0.1],[330,0.12],[392,0.2]].reduce((t,[f,d])=>{this.playPiano(f,d,0.25,t);return t+d+0.02;},0);
    }
    bossWarning() {
        if(!this.initialized||this.muted)return;
        for(let i=0;i<4;i++){this.playTone(120,0.15,'square',0.2,i*0.3);this.playTone(180,0.1,'square',0.15,i*0.3+0.15);}
    }
    combo(n) { this.playPiano(400+Math.min(n,12)*80,0.08,0.15); }
    shieldBlock() { this.playSlide(800,400,0.07,'triangle',0.15); this.playTone(600,0.08,'sine',0.1); }
    toggleMute() { this.muted=!this.muted; if(this.muted){this.stopBGM();}else if(gameState===STATE.PLAYING){this.startBGM();} if(this.bgmAudio)this.bgmAudio.muted=this.muted; return this.muted; }
}
const sfx = new SoundEngine();
