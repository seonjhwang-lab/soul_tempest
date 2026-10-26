/* ==========================================================================
   combat.js — 피해 계산과 적중 처리(플레이어 → 몬스터/보스)
   공격력 = 무기 공격력 × (1 + 0.12 × 연마) × (★명장 1.25) × (예리한 각인 1.15) × (갑주 보너스) × (사냥꾼의 영약 1.15) × 단계 배율
   치명타: 저스트 회피 직후 다음 한 방은 확정(×2) · 상쇄 뒤 2.5초는 모든 공격이 확정 치명타(×2, Riposte) · 평소엔 8% (+ 갑주 · 백호) 확률(×1.5)
   부위 파괴 피해: 모아베기 · 계열 특수기 · 비전 마법만 보스 부위 내구도를 깎는다(몬스터 헌터식). part 는 배율(진 모아베기 ×3).
   원소 궤적(3티어 ★신화 무기): frost = 서리 결정이 터지고 둔화 · storm = 푸른 번개가 튄다 · fire = 얼음 장벽을 녹인다(근접 판정만, 발사체 없음)
   v82:
     · 마법 증폭 = 무기 · ★명장 · 각인 · 버프(주작의 화염)를 모두 「더해」 최대 +35% 까지(1.35× 상한) — 원거리 마법 난사 빌드 차단
     · ⚔️ 상쇄(Clash Parry): 보스/정예가 내리꽂기 직전 0.22초(또는 타격 순간)에 홀드 액션을 맞히거나, 한손검 방패를 막 올린 채 받으면
       피해 0 · 황금/청록 불꽃 + 역경직 · 적의 공격이 튕겨 나가고(경직) 보스 부위 내구도 25% · 2.5초간 모든 공격 확정 치명타
     · 「격(格)」: 3티어 ★신화 무기의 근접 적중 20%(저스트 회피 · 상쇄 직후 첫 타는 100%) — 대상 위치에 추가 타격 + ⚡뇌신격! · 🔥흑룡격! · ❄️빙풍격! · ✨성흔격!
     v85: sweep 의 exact 모드(★천상제일검) — 몸통(반경 r)이 그려진 부채꼴 가장자리에 걸치기만 해도 맞는다(그림 = 판정) ·
          ⚔️ 상쇄 순간 다이내믹 카메라(임팩트 줌 1.08 + 방향성 펀치) · 황금/청록 교차 섬광 링 · 스파크 분출
     · 사신수의 가호: 청룡(이동 +15% · 뇌전 추가 피해) · 백호(치명 +18% · 출혈) · 주작(화염 +25% · 재탄생) · 현무(받는 피해 -20% · 충격파 반사)
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;
  var GYEOK = {
    raijin_tachi: { text: '⚡뇌신격!', col: '#fff3a0', cols: ['#ffffff', '#fff3a0', '#9ad8ff'], kind: 'bolt' },
    ruin_great: { text: '🔥흑룡격!', col: '#ff6a4a', cols: ['#ff4a2a', '#2a0a10', '#ffb238'], kind: 'flame' },
    frost_saber: { text: '❄️빙풍격!', col: '#bff6ff', cols: ['#ffffff', '#bff6ff', '#8ae8f8'], kind: 'frost' },
    astral_blade: { text: '✨성흔격!', col: '#d8c8ff', cols: ['#efe4ff', '#b090f0', '#4deeea'], kind: 'star' },
    celestial_blade: { text: '🐉황금 용격!', col: '#ffd866', cols: ['#fff6c0', '#ffd866', '#ffffff'], kind: 'bolt', chance: 0.35 }   // v83 천상제일검: 공격 시 황금 용격
  };
  /* v83 격의 신수 환영(가호가 없으면 무기의 기운으로): 뇌신 = 청룡 · 흑룡 = 주작 · 빙풍 = 현무 · 성흔 = 백호 · 천상 = 청룡 */
  var GYEOK_BEAST = { raijin_tachi: 'dragon', ruin_great: 'phoenix', frost_saber: 'turtle', astral_blade: 'tiger', celestial_blade: 'dragon' };

  var Combat = {
    attacker: null,   // v82: 지금 플레이어를 때리고 있는 보스/정예(상쇄 판정용 — boss.hitP / 정예 공격이 잠깐 넣는다)
    GYEOK: GYEOK, GYEOK_BEAST: GYEOK_BEAST,
    weapon: function () {
      var S = MG.S, id = S.equipped, w = D.WEAPONS[id] || D.WEAPONS.wanderer, own = S.weapons[id] || { lvl: 0, master: false };
      return { id: id, def: w, lvl: own.lvl || 0, master: !!own.master };
    },
    armor: function () { var S = MG.S, id = S.armor || 'coat', a = D.ARMORS[id] || D.ARMORS.coat, own = (S.armors || {})[id] || {}; return { id: id, def: a, master: !!own.master }; },
    /* 손에 든 무기의 홀드 액션 계열: basic(방랑자) · one · great · tachi · arcane */
    mode: function () { var w = this.weapon().def; return w.basic ? 'basic' : (w.line === 'ultimate' ? 'great' : w.line); },   // v84 궁극 파생은 대검식 3단 참모아베기   // v83 고대 병기는 대검식 3단 참모아베기
    hasRune: function (r) { return MG.S.runes.indexOf(r) >= 0; },
    blessing: function () { var b = MG.S.blessing; return b && D.BEASTS[b] ? b : null; },
    beast: function () { var b = this.blessing(); return b ? D.BEASTS[b] : null; },
    /* v83 저주와 축복의 유물(하나만 장착) */
    relic: function () { var r = MG.S.relic; return r && D.RELICS[r] && (MG.S.relics || []).indexOf(r) >= 0 ? r : null; },
    hasRelic: function (id) { return this.relic() === id; },
    /* v84 NPC 버프(미궁 축복 폐기): 🔨 발드르의 숫돌 손질 = 공격 · 🔮 이실리아의 비전 가호 = 격 · 기력 */
    buffMul: function (k) { var P = MG.Player, B = D.NPC_CFG.BUFF; if (!P) return 0; if (P.whetT > 0 && B.whet[k]) return B.whet[k]; if (P.arcT > 0 && B.arc[k]) return B.arc[k]; return 0; },
    gyeokChance: function () { var w = this.weapon(), G = GYEOK[w.id], base = (G && G.chance) || D.PLAYER.GYEOK_CHANCE; if (this.hasRelic('soulstone')) base = Math.max(base, D.RELICS.soulstone.gyeok); return Math.min(0.95, base + this.buffMul('gyeok')); },
    attackPower: function () {
      var w = this.weapon(), a = this.armor().def, P = MG.Player;
      var berserk = this.hasRelic('berserk') && P && P.maxHp && P.hp <= P.maxHp * D.RELICS.berserk.low ? 1 + D.RELICS.berserk.atk : 1;   // 광전사의 피눈물
      return w.def.atk * (1 + 0.12 * w.lvl) * (w.master ? 1.25 : 1) * (this.hasRune('edge') ? 1.15 : 1) * (1 + (a.atk || 0)) * (P && P.elixirT > 0 ? 1 + D.NPC_CFG.ELIXIR.atk : 1) * berserk * (1 + this.buffMul('atk'));
    },
    critChance: function () { return D.PLAYER.CRIT_RAND + (this.armor().def.crit || 0) + (this.blessing() === 'tiger' ? D.BEASTS.tiger.crit : 0); },
    /* v82 마법 증폭(합연산 · 상한 +35%): 무기 spell + ★명장 0.1 + 주작의 화염(화염 마법) 0.25 → 1 + min(0.35, 합) */
    spellAmp: function (o) { var w = this.weapon(); return (w.def.spell || 0) + (w.master && w.def.spell ? 0.1 : 0) + (o && o.fire && this.blessing() === 'phoenix' ? D.BEASTS.phoenix.fire : 0); },
    spellPower: function (o) { return 1 + Math.min(D.PLAYER.SPELL_CAP, this.spellAmp(o)); },
    /* 받는 피해 배율(강철 피부 각인 · 수정 비늘 갑주 · 현무) */
    guardMul: function () { var P = MG.Player; return (this.hasRune('iron') ? 0.85 : 1) * (1 - (this.armor().def.guard || 0) * (this.hasRelic('windcloak') ? D.RELICS.windcloak.guard : 1)) * (this.blessing() === 'turtle' ? 1 - D.BEASTS.turtle.guard : 1) * (this.hasRelic('grail') && P && P.wardT > 0 ? 1 - D.RELICS.grail.ward : 1); },

    /* 살아 있는 표적(지금 맵의 몬스터 + 싸움 중인 보스) */
    targets: function () {
      var out = [], E = MG.Enemies, B = MG.Bosses, i;
      if (E) for (i = 0; i < E.list.length; i++) if (E.list[i].alive) out.push(E.list[i]);
      if (B) { var h = B.here(); for (i = 0; i < h.length; i++) if (h[i].alive && !h[i].dormant) out.push(h[i]); }
      return out;
    },
    nearest: function (x, y, range) {
      var t = this.targets(), best = null, bd = range;
      for (var i = 0; i < t.length; i++) { var d = U.dist(x, y, t[i].x, t[i].y) - t[i].r; if (d < bd) { bd = d; best = t[i]; } }
      return best;
    },

    /* 근접 휘두르기 한 번(활성 구간 동안 매 프레임) — 이미 맞은 표적은 hitSet 이 막는다. 발사체는 만들지 않는다. */
    sweep: function (P, o) {
      var t = this.targets(), n = 0, fa = Math.atan2(P.fy, P.fx);
      for (var i = 0; i < t.length; i++) {
        var e = t[i]; if (P.hitSet.indexOf(e) >= 0) continue;
        var d = U.dist(P.x, P.y, e.x, e.y);   // 탑다운: 발끼리의 거리(보스처럼 큰 몸도 아래쪽에서 닿는다)
        if (d > o.range + e.r) continue;
        var tol = o.exact && d > 0 ? Math.asin(Math.min(1, e.r / d)) : 0;   // v85 exact: 몸통이 부채꼴 가장자리에 걸치면 맞는다
        if (!o.spin && d > e.r + 4 && Math.abs(U.angDiff(fa, Math.atan2(e.y - P.y, e.x - P.x))) > o.arc * Math.PI / 180 + tol) continue;
        P.hitSet.push(e); this.playerHit(e, o); n++;
      }
      if (MG.Gimmick) MG.Gimmick.sweep(P, o);   // v82: 전실 봉인 장치 · 둥지 지형 함정도 같은 칼날에 맞는다
      return n;
    },

    /* ---------------------------------------------------------------- v82 ⚔️ 상쇄(Clash Parry) */
    isBoss: function (e) { return !!(e && e.def && e.def.part); },
    /* 적이 지금 「내리꽂기 직전 0.22초 / 타격 순간」인가 */
    parryWindow: function (e) {
      var C = D.PLAYER; if (!e || !e.alive) return false;
      if (this.isBoss(e)) {
        if ((e.tele && e.tele.eye === 'crimson') || (e.state === 'act' && e.atkEye === 'crimson')) return false;   // v84 🩸 진홍 안광: 상쇄 불능
        if (e.state === 'wind' && e.tele) return e.tele.wind - e.st <= C.PARRY_WINDOW + 1e-6;
        if (e.state === 'act') return e.st <= C.PARRY_STRIKE;
        if (e.state === 'rec') return e.st <= C.PARRY_STRIKE && !!e.lastAtk;
        return false;
      }
      if (e.elite) {
        if (e.state === 'wind') return e.def.wind * 1.15 - e.st <= C.PARRY_WINDOW + 1e-6;
        if (e.state === 'atk') return e.st <= C.PARRY_STRIKE;
      }
      return false;
    },
    /* 상쇄 성공: how = 'hold'(홀드 액션 적중) · 'guard'(방패를 막 올린 순간 받았다) — defer 면 적의 공격 판정이 끝난 다음 프레임에 경직을 건다 */
    parry: function (e, how, defer) {
      var P = MG.Player, C = D.PLAYER, FX = MG.FX, S = MG.S;
      P.riposteT = C.RIPOSTE; P.gyeokReady = true; P.invT = Math.max(P.invT || 0, 0.3); P.parryT = 0.5;
      if (this.hasRune('mana')) P.mp = Math.min(P.maxMp, P.mp + C.MANA_JUST);
      S.parries = (S.parries || 0) + 1;
      if (defer) e.parryPending = true; else this.applyParry(e);
      var hx = (P.x + e.x) / 2, hy = (P.y + e.y) / 2 - 12;
      if (FX) {
        FX.text(P.x, P.y + 14, '⚔️ 상쇄 성공!', '#ffd866', 1.3, 16, { pop: true, rise: 4 });   // 사냥꾼 발밑(격 · 피해 숫자는 적 쪽에)
        FX.burst(hx, hy, 34, ['#ffd866', '#fff6c0', '#4deeea', '#ffffff'], 190); FX.ring(hx, hy, 3, 30, 0.35, '#fff3c0', 3); FX.ring(hx, hy, 2, 18, 0.25, '#4deeea', 2);
        FX.hitstop(0.12); FX.flash('#fff3c0', 0.08); FX.shake(4, 0.2); FX.spark(hx, hy, 4);
        if (FX.impact) { FX.impact(1.08, 0.22, hx, hy, e.x - P.x, e.y - P.y, 7); FX.xring(hx, hy, 30); FX.spark(hx, hy, 4, '#ffd866', 0.24); FX.spark(hx, hy, 3, '#4deeea', 0.24); FX.burst(hx, hy, 16, ['#ffffff', '#ffd866', '#4deeea'], 260, { g: 60 }); }   // v85 ① 상쇄 임팩트 줌 + 교차 섬광 링 + 스파크 분출
      }
      var a = Math.atan2(P.y - e.y, P.x - e.x); P.vx = Math.cos(a) * 70; P.vy = Math.sin(a) * 70;   // 역경직: 칼이 튕기며 한 걸음 밀려난다
      if (MG.SFX) MG.SFX.parry();
      if (MG.Input && MG.Input.rumble) MG.Input.rumble(180, 0.9, 'parry');   // v86 햅틱: 상쇄
      if (MG.Companion) MG.Companion.joint(e);   // v83 파트너가 함께 돌진
      MG.emit('parry', e, how);
      return true;
    },
    /* 적 쪽: 공격이 튕겨 나가 경직 · 보스는 부위 내구도 25% */
    applyParry: function (e) {
      var C = D.PLAYER, FX = MG.FX;
      e.parryPending = false;
      if (this.isBoss(e)) {
        e.tele = null; e.atk = null; e.z = 0; e.state = 'stun'; e.st = 0; e.stunT = 1.1; e.hitDone = true;
        if (!e.partBroken) { var pd = Math.round(e.partMax * C.PARRY_PART); e.partDur -= pd; if (FX) FX.text(e.x + 14, e.y - 26, '부위 -' + pd, '#ffb0f0', 0.8, 12); if (e.partDur <= 0) e.breakPart(); }
      } else { e.state = 'stun'; e.st = 0; e.stunT = 1.2; var P = MG.Player, a = Math.atan2(e.y - P.y, e.x - P.x); e.vx = Math.cos(a) * 90; e.vy = Math.sin(a) * 90; }
    },

    /* ---------------------------------------------------------------- v82 신화 무기 「격(格)」 */
    gyeok: function (e, o) {
      var P = MG.Player, w = this.weapon(), G = GYEOK[w.id], FX = MG.FX;
      if (!G || !w.def.myth || o.spell || o.gyeok || o.kind === 'dot' || o.kind === 'beast') return false;
      var sure = !!P.gyeokReady; if (!sure && Math.random() >= this.gyeokChance()) return false;
      P.gyeokReady = false; MG.S.gyeoks = (MG.S.gyeoks || 0) + 1;
      var x = e.x, y = e.y - (e.hy || 8);
      if (FX) {
        FX.text(x, e.y + 6, G.text, G.col, 1.2, 16, { pop: true, rise: 12 });   // 대상 발밑에서 솟구친다(머리 위의 피해 숫자 · 보스 바와 겹치지 않게)
        FX.pillar(x, e.y, G.col, G.kind); FX.burst(x, y, 26, G.cols, 160); if (FX.phantom) FX.phantom(x, e.y - 30, this.blessing() || GYEOK_BEAST[w.id] || 'dragon', 1); FX.ring(x, e.y - 2, 4, 30, 0.4, G.col, 3); FX.flash(G.col, 0.06);
        if (G.kind === 'bolt') FX.spark(x, y, 6); else if (G.kind === 'frost') FX.ring(x, e.y - 2, 2, 20, 0.3, '#ffffff', 2); else if (G.kind === 'flame') { for (var k = 0; k < 6; k++) FX.ember(x + (Math.random() - 0.5) * 16, e.y - Math.random() * 10); }
      }
      if (MG.SFX) MG.SFX.slash(true);
      if (e.alive) this.playerHit(e, { mult: D.PLAYER.GYEOK_MULT, part: 0.6, kind: 'gyeok', gyeok: true, knock: 0.6, slow: G.kind === 'frost' ? 2.0 : 0, stun: G.kind === 'bolt' ? 0.4 : 0 });
      MG.emit('gyeok', w.id, sure);
      return true;
    },

    /* 한 표적에 플레이어 공격 하나 */
    playerHit: function (e, o) {
      var P = MG.Player, w = this.weapon(), crit = false, dmg = this.attackPower() * (o.mult || 1), bless = this.blessing();
      // v82 상쇄: 홀드 액션이 적의 「내리꽂기 직전 0.22초 / 타격 순간」에 들어갔다
      if (o.hold && (this.isBoss(e) || e.elite) && this.parryWindow(e)) this.parry(e, 'hold', false);
      if (o.spell) dmg = o.dmg * this.spellPower(o);
      if (P.critBuff > 0) { crit = true; dmg *= 2; P.critBuff = 0; }
      else if (P.riposteT > 0) { crit = true; dmg *= 2; }   // Riposte — 상쇄 뒤 2.5초는 모든 공격이 확정 치명타
      else if (!o.spell && Math.random() < this.critChance()) { crit = true; dmg *= 1.5; }
      var elem = !o.spell && w.def.elem, slow = o.slow || (elem === 'frost' ? 1.2 : 0);
      if (bless === 'phoenix' && !o.spell && elem === 'fire') dmg *= 1 + D.BEASTS.phoenix.fire;   // 주작: 화염 무기 근접 +25% (화염 마법은 spellPower 안에서, 상한 포함)
      dmg = Math.max(1, Math.round(dmg));
      var partMul = o.part === true ? 1 : (+o.part || 0);
      if (this.hasRelic('giantslayer')) { if (this.isBoss(e)) partMul *= 1 + D.RELICS.giantslayer.part; else dmg = Math.max(1, Math.round(dmg * D.RELICS.giantslayer.mob)); }   // 거인학살자의 인장
      var res = e.hurt({ dmg: dmg, part: partMul ? dmg * partMul : 0, crit: crit, kind: o.kind, stage: o.stage || 0, stun: o.stun || 0, kx: e.x - P.x, ky: e.y - P.y, knock: o.knock || 1, slow: slow });
      if (!res) return 0;
      var hx = e.x, hy = e.y - (e.hy || 8);
      if (MG.FX) {
        MG.FX.dmg(hx, hy - 6, res.dealt, crit, res.part > 0);
        MG.FX.burst(hx, hy, crit ? 14 : 8, crit ? ['#fff6c0', '#ffd866', '#ffffff'] : ['#ffffff', '#e8f4ff', '#ffd8a0'], crit ? 120 : 80);
        if (elem === 'frost') { MG.FX.burst(hx, hy, 10, ['#e4fdff', '#bff6ff', '#8ae8f8'], 90); MG.FX.ring(hx, hy, 2, 12, 0.25, '#e4fdff', 1); }
        else if (elem === 'storm') { MG.FX.spark(hx, hy, 3); }
        else if (elem === 'fire') MG.FX.burst(hx, hy, 6, ['#ffb238', '#ff7424'], 70);
        var big = (o.kind === 'charge' || o.kind === 'special' || o.kind === 'gyeok') && !o.light;   // 다단히트(발도 참격 폭풍)의 중간 타는 가볍게 멈춘다
        MG.FX.hitstop(o.light ? 0.015 : (big ? 0.11 : (crit ? 0.07 : 0.045)));
        MG.FX.shake(big ? 3.5 : (crit ? 2.5 : 1.2), 0.12);
      }
      if (MG.Audio && MG.Audio.playEnemyHit) try { MG.Audio.playEnemyHit(); } catch (er) { /* 소리 없이 */ }
      if (!o.spell && !o.gyeok) {
        if (w.def.mpHit && o.kind !== 'special') P.mp = Math.min(P.maxMp, P.mp + w.def.mpHit);   // 비전 마검: 근접 적중마다 마력 흡수(v82: +3)
        if (w.def.line === 'tachi' && o.kind === 'melee' && P.addKi) P.addKi();                // 태도: 적중마다 검신이 달아오른다
        if (w.id === 'grove_blade' && o.stage === 2) P.heal(4, true);
        if (w.id === 'thorn_tachi' && e.alive) e.bleed = { t: 2, dps: 4 };
        if (this.hasRune('ember') && (o.stage === 2 || o.kind === 'charge') && e.alive) e.burn = { t: 2, dps: 5 * (bless === 'phoenix' ? 1 + D.BEASTS.phoenix.fire : 1) };
        if (this.hasRune('vamp') && Math.random() < 0.2) P.heal(3, true);
        if (this.hasRune('mana') && o.kind === 'melee' && o.stage === 2) { P.mp = Math.min(P.maxMp, P.mp + D.PLAYER.MANA_FINISH); if (MG.FX) MG.FX.text(P.x + 8, P.y - 26, '+' + D.PLAYER.MANA_FINISH + ' MP', '#8ab8ff', 0.6, 10); }   // v82 비전 샘: 3타 막타
        if (bless === 'tiger' && crit && e.alive) e.bleed = { t: 3, dps: D.BEASTS.tiger.bleed };   // 백호: 근접 치명타 → 출혈
        if (bless === 'dragon' && e.alive) this.volt(e, 1);                                        // 청룡: 푸른 뇌전 추가 피해
        if (this.hasRelic('berserk') && o.kind !== 'pet') P.heal(D.RELICS.berserk.drain, true);    // v83 광전사의 피눈물: 흡혈
        if (o.hold && MG.Companion) MG.Companion.joint(e);                                          // v83 홀드 강공격 → 파트너 합동 일격
        this.gyeok(e, o);
      }
      return res.dealt;
    },
    /* 청룡의 푸른 뇌전(근접 적중 · 구르기 시작) — 판정 없는 작은 추가 피해 */
    volt: function (e, mul) {
      var n = Math.max(1, Math.round(this.attackPower() * D.BEASTS.dragon.volt * (mul || 1)));
      e.hurt({ dmg: n, dot: true, kind: 'beast' });
      if (MG.FX) { MG.FX.spark(e.x, e.y - (e.hy || 8), 2); MG.FX.text(e.x - 8, e.y - 20, n, '#4deeea', 0.5, 10); }
      return n;
    },
    /* 상태 이상(출혈 · 화상) 틱 */
    dot: function (e, dt) {
      var k = ['bleed', 'burn'];
      for (var i = 0; i < k.length; i++) {
        var s = e[k[i]]; if (!s) continue;
        s.t -= dt; s.acc = (s.acc || 0) + s.dps * dt;
        if (s.acc >= 1) { var n = Math.floor(s.acc); s.acc -= n; e.hurt({ dmg: n, dot: true, kind: 'dot' }); if (MG.FX) MG.FX.text(e.x + (Math.random() - 0.5) * 8, e.y - 16, n, k[i] === 'burn' ? '#ffb238' : '#ff6a7a', 0.5, 9); }
        if (s.t <= 0) e[k[i]] = null;
      }
    }
  };
  MG.Combat = Combat;
})(window);
