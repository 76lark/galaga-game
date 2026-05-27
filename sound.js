// ============================================
// OX 퀴즈 사운드 시스템 (Web Audio API)
// ============================================

const SFX = (() => {
    let ctx = null;
    let bgmGain = null;
    let sfxGain = null;
    let bgmOscillators = [];
    let bgmPlaying = false;
    let muted = false;

    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        bgmGain = ctx.createGain();
        bgmGain.gain.value = 0.35;
        bgmGain.connect(ctx.destination);
        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.4;
        sfxGain.connect(ctx.destination);
    }

    function resume() {
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    // 음표 주파수
    function noteFreq(note, octave) {
        const notes = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
        const n = notes[note[0]] + (note.includes('#') ? 1 : note.includes('b') ? -1 : 0);
        return 440 * Math.pow(2, (n - 9) / 12 + (octave - 4));
    }

    // 단순 톤 재생
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

    // 버튼 클릭 사운드 (짧은 팝)
    function clickSound() {
        if (!ctx || muted) return;
        playTone(800, 0.08, 'sine', 0.2);
        playTone(1200, 0.06, 'sine', 0.1, 0.03);
    }

    // 정답 사운드 (밝은 상승 멜로디)
    function correctSound() {
        if (!ctx || muted) return;
        playTone(523, 0.12, 'sine', 0.3);       // C5
        playTone(659, 0.12, 'sine', 0.3, 0.1);  // E5
        playTone(784, 0.2, 'sine', 0.35, 0.2);  // G5
        playTone(1047, 0.3, 'triangle', 0.2, 0.3); // C6
    }

    // 오답 사운드 (낮은 하강음)
    function wrongSound() {
        if (!ctx || muted) return;
        playTone(300, 0.2, 'sawtooth', 0.15);
        playTone(200, 0.3, 'sawtooth', 0.12, 0.15);
        playTone(150, 0.4, 'sawtooth', 0.1, 0.3);
    }

    // 게임오버 사운드 (슬픈 하강)
    function gameOverSound() {
        if (!ctx || muted) return;
        const notes = [392, 349, 330, 294, 262, 220, 196];
        notes.forEach((freq, i) => {
            playTone(freq, 0.35, 'sine', 0.25, i * 0.25);
            playTone(freq * 0.5, 0.4, 'triangle', 0.1, i * 0.25);
        });
        // 마지막 저음
        playTone(130, 1.5, 'sine', 0.15, notes.length * 0.25);
    }

    // 클리어 사운드 (화려한 팡파레)
    function clearSound() {
        if (!ctx || muted) return;
        // 팡파레 멜로디
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
        // 화음 마무리
        playTone(523, 0.8, 'sine', 0.2, t);
        playTone(659, 0.8, 'sine', 0.2, t);
        playTone(784, 0.8, 'sine', 0.2, t);
        playTone(1047, 1.0, 'triangle', 0.15, t + 0.1);
    }

    // BGM - 차분한 퀴즈 배경음 (루프)
    function startBGM() {
        if (!ctx || bgmPlaying || muted) return;
        bgmPlaying = true;
        playBGMLoop();
    }

    function playBGMLoop() {
        if (!bgmPlaying || !ctx || muted) return;

        // 차분한 앰비언트 코드 진행
        const chords = [
            [261, 329, 392],  // C major
            [220, 277, 329],  // Am (A minor)
            [246, 311, 370],  // Bm-ish
            [196, 246, 294],  // G
            [174, 220, 261],  // F-ish
            [220, 261, 329],  // Am
            [196, 246, 311],  // G
            [261, 329, 392],  // C
        ];

        const chordDuration = 2.0;
        const totalDuration = chords.length * chordDuration;

        chords.forEach((chord, ci) => {
            chord.forEach((freq) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;

                const startT = ctx.currentTime + ci * chordDuration;
                gain.gain.setValueAtTime(0, startT);
                gain.gain.linearRampToValueAtTime(0.15, startT + 0.3);
                gain.gain.setValueAtTime(0.15, startT + chordDuration - 0.4);
                gain.gain.linearRampToValueAtTime(0, startT + chordDuration);

                osc.connect(gain);
                gain.connect(bgmGain);
                osc.start(startT);
                osc.stop(startT + chordDuration + 0.1);
                bgmOscillators.push(osc);
            });

            // 부드러운 패드 레이어
            const padOsc = ctx.createOscillator();
            const padGain = ctx.createGain();
            padOsc.type = 'triangle';
            padOsc.frequency.value = chord[0] * 0.5;
            const startT = ctx.currentTime + ci * chordDuration;
            padGain.gain.setValueAtTime(0, startT);
            padGain.gain.linearRampToValueAtTime(0.08, startT + 0.5);
            padGain.gain.setValueAtTime(0.08, startT + chordDuration - 0.5);
            padGain.gain.linearRampToValueAtTime(0, startT + chordDuration);
            padOsc.connect(padGain);
            padGain.connect(bgmGain);
            padOsc.start(startT);
            padOsc.stop(startT + chordDuration + 0.1);
            bgmOscillators.push(padOsc);
        });

        // 루프
        setTimeout(() => {
            bgmOscillators = [];
            if (bgmPlaying) playBGMLoop();
        }, totalDuration * 1000);
    }

    function stopBGM() {
        bgmPlaying = false;
        bgmOscillators.forEach(osc => {
            try { osc.stop(); } catch(e) {}
        });
        bgmOscillators = [];
    }

    function toggleMute() {
        muted = !muted;
        if (muted) {
            stopBGM();
        } else {
            startBGM();
        }
        return muted;
    }

    return { init, resume, clickSound, correctSound, wrongSound, gameOverSound, clearSound, startBGM, stopBGM, toggleMute };
})();
