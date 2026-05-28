// ============================================
// OX 상식퀴즈 - 14개 분야 × 200문제 (JSON 로드)
// ============================================

const CATEGORIES = {
    science: { name: '🔬 과학', file: 'questions/science.json' },
    geography: { name: '🌍 지리', file: 'questions/geography.json' },
    history: { name: '📜 역사', file: 'questions/history.json' },
    culture: { name: '🎨 문화/예술', file: 'questions/culture.json' },
    daily: { name: '💡 생활상식', file: 'questions/daily.json' },
    tech: { name: '💻 IT/기술', file: 'questions/tech.json' },
    animal: { name: '🐾 동물/자연', file: 'questions/animal.json' },
    korea: { name: '🇰🇷 한국상식', file: 'questions/korea.json' },
    food: { name: '🍽️ 음식/요리', file: 'questions/food.json' },
    body: { name: '🏥 인체/건강', file: 'questions/body.json' },
    math: { name: '🔢 수학/논리', file: 'questions/math.json' },
    entertainment: { name: '⭐ 연예/엔터', file: 'questions/entertainment.json' },
    sports: { name: '⚽ 스포츠', file: 'questions/sports.json' },
    adult: { name: '🍺 성인상식', file: 'questions/adult.json' },
};

// 게임 상태
const MAX_LIVES = 5;
let questions = [];
let currentIdx = 0;
let lives = MAX_LIVES;
let score = 0;
let answered = false;
let correctCount = 0;
let selectedCategory = null;

// 셔플 함수
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 분야 선택 화면 표시
function showTitle() {
    document.getElementById('title-screen').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('result-screen').style.display = 'none';
}

// 분야 선택 후 게임 시작
async function selectCategory(catKey) {
    SFX.init();
    SFX.resume();
    SFX.clickSound();

    selectedCategory = catKey;
    const cat = CATEGORIES[catKey];

    // JSON 파일에서 문제 로드
    try {
        const res = await fetch(cat.file);
        if (!res.ok) throw new Error('파일 로드 실패');
        const allQuestions = await res.json();
        questions = shuffle(allQuestions).slice(0, 50);
    } catch (e) {
        alert('문제를 불러오는데 실패했습니다. 다시 시도해주세요.');
        return;
    }

    currentIdx = 0;
    lives = MAX_LIVES;
    score = 0;
    correctCount = 0;
    answered = false;

    SFX.startBGM();
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    document.getElementById('category-label').textContent = cat.name;
    updateUI();
    showQuestion();
}

// 문제 표시
function showQuestion() {
    answered = false;
    const q = questions[currentIdx];
    document.getElementById('question-number').textContent = `Q${currentIdx + 1}.`;
    document.getElementById('question-text').textContent = q.q;
    document.getElementById('explanation').textContent = '';
    document.getElementById('explanation').classList.remove('show');
    document.getElementById('btn-o').classList.remove('disabled');
    document.getElementById('btn-x').classList.remove('disabled');
    updateUI();
}

// 답변 처리
function answer(userAnswer) {
    if (answered) return;
    answered = true;

    SFX.init();
    SFX.resume();
    SFX.clickSound();

    const q = questions[currentIdx];
    const correct = (userAnswer === q.a);

    document.getElementById('btn-o').classList.add('disabled');
    document.getElementById('btn-x').classList.add('disabled');

    const feedback = document.getElementById('feedback');
    if (correct) {
        score += 10;
        correctCount++;
        feedback.textContent = '⭕';
        feedback.style.color = '#0e6';
        feedback.style.textShadow = '0 0 30px #0e6';
        setTimeout(() => SFX.correctSound(), 100);
    } else {
        lives--;
        feedback.textContent = '❌';
        feedback.style.color = '#f44';
        feedback.style.textShadow = '0 0 30px #f44';
        setTimeout(() => SFX.wrongSound(), 100);
    }
    feedback.classList.add('show');

    const explanation = document.getElementById('explanation');
    explanation.textContent = (correct ? '✅ 정답! ' : '❌ 오답! ') + q.e;
    explanation.classList.add('show');

    updateUI();

    setTimeout(() => {
        feedback.classList.remove('show');
        if (lives <= 0) { showResult(false); return; }
        if (currentIdx >= questions.length - 1) { showResult(true); return; }
        currentIdx++;
        showQuestion();
    }, 1800);
}

// UI 업데이트
function updateUI() {
    const heartsStr = '❤️'.repeat(lives) + '🖤'.repeat(MAX_LIVES - lives);
    document.getElementById('lives').textContent = heartsStr;
    document.getElementById('progress').textContent = `${currentIdx + 1} / ${questions.length}`;
    document.getElementById('score').textContent = `${score}점`;
}

// 결과 화면
function showResult(cleared) {
    SFX.stopBGM();
    document.getElementById('game-container').style.display = 'none';
    const resultScreen = document.getElementById('result-screen');
    const title = document.getElementById('result-title');
    const stats = document.getElementById('result-stats');

    if (cleared) {
        title.textContent = '🎉 축하합니다!';
        title.style.color = '#0f0';
        setTimeout(() => SFX.clearSound(), 300);
    } else {
        title.textContent = '💀 GAME OVER';
        title.style.color = '#f44';
        setTimeout(() => SFX.gameOverSound(), 300);
    }

    const catName = CATEGORIES[selectedCategory] ? CATEGORIES[selectedCategory].name : '';
    stats.innerHTML = `
        분야: ${catName}<br>
        정답: ${correctCount}문제 / ${currentIdx + 1}문제<br>
        점수: ${score}점<br>
        ${cleared ? '50문제 완주 성공!' : `${currentIdx + 1}번째 문제에서 탈락`}
    `;
    resultScreen.style.display = 'flex';
}

// 전체화면
function goFullscreen() {
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (rfs) {
        rfs.call(el).then(() => {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        }).catch(() => {});
    }
}

// 모바일 감지 시 첫 터치에 전체화면
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);
if (isMobile) {
    document.addEventListener('touchstart', function onFirstTouch() {
        goFullscreen();
        document.removeEventListener('touchstart', onFirstTouch);
    }, { once: true });
}

// 뮤트 토글
function toggleMute() {
    SFX.init();
    const muted = SFX.toggleMute();
    document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
}
