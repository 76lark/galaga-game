// ============================================
// OX 상식퀴즈 - 10개 분야 선택 + 100문제 도전
// ============================================

const CATEGORIES = {
    science: { name: '🔬 과학', icon: '🔬', questions: [
        { q: "물은 100도에서 끓는다.", a: true, e: "1기압 기준으로 물의 끓는점은 100°C입니다." },
        { q: "빛의 속도는 초속 약 30만 km이다.", a: true, e: "빛의 속도는 약 299,792km/s입니다." },
        { q: "다이아몬드는 철보다 단단하다.", a: true, e: "다이아몬드는 모스 경도 10으로 가장 단단한 천연 광물입니다." },
        { q: "소리는 진공에서도 전달된다.", a: false, e: "소리는 매질이 필요하므로 진공에서는 전달되지 않습니다." },
        { q: "지구의 자전 방향은 동쪽에서 서쪽이다.", a: false, e: "지구는 서쪽에서 동쪽으로 자전합니다." },
        { q: "인간의 뼈는 성인 기준 206개이다.", a: true, e: "성인의 뼈는 206개입니다." },
        { q: "태양은 지구보다 약 109배 크다.", a: true, e: "태양의 지름은 지구의 약 109배입니다." },
        { q: "혈액형은 A, B, O, AB 4가지이다.", a: true, e: "ABO 혈액형 체계에서는 4가지입니다." },
        { q: "번개는 위에서 아래로만 친다.", a: false, e: "번개는 다양한 방향으로 발생합니다." },
        { q: "달에는 중력이 없다.", a: false, e: "달의 중력은 지구의 약 1/6입니다." },
        { q: "DNA는 이중나선 구조이다.", a: true, e: "왓슨과 크릭이 1953년 발견한 이중나선 구조입니다." },
        { q: "수은은 상온에서 액체인 금속이다.", a: true, e: "수은은 상온에서 유일하게 액체 상태인 금속입니다." },
        { q: "절대영도는 -273.15°C이다.", a: true, e: "절대영도(0K)는 -273.15°C입니다." },
        { q: "전자레인지는 마이크로파를 이용한다.", a: true, e: "전자레인지는 마이크로파로 물 분자를 진동시켜 열을 발생시킵니다." },
        { q: "물은 4°C에서 밀도가 가장 높다.", a: true, e: "물은 4°C에서 최대 밀도를 가집니다." },
        { q: "인간의 뇌는 10%만 사용한다.", a: false, e: "이것은 속설이며, 실제로 뇌의 대부분 영역이 활용됩니다." },
        { q: "지구에서 가장 풍부한 기체는 산소이다.", a: false, e: "대기의 약 78%는 질소이고, 산소는 약 21%입니다." },
        { q: "무지개는 7가지 색으로 이루어져 있다.", a: true, e: "빨주노초파남보 7색입니다." },
        { q: "소금은 NaCl이다.", a: true, e: "소금의 화학식은 염화나트륨(NaCl)입니다." },
        { q: "지구는 태양계에서 세 번째 행성이다.", a: true, e: "수성-금성-지구 순서로 세 번째입니다." },
    ]},
    geography: { name: '🌍 지리', icon: '🌍', questions: [
        { q: "세계에서 가장 큰 대륙은 아시아이다.", a: true, e: "아시아는 면적 약 4,457만 km²로 가장 큰 대륙입니다." },
        { q: "나일강은 세계에서 가장 긴 강이다.", a: true, e: "나일강은 약 6,650km로 세계 최장 강입니다." },
        { q: "호주는 남반구에 위치한다.", a: true, e: "호주는 남반구에 있는 대륙 국가입니다." },
        { q: "에베레스트산은 아프리카에 있다.", a: false, e: "에베레스트산은 아시아 히말라야 산맥에 있습니다." },
        { q: "러시아는 세계에서 면적이 가장 큰 나라이다.", a: true, e: "러시아는 약 1,710만 km²로 세계 최대 면적 국가입니다." },
        { q: "사하라 사막은 남아메리카에 있다.", a: false, e: "사하라 사막은 아프리카 북부에 있습니다." },
        { q: "일본은 섬나라이다.", a: true, e: "일본은 약 6,800개의 섬으로 이루어진 섬나라입니다." },
        { q: "아마존 열대우림은 아프리카에 있다.", a: false, e: "아마존 열대우림은 남아메리카에 있습니다." },
        { q: "태평양은 대서양보다 크다.", a: true, e: "태평양은 지구 표면의 약 1/3을 차지하는 가장 큰 대양입니다." },
        { q: "캐나다는 미국보다 면적이 크다.", a: true, e: "캐나다는 약 998만 km²로 미국(약 983만)보다 큽니다." },
        { q: "이집트의 수도는 카이로이다.", a: true, e: "이집트의 수도는 카이로입니다." },
        { q: "남극은 대륙이다.", a: true, e: "남극은 대륙 위에 얼음이 덮인 형태입니다." },
        { q: "중국의 인구는 세계 1위이다.", a: false, e: "2023년 기준 인도가 중국을 추월하여 세계 1위입니다." },
        { q: "아프리카에는 54개 나라가 있다.", a: true, e: "아프리카 대륙에는 54개 국가가 있습니다." },
        { q: "그린란드는 아프리카보다 크다.", a: false, e: "메르카토르 도법의 왜곡이며, 아프리카가 14배 더 큽니다." },
        { q: "하와이는 아시아에 속한다.", a: false, e: "하와이는 미국의 주로 오세아니아/태평양에 위치합니다." },
        { q: "지중해는 대서양과 연결되어 있다.", a: true, e: "지브롤터 해협을 통해 대서양과 연결됩니다." },
        { q: "몽골은 바다가 없는 내륙국이다.", a: true, e: "몽골은 바다와 접하지 않는 내륙국입니다." },
        { q: "브라질은 남아메리카에서 가장 큰 나라이다.", a: true, e: "브라질은 남미 면적의 약 47%를 차지합니다." },
        { q: "영국은 섬나라이다.", a: true, e: "영국은 그레이트브리튼 섬과 아일랜드 섬 일부로 이루어진 섬나라입니다." },
    ]},
    history: { name: '📜 역사', icon: '📜', questions: [
        { q: "제2차 세계대전은 1939년에 시작되었다.", a: true, e: "1939년 9월 1일 독일의 폴란드 침공으로 시작되었습니다." },
        { q: "한글은 세종대왕이 만들었다.", a: true, e: "세종대왕이 1443년 훈민정음을 창제했습니다." },
        { q: "피라미드는 로마인이 건설했다.", a: false, e: "피라미드는 고대 이집트인이 건설했습니다." },
        { q: "임진왜란은 1592년에 일어났다.", a: true, e: "임진왜란은 1592년 일본의 조선 침략으로 시작되었습니다." },
        { q: "프랑스 혁명은 18세기에 일어났다.", a: true, e: "프랑스 혁명은 1789년에 시작되었습니다." },
        { q: "만리장성은 달에서도 보인다.", a: false, e: "실제로 달에서 만리장성은 보이지 않습니다." },
        { q: "고려는 신라 다음에 세워진 나라이다.", a: true, e: "918년 왕건이 고려를 건국했습니다." },
        { q: "링컨은 미국의 초대 대통령이다.", a: false, e: "미국 초대 대통령은 조지 워싱턴이며, 링컨은 16대입니다." },
        { q: "독일 통일은 1990년에 이루어졌다.", a: true, e: "1990년 10월 3일 동서독이 통일되었습니다." },
        { q: "조선은 약 500년간 지속되었다.", a: true, e: "조선은 1392~1897년, 약 505년간 지속되었습니다." },
        { q: "클레오파트라는 로마인이다.", a: false, e: "클레오파트라는 이집트 프톨레마이오스 왕조의 파라오입니다." },
        { q: "한국 전쟁은 1950년에 시작되었다.", a: true, e: "6·25 전쟁은 1950년 6월 25일 시작되었습니다." },
        { q: "나폴레옹은 영국 사람이다.", a: false, e: "나폴레옹은 프랑스(코르시카 출신)의 군인이자 황제입니다." },
        { q: "고구려, 백제, 신라를 삼국시대라 한다.", a: true, e: "한국의 삼국시대는 고구려·백제·신라 시대입니다." },
        { q: "타이타닉호는 1912년에 침몰했다.", a: true, e: "타이타닉호는 1912년 4월 15일 침몰했습니다." },
        { q: "이순신 장군은 고려시대 인물이다.", a: false, e: "이순신 장군은 조선시대 인물입니다." },
        { q: "로마 제국은 1000년 이상 지속되었다.", a: true, e: "서로마 기준 약 500년, 동로마 포함 시 약 1500년입니다." },
        { q: "광복절은 1945년 8월 15일이다.", a: true, e: "1945년 8월 15일 일본으로부터 해방되었습니다." },
        { q: "콜럼버스는 1492년에 아메리카에 도착했다.", a: true, e: "1492년 10월 12일 바하마 제도에 도착했습니다." },
        { q: "백제의 수도는 평양이었다.", a: false, e: "백제의 수도는 위례성, 웅진, 사비 등이며 평양은 고구려 수도입니다." },
    ]},
    culture: { name: '🎨 문화/예술', icon: '🎨', questions: [
        { q: "모나리자를 그린 화가는 레오나르도 다빈치이다.", a: true, e: "모나리자는 레오나르도 다빈치의 작품입니다." },
        { q: "베토벤은 이탈리아 작곡가이다.", a: false, e: "베토벤은 독일 출신 작곡가입니다." },
        { q: "올림픽은 4년마다 개최된다.", a: true, e: "하계/동계 올림픽은 각각 4년 주기로 개최됩니다." },
        { q: "축구 월드컵 우승 최다국은 브라질이다.", a: true, e: "브라질은 5회 우승으로 최다 우승국입니다." },
        { q: "셰익스피어는 프랑스 작가이다.", a: false, e: "셰익스피어는 영국의 극작가입니다." },
        { q: "피아노의 건반은 총 88개이다.", a: true, e: "표준 피아노는 88개의 건반을 가지고 있습니다." },
        { q: "태권도는 일본에서 유래했다.", a: false, e: "태권도는 한국에서 유래한 무술입니다." },
        { q: "바이올린은 현악기이다.", a: true, e: "바이올린은 4개의 현을 가진 현악기입니다." },
        { q: "고흐는 생전에 그림을 많이 팔았다.", a: false, e: "고흐는 생전에 단 1점의 그림만 팔았다고 알려져 있습니다." },
        { q: "FIFA 월드컵 첫 대회는 1930년에 열렸다.", a: true, e: "1930년 우루과이에서 첫 FIFA 월드컵이 개최되었습니다." },
        { q: "모차르트는 오스트리아 출신이다.", a: true, e: "모차르트는 오스트리아 잘츠부르크 출신입니다." },
        { q: "야구에서 스트라이크 3개면 아웃이다.", a: true, e: "3스트라이크는 삼진 아웃입니다." },
        { q: "오페라의 유령은 뮤지컬이다.", a: true, e: "앤드루 로이드 웨버의 뮤지컬 작품입니다." },
        { q: "농구 한 팀은 6명이 뛴다.", a: false, e: "농구는 한 팀 5명이 경기합니다." },
        { q: "피카소는 스페인 출신 화가이다.", a: true, e: "피카소는 스페인 말라가 출신입니다." },
        { q: "기타는 타악기이다.", a: false, e: "기타는 현악기(발현악기)입니다." },
        { q: "배드민턴 셔틀콕에는 거위 깃털이 사용된다.", a: true, e: "공식 셔틀콕에는 거위 깃털 16개가 사용됩니다." },
        { q: "해리포터의 작가는 J.K. 롤링이다.", a: true, e: "해리포터 시리즈는 J.K. 롤링의 작품입니다." },
        { q: "축구 경기 시간은 전후반 합쳐 80분이다.", a: false, e: "축구는 전후반 각 45분, 총 90분입니다." },
        { q: "BTS는 7인조 그룹이다.", a: true, e: "BTS는 7명의 멤버로 구성된 그룹입니다." },
    ]},
    daily: { name: '💡 생활상식', icon: '💡', questions: [
        { q: "비타민C는 열에 약하다.", a: true, e: "비타민C는 열과 산소에 의해 쉽게 파괴됩니다." },
        { q: "꿀은 상하지 않는 식품이다.", a: true, e: "꿀은 수분 함량이 낮고 산성이라 세균이 번식하기 어렵습니다." },
        { q: "커피는 원래 열매이다.", a: true, e: "커피는 커피나무 열매(체리)의 씨앗을 가공한 것입니다." },
        { q: "사람의 지문은 평생 변하지 않는다.", a: true, e: "지문은 태아 때 형성되어 평생 변하지 않습니다." },
        { q: "토마토는 채소이다.", a: false, e: "식물학적으로 토마토는 과일(열매)입니다." },
        { q: "바나나는 나무에서 자란다.", a: false, e: "바나나는 나무가 아닌 여러해살이 풀(초본식물)에서 자랍니다." },
        { q: "낙타의 혹에는 물이 저장되어 있다.", a: false, e: "낙타의 혹에는 지방이 저장되어 있습니다." },
        { q: "성인의 몸은 약 60~70%가 물이다.", a: true, e: "성인 체중의 약 60~70%는 수분입니다." },
        { q: "모기는 암컷만 피를 빤다.", a: true, e: "암컷 모기만 산란을 위해 흡혈합니다." },
        { q: "계란은 냉장고 문에 보관하는 것이 좋다.", a: false, e: "문은 온도 변화가 커서 안쪽 선반이 더 좋습니다." },
        { q: "하품은 전염된다.", a: true, e: "하품은 거울 뉴런의 작용으로 전염됩니다." },
        { q: "손톱은 죽은 세포이다.", a: true, e: "손톱은 케라틴으로 이루어진 죽은 세포입니다." },
        { q: "채소를 오래 삶으면 영양소가 파괴된다.", a: true, e: "수용성 비타민은 열과 물에 의해 손실됩니다." },
        { q: "사람은 하루에 약 1.5리터의 침을 분비한다.", a: true, e: "성인은 하루 약 1~1.5리터의 침을 분비합니다." },
        { q: "머리카락은 한 달에 약 1cm 자란다.", a: true, e: "머리카락은 평균 한 달에 약 1~1.5cm 자랍니다." },
        { q: "감기는 추위 때문에 걸린다.", a: false, e: "감기는 바이러스 감염으로 걸리며, 추위 자체가 원인은 아닙니다." },
        { q: "초콜릿은 개에게 유독하다.", a: true, e: "초콜릿의 테오브로민 성분은 개에게 독성이 있습니다." },
        { q: "사람의 혀에는 맛을 느끼는 영역이 정해져 있다.", a: false, e: "혀 전체에서 모든 맛을 느낄 수 있습니다." },
        { q: "양파를 자를 때 눈물이 나는 것은 황 성분 때문이다.", a: true, e: "양파의 황 화합물이 눈을 자극합니다." },
        { q: "우유를 마시면 키가 큰다.", a: false, e: "키는 유전과 전반적 영양 상태에 의해 결정되며, 우유만으로 키가 크지 않습니다." },
    ]},
    tech: { name: '💻 IT/기술', icon: '💻', questions: [
        { q: "인터넷의 www는 World Wide Web의 약자이다.", a: true, e: "WWW는 World Wide Web의 약자입니다." },
        { q: "1바이트는 8비트이다.", a: true, e: "1바이트(Byte) = 8비트(bit)입니다." },
        { q: "GPS는 미국이 개발한 시스템이다.", a: true, e: "GPS는 미국 국방부가 개발한 위성항법시스템입니다." },
        { q: "5G는 5번째 세대 이동통신을 의미한다.", a: true, e: "5G는 5th Generation의 약자입니다." },
        { q: "LED는 Light Emitting Diode의 약자이다.", a: true, e: "LED는 발광 다이오드입니다." },
        { q: "블루투스는 적외선 통신 기술이다.", a: false, e: "블루투스는 무선 주파수(RF) 기반 근거리 통신 기술입니다." },
        { q: "HTML은 프로그래밍 언어이다.", a: false, e: "HTML은 마크업 언어이지 프로그래밍 언어가 아닙니다." },
        { q: "USB는 Universal Serial Bus의 약자이다.", a: true, e: "USB는 범용 직렬 버스입니다." },
        { q: "세계 최초의 컴퓨터는 애니악(ENIAC)이다.", a: true, e: "1946년 개발된 ENIAC이 최초의 범용 전자 컴퓨터입니다." },
        { q: "애플의 창업자는 빌 게이츠이다.", a: false, e: "애플의 창업자는 스티브 잡스이며, 빌 게이츠는 마이크로소프트 창업자입니다." },
        { q: "SSD는 하드디스크보다 빠르다.", a: true, e: "SSD는 플래시 메모리 기반으로 HDD보다 훨씬 빠릅니다." },
        { q: "파이썬(Python)은 뱀 이름에서 따왔다.", a: false, e: "영국 코미디 그룹 '몬티 파이썬'에서 따온 이름입니다." },
        { q: "QR코드의 QR은 Quick Response의 약자이다.", a: true, e: "QR은 빠른 응답(Quick Response)을 의미합니다." },
        { q: "와이파이(Wi-Fi)는 Wireless Fidelity의 약자이다.", a: false, e: "Wi-Fi는 특별한 약자가 아닌 브랜드명입니다." },
        { q: "CPU는 컴퓨터의 두뇌 역할을 한다.", a: true, e: "CPU(중앙처리장치)는 연산과 제어를 담당합니다." },
        { q: "안드로이드는 애플이 만든 운영체제이다.", a: false, e: "안드로이드는 구글이 개발한 모바일 운영체제입니다." },
        { q: "이메일의 @는 '~에게'라는 뜻이다.", a: false, e: "@는 'at(~에서)'이라는 뜻으로 사용됩니다." },
        { q: "4K 해상도는 가로 약 4000 픽셀이다.", a: true, e: "4K는 가로 해상도 약 3840~4096 픽셀을 의미합니다." },
        { q: "RAM은 전원을 꺼도 데이터가 유지된다.", a: false, e: "RAM은 휘발성 메모리로 전원이 꺼지면 데이터가 사라집니다." },
        { q: "유튜브는 구글 소유이다.", a: true, e: "구글이 2006년에 유튜브를 인수했습니다." },
    ]},
    animal: { name: '🐾 동물/자연', icon: '🐾', questions: [
        { q: "고래는 포유류이다.", a: true, e: "고래는 폐로 호흡하는 해양 포유류입니다." },
        { q: "펭귄은 남극에만 산다.", a: false, e: "펭귄은 남아프리카, 갈라파고스 등 남반구 여러 곳에 삽니다." },
        { q: "문어는 심장이 3개이다.", a: true, e: "문어는 주심장 1개와 아가미심장 2개, 총 3개의 심장을 가집니다." },
        { q: "코알라는 곰의 일종이다.", a: false, e: "코알라는 유대류로 곰과는 전혀 다른 동물입니다." },
        { q: "벌새는 뒤로 날 수 있는 유일한 새이다.", a: true, e: "벌새는 날개를 8자로 움직여 뒤로 비행할 수 있습니다." },
        { q: "기린의 목뼈 개수는 사람과 같다.", a: true, e: "기린도 사람과 같이 목뼈(경추)가 7개입니다." },
        { q: "나비는 발로 맛을 느낀다.", a: true, e: "나비의 발에는 미각 수용체가 있어 맛을 감지합니다." },
        { q: "타조는 날 수 있다.", a: false, e: "타조는 날지 못하는 새입니다." },
        { q: "돌고래는 잠잘 때 뇌의 반쪽만 쉰다.", a: true, e: "돌고래는 반구수면으로 한쪽 뇌만 번갈아 잠을 잡니다." },
        { q: "거미는 곤충이다.", a: false, e: "거미는 8개의 다리를 가진 거미류로 곤충(6다리)이 아닙니다." },
        { q: "상어는 포유류이다.", a: false, e: "상어는 연골어류에 속하는 어류입니다." },
        { q: "고양이는 단맛을 느끼지 못한다.", a: true, e: "고양이는 단맛 수용체가 없어 단맛을 느끼지 못합니다." },
        { q: "개미는 자기 몸무게의 50배를 들 수 있다.", a: true, e: "개미는 체중의 10~50배 무게를 운반할 수 있습니다." },
        { q: "금붕어의 기억력은 3초이다.", a: false, e: "금붕어는 수개월간 기억할 수 있습니다." },
        { q: "박쥐는 새이다.", a: false, e: "박쥐는 날 수 있는 유일한 포유류입니다." },
        { q: "카멜레온은 주변 색에 맞춰 색을 바꾼다.", a: false, e: "카멜레온의 색 변화는 주로 감정과 체온 조절 때문입니다." },
        { q: "코끼리는 점프를 할 수 없다.", a: true, e: "코끼리는 체중 때문에 네 발이 동시에 땅을 떠날 수 없습니다." },
        { q: "해마는 수컷이 새끼를 낳는다.", a: true, e: "해마는 수컷의 육아낭에서 새끼가 태어납니다." },
        { q: "달팽이는 이빨이 없다.", a: false, e: "달팽이는 치설이라는 수천 개의 미세한 이빨을 가지고 있습니다." },
        { q: "플라밍고는 태어날 때부터 분홍색이다.", a: false, e: "플라밍고는 회색으로 태어나며 먹이의 색소로 분홍색이 됩니다." },
    ]},
    korea: { name: '🇰🇷 한국상식', icon: '🇰🇷', questions: [
        { q: "한국의 국화는 무궁화이다.", a: true, e: "대한민국의 국화는 무궁화입니다." },
        { q: "대한민국의 수도는 서울이다.", a: true, e: "대한민국의 수도는 서울특별시입니다." },
        { q: "제주도는 대한민국에서 가장 큰 섬이다.", a: true, e: "제주도는 면적 약 1,849km²로 한국 최대의 섬입니다." },
        { q: "한글날은 10월 3일이다.", a: false, e: "한글날은 10월 9일이며, 10월 3일은 개천절입니다." },
        { q: "대한민국 국보 1호는 숭례문이다.", a: true, e: "숭례문(남대문)은 대한민국 국보 제1호입니다." },
        { q: "한국의 화폐 단위는 원(Won)이다.", a: true, e: "대한민국의 화폐 단위는 원(₩)입니다." },
        { q: "독도는 울릉도보다 일본에 더 가깝다.", a: false, e: "독도는 울릉도에서 약 87km, 일본 오키섬에서 약 157km입니다." },
        { q: "경복궁은 조선시대에 지어졌다.", a: true, e: "경복궁은 1395년 조선 태조 때 창건되었습니다." },
        { q: "한라산은 백두산보다 높다.", a: false, e: "한라산은 1,947m, 백두산은 2,744m입니다." },
        { q: "태극기의 가운데 원은 음양을 상징한다.", a: true, e: "태극기 중앙의 태극 문양은 음양의 조화를 상징합니다." },
        { q: "김치는 유네스코 무형문화유산이다.", a: false, e: "김장 문화가 유네스코 무형문화유산이며, 김치 자체는 아닙니다." },
        { q: "한국에서 가장 긴 강은 한강이다.", a: false, e: "한국에서 가장 긴 강은 낙동강(약 510km)입니다." },
        { q: "광복절은 8월 15일이다.", a: true, e: "광복절은 매년 8월 15일입니다." },
        { q: "한국의 국기는 태극기이다.", a: true, e: "대한민국의 국기는 태극기입니다." },
        { q: "서울의 옛 이름은 한양이다.", a: true, e: "조선시대 서울의 이름은 한양(한성)이었습니다." },
        { q: "한국은 반도 국가이다.", a: true, e: "한국은 한반도에 위치한 반도 국가입니다." },
        { q: "삼성은 일본 기업이다.", a: false, e: "삼성은 대한민국의 기업입니다." },
        { q: "한국의 전통 명절에는 설날과 추석이 있다.", a: true, e: "설날과 추석은 한국의 대표적인 전통 명절입니다." },
        { q: "한국 프로야구는 10개 팀으로 운영된다.", a: true, e: "KBO 리그는 10개 구단으로 운영됩니다." },
        { q: "비빔밥은 일본 음식이다.", a: false, e: "비빔밥은 한국의 전통 음식입니다." },
    ]},
    food: { name: '🍽️ 음식/요리', icon: '🍽️', questions: [
        { q: "초밥은 한국에서 유래했다.", a: false, e: "초밥(스시)은 일본에서 유래한 음식입니다." },
        { q: "파스타는 이탈리아 음식이다.", a: true, e: "파스타는 이탈리아의 대표적인 음식입니다." },
        { q: "와사비는 고추의 일종이다.", a: false, e: "와사비는 십자화과 식물로 고추와는 다릅니다." },
        { q: "카레는 인도에서 유래했다.", a: true, e: "카레는 인도에서 유래한 향신료 요리입니다." },
        { q: "피자의 원산지는 미국이다.", a: false, e: "피자는 이탈리아 나폴리에서 유래했습니다." },
        { q: "두부는 콩으로 만든다.", a: true, e: "두부는 콩을 갈아 만든 두유를 응고시킨 식품입니다." },
        { q: "초콜릿의 원료는 카카오이다.", a: true, e: "초콜릿은 카카오 열매에서 추출한 카카오매스로 만듭니다." },
        { q: "소주의 알코올 도수는 보통 40도이다.", a: false, e: "한국 소주는 보통 16~20도 정도입니다." },
        { q: "된장은 발효식품이다.", a: true, e: "된장은 콩을 발효시켜 만든 전통 발효식품입니다." },
        { q: "햄버거는 독일 함부르크에서 유래했다.", a: true, e: "함부르크 스테이크에서 유래하여 미국에서 발전했습니다." },
        { q: "녹차와 홍차는 같은 나무에서 나온다.", a: true, e: "같은 차나무 잎을 발효 정도에 따라 녹차/홍차로 구분합니다." },
        { q: "마요네즈의 주재료는 우유이다.", a: false, e: "마요네즈의 주재료는 달걀노른자와 식용유입니다." },
        { q: "김밥은 일본의 마키를 모방한 것이다.", a: false, e: "김밥은 한국 고유의 음식으로 발전한 별개의 요리입니다." },
        { q: "식빵의 유통기한은 보통 3일 정도이다.", a: true, e: "식빵은 상온에서 보통 2~3일 정도가 유통기한입니다." },
        { q: "고추장은 매운맛만 있다.", a: false, e: "고추장은 매운맛, 단맛, 감칠맛이 복합적으로 있습니다." },
        { q: "우유는 산성 식품이다.", a: false, e: "우유는 약알칼리성 식품입니다." },
        { q: "라면은 한국에서 처음 만들어졌다.", a: false, e: "라면(인스턴트)은 일본에서 1958년 처음 개발되었습니다." },
        { q: "올리브유는 식물성 기름이다.", a: true, e: "올리브유는 올리브 열매에서 추출한 식물성 기름입니다." },
        { q: "치즈는 우유로 만든다.", a: true, e: "치즈는 우유를 응고·발효시켜 만든 유제품입니다." },
        { q: "고구마는 뿌리 채소이다.", a: true, e: "고구마는 뿌리(덩이뿌리)를 먹는 채소입니다." },
    ]},
    body: { name: '🏥 인체/건강', icon: '🏥', questions: [
        { q: "인간의 위산은 철을 녹일 수 있다.", a: true, e: "위산(염산)의 pH는 1~2로 매우 강합니다." },
        { q: "성인의 뼈는 206개이다.", a: true, e: "성인의 뼈는 206개입니다." },
        { q: "혈액은 심장에서 만들어진다.", a: false, e: "혈액은 골수에서 만들어집니다." },
        { q: "인간의 대장은 소장보다 길다.", a: false, e: "소장은 약 6~7m, 대장은 약 1.5m입니다." },
        { q: "사람의 체온은 보통 36.5도이다.", a: true, e: "정상 체온은 약 36.5~37°C입니다." },
        { q: "비타민D는 햇빛을 받으면 체내에서 합성된다.", a: true, e: "자외선B를 받으면 피부에서 비타민D가 합성됩니다." },
        { q: "인간은 산소 없이 5분 이상 생존할 수 없다.", a: false, e: "훈련된 사람은 10분 이상 숨을 참을 수 있지만, 일반적으로 뇌는 4~6분 후 손상됩니다." },
        { q: "간은 재생 능력이 있다.", a: true, e: "간은 일부가 손상되어도 재생할 수 있는 장기입니다." },
        { q: "사람의 피부는 가장 큰 장기이다.", a: true, e: "피부는 면적 약 1.5~2m²로 인체 최대 장기입니다." },
        { q: "근시는 먼 곳이 잘 보이는 것이다.", a: false, e: "근시는 가까운 곳은 잘 보이지만 먼 곳이 흐리게 보입니다." },
        { q: "인간의 뇌는 약 75%가 물이다.", a: true, e: "뇌의 약 73~75%는 수분으로 이루어져 있습니다." },
        { q: "적혈구에는 핵이 있다.", a: false, e: "성숙한 적혈구는 핵이 없습니다." },
        { q: "사람은 하루에 약 2만 번 호흡한다.", a: true, e: "성인은 하루 약 2만~2만5천 번 호흡합니다." },
        { q: "인간의 뼈는 콘크리트보다 강하다.", a: true, e: "같은 무게 기준으로 뼈는 콘크리트보다 4배 강합니다." },
        { q: "맹장은 아무 기능이 없다.", a: false, e: "맹장(충수)은 면역 기능과 장내 세균 저장소 역할을 합니다." },
        { q: "사람의 눈은 약 1억 개의 색을 구분할 수 있다.", a: true, e: "인간의 눈은 약 1천만~1억 가지 색을 구분합니다." },
        { q: "혈액형은 부모에게서 유전된다.", a: true, e: "ABO 혈액형은 부모의 유전자 조합으로 결정됩니다." },
        { q: "사람의 위는 왼쪽에 있다.", a: true, e: "위는 복부 왼쪽 상부에 위치합니다." },
        { q: "성인의 치아는 32개이다.", a: true, e: "사랑니 포함 성인 치아는 32개입니다." },
        { q: "인간은 물 없이 일주일 이상 생존할 수 있다.", a: false, e: "보통 물 없이 3~5일 정도가 생존 한계입니다." },
    ]},
    math: { name: '🔢 수학/논리', icon: '🔢', questions: [
        { q: "원주율(π)은 정확히 3.14이다.", a: false, e: "π는 무한소수로 약 3.14159...입니다." },
        { q: "삼각형의 내각의 합은 180도이다.", a: true, e: "평면 삼각형의 세 내각의 합은 항상 180°입니다." },
        { q: "0은 짝수이다.", a: true, e: "0은 2로 나누어 떨어지므로 짝수입니다." },
        { q: "1은 소수이다.", a: false, e: "소수는 1보다 큰 자연수이므로, 1은 소수가 아닙니다." },
        { q: "정사각형은 직사각형이다.", a: true, e: "정사각형은 직사각형의 특수한 경우입니다." },
        { q: "2의 10제곱은 1024이다.", a: true, e: "2^10 = 1024입니다." },
        { q: "원의 넓이 공식은 2πr이다.", a: false, e: "원의 넓이는 πr²이며, 2πr은 원의 둘레입니다." },
        { q: "1+1=3이다.", a: false, e: "1+1=2입니다." },
        { q: "100의 제곱근은 10이다.", a: true, e: "√100 = 10입니다." },
        { q: "삼각형의 세 변 중 가장 긴 변은 빗변이다.", a: false, e: "빗변은 직각삼각형에서만 사용하는 용어입니다." },
        { q: "0으로 나누기는 불가능하다.", a: true, e: "수학에서 0으로 나누기는 정의되지 않습니다." },
        { q: "평행한 두 직선은 절대 만나지 않는다.", a: true, e: "유클리드 기하학에서 평행선은 만나지 않습니다." },
        { q: "분수 1/3은 유한소수이다.", a: false, e: "1/3 = 0.333...으로 무한소수(순환소수)입니다." },
        { q: "직각은 90도이다.", a: true, e: "직각은 정확히 90°입니다." },
        { q: "음수 곱하기 음수는 양수이다.", a: true, e: "(-) × (-) = (+)입니다." },
        { q: "정육면체의 면은 8개이다.", a: false, e: "정육면체의 면은 6개입니다." },
        { q: "1km는 100m이다.", a: false, e: "1km = 1000m입니다." },
        { q: "원의 지름은 반지름의 2배이다.", a: true, e: "지름 = 반지름 × 2입니다." },
        { q: "10의 0제곱은 0이다.", a: false, e: "어떤 수의 0제곱은 1입니다 (10⁰ = 1)." },
        { q: "삼각형에서 가장 큰 각의 대변이 가장 길다.", a: true, e: "삼각형에서 큰 각의 대변이 가장 깁니다." },
    ]},
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
function selectCategory(catKey) {
    SFX.init();
    SFX.resume();
    SFX.clickSound();
    SFX.startBGM();

    selectedCategory = catKey;
    const cat = CATEGORIES[catKey];
    questions = shuffle(cat.questions).slice(0, 100);
    currentIdx = 0;
    lives = MAX_LIVES;
    score = 0;
    correctCount = 0;
    answered = false;

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

        if (lives <= 0) {
            showResult(false);
            return;
        }
        if (currentIdx >= questions.length - 1) {
            showResult(true);
            return;
        }

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
        ${cleared ? '전 문제 완주 성공!' : `${currentIdx + 1}번째 문제에서 탈락`}
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
