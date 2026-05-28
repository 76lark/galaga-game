// ============================================
// OX 퀴즈 사운드 시스템 (Web Audio API)
// Monkey Island 스타일 캐리비안 BGM
// ============================================

const SFX = (() => {
    let ctx = null;
    let bgmGain = null;
    let sfxGain = null;
    let bgmTimeout = null;
    let bgmPlaying = false;
    let muted = false;

    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        bgmGain = ctx.createGain();
        bgmGain.gain.value = 0.45;
        bgmGain.connect(ctx.destination);
        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.4;
        sfxGain.connect(ctx.destination);
    }

    function resume() {
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    // 단순 톤 재생 (SFX용)
    function playTone(freq, duration, type = 'sine', gainVal = 0.3, startTime = 0) {
        if (!ctx || muted) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(gainVal, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration + 0.05);
    }

    // BGM 노트 재생 (bgmGain으로 라우팅)
    function bgmNote(freq, start, dur, type, vol) {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        const t = ctx.currentTime + start;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.01);
        gain.gain.setValueAtTime(vol, t + dur * 0.7);
        gain.gain.linearRampToValueAtTime(0, t + dur);
        osc.connect(gain);
        gain.connect(bgmGain);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    // 버튼 클릭
    function clickSound() {
        if (!ctx || muted) return;
        playTone(800, 0.08, 'sine', 0.2);
        playTone(1200, 0.06, 'sine', 0.1, 0.03);
    }

    // 정답 사운드
    function correctSound() {
        if (!ctx || muted) return;
        playTone(523, 0.12, 'sine', 0.3);
        playTone(659, 0.12, 'sine', 0.3, 0.1);
        playTone(784, 0.2, 'sine', 0.35, 0.2);
        playTone(1047, 0.3, 'triangle', 0.2, 0.3);
    }

    // 오답 사운드
    function wrongSound() {
        if (!ctx || muted) return;
        playTone(300, 0.2, 'sawtooth', 0.15);
        playTone(200, 0.3, 'sawtooth', 0.12, 0.15);
        playTone(150, 0.4, 'sawtooth', 0.1, 0.3);
    }

    // 게임오버 사운드
    function gameOverSound() {
        if (!ctx || muted) return;
        const notes = [392, 349, 330, 294, 262, 220, 196];
        notes.forEach((freq, i) => {
            playTone(freq, 0.35, 'sine', 0.25, i * 0.25);
            playTone(freq * 0.5, 0.4, 'triangle', 0.1, i * 0.25);
        });
        playTone(130, 1.5, 'sine', 0.15, notes.length * 0.25);
    }

    // 클리어 사운드
    function clearSound() {
        if (!ctx || muted) return;
        const melody = [
            [523, 0.15], [523, 0.15], [523, 0.15], [523, 0.3],
            [415, 0.3], [466, 0.3], [523, 0.15], [466, 0.1], [523, 0.5]
        ];
        let t = 0;
        melody.forEach(([freq, dur]) => {
            playTone(freq, dur + 0.1, 'sine', 0.3, t);
            playTone(freq * 1.5, dur + 0.1, 'triangle', 0.1, t);
            t += dur;
        });
        playTone(523, 0.8, 'sine', 0.2, t);
        playTone(659, 0.8, 'sine', 0.2, t);
        playTone(784, 0.8, 'sine', 0.2, t);
        playTone(1047, 1.0, 'triangle', 0.15, t + 0.1);
    }

    // ============================================
    // BGM - Monkey Island 스타일 캐리비안 레게
    // 스윙감 있는 베이스 + 스틸드럼 멜로디 + 오프비트 리듬
    // ============================================
    function startBGM() {
        if (!ctx || bgmPlaying || muted) return;
        bgmPlaying = true;
        playBGMLoop();
    }

    function playBGMLoop() {
        if (!bgmPlaying || !ctx || muted) return;

        const bpm = 132;
        const beat = 60 / bpm;
        const bar = beat * 4;

        // 8마디 루프 (캐리비안/레게 느낌)
        // 코드 진행: Am - Dm - G - C - F - Dm - E - Am
        const chordProg = [
            { root: 220, notes: [220, 261, 329] },   // Am
            { root: 146, notes: [293, 349, 440] },   // Dm
            { root: 196, notes: [196, 246, 293] },   // G
            { root: 261, notes: [261, 329, 392] },   // C
            { root: 174, notes: [174, 220, 261] },   // F
            { root: 146, notes: [293, 349, 440] },   // Dm
            { root: 164, notes: [329, 415, 493] },   // E
            { root: 220, notes: [220, 261, 329] },   // Am
        ];

        const totalDuration = 8 * bar;

        chordProg.forEach((chord, ci) => {
            const barStart = ci * bar;

            // === 베이스라인 (레게 스타일 - 루트+옥타브 바운스) ===
            const bassRoot = chord.root;
            // 비트 1: 루트
            bgmNote(bassRoot, barStart, beat * 0.4, 'sawtooth', 0.18);
            // 비트 2 뒷박: 옥타브 위
            bgmNote(bassRoot * 2, barStart + beat * 1.5, beat * 0.3, 'sawtooth', 0.12);
            // 비트 3: 5도
            bgmNote(bassRoot * 1.5, barStart + beat * 2, beat * 0.4, 'sawtooth', 0.15);
            // 비트 4 뒷박: 루트 옥타브
            bgmNote(bassRoot * 2, barStart + beat * 3.5, beat * 0.3, 'sawtooth', 0.12);

            // === 오프비트 리듬 기타 (레게 스캥크) ===
            // 뒷박에 짧은 코드 스트럼
            for (let b = 0; b < 4; b++) {
                const offbeat = barStart + beat * b + beat * 0.5;
                chord.notes.forEach(freq => {
                    bgmNote(freq * 2, offbeat, beat * 0.15, 'square', 0.04);
                });
            }

            // === 스틸드럼 멜로디 (캐리비안 느낌) ===
            const melodyPatterns = [
                [0, 4, 7, 12, 7, 4],      // 아르페지오 상승하강
                [12, 7, 5, 4, 0, 4],      // 하강 후 반등
                [0, 3, 7, 10, 12, 10],    // 마이너 스케일 상승
                [7, 5, 4, 0, -1, 0],      // 하강 해결
                [0, 4, 7, 4, 12, 7],      // 바운스
                [5, 7, 12, 10, 7, 5],     // 물결
                [0, 7, 12, 11, 7, 4],     // 드라마틱
                [12, 10, 7, 4, 0, 4],     // 마무리 하강
            ];
            const pattern = melodyPatterns[ci];
            const noteLen = bar / pattern.length;
            pattern.forEach((semitone, ni) => {
                const freq = chord.notes[0] * Math.pow(2, semitone / 12) * 2;
                const t = barStart + ni * noteLen;
                // 스틸드럼 = sine + 약간의 디케이
                bgmNote(freq, t, noteLen * 0.6, 'sine', 0.12);
                // 하모닉스 레이어
                bgmNote(freq * 2, t, noteLen * 0.3, 'sine', 0.03);
            });

            // === 퍼커션 (하이햇 + 킥 시뮬레이션) ===
            for (let b = 0; b < 8; b++) {
                const t = barStart + b * (beat / 2);
                // 하이햇 (노이즈 대신 고주파 짧은 톤)
                bgmNote(8000 + Math.random() * 2000, t, 0.02, 'square', 0.03);
                // 킥 (비트 1, 3)
                if (b === 0 || b === 4) {
                    bgmNote(60, t, 0.1, 'sine', 0.15);
                }
                // 스네어 느낌 (비트 2, 4 뒷박)
                if (b === 3 || b === 7) {
                    bgmNote(200, t, 0.05, 'triangle', 0.08);
                    bgmNote(6000, t, 0.03, 'square', 0.04);
                }
            }

            // === 패드 (분위기 깔기) ===
            chord.notes.forEach(freq => {
                bgmNote(freq * 0.5, barStart, bar * 0.9, 'sine', 0.04);
            });
        });

        // 루프
        bgmTimeout = setTimeout(() => {
            if (bgmPlaying) playBGMLoop();
        }, totalDuration * 1000);
    }

    function stopBGM() {
        bgmPlaying = false;
        if (bgmTimeout) { clearTimeout(bgmTimeout); bgmTimeout = null; }
    }

    function toggleMute() {
        muted = !muted;
        if (muted) {
            stopBGM();
            if (bgmGain) bgmGain.gain.value = 0;
            if (sfxGain) sfxGain.gain.value = 0;
        } else {
            if (bgmGain) bgmGain.gain.value = 0.45;
            if (sfxGain) sfxGain.gain.value = 0.4;
            startBGM();
        }
        return muted;
    }

    return { init, resume, clickSound, correctSound, wrongSound, gameOverSound, clearSound, startBGM, stopBGM, toggleMute };
})();
