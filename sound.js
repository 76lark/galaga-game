// ============================================
// GALAGA SUPREME - Sound Engine
// 유키 쿠라모토 스타일 피아노 BGM + 고품질 SFX
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
    playPiano(freq, dur, vol=0.25, delay=0) {
        if(!this.initialized||this.muted) return;
        const c=this.ctx, now=c.currentTime+delay;
        // 기본음
        const o1=c.createOscillator(), o2=c.createOscillator(), o3=c.createOscillator();
        const g=c.createGain();
        o1.type='triangle'; o1.frequency.setValueAtTime(freq, now);
        o2.type='sine'; o2.frequency.setValueAtTime(freq*2, now); // 2nd harmonic
        o3.type='sine'; o3.frequency.setValueAtTime(freq*3, now); // 3rd harmonic
        const g2=c.createGain(); g2.gain.setValueAtTime(0.3, now);
        const g3=c.createGain(); g3.gain.setValueAtTime(0.1, now);
        // ADSR
        const v = vol * this.masterVolume;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(v, now+0.01); // Attack
        g.gain.linearRampToValueAtTime(v*0.7, now+0.05); // Decay
        g.gain.setValueAtTime(v*0.7, now+dur*0.6); // Sustain
        g.gain.exponentialRampToValueAtTime(0.001, now+dur); // Release
        // 리버브 시뮬레이션 (딜레이)
        const delay2=c.createDelay(); delay2.delayTime.setValueAtTime(0.08,now);
        const dg=c.createGain(); dg.gain.setValueAtTime(0.15,now);
        o1.connect(g); o2.connect(g2); g2.connect(g); o3.connect(g3); g3.connect(g);
        g.connect(c.destination);
        g.connect(delay2); delay2.connect(dg); dg.connect(c.destination);
        o1.start(now); o1.stop(now+dur+0.1);
        o2.start(now); o2.stop(now+dur+0.1);
        o3.start(now); o3.stop(now+dur+0.1);
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
    // 저작권 없는 유명 교향곡 BGM 10곡
    // (모두 퍼블릭 도메인 - 작곡가 사후 70년 이상)
    // ============================================
    getBGMTracks() {
        const C4=262,D4=294,E4=330,F4=349,G4=392,A4=440,B4=494;
        const C5=523,D5=587,E5=659,F5=698,G5=784,A5=880,B5=988,C6=1047;
        const Eb4=311,Bb4=466,Ab4=415,Eb5=622,Bb5=932,Ab5=831;
        const C3=131,D3=147,E3=165,F3=175,G3=196,A3=220,B3=247,Eb3=156,Bb3=233;

        return [
            // 1. 베토벤 - 운명 교향곡 5번 1악장
            { melody:[[G4,0.15],[G4,0.15],[G4,0.15],[Eb4,0.6],
                      [F4,0.15],[F4,0.15],[F4,0.15],[D4,0.6],
                      [G4,0.15],[G4,0.15],[G4,0.15],[Eb4,0.3],[G4,0.15],[G4,0.15],[G4,0.15],[Eb4,0.3],
                      [Bb4,0.2],[Ab4,0.2],[G4,0.2],[F4,0.2],[Eb4,0.4]],
              bass:[[Eb3,0.6],[Eb3,0.3],[Bb3,0.6],[Bb3,0.3],
                    [Eb3,0.3],[Eb3,0.3],[Bb3,0.3],[Eb3,0.3],[Bb3,0.4]] },

            // 2. 비발디 - 사계 '여름' 3악장 Presto
            { melody:[[G5,0.1],[F5,0.1],[E5,0.1],[D5,0.1],[C5,0.1],[B4,0.1],[A4,0.1],[G4,0.2],
                      [A4,0.1],[B4,0.1],[C5,0.1],[D5,0.1],[E5,0.1],[F5,0.1],[G5,0.1],[A5,0.2],
                      [G5,0.1],[E5,0.1],[C5,0.1],[G5,0.1],[E5,0.1],[C5,0.1],[G4,0.1],[C5,0.3]],
              bass:[[C3,0.2],[G3,0.2],[C3,0.2],[G3,0.2],[F3,0.2],[C3,0.2],[G3,0.2],[C3,0.3],
                    [A3,0.2],[E3,0.2],[A3,0.2],[G3,0.3]] },

            // 3. 모차르트 - 교향곡 40번 1악장
            { melody:[[D5,0.2],[D5,0.1],[Eb5,0.3],[D5,0.2],[D5,0.1],[Eb5,0.3],
                      [D5,0.15],[Eb5,0.15],[F5,0.15],[Eb5,0.15],[D5,0.15],[C5,0.15],[B4,0.3],
                      [C5,0.2],[C5,0.1],[D5,0.3],[C5,0.2],[C5,0.1],[D5,0.3],
                      [C5,0.15],[D5,0.15],[Eb5,0.15],[D5,0.15],[C5,0.15],[B4,0.15],[A4,0.3]],
              bass:[[G3,0.3],[D3,0.3],[G3,0.3],[D3,0.3],[Eb3,0.3],[B3,0.3],
                    [A3,0.3],[E3,0.3],[A3,0.3],[D3,0.3]] },

            // 4. 베토벤 - 환희의 송가 (9번 4악장)
            { melody:[[E4,0.3],[E4,0.3],[F4,0.3],[G4,0.3],[G4,0.3],[F4,0.3],[E4,0.3],[D4,0.3],
                      [C4,0.3],[C4,0.3],[D4,0.3],[E4,0.3],[E4,0.4],[D4,0.15],[D4,0.5],
                      [E4,0.3],[E4,0.3],[F4,0.3],[G4,0.3],[G4,0.3],[F4,0.3],[E4,0.3],[D4,0.3],
                      [C4,0.3],[C4,0.3],[D4,0.3],[E4,0.3],[D4,0.4],[C4,0.15],[C4,0.5]],
              bass:[[C3,0.6],[G3,0.6],[A3,0.6],[E3,0.6],[F3,0.6],[G3,0.6],[C3,0.6],[G3,0.6],
                    [C3,0.6],[G3,0.6],[F3,0.6],[C3,0.6]] },

            // 5. 차이코프스키 - 백조의 호수 테마
            { melody:[[A4,0.4],[B4,0.2],[C5,0.4],[D5,0.2],[E5,0.6],[D5,0.2],[C5,0.4],
                      [B4,0.4],[A4,0.4],[G4,0.2],[A4,0.4],[B4,0.2],[A4,0.8],
                      [A4,0.4],[B4,0.2],[C5,0.4],[D5,0.2],[E5,0.6],[F5,0.2],[E5,0.4],
                      [D5,0.4],[C5,0.4],[B4,0.2],[A4,0.6]],
              bass:[[A3,0.6],[E3,0.6],[A3,0.6],[E3,0.6],[D3,0.6],[A3,0.6],[E3,0.6],[A3,0.8],
                    [A3,0.6],[E3,0.6],[F3,0.6],[E3,0.6]] },

            // 6. 드보르작 - 신세계 교향곡 2악장 (Going Home)
            { melody:[[E5,0.5],[D5,0.3],[C5,0.5],[D5,0.3],[E5,0.8],
                      [G5,0.5],[E5,0.3],[D5,0.5],[C5,0.3],[D5,0.8],
                      [E5,0.5],[D5,0.3],[C5,0.5],[A4,0.3],[C5,0.8],
                      [D5,0.5],[C5,0.3],[A4,0.5],[G4,0.3],[A4,0.8]],
              bass:[[C3,0.8],[G3,0.8],[A3,0.8],[E3,0.8],[F3,0.8],[C3,0.8],[G3,0.8],[C3,0.8]] },

            // 7. 그리그 - 페르귄트 '산왕의 궁전에서'
            { melody:[[E4,0.15],[F4,0.15],[G4,0.15],[A4,0.15],[B4,0.15],[C5,0.15],[B4,0.15],[A4,0.2],
                      [G4,0.15],[A4,0.15],[B4,0.15],[C5,0.15],[D5,0.15],[E5,0.15],[D5,0.15],[C5,0.2],
                      [B4,0.15],[C5,0.15],[D5,0.15],[E5,0.15],[F5,0.15],[G5,0.15],[F5,0.15],[E5,0.2],
                      [D5,0.15],[E5,0.15],[F5,0.15],[E5,0.15],[D5,0.15],[C5,0.15],[B4,0.15],[A4,0.3]],
              bass:[[A3,0.2],[E3,0.2],[A3,0.2],[E3,0.2],[D3,0.2],[A3,0.2],[E3,0.2],[A3,0.2],
                    [G3,0.2],[D3,0.2],[G3,0.2],[E3,0.2],[A3,0.2],[E3,0.2],[A3,0.3]] },

            // 8. 바흐 - 토카타와 푸가 Dm
            { melody:[[A5,0.15],[G5,0.15],[A5,0.4],[G5,0.15],[F5,0.15],[E5,0.15],[D5,0.15],[C5,0.4],
                      [D5,0.15],[E5,0.15],[F5,0.15],[G5,0.15],[A5,0.15],[Bb5,0.15],[A5,0.4],
                      [D5,0.2],[F5,0.2],[A5,0.2],[D5,0.2],[F5,0.2],[A5,0.2],[D5,0.4]],
              bass:[[D3,0.4],[A3,0.4],[D3,0.4],[A3,0.4],[Bb3,0.4],[A3,0.4],[D3,0.4],[A3,0.4],
                    [D3,0.4],[A3,0.4],[D3,0.4]] },

            // 9. 베토벤 - 월광 소나타 3악장 Presto
            { melody:[[C5,0.1],[E5,0.1],[G5,0.1],[C5,0.1],[E5,0.1],[G5,0.1],[C5,0.1],[E5,0.1],
                      [B4,0.1],[D5,0.1],[G5,0.1],[B4,0.1],[D5,0.1],[G5,0.1],[B4,0.1],[D5,0.1],
                      [A4,0.1],[C5,0.1],[E5,0.1],[A4,0.1],[C5,0.1],[E5,0.1],[A5,0.2],[G5,0.2],
                      [F5,0.1],[E5,0.1],[D5,0.1],[C5,0.1],[B4,0.1],[A4,0.1],[G4,0.1],[C5,0.3]],
              bass:[[C3,0.2],[G3,0.2],[C3,0.2],[G3,0.2],[G3,0.2],[D3,0.2],[G3,0.2],[D3,0.2],
                    [A3,0.2],[E3,0.2],[A3,0.2],[E3,0.2],[F3,0.2],[G3,0.2],[C3,0.3]] },

            // 10. 로시니 - 윌리엄 텔 서곡 (론 레인저)
            { melody:[[G4,0.15],[G4,0.15],[G4,0.15],[G4,0.15],[G4,0.15],[E5,0.15],[C5,0.15],[E5,0.15],
                      [G5,0.3],[E5,0.15],[G5,0.3],[E5,0.15],[G5,0.15],[E5,0.15],[C5,0.15],[E5,0.15],
                      [G4,0.15],[G4,0.15],[G4,0.15],[G4,0.15],[G4,0.15],[E5,0.15],[C5,0.15],[E5,0.15],
                      [G5,0.3],[F5,0.15],[E5,0.15],[D5,0.15],[C5,0.15],[B4,0.15],[C5,0.3]],
              bass:[[C3,0.3],[G3,0.3],[C3,0.3],[G3,0.3],[E3,0.3],[C3,0.3],[G3,0.3],[C3,0.3],
                    [C3,0.3],[G3,0.3],[F3,0.3],[G3,0.3],[C3,0.3]] }
        ];
    }

    // BGM 재생
    startBGM(trackIdx) {
        if(!this.initialized||this.muted) return;
        this.stopBGM();
        this.bgmPlaying = true;
        if(trackIdx !== undefined) this.currentTrack = trackIdx % 10;
        else this.currentTrack = Math.floor(Math.random()*10);
        this._playBGMLoop();
    }
    stopBGM() {
        this.bgmPlaying = false;
        if(this.bgmTimeout) { clearTimeout(this.bgmTimeout); this.bgmTimeout=null; }
    }
    _playBGMLoop() {
        if(!this.bgmPlaying||this.muted) return;
        const tracks = this.getBGMTracks();
        const track = tracks[this.currentTrack];
        let t=0;
        // 멜로디
        track.melody.forEach(([freq,dur])=>{
            if(freq>0) this.playPiano(freq, dur*1.2, 0.22, t);
            t += dur;
        });
        // 반주 (아르페지오)
        let tb=0;
        track.bass.forEach(([freq,dur])=>{
            this.playPiano(freq, dur*1.5, 0.1, tb);
            this.playPiano(freq*1.5, dur*1.0, 0.06, tb+0.1); // 5도 하모니
            tb += dur;
        });
        const loopDur = Math.max(t, tb);
        this.bgmTimeout = setTimeout(()=>this._playBGMLoop(), loopDur*1000 + 200);
    }
    // 스테이지별 랜덤 트랙 선택
    playRandomBGM() {
        let next;
        do { next = Math.floor(Math.random()*10); } while(next === this.currentTrack);
        this.startBGM(next);
    }

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
    toggleMute() { this.muted=!this.muted; if(this.muted)this.stopBGM(); return this.muted; }
}
const sfx = new SoundEngine();
