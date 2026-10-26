/* ==========================================================================
   data.js — 모든 수치와 내용의 유일한 자리: 소재 · 무기 계보(4계열 × 3단 = 12종) · 사냥꾼 갑주(5종) · 비전 마법(6종) · 마법 각인 ·
             몬스터 · 보스(5종) · 맵(필드 5대 바이옴 + 지하 던전 5곳 × 전실/둥지 + 심연의 투기장)
   (다른 파일은 여기의 값을 읽기만 한다. 밸런스는 이 파일만 고치면 된다.)
   성장은 레벨업이 아니라 오직 ① 대장간 단조(무기 · 갑주) ② 탐험 수집품(황금 씨앗 = 에스트 +1, 고대 성소 = 최대 HP/MP/SP) 뿐이다.
   v84: 무기 특성 1줄 · 궁극 파생 천상제일검 · 왕의 무덤 입구(용화산 북동쪽 끝) · 보스 패턴(연계 · 엇박자 · 황금/진홍 안광 · 백스텝 · 잡기) · 무회복 보스 러시 8라운드 · 미궁/고대 병기/교환 폐기
   v83: 2페이즈 각성 · 히든 진 보스(심연의 기사왕) · 성장형 고대 병기(천상제일검) · 유물 6종 · 영혼 수렵 파트너 · 붉은 폭풍의 밤(난입 괴수) · 심연의 지하 미궁 15층
   v82: 마법 재사용 대기시간 · 마법 증폭 상한 1.35× · 방랑 NPC 5인 · 사신수 성소 4곳 · 보스 둥지 지형 함정 · 아종 보스 · 던전 전실 봉인 퍼즐 · 상쇄 · 신화 무기 「격」
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG;

  /* 소재: ic = icons 시트 이름, emo = 글 대신 쓰는 이모지, from = 어디서 얻는가(한 줄) */
  var MATS = {
    ore: { name: '철광석', ic: 'ore', emo: '🪨', from: '광맥 바위 — ⛏ 채광 (모든 구역)' },
    wood: { name: '목재', ic: 'wood', emo: '🪵', from: '나무 — 🪓 벌목 (신록의 숲)' },
    herb: { name: '약초', ic: 'herb', emo: '🌿', from: '약초 덤불 — 🌿 채집 (숲 · 유적)' },
    slime: { name: '이끼 점액', ic: 'moss_core', emo: '🟢', from: '신록의 숲 — 이끼 슬라임' },
    crystal: { name: '수정 조각', ic: 'mithril', emo: '💎', from: '수정 고원 — 수정 광맥 · 수정 슬라임' },
    thorn: { name: '가시 조각', ic: 'fang', emo: '🦷', from: '홍련의 유적 — 가시 임프' },
    gold_ore: { name: '금광석', ic: 'ingot', emo: '🟨', from: '숨겨진 황금 광맥 (가시덩굴 · 바위 장벽 너머)' },
    frost: { name: '만년빙 결정', ic: 'mt_frost', emo: '❄️', from: '만년설의 빙하 협곡 — 빙결 광맥 · 설원 늑대 · 얼음 정령' },
    lava: { name: '용암석', ic: 'mt_lava', emo: '🌋', from: '칠흑의 용화산 성소 — 용암 광맥 · 용암 골렘 · 화산 도마뱀' },
    crown: { name: '거목의 왕관뿔', ic: 'antler', emo: '🦌', from: '[고대 뿌리 신전] 고대 거목 수호자 — 왕관뿔 파괴 · 토벌', boss: 1 },
    core: { name: '골렘의 수정외피', ic: 'golem_heart', emo: '🧿', from: '[결정 동굴] 수정 갑주 골렘 — 수정외피 파괴 · 토벌', boss: 2 },
    heart: { name: '심연의 가시핵', ic: 'thorn_heart', emo: '🥀', from: '[가시 제단] 심연의 가시 군주 — 가시핵 파괴 · 토벌', boss: 3 },
    ffang: { name: '서리 송곳니', ic: 'mt_ffang', emo: '🦷', from: '[얼음 궁전] 빙하의 서리 송곳니 — 송곳니 파괴 · 토벌', boss: 4 },
    dgem: { name: '태초의 용옥', ic: 'mt_dgem', emo: '🔮', from: '[폭풍룡의 둥지] 폭풍의 고룡 아스트랄 — 용옥 파괴 · 토벌', boss: 5 },
    abyss: { name: '심연의 정수', ic: 'mt_abyss', emo: '🌑', from: '⚔️ 심연의 투기장 — 강화된 보스 연속 수렵(초월 재료)', boss: 6 }
  };
  /* v83: 붉은 폭풍의 밤 난입 괴수 · 왕의 무덤 진 보스의 소재 */
  MATS.ragar = { name: '파멸수의 뇌각', ic: 'mt_abyss', emo: '⚡', from: '🌑 붉은 폭풍의 밤 — 광포한 파멸수 라가르(난입 괴수)', boss: 7 };
  MATS.kcrown = { name: '기사왕의 흑관', ic: 'mt_abyss', emo: '👑', from: '[왕의 무덤] 심연의 기사왕 카인 — 흑관 파괴 · 토벌', boss: 8 };
  var MAT_ORDER = ['ore', 'wood', 'herb', 'slime', 'crystal', 'thorn', 'gold_ore', 'frost', 'lava', 'crown', 'core', 'heart', 'ffang', 'dgem', 'abyss', 'ragar', 'kcrown'];

  /* 무기 계보: 4계열 × 3단(1티어 철제 · 2티어 거목/골렘/가시 · 3티어 ★신화 = 서리 송곳니/폭풍룡 소재).
     sprite = forge 시트의 wi_(도감 아이콘) / wpn_(손에 든 모양). tag = 카드 한 줄 출처. elem = 근접 궤적 원소(fire · frost · storm). */
  var LINES = [
    { id: 'one', name: '한손검', note: '신속 3연격 · 홀드: 방패 가드 → 실드 배쉬', mat: 'slime', boss: 'crown' },
    { id: 'great', name: '대검', note: '홀드: 백 → 금 → 진홍 3단 참모아베기', mat: 'crystal', boss: 'core' },
    { id: 'tachi', name: '태도', note: '적중마다 검신 연마 · 홀드: 발도 기인 일섬', mat: 'thorn', boss: 'heart' },
    { id: 'arcane', name: '비전 마검', note: '적중 MP +3 · 홀드: 비전 단두대(MP 35↑ · 재충전 4초)', mat: 'crystal', boss: 'heart' }
  ];
  var WEAPONS = {
    wanderer: { name: '방랑자의 장검', line: 'one', tier: 0, atk: 10, spd: 1.0, reach: 0, sprite: null, recipe: null, tag: '처음부터', fx: '기본 모아베기', basic: true },
    iron_sword: { name: '강철 한손검', line: 'one', tier: 1, atk: 13, spd: 1.2, reach: 0, sprite: 'steel_sword', recipe: { ore: 3, wood: 1 }, tag: '⛏ 숲 광맥', src: '철광석은 광맥 바위, 목재는 숲의 나무', fx: '홀드: 방패 가드 → 실드 배쉬' },
    grove_blade: { name: '거목의 수호검', line: 'one', tier: 2, req: 'iron_sword', atk: 20, spd: 1.2, reach: 2, sprite: 'world_sword', recipe: { ore: 3, slime: 3, crown: 1 }, tag: '🦌 거목', src: '[고대 뿌리 신전] 고대 거목 수호자 — 왕관뿔', fx: '3타 적중 시 HP 회복' },
    frost_saber: { name: '서리폭풍 성검', line: 'one', tier: 3, myth: true, req: 'grove_blade', atk: 30, spd: 1.25, reach: 3, elem: 'frost', sprite: 'frost_sword', recipe: { frost: 4, ffang: 1, gold_ore: 2 }, umat: 'frost', ubos: 'ffang', tag: '❄️ 서리 송곳니', src: '[얼음 궁전] 서리 송곳니 + 만년빙 결정(빙하 협곡)', fx: '★격 「빙풍격」 · 적중 시 둔화' },
    iron_great: { name: '무쇠 대검', line: 'great', tier: 1, atk: 22, spd: 0.72, reach: 4, wide: true, sprite: 'mithril_great', recipe: { ore: 5, wood: 2 }, tag: '⛏ 숲 광맥', src: '철광석 · 목재(신록의 숲)', fx: '홀드: 3단 참모아베기' },
    crystal_great: { name: '수정 갑주 대검', line: 'great', tier: 2, req: 'iron_great', atk: 32, spd: 0.72, reach: 4, wide: true, sprite: 'antler_great', recipe: { ore: 4, crystal: 3, core: 1 }, tag: '🧿 골렘', src: '[결정 동굴] 수정 갑주 골렘 — 수정외피', fx: '모아베기에 수정 충격파' },
    ruin_great: { name: '흑룡 파멸대검', line: 'great', tier: 3, myth: true, req: 'crystal_great', atk: 46, spd: 0.72, reach: 5, wide: true, elem: 'storm', sprite: 'dragon_great', recipe: { lava: 4, dgem: 1, ore: 4 }, umat: 'lava', ubos: 'dgem', tag: '🔮 폭풍룡', src: '[폭풍룡의 둥지] 태초의 용옥 + 용암석(용화산)', fx: '★격 「흑룡격」 · 진 모아베기에 낙뢰' },
    wind_tachi: { name: '바람의 태도', line: 'tachi', tier: 1, atk: 15, spd: 1.0, reach: 8, sprite: 'moss_sword', recipe: { ore: 3, herb: 2, slime: 2 }, tag: '🟢 숲 슬라임', src: '이끼 점액은 신록의 숲 슬라임', fx: '홀드: 발도 기인 일섬' },
    thorn_tachi: { name: '홍련 가시태도', line: 'tachi', tier: 2, req: 'wind_tachi', atk: 23, spd: 1.0, reach: 8, elem: 'fire', sprite: 'flame_sword', recipe: { ore: 3, thorn: 4, heart: 1 }, tag: '🥀 가시 군주', src: '[가시 제단] 심연의 가시 군주 — 가시핵', fx: '화염 베기 — 얼음 장벽을 녹인다' },
    raijin_tachi: { name: '뇌신 일섬도', line: 'tachi', tier: 3, myth: true, req: 'thorn_tachi', atk: 33, spd: 1.05, reach: 9, elem: 'storm', sprite: 'thunder_tachi', recipe: { lava: 3, dgem: 1, ffang: 1 }, umat: 'lava', ubos: 'dgem', tag: '🔮 폭풍룡', src: '태초의 용옥 + 서리 송곳니 + 용암석', fx: '★격 「뇌신격」 · 일섬 +2타' },
    rune_blade: { name: '룬 마검', line: 'arcane', tier: 1, atk: 12, spd: 1.0, reach: 2, sprite: 'golem_arcane', spell: 0.2, mpHit: 3, recipe: { ore: 2, crystal: 2, gold_ore: 1 }, tag: '💎 고원 · 🟨 금맥', src: '수정 조각(수정 고원) · 금광석(숨겨진 황금 광맥)', fx: '적중마다 MP +3' },
    abyss_blade: { name: '심연의 마검', line: 'arcane', tier: 2, req: 'rune_blade', atk: 19, spd: 1.0, reach: 2, sprite: 'thorn_arcane', spell: 0.3, mpHit: 3, recipe: { gold_ore: 2, crown: 1, heart: 1 }, tag: '🥀 군주 · 🦌 거목', src: '가시 군주의 가시핵 + 거목의 왕관뿔', fx: '마법 위력 +30%' },
    astral_blade: { name: '아스트랄 용마검', line: 'arcane', tier: 3, myth: true, req: 'abyss_blade', atk: 27, spd: 1.0, reach: 3, elem: 'storm', sprite: 'astral_arcane', spell: 0.35, mpHit: 3, recipe: { frost: 2, lava: 2, dgem: 1, gold_ore: 2 }, umat: 'frost', ubos: 'dgem', tag: '🔮 폭풍룡', src: '태초의 용옥 + 만년빙 결정 + 용암석', fx: '★격 「성흔격」 · 마법 위력 +35%' }
  };
  /* v84 ★궁극 파생 「천상제일검」: 대장간 무기 계보의 맨 위 — 3티어 ★신화 무기를 하나라도 벼렸고, 심연의 기사왕의 흑관을 손에 넣으면 벼릴 수 있다.
     홀드는 대검식 3단 참모아베기 · 3단에서 떼면 「천상 궁극기」(전 계열 호환) · 근접 적중마다 황금 용격 */
  WEAPONS.celestial_blade = { name: '천상제일검', line: 'ultimate', tier: 4, myth: true, ultimate: true, atk: 52, spd: 0.95, reach: 6, wide: true, elem: 'storm', sprite: 'ancient_3', recipe: { kcrown: 1, dgem: 1, abyss: 3 }, tag: '👑 기사왕', src: '[왕의 무덤] 심연의 기사왕 카인 — 기사왕의 흑관', fx: '★궁극 · 천상 궁극기 + 황금 용격' };
  var ULTIMATE = 'celestial_blade';

  var WEAPON_ORDER = ['iron_sword', 'grove_blade', 'frost_saber', 'iron_great', 'crystal_great', 'ruin_great', 'wind_tachi', 'thorn_tachi', 'raijin_tachi', 'rune_blade', 'abyss_blade', 'astral_blade'];
  /* 연마(+1~+3): 단계마다 공격력 +12%. 계열 소재/보스 소재가 든다. ★신화 무기의 +3 은 심연의 정수(초월 재료)가 든다. */
  function upgradeCost(wid, lvl) {
    var L = null, w = WEAPONS[wid]; for (var i = 0; i < LINES.length; i++) if (LINES[i].id === w.line) L = LINES[i];
    var o = {};
    if (w.ultimate) { if (lvl === 1) { o.abyss = 2; o.dgem = 1; } else if (lvl === 2) { o.abyss = 3; o.ragar = 1; } else { o.abyss = 4; o.kcrown = 1; } return o; }   // v84 ★궁극 파생 연마: 심연의 정수 + 상위 보스 소재
    if (w.tier === 3) {
      if (lvl === 1) { o.ore = 3; o[w.umat] = 3; } else if (lvl === 2) { o.gold_ore = 2; o[w.umat] = 4; } else if (lvl === 3) { o.abyss = 1; o[w.ubos] = 1; }
      return o;
    }
    if (lvl === 1) { o.ore = 2; o[L.mat] = (o[L.mat] || 0) + 2; }
    else if (lvl === 2) { o.ore = 3; o.gold_ore = 1; o[L.mat] = (o[L.mat] || 0) + 3; }
    else if (lvl === 3) { o.gold_ore = 2; o[L.boss] = 1; }
    return o;
  }

  /* 사냥꾼 갑주 5종(대장간에서 무기와 같은 단조로 벼린다). hp = 최대 체력 +, 나머지는 효과 */
  var ARMORS = {
    coat: { name: '방랑자의 외투', tier: 0, hp: 0, sprite: null, recipe: null, fx: '처음부터 입은 낡은 외투', basic: true },
    moss_mail: { name: '거목의 수호갑주', tier: 1, hp: 20, regen: 0, sprite: 'ar_moss', recipe: { slime: 3, wood: 3, herb: 2 }, tag: '🟢 숲', src: '이끼 점액 · 목재 · 약초(신록의 숲)', fx: 'HP +20' },
    crystal_mail: { name: '수정의 결계갑주', tier: 2, hp: 40, guard: 0.1, sprite: 'ar_crystal', recipe: { crystal: 4, ore: 4, core: 1 }, tag: '🧿 골렘', src: '수정 조각 + 골렘의 수정외피', fx: 'HP +40 · 받는 피해 -10%' },
    thorn_mail: { name: '홍련의 가시갑주', tier: 2, hp: 60, atk: 0.1, sprite: 'ar_thorn', recipe: { thorn: 4, gold_ore: 1, heart: 1 }, tag: '🥀 군주', src: '가시 조각 + 심연의 가시핵', fx: 'HP +60 · 공격력 +10%' },
    frost_mail: { name: '설원의 빙랑갑주', tier: 3, myth: true, hp: 90, regen: 0.35, sprite: 'ar_frost', recipe: { frost: 5, ffang: 1, ore: 3 }, tag: '❄️ 서리 송곳니', src: '만년빙 결정 + 서리 송곳니', fx: 'HP +90 · 기력 회복 속도 +35%' },
    astral_mail: { name: '아스트랄 용린갑주', tier: 3, myth: true, hp: 120, crit: 0.25, atk: 0.2, sprite: 'ar_astral', recipe: { lava: 4, dgem: 1, gold_ore: 2 }, tag: '🔮 폭풍룡', src: '용암석 + 태초의 용옥', fx: 'HP +120 · 치명타율 +25% · 공격력 +20%' }
  };
  var ARMOR_ORDER = ['moss_mail', 'crystal_mail', 'thorn_mail', 'frost_mail', 'astral_mail'];

  /* 비전 마법 6종(MP — 원거리 공격은 오직 이 버튼으로만). v82: 마법마다 고유 재사용 대기시간(cd 초) — ✨ 버튼 위의 부채꼴과 남은 초로만 보인다.
     건곤대나이·극은 《바람의 나라》처럼 현재 HP 의 12% 를 대가로 태운다(최대 HP 15% 이하면 시전 불가) · 시전 뒤 0.35초 후딜. */
  var SPELLS = {
    wave: { name: '초승달 열파참', mp: 14, cd: 2.2, ic: 'sp_wave', desc: '전방으로 관통하는 거대 검기' },
    fire: { name: '홍련의 화염진', mp: 24, cd: 3.5, ic: 'sp_fire', desc: '주변을 불바다로 — 가시덩굴을 태우고 얼음 장벽을 녹인다' },
    bolt: { name: '천벌의 벼락창', mp: 28, cd: 3.5, ic: 'sp_bolt', desc: '가장 강한 적에게 낙뢰 — 기절' },
    frost: { name: '절대영도 눈보라', mp: 30, cd: 5.0, ic: 'sp_frost', desc: '광역 빙결 피해 + 적 둔화 — 흑요석 봉인암을 얼려 깨뜨린다' },
    storm: { name: '폭풍의 칼날장막', mp: 26, cd: 5.0, ic: 'sp_storm', desc: '5초간 몸 주변을 도는 회전 칼바람' },
    abyss: { name: '건곤대나이·극', mp: 45, hpPct: 0.12, hpMin: 0.15, cd: 8.0, rec: 0.35, ic: 'sp_abyss', desc: 'MP와 현재 HP 12%를 태워 전방에 압도적인 심연 참격' }
  };
  var SPELL_ORDER = ['wave', 'fire', 'bolt', 'frost', 'storm', 'abyss'];

  var RUNES = {
    edge: { name: '예리한 각인', icon: '⚔️', desc: '공격력 +15%' },
    vamp: { name: '피의 각인', icon: '🩸', desc: '적중 시 20% 확률로 HP +3' },
    wind: { name: '질풍의 각인', icon: '🪽', desc: '기력(SP) 회복 +35%' },
    mana: { name: '비전 샘의 각인', icon: '🔮', desc: '저스트 회피·상쇄 MP +15 · 3타 막타 MP +8 · 멈춰 서면 MP +1.5/s' },
    iron: { name: '강철 피부의 각인', icon: '🛡️', desc: '받는 피해 -15%' },
    ember: { name: '잉걸불 각인', icon: '🔥', desc: '3타 · 모아베기 적중 시 화상' },
    echo: { name: '잔향의 각인', icon: '💠', desc: '저스트 회피 시 MP +15 추가' },
    flask: { name: '에스트 증류의 각인', icon: '🧪', desc: '에스트 회복량 +30%' }
  };
  var RUNE_ORDER = ['edge', 'vamp', 'wind', 'mana', 'iron', 'ember', 'echo', 'flask'];

  var PLAYER = {
    HP: 100, MP: 60, SP: 100, SPEED: 64, ESTUS: 3, ESTUS_MAX: 7, ESTUS_HEAL: 45,
    SP_REGEN: 42, SP_DELAY: 0.55, MP_REGEN: 1.6,
    ATK_DUR: [0.30, 0.30, 0.46], ATK_SP: [10, 10, 14], STAGE_MULT: [1, 1.1, 1.6], COMBO_WINDOW: 0.32,
    CHARGE_MIN: 0.28, CHARGE_FULL: 0.75, CHARGE_RELEASE: 0.2, CHARGE_SP: 24, CHARGE_MULT: 2.5, CHARGE_DUR: 0.5,
    ROLL_SP: 14, ROLL_BUFFER: 0.18, ROLL_DUR: 0.38, ROLL_SPEED: 158, IFRAME: [0, 0.3], JUST_WINDOW: 0.24, JUST_SLOW: 0.22,
    REACH: 22, ARC: 62, CRIT_RAND: 0.08, LOCK_RANGE: 180,
    /* 계열별 홀드 액션 */
    GUARD_ARC: 80, GUARD_SP: 8, BASH_DUR: 0.3, BASH_SPEED: 170, BASH_MULT: 1.8, BASH_STUN: 1.0, BASH_PART: 1.5,
    GS_STAGE: [0.35, 0.8, 1.25], GS_OVER: 2.1, GS_MULT: [1.6, 2.5, 3.5], GS_PART: [1, 1.5, 3],
    KI_HIT: 18, KI_LV: [1, 36, 72], KI_DECAY: 8, KI_HOLD: 3.0, IAI_DIST: 76, IAI_DUR: 0.2, IAI_DELAY: 0.25, IAI_HITS: 5, IAI_MULT: 0.65,
    GUILLO_MIN: 35, GUILLO_DELAY: 0.35, GUILLO_CD: 4.0,
    SEED_HP: 15, SHRINE: { hp: 15, mp: 10, sp: 15 },
    /* v82 마검사 밸런스: 마법 증폭은 무기 · 각인 · 버프를 모두 더해 최대 +35%(1.35×) · 비전 샘의 각인 */
    SPELL_CAP: 0.35, MANA_STILL: 1.5, MANA_JUST: 15, MANA_FINISH: 8,
    /* v82 《다크 소울》 상쇄(Clash Parry): 적이 내리꽂기 직전 0.22초(또는 타격 순간)에 홀드 액션을 맞히거나 방패를 막 올렸다 → 확정 치명타 2.5초 */
    PARRY_WINDOW: 0.22, PARRY_STRIKE: 0.12, PARRY_PART: 0.25, RIPOSTE: 2.5, GUARD_JUST: 0.22,
    /* v82 《바람의 나라》 신화 무기 「격(格)」: 근접 적중 20% · 저스트 회피/상쇄 직후 첫 타는 100% */
    GYEOK_CHANCE: 0.2, GYEOK_MULT: 1.1
  };

  /* v82 사신수(四神獸)의 성소: 동 · 서 · 남 · 북 — 가호는 동시에 하나(다른 성소에서 언제든 바꾼다), 발밑의 은은한 신수 오라로만 보인다 */
  var BEASTS = {
    dragon: { name: '동방 청룡', icon: '🐉', col: '#4deeea', sprite: 'beast_dragon', x: 2330, y: 1000, desc: '이동 속도 +15% · 구르기/공격 시 푸른 뇌전 추가 피해', short: '이동 +15% · 뇌전', short: '이동 +15% · 뇌전', speed: 0.15, volt: 0.18 },
    tiger: { name: '서방 백호', icon: '🐯', col: '#eef6ff', sprite: 'beast_tiger', x: 64, y: 1240, desc: '치명타 확률 +18% · 근접 치명타 적중 시 출혈', short: '치명 +18% · 출혈', short: '치명 +18% · 출혈', crit: 0.18, bleed: 6 },
    phoenix: { name: '남방 주작', icon: '🦅', col: '#ff8a3c', sprite: 'beast_phoenix', x: 1180, y: 1506, desc: '화염 피해 +25% · 죽음의 일격을 받으면 휴식당 1회 HP 30%로 재탄생', short: '화염 +25% · 재탄생', short: '화염 +25% · 재탄생', fire: 0.25, revive: 0.3 },
    turtle: { name: '북방 현무', icon: '🐢', col: '#7ad8a8', sprite: 'beast_turtle', x: 1200, y: 70, desc: '받는 피해 -20% · 피격 시 적에게 충격파 반사', short: '피해 -20% · 반사', short: '피해 -20% · 반사', guard: 0.2, reflect: 0.6 }
  };
  var BEAST_ORDER = ['dragon', 'tiger', 'phoenix', 'turtle'];

  /* v82 방랑 NPC 5인(스마트 원버튼 [💬 대화] → 화면 아래의 슬림한 대화 바). 카일은 토벌한 보스 수에 따라 화톳불을 옮겨 다닌다. */
  var NPCS = {
    baldr: { name: '단조장인 발드르', emo: '🔨', sprite: 'npc_baldr', x: 412, y: 1346, col: '#ffb238' },
    kyle: { name: '잿빛 사냥꾼 카일', emo: '🔥', sprite: 'npc_kyle', stops: [[278, 1394], [1220, 1452], [738, 552], [1684, 1304], [1988, 654]], col: '#c4ccd6' },
    isilia: { name: '비전 현자 이실리아', emo: '🧙‍♀️', sprite: 'npc_isilia', x: 1490, y: 1300, col: '#c4a8ff' },
    bork: { name: '설원 행상인 보르크', emo: '🎒', sprite: 'npc_bork', x: 1744, y: 1302, col: '#bff6ff' },
    ghost: { name: '선대 사냥꾼의 망령', emo: '⚔️', sprite: 'npc_ghost', x: 2052, y: 652, col: '#8ae8f8' }
  };
  var NPC_ORDER = ['baldr', 'kyle', 'isilia', 'bork', 'ghost'];
  var NPC_CFG = {
    RANGE: 48, LEAVE: 66,
    /* 카일의 보급품(토벌 단계마다 한 번) */
    SUPPLY: [{ gold: 50, mats: { herb: 3, ore: 2 } }, { gold: 80, mats: { gold_ore: 1, crystal: 2 } }, { gold: 110, mats: { gold_ore: 2, thorn: 2 } }, { gold: 140, mats: { frost: 2, gold_ore: 2 } }, { gold: 180, mats: { lava: 2, gold_ore: 2 } }],
    RUNE_COST: 80,
    /* v84 NPC 는 교환하지 않는다 — 진행도에 맞는 다음 목적지 · 패턴 공략 힌트 · 버프 · 골드 상점(에스트 보충 · 영약)만 */
    REFILL: 40, ELIXIR: { cost: 120, t: 120, atk: 0.15, sp: 0.3 },
    BUFF: { whet: { cost: 60, t: 150, atk: 0.12 }, arc: { cost: 60, t: 150, gyeok: 0.1, sp: 0.2 } },
    /* 망령의 수렵 현상금: 토벌 ×2 + 부위 파괴 ×1 + 투기장 제패 ×5 점 — 1점 30골드, 6점마다 심연의 정수 1 */
    BOUNTY: { gold: 30, abyssEvery: 6 }
  };

  /* v82 《몬스터 헌터》 보스 둥지의 불안정한 지형(둥지마다 2개): 보스를 기둥 쪽으로 유인해 보스가 들이받게 하거나,
     보스가 곁에 있을 때 모아베기/마법으로 무너뜨리면 — 💥 지형 붕괴 대경직(최대 체력 12% · 부위 내구도 40% · 3.5초 그로기) */
  var TRAPS = {
    root: { name: '고대 균열 석주', sprite: 'trap_root', col: ['#6e4220', '#8ad070', '#4a2a14'] },
    crystal: { name: '과충전 수정 기둥', sprite: 'trap_crystal', col: ['#c4a8ff', '#efe4ff', '#8ae8f8'] },
    thorn: { name: '부식된 화로 기둥', sprite: 'trap_brazier', col: ['#ff7424', '#ffb238', '#5e2a2a'] },
    ice: { name: '거대 고드름 기둥', sprite: 'trap_icicle', col: ['#e4fdff', '#8ad2ea', '#ffffff'] },
    storm: { name: '용암 간헐천 암석', sprite: 'trap_geyser', col: ['#ff9a3c', '#1a1622', '#ffd070'] }
  };
  var TRAP = { r: 10, near: 70, dmg: 0.12, part: 0.4, groggy: 3.5, spots: [[84, 132], [316, 132]] };

  /* v82 아종(Subspecies): 토벌한 보스의 둥지에 화톳불 휴식 뒤 다시 가면 · 심연의 투기장에서는 언제나 — 색조/속성이 변이, 공격 속도 +15% · 강화 패턴 */
  var VARIANTS = {
    b1: { name: '맹독의 고대 거목', filter: 'hue-rotate(150deg) saturate(1.7)', color: '#b8ff5a', zone: 'poison' },
    b2: { name: '홍련 수정 골렘', filter: 'hue-rotate(115deg) saturate(1.9) brightness(1.05)', color: '#ff6a4a', zone: 'fire' },
    b3: { name: '창염의 가시 군주', filter: 'hue-rotate(185deg) saturate(1.5)', color: '#6ab8ff' },
    b4: { name: '옥염의 서리 송곳니', filter: 'hue-rotate(-70deg) saturate(1.8)', color: '#7affc0' },
    b5: { name: '심연의 폭풍룡 아스트랄', filter: 'hue-rotate(70deg) saturate(1.4) brightness(0.85)', color: '#c08aff' }
  };
  var VARIANT = { hp: 1.25, dmg: 1.15, wind: 0.85, rec: 0.85, extra: 2, gold: 1.5, abyss: 1 };

  /* ==================================================================== v83 4대 하이브리드 컨텐츠 */
  /* 《다크 소울》 보스 2페이즈 각성: 체력 50% — 0.6초 포효 + 충격파 · 몸에 2페이즈 오라가 영구 점화 · 예비 동작/후딜이 빨라지고 연계가 붙는다 */
  var PHASE2 = { roar: 0.6, shockR: 74, shockDmg: 14, chain: 0.45, aura: { b1: 'fire', b2: 'storm', b3: 'abyss', b4: 'frost', b5: 'storm', k1: 'abyss', rg: 'fire' } };
  /* 히든 6번째 진(眞) 보스: 인간형 검사 「심연의 기사왕 카인」 — [왕의 무덤](용화산 북동쪽 끝, 폭풍룡을 쓰러뜨리면 봉인이 풀린다) */
  var KING = { id: 'k1', name: '심연의 기사왕 카인', en: 'Kain, the Abyssal Knight King', sprite: 'k1', scale: 1.0, hp: 3200, r: 13, speed: 74, map: 'kingtomb', home: [220, 210], arena: 220, dmg: 30, hy: 30,
    part: { name: '기사왕의 흑관', dur: 300, ic: 'mt_abyss', y: 58 }, mat: 'kcrown', common: 'abyss', atks: ['kdash', 'kleap', 'kwave', 'kcleave', 'grab'], color: '#b090f0', weak: '흑염 검기 3 → 1줄 · 연속 베기 3 → 2회', humanoid: true };
  /* 《몬스터 헌터》 붉은 폭풍의 밤의 난입 괴수 「광포한 파멸수 라가르」(필드 어디든) */
  var RAGAR = { id: 'rg', name: '광포한 파멸수 라가르', en: 'Ragar the Ravager', sprite: 'rg', scale: 1.0, hp: 2400, r: 21, speed: 52, map: 'field', home: [0, 0], arena: 240, dmg: 30,
    part: { name: '파멸수의 뇌각', dur: 240, ic: 'mt_abyss', y: 62 }, mat: 'ragar', common: 'lava', atks: ['charge', 'slam', 'lightning', 'fan', 'grab'], color: '#ff5a3a', weak: '돌진 · 붉은 번개가 무뎌진다', invader: true };
  var TEMPEST = { every: 300, life: 180, spawn: 1.5, gold: 30, abyss: 2 };

  /* 《바람의 나라》 저주와 축복의 유물 6종(📜 장비 창에서 하나만 · 언제든 교체) */
  var RELICS = {
    berserk: { name: '광전사의 피눈물', icon: '🩸', desc: 'HP 35% 이하일 때 공격력 +65% · 근접 적중마다 HP +4 흡혈', curse: 'HP 가 낮아야 힘이 깨어난다', low: 0.35, atk: 0.65, drain: 4 },
    windcloak: { name: '무구의 바람외투', icon: '🌪️', desc: '구르기 기력 -50% · 저스트 회피 때 둘레의 적에게 자동 벼락 반격', curse: '갑주의 방어 보너스가 절반', roll: 0.5, guard: 0.5, bolt: 0.8 },
    giantslayer: { name: '거인학살자의 인장', icon: '🗿', desc: '보스 부위 파괴 피해 +80% · 모아베기 차지 속도 +30%', curse: '일반 몬스터에게 주는 피해 -15%', part: 0.8, charge: 0.3, mob: 0.85 },
    bloodjade: { name: '건곤의 혈옥', icon: '🔴', desc: '마법 재사용 대기시간 -35% (건곤대나이·극 포함)', curse: '마법마다 현재 HP 를 태운다(건곤대나이 12% → 20%)', cd: 0.35, hpPct: 0.05, abyssPct: 0.2 },
    grail: { name: '불멸의 황금성배', icon: '🏆', desc: '에스트 회복량 +50% · 마시고 3초간 받는 피해 -40%', heal: 0.5, ward: 0.4, wardT: 3 },
    soulstone: { name: '사신수의 혼석', icon: '💠', desc: '신화 무기 「격(格)」 발동 확률 20% → 45%', gyeok: 0.45 }
  };
  var RELIC_ORDER = ['berserk', 'windcloak', 'giantslayer', 'bloodjade', 'grail', 'soulstone'];

  /* 《몬스터 헌터》 영혼 수렵 파트너(버튼 없이 자율 협동): 카일에게서 해금 · 카일 대화나 📜 장비 창에서 늑대 ↔ 매 */
  var COMPANIONS = {
    wolf: { name: '영혼 설원늑대', icon: '🐺', sprite: 'comp_wolf', speed: 92, atk: 0.35, every: 2.4, joint: { part: 30, bleed: 6 }, desc: '땅을 달려 물어뜯는다 · 합동 일격에 출혈' },
    hawk: { name: '폭풍의 영혼매', icon: '🦅', sprite: 'comp_hawk', speed: 120, atk: 0.3, every: 2.0, joint: { part: 30, stun: 0.8 }, desc: '하늘에서 내리꽂는다 · 합동 일격에 기절', fly: true }
  };

  /* v84 「⚔️ 심연의 투기장 : 무회복 보스 러시」(8라운드): 라운드 사이에 체력도 에스트도 돌아오지 않는다 — 실력과 남은 물약만으로
     R1~R5 다섯 보스(수치 그대로) → R6 난입 괴수 라가르 → R7 변이 아종 → R8 심연의 기사왕. 쓰러뜨리면 5초 뒤 다음 보스 · 라운드마다 돌파 보너스 */
  var RUSH = { rounds: 8, gap: 5, bonusGold: 25, bonusAbyss: [0, 0, 0, 0, 1, 1, 2, 3] };
  /* v85 ★천상제일검 판정 = 그림(같은 수치를 판정과 이펙트가 함께 읽는다 — player.js celShape / fx.js trail · dragonStrike)
     HOLD_MULT = 캡슐 타격 배율(모아베기 단계 배율 × 0.35 — 3단 ≈ ×1.2, v84 천상 낙뢰와 같은 위력 · 판정만 넓어졌다)
     R = 일반 베기(1~3타) 황금 용린 아크의 바깥 끝 반경 · ARC = 부채꼴 반각(78° → 156°) · HOLD_AT = 황금 용 기둥이 내리꽂히는 전방 거리 · HOLD_R = 기둥 폭발 반경
     (홀드 판정 = 사냥꾼 발밑 → 기둥 중심까지 이어진 반경 HOLD_R 의 캡슐 — 전방 사거리 HOLD_AT + HOLD_R = 135) */
  var CELESTIAL = { R: 98, ARC: 78, HOLD_AT: 105, HOLD_R: 30, HOLD_MULT: 0.35 };
  /* v85 《몬스터 헌터》식 수렵 기록: 보스 방에 들어선 순간부터 토벌까지(초) · 피격 횟수 → 👑S / A / B
     S = 기준 시간(par) 안 · 피격 ≤ 2 · A = 기준 ×2 안 · 피격 ≤ 6 · 그 밖은 B */
  var HUNT = { par: { b1: 50, b2: 60, b3: 70, b4: 80, b5: 100, k1: 130, rg: 110 }, S: { t: 1, hits: 2 }, A: { t: 2, hits: 6 }, order: ['b1', 'b2', 'b3', 'b4', 'b5', 'k1'] };


  /* v84 보스 패턴(수치가 아니라 패턴으로 어렵게): eye = 안광 — gold(⚡ 상쇄 가능) / crimson(🩸 상쇄 · 가드 불능 → 굴러서 피하라)
     combo = 이 공격 다음에 곧바로 이어지는 공격(구르기 도착 지점을 노린다) · delay = 예비 동작을 0.35초 더 멈췄다 내리꽂는 엇박자가 섞이는 공격
     ranged = 백스텝 도약 뒤 곧바로 쏘는 원거리 견제 */
  var PATTERN = {
    crimson: { breath: 1, lightning: 1, quake: 1, storm: 1, grab: 1, field: 1 },
    delay: { slam: 1, hammer: 1, tentacle: 1, pounce: 1, kcleave: 1, tail: 1, charge: 1 }, DELAY: 0.35, DELAY_P: 0.4,
    combo: { b1: { sweep: 'slam', grab: 'roots' }, b2: { spin: 'hammer', hammer: 'quake' }, b3: { tentacle: 'fan', grab: 'field' }, b4: { pounce: 'charge', charge: 'breath' }, b5: { tail: 'tornado', tornado: 'lightning' }, k1: { kdash: 'kcleave', kcleave: 'kwave', grab: 'kleap' }, rg: { charge: 'slam', slam: 'grab' } },
    ranged: { b1: 'roots', b2: 'shards', b3: 'fan', b4: 'breath', b5: 'lightning', k1: 'kwave', rg: 'lightning' },
    COMBO_WIND: 0.55, BACKSTEP_P: 0.22
  };

  /* v82 《젤다》 지하 던전 전실의 고대 봉인 장치: brazier = 꺼진 룬 화로(화염이면 즉시 · 공격 3번이면 불씨가 옮겨붙는다) ·
     switch = 공명 수정 스위치(타격/검기) · stone = 균열된 봉인 비석(모아베기 · 실드 배쉬 · 발도 · 단두대 같은 강공격) — 모두 켜면 봉인 해제 */
  var PUZZLES = {
    d1: [{ kind: 'stone', x: 262, y: 252 }],
    d2: [{ kind: 'switch', x: 58, y: 252 }, { kind: 'switch', x: 262, y: 252 }],
    d3: [{ kind: 'brazier', x: 58, y: 252 }, { kind: 'brazier', x: 262, y: 252 }],
    d4: [{ kind: 'brazier', x: 58, y: 252 }, { kind: 'brazier', x: 262, y: 252 }],
    d5: [{ kind: 'switch', x: 58, y: 252 }, { kind: 'stone', x: 262, y: 252 }]
  };
  var DEVICE = {
    brazier: { name: '꺼진 룬 화로', hint: '🔥 불길이나 공격으로 점화', sparks: 3 },
    switch: { name: '공명 수정 스위치', hint: '⚔️ 베거나 검기로 공명', sparks: 1 },
    stone: { name: '균열된 봉인 비석', hint: '💥 강공격으로 파괴', sparks: 1 }
  };

  /* 몬스터: sheet 'mobs'(이끼 모슬링 색 변종) · 'bs'(신규 구역의 짐승) */
  var ENEMIES = {
    slime: { name: '이끼 슬라임', hp: 34, r: 7, speed: 30, aggro: 110, dmg: 12, wind: 0.55, mat: 'slime', hue: 0, gold: [2, 5] },
    crystal: { name: '수정 슬라임', hp: 46, r: 7, speed: 26, aggro: 130, dmg: 14, wind: 0.6, mat: 'crystal', gold: [3, 6], ranged: true, sprite: 'cslime' },   // v84 고유 도트(색 회전 금지)
    imp: { name: '가시 임프', hp: 56, r: 7, speed: 44, aggro: 125, dmg: 18, wind: 0.42, mat: 'thorn', gold: [4, 7], dasher: true, sprite: 'imp' },
    wolf: { flank: true, name: '설원 늑대', hp: 72, r: 7, speed: 54, aggro: 135, dmg: 20, wind: 0.4, mat: 'frost', gold: [5, 9], dasher: true, sprite: 'wolf' },
    wisp: { name: '얼음 정령', hp: 60, r: 6, speed: 24, aggro: 140, dmg: 18, wind: 0.6, mat: 'frost', gold: [5, 9], ranged: true, shot: 'ice', sprite: 'wisp', float: true },
    lgolem: { guard: true, name: '용암 골렘', hp: 150, r: 9, speed: 20, aggro: 110, dmg: 28, wind: 0.75, mat: 'lava', gold: [8, 12], heavy: true, sprite: 'lgolem' },
    lizard: { flank: true, name: '화산 도마뱀', hp: 82, r: 7, speed: 50, aggro: 125, dmg: 22, wind: 0.42, mat: 'lava', gold: [6, 10], dasher: true, sprite: 'lizard' }
  };
  /* 던전 전실의 정예 수문장(같은 짐승의 큰 금빛 변종) */
  var ELITE = { hp: 6, dmg: 1.4, scale: 1.6, r: 1.5 };

  /* 보스 5종: map = 보스 둥지 맵, home = 둥지 안 자리. part = 부위(파괴하면 소재가 떨어지고 패턴이 약해진다). weak = 약화 설명 */
  var BOSSES = [
    { id: 'b1', name: '고대 거목 수호자', sprite: 'b1', scale: 1.2, hp: 900, r: 20, speed: 36, map: 'd1b', home: [200, 190], arena: 190, dmg: 24,
      part: { name: '거목의 왕관뿔', dur: 150, ic: 'antler', y: 76 }, mat: 'crown', common: 'slime', atks: ['slam', 'sweep', 'roots', 'grab'], color: '#8ad070', weak: '뿌리 가시 7 → 4개' },
    { id: 'b2', name: '수정 갑주 골렘', sprite: 'b2', scale: 1.2, hp: 1100, r: 21, speed: 30, map: 'd2b', home: [200, 190], arena: 190, armor: 0.6, dmg: 26,
      part: { name: '골렘의 수정외피', dur: 190, ic: 'golem_heart', y: 66 }, mat: 'core', common: 'crystal', atks: ['hammer', 'spin', 'quake', 'shards'], color: '#b8a8ff', weak: '충격파 반경 118 → 72' },
    { id: 'b3', name: '심연의 가시 군주', sprite: 'b3', scale: 1.2, hp: 1300, r: 20, speed: 40, map: 'd3b', home: [200, 190], arena: 190, dmg: 24,
      part: { name: '심연의 가시핵', dur: 210, ic: 'thorn_heart', y: 44 }, mat: 'heart', common: 'thorn', atks: ['tentacle', 'fan', 'field', 'grab'], color: '#ff7a8a', weak: '가시 탄막 5 → 3발' },
    { id: 'b4', name: '빙하의 서리 송곳니', en: 'Frostfang Behemoth', sprite: 'b4', scale: 1.15, hp: 1550, r: 21, speed: 46, map: 'd4b', home: [200, 190], arena: 190, dmg: 28,
      part: { name: '서리 송곳니', dur: 230, ic: 'mt_ffang', y: 30 }, mat: 'ffang', common: 'frost', atks: ['pounce', 'breath', 'charge'], color: '#bff6ff', weak: '돌진 속도 · 냉기 장판 크기 감소' },
    { id: 'b5', name: '폭풍의 고룡 아스트랄', en: 'Astral, The Tempest Dragon', sprite: 'b5', scale: 1.1, hp: 2100, r: 23, speed: 38, map: 'd5b', home: [210, 200], arena: 200, dmg: 30,
      part: { name: '태초의 용옥', dur: 260, ic: 'mt_dgem', y: 58 }, mat: 'dgem', common: 'lava', atks: ['tornado', 'tail', 'lightning', 'storm'], color: '#9ad8ff', weak: '폭풍 탄막 16 → 8발' }
  ];
  /* 심연의 투기장: 5대 보스를 강화(체력 ×1.8 · 피해 ×1.3 · 빠르게)해 연속 수렵 */
  var ARENA = { hp: 1.8, dmg: 1.3, speed: 1.15, wind: 0.85, mat: 'abyss', n: 2 };

  /* ---------------------------------------------------------------- 맵 */
  /* 필드(2400×1600): 남서 🌲신록의 숲 · 동쪽 💎수정 고원 · 북쪽 🍁홍련의 유적 · 남동 ❄️만년설의 빙하 협곡 · 북동 🌋칠흑의 용화산 성소 */
  var FIELD = {
    id: 'field', kind: 'field', name: '필드', W: 2400, H: 1600, START: [320, 1396],
    /* 단단한 벽(절벽/유적 성벽/덤불 울타리/흑요석 벼랑): kind 는 그림 */
    walls: [
      { x: 0, y: 600, w: 736, h: 32, kind: 'ruin' }, { x: 800, y: 600, w: 800, h: 32, kind: 'ruin' },
      { x: 1000, y: 632, w: 32, h: 488, kind: 'cliff' }, { x: 1000, y: 1184, w: 32, h: 416, kind: 'cliff' },
      { x: 850, y: 1450, w: 65, h: 20, kind: 'hedge' }, { x: 963, y: 1450, w: 37, h: 20, kind: 'hedge' }, { x: 850, y: 1470, w: 20, h: 130, kind: 'hedge' },
      { x: 1440, y: 760, w: 60, h: 20, kind: 'cliff' }, { x: 1548, y: 760, w: 52, h: 20, kind: 'cliff' }, { x: 1440, y: 632, w: 20, h: 128, kind: 'cliff' },
      // v80 신록의 숲: 고대 뿌리 신전 입구를 감싼 덤불(입구는 고목이 막는다)
      { x: 196, y: 716, w: 128, h: 20, kind: 'hedge' }, { x: 196, y: 736, w: 20, h: 96, kind: 'hedge' }, { x: 304, y: 736, w: 20, h: 96, kind: 'hedge' },
      // v80 동쪽 경계: 유적/고원 ↔ 빙하 협곡/용화산(얼음 장벽 한 곳만 열린다)
      { x: 1600, y: 0, w: 32, h: 632, kind: 'ruin' }, { x: 1600, y: 632, w: 32, h: 608, kind: 'cliff' }, { x: 1600, y: 1304, w: 32, h: 296, kind: 'cliff' },
      // v80 빙하 협곡 ↔ 용화산(흑요석 봉인암 한 곳만)
      { x: 1632, y: 700, w: 352, h: 32, kind: 'obsid' }, { x: 2048, y: 700, w: 352, h: 32, kind: 'obsid' },
      // 빙하 협곡의 얼음 주머니(황금 씨앗) · 용화산의 흑요석 주머니(황금 씨앗)
      { x: 2280, y: 1460, w: 20, h: 140, kind: 'icecliff' }, { x: 2300, y: 1460, w: 30, h: 20, kind: 'icecliff' }, { x: 2370, y: 1460, w: 30, h: 20, kind: 'icecliff' },
      { x: 1632, y: 250, w: 160, h: 20, kind: 'obsid' }, { x: 1772, y: 0, w: 20, h: 110, kind: 'obsid' }, { x: 1772, y: 170, w: 20, h: 80, kind: 'obsid' }
    ],
    /* 부술 수 있는 장벽: rock = 모아베기(대검은 한 번에) · thorn = 화염진 · oldtree = 🪓 벌목(공격 버튼 3번) ·
       ice = 화염진 · 화염 무기로 녹인다 · obsidian = 절대영도 눈보라로 얼려 깨뜨린다 · seal = 던전 수문장을 쓰러뜨리면 열린다 */
    barriers: [
      { id: 'rock_gate', kind: 'rock', x: 1000, y: 1120, w: 32, h: 64, hp: 3 },
      { id: 'thorn_gate', kind: 'thorn', x: 736, y: 600, w: 64, h: 32 },
      { id: 'thorn_pocket', kind: 'thorn', x: 915, y: 1450, w: 48, h: 20 },
      { id: 'rock_pocket', kind: 'rock', x: 1500, y: 760, w: 48, h: 20, hp: 3 },
      { id: 'oldtree', kind: 'oldtree', x: 216, y: 812, w: 88, h: 22, hp: 3 },
      { id: 'ice_gate', kind: 'ice', x: 1600, y: 1240, w: 32, h: 64 },
      { id: 'ice_pocket', kind: 'ice', x: 2330, y: 1460, w: 40, h: 20 },
      { id: 'obsidian_gate', kind: 'obsidian', x: 1984, y: 700, w: 64, h: 32, hp: 2 },
      { id: 'obsidian_pocket', kind: 'obsidian', x: 1772, y: 110, w: 20, h: 60, hp: 2 }
    ],
    bonfires: [
      { id: 'camp', name: '신록의 숲 · 사냥꾼의 야영지', icon: '🌲', x: 320, y: 1360, lit: true },
      { id: 'plateau', name: '수정 고원 화톳불', icon: '💎', x: 1250, y: 1440 },
      { id: 'ruins', name: '홍련의 유적 화톳불', icon: '🍁', x: 768, y: 540 },
      { id: 'glacier', name: '만년설의 빙하 협곡 화톳불', icon: '❄️', x: 1712, y: 1290 },
      { id: 'volcano', name: '칠흑의 용화산 화톳불', icon: '🌋', x: 2016, y: 640 }
    ],
    anvil: { x: 376, y: 1352 },
    /* 심연의 투기장 포털(폭풍룡을 쓰러뜨리면 야영지에 열린다) */
    abyssGate: { x: 252, y: 1328 },
    /* 지하 던전 입구(🕳️ 내려가기) */
    stairs: [
      { id: 'd1', to: 'd1a', x: 260, y: 776, name: '고대 뿌리 신전' },
      { id: 'd2', to: 'd2a', x: 1300, y: 860, name: '결정 동굴' },
      { id: 'd3', to: 'd3a', x: 800, y: 230, name: '가시 제단' },
      { id: 'd4', to: 'd4a', x: 2230, y: 1420, name: '얼음 궁전' },
      { id: 'd5', to: 'd5a', x: 2220, y: 190, name: '폭풍룡의 둥지' }
      // v83 히든: 용화산 북동쪽 끝의 [왕의 무덤] — 폭풍룡을 쓰러뜨려야 봉인이 풀린다
    ],
    /* v84 용화산 북동쪽 끝의 「⚔️ 왕의 무덤」 — 5대 괴수를 모두 토벌하면 봉인이 풀린다(심연의 기사왕 카인과 단독 결투) */
    kingGate: { x: 2300, y: 236 },
    chests: [
      { id: 'c_fire', x: 690, y: 1440, reward: { spell: 'fire' } },
      { id: 'c_pocket', x: 965, y: 1560, reward: { gold: 120, mats: { gold_ore: 1 } } },
      { id: 'c_estus', x: 1420, y: 300, reward: { seed: 1, gold: 60 } },
      { id: 'c_plateau', x: 1560, y: 1560, reward: { gold: 80, mats: { crystal: 2 } } },
      { id: 'c_seed1', x: 236, y: 760, reward: { seed: 1 } },
      { id: 'c_seed4', x: 2350, y: 1540, reward: { seed: 1, mats: { frost: 2 } } },
      { id: 'c_seed5', x: 1700, y: 180, reward: { seed: 1, mats: { lava: 2 } } },
      { id: 'c_glacier', x: 2040, y: 1560, reward: { gold: 150, mats: { frost: 3 } } }
    ],
    steles: [
      { id: 's_rune1', x: 130, y: 1080, kind: 'rune' },
      { id: 's_bolt', x: 1460, y: 1300, kind: 'spell', spell: 'bolt' },
      { id: 's_rune2', x: 240, y: 330, kind: 'rune' },
      { id: 's_abyss', x: 2350, y: 70, kind: 'spell', spell: 'abyss' },
      { id: 's_rune3', x: 1900, y: 900, kind: 'rune' },
      /* 고대 성소: 조사하면 최대 HP/MP/SP 통이 영구히 커진다 */
      { id: 'sh_forest', x: 90, y: 900, kind: 'shrine', boost: { hp: 1 } },
      { id: 'sh_plateau', x: 1560, y: 980, kind: 'shrine', boost: { sp: 1 } },
      { id: 'sh_ruins', x: 60, y: 120, kind: 'shrine', boost: { mp: 1 } },
      { id: 'sh_glacier', x: 2350, y: 820, kind: 'shrine', boost: { hp: 1 } },
      { id: 'sh_volcano', x: 1700, y: 60, kind: 'shrine', boost: { mp: 1, sp: 1 } }
    ],
    nodes: [
      ['tree', 480, 1250], ['tree', 525, 1300], ['tree', 200, 1250], ['tree', 160, 1420], ['tree', 600, 1190], ['tree', 760, 1350], ['tree', 450, 1030],
      ['ore', 420, 1500], ['ore', 560, 1520], ['ore', 250, 1520], ['ore', 820, 1180], ['ore', 1450, 1100], ['ore', 1100, 1500], ['ore', 300, 500], ['ore', 1250, 520],
      ['herb', 640, 1380], ['herb', 380, 1180], ['herb', 150, 1300], ['herb', 720, 1000], ['herb', 500, 450], ['herb', 1100, 480],
      ['crystal', 1120, 1300], ['crystal', 1380, 1180], ['crystal', 1500, 1500], ['crystal', 1150, 1000], ['crystal', 1570, 700],
      ['gold', 935, 1530], ['gold', 1530, 690],
      ['frost', 1800, 1450], ['frost', 1950, 1300], ['frost', 2150, 950], ['frost', 2300, 1100], ['frost', 1760, 900], ['frost', 2100, 1500], ['ore', 1880, 1080], ['ore', 2250, 1300],
      ['lava', 1750, 450], ['lava', 1900, 300], ['lava', 2100, 500], ['lava', 2300, 400], ['lava', 2050, 120], ['lava', 1850, 600], ['ore', 2200, 620], ['gold', 1720, 210]
    ],
    enemies: [
      ['slime', 520, 1100], ['slime', 640, 1000], ['slime', 420, 960], ['slime', 760, 1240], ['slime', 860, 1000], ['slime', 300, 1080], ['slime', 600, 1550], ['slime', 200, 1180], ['slime', 780, 1520],
      ['crystal', 1150, 1250], ['crystal', 1350, 1300], ['crystal', 1450, 1000], ['crystal', 1200, 1100], ['crystal', 1100, 900], ['crystal', 1500, 1420],
      ['imp', 400, 420], ['imp', 600, 380], ['imp', 1000, 420], ['imp', 1150, 300], ['imp', 300, 250], ['imp', 1300, 450], ['imp', 560, 520],
      ['wolf', 1900, 1400], ['wolf', 2050, 1250], ['wolf', 2200, 1000], ['wolf', 1800, 1000], ['wolf', 2300, 1250], ['wolf', 1950, 850],
      ['wisp', 2000, 1120], ['wisp', 2120, 1180], ['wisp', 1850, 1200], ['wisp', 2250, 880], ['wisp', 2100, 1380],
      ['lgolem', 1850, 420], ['lgolem', 2150, 320], ['lgolem', 2000, 160], ['lgolem', 2300, 560],
      ['lizard', 1720, 560], ['lizard', 1950, 520], ['lizard', 2120, 620], ['lizard', 2250, 250], ['lizard', 1820, 220], ['lizard', 2000, 380]
    ],
    /* 흙길(그림 전용): 점 목록 */
    paths: [
      [[320, 1380], [500, 1420], [690, 1440]],
      [[320, 1360], [300, 1150], [270, 960], [260, 850]],
      [[340, 1360], [600, 1250], [840, 1160], [1000, 1152], [1100, 1220], [1250, 1420]],
      [[340, 1340], [520, 1100], [700, 860], [768, 640], [768, 540], [790, 380], [800, 260]],
      [[1250, 1420], [1450, 1300], [1600, 1272], [1712, 1290], [1900, 1350], [2230, 1430]],
      [[1712, 1290], [1850, 1000], [2016, 760], [2016, 640], [2100, 420], [2220, 200]],
      [[1300, 900], [1260, 1100], [1250, 1420]]
    ],
    /* 얼어붙은 호수(빙하 협곡) · 용암 균열(용화산) — 바닥 그림 */
    lakes: [[2030, 1110, 170, 100]],
    lava: [[1700, 380, 1880, 330], [1880, 330, 1960, 420], [2120, 220, 2300, 300], [2300, 300, 2360, 460], [1980, 560, 2160, 520]],
    /* 장식 나무를 놓지 않는 자리(야영지/던전 입구/길목) [x, y, r] */
    keep: [[320, 1370, 70], [260, 780, 80], [1300, 860, 60], [800, 230, 60], [1250, 1440, 60], [768, 540, 60], [690, 1440, 34], [130, 1080, 34], [1460, 1300, 34], [240, 330, 34], [1420, 300, 34], [1016, 1152, 48], [768, 616, 48], [935, 1520, 70], [1530, 700, 60], [1560, 1560, 30],
      [1616, 1272, 60], [1712, 1290, 60], [2016, 716, 60], [2016, 640, 60], [2230, 1420, 60], [2220, 190, 60], [2350, 1530, 60], [1700, 185, 70], [2350, 70, 40], [1900, 900, 34], [90, 900, 34], [1560, 980, 34], [60, 120, 34], [2350, 820, 34], [1700, 60, 34], [2040, 1560, 30], [252, 1328, 30]]
  };

  /* 지하 던전: 전실(a) — 정예 수문장 + 상자/비석 + 봉인문(수문장을 쓰러뜨리면 열린다) / 둥지(b) — 사방이 벽인 보스 아레나 */
  var THEMES = {
    d1: { name: '고대 뿌리 신전', theme: 'root', icon: '🌲', boss: 'b1', elite: 'slime', field: 'd1' },
    d2: { name: '결정 동굴', theme: 'crystal', icon: '💎', boss: 'b2', elite: 'crystal', field: 'd2', stele: 'storm' },
    d3: { name: '가시 제단', theme: 'thorn', icon: '🍁', boss: 'b3', elite: 'imp', field: 'd3' },
    d4: { name: '얼음 궁전', theme: 'ice', icon: '❄️', boss: 'b4', elite: 'wolf', field: 'd4', stele: 'frost' },
    d5: { name: '폭풍룡의 둥지', theme: 'storm', icon: '🌋', boss: 'b5', elite: 'lgolem', field: 'd5' }
  };
  var CHEST_LOOT = { d1: { gold: 90, mats: { slime: 3, herb: 2 }, relic: 'grail' }, d2: { gold: 110, mats: { crystal: 3, gold_ore: 1 }, relic: 'bloodjade' }, d3: { gold: 130, mats: { thorn: 3, gold_ore: 1 }, relic: 'giantslayer' }, d4: { gold: 160, mats: { frost: 3, gold_ore: 1 }, relic: 'berserk' }, d5: { gold: 200, mats: { lava: 3, gold_ore: 2 }, relic: 'windcloak' } };   // v83: 전실 보물상자마다 유물 하나
  var MAPS = { field: FIELD };
  Object.keys(THEMES).forEach(function (k) {
    var T = THEMES[k], W = 320, H = 520, t = 24;
    MAPS[k + 'a'] = {
      id: k + 'a', kind: 'dungeon', room: 'ante', dungeon: k, theme: T.theme, name: T.name + ' · 전실', W: W, H: H,
      walls: [{ x: 0, y: 0, w: 128, h: t, kind: 'dwall' }, { x: 192, y: 0, w: 128, h: t, kind: 'dwall' }, { x: 0, y: H - t, w: 136, h: t, kind: 'dwall' }, { x: 184, y: H - t, w: 136, h: t, kind: 'dwall' }, { x: 0, y: t, w: t, h: H - 2 * t, kind: 'dwall' }, { x: W - t, y: t, w: t, h: H - 2 * t, kind: 'dwall' },
        { x: 70, y: 150, w: 20, h: 20, kind: 'dpillar' }, { x: 230, y: 150, w: 20, h: 20, kind: 'dpillar' }, { x: 70, y: 340, w: 20, h: 20, kind: 'dpillar' }, { x: 230, y: 340, w: 20, h: 20, kind: 'dpillar' }],
      barriers: [{ id: k + '_seal', kind: 'seal', x: 128, y: 0, w: 64, h: 30 }],
      bonfires: [], chests: [{ id: 'c_' + k, x: 160, y: 318, reward: CHEST_LOOT[k], sealed: k + '_seal' }],   // v82: 전실 가운데 — 봉인이 풀려야 열린다
      steles: T.stele ? [{ id: 's_' + T.stele, x: 50, y: 430, kind: 'spell', spell: T.stele }] : [],
      nodes: [], enemies: [[T.elite, 160, 220, { elite: true, gate: k + '_seal' }]], paths: [], keep: [], puzzle: PUZZLES[k].map(function (p, i) { return { id: k + '_pz' + i, kind: p.kind, x: p.x, y: p.y, gate: k + '_seal' }; }),
      exits: [{ kind: 'up', x: 160, y: 494, to: 'field', at: k, label: '올라가기', emo: '⬆️' }, { kind: 'door', x: 160, y: 40, to: k + 'b', at: 'in', label: '둥지로', emo: '⚔️', needBroken: k + '_seal' }],
      arrive: { down: [160, 466], back: [160, 70] }
    };
    var LW = 400, LH = 440;
    MAPS[k + 'b'] = {
      id: k + 'b', kind: 'dungeon', room: 'lair', dungeon: k, theme: T.theme, name: T.name + ' · 보스 둥지', W: LW, H: LH,
      walls: [{ x: 0, y: 0, w: LW, h: t, kind: 'dwall' }, { x: 0, y: LH - t, w: LW, h: t, kind: 'dwall' }, { x: 0, y: t, w: t, h: LH - 2 * t, kind: 'dwall' }, { x: LW - t, y: t, w: t, h: LH - 2 * t, kind: 'dwall' }],
      barriers: [], bonfires: [], chests: [], steles: [], nodes: [], enemies: [], paths: [], keep: [], boss: T.boss, traps: TRAP.spots.map(function (p, i) { return { i: i, kind: T.theme, x: p[0], y: p[1] }; }),
      exits: [{ kind: 'altar', x: 200, y: 250, to: 'field', at: k, label: '귀환', emo: '🌀', needBossDead: T.boss }],
      arrive: { in: [200, 392] }
    };
  });
  /* v83 [왕의 무덤]: 심연의 기사왕 카인의 결전장(사방이 닫힌 묘실 · 토벌하면 귀환 제단) */
  MAPS.kingtomb = {
    id: 'kingtomb', kind: 'dungeon', room: 'lair', theme: 'abyss', name: '👑 왕의 무덤', W: 440, H: 480,
    walls: [{ x: 0, y: 0, w: 440, h: 24, kind: 'dwall' }, { x: 0, y: 456, w: 440, h: 24, kind: 'dwall' }, { x: 0, y: 24, w: 24, h: 432, kind: 'dwall' }, { x: 416, y: 24, w: 24, h: 432, kind: 'dwall' }],
    barriers: [], bonfires: [], chests: [], steles: [], nodes: [], enemies: [], paths: [], keep: [], boss: 'k1', tomb: true,
    exits: [{ kind: 'altar', x: 220, y: 300, to: 'field', at: 'tomb', label: '귀환', emo: '🌀', needBossDead: 'k1' }],
    arrive: { in: [220, 430], down: [220, 430] }
  };
  MAPS.abyss = {
    id: 'abyss', kind: 'dungeon', room: 'arena', theme: 'abyss', name: '⚔️ 심연의 투기장', W: 420, H: 460,
    walls: [{ x: 0, y: 0, w: 420, h: 24, kind: 'dwall' }, { x: 0, y: 436, w: 420, h: 24, kind: 'dwall' }, { x: 0, y: 24, w: 24, h: 412, kind: 'dwall' }, { x: 396, y: 24, w: 24, h: 412, kind: 'dwall' }],
    barriers: [], bonfires: [], chests: [], steles: [], nodes: [], enemies: [], paths: [], keep: [], arena: true,
    exits: [{ kind: 'altar', x: 210, y: 260, to: 'field', at: 'abyss', label: '귀환', emo: '🌀', needArenaDone: true }],
    arrive: { in: [210, 410] }
  };

  MG.Data = {
    MATS: MATS, MAT_ORDER: MAT_ORDER, LINES: LINES, WEAPONS: WEAPONS, WEAPON_ORDER: WEAPON_ORDER, upgradeCost: upgradeCost,
    ARMORS: ARMORS, ARMOR_ORDER: ARMOR_ORDER, SPELLS: SPELLS, SPELL_ORDER: SPELL_ORDER, RUNES: RUNES, RUNE_ORDER: RUNE_ORDER,
    PLAYER: PLAYER, ENEMIES: ENEMIES, ELITE: ELITE, BOSSES: BOSSES, ARENA: ARENA, THEMES: THEMES, MAPS: MAPS, WORLD: FIELD,
    PHASE2: PHASE2, KING: KING, RAGAR: RAGAR, TEMPEST: TEMPEST, RELICS: RELICS, RELIC_ORDER: RELIC_ORDER, COMPANIONS: COMPANIONS, ULTIMATE: ULTIMATE, RUSH: RUSH, CELESTIAL: CELESTIAL, HUNT: HUNT, PATTERN: PATTERN, KING_GATE_NEED: 5,
    BEASTS: BEASTS, BEAST_ORDER: BEAST_ORDER, NPCS: NPCS, NPC_ORDER: NPC_ORDER, NPC_CFG: NPC_CFG, TRAPS: TRAPS, TRAP: TRAP, VARIANTS: VARIANTS, VARIANT: VARIANT, PUZZLES: PUZZLES, DEVICE: DEVICE
  };
})(window);
