/* ==========================================================================
   boss.js — 보스 5종(지하 던전의 닫힌 보스 둥지): 체력 + 부위 내구도(몬스터 헌터식) + 본체 공격 애니메이션(예비 동작 → 타격 → 후딜)
     1 고대 거목 수호자   : 양팔 머리 위로 → 내려찍기 · 팔 휩쓸기 · 뿌리 가시(왕관뿔 파괴 → 가시 7 → 4개)
     2 수정 갑주 골렘     : 두 팔을 합친 수정 해머 내려찍기(+충격파) · 회전 · 지진 고리(수정외피 파괴 → 충격파 반경 감소)
     3 심연의 가시 군주   : 촉수 내려찍기 · 가시 탄막 · 가시 밭(가시핵 파괴 → 탄막 5 → 3발)
     4 빙하의 서리 송곳니 : 앞발 치켜들고 도약 할퀴기 · 냉기 폭풍 브레스(냉기 장판) · 돌진(서리 송곳니 파괴 → 돌진 속도 · 장판 크기 감소)
     5 폭풍의 고룡 아스트랄: 날개 퍼덕여 칼바람 회오리 · 꼬리 휩쓸기 · 창백한 번개 브레스 · 폭풍 탄막(태초의 용옥 파괴 → 탄막 16 → 8발)
   · 모든 공격은 땅의 붉은 예고가 먼저 보이고, 다 차오르는 순간 판정 — 구르기로 피하면 저스트 회피.
   · 모아베기 · 계열 특수기 · 비전 마법이 부위 내구도를 깎는다 → 0 이면 「💥 부위 파괴 성공!」 + 그로기 + 핵심 소재가 실물로 툭.
   · 보스 둥지는 사방이 벽 — 플레이어가 죽기 전에는 보스가 절대 리스폰되거나 체력이 초기화되지 않는다. 토벌하면 귀환 제단이 열린다.
   · 토벌한 보스는 화톳불에서 쉬면 둥지에 다시 나타난다(재수렵 — 소재 파밍). 싸우던(살아 있는) 보스는 쉬어도 그대로.
   · 폭풍룡을 쓰러뜨리면 야영지에 「⚔️ 심연의 투기장」(강화된 5대 보스 연속 수렵 · 초월 재료)이 열린다.
   v83: · 2페이즈 광폭화 각성(체력 50%: 0.6초 포효 + 충격파 · 영구 오라 · 연계) · 히든 진 보스 「심연의 기사왕 카인」(인간형 검사 — 연속 대시 베기 ·
          공중 회전 찍기 · 흑염 검기 · 흑염 대검 내려베기, [왕의 무덤]) · 미궁 결전 보스 · 붉은 폭풍의 밤 난입 괴수 칸(all())
   v82: · 아종(Subspecies): 토벌한 보스는 화톳불 휴식 뒤 색조/속성이 변이된 아종으로 돌아온다(투기장은 언제나 아종) — 공격 속도 +15% · 탄막/가시 +2 ·
          체력 ×1.25 · 처치 시 추가 골드 + 심연의 정수.  · 둥지의 불안정한 지형: 보스의 강타/돌진이 기둥에 닿으면 무너진다(gimmick.js) ·
        · 모든 타격 판정은 hitP 를 지나 상쇄(Clash Parry)가 「누가 때렸는가」를 안다 — 방패에 튕긴 공격은 다음 프레임에 경직.
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;
  /* 공격 → [예비 동작 그림, 타격 그림] */
  var POSE = {
    slam: ['wind', 'strike'], sweep: ['wind2', 'alt'], roots: ['wind', 'strike'],
    hammer: ['wind', 'strike'], spin: ['wind2', 'alt'], quake: ['wind', 'strike'], shards: ['wind2', 'alt'],
    tentacle: ['wind', 'strike'], fan: ['wind2', 'alt'], field: ['wind2', 'alt'],
    pounce: ['wind', 'strike'], breath: ['wind2', 'alt'], charge: ['wind', 'strike'],
    tornado: ['wind', 'strike'], tail: ['wind2', 'alt'], lightning: ['wind3', 'alt2'], storm: ['wind', 'strike'],
    // v83 심연의 기사왕 카인(인간형 검사): 연속 대시 베기 · 공중 회전 찍기 · 흑염 검기 · 흑염 대검 내려베기
    kdash: ['wind2', 'alt'], kleap: ['wind3', 'alt2'], kwave: ['wind', 'strike'], kcleave: ['wind', 'strike'],
    // v84 잡기(🩸 진홍 안광 — 가드 · 상쇄 불능) · 백스텝 도약
    grab: ['wind2', 'alt'], backstep: ['wind2', 'idle1']
  };

  /* v85 부위 파괴 파편: 거목 뿔(나무) · 골렘 수정 · 가시 · 서리 송곳니(얼음) · 용 비늘 · 기사왕(흑관 조각) · 라가르 뿔 */
  var DEBRIS = { b1: 'horn', b2: 'crystal', b3: 'thorn', b4: 'crystal', b5: 'scale', k1: 'thorn', rg: 'horn' };
  function Boss(def) {
    this.def = def; this.id = def.id; this.r = def.r; this.hy = 24; this.mul = def.mul || 1;
    this.reset(true);
  }
  Boss.prototype.reset = function () {
    var d = this.def, S = MG.S, rec = S && S.bosses && S.bosses[d.base || this.id];
    // v82 아종: 토벌한 적이 있는 보스는 (화톳불 휴식 뒤) 아종으로 · 투기장은 언제나 아종 — 체력 ×1.25 · 피해 ×1.15(투기장은 투기장 배율 그대로)
    this.variant = !!(d.forceVariant || (!d.rush && (d.abyss || (rec && rec.kills > 0))));  /* v84 보스 러시는 R7 만 아종 */ this.V = this.variant ? D.VARIANTS[d.base || this.id] || null : null; if (!this.V) this.variant = false;
    var VA = D.VARIANT, field = this.variant && !d.abyss;
    this.mul = (d.mul || 1) * (field ? VA.dmg : 1); this.vname = this.variant ? (d.abyss || d.rush ? d.name : this.V.name) : null; this.comboNext = null; this.comboDepth = 0; this.atkEye = null;
    this.trapsDown = {}; this.parryPending = false; this.trapPending = null;
    this.x = d.home[0]; this.y = d.home[1]; this.z = 0; this.hp = Math.round(d.hp * (field ? VA.hp : 1)); this.maxHp = this.hp;
    this.partDur = d.part.dur; this.partMax = d.part.dur; this.partBroken = false;
    this.alive = true; this.dormant = true; this.engaged = false; this.state = 'idle'; this.st = 0; this.cd = 1.2;
    this.atk = null; this.tele = null; this.lastAtk = null; this.stagger = 0; this.flash = 0; this.anim = 0; this.vx = 0; this.vy = 0; this.deadT = 0; this.phase2 = false; this.phase = 1; this.roarT = 0; this.chainNext = false; this.hitDone = false;
    this.bleed = null; this.burn = null; this.slowT = 0; this.face = -1;
  };
  Boss.prototype.dmg = function (n) { return Math.round(n * this.mul); };
  /* 예비 동작 배율(작을수록 빠르다): 분노 0.8 · 투기장 0.85 · 아종 0.85(공격 속도 +15%) */
  Boss.prototype.fast = function () { return (this.phase2 ? 0.8 : 1) * (this.def.windMul || 1) * (this.variant ? D.VARIANT.wind : 1); };
  /* v82: 플레이어를 때리는 모든 판정은 여기로 — 상쇄(Clash Parry)가 「누가 때렸는가」를 안다 */
  Boss.prototype.hitP = function (dmg, src, opt) { var C = MG.Combat; C.attacker = this; if (this.atkEye === 'crimson') { opt = opt || {}; opt.unblockable = true; } try { return MG.Player.hurt(dmg, src, opt); } finally { C.attacker = null; } };   // v84 🩸 진홍 안광: 가드 · 상쇄로 막을 수 없다
  Boss.prototype.baseId = function () { return this.def.base || this.id; };
  /* v84 특정 공격을 곧바로(연계 · 백스텝) */
  Boss.prototype.chooseKind = function (kind) { var P = MG.Player, C = D.PLAYER, ax = P.x, ay = P.y; if (P.state === 'roll' && C.ROLL_DUR) { var rem = Math.max(0, 1 - P.st / C.ROLL_DUR), go = C.ROLL_SPEED * C.ROLL_DUR * rem * (1 - 0.375 * (1 + (1 - rem))); ax += (P.rdx || 0) * go; ay += (P.rdy || 0) * go; } this.aimAt = { x: ax, y: ay }; var dx = ax - this.x, dy = ay - this.y, d = Math.sqrt(dx * dx + dy * dy) || 1; this.forcedPick = kind; this.choose(d, dx / d, dy / d, this.fast()); };
  Boss.prototype.trapHit = function (x, y, r) { if (MG.Gimmick && MG.World.traps && MG.World.traps.length) MG.Gimmick.bossStrike(this, x, y, r); };
  Boss.prototype.engage = function () {
    if (this.engaged || !this.alive) return;
    this.engaged = true; this.dormant = false; this.state = 'chase'; this.st = 0; this.cd = 1.0;
    if (this.variant && !this.def.abyss && MG.UI && MG.UI.ribbon) MG.UI.ribbon('⚠️ 아종 출현 — ' + this.vname, 2400);
    MG.emit('bossEngage', this);
  };
  /* 사망했을 때만(Game.respawn): 처음 상태로 */
  Boss.prototype.disengage = function () {
    this.reset(); if (Bosses.hunt && Bosses.hunt.boss === this) Bosses.hunt = null; MG.emit('bossLeave', this);
  };
  Boss.prototype.hurt = function (o) {
    if (!this.alive) return null;
    if (!this.engaged) this.engage();
    var dmg = o.dmg, d = this.def, armored = d.armor && !this.partBroken && o.kind === 'melee';
    if (armored) { dmg = Math.max(1, Math.round(dmg * d.armor)); if (MG.FX && Math.random() < 0.35) MG.FX.text(this.x, this.y - 44, '팅! 갑주가 단단하다', '#c4ccd6', 0.6, 10); }
    if (this.state === 'groggy') dmg = Math.round(dmg * 1.3);
    this.hp -= dmg; this.flash = 0.1;
    var partDealt = 0;
    if (o.part && !this.partBroken) {
      partDealt = Math.round(o.part); this.partDur -= partDealt;
      if (MG.FX) MG.FX.text(this.x + 14, this.y - 22, '부위 -' + partDealt, '#ffb0f0', 0.7, 11);
      if (this.partDur <= 0) this.breakPart();
    }
    if (!o.dot) {
      if (o.slow) this.slowT = Math.max(this.slowT, o.slow * 0.5);
      this.stagger += dmg * (o.kind === 'charge' ? 2 : 1);
      if (o.stun && this.state !== 'groggy' && this.state !== 'dead') { this.state = 'stun'; this.st = 0; this.stunT = Math.min(1.2, o.stun); this.tele = null; this.atk = null; this.z = 0; }
      else if (this.stagger > this.maxHp * 0.12 && this.state !== 'groggy' && this.state !== 'act' && this.state !== 'stun') { this.stagger = 0; this.state = 'flinch'; this.st = 0; this.tele = null; this.atk = null; this.z = 0; }
    }
    if (this.hp <= 0) this.die();
    else if (this.hp <= this.maxHp * 0.5 && !this.phase2) this.awaken();
    return { dealt: dmg, part: partDealt };
  };
  /* v83 《다크 소울》 2페이즈 광폭화 각성: 0.6초 포효 + 충격파 · 2페이즈 오라 영구 점화 · 예비 동작/후딜 단축 · 공격 연계 */
  Boss.prototype.auraKind = function () { return D.PHASE2.aura[this.def.base || this.id] || D.PHASE2.aura[this.id] || 'abyss'; };
  Boss.prototype.awaken = function () {
    var P2 = D.PHASE2, FX = MG.FX, P = MG.Player, col = { fire: '#ff7a3a', storm: '#9ad8ff', frost: '#e4fdff', abyss: '#b090f0' }[this.auraKind()];
    this.phase2 = true; this.phase = 2; this.roarT = 0;
    if (this.state !== 'groggy' && this.state !== 'stun' && this.state !== 'dead') { this.state = 'roar'; this.st = 0; this.tele = null; this.atk = null; this.z = 0; }
    if (FX) { FX.text(this.x, this.y - 66, '🔥 보스 각성!', '#ff6a3a', 1.8, 18, { pop: true, rise: 8 }); FX.flash(col, 0.16); FX.shake(6, 0.6); FX.ring(this.x, this.y - 10, 8, P2.shockR, 0.5, col, 4); FX.ring(this.x, this.y - 10, 4, P2.shockR * 0.6, 0.4, '#ffffff', 2); FX.burst(this.x, this.y - 30, 40, [col, '#ffffff', '#ffd866'], 170); }
    if (P && P.alive() && U.dist(this.x, this.y, P.x, P.y) < P2.shockR + P.r) this.hitP(this.dmg(P2.shockDmg), this, { knock: 230 });   // 포효의 충격파
    if (MG.UI && MG.UI.ribbon) MG.UI.ribbon('🔥 ' + (this.vname || this.def.name) + ' 각성 — 2페이즈', 2200);
    MG.emit('bossAwaken', this);
  };
  Boss.prototype.breakPart = function () {
    var d = this.def, S = MG.S;
    this.partBroken = true; this.partDur = 0; this.state = 'groggy'; this.st = 0; this.tele = null; this.atk = null; this.z = 0;
    if (!d.abyss) { S.bosses[this.id] = S.bosses[this.id] || { kills: 0, breaks: 0 }; S.bosses[this.id].breaks++; }
    if (MG.FX) {
      MG.FX.text(this.x, this.y - 30, '💥 부위 파괴 성공!', '#ffd866', 1.6, 17, { pop: true });
      MG.FX.slow(0.3, 0.45); MG.FX.flash('#fff3c0', 0.12); MG.FX.shake(5, 0.4);
      MG.FX.burst(this.x, this.y - 40, 40, ['#ffd866', '#fff6c0', d.color, '#ffffff'], 160);
      MG.FX.ring(this.x, this.y - 30, 6, 46, 0.5, '#ffd866', 3);
      if (MG.Input && MG.Input.rumble) MG.Input.rumble(250, 1, 'break');   // v86 햅틱
      var Pb = MG.Player, kb = DEBRIS[this.baseId()] || 'horn';   // v85 ② 부위 파괴: 임팩트 줌 1.07 + 부서진 부위 조각이 바닥에 튀어 굴러간다
      if (MG.FX.impact) MG.FX.impact(1.07, 0.24, Pb ? (Pb.x + this.x) / 2 : this.x, (Pb ? (Pb.y + this.y) / 2 : this.y) - 16, Pb ? this.x - Pb.x : 0, Pb ? this.y - Pb.y : 0, 6);
      if (MG.FX.debris) MG.FX.debris(this.x + (this.face < 0 ? -6 : 6), this.y, 20, kb, null, 110, Math.min(36, Math.max(10, ((d.part && d.part.y) || 40) * 0.5)));
    }
    if (MG.SFX && MG.SFX.ac()) MG.SFX.crash(); else if (MG.Audio && MG.Audio.playShellCrack) try { MG.Audio.playShellCrack(); } catch (e) { /* 무음 */ }   // v82: 묵직한 파열음
    if (MG.Loot) MG.Loot.drop(this.x + 18, this.y - 4, 'mat', d.mat, 1, { boss: true });
    if (MG.UI && MG.UI.ribbon) MG.UI.ribbon('💥 ' + d.part.name + ' 파괴! ' + d.weak, 2400);   // 떨어진 소재는 주울 때 따로 알린다
    MG.emit('partBreak', this);
  };
  Boss.prototype.die = function () {
    var d = this.def, S = MG.S;
    this.alive = false; this.hp = 0; this.state = 'dead'; this.deadT = 0; this.tele = null; this.atk = null; this.engaged = false; this.z = 0;
    if (!d.abyss) { S.bosses[this.id] = S.bosses[this.id] || { kills: 0, breaks: 0 }; S.bosses[this.id].kills++; }
    if (MG.FX) { if (MG.FX.finisher) MG.FX.finisher(0.28, this.x, this.y - 24); else MG.FX.slow(0.25, 0.6); MG.FX.shake(6, 0.5); MG.FX.flash('#ffffff', 0.15); MG.FX.burst(this.x, this.y - 30, 50, [d.color, '#ffd866', '#ffffff'], 170); }   // v85 ④ 보스 마지막 일격: 0.28초 슬로모션 + 줌인 → 끝나면 전리품 분수
    if (MG.Audio && MG.Audio.playReward) try { MG.Audio.playReward(); } catch (e) { /* 무음 */ }
    if (this.variant && !d.abyss) { S.bosses[this.id].vkills = (S.bosses[this.id].vkills || 0) + 1; }
    if (MG.Loot) {
      var coins = this.variant ? Math.round(18 * D.VARIANT.gold) : 18;
      var _dr = MG.Loot.drop; MG.Loot.drop = function (x, y, k, id, n, o) { o = o || {}; o.wait = true; return _dr.call(MG.Loot, x, y, k, id, n, o); };   // 슬로모션이 끝날 때까지 잠깐 머금었다가 터진다
      try {
      for (var i = 0; i < coins; i++) MG.Loot.drop(this.x, this.y - 10, 'gold', null, d.abyss ? 10 : 6, { fountain: true });
      if (this.variant && !d.abyss) MG.Loot.drop(this.x, this.y - 10, 'mat', 'abyss', D.VARIANT.abyss, { boss: true, fountain: true });   // 아종: 추가 골드 + 심연의 정수
      MG.Loot.drop(this.x, this.y - 10, 'mat', d.mat, 1, { boss: true, fountain: true });
      if (d.abyss) MG.Loot.drop(this.x, this.y - 10, 'mat', 'abyss', D.ARENA.n, { boss: true, fountain: true });
      if (d.invader) { MG.Loot.drop(this.x, this.y - 10, 'mat', 'abyss', D.TEMPEST.abyss, { boss: true, fountain: true }); for (var gi = 0; gi < D.TEMPEST.gold; gi++) MG.Loot.drop(this.x, this.y - 10, 'gold', null, 8, { fountain: true }); }   // v83 난입 괴수: 대량의 골드 + 심연의 정수
      MG.Loot.drop(this.x, this.y - 10, 'mat', d.common, 3, { fountain: true });
      MG.Loot.drop(this.x, this.y - 10, 'mat', 'ore', 2, { fountain: true });
      } finally { MG.Loot.drop = _dr; }
    }
    var hr = Bosses.finishHunt(this);   // v85 수렵 시간 · 피격 → 👑S / A / B
    if (MG.UI && MG.UI.ribbon && (!d.rush || d.round === D.RUSH.rounds)) MG.UI.ribbon('🏆 ' + (this.vname || d.name) + ' 토벌!' + (hr ? ' [' + hr.t.toFixed(1) + '초 · ' + (hr.rank === 'S' ? '👑S' : hr.rank) + '랭크]' : '') + (this.variant && !d.abyss ? ' · 🌑 정수' : ''), 2400);
    // v86 서사: 다섯 괴수의 혼 = 왕의 무덤 봉인 사슬 — 처음 쓰러뜨릴 때마다 사슬 하나가 끊어진다
    if (!d.abyss && !d.rush && D.BOSSES.some(function (x) { return x.id === d.id; }) && S.bosses[this.id].kills === 1 && MG.UI && MG.UI.ribbon) { var nCh = D.BOSSES.filter(function (x) { return S.bosses[x.id] && S.bosses[x.id].kills > 0; }).length, chMsg = nCh >= 5 ? '👑 다섯 사슬이 모두 끊어졌다 — 용화산 북동쪽 끝, 왕의 무덤이 열린다' : '⛓ 왕의 무덤 봉인 사슬 하나가 끊어졌다 — ' + nCh + '/5'; global.setTimeout(function () { MG.UI.ribbon(chMsg, 2600); }, this.id === 'b5' ? 4900 : 2300); }
    if (this.id === 'b5' && !S.abyssOpen) { S.abyssOpen = true; if (MG.UI && MG.UI.ribbon) global.setTimeout(function () { MG.UI.ribbon('⚔️ 심연의 투기장이 열렸다 — 사냥꾼의 야영지에 포털', 2600); }, 2100); }
    MG.emit('bossDown', this);
    if (MG.Save) MG.Save.save();
  };

  /* ---------------------------------------------------------------- 인공지능 */
  Boss.prototype.update = function (rdt) {
    var P = MG.Player, d = this.def;
    this.slowT = Math.max(0, this.slowT - rdt);
    var dt = this.slowT > 0 ? rdt * 0.6 : rdt;
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.st += dt; this.cd = Math.max(0, this.cd - dt);
    this.stagger = Math.max(0, this.stagger - this.maxHp * 0.02 * dt);
    if (this.state === 'dead') { this.deadT += dt; return; }
    if (!this.alive) return;
    MG.Combat.dot(this, dt); if (!this.alive) return;
    if (this.trapPending && MG.Gimmick) MG.Gimmick.stagger(this, this.trapPending);   // v82 지형 붕괴(보스가 스스로 기둥을 들이받았다)
    if (this.parryPending) MG.Combat.applyParry(this);   // v82 상쇄: 방패에 튕겨 나간 공격 — 판정이 끝난 지금 경직
    var dHome = U.dist(P.x, P.y, d.home[0], d.home[1]);
    if (!this.engaged) { if (P.alive() && dHome < d.arena) this.engage(); return; }
    // 둥지는 닫혀 있다: 멀어진다고 리스폰/초기화하지 않는다. 너무 멀리 밀려나면 지금 상태 그대로 둥지 가운데로 돌아간다.
    var bossOut = U.dist(this.x, this.y, d.home[0], d.home[1]) > d.arena * 1.6;
    if ((dHome > d.arena * 2.2 || bossOut) && (this.state === 'chase' || this.state === 'rec' || this.state === 'flinch')) { this.state = 'return'; this.st = 0; this.tele = null; this.atk = null; }
    var dx = P.x - this.x, dy = P.y - this.y, dist = Math.sqrt(dx * dx + dy * dy) || 1, fast = this.fast();
    var mvx = 0, mvy = 0, spd = d.speed * (this.slowT > 0 ? 0.6 : 1);
    if (Math.abs(dx) > 4 && this.state !== 'act' && this.state !== 'wind') this.face = dx < 0 ? -1 : 1;
    switch (this.state) {
      case 'chase':
        if (dist > 30) { mvx = dx / dist * spd; mvy = dy / dist * spd; }
        if (this.cd <= 0 && dist < 46 && D.PATTERN.ranged[this.baseId()] && Math.random() < D.PATTERN.BACKSTEP_P) { this.chooseKind('backstep'); break; }   // v84 백스텝 도약 → 원거리 견제
        if (this.cd <= 0 && dist < 140) this.choose(dist, dx / dist, dy / dist, fast);
        break;
      case 'wind':
        if (this.st >= this.tele.wind) { this.state = 'act'; this.st = 0; this.hitDone = false; this.startAct(); }
        break;
      case 'act': this.updateAct(dt, P); break;
      case 'rec': if (this.comboNext && this.st >= 0.12) { var ck = this.comboNext; this.comboNext = null; this.comboing = true; this.chooseKind(ck); this.comboing = false; break; }   // v84 2~3단 연계: 구르기 도착 지점을 노린다
        if (this.st >= (this.chainNext ? 0.18 : (this.phase2 ? 0.55 : 0.85) * (this.variant ? D.VARIANT.rec : 1))) { this.state = 'chase'; this.st = 0; this.cd = this.chainNext ? 0 : (this.phase2 ? 0.5 : 0.9); this.chainNext = false; }   // v83 2페이즈: 공격이 이어진다 break;
      case 'roar': this.roarT += dt; if (this.st >= D.PHASE2.roar) { this.state = 'chase'; this.st = 0; this.cd = 0.25; } break;
      case 'flinch': if (this.st >= 0.55) { this.state = 'chase'; this.st = 0; this.cd = 0.4; } break;
      case 'stun': if (this.st >= this.stunT) { this.state = 'chase'; this.st = 0; } break;
      case 'groggy': if (this.st >= 3.5) { this.state = 'chase'; this.st = 0; this.cd = 0.6; } break;
      case 'return': {
        var hx = d.home[0] - this.x, hy = d.home[1] - this.y, hd = Math.sqrt(hx * hx + hy * hy) || 1;
        if (hd > 6) { mvx = hx / hd * spd * 1.5; mvy = hy / hd * spd * 1.5; }
        if (P.alive() && dHome < d.arena * 1.3 && hd < d.arena) { this.state = 'chase'; this.st = 0; this.cd = 0.8; }
        break;
      }
    }
    if (this.state === 'act' && this.atk && this.atk.dash) { mvx = this.atk.vx; mvy = this.atk.vy; }
    if (this.state === 'act' && this.atk && this.atk.leap) {   // 도약: 날아가는 동안 벽은 무시하고 착지 지점으로
      var L = this.atk.leap, q = U.clamp(this.atk.t / L.dur, 0, 1);
      this.x = U.lerp(L.x0, L.x1, q); this.y = U.lerp(L.y0, L.y1, q); this.z = Math.sin(q * Math.PI) * (L.back ? 12 : 34);
      var pr = MG.World.resolve(this.x, this.y, this.r); if (q >= 1) { this.x = pr.x; this.y = pr.y; }
      return;
    }
    if (this.state === 'act' && this.atk && this.atk.spinning) { mvx = dx / dist * spd * 1.6; mvy = dy / dist * spd * 1.6; }
    var p = MG.World.resolve(this.x + mvx * dt, this.y + mvy * dt, this.r);
    var lim = d.arena * 2.4;
    if (U.dist(p.x, p.y, d.home[0], d.home[1]) > lim) { var a = U.angle(d.home[0], d.home[1], p.x, p.y); p.x = d.home[0] + Math.cos(a) * lim; p.y = d.home[1] + Math.sin(a) * lim; }
    this.x = p.x; this.y = p.y;
  };
  Boss.prototype.choose = function (dist, ux, uy, fast) {
    var d = this.def, pool = d.atks.slice(), P = this.aimAt || MG.Player, br = this.partBroken, pick; this.aimAt = null;   // v84 연계는 구르기 도착 지점을 노린다
    // 가까우면 근접기(내려찍기 계열), 멀면 원거리/돌진 계열을 고른다
    var close = { slam: 1, hammer: 1, tentacle: 1, pounce: 0, tail: 1, sweep: 1, spin: 1, kcleave: 1 };
    var near = pool.filter(function (k) { return close[k]; }), far = pool.filter(function (k) { return !close[k]; });
    if (dist < 52 && near.length && Math.random() < 0.7) pick = near[Math.floor(Math.random() * near.length)];
    else if (dist > 80 && far.length && Math.random() < 0.75) pick = far[Math.floor(Math.random() * far.length)];
    else pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick === this.lastPick && pool.length > 2 && Math.random() < 0.6) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
    this.lastPick = pick;
    if (this.forcedPick) { pick = this.forcedPick; this.forcedPick = null; }
    var T = { kind: pick, ux: ux, uy: uy, x: P.x, y: P.y, a: Math.atan2(uy, ux) }, k, ex = this.variant ? D.VARIANT.extra : 0;   // v82 아종: 탄막 · 가시 · 뿌리가 더 많다
    if (pick === 'slam') { T.cx = this.x + ux * 30; T.cy = this.y + uy * 30; T.r = 36; T.wind = 0.9 * fast; }
    else if (pick === 'sweep') { T.R = 78; T.half = 75; T.wind = 0.75 * fast; }
    else if (pick === 'roots') { T.pts = []; var nr = (br ? 4 : 7) + ex; for (k = 0; k < nr; k++) T.pts.push([this.x + ux * (24 + k * 24), this.y + uy * (24 + k * 24)]); T.r = 12; T.wind = 0.8 * fast; }
    else if (pick === 'hammer') { T.cx = this.x + ux * 30; T.cy = this.y + uy * 30; T.r = 30; T.shock = br ? 44 : 76; T.wind = 1.0 * fast; }
    else if (pick === 'spin') { T.R = this.r + 20; T.wind = 0.7 * fast; }
    else if (pick === 'quake') { T.wind = 1.0 * fast; T.r = br ? 72 : 118; }
    else if (pick === 'shards') { T.wind = 0.8 * fast; }
    else if (pick === 'tentacle') { T.lines = [-0.42, 0, 0.42].map(function (o) { return T.a + o; }); T.len = 130; T.w = 16; T.wind = 0.85 * fast; }
    else if (pick === 'fan') { T.n = (br ? 3 : 5) + ex; T.wind = 0.6 * fast; }
    else if (pick === 'field') { T.pts = [[P.x, P.y]]; for (var j = 0; j < (this.phase2 ? 7 : 5) + ex; j++) { var aa = Math.random() * 6.28, rr = 22 + Math.random() * 48; T.pts.push([P.x + Math.cos(aa) * rr, P.y + Math.sin(aa) * rr]); } T.r = 15; T.wind = 1.0 * fast; }
    else if (pick === 'pounce') { var tg = MG.World.resolve(P.x, P.y, this.r); T.cx = tg.x; T.cy = tg.y; T.r = 32; T.wind = 0.8 * fast; }
    else if (pick === 'breath') { T.R = 120; T.half = 26; T.zr = br ? 14 : 24; T.wind = 0.85 * fast; }
    else if (pick === 'charge') { T.sp = br ? 220 : 310; T.len = br ? 140 : 180; T.w = 30; T.wind = 0.7 * fast; }
    else if (pick === 'tornado') { T.n = (this.phase2 ? 5 : 3) + (ex ? 1 : 0); T.wind = 0.9 * fast; }
    else if (pick === 'tail') { T.r0 = 18; T.R = 70; T.wind = 0.8 * fast; }
    else if (pick === 'lightning') { T.len = 240; T.w = 22; T.wind = 1.0 * fast; }
    else if (pick === 'storm') { T.n = (br ? 8 : 16) + ex * 2; T.wind = 1.0 * fast; }
    else if (pick === 'kdash') { T.n = (br ? 2 : 3) + (this.phase2 ? 1 : 0); T.len = 120; T.w = 22; T.wind = 0.55 * fast; }
    else if (pick === 'kleap') { var kt = MG.World.resolve(P.x, P.y, this.r); T.cx = kt.x; T.cy = kt.y; T.r = 40; T.wind = 0.7 * fast; }
    else if (pick === 'kwave') { T.n = (br ? 1 : 3) + (this.phase2 ? 2 : 0); T.wind = 0.6 * fast; }
    else if (pick === 'kcleave') { T.R = 66; T.half = 72; T.wind = 0.85 * fast; }
    else if (pick === 'grab') { T.len = 96; T.w = 24; T.wind = 0.75 * fast; }
    else if (pick === 'backstep') { T.wind = 0.14; }
    var PT = D.PATTERN; T.eye = PT.crimson[pick] ? 'crimson' : 'gold';   // ⚡ 황금(상쇄 가능) / 🩸 진홍(굴러서 피하라)
    if (this.comboing) T.wind *= PT.COMBO_WIND;
    else if (PT.delay[pick] && Math.random() < PT.DELAY_P) { T.delay = PT.DELAY; T.wind += T.delay; }   // 엇박자: 치켜든 채 0.35초 더 멈춘다
    this.tele = T; this.state = 'wind'; this.st = 0;
  };
  Boss.prototype.startAct = function () {
    var T = this.tele, P = MG.Player, k, FX = MG.FX;
    this.atk = { kind: T.kind, t: 0 }; this.atkEye = T.eye;
    switch (T.kind) {
      case 'backstep': { var bdx = this.x - P.x, bdy = this.y - P.y, bdd = Math.sqrt(bdx * bdx + bdy * bdy) || 1, bp = MG.World.resolve(this.x + bdx / bdd * 70, this.y + bdy / bdd * 70, this.r); this.atk.leap = { x0: this.x, y0: this.y, x1: bp.x, y1: bp.y, dur: 0.3, back: true }; this.atk.dur = 0.3; if (FX) FX.burst(this.x, this.y, 10, ['#a08a6a', '#d8c8a0'], 60); break; }
      case 'grab': this.atk.dash = true; this.atk.grab = true; this.atk.vx = T.ux * 300; this.atk.vy = T.uy * 300; this.atk.dur = T.len / 300; if (FX) FX.text(this.x, this.y - 56, '🩸', '#ff3a4a', 0.5, 14); break;
      case 'slam': this.hitIn(T.cx, T.cy, T.r, 26); this.trapHit(T.cx, T.cy, T.r); if (this.V && this.V.zone) MG.Shots.zone(T.cx, T.cy, 24, 3.0, this.dmg(6), this.V.zone); if (FX) { FX.shake(4, 0.25); FX.ring(T.cx, T.cy, 6, T.r, 0.35, '#ffd0a0', 3); FX.burst(T.cx, T.cy, 20, ['#a08a6a', '#d8c8a0', '#6a5a40'], 120); } this.endAct(); break;
      case 'sweep': if (this.inCone(P, T.a, T.R, T.half)) this.hitP(this.dmg(22), this, { knock: 150 }); this.trapHit(this.x + T.ux * 40, this.y + T.uy * 40, 36); if (FX) { FX.shake(3, 0.2); FX.burst(this.x + T.ux * 40, this.y + T.uy * 40, 16, ['#6e4220', '#8ad070', '#4a2a14'], 110); } this.atk.dur = 0.3; this.atk.arc = true; break;
      case 'hammer': this.hitIn(T.cx, T.cy, T.r, 30); this.trapHit(T.cx, T.cy, T.r); if (this.V && this.V.zone) MG.Shots.zone(T.cx, T.cy, 22, 3.0, this.dmg(6), this.V.zone); this.atk.ring = true; this.atk.cx = T.cx; this.atk.cy = T.cy; this.atk.R0 = 8; this.atk.R1 = T.shock; this.atk.dur = 0.55; if (FX) { FX.shake(5, 0.3); FX.burst(T.cx, T.cy, 26, ['#c4a8ff', '#efe4ff', '#8ae8f8'], 140); FX.flash('#efe4ff', 0.05); } break;
      case 'spin': this.atk.spinning = true; this.atk.dur = 1.0; break;
      case 'quake': this.atk.dur = 0.75; this.atk.ring = true; this.atk.cx = this.x; this.atk.cy = this.y; this.atk.R0 = 20; this.atk.R1 = T.r; if (FX) FX.shake(3, 0.6); break;
      case 'shards': for (k = 0; k < 12; k++) MG.Shots.fire(this.x, this.y - 16, k / 12 * Math.PI * 2 + (this.phase2 ? 0.13 : 0), 105, this.dmg(16), 'shard', 2.4); this.atk.dur = this.phase2 || this.variant ? 0.45 : 0.1; this.atk.second = this.phase2 || this.variant; break;
      case 'tentacle': this.atk.dur = 0.35; this.atk.lines = true; if (FX) FX.shake(4, 0.25); for (k = 0; k < T.lines.length; k++) if (MG.Gimmick && MG.World.traps.length) MG.Gimmick.bossLine(this, T.lines[k], T.len, T.w); break;
      case 'fan': this.fireFan(T.n); this.atk.dur = this.phase2 ? 0.75 : 0.4; this.atk.shots = 1; break;
      case 'roots': case 'field': this.atk.dur = T.kind === 'roots' ? 0.12 * T.pts.length + 0.2 : 0.3; this.atk.done = []; break;
      case 'pounce': this.atk.leap = { x0: this.x, y0: this.y, x1: T.cx, y1: T.cy, dur: 0.38 }; this.atk.dur = 0.38; break;
      case 'breath': this.atk.dur = 0.8; this.atk.breath = true; break;
      case 'charge': this.atk.dash = true; this.atk.vx = T.ux * T.sp; this.atk.vy = T.uy * T.sp; this.atk.dur = T.len / T.sp; break;
      case 'tornado': for (k = 0; k < T.n; k++) { var a = T.a + (k - (T.n - 1) / 2) * 0.5; MG.Shots.fire(this.x + Math.cos(a) * 20, this.y + Math.sin(a) * 12, a, 72, this.dmg(20), 'tornado', 3.4, { home: 0.9 }); } if (FX) { FX.shake(3, 0.3); FX.burst(this.x, this.y - 30, 30, ['#eef6ff', '#4deeea', '#9ad8ff'], 160); } this.endAct(); break;
      case 'tail': if (U.dist(this.x, this.y, P.x, P.y) < T.R + P.r && U.dist(this.x, this.y, P.x, P.y) > T.r0) this.hitP(this.dmg(26), this, { knock: 170 }); this.trapHit(this.x, this.y, T.R); if (FX) { FX.shake(4, 0.3); FX.ring(this.x, this.y, T.r0, T.R, 0.3, '#9ad8ff', 4); } this.atk.dur = 0.3; break;
      case 'lightning': if (this.inLine(P, T.a, T.len, T.w / 2 + P.r)) this.hitP(this.dmg(34), this, { knock: 120 }); if (MG.Gimmick && MG.World.traps.length) MG.Gimmick.bossLine(this, T.a, T.len, T.w); this.atk.dur = 0.5; this.atk.beam = true; this.atk.a = T.a; if (FX) { FX.flash('#e8f4ff', 0.12); FX.shake(5, 0.3); } break;
      case 'storm': this.atk.dur = this.phase2 ? 0.7 : 0.15; this.atk.waves = 0; break;
      case 'kdash': this.atk.kdash = { left: T.n, seg: 0, phase: 'dash', t: 0 }; this.kAim(); if (FX) FX.text(this.x, this.y - 50, '⚔', '#d8c8ff', 0.4, 14); break;
      case 'kleap': this.atk.leap = { x0: this.x, y0: this.y, x1: T.cx, y1: T.cy, dur: 0.48, spin: true }; this.atk.dur = 0.48; break;
      case 'kwave': for (k = 0; k < T.n; k++) MG.Shots.fire(this.x, this.y - 18, T.a + (k - (T.n - 1) / 2) * 0.24, 175, this.dmg(22), 'darkwave', 2.2); if (FX) { FX.burst(this.x + T.ux * 20, this.y - 18, 20, ['#1a0a2a', '#b090f0', '#ff6a3a'], 120); FX.shake(2, 0.2); } this.atk.dur = 0.3; break;
      case 'kcleave': if (this.inCone(P, T.a, T.R, T.half)) this.hitP(this.dmg(36), this, { knock: 180 }); this.trapHit(this.x + T.ux * 36, this.y + T.uy * 36, 34); if (FX) { FX.shake(5, 0.3); FX.burst(this.x + T.ux * 36, this.y + T.uy * 30, 26, ['#1a0a2a', '#b090f0', '#ff6a3a', '#ffffff'], 150); FX.crack(this.x + T.ux * 30, this.y + T.uy * 30, T.a, 40); } this.atk.dur = 0.32; this.atk.arc = true; break;
    }
  };
  Boss.prototype.fireFan = function (n) { var P = MG.Player, a0 = U.angle(this.x, this.y - 14, P.x, P.y - 8); n = n || 5; for (var k = 0; k < n; k++) MG.Shots.fire(this.x, this.y - 14, a0 + (k - (n - 1) / 2) * 0.26, 150, this.dmg(18), 'thorn', 2.0); };
  Boss.prototype.fireStorm = function (n, off) { for (var k = 0; k < n; k++) MG.Shots.fire(this.x, this.y - 20, k / n * Math.PI * 2 + off, 95, this.dmg(18), 'orb', 2.8); };
  Boss.prototype.inCone = function (P, a, R, half) { var dd = U.dist(this.x, this.y, P.x, P.y); if (dd > R + P.r) return false; return dd < this.r + 6 || Math.abs(U.angDiff(a, Math.atan2(P.y - this.y, P.x - this.x))) < half * Math.PI / 180; };
  Boss.prototype.inLine = function (P, a, len, hw) { var dx = P.x - this.x, dy = P.y - this.y, along = dx * Math.cos(a) + dy * Math.sin(a), side = -dx * Math.sin(a) + dy * Math.cos(a); return along > 0 && along < len && Math.abs(side) < hw; };
  Boss.prototype.updateAct = function (dt, P) {
    var A = this.atk, T = this.tele, k; if (!A) { this.endAct(); return; }
    A.t += dt;
    if (A.leap && A.leap.back) { if (A.t >= A.leap.dur) { this.z = 0; this.endAct(); } return; }   // v84 백스텝 착지 → 곧바로 원거리 견제(endAct 의 연계)
    if (A.leap) {
      if (A.leap.spin && MG.FX && Math.random() < 0.8) MG.FX.burst(this.x, this.y - 20 - this.z, 2, ['#b090f0', '#1a0a2a'], 50, { g: 0 });
      if (A.t >= A.leap.dur && A.leap.spin) { this.z = 0; this.hitIn(T.cx, T.cy, T.r, 32); this.trapHit(T.cx, T.cy, T.r); if (MG.FX) { MG.FX.shake(6, 0.35); MG.FX.ring(T.cx, T.cy, 6, T.r + 10, 0.4, '#b090f0', 4); MG.FX.burst(T.cx, T.cy, 30, ['#1a0a2a', '#b090f0', '#ff6a3a'], 160); MG.FX.crack(T.cx, T.cy + 2, Math.PI / 2, 44); } for (var kk = 0; kk < (this.phase2 ? 8 : 0); kk++) MG.Shots.fire(T.cx, T.cy - 8, kk / 8 * Math.PI * 2, 120, this.dmg(16), 'darkwave', 1.4); this.endAct(); return; }
      if (A.t >= A.leap.dur) { this.z = 0; this.hitIn(T.cx, T.cy, T.r, 30); if (MG.FX) { MG.FX.shake(5, 0.3); MG.FX.ring(T.cx, T.cy, 6, T.r, 0.35, '#e4fdff', 3); MG.FX.burst(T.cx, T.cy, 26, ['#e4fdff', '#8ae8f8', '#ffffff'], 130); } MG.Shots.zone(T.cx, T.cy, this.partBroken ? 14 : 22, 2.5, this.dmg(6), 'frost'); this.trapHit(T.cx, T.cy, T.r); this.endAct(); }
      return;
    }
    if (A.grab) {   // v84 잡기: 가드 · 상쇄를 뚫는다 — 붙잡혀 크게 다친다
      if (!this.hitDone && U.dist(this.x, this.y, P.x, P.y) < this.r + P.r + 8) { var gr = this.hitP(this.dmg(32), this, { knock: 60 }); if (gr) { this.hitDone = true; if (gr === 'hit' && MG.FX) { MG.FX.text(P.x, P.y - 36, '🩸 붙잡혔다!', '#ff4a5a', 1.0, 13, { pop: true }); MG.FX.shake(5, 0.3); P.slowT = Math.max(P.slowT || 0, 0.9); } } }
      if (A.t >= A.dur) this.endAct();
      return;
    }
    if (A.kdash) {   // v83 기사왕: 짧은 예고(0.2초) → 번개 같은 대시 베기, 그걸 2~4번
      var K = A.kdash; K.t += dt;
      if (K.phase === 'aim') { this.vx = 0; this.vy = 0; if (K.t >= 0.2) { K.phase = 'dash'; K.t = 0; this.hitDone = false; this.kAim(); } return; }
      this.x += this.vx * dt; this.y += this.vy * dt; var kp = MG.World.resolve(this.x, this.y, this.r); this.x = kp.x; this.y = kp.y;
      if (!this.hitDone && U.dist(this.x, this.y, P.x, P.y) < this.r + P.r + 10) { var kr = this.hitP(this.dmg(24), this, { knock: 150 }); if (kr) this.hitDone = true; }
      this.trapHit(this.x, this.y, this.r + 4); if (this.state !== 'act') return;
      if (MG.FX && Math.random() < 0.9) MG.FX.ghost({ x: this.x, y: this.y, dir: 'right', a: 0, sil: 'red' });
      if (MG.FX && Math.random() < 0.6) MG.FX.slash(this.x, this.y - 18, Math.atan2(this.vy, this.vx), '#d8c8ff');
      if (K.t >= 0.16) { K.seg++; if (K.seg >= K.left) { this.vx = 0; this.vy = 0; this.endAct(); return; } K.phase = 'aim'; K.t = 0; }
      return;
    }
    if (A.dash) {
      if (!this.hitDone && U.dist(this.x, this.y, P.x, P.y) < this.r + P.r + 4) { var r = this.hitP(this.dmg(24), this, { knock: 140 }); if (r) this.hitDone = true; }
      if (this.state === 'act') this.trapHit(this.x, this.y, this.r + 4);   // 돌진하다 기둥을 들이받는다
      if (this.state !== 'act') return;
      if (MG.FX && Math.random() < 0.5) MG.FX.burst(this.x, this.y, 2, this.id === 'b4' ? ['#e4fdff', '#8ae8f8'] : ['#a08a6a', '#d8c8a0'], 40);
      if (A.t >= A.dur) { if (MG.FX) MG.FX.shake(2, 0.15); this.endAct(); }
      return;
    }
    if (A.spinning) {
      if (!this.hitDone && U.dist(this.x, this.y, P.x, P.y) < T.R + P.r) { var rs = this.hitP(this.dmg(22), this, { knock: 160 }); if (rs) this.hitDone = true; }
      this.trapHit(this.x, this.y, T.R); if (this.state !== 'act') return;
      if (MG.FX && Math.random() < 0.8) { var sa = this.anim * 20; MG.FX.burst(this.x + Math.cos(sa) * T.R, this.y + Math.sin(sa) * T.R * 0.6, 1, ['#c4a8ff', '#efe4ff'], 40); }
      if (A.t >= A.dur) this.endAct();
      return;
    }
    if (A.ring) {
      var R = A.R0 + (A.R1 - A.R0) * (A.t / A.dur), dd = U.dist(A.cx, A.cy, P.x, P.y);
      if (!this.hitDone && Math.abs(dd - R) < 9) { var rr = this.hitP(this.dmg(24), { x: A.cx, y: A.cy }); if (rr) this.hitDone = true; }
      A.R = R; if (A.t >= A.dur) { this.trapHit(A.cx, A.cy, A.R1); if (this.state === 'act') this.endAct(); }
      return;
    }
    if (A.lines) {
      if (!A.hit) { A.hit = true; for (k = 0; k < T.lines.length; k++) if (this.inLine(P, T.lines[k], T.len, T.w / 2 + P.r)) { this.hitP(this.dmg(24), this, { knock: 120 }); break; } }
      if (MG.FX && !A.fx) { A.fx = true; for (k = 0; k < T.lines.length; k++) for (var q = 1; q <= 4; q++) MG.FX.burst(this.x + Math.cos(T.lines[k]) * q * 30, this.y + Math.sin(T.lines[k]) * q * 30, 4, ['#ff7a8a', '#5e2a2a', '#e8c8a0'], 60); }
      if (A.t >= A.dur) this.endAct();
      return;
    }
    if (A.breath) {
      if (!this.hitDone && this.inCone(P, T.a, T.R, T.half)) { var rb = this.hitP(this.dmg(26), this, { knock: 90 }); if (rb) { this.hitDone = true; if (rb === 'hit') P.slowT = Math.max(P.slowT || 0, 1.2); } }
      if (MG.FX) for (k = 0; k < 3; k++) { var ba = T.a + (Math.random() - 0.5) * T.half * Math.PI / 90, bl = 20 + Math.random() * T.R * (A.t / A.dur + 0.2); MG.FX.burst(this.x + Math.cos(ba) * bl, this.y - 10 + Math.sin(ba) * bl, 1, ['#e4fdff', '#8ae8f8', '#ffffff'], 30, { g: 0 }); }
      if (!A.zoned && A.t > 0.4) { A.zoned = true; for (k = 1; k <= 3; k++) MG.Shots.zone(this.x + Math.cos(T.a) * k * 34, this.y + Math.sin(T.a) * k * 34, T.zr, 3.0, this.dmg(6), 'frost'); }
      if (A.t >= A.dur) this.endAct();
      return;
    }
    if (A.beam) {
      if (!A.bolts && A.t > 0.18) { A.bolts = true; for (k = 1; k <= 3; k++) { var bx = this.x + Math.cos(A.a) * k * 70, by = this.y + Math.sin(A.a) * k * 70; if (MG.FX) { MG.FX.ring(bx, by, 3, 22, 0.3, '#eef6ff', 2); MG.FX.burst(bx, by, 10, ['#eef6ff', '#9ad8ff'], 90); } if (U.dist(bx, by, P.x, P.y) < 20 + P.r) this.hitP(this.dmg(18), { x: bx, y: by }); } }
      if (A.t >= A.dur) this.endAct();
      return;
    }
    if (T.pts) {
      for (k = 0; k < T.pts.length; k++) {
        var at = T.kind === 'roots' ? k * 0.12 : 0;
        if (A.t >= at && A.done.indexOf(k) < 0) {
          A.done.push(k); var pt = T.pts[k];
          if (!this.hitDone && U.dist(pt[0], pt[1], P.x, P.y) < T.r + P.r) { var r2 = this.hitP(this.dmg(T.kind === 'roots' ? 20 : 22), { x: pt[0], y: pt[1] }); if (r2) this.hitDone = true; }
          this.trapHit(pt[0], pt[1], T.r);
          if (MG.FX) MG.FX.burst(pt[0], pt[1], 6, T.kind === 'roots' ? ['#6e4220', '#8ad070', '#4a2a14'] : ['#ff7a8a', '#5e2a2a', '#e8c8a0'], 70);
          (A.spikes = A.spikes || []).push({ x: pt[0], y: pt[1], t: 0 });
        }
      }
      if (A.spikes) for (k = 0; k < A.spikes.length; k++) A.spikes[k].t += dt;
      if (A.t >= A.dur + 0.25) this.endAct();
      return;
    }
    if (T.kind === 'storm') {
      var waves = this.phase2 ? 3 : 1;
      while (A.waves < waves && A.t >= A.waves * 0.3) { this.fireStorm(T.n, A.waves * 0.2); A.waves++; }
      if (A.t >= A.dur) this.endAct();
      return;
    }
    if (A.second && A.t >= 0.3) { A.second = false; for (k = 0; k < 12; k++) MG.Shots.fire(this.x, this.y - 16, k / 12 * Math.PI * 2, 125, this.dmg(16), 'shard', 2.4); }
    if (T.kind === 'fan' && this.phase2 && A.shots < 2 && A.t >= 0.35) { A.shots++; this.fireFan(T.n); }
    if (A.t >= A.dur) this.endAct();
  };
  Boss.prototype.kAim = function () { var P = MG.Player, dx = P.x - this.x, dy = P.y - this.y, d = Math.sqrt(dx * dx + dy * dy) || 1; this.vx = dx / d * 400; this.vy = dy / d * 400; this.face = dx < 0 ? -1 : 1; };
  Boss.prototype.hitIn = function (x, y, r, dmg) { var P = MG.Player; if (U.dist(x, y, P.x, P.y) < r + P.r) this.hitP(this.dmg(dmg), { x: x, y: y }, { knock: 130 }); };
  Boss.prototype.endAct = function () {
    // v84 연계: 이 공격 다음에 곧바로 이어지는 공격(1단, 2페이즈 2단) · 백스텝 다음은 원거리 견제
    var k0 = this.atk && this.atk.kind, C0 = D.PATTERN.combo[this.baseId()] || {}, nx = k0 === 'backstep' ? D.PATTERN.ranged[this.baseId()] : C0[k0], depth = this.comboDepth || 0;
    if (nx && this.state === 'act' && (k0 === 'backstep' || depth < (this.phase2 ? 2 : 1))) { this.comboNext = nx; this.comboDepth = k0 === 'backstep' ? depth : depth + 1; } else { this.comboNext = null; this.comboDepth = 0; }
    this.atkEye = null;
    if (this.phase2 && this.state === 'act' && Math.random() < D.PHASE2.chain) this.chainNext = true; this.state = 'rec'; this.st = 0; this.z = 0; this.lastAtk = this.atk; this.lastTele = this.tele; this.tele = null; this.atk = null; };
  /* 지금 그릴 그림 이름: 예비 동작 → 타격 → 후딜(타격 자세를 잠깐 유지) → 숨쉬기 */
  Boss.prototype.pose = function () {
    var s = this.state;
    if (s === 'wind' && this.tele) return POSE[this.tele.kind][0];
    if (s === 'act' && this.atk) { var k = this.atk.kind; if (k === 'pounce') return this.atk.t < this.atk.leap.dur * 0.5 ? POSE[k][0] : POSE[k][1]; if (k === 'spin') return Math.floor(this.anim * 14) % 2 ? 'alt' : 'wind2'; return POSE[k][1]; }
    if (s === 'rec' && this.lastAtk && this.st < 0.28) return POSE[this.lastAtk.kind][1];
    if (s === 'roar') return this.def.humanoid ? 'wind3' : 'wind';
    if (s === 'flinch' || s === 'stun' || s === 'groggy') return 'idle1';
    return 'idle' + (Math.floor(this.anim * (s === 'chase' ? 3.5 : 2)) % 2);
  };

  /* ---------------------------------------------------------------- 그리기 */
  Boss.prototype.drawWarn = function (ctx, t) {
    var T = this.tele, A = this.atk || this.lastAtk, S = MG.Sprites, k;
    if (this.state === 'wind' && T) {
      var tw = T.wind - (T.delay || 0), q = U.clamp(this.st / tw, 0, 1); if (T.delay) q = this.st < tw ? q * 0.88 : (T.wind - this.st < 0.06 ? 1 : 0.88);   // v84 엇박자: 88% 에서 멈칫
      var crim = T.eye === 'crimson', base = crim ? 'rgba(150, 0, 40, ' + (0.16 + 0.16 * q).toFixed(2) + ')' : 'rgba(255, 50, 50, ' + (0.1 + 0.12 * q).toFixed(2) + ')', fill = crim ? 'rgba(200, 0, 50, 0.55)' : 'rgba(255, 80, 70, 0.45)';
      ctx.fillStyle = base; ctx.strokeStyle = crim ? 'rgba(255, 30, 70, 0.95)' : 'rgba(255, 216, 102, 0.9)'; ctx.lineWidth = crim ? 1.5 : 1;
      if (T.kind === 'slam' || T.kind === 'hammer' || T.kind === 'pounce') { circ(ctx, T.cx, T.cy, T.r, base); circ(ctx, T.cx, T.cy, T.r * q, fill); ring(ctx, T.cx, T.cy, T.r); if (T.shock) { ctx.strokeStyle = 'rgba(255, 120, 110, ' + (0.3 + 0.3 * q).toFixed(2) + ')'; ring(ctx, T.cx, T.cy, T.shock); } }
      else if (T.pts) for (k = 0; k < T.pts.length; k++) { circ(ctx, T.pts[k][0], T.pts[k][1], T.r, base); circ(ctx, T.pts[k][0], T.pts[k][1], T.r * q, fill); ring(ctx, T.pts[k][0], T.pts[k][1], T.r); }
      else if (T.kind === 'grab') { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(T.a); ctx.fillStyle = base; ctx.fillRect(0, -T.w / 2, T.len, T.w); ctx.fillStyle = fill; ctx.fillRect(0, -T.w / 2, T.len * q, T.w); ctx.restore(); }
      else if (T.kind === 'kdash') { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(Math.atan2(MG.Player.y - this.y, MG.Player.x - this.x)); ctx.fillStyle = base; ctx.fillRect(0, -T.w / 2, T.len, T.w); ctx.fillStyle = 'rgba(176, 144, 240, 0.5)'; ctx.fillRect(0, -T.w / 2, T.len * q, T.w); ctx.restore(); }
      else if (T.kind === 'kleap') { circ(ctx, T.cx, T.cy, T.r, base); circ(ctx, T.cx, T.cy, T.r * q, 'rgba(176, 144, 240, 0.45)'); ring(ctx, T.cx, T.cy, T.r); }
      else if (T.kind === 'kcleave') { cone(ctx, this.x, this.y, T.a, T.R, T.half, base); cone(ctx, this.x, this.y, T.a, T.R * q, T.half, fill); }
      else if (T.kind === 'kwave') { ctx.strokeStyle = 'rgba(176, 144, 240, ' + (0.3 + 0.5 * q).toFixed(2) + ')'; for (var kw = 0; kw < T.n; kw++) { var wa = T.a + (kw - (T.n - 1) / 2) * 0.24; ctx.beginPath(); ctx.moveTo(this.x, this.y - 10); ctx.lineTo(this.x + Math.cos(wa) * (24 + 90 * q), this.y - 10 + Math.sin(wa) * (24 + 90 * q)); ctx.stroke(); } }
      else if (T.kind === 'charge') { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(T.a); ctx.fillStyle = base; ctx.fillRect(0, -T.w / 2, T.len, T.w); ctx.fillStyle = fill; ctx.fillRect(0, -T.w / 2, T.len * q, T.w); ctx.restore(); }
      else if (T.kind === 'tentacle' || T.kind === 'lightning') { var ls = T.lines || [T.a]; for (k = 0; k < ls.length; k++) { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(ls[k]); ctx.fillStyle = base; ctx.fillRect(0, -T.w / 2, T.len, T.w); ctx.fillStyle = T.kind === 'lightning' ? 'rgba(200, 230, 255, 0.45)' : fill; ctx.fillRect(0, -T.w / 2, T.len * q, T.w); ctx.restore(); } }
      else if (T.kind === 'sweep' || T.kind === 'breath') { cone(ctx, this.x, this.y, T.a, T.R, T.half, base); cone(ctx, this.x, this.y, T.a, T.R * q, T.half, T.kind === 'breath' ? 'rgba(170, 230, 255, 0.45)' : fill); }
      else if (T.kind === 'quake' || T.kind === 'spin') { var RR = T.kind === 'spin' ? T.R : T.r; ring(ctx, this.x, this.y, RR); ring(ctx, this.x, this.y, RR * q); circ(ctx, this.x, this.y, RR, 'rgba(255, 50, 50, ' + (0.05 + 0.08 * q).toFixed(2) + ')'); }
      else if (T.kind === 'tail') { ctx.fillStyle = 'rgba(255, 50, 50, ' + (0.08 + 0.12 * q).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(this.x, this.y, T.R, 0, Math.PI * 2); ctx.arc(this.x, this.y, T.r0, 0, Math.PI * 2, true); ctx.fill(); ring(ctx, this.x, this.y, T.R); ring(ctx, this.x, this.y, T.r0 + (T.R - T.r0) * q); }
      else if (T.kind === 'shards' || T.kind === 'fan' || T.kind === 'storm' || T.kind === 'tornado') {
        ctx.strokeStyle = 'rgba(255, 90, 90, ' + (0.25 + 0.5 * q).toFixed(2) + ')';
        var n = T.kind === 'shards' ? 12 : T.kind === 'storm' ? T.n : T.n, radial = T.kind === 'shards' || T.kind === 'storm', a0 = Math.atan2(MG.Player.y - this.y, MG.Player.x - this.x), sp = T.kind === 'tornado' ? 0.5 : 0.26;
        for (var j = 0; j < n; j++) { var a = radial ? j / n * Math.PI * 2 : a0 + (j - (n - 1) / 2) * sp; ctx.beginPath(); ctx.moveTo(this.x + Math.cos(a) * 18, this.y - 12 + Math.sin(a) * 18); ctx.lineTo(this.x + Math.cos(a) * (18 + 70 * q), this.y - 12 + Math.sin(a) * (18 + 70 * q)); ctx.stroke(); }
      }
    }
    if (this.state === 'act' && this.atk && this.atk.ring) { ctx.strokeStyle = this.id === 'b2' ? 'rgba(200, 180, 255, 0.9)' : 'rgba(255, 220, 180, 0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(this.atk.cx, this.atk.cy, this.atk.R || 20, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 1; ctx.stroke(); }
    if (this.state === 'act' && this.atk && this.atk.beam) {   // 창백한 번개 브레스
      var al = 1 - this.atk.t / this.atk.dur, ang = this.atk.a, L = this.lastTele ? 240 : 240, sx = this.x + Math.cos(ang) * 14, sy = this.y - 24 + Math.sin(ang) * 14;
      ctx.globalAlpha = Math.max(0, al);
      for (var w = 3; w >= 1; w--) { ctx.strokeStyle = w === 3 ? 'rgba(154, 216, 255, 0.5)' : (w === 2 ? '#cfe8ff' : '#ffffff'); ctx.lineWidth = w * 3; ctx.beginPath(); ctx.moveTo(sx, sy); for (var s = 1; s <= 8; s++) ctx.lineTo(sx + Math.cos(ang) * L * s / 8 + Math.sin(t * 40 + s) * 4, sy + 24 * s / 8 + Math.sin(ang) * L * s / 8 + Math.cos(t * 37 + s) * 4); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    if (this.state === 'act' && this.atk && this.atk.breath && this.tele) {   // 냉기 폭풍 브레스: 입에서 뿜어지는 하얀 서리 원뿔
      var bt = this.tele, bq = this.atk.t / this.atk.dur, bR = bt.R * Math.min(1, 0.35 + bq * 1.4), bh = bt.half * Math.PI / 180, mx = this.x + Math.cos(bt.a) * 14, my = this.y - 18 + Math.sin(bt.a) * 8;
      var bg = ctx.createRadialGradient && ctx.createRadialGradient(mx, my, 4, mx, my, bR);
      if (bg && bg.addColorStop) { bg.addColorStop(0, 'rgba(255, 255, 255, 0.75)'); bg.addColorStop(0.5, 'rgba(190, 240, 255, 0.45)'); bg.addColorStop(1, 'rgba(140, 210, 240, 0)'); ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(mx, my); ctx.arc(mx, my, bR, bt.a - bh, bt.a + bh); ctx.closePath(); ctx.fill(); }
    }
    if (this.state === 'act' && this.atk && this.atk.arc && this.tele) { var ta = this.tele; ctx.strokeStyle = 'rgba(255, 240, 200, ' + (0.8 * (1 - this.atk.t / this.atk.dur)).toFixed(2) + ')'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(this.x, this.y - 8, ta.R * 0.8, ta.a - ta.half * Math.PI / 180, ta.a + ta.half * Math.PI / 180); ctx.stroke(); }
    if (A && A.spikes) for (var si = 0; si < A.spikes.length; si++) { var sp2 = A.spikes[si]; if (sp2.t > 0.5) continue; if (S && S.ready('forge')) S.draw(ctx, 'forge', 'root_spike_' + Math.min(2, Math.floor(sp2.t / 0.08)), sp2.x, sp2.y + 2, si % 2 === 1, A.kind === 'field' ? 0.8 : 0.7, A.kind === 'field' ? (MG.Tint.get('forge', 'thornspike', 'hue-rotate(-40deg) saturate(1.8)') || undefined) : undefined); }
  };
  /* v83 2페이즈 오라(불꽃 · 번개 · 냉기 · 심연): back = 몸 뒤의 빛무리, 앞 = 몸을 타고 오르는 불티 */
  Boss.prototype.drawAura = function (ctx, t, front) {
    var k = this.auraKind(), c = { fire: [255, 110, 50], storm: [140, 210, 255], frost: [220, 250, 255], abyss: [170, 120, 255] }[k], h = (this.def.humanoid ? 46 : 60) * (this.def.scale || 1), pu = 0.5 + 0.5 * Math.sin(t * 6), x = this.x, y = this.y - this.z;
    if (!front) { var g = ctx.createRadialGradient && ctx.createRadialGradient(x, y - h * 0.45, 4, x, y - h * 0.45, h * 0.8); if (g && g.addColorStop) { g.addColorStop(0, 'rgba(' + c.join(', ') + ', ' + (0.26 + 0.12 * pu).toFixed(2) + ')'); g.addColorStop(1, 'rgba(' + c.join(', ') + ', 0)'); ctx.fillStyle = g; ctx.fillRect(x - h, y - h * 1.3, h * 2, h * 1.6); } return; }
    if (MG.FX && Math.random() < 0.6) { var px = x + (Math.random() - 0.5) * this.r * 2.2, py = y - Math.random() * h; if (k === 'fire') MG.FX.ember(px, py); else if (k === 'storm') { if (Math.random() < 0.25) MG.FX.spark(px, py, 1); } else MG.FX.burst(px, py, 1, k === 'frost' ? ['#ffffff', '#bff6ff'] : ['#b090f0', '#1a0a2a'], 18, { g: k === 'frost' ? 20 : -30 }); }
    ctx.strokeStyle = 'rgba(' + c.join(', ') + ', ' + (0.35 + 0.3 * pu).toFixed(2) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, this.y + 1, this.r + 10 + pu * 2, 5 + pu, 0, 0, Math.PI * 2); ctx.stroke();
  };
  /* v84 안광: ⚡ 황금(상쇄 가능 — 맞받아쳐라) / 🩸 진홍(가드 · 상쇄 불능 — 굴러라). 엇박자로 멈칫하는 동안은 더 강하게 번뜩인다 */
  Boss.prototype.drawEye = function (ctx, t, eye, hold) {
    var d = this.def, crim = eye === 'crimson', col = crim ? [255, 30, 60] : [255, 216, 102], hy = this.y - this.z - (d.humanoid ? 46 : Math.max(28, d.part.y * 0.82)) * (d.scale || 1), hx = this.x + (this.face || 1) * (d.humanoid ? 2 : 5), pu = 0.6 + 0.4 * Math.sin(t * (hold ? 40 : 18)), r = (crim ? 24 : 18) * (hold ? 1.4 : 1);
    var g = ctx.createRadialGradient && ctx.createRadialGradient(hx, hy, 1, hx, hy, r); if (g && g.addColorStop) { g.addColorStop(0, 'rgba(' + col.join(', ') + ', ' + (0.75 * pu).toFixed(2) + ')'); g.addColorStop(1, 'rgba(' + col.join(', ') + ', 0)'); ctx.fillStyle = g; ctx.fillRect(hx - r, hy - r, r * 2, r * 2); }
    ctx.fillStyle = crim ? '#ffdde0' : '#fffbe0'; ctx.fillRect(Math.round(hx - 4), Math.round(hy) - 1, 3, 2); ctx.fillRect(Math.round(hx + 2), Math.round(hy) - 1, 3, 2);
    ctx.strokeStyle = 'rgba(' + col.join(', ') + ', ' + (0.8 * pu).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - 14 * pu, hy); ctx.lineTo(hx + 14 * pu, hy); if (crim) { ctx.moveTo(hx, hy - 9 * pu); ctx.lineTo(hx, hy + 9 * pu); } ctx.stroke(); ctx.lineWidth = 1;
  };
  function circ(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill(); }
  function ring(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.stroke(); }
  function cone(ctx, x, y, a, R, half, col) { var h = half * Math.PI / 180; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, Math.max(0, R), a - h, a + h); ctx.closePath(); ctx.fill(); }

  Boss.prototype.draw = function (ctx, t) {
    var S = MG.Sprites, d = this.def, sc = d.scale;
    if (this.state === 'dead' && this.deadT > 1.4) return;
    ctx.globalAlpha = this.state === 'dead' ? Math.max(0, 1 - this.deadT / 1.4) : 1;
    var shR = this.r + 6 - this.z * 0.15;
    if (MG.World.groundShadow) MG.World.groundShadow(ctx, this.x, this.y + 1, Math.max(6, shR), 6, 0.36); else { ctx.fillStyle = 'rgba(0, 0, 0, 0.32)'; ctx.beginPath(); ctx.ellipse(Math.round(this.x), Math.round(this.y + 1), Math.max(6, shR), 6, 0, 0, Math.PI * 2); ctx.fill(); }
    if (this.phase2 && this.alive) this.drawAura(ctx, t, false);
    var nm = d.sprite + '_' + this.pose() + (this.partBroken ? '_x' : '');
    if (this.V && S && S.item('bs', d.sprite + '_v_' + this.pose() + (this.partBroken ? '_x' : ''))) nm = d.sprite + '_v_' + this.pose() + (this.partBroken ? '_x' : '');   // v84 아종: 뿔 · 결정 군락 · 화염 갈기 · 균열이 실제로 그려진 고유 프레임
    var jx = this.state === 'wind' ? Math.round(Math.sin(t * 50)) : 0, flip = this.face < 0, tilt = this.state === 'groggy' ? Math.sin(t * 3) * 0.12 : 0;
    if (S && S.ready('bs') && S.item('bs', nm)) {
      ctx.save(); ctx.translate(Math.round(this.x + jx), Math.round(this.y - this.z)); ctx.rotate(tilt);
      if (d.abyss) { var ag = 0.5 + 0.5 * Math.sin(t * 3); ctx.fillStyle = 'rgba(140, 80, 255, ' + (0.18 + 0.12 * ag).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(0, -20, 34, 30, 0, 0, Math.PI * 2); ctx.fill(); }
      var vsrc = null;
      if (this.V) {   // v82 아종: 색조가 변이된 시트 + 속성 빛무리
        vsrc = null;   // v84: 색 필터 금지
        var vg = 0.5 + 0.5 * Math.sin(t * 4), vc = this.V.color.replace('#', ''), vr = parseInt(vc.slice(0, 2), 16), vgg = parseInt(vc.slice(2, 4), 16), vb = parseInt(vc.slice(4, 6), 16);
        ctx.fillStyle = 'rgba(' + vr + ', ' + vgg + ', ' + vb + ', ' + (0.12 + 0.1 * vg).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(0, -22, 36, 32, 0, 0, Math.PI * 2); ctx.fill();
        if (MG.FX && Math.random() < 0.12) MG.FX.burst(this.x + (Math.random() - 0.5) * 30, this.y - 10 - Math.random() * 40, 1, [this.V.color, '#ffffff'], 20, { g: -20 });
      }
      S.draw(ctx, 'bs', nm, 0, 0, flip, sc, vsrc || undefined);
      var tint = this.flash > 0 ? '#ffffff' : (this.state === 'wind' && Math.floor(t * 12) % 2 === 0 ? (this.tele && this.tele.eye === 'crimson' ? '#ff1040' : '#ffd040') : (this.slowT > 0 ? '#bff6ff' : null));
      if (tint) { var sil = S.tinted('bs', tint); if (sil) { ctx.globalAlpha *= this.flash > 0 ? 0.55 : 0.4; S.draw(ctx, 'bs', nm, 0, 0, flip, sc, sil); } }
      ctx.restore();
    } else { ctx.fillStyle = this.flash > 0 ? '#fff' : d.color; ctx.fillRect(Math.round(this.x - 20), Math.round(this.y - 44 - this.z), 40, 44); }
    ctx.globalAlpha = 1;
    if (this.phase2 && this.alive) this.drawAura(ctx, t, true);
    if (!this.alive) return;
    // 부위(파괴 가능) 표시: 금빛 마름모 — 모아베기 · 특수기 · 마법으로 노려라
    var px = this.x + (flip ? -1 : 1) * (d.id === 'b4' ? 22 : d.id === 'b5' ? 4 : 0), py = this.y - this.z - d.part.y;
    if (!this.partBroken && this.engaged) { var pz = 0.5 + 0.5 * Math.sin(t * 6); ctx.fillStyle = 'rgba(255, 216, 102, ' + (0.45 + 0.4 * pz).toFixed(2) + ')'; ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px + 3, py); ctx.lineTo(px, py + 4); ctx.lineTo(px - 3, py); ctx.closePath(); ctx.fill(); }
    if (this.state === 'groggy' || this.state === 'stun') { ctx.fillStyle = '#ffe066'; for (var k = 0; k < 4; k++) { var a = t * 5 + k * 1.57; ctx.fillRect(Math.round(this.x + Math.cos(a) * 16), Math.round(this.y - 70 + Math.sin(a) * 3), 3, 3); } }
    if (this.state === 'wind' && this.tele) this.drawEye(ctx, t, this.tele.eye, this.tele.delay && this.st >= this.tele.wind - this.tele.delay);   // v84 안광은 몸 위에(⚡ 황금 · 🩸 진홍)
  };

  var Bosses = MG.Bosses = {
    list: [], extra: [], arena: null, arenaBoss: null, arenaDone: false, labyBoss: null, invader: null, Boss: Boss,
    init: function () { this.list = D.BOSSES.map(function (b) { return new Boss(b); }); this.extra = [new Boss(D.KING)]; this.arena = null; this.arenaBoss = null; this.arenaDone = false; this.labyBoss = null; this.invader = null; },
    byId: function (id) { var a = this.all(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; },
    all: function () { var a = this.list.concat(this.extra || []); if (this.arenaBoss) a.push(this.arenaBoss); if (this.labyBoss) a.push(this.labyBoss); if (this.invader) a.push(this.invader); return a; },
    /* 지금 맵에 있는 보스들 */
    here: function () { var id = MG.World.id, out = [], a = this.all(); for (var i = 0; i < a.length; i++) if (a[i].def.map === id) out.push(a[i]); return out; },
    /* 화톳불 휴식: 토벌한 보스만 다시(재수렵). 살아서 싸우던 보스는 그대로 — 초기화는 오직 사망 때 */
    respawn: function () { var a = this.list.concat(this.extra || []); for (var i = 0; i < a.length; i++) if (!a[i].alive) a[i].reset(); },
    /* 보스 바: 지금 맵에서 싸우고 있는 살아 있는 보스 */
    active: function () { var h = this.here(), P = MG.Player; for (var i = 0; i < h.length; i++) { var b = h[i]; if (b.engaged && b.alive && (!P || U.dist(P.x, P.y, b.def.home[0], b.def.home[1]) < b.def.arena * 2.2)) return b; } return null; },
    /* ---------------------------------------------------------------- v85 《몬스터 헌터》식 수렵 기록
       보스가 사는 방(던전 보스 방 · 왕의 무덤 · 투기장 라운드)에 들어선 순간부터 시계가 돈다 — 토벌하면 시간(초)과 피격 횟수로 👑S / A / B */
    hunt: null, lastHunt: null,
    huntTick: function (h, dt) {
      var b = null; for (var i = 0; i < h.length; i++) if (h[i].alive && !h[i].def.invader) { b = h[i]; break; }
      if (!b) return;
      if (!this.hunt || this.hunt.id !== b.id || this.hunt.boss !== b) this.hunt = { id: b.id, boss: b, t: 0, hits: 0 };
      this.hunt.t += dt;
    },
    noteHit: function () { var h = this.hunt; if (h && h.boss && h.boss.alive && h.boss.def.map === MG.World.id) h.hits++; },
    rank: function (base, t, hits) { var H = D.HUNT, par = H.par[base] || 90; return t <= par * H.S.t && hits <= H.S.hits ? 'S' : (t <= par * H.A.t && hits <= H.A.hits ? 'A' : 'B'); },
    finishHunt: function (b) {
      var h = this.hunt; if (!h || h.boss !== b) return null;
      var base = b.baseId(), t = Math.max(0.1, +h.t.toFixed(1)), r = { id: b.id, base: base, t: t, hits: h.hits, rank: this.rank(base, t, h.hits) };
      this.hunt = null; this.lastHunt = r;
      if (!b.def.rush && D.HUNT.par[base]) {   // 보스 러시 라운드는 러시 기록으로만(필드 수렵 기록과 섞지 않는다)
        var S = MG.S, H = S.hunts = S.hunts || {}, o = H[base] || {}, RK = { S: 3, A: 2, B: 1 };
        if (!o.best || t < o.best) { o.best = t; o.hits = r.hits; }
        if (!o.rank || RK[r.rank] > RK[o.rank]) o.rank = r.rank;
        o.n = (o.n || 0) + 1; H[base] = o;
      }
      MG.emit('huntDone', r);
      return r;
    },
    update: function (dt) {
      var h = this.here(); this.huntTick(h, dt); for (var i = 0; i < h.length; i++) h[i].update(dt);
      if (this.arena && MG.World.id === 'abyss') this.updateArena(dt);
    },
    collect: function (list, cam) { var h = this.here(); for (var i = 0; i < h.length; i++) { var b = h[i]; if (b.state === 'dead' && b.deadT > 1.4) continue; if (b.x < cam.x - 80 || b.x > cam.x + MG.VW + 80 || b.y < cam.y - 20 || b.y > cam.y + MG.VH + 120) continue; list.push({ y: b.y, o: b, f: function (ctx, o, t) { o.draw(ctx, t); } }); } },
    drawWarn: function (ctx, t) { var h = this.here(); for (var i = 0; i < h.length; i++) h[i].drawWarn(ctx, t); },

    /* ---------------------------------------------------------------- ⚔️ 심연의 투기장: 강화된 5대 보스 연속 수렵 */
    /* v84 「⚔️ 심연의 투기장 : 무회복 보스 러시」 — 8라운드. 라운드 사이에 체력 · 에스트 회복 없음(사냥꾼의 상태를 건드리지 않는다).
       R1~R5 다섯 보스(수치 그대로) → R6 광포한 파멸수 라가르 → R7 변이 아종(도전마다 바뀐다) → R8 심연의 기사왕. 쓰러뜨리면 5초 뒤 다음 보스. */
    startArena: function () { this.arena = { idx: 0, waitT: 1.5, paid: false, t: 0 }; this.arenaBoss = null; this.arenaDone = false; MG.S.rushRuns = (MG.S.rushRuns || 0) + 1; },
    rushVariant: function () { return D.BOSSES[(MG.S.rushRuns || 1) % D.BOSSES.length].id; },
    arenaDef: function (i) {
      var vid = this.rushVariant(), src = i < 5 ? D.BOSSES[i] : (i === 5 ? D.RAGAR : (i === 6 ? D.BOSSES.filter(function (b) { return b.id === vid; })[0] : D.KING)), o = {};
      for (var k in src) o[k] = src[k];
      o.base = src.id; o.id = 'r' + (i + 1) + '_' + src.id; o.map = 'abyss'; o.home = [210, 200]; o.arena = 200; o.rush = true; o.abyss = true; o.round = i + 1; o.invader = false;   // abyss = 토벌 기록에 넣지 않는다
      if (i === 6) o.forceVariant = true;
      o.name = 'R' + (i + 1) + ' · ' + (i === 6 ? D.VARIANTS[src.id].name : src.name);
      return o;
    },
    updateArena: function (dt) {
      var A = this.arena, cur = this.arenaBoss, RU = D.RUSH, S = MG.S;
      if (this.arenaDone) return;
      A.t = (A.t || 0) + dt;   // v85 8라운드 전체 시간(보스 사이 5초 포함)
      if (cur && cur.alive) return;
      if (cur && !cur.alive) {
        if (!A.paid) {   // 라운드 돌파 보너스(골드 · 심연의 정수) — 체력은 그대로
          A.paid = true; S.rushBest = Math.max(S.rushBest || 0, A.idx + 1);
          if (MG.Loot) { for (var gi = 0; gi < A.idx + 2; gi++) MG.Loot.drop(cur.x, cur.y - 8, 'gold', null, RU.bonusGold, { fountain: true }); if (RU.bonusAbyss[A.idx]) MG.Loot.drop(cur.x, cur.y - 8, 'mat', 'abyss', RU.bonusAbyss[A.idx], { boss: true, fountain: true }); }
          var lh = this.lastHunt && this.lastHunt.id === cur.id ? this.lastHunt : null, tag = lh ? ' [' + lh.t.toFixed(1) + '초 · ' + (lh.rank === 'S' ? '👑S' : lh.rank) + '랭크]' : '';   // v85 라운드 수렵 시간 · 랭크
          if (MG.UI && A.idx + 1 < RU.rounds) MG.UI.ribbon('🏆 R' + (A.idx + 1) + '/' + RU.rounds + ' 돌파' + tag + ' — 5초 뒤 다음 보스(회복 없음)', 2400);
          if (MG.Save) MG.Save.save();
        }
        if (cur.deadT < RU.gap) return;
        this.arenaBoss = null; A.idx++; A.paid = false; A.waitT = 0;
        if (A.idx >= RU.rounds) { this.arenaDone = true; S.arenaClears = (S.arenaClears || 0) + 1; var rt = +(A.t || 0).toFixed(1), nb = !S.rushBestT || rt < S.rushBestT; if (nb) S.rushBestT = rt; if (MG.UI) MG.UI.ribbon('👑 무회복 보스 러시 8라운드 제패! [' + rt.toFixed(1) + '초' + (nb ? ' · 최단 기록' : '') + '] — 귀환 제단이 열렸다', 2800); if (MG.Save) MG.Save.save(); return; }
      }
      A.waitT -= dt;
      if (A.waitT <= 0 && !this.arenaBoss) { var b = new Boss(this.arenaDef(A.idx)); b.engage(); this.arenaBoss = b; if (MG.UI) MG.UI.ribbon('⚔️ ' + b.def.name + ' (' + (A.idx + 1) + '/' + RU.rounds + ')', 2000); if (MG.FX) { MG.FX.flash('#8a5aff', 0.12); MG.FX.ring(b.x, b.y - 20, 4, 60, 0.6, '#c4a8ff', 3); } }
    }
  };
})(window);
