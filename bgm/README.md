# BGM 폴더

## 파일 구성

| 파일명 | 용도 |
|--------|------|
| stage1.mp3 | 스테이지 1 BGM |
| stage2.mp3 | 스테이지 2 BGM |
| stage3.mp3 | 스테이지 3 BGM |
| stage4.mp3 | 스테이지 4 BGM |
| stage5.mp3 | 스테이지 5 BGM |
| stage6.mp3 | 스테이지 6 BGM |
| stage7.mp3 | 스테이지 7 BGM |
| stage8.mp3 | 스테이지 8 BGM |
| boss.mp3 | 보스전 BGM |
| boss_final.mp3 | 최종 보스전 BGM (스테이지 20+) |
| gameover.mp3 | 게임오버 BGM |

## 재생 규칙

- 스테이지 BGM: stage1 → stage2 → ... → stage8 → stage1 (순환)
- 보스전 (5스테이지마다): boss.mp3 재생
- 스테이지 20 이상 보스전: boss_final.mp3 재생
- 사망 시: gameover.mp3 재생 (루프 없음)
