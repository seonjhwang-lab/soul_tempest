# SOUL TEMPEST : LEGEND OF THE HUNTER

『다크 소울』의 긴장감, 《몬스터 헌터》의 수렵과 부위 파괴, 『젤다』식 원버튼 상호작용을 한 화면에 담은 **탑다운 도트 액션 RPG**입니다.
HTML / CSS / Vanilla JavaScript / Canvas 로만 만들었습니다(프레임워크 · 외부 라이브러리 없음).

- 버전: **v86** (스토리 패키징 & 게임패드 지원)
- 플레이: 휴대폰 세로 · 폴더블 · 태블릿 · PC 어디서나 풀스크린(레터박스 없음)
- 저장: 브라우저 `localStorage` (키 `mg_reboot1`)

---

## 실행

빌드된 한 파일짜리 게임을 브라우저로 열면 됩니다.

```bash
start dist/index.html
```

소스 상태 그대로 열어도 됩니다(`index.html` — 모든 스크립트는 클래식 `<script>`). 로컬 서버가 필요하면:

```bash
python -m http.server 8123
```

정적 파일뿐이라 GitHub Pages · Netlify 같은 정적 호스팅에 그대로 올릴 수 있습니다.

---

## 조작

| 동작 | 터치 | 키보드 | 게임패드 |
| --- | --- | --- | --- |
| 이동 | 화면 왼쪽 절반 가상 조이스틱 | WASD · 방향키 | 왼쪽 스틱 · 십자키 |
| ⚔️ 공격 (꾹 누르면 무기별 홀드 액션) | ⚔ 버튼 | J · Space · E | X |
| 💬 대화 · 조사 · 상호작용 | ⚔ 버튼(대상 앞에서) | J · Space · E | A |
| 🪽 구르기 · 회피 | 🪽 버튼 | K · Shift | Y |
| ✨ 비전 마법 | ✨ 버튼 | L | B |
| 🧪 에스트 물약 | 🧪 버튼 | H · Q | LB / LT |
| 🔥 화톳불 전송 | 화톳불에서 휴식 | 화톳불에서 휴식 | RB / RT (화톳불 곁) |
| 마법 바꾸기 | HUD 마법 아이콘 | R | SELECT |
| 📜 장비 · 도감 | 📜 버튼 | Tab · I | START |
| 창 닫기 · 컷씬 스킵 | ✕ · 화면 터치 | Esc | B · START |

게임패드는 표준 배치(Xbox / PlayStation / 블루투스 패드)를 지원하고, 상쇄 · 부위 파괴 · 진 모아베기 · 피격 때 진동합니다(지원하는 기기에서만).

---

## 주요 내용

- **전투**: 3단 콤보 · 무적 구르기 · 저스트 회피(슬로모션) · ⚔️ 상쇄(Clash Parry) · 계열별 홀드 액션
  - 한손검(가드 → 실드 배쉬) · 대검(3단 진 모아베기) · 태도(발도 일섬) · 비전 마검(비전 단두대)
- **보스 5 + 숨겨진 강자 2**: 연계 · 엇박자 · ⚡ 황금 안광(상쇄 가능) / 🩸 진홍 안광(상쇄 · 가드 불능) 패턴, 부위 파괴, 2페이즈 각성, 아종
- **사냥꾼의 대장간**: 《몬스터 헌터》식 무기 트리 4계열 × 3단 → ★궁극 「천상제일검」 · 미확인 무기 블라인드 · 단조 미니게임 · 갑주 6종(외형이 통째로 바뀜)
- **수렵 기록**: 보스 방 진입부터 토벌까지 시간 · 피격 수 → 👑S / A / B 랭크 (📜 도감)
- **엔드 콘텐츠**: 용화산 북동쪽 끝 「왕의 무덤」(5대 괴수 토벌 뒤 개방) · 「심연의 투기장」 무회복 보스 러시 8라운드
- **연출**: 다이내믹 카메라(임팩트 줌 · 방향성 펀치) · 무기별 참격 궤적 · 부위 파편 물리 · HD-2D 조명
- **스토리**: 도트 시네마틱 오프닝(「새로 시작」) · 기사왕 카인 토벌 뒤 진 엔딩과 엔딩 크레딧 (언제든 스킵)

---

## 빌드

```bash
bash build.sh
```

`index.html` + `style.css` + `js/*.js` 를 하나로 묶어 `dist/index.html`(독립 실행)과 `artifact.html`(Claude Artifact 게시용)을 만듭니다. 모듈 순서는 `build.sh` 의 `JS_FILES` 가 정합니다.

도트 그림을 다시 만들려면 [Aseprite](https://www.aseprite.org/) 가 필요합니다.

```bash
bash assets/tools/build_sprites.sh
```

`assets/aseprite/*.lua` 생성기가 `assets/sprites/*.aseprite · png · json` 을 만들고, `assets/tools/pack_sprites.js` 가 그것을 `js/sprites.js` 로 묶습니다. 그다음 `bash build.sh` 를 다시 실행합니다.

---

## 폴더

| 경로 | 내용 |
| --- | --- |
| `js/` | 게임 모듈(core · data · player · combat · boss · forge · ui · story · game …) |
| `assets/aseprite/` | 도트 생성 스크립트(Aseprite Lua) |
| `assets/sprites/` | 생성된 스프라이트 시트 원본 |
| `assets/fonts/` | Galmuri11 픽셀 폰트 |
| `dist/index.html` | 빌드된 한 파일짜리 게임 |

`GAME_DESIGN.md` · `AI_HANDOFF.md` · `GEMINI.md` 는 리부트 이전(달빛 숲의 수호자 / Lazy Diner 프로토타입) 시절 문서로, 기록용으로 남겨 두었습니다.

---

## 크레딧

- 폰트: [Galmuri](https://github.com/quiple/galmuri) © Minseo Lee (quiple) — SIL Open Font License 1.1
- 개발: SOUL TEMPEST 개발팀 · Claude Code
