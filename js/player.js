/* ==========================================================================
   player.js — 방랑 기사: HP/MP/SP · 3단 콤보(우베기 → 좌베기 → 전진 회전베기) · 계열별 홀드 액션 · 구르기(무적 시간) ·
               저스트 회피(공격 판정 직전에 구르면 푸른 잔상 + 슬로모션 0.22초 + SP/MP 회복 + 다음 한 방 확정 치명타) ·
               비전 마법 시전 · 에스트 마시기 · 록온(180px 안의 가장 가까운 적) · 피격/사망
   상태(state): idle · atk · charge · catk · bash · iai · guillo · roll · cast · drink · hurt · gather · dead
   손맛(v79~): 공격은 누르는 순간(0프레임) 1타. 계속 누르면 1타 직후 홀드 액션으로 이어진다.
               구르기는 SP 가 조금이라도 있으면 어떤 동작이든 즉시 캔슬하고 같은 프레임에 나간다(끝나기 0.18초 전부터 선입력 버퍼).
               이동 방향(moveDir = 걷기)과 조준(aim = 180px 안의 가장 가까운 적)은 따로 — 후퇴하며 눌러도 적을 향해 벤다.
   v80: 평타/홀드 공격은 모두 근접 판정뿐 — 앞으로 날아가는 발사체는 없다(원거리는 오직 ✨ 마법 버튼).
        구르기는 공이 아니라 몸을 낮춰 돌진하는 기사 대시 포즈(갑옷 · 망토 · 등의 무기 그대로) + 청록/은빛 기사 실루엣 잔상 3겹.
   계열별 홀드 액션(버튼/게이지 추가 없이 검신 · 방패의 빛으로만 알려 준다):
     방랑자의 장검  기본 모아베기(금빛)
     한손검        방패를 앞세운 가드(정면 피해를 막는다) → 떼면 실드 배쉬(강한 경직 + 부위 파괴)
     대검          백(1단) → 금(2단) → 진홍 섬광(3단). 3단에 떼면 진 모아베기(×3.5 · 부위 ×3 · 대지 균열). 너무 오래 쥐면 2단으로 떨어진다
     태도          평타 적중마다 칼날이 백 → 금 → 붉은 오라로 달아오른다. 달아오른 채 홀드 → 무적으로 적을 관통해 스쳐 지나간 뒤
                   0.25초 후 다단히트 참격 폭풍(발도 기인 일섬)
     비전 마검      적중마다 MP +3(v82). 홀드 → MP 35 이상이면 MP 를 폭발시켜 표적 머리 위에 거대한 마법 대검 기둥(비전 단두대 · 재충전 4초)
   v85: ★천상제일검은 일반 베기 · 홀드(천상용격)의 판정과 이펙트가 D.CELESTIAL 하나를 함께 읽는다(meleeShape · dragonStrike) —
        그려진 황금 용린 아크(반경 98 · 156°)와 황금 용 기둥 캡슐(전방 105 + 폭발 반경 30 = 135) 안에 걸친 적은 모두 맞는다.
        참격 궤적은 계열마다 다르고(FX.trail) 판정 중심(발밑) · 반경 · 부채꼴 그대로 그린다.
   v82: 마법마다 재사용 대기시간(cds) · 건곤대나이는 현재 HP 12% + 0.35초 후딜 · 방패를 막 올린 순간(0.22초)의 보스/정예 타격 = ⚔️ 상쇄 ·
        저스트 회피 · 상쇄 직후 첫 타는 신화 무기 「격」 확정 · 사신수의 가호(청룡 이동/뇌전 · 현무 반사 · 주작 재탄생) · 사냥꾼의 영약(elixirT)
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data, C = D.PLAYER;
  var DEG = Math.PI / 180;
  var VIEW_ROW = { down: 0, up: 1, right: 2, left: 3 };
  var ARC = { right: [-100, 95], left: [280, 85], down: [185, -5], up: [5, -185] };   // 우베기(1타) 궤적. 2타는 반대로
  var GS_COL = ['#ffffff', '#ffd866', '#ff2a4a'], KI_COL = ['#f4f8ff', '#ffd866', '#ff4a3a'];
  var ELEM_COL = { frost: 'rgba(191, 246, 255, ', storm: 'rgba(154, 216, 255, ', fire: 'rgba(255, 178, 56, ' };

  var P = {
    x: 0, y: 0, fx: 0, fy: 1, dir: 'down', r: 6,
    get attacking() { return this.state === 'atk' || this.state === 'catk' || this.state === 'bash' || this.state === 'iai' || this.state === 'guillo'; },
    get rolling() { return this.state === 'roll'; },
    init: function () {
      this.refreshStats(true);
      this.hp = this.maxHp; this.mp = this.maxMp; this.sp = this.maxSp; this.estus = MG.S.estusMax;
      this.state = 'idle'; this.st = 0; this.combo = 0; this.queued = false; this.comboT = 0; this.hitSet = []; this.chargeT = 0; this.spDelay = 0;
      this.invT = 0; this.critBuff = 0; this.justUsed = false; this.animT = 0; this.moving = false; this.hurtFlash = 0; this.healGlow = 0;
      this.pendingAct = false; this.actT = 0; this.drank = false; this.castDone = false; this.side = 1; this.lastJust = -9; this.vx = 0; this.vy = 0;
      this.ki = 0; this.kiT = 9; this.slowT = 0; this.storm = null; this.gsStageSeen = 0; this.rdx = 0; this.rdy = 1;
      this.resetCooldowns(); this.riposteT = 0; this.gyeokReady = false; this.elixirT = 0; this.parryT = 0; this.wardT = 0; this.whetT = 0; this.arcT = 0;
    },
    /* v82 마법별 재사용 대기시간(초) · 비전 단두대 내부 재충전 — 새 게임 · 사망 · 화톳불 휴식이면 모두 0 */
    resetCooldowns: function () { this.cds = {}; this.guilloCd = 0; },
    cooldown: function (id) { return Math.max(0, (this.cds && this.cds[id]) || 0); },
    /* 최대 HP/MP/SP = 기본 + 갑주 + 고대 성소(영구) — 레벨업은 없다 */
    refreshStats: function (fresh) {
      var S = MG.S, a = MG.Combat.armor(), b = S.bonus || {};
      var mh = C.HP + Math.round(a.def.hp * (a.master ? 1.1 : 1)) + (b.hp || 0) * C.SHRINE.hp, mm = C.MP + (b.mp || 0) * C.SHRINE.mp, ms = C.SP + (b.sp || 0) * C.SHRINE.sp;
      if (!fresh && this.maxHp) { this.hp = Math.min(mh, this.hp + Math.max(0, mh - this.maxHp)); this.mp = Math.min(mm, this.mp); this.sp = Math.min(ms, this.sp); }
      this.maxHp = mh; this.maxMp = mm; this.maxSp = ms;
    },
    place: function (x, y) { this.x = x; this.y = y; this.state = 'idle'; this.st = 0; this.storm = null; },
    alive: function () { return this.state !== 'dead'; },
    weapon: function () { return MG.Combat.weapon(); },
    mode: function () { return MG.Combat.mode(); },
    spdMul: function () { return (this.weapon().def.spd || 1) * (1 + MG.Combat.buffMul('spd')); },   // v84 NPC 버프
    /* v83 장착 무기의 실물 외형: 계열(한손검+방패 · 두껍고 거대한 대검 · 길고 휜 태도 · 룬이 빛나는 마검 · 고대 병기) × 티어(1~3 · 진화)
       len/wid = 손에 든 칼의 길이/폭 배율 · aura = 검신을 따라 번지는 빛 · fx = 칼끝에서 흩날리는 입자 · light = 둘레를 비추는 검신 발광 */
    /* v84 갑주 6종 외형: 갑주마다 투구 · 견갑 · 갑옷 · 망토가 완전히 다른 시트(같은 뼈대 · 같은 메타) */
    OUTFIT: { coat: 'coat', moss_mail: 'moss', crystal_mail: 'crystal', thorn_mail: 'thorn', frost_mail: 'frost', astral_mail: 'astral' },
    outfit: function () { return this.OUTFIT[(MG.S && MG.S.armor) || 'coat'] || 'coat'; },
    sheet: function () { var o = this.outfit(), n = o === 'coat' ? 'knight' : 'knight_' + o, S = MG.Sprites; return n === 'knight' || (S && S.ready(n)) ? n : 'knight'; },
    weaponStyle: function () {
      var W = this.weapon(), d = W.def, line = d.basic ? 'basic' : d.line, tier = d.tier || 0;
      var base = { basic: [1, 1], one: [1.0, 1.0], great: [1.32, 1.45], tachi: [1.38, 0.82], arcane: [1.12, 1.0], ultimate: [1.36, 1.3] }[line] || [1, 1];
      var grow = 1 + Math.max(0, tier - 1) * 0.06, el = d.elem, col = null, fx = null;
      if (line === 'arcane') col = tier >= 3 ? '#4deeea' : '#b090f0';
      if (line === 'ultimate') col = '#ffd866';
      if (el) col = col || (el === 'frost' ? '#bff6ff' : el === 'storm' ? '#9ad8ff' : '#ffb238');
      if (tier >= 3) fx = line === 'ultimate' ? 'gold' : el || 'star'; else if (tier === 2 && (line === 'arcane' || el)) fx = 'rune';
      return { id: W.id, line: line, tier: tier, len: +(base[0] * grow).toFixed(3), wid: +(base[1] * (tier >= 3 ? 1.08 : 1)).toFixed(3), curve: line === 'tachi', shield: line === 'one', aura: col && (tier >= 2 || line === 'arcane' || line === 'ultimate') ? col : null, fx: fx, light: col ? { col: col, r: 18 + tier * 8 + (W.master ? 6 : 0) } : null };
    },
    /* v85 근접 판정 모양(판정 · 궤적 공용): range = 반경(발밑 기준) · arc = 부채꼴 반각(도) · spin = 360° · exact = 몸통이 부채꼴 가장자리에 걸쳐도 맞는다 */
    meleeShape: function (stage) {
      var W = this.weapon().def, spin = stage === 2;
      if (W.ultimate) { var CE = D.CELESTIAL; return { range: CE.R, arc: CE.ARC, spin: spin, exact: true }; }
      return { range: C.REACH + (W.reach || 0) + (spin ? (W.line === 'tachi' ? 10 : 5) : 0), arc: W.wide ? 78 : C.ARC, spin: spin };
    },
    chargeShape: function () { var W = this.weapon().def; return { range: C.REACH + 8 + (W.reach || 0) + (this.cStage === 3 ? 8 : 0), arc: 85, exact: !!W.ultimate }; },
    /* v85 참격 궤적(판정 중심 = 발밑 · 같은 반경/부채꼴) */
    spawnTrail: function (sh, hold, heavy) {
      if (!MG.FX || !MG.FX.trail) return null;
      var st = this.weaponStyle();
      return MG.FX.trail({ kind: st.line, x: this.x, y: this.y, a: Math.atan2(this.fy, this.fx), arc: sh.arc * DEG, r: sh.range, spin: !!sh.spin, side: this.side || 1, hold: hold, heavy: !!heavy, follow: this });
    },
    canAct: function () { return this.state === 'idle'; },
    face: function (x, y) { var l = Math.sqrt(x * x + y * y); if (l < 0.01) return; this.fx = x / l; this.fy = y / l; this.dir = U.dir4(this.fx, this.fy); },
    /* 조준: 180px 안의 표적이 있으면 이동 방향과 상관없이 그쪽을 본다(공격/마법 시작 순간에 고정) */
    autoAim: function () { var t = this.findLock(); if (t) this.face(t.x - this.x, t.y - this.y); else if (MG.Input.axis.x || MG.Input.axis.y) this.face(MG.Input.axis.x, MG.Input.axis.y); this.aim = t || null; return t; },
    findLock: function () { return MG.Combat.nearest(this.x, this.y, C.LOCK_RANGE); },
    useSp: function (n) { if (this.sp <= 0) return false; this.sp = Math.max(0, this.sp - n); this.spDelay = C.SP_DELAY; return true; },
    heal: function (n, quiet) { var b = this.hp; this.hp = Math.min(this.maxHp, this.hp + n); if (!quiet && MG.FX) MG.FX.text(this.x, this.y - 30, '+' + Math.round(this.hp - b), '#7dff9a', 0.8, 12); this.healGlow = 0.5; return this.hp - b; },
    /* 태도의 검신 연마: 적중마다 +, 잠시 안 맞히면 식는다. 단계 0(평범) · 1(백) · 2(금) · 3(붉은 오라) */
    addKi: function () { var b = this.kiLevel(); this.ki = Math.min(100, this.ki + C.KI_HIT); this.kiT = 0; var a = this.kiLevel(); if (a > b && MG.FX) MG.FX.ring(this.x, this.y - 12, 3, 16, 0.3, KI_COL[a - 1], 2); },
    kiLevel: function () { return this.ki >= C.KI_LV[2] ? 3 : this.ki >= C.KI_LV[1] ? 2 : this.ki >= C.KI_LV[0] ? 1 : 0; },
    gsStage: function () { return this.chargeT >= C.GS_STAGE[2] ? 3 : this.chargeT >= C.GS_STAGE[1] ? 2 : this.chargeT >= C.GS_STAGE[0] ? 1 : 0; },

    /* ---------------------------------------------------------------- 매 프레임 */
    update: function (dt, realDt) {
      var I = MG.Input, b = I.b, spd = this.spdMul();
      if (!(dt >= 0) || !isFinite(dt)) dt = 0;
      this.watchdog(realDt === undefined ? dt : realDt);
      this.lock = this.alive() ? this.findLock() : null;   // 발밑 록온 링(그리기용)
      this.animT += dt; this.invT = Math.max(0, this.invT - dt); this.critBuff = Math.max(0, this.critBuff - dt); this.hurtFlash = Math.max(0, this.hurtFlash - dt); this.healGlow = Math.max(0, this.healGlow - dt);
      this.comboT = Math.max(0, this.comboT - dt); this.slowT = Math.max(0, (this.slowT || 0) - dt);
      for (var cid in this.cds) this.cds[cid] = Math.max(0, this.cds[cid] - dt);
      this.guilloCd = Math.max(0, (this.guilloCd || 0) - dt); this.riposteT = Math.max(0, (this.riposteT || 0) - dt); this.wardT = Math.max(0, (this.wardT || 0) - dt); this.whetT = Math.max(0, (this.whetT || 0) - dt); this.arcT = Math.max(0, (this.arcT || 0) - dt); this.phT = Math.max(0, (this.phT || 0) - dt);
      this.fxT = (this.fxT || 0) + dt; if (this.fxT > 0.16 && this.alive()) { this.fxT = 0; this.bladeFx(); }
      /* v83 장착 무기의 입자(티어 · 계열) — 난수 없이 일정 간격 · v84: 주석에 묻혀 있던 영약 · 상쇄 타이머 감소를 되살림 */
      this.elixirT = Math.max(0, (this.elixirT || 0) - dt); this.parryT = Math.max(0, (this.parryT || 0) - dt);
      this.kiT += dt; if (this.kiT > C.KI_HOLD) this.ki = Math.max(0, this.ki - C.KI_DECAY * dt);
      if (this.storm) this.updateStorm(dt);
      if (this.state === 'dead') { this.st += dt; if (this.st > 2.2 && MG.Game) MG.Game.respawn(); return; }
      // 자연 회복: 기력은 행동을 멈춘 뒤 잠깐 쉬었다가, 마력은 늘 천천히
      var busy = this.attacking || this.state === 'roll' || this.state === 'charge';
      var regen = C.SP_REGEN * (MG.Combat.hasRune('wind') ? 1.35 : 1) * (1 + (MG.Combat.armor().def.regen || 0)) * (this.elixirT > 0 ? 1 + D.NPC_CFG.ELIXIR.sp : 1) * (1 + MG.Combat.buffMul('sp'));
      if (this.spDelay > 0) this.spDelay -= dt; else if (!busy) this.sp = Math.min(this.maxSp, this.sp + regen * dt);
      // v82 비전 샘의 각인: 가만히 서 있을 때만 +1.5/s (예전의 ×2 대신 — 저스트 회피 · 상쇄 · 3타 막타로 근접 공방에서 채운다)
      var still = MG.Combat.hasRune('mana') && this.state === 'idle' && !this.moving ? C.MANA_STILL : 0;
      this.mp = Math.min(this.maxMp, this.mp + (C.MP_REGEN + still) * dt);

      var ax = I.axis.x, ay = I.axis.y, moveMul = 0;
      this.st += dt;
      // 구르기: 어떤 동작이든 SP 만 있으면 즉시 캔슬하고 같은 프레임에 구른다 · 끝나기 0.18초 전부터는 선입력 버퍼
      if (b.roll.pressed) {
        if (this.state === 'roll') { if (this.st >= C.ROLL_DUR - C.ROLL_BUFFER) this.rollBuf = true; }
        else this.startRoll();
      }
      switch (this.state) {
        case 'idle':
          if (b.estus.pressed) { this.startDrink(); break; }
          if (b.magic.pressed) { this.startCast(); break; }
          if (b.act.pressed) {
            var ctx = MG.Game && MG.Game.ctx;
            if (ctx && !(MG.Input.padAttackOnly && MG.Input.padAttackOnly())) { this.pendingAct = false; MG.Game.interact(ctx); break; }   // v86 패드 X 는 언제나 공격(상호작용은 A)   // 스마트 원버튼: 상호작용 대상 앞이면 공격 대신 그 일
            this.pendingAct = false; this.startAttack(this.comboT > 0 ? this.combo : 0); break;   // 누르는 그 프레임에 바로 벤다
          }
          if (this.pendingAct) {   // 1타 뒤에도 계속 누르고 있다 → 홀드 액션
            if (!b.act.down) this.pendingAct = false;
            else if (b.act.heldT >= C.CHARGE_MIN) { this.pendingAct = false; this.startCharge(); break; }
          }
          moveMul = 1;   // 이번 프레임에 아무 행동도 시작하지 않았을 때만 걷는다(공격의 전진/구르기 속도를 걷기가 덮어쓰지 않게)
          break;
        case 'charge':
          moveMul = this.chargeMode === 'one' ? 0.45 : 0.35; this.chargeT += dt * (MG.Combat.hasRelic('giantslayer') && this.chargeMode !== 'one' ? 1 + D.RELICS.giantslayer.charge : 1);   // v83 거인학살자: 차지 +30%
          this.chargeFx();
          if (!b.act.down) { this.releaseCharge(false); break; }
          if (this.chargeMode === 'great' && this.chargeT >= C.GS_OVER) this.releaseCharge(true);   // 너무 오래 쥐었다 — 2단으로 떨어진다
          break;
        case 'atk': this.updateAttack(dt, spd, b); break;
        case 'catk': this.updateChargeAttack(dt); break;
        case 'bash': this.updateBash(dt); break;
        case 'iai': this.updateIai(dt); break;
        case 'guillo': moveMul = 0.1; if (this.st >= 0.5) this.toIdle(); break;
        case 'roll': this.updateRoll(dt); break;
        case 'cast':
          moveMul = 0.2;
          if (!this.castDone && this.st >= 0.11) { this.castDone = true; MG.Magic.cast(this.castId); }
          if (this.st >= (D.SPELLS[this.castId] && D.SPELLS[this.castId].rec ? 0.11 + D.SPELLS[this.castId].rec : 0.32)) this.toIdle();   // 건곤대나이 · 극: 시전 뒤 0.35초 후딜
          break;
        case 'drink':
          moveMul = 0.4;
          if (!this.drank && this.st >= 0.5) { this.drank = true; if (MG.Combat.hasRelic('grail')) this.wardT = D.RELICS.grail.wardT; this.heal(Math.round(C.ESTUS_HEAL * (MG.Combat.hasRune('flask') ? 1.3 : 1) * (MG.Combat.hasRelic('grail') ? 1 + D.RELICS.grail.heal : 1))); if (MG.FX) { MG.FX.burst(this.x, this.y - 12, 16, ['#7dff9a', '#ffd870', '#fff4c0'], 50, { up: true, g: -30 }); MG.FX.ring(this.x, this.y - 6, 4, 18, 0.4, '#ffd870', 2); } }
          if (this.st >= 0.75) this.toIdle();
          break;
        case 'gather': this.vx = 0; this.vy = 0; if (this.st >= 0.3) this.toIdle(); break;   // 벌목/채광 한 번 휘두르기
        case 'hurt':
          this.vx *= 0.85; this.vy *= 0.85;
          if (this.st >= 0.26) this.toIdle();
          break;
      }
      if (this.slowT > 0) moveMul *= 0.6;
      if (moveMul > 0 && MG.Combat.blessing() === 'dragon') moveMul *= 1 + D.BEASTS.dragon.speed;   // 청룡: 이동 속도 +15%
      if (moveMul > 0 && (ax || ay)) {
        if (this.state === 'idle') this.face(ax, ay);
        this.vx = ax * C.SPEED * moveMul; this.vy = ay * C.SPEED * moveMul; this.moving = true;
      } else if (this.state === 'idle' || this.state === 'charge' || this.state === 'cast' || this.state === 'drink' || this.state === 'guillo') { this.vx = 0; this.vy = 0; this.moving = false; }
      var p = MG.World.resolve(this.x + this.vx * dt, this.y + this.vy * dt, this.r);
      this.x = p.x; this.y = p.y;
    },
    toIdle: function () { this.state = 'idle'; this.st = 0; this.vx = 0; this.vy = 0; },

    /* ---------------------------------------------------------------- 3단 콤보(근접 판정만) */
    startAttack: function (stage) {
      var cost = C.ATK_SP[stage];
      if (!this.useSp(cost)) { if (MG.FX) MG.FX.text(this.x, this.y - 30, '기력 부족', '#9ad0a0', 0.6, 10); return false; }
      this.autoAim();
      this.state = 'atk'; this.st = 0; this.combo = stage; this.queued = false; this.hitSet = []; this.side = stage === 1 ? -1 : 1; this.trail = null;
      var lunge = stage === 2 ? 70 : 20; this.vx = this.fx * lunge; this.vy = this.fy * lunge;
      if (MG.Audio && MG.Audio.playSwordSwing) try { MG.Audio.playSwordSwing(); } catch (e) { /* 무음 */ }
      if (MG.SFX) MG.SFX.slash(false);
      return true;
    },
    atkDur: function () { return C.ATK_DUR[this.combo] / this.spdMul(); },
    updateAttack: function (dt, spd, b) {
      var dur = this.atkDur(), t = this.st / dur, W = this.weapon().def;
      if (b.act.pressed && this.combo < 2) this.queued = true;
      this.vx *= 0.82; this.vy *= 0.82;
      if (t > 0.3 && t < 0.68) {
        var sh = this.meleeShape(this.combo);   // v85 판정과 궤적이 같은 모양
        if (!this.trail) this.trail = this.spawnTrail(sh, dur * (0.68 - 0.3), false);
        MG.Combat.sweep(this, { range: sh.range, arc: sh.arc, spin: sh.spin, exact: sh.exact, mult: C.STAGE_MULT[this.combo], stage: this.combo, kind: 'melee', knock: sh.spin ? 1 : 0.35 });
        this.elemSwing(W, 20);
      }
      if (t >= 1) {
        if (this.queued && this.combo < 2) { this.startAttack(this.combo + 1); return; }
        this.comboT = this.combo < 2 ? C.COMBO_WINDOW : 0; this.combo = this.combo < 2 ? this.combo + 1 : 0;
        this.toIdle();
        if (b.act.down && !b.act.pressed) {   // 누른 채 1타가 끝났다 → 바로 홀드 액션
          if (b.act.heldT >= C.CHARGE_MIN) this.startCharge(); else this.pendingAct = true;
        }
      }
    },
    /* 3티어/화염 무기의 근접 궤적 원소: 화염은 앞의 얼음 장벽을 녹이고, 서리 · 번개는 칼끝에서 결정/불꽃이 튄다(판정 없음) */
    elemSwing: function (W, reach) {
      if (!W.elem) return;
      var tx = this.x + this.fx * reach, ty = this.y - 6 + this.fy * reach;
      if (W.elem === 'fire') MG.World.burn(tx, ty, 18, true);
      if (MG.FX && Math.random() < 0.35) { if (W.elem === 'frost') MG.FX.burst(tx, ty, 2, ['#e4fdff', '#bff6ff'], 40, { g: 20 }); else if (W.elem === 'storm') MG.FX.spark(tx, ty, 1); }
    },
    /* ---------------------------------------------------------------- 홀드 액션 */
    startCharge: function () { this.state = 'charge'; this.st = 0; this.chargeT = 0; this.fullNotified = false; this.gsStageSeen = 0; this.chargeMode = this.mode(); this.autoAim(); },
    chargeFx: function () {
      var m = this.chargeMode, F = MG.FX; if (!F) return;
      if (m === 'great') {
        var s = this.gsStage();
        if (s > this.gsStageSeen) { this.gsStageSeen = s; F.ring(this.x, this.y - 14, 4, 14 + s * 6, 0.3, GS_COL[s - 1], 2); if (s === 3) { F.flash('#ff2a4a', 0.07); F.text(this.x, this.y - 40, '진!', '#ff4a5a', 0.5, 14, { pop: true }); } else F.flash(s === 2 ? '#fff3c0' : '#ffffff', 0.04); }
        if (s && Math.random() < 0.7) F.gather(this.x, this.y - 14, 18, GS_COL[s - 1]);
      } else if (m === 'one') { if (Math.random() < 0.2) F.gather(this.x + this.fx * 8, this.y - 10 + this.fy * 6, 10, '#c4ccd6'); }
      else if (m === 'tachi') { var lv = this.kiLevel(); if (lv && Math.random() < 0.6) F.gather(this.x, this.y - 10, 16, KI_COL[lv - 1]); }
      else if (m === 'arcane') { if (Math.random() < 0.8) F.gather(this.x, this.y - 14, 20, this.mp >= C.GUILLO_MIN ? (Math.random() < 0.5 ? '#b090f0' : '#4deeea') : '#5a5a7a'); }
      else {
        if (Math.random() < 0.7) F.gather(this.x, this.y - 14, 18, this.chargeT >= C.CHARGE_FULL ? '#fff6c0' : '#ffd866');
        if (this.chargeT >= C.CHARGE_FULL && !this.fullNotified) { this.fullNotified = true; F.ring(this.x, this.y - 12, 4, 20, 0.3, '#ffd866', 2); F.flash('#fff3c0', 0.06); }
      }
    },
    releaseCharge: function (over) {
      var m = this.chargeMode, ok = this.chargeT >= C.CHARGE_RELEASE;
      if (m === 'one') { if (ok) this.startBash(); else this.toIdle(); return; }
      if (m === 'great') { var s = over ? 2 : this.gsStage(); if (over && MG.FX) MG.FX.text(this.x, this.y - 36, '과충전 — 2단', '#ffd866', 0.6, 10); if (s >= 1 && this.sp > 0) this.startChargeAttack({ stage: s }); else this.toIdle(); return; }
      if (m === 'tachi' && ok && this.kiLevel() >= 1) { this.startIai(); return; }
      if (m === 'arcane' && ok) {   // v82: 단두대는 MP 35 이상 · 내부 재충전 4초
        if (this.mp >= C.GUILLO_MIN && this.guilloCd <= 0) { this.startGuillotine(); return; }
        if (MG.FX) MG.FX.text(this.x, this.y - 34, this.guilloCd > 0 ? '⏳ 단두대 재충전 ' + this.guilloCd.toFixed(1) + '초' : '마력 부족 — 단두대 (MP ' + C.GUILLO_MIN + ')', '#8ab8ff', 0.7, 10);
      }
      if (ok && this.sp > 0) this.startChargeAttack({}); else this.toIdle();   // 1타는 이미 나갔다 — 짧게 모았으면 그냥 거둔다
    },
    /* 모아베기(방랑자 기본 · 대검 3단 · 태도/마검의 기본 모아베기) */
    startChargeAttack: function (o) {
      var full = this.chargeT >= C.CHARGE_FULL, st = o.stage || 0;
      this.useSp(C.CHARGE_SP);
      this.autoAim();
      this.state = 'catk'; this.st = 0; this.hitSet = []; this.rockHit = false; this.slammed = false; this.impacted = false; this.cStage = st; this.cFull = st ? st >= 2 : full;
      if (st) { this.cMult = C.GS_MULT[st - 1]; this.cPart = C.GS_PART[st - 1]; this.cStun = [0.4, 0.9, 1.2][st - 1]; this.cRock = 3; }
      else { this.cMult = full ? C.CHARGE_MULT : 1.6; this.cPart = 1; this.cStun = full ? 0.9 : 0.4; this.cRock = this.weapon().def.line === 'great' ? 3 : (full ? 1 : 0.5); }
      this.vx = this.fx * 60; this.vy = this.fy * 60;
      if (MG.Audio && MG.Audio.playBeam) try { MG.Audio.playBeam(); } catch (e) { /* 무음 */ }
      if (MG.SFX) MG.SFX.slash(true);
    },
    updateChargeAttack: function (dt) {
      var t = this.st / C.CHARGE_DUR, W = this.weapon(), true3 = this.cStage === 3;
      this.vx *= 0.8; this.vy *= 0.8;
      if (t > 0.34 && t < 0.62) {
        var csh = this.chargeShape(), cel = !!W.def.ultimate, hitN = 0;
        if (!this.slammed) this.trail = this.spawnTrail(csh, C.CHARGE_DUR * (0.62 - 0.34), true);
        hitN += MG.Combat.sweep(this, { range: csh.range, arc: csh.arc, exact: csh.exact, mult: this.cMult, part: this.cPart, kind: 'charge', stun: this.cStun, knock: 2.2, hold: true });
        if (!this.rockHit) {
          var bx = this.x + this.fx * 20, by = this.y - 4 + this.fy * 20, rock = MG.World.barrierNear(bx, by, 22, 'rock');
          if (rock) { this.rockHit = true; MG.World.hitRock(rock, this.cRock); }
        }
        this.elemSwing(W.def, 22);
        if (!this.slammed) {
          this.slammed = true;
          var ix = this.x + this.fx * 18, iy = this.y + this.fy * 18 - 4, col = this.cStage ? GS_COL[this.cStage - 1] : '#ffd866';
          if (MG.FX) { MG.FX.shake(true3 ? 6 : (this.cFull ? 4 : 2.5), true3 ? 0.35 : 0.2); MG.FX.ring(ix, iy, 4, true3 ? 44 : (this.cFull ? 30 : 20), 0.35, col, 3); MG.FX.burst(ix, iy, true3 ? 34 : 18, [col, '#fff6c0', '#c4ccd6'], true3 ? 160 : 110); }
          if (MG.FX && MG.FX.debris && this.chargeMode === 'great') MG.FX.debris(ix, iy + 4, true3 ? 16 : (this.cStage === 2 ? 10 : 6), 'rock', null, true3 ? 95 : 70);   // v85 대검 내려찍기: 바닥에서 돌멩이 파편이 솟구친다
          if (cel) hitN += this.dragonStrike();   // v85 ★천상용격: 황금 용 기둥 강타(판정 캡슐 = 그려지는 캡슐)
          if (true3) {   // 진 모아베기: 대지 균열 — 둘레의 적도 휩쓴다(부위 ×3)
            if (MG.FX) { MG.FX.crack(ix, iy + 4, Math.atan2(this.fy, this.fx), 54); MG.FX.flash('#ff2a4a', 0.08); MG.FX.text(this.x, this.y + 22, '진 모아베기!', '#ff6a5a', 1.0, 15, { pop: true, rise: 6 }); }
            var tg = MG.Combat.targets(); for (var k = 0; k < tg.length; k++) { var e = tg[k]; if (this.hitSet.indexOf(e) >= 0) continue; if (U.dist(ix, iy, e.x, e.y) < 40 + e.r) { this.hitSet.push(e); MG.Combat.playerHit(e, { mult: this.cMult * 0.6, part: this.cPart, kind: 'charge', stun: 0.6, knock: 1.5, hold: true }); hitN++; } }
            if (MG.Gimmick) MG.Gimmick.area(ix, iy, 40, { kind: 'charge', strong: true });
            if (W.def.elem === 'storm' && !cel) MG.Magic.strike(ix, iy, 40, 'storm');   // v85 천상제일검은 그려진 용 기둥 캡슐만으로 친다
            if (W.id === 'celestial_blade') this.celestial(ix, iy);   // v83 천상 궁극기(전 계열 호환)
          }
          if (W.id === 'crystal_great' && this.cFull) MG.Magic.shockwave(ix, iy);
        }
        // v85 ③ 진 모아베기 · ★천상 홀드기 적중 순간: 임팩트 줌 1.06 + 휘두른 방향으로 묵직한 카메라 펀치
        if (hitN > 0 && !this.impacted && (true3 || cel) && MG.FX && MG.FX.impact) { this.impacted = true; if (MG.Input && MG.Input.rumble) MG.Input.rumble(220, 1, true3 ? 'truecharge' : 'celestial'); var fz = this.celLast && cel ? this.celLast : null; MG.FX.impact(1.06, 0.22, fz ? (this.x + fz.x1) / 2 : this.x + this.fx * 18, fz ? (this.y + fz.y1) / 2 - 8 : this.y + this.fy * 18 - 8, this.fx, this.fy, 7); }
      }
      if (t >= 1) { this.slammed = false; this.toIdle(); }
    },
    /* v83 ★천상제일검 「천상 궁극기」: 진 모아베기의 대지 균열 + 발도 참격 폭풍(태도) + 황금 용격 낙뢰(마검 단두대처럼 하늘에서) — 네 계열을 한 번에 */
    celestial: function (ix, iy) {
      var z = this.celLast || { x1: this.x + this.fx * D.CELESTIAL.HOLD_AT, y1: this.y + this.fy * D.CELESTIAL.HOLD_AT }, x1 = z.x1, y1 = z.y1;
      this.storm = { x0: this.x, y0: this.y, x1: x1, y1: y1, t: -0.15, n: 6, done: 0, lv: 2, gap: 0.05, next: 0, elem: 'storm', w: D.CELESTIAL.HOLD_R - 4 };   // v85 참격 폭풍도 같은 캡슐 안에서만
      if (MG.FX) { MG.FX.pillar(ix, iy, '#fff6c0', 'star'); MG.FX.flash('#ffd866', 0.14); MG.FX.text(this.x, this.y - 48, '☀️ 천상 궁극기!', '#ffd866', 1.4, 16, { pop: true }); if (MG.FX.phantom) MG.FX.phantom(x1, y1 - 30, 'dragon', 1.3); }
      MG.emit('celestial');
    },
    /* v85 ★천상용격 — 황금 용 기둥 강타: 사냥꾼 발밑(x0) → 전방 HOLD_AT 의 기둥 중심(x1)까지 반경 HOLD_R 의 캡슐.
       그려지는 캡슐 · 폭발 고리와 판정이 같은 좌표 · 같은 반경 — 캡슐에 몸이 걸친 모든 적 · 보스에 피해 + 단계별 부위 배율 */
    dragonStrike: function () {
      var CE = D.CELESTIAL, x0 = this.x, y0 = this.y, x1 = this.x + this.fx * CE.HOLD_AT, y1 = this.y + this.fy * CE.HOLD_AT, tg = MG.Combat.targets(), hit = 0, cs = this.celHit = [];
      this.celLast = { x0: x0, y0: y0, x1: x1, y1: y1, r: CE.HOLD_R };
      for (var k = 0; k < tg.length; k++) { var e = tg[k]; if (segD(e.x, e.y, x0, y0, x1, y1) <= CE.HOLD_R + e.r) { cs.push(e); MG.Combat.playerHit(e, { mult: this.cMult * CE.HOLD_MULT, part: this.cPart, kind: 'charge', stun: this.cStun, knock: 1.6, hold: true }); hit++; } }
      if (MG.Gimmick) MG.Gimmick.area(x1, y1, CE.HOLD_R, { kind: 'charge', strong: true });
      if (MG.FX) { MG.FX.dragonStrike(this.celLast); MG.FX.pillar(x1, y1, '#ffd866', 'bolt'); if (MG.FX.phantom) MG.FX.phantom(x1, y1 - 30, 'dragon', 1.1); MG.FX.text(x1, y1 + 10, '🐉 천상용격!', '#ffd866', 1.0, 14, { pop: true, rise: 6 }); MG.FX.flash('#ffd866', 0.06); }
      MG.emit('dragonStrike', this.celLast, hit);
      return hit;
    },
    /* 한손검: 실드 배쉬(앞으로 들이받기 — 강한 경직 + 부위 파괴) */
    startBash: function () {
      this.useSp(C.CHARGE_SP * 0.6); this.autoAim();
      this.state = 'bash'; this.st = 0; this.hitSet = []; this.rockHit = false;
      this.vx = this.fx * C.BASH_SPEED; this.vy = this.fy * C.BASH_SPEED;
      if (MG.FX) { MG.FX.text(this.x, this.y - 36, '실드 배쉬!', '#e8f4ff', 0.7, 12, { pop: true }); MG.FX.ring(this.x + this.fx * 10, this.y - 8 + this.fy * 10, 3, 14, 0.25, '#c4ccd6', 2); if (MG.FX.cone) MG.FX.cone(this.x + this.fx * 4, this.y - 4 + this.fy * 4, Math.atan2(this.fy, this.fx), 30, 0.62); }   // v85 반투명 방패 충격파
      if (MG.SFX) MG.SFX.slash(true);
    },
    updateBash: function (dt) {
      var t = this.st / C.BASH_DUR, W = this.weapon().def;
      this.vx *= 0.9; this.vy *= 0.9;
      if (t < 0.85) {
        var n = MG.Combat.sweep(this, { range: 14 + (W.tier >= 2 ? 4 : 0), arc: 70, mult: C.BASH_MULT * (W.id === 'grove_blade' ? 1.15 : 1), part: C.BASH_PART, kind: 'special', stun: C.BASH_STUN, knock: 2.8, hold: true });
        if (n && MG.FX) { MG.FX.shake(4, 0.2); MG.FX.burst(this.x + this.fx * 14, this.y - 8 + this.fy * 14, 16, ['#e8f4ff', '#c4ccd6', '#ffd866'], 120); this.vx *= 0.2; this.vy *= 0.2; }
        if (!this.rockHit) { var rock = MG.World.barrierNear(this.x + this.fx * 14, this.y - 4 + this.fy * 14, 16, 'rock'); if (rock) { this.rockHit = true; MG.World.hitRock(rock, 1); } }
        this.elemSwing(W, 16);
      }
      if (t >= 1) this.toIdle();
    },
    /* 태도: 발도 기인 일섬 — 무적으로 표적을 관통해 스쳐 지나간 뒤, 0.25초 후 지나온 길에 다단히트 참격 폭풍 */
    startIai: function () {
      var lv = this.kiLevel(), tg = this.autoAim(), dist = C.IAI_DIST;
      if (tg) dist = U.clamp(U.dist(this.x, this.y, tg.x, tg.y) + tg.r + 22, 40, 120);
      this.useSp(C.CHARGE_SP * 0.6);
      this.state = 'iai'; this.st = 0; this.iaiLv = lv; this.iaiX0 = this.x; this.iaiY0 = this.y;
      this.vx = this.fx * dist / C.IAI_DUR; this.vy = this.fy * dist / C.IAI_DUR; this.ki = 0; this.kiT = 9;
      if (MG.FX) { MG.FX.flash(KI_COL[lv - 1], 0.06); MG.FX.text(this.x, this.y - 38, '일섬!', KI_COL[lv - 1], 0.7, 14, { pop: true }); }
      if (MG.SFX) MG.SFX.slash(true);
      if (MG.Audio && MG.Audio.playSwordSwing) try { MG.Audio.playSwordSwing(); } catch (e) { /* 무음 */ }
    },
    updateIai: function (dt) {
      if (MG.FX && Math.random() < 0.9) MG.FX.ghost({ x: this.x, y: this.y, dir: this.dir, a: 0.4, sil: this.iaiLv === 3 ? 'red' : 'cyan' });
      if (this.st >= C.IAI_DUR) {
        var W = this.weapon().def, n = C.IAI_HITS + (W.id === 'raijin_tachi' ? 2 : 0);
        this.storm = { x0: this.iaiX0, y0: this.iaiY0, x1: this.x, y1: this.y, t: -C.IAI_DELAY, n: n, done: 0, lv: this.iaiLv, gap: 0.055, next: 0, elem: W.elem };
        if (W.elem === 'fire') MG.World.burn((this.iaiX0 + this.x) / 2, (this.iaiY0 + this.y) / 2, 30, true);
        this.state = 'catk'; this.st = C.CHARGE_DUR * 0.7; this.cStage = 0; this.slammed = true; this.vx = this.fx * 30; this.vy = this.fy * 30; this.hitSet = [];   // 칼을 거두는 잔심
      }
    },
    updateStorm: function (dt) {
      var s = this.storm; s.t += dt;
      if (s.t < 0) return;
      while (s.done < s.n && s.t >= s.next) {
        s.next += s.gap; s.done++;
        var tg = MG.Combat.targets(), mul = C.IAI_MULT * [1, 1.3, 1.7][s.lv - 1];
        var fin = s.done === s.n, fhit = 0;
        for (var k = 0; k < tg.length; k++) { var e = tg[k]; if (segD(e.x, e.y, s.x0, s.y0, s.x1, s.y1) < (s.w || 16) + e.r) { MG.Combat.playerHit(e, { mult: mul, part: 0.7, kind: 'special', knock: 0.25, stun: fin ? 0.7 : 0, light: !fin, hold: true }); if (fin) { fhit++; if (MG.FX && MG.FX.cross) MG.FX.cross(e.x, e.y - (e.hy || 8), s.lv === 3 ? '#ff2a4a' : (s.elem === 'storm' ? '#ffd866' : '#ff4a6a'), s.lv >= 2 ? 4 : 3); } } }
        if (fin && fhit && MG.FX && MG.FX.impact) MG.FX.impact(1.06, 0.2, (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2 - 8, s.x1 - s.x0, s.y1 - s.y0, 6);   // v85 ③ 발도 일섬 마무리 적중
        if (MG.Gimmick && s.done === 1) MG.Gimmick.area((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 30, { kind: 'special', strong: true });
        if (MG.FX) { var q = Math.random(), mx = U.lerp(s.x0, s.x1, q), my = U.lerp(s.y0, s.y1, q) - 8; MG.FX.slash(mx, my, Math.random() * Math.PI, KI_COL[s.lv - 1]); if (s.elem === 'storm') MG.FX.spark(mx, my, 2); }
        if (!s.rock) { var rock = MG.World.barrierNear((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 30, 'rock'); if (rock) { s.rock = true; MG.World.hitRock(rock, 1); } }
      }
      if (s.done >= s.n) this.storm = null;
    },
    /* 비전 마검: 비전 단두대 — 가진 MP 를 모두 터뜨려 표적 머리 위에 거대한 마법 대검 기둥 */
    startGuillotine: function () {
      var tg = this.autoAim(), spent = this.mp, tx = tg ? tg.x : this.x + this.fx * 50, ty = tg ? tg.y : this.y + this.fy * 50;
      this.mp = 0; this.useSp(C.CHARGE_SP * 0.4); this.guilloCd = C.GUILLO_CD;
      this.state = 'guillo'; this.st = 0;
      if (MG.SFX) MG.SFX.slash(true);
      var W = this.weapon().def;
      MG.Magic.guillotine(tx, ty, tg, (30 + spent * 1.4) * (W.id === 'astral_blade' ? 1.25 : 1), spent);
      if (MG.FX) { MG.FX.ring(this.x, this.y - 14, 4, 26, 0.35, '#b090f0', 3); MG.FX.text(this.x, this.y - 40, '비전 단두대!', '#d8c8ff', 0.8, 13, { pop: true }); }
    },
    /* ---------------------------------------------------------------- 구르기(기사 대시) · 저스트 회피 */
    startRoll: function () {
      if (!this.useSp(C.ROLL_SP * (MG.Combat.hasRelic('windcloak') ? D.RELICS.windcloak.roll : 1))) { if (MG.FX) MG.FX.text(this.x, this.y - 30, '기력 부족', '#9ad0a0', 0.6, 10); return false; }
      var ax = MG.Input.axis.x, ay = MG.Input.axis.y;
      if (ax || ay) this.face(ax, ay);
      this.state = 'roll'; this.st = 0; this.justUsed = false; this.pendingAct = false; this.rollBuf = false; this.queued = false; this.chargeT = 0;
      this.rdx = this.fx; this.rdy = this.fy;
      if (MG.Combat.blessing() === 'dragon') {   // 청룡: 구르기 시작에 몸 둘레로 푸른 뇌전
        var tg = MG.Combat.targets(), hit = 0; for (var k = 0; k < tg.length; k++) if (U.dist(this.x, this.y, tg[k].x, tg[k].y) < 26 + tg[k].r) { MG.Combat.volt(tg[k], 1.5); hit++; }
        if (MG.FX) { MG.FX.spark(this.x, this.y - 8, hit ? 4 : 2); MG.FX.ring(this.x, this.y - 4, 3, 24, 0.25, '#4deeea', 1); }
      }
      return true;
    },
    updateRoll: function (dt) {
      var t = this.st / C.ROLL_DUR, s = C.ROLL_SPEED * (1 - t * 0.75);
      this.vx = this.rdx * s; this.vy = this.rdy * s;
      if (t >= 1) { this.toIdle(); this.st = 0; if (this.rollBuf) { this.rollBuf = false; this.startRoll(); } }   // 버퍼에 담긴 구르기는 끝나자마자
    },
    /* 워치독(실제 시간 기준): 상태가 너무 오래 이어지거나 숫자가 망가지면 바로잡는다 — 조작 불능/멈춤 방지 */
    watchdog: function (realDt) {
      if (!isFinite(this.x) || !isFinite(this.y)) { this.x = this.safeX || this.x || 0; this.y = this.safeY || this.y || 0; }
      else { this.safeX = this.x; this.safeY = this.y; }
      if (!isFinite(this.vx) || !isFinite(this.vy)) { this.vx = 0; this.vy = 0; }
      this.invT = isFinite(this.invT) ? Math.min(Math.max(this.invT, 0), 1) : 0;
      this.critBuff = isFinite(this.critBuff) ? Math.min(Math.max(this.critBuff, 0), 3) : 0;
      if (!isFinite(this.st) || this.st < 0) this.st = 0;
      if (!isFinite(this.sp)) this.sp = this.maxSp; if (!isFinite(this.mp)) this.mp = 0; if (!isFinite(this.hp)) this.hp = 1;
      if (this.state !== this._wdState || this.st < (this._wdSt || 0)) { this._wdState = this.state; this.stateReal = 0; }
      else this.stateReal = (this.stateReal || 0) + (isFinite(realDt) ? realDt : 0);
      this._wdSt = this.st;
      var lim = { roll: 1.2, atk: 1.6, catk: 1.6, bash: 1.0, iai: 1.0, guillo: 1.2, cast: 1.2, drink: 1.8, hurt: 1.0, gather: 1.0 }[this.state];
      if (lim && this.stateReal > lim) { this.toIdle(); this.rollBuf = false; this.stateReal = 0; this.watchdogFix = (this.watchdogFix || 0) + 1; }
    },
    iframe: function () { return (this.state === 'roll' && this.st >= C.IFRAME[0] && this.st <= C.IFRAME[1]) || this.state === 'iai'; },
    guarding: function () { return (this.state === 'charge' && this.chargeMode === 'one') || this.state === 'bash'; },

    /* ---------------------------------------------------------------- 마법 · 에스트 */
    startCast: function () {
      var id = MG.S.spells[MG.S.spellSel], sp = D.SPELLS[id];
      if (!sp) return false;
      var cd = this.cooldown(id);
      if (cd > 0) { if (MG.FX) MG.FX.text(this.x, this.y - 30, '⏳ ' + cd.toFixed(1) + '초', '#bff6ff', 0.6, 10); return false; }   // v82 재사용 대기시간
      if (this.mp < sp.mp) { if (MG.FX) MG.FX.text(this.x, this.y - 30, '마력 부족', '#8ab8ff', 0.7, 10); return false; }
      if (sp.hpPct && this.hp <= this.maxHp * sp.hpMin) { if (MG.FX) MG.FX.text(this.x, this.y - 30, '체력이 모자라다 (HP ' + Math.round(sp.hpMin * 100) + '% 이하)', '#ffb0a0', 0.8, 10); return false; }
      var jade = MG.Combat.hasRelic('bloodjade'), hpPct = jade ? (sp.hpPct ? D.RELICS.bloodjade.abyssPct : D.RELICS.bloodjade.hpPct) : sp.hpPct;
      this.mp -= sp.mp; this.cds[id] = (sp.cd || 0) * (jade ? 1 - D.RELICS.bloodjade.cd : 1);   // v83 건곤의 혈옥: 대기시간 -35%
      if (hpPct) { sp = { hpPct: hpPct }; var cost = Math.min(Math.max(0, this.hp - 1), Math.max(1, Math.round(this.hp * sp.hpPct))); this.hp -= cost; if (MG.FX) MG.FX.text(this.x + 8, this.y - 26, '-' + cost + ' HP', '#ff8a9a', 0.6, 10); }   // 《바람의 나라》 건곤대나이: 현재 HP 의 12% 를 대가로
      this.autoAim();
      this.state = 'cast'; this.st = 0; this.castId = id; this.castDone = false;
      if (MG.FX) MG.FX.ring(this.x, this.y - 8, 2, 14, 0.25, id === 'abyss' ? '#b090f0' : '#8ae8f8', 1);
      return true;
    },
    startDrink: function () {
      if (this.estus <= 0) { if (MG.FX) MG.FX.text(this.x, this.y - 30, '에스트가 없다', '#ffb0a0', 0.7, 10); return false; }
      this.estus--; this.state = 'drink'; this.st = 0; this.drank = false;
      return true;
    },

    /* ---------------------------------------------------------------- 피격: src = { x, y }. 반환 'just' | 'iframe' | 'guard' | 'hit' | null */
    hurt: function (dmg, src, opt) {
      if (this.state === 'dead') return null;
      if (this.iframe()) {
        if (this.state === 'roll' && !this.justUsed && this.st <= C.JUST_WINDOW + C.IFRAME[0]) this.justDodge();
        return this.justUsed && this.state === 'roll' ? 'just' : 'iframe';
      }
      if (this.invT > 0) return null;
      var CB = MG.Combat, foe = CB.attacker;
      // v82 ⚔️ 상쇄: 보스/정예의 타격을 방패를 막 올린 순간(0.22초 안) 정면으로 받으면 — 피해 0 · 적의 공격이 튕겨 나간다(경직) · 확정 치명타 2.5초
      var unblock = !!(opt && opt.unblockable);
      if (unblock && this.guarding() && MG.FX) MG.FX.text(this.x, this.y - 34, '🩸 가드 불능!', '#ff4a5a', 0.8, 12, { pop: true });   // v84 진홍 안광
      if (!unblock && foe && (CB.isBoss(foe) || foe.elite) && this.state === 'charge' && this.chargeMode === 'one' && this.chargeT <= C.GUARD_JUST && src) {
        var pa = Math.atan2(src.y - this.y, src.x - this.x);
        if (Math.abs(U.angDiff(Math.atan2(this.fy, this.fx), pa)) < C.GUARD_ARC * DEG) { CB.parry(foe, 'guard', true); return 'parry'; }
      }
      // 한손검 방패 가드: 정면(±80°)에서 온 공격은 막는다(SP 소모 — SP 가 바닥나면 가드가 깨진다)
      if (!unblock && this.guarding() && src && this.sp > 0) {
        var a = Math.atan2(src.y - this.y, src.x - this.x);
        if (Math.abs(U.angDiff(Math.atan2(this.fy, this.fx), a)) < C.GUARD_ARC * DEG) {
          this.sp = Math.max(0, this.sp - C.GUARD_SP - dmg * 0.25); this.spDelay = C.SP_DELAY;
          this.vx = -Math.cos(a) * 40; this.vy = -Math.sin(a) * 40;
          if (MG.FX) { MG.FX.text(this.x, this.y - 32, '🛡 막았다!', '#e8f4ff', 0.6, 12); MG.FX.burst(this.x + this.fx * 9, this.y - 9 + this.fy * 8, 10, ['#ffffff', '#ffd866', '#c4ccd6'], 90); MG.FX.hitstop(0.05); MG.FX.shake(1.5, 0.1); }
          if (MG.Audio && MG.Audio.playShellClink) try { MG.Audio.playShellClink(); } catch (e) { /* 무음 */ }
          this.invT = 0.15;
          return 'guard';
        }
      }
      dmg = Math.round(dmg * MG.Combat.guardMul());
      this.hp -= dmg; this.invT = 0.6; this.hurtFlash = 0.2;
      if (MG.Bosses && MG.Bosses.noteHit) MG.Bosses.noteHit();
      if (MG.Input && MG.Input.rumble) MG.Input.rumble(120 + Math.min(80, dmg * 2), 0.7, 'hurt');   // v86 햅틱: 피격   // v85 수렵 기록: 보스 방 안의 피격 횟수
      if (CB.blessing() === 'turtle') this.reflect(dmg);   // 현무: 피격 시 둘레의 적에게 충격파 반사
      if (this.hp <= 0 && CB.blessing() === 'phoenix' && !MG.S.phoenixUsed) return this.rebirth(dmg);   // 주작의 재탄생(휴식당 1회)
      if (MG.FX) { MG.FX.text(this.x, this.y - 30, '-' + dmg, '#ff6a6a', 0.7, 13); MG.FX.shake(3, 0.18); MG.FX.burst(this.x, this.y - 10, 8, ['#ff6a6a', '#ffd0d0'], 70); MG.FX.hitstop(0.06); }
      if (MG.Audio && MG.Audio.playPlayerContact) try { MG.Audio.playPlayerContact(); } catch (e) { /* 무음 */ }
      var kx = this.x - (src ? src.x : this.x), ky = this.y - (src ? src.y : this.y), l = Math.sqrt(kx * kx + ky * ky) || 1, kb = (opt && opt.knock) || 90;
      if (this.hp <= 0) { this.hp = 0; this.die(); return 'hit'; }
      if (opt && opt.noKnock) return 'hit';
      if (this.state !== 'charge' || dmg >= 20) { this.state = 'hurt'; this.st = 0; this.vx = kx / l * kb; this.vy = ky / l * kb; this.pendingAct = false; }
      return 'hit';
    },
    /* v83 무구의 바람외투: 저스트 회피 순간 둘레(70px)의 적에게 벼락이 떨어진다 */
    windBolt: function () {
      var tg = MG.Combat.targets(), n = Math.max(1, Math.round(MG.Combat.attackPower() * D.RELICS.windcloak.bolt)), hit = 0;
      for (var k = 0; k < tg.length; k++) if (U.dist(this.x, this.y, tg[k].x, tg[k].y) < 70 + tg[k].r) { tg[k].hurt({ dmg: n, dot: true, kind: 'relic' }); hit++; if (MG.FX) { MG.FX.pillar(tg[k].x, tg[k].y, '#9ad8ff', 'bolt'); MG.FX.text(tg[k].x, tg[k].y - 26, n, '#9ad8ff', 0.6, 12); } }
      return hit;
    },
    /* v83 칼끝의 입자: 봉인(보랏빛 사슬 빛) · 룬 · 원소(서리/번개/화염) · 성흔 · 황금 */
    bladeFx: function () {
      var s = this.weaponStyle(), F = MG.FX; if (!s.fx || !F) return;
      var a = Math.atan2(this.fy, this.fx), r = 10 + 8 * s.len, x = this.x + Math.cos(a) * r * 0.6, y = this.y - 12 + Math.sin(a) * r * 0.4;
      var cols = { gold: ['#ffd866', '#fff6c0'], seal: ['#8a64e0', '#c4a8ff'], rune: ['#b090f0', '#4deeea'], frost: ['#e4fdff', '#bff6ff'], storm: ['#9ad8ff', '#eef6ff'], fire: ['#ffb238', '#ff7424'], star: ['#efe4ff', '#4deeea'] }[s.fx] || ['#ffffff'];
      if (s.fx === 'fire') F.ember(x, y); else F.burst(x, y, 1, cols, 14, { g: s.fx === 'frost' ? 20 : -26 });
    },
    /* v82 현무: 받은 피해의 충격파를 둘레(40px)의 적에게 되돌린다 */
    reflect: function (dmg) {
      var tg = MG.Combat.targets(), n = Math.max(1, Math.round(MG.Combat.attackPower() * D.BEASTS.turtle.reflect)), hit = 0;
      for (var k = 0; k < tg.length; k++) if (U.dist(this.x, this.y, tg[k].x, tg[k].y) < 40 + tg[k].r) { tg[k].hurt({ dmg: n, dot: true, kind: 'beast' }); if (MG.FX) MG.FX.text(tg[k].x, tg[k].y - 22, n, '#7ad8a8', 0.6, 11); hit++; }
      if (MG.FX) { MG.FX.ring(this.x, this.y - 6, 4, 40, 0.35, '#7ad8a8', 3); MG.FX.burst(this.x, this.y - 8, 10, ['#7ad8a8', '#e4fdff'], 90); if (MG.FX.phantom && !(this.phT > 0)) { this.phT = 1.5; MG.FX.phantom(this.x, this.y - 36, 'turtle', 1); } }   // v83 현무 환영
      void dmg; return hit;
    },
    /* v82 주작의 재탄생: 죽음의 일격을 받으면 HP 30% 로 불꽃 속에서 일어선다(화톳불 휴식당 1회) */
    rebirth: function () {
      MG.S.phoenixUsed = true; this.hp = Math.max(1, Math.round(this.maxHp * D.BEASTS.phoenix.revive)); this.invT = 1.5; this.state = 'idle'; this.st = 0; this.vx = 0; this.vy = 0;
      if (MG.FX) { MG.FX.flash('#ff8a3c', 0.25); MG.FX.slow(0.3, 0.22); MG.FX.ring(this.x, this.y - 8, 4, 50, 0.7, '#ffb238', 4); MG.FX.burst(this.x, this.y - 12, 44, ['#ff7424', '#ffb238', '#fff6c0', '#ff4a2a'], 150, { up: true, g: -40 }); MG.FX.text(this.x, this.y - 44, '🦅 주작의 재탄생!', '#ffb238', 1.6, 16, { pop: true }); if (MG.FX.phantom) MG.FX.phantom(this.x, this.y - 40, 'phoenix', 1.4); }
      if (MG.UI) MG.UI.ribbon('🦅 주작의 재탄생 — 휴식 전까지 1회', 2400);
      MG.emit('rebirth');
      return 'rebirth';
    },
    justDodge: function () {
      this.justUsed = true; this.lastJust = MG.Game ? MG.Game.time : 0;
      this.critBuff = 3.0; this.gyeokReady = true;   // v82: 저스트 회피 직후 첫 타는 「격」 확정
      this.sp = Math.min(this.maxSp, this.sp + 30); this.mp = Math.min(this.maxMp, this.mp + 10 + (MG.Combat.hasRune('echo') ? 15 : 0) + (MG.Combat.hasRune('mana') ? C.MANA_JUST : 0));
      if (MG.SFX) MG.SFX.parry();
      if (MG.Combat.hasRelic('windcloak')) this.windBolt();   // v83 무구의 바람외투: 자동 벼락 반격
      MG.emit('just', this);
      if (MG.FX) {
        MG.FX.slow(0.35, C.JUST_SLOW); MG.FX.flash('#9af0ff', 0.08);
        MG.FX.text(this.x, this.y - 34, '저스트 회피!', '#8ae8f8', 1.0, 14, { pop: true });
        for (var k = 0; k < 4; k++) MG.FX.ghost({ x: this.x - this.rdx * k * 7, y: this.y - this.rdy * k * 7, dir: this.dir, a: 0.55 - k * 0.11, sil: k % 2 ? 'silver' : 'cyan' });
        MG.FX.ring(this.x, this.y - 8, 4, 26, 0.35, '#8ae8f8', 2);
      }
    },
    die: function () { this.state = 'dead'; this.st = 0; this.vx = 0; this.vy = 0; this.storm = null; if (MG.Game) MG.Game.onDeath(); },

    /* ---------------------------------------------------------------- 그리기(월드 좌표) */
    draw: function (ctx, t) {
      var S = MG.Sprites, hd = S && S.ready('knight', 'gear');
      if (MG.World.groundShadow) MG.World.groundShadow(ctx, this.x, this.y + 1, this.state === 'roll' ? 8 : 7, 2.4, 0.34); else { ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx.beginPath(); ctx.ellipse(Math.round(this.x), Math.round(this.y + 1), this.state === 'roll' ? 7 : 6, 2, 0, 0, Math.PI * 2); ctx.fill(); }   // v83 접지 그림자 + 림
      if (this.healGlow > 0) { ctx.fillStyle = 'rgba(125, 255, 154, ' + (this.healGlow * 0.5).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(this.x, this.y - 10, 14, 0, Math.PI * 2); ctx.fill(); }
      if (this.critBuff > 0) { ctx.strokeStyle = 'rgba(138, 232, 248, ' + (0.4 + 0.3 * Math.sin(t * 12)).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.x, this.y - 10, 12, 0, Math.PI * 2); ctx.stroke(); }
      if (this.riposteT > 0) { ctx.strokeStyle = 'rgba(255, 216, 102, ' + (0.45 + 0.35 * Math.sin(t * 16)).toFixed(2) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(this.x, this.y - 10, 13, 13, 0, 0, Math.PI * 2); ctx.stroke(); }   // 상쇄 뒤 확정 치명타(Riposte)의 금빛 테
      this.drawAura(ctx, t);
      if (!hd) { ctx.fillStyle = this.hurtFlash > 0 ? '#fff' : '#6a8ac8'; ctx.fillRect(Math.round(this.x - 5), Math.round(this.y - (this.state === 'roll' ? 14 : 18)), 10, this.state === 'roll' ? 14 : 18); return; }
      if (this.invT > 0 && this.state !== 'hurt' && Math.floor(t * 20) % 2 === 0) return;   // 피격 직후 깜빡임
      var meta = S.meta('knight'), f = this.frame(), cx = this.x, feetY = this.y;
      var ox = Math.round(cx - meta.fw / 2), oy = Math.round(feetY - meta.foot);
      // 대시 잔상 3겹(청록 · 은빛 기사 실루엣) — 구르기 내내
      if (this.state === 'roll') this.drawAfterimages(ctx, f, meta);
      var swinging = this.state === 'atk' || this.state === 'catk' || this.state === 'charge' || this.state === 'cast' || this.state === 'gather' || this.state === 'bash' || this.state === 'iai' || this.state === 'guillo';
      var behind = f.view === 'up', shield = this.mode() === 'one';
      if (shield && !this.guarding()) this.drawShield(ctx, cx, feetY, f, false, true);
      if (swinging && behind) this.drawArmSword(ctx, cx, feetY, t);
      if (!swinging && this.state !== 'dead') this.drawSheath(ctx, ox, oy, f, true);
      ctx.drawImage(S.img(this.sheet()), f.col * meta.fw, f.row * meta.fh, meta.fw, meta.fh, ox, oy, meta.fw, meta.fh);
      if (this.hurtFlash > 0 || this.slowT > 0) { var wh = S.tinted(this.sheet(), this.hurtFlash > 0 ? '#ffffff' : '#bff6ff'); if (wh) { ctx.globalAlpha = this.hurtFlash > 0 ? 0.7 : 0.3; ctx.drawImage(wh, f.col * meta.fw, f.row * meta.fh, meta.fw, meta.fh, ox, oy, meta.fw, meta.fh); ctx.globalAlpha = 1; } }
      if (!swinging && this.state !== 'dead') this.drawSheath(ctx, ox, oy, f, false);
      if (swinging && !behind) this.drawArmSword(ctx, cx, feetY, t);
      if (shield && this.guarding()) this.drawShield(ctx, cx, feetY, f, true, false);
      if (this.state === 'drink' && S.ready('rb')) S.draw(ctx, 'rb', 'estus', cx + (f.view === 'left' ? -4 : 4), feetY - 20 + Math.round(Math.min(1, this.st / 0.4) * -3), false, 0.7);
    },
    /* v82 사신수의 가호: 발밑의 은은한 신수 오라(타원 + 맴도는 빛 셋) · 영약 버프: 옅은 금빛 */
    drawAura: function (ctx, t) {
      var b = MG.Combat.beast(); if (!b && !(this.elixirT > 0)) return;
      var col = b ? b.col : '#ffd866', pu = 0.5 + 0.5 * Math.sin(t * 3);
      ctx.globalAlpha = 0.18 + 0.1 * pu; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(this.x, this.y + 1, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.55; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(this.x, this.y + 1, 12 + pu, 4.5 + pu * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
      if (b) for (var k = 0; k < 3; k++) { var a = t * 2.2 + k * 2.094; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 6 + k); ctx.fillRect(Math.round(this.x + Math.cos(a) * 11), Math.round(this.y + 1 + Math.sin(a) * 4 - (k % 2) * 3), 1, 1); }
      ctx.globalAlpha = 1;
    },
    drawAfterimages: function (ctx, f, meta) {
      var S = MG.Sprites, cyan = S.tinted(this.sheet(), '#66f2ff'), silver = S.tinted(this.sheet(), '#dfe8f5'); if (!cyan || !silver) return;
      var q = U.clamp(this.st / C.ROLL_DUR, 0, 1), sp = 13 * (1 - q * 0.3);
      for (var k = 3; k >= 1; k--) {
        ctx.globalAlpha = (0.72 - k * 0.17) * (1 - q * 0.45);
        ctx.drawImage(k % 2 ? cyan : silver, f.col * meta.fw, f.row * meta.fh, meta.fw, meta.fh, Math.round(this.x - this.rdx * k * sp - meta.fw / 2), Math.round(this.y - this.rdy * k * sp - meta.foot), meta.fw, meta.fh);
      }
      ctx.globalAlpha = 1;
    },
    /* 한손검의 방패(왼손): 평소엔 몸 옆, 가드/배쉬 때는 바라보는 쪽 앞으로 */
    drawShield: function (ctx, cx, feetY, f, front, behindBody) {
      var S = MG.Sprites; if (!S.ready('rb')) return;
      var it = S.item('rb', 'shield'); if (!it) return;
      var x, y, sc = 1;
      if (front) { var push = this.state === 'bash' ? 4 : 0; x = cx + this.fx * (8 + push); y = feetY - 11 + this.fy * (5 + push); sc = 1.05; }
      else { var side = { down: [-7, -11], up: [6, -12], right: [-4, -12], left: [4, -12] }[f.view]; if (!behindBody && f.view !== 'down') return; x = cx + side[0]; y = feetY + side[1]; sc = 0.85; if (f.view !== 'down' && f.view !== 'up') return; }
      S.draw(ctx, 'rb', 'shield', x, y + 6, f.view === 'left', sc);
      if (front && this.state === 'charge') { ctx.strokeStyle = 'rgba(232, 244, 255, ' + (0.4 + 0.3 * Math.sin(this.animT * 14)).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke(); }
    },
    /* 록온 링: 180px 안의 표적 발밑에 돌아가는 청록 조준 고리 */
    drawLock: function (ctx, t) {
      var e = this.lock; if (!e || !e.alive) return;
      var r = e.r + 7, rot = t * 2.4;
      ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y)); ctx.scale(1, 0.55);
      ctx.strokeStyle = 'rgba(77, 238, 234, 0.85)'; ctx.lineWidth = 1.5;
      for (var k = 0; k < 4; k++) { var a = rot + k * Math.PI / 2; ctx.beginPath(); ctx.arc(0, 0, r, a, a + 0.9); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(238, 246, 255, 0.9)'; ctx.lineWidth = 1;
      for (var j = 0; j < 4; j++) { var b = -rot * 0.7 + j * Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(b) * (r + 5), Math.sin(b) * (r + 5)); ctx.lineTo(Math.cos(b) * (r + 1), Math.sin(b) * (r + 1)); ctx.stroke(); }
      ctx.restore();
    },
    drawGhosts: function (ctx) {
      var S = MG.Sprites; if (!S || !S.ready('knight') || !MG.FX) return;
      var sils = { cyan: S.tinted('knight', '#66f2ff'), silver: S.tinted('knight', '#dfe8f5'), red: S.tinted('knight', '#ff6a5a') }, meta = S.meta('knight'); if (!sils.cyan) return;
      for (var i = 0; i < MG.FX.ghosts.length; i++) {
        var g = MG.FX.ghosts[i]; ctx.globalAlpha = Math.max(0, g.a * (1 - g.t / 0.35));
        ctx.drawImage(sils[g.sil] || sils.cyan, (meta.anims.roll.from) * meta.fw, VIEW_ROW[g.dir] * meta.fh, meta.fw, meta.fh, Math.round(g.x - meta.fw / 2), Math.round(g.y - meta.foot), meta.fw, meta.fh);
      }
      ctx.globalAlpha = 1;
    },
    frame: function () {
      var meta = MG.Sprites.meta('knight'), A = meta.anims, view = this.dir, anim, i;
      if (this.state === 'dead') { anim = 'death'; i = Math.min(3, Math.floor(this.st / 0.22)); }
      else if (this.state === 'roll') { anim = 'roll'; i = Math.floor(this.st / 0.095) % 2; }   // 기사 대시 포즈 2장(공 아님)
      else if (this.state === 'atk' || this.state === 'gather') { var tt = this.st / this.atkDur(); anim = 'atk'; i = tt < 0.25 ? 0 : (tt < 0.62 ? 1 : 2); }
      else if (this.state === 'catk') { var tc = this.st / C.CHARGE_DUR; anim = 'atk'; i = tc < 0.34 ? 0 : (tc < 0.7 ? 1 : 2); }
      else if (this.state === 'bash' || this.state === 'iai') { anim = 'atk'; i = 2; }
      else if (this.state === 'charge' || this.state === 'cast' || this.state === 'guillo') { anim = 'atk'; i = 0; }
      else if (this.state === 'hurt') { anim = 'hurt'; i = 0; }
      else if (this.moving) { anim = 'walk'; i = Math.floor(this.animT * 9) % 6; }
      else { anim = 'idle'; i = Math.floor(this.animT / 0.32) % 4; }
      return { anim: anim, i: i, view: view, col: A[anim].from + i, row: VIEW_ROW[view] };
    },
    shoulder: function (dir, cx, feetY, idx) {
      var meta = MG.Sprites.meta('knight'), sh = meta.shoulder[dir] || meta.shoulder.down, lean = meta.lean.atk[idx] || [0, 0];
      var lx = dir === 'right' ? lean[0] : (dir === 'left' ? -lean[0] : 0);
      return { x: Math.round(cx - meta.fw / 2) + sh[0] + lx, y: Math.round(feetY - meta.foot) + sh[1] + lean[1] };
    },
    drawSheath: function (ctx, ox, oy, f, back) {
      var meta = MG.Sprites.meta('knight'), sh = meta.sheath[f.view]; if (!sh || !!sh[3] !== back) return;
      var bob = (meta.bob[f.anim] && meta.bob[f.anim][f.i]) || 0;
      var lv = this.mode() === 'tachi' ? this.kiLevel() : 0;
      this.drawSword(ctx, ox + sh[0], oy + sh[1] + bob, sh[2] * DEG, 1, 0, lv ? KI_COL[lv - 1] : null);
    },
    /* 손에 든 검 한 자루(손잡이 축 x, y · 각도 a) — 장착 무기 모양, ★명장은 금빛 빛무리, aura = 검신을 따라 번지는 색 빛(단계/연마/마력) */
    drawSword: function (ctx, x, y, a, alpha, glow, aura) {
      var S = MG.Sprites, W = this.weapon(), it = null, im;
      if (W.def.sprite && S.ready('forge')) { it = S.item('forge', 'wpn_' + W.def.sprite); im = S.img('forge'); }
      if (!it) { it = S.item('gear', 'sword0_' + (Math.floor(this.animT * 9) % 4)); im = S.img('gear'); }
      if (!it) return;
      var st = this.weaponStyle();
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a); ctx.scale(st.len, st.wid);   // v83 계열/티어마다 다른 길이 · 폭
      if (alpha !== undefined && alpha < 1) ctx.globalAlpha *= alpha;
      var len = it.w - it.ax; aura = aura || st.aura;
      if (st.curve) { ctx.strokeStyle = 'rgba(238, 246, 255, 0.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(4, -1.5); ctx.quadraticCurveTo(len * 0.6, -3.2, len, -1); ctx.stroke(); }   // 태도: 휜 칼등의 반사광
      if (aura) {
        var ga0 = ctx.globalAlpha, pul = 0.65 + 0.3 * Math.sin(this.animT * 16);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = aura; ctx.lineCap = 'round';
        ctx.globalAlpha = ga0 * 0.35 * pul; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(len + 1, 0); ctx.stroke();
        ctx.globalAlpha = ga0 * 0.7 * pul; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(len, 0); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt'; ctx.globalAlpha = ga0;
      }
      var gl = glow || (W.master ? 3 : 0);
      if (gl) { var g = S.item('gear', 'glow' + Math.min(3, gl)); if (g) { var ga = ctx.globalAlpha; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * (0.6 + 0.25 * Math.sin(this.animT * 8)); ctx.drawImage(S.img('gear'), g.x, g.y, g.w, g.h, -g.ax, -g.ay, g.w, g.h); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ga; } }
      ctx.drawImage(im, it.x, it.y, it.w, it.h, -it.ax, -it.ay, it.w, it.h);
      ctx.restore();
    },
    /* 팔 + 검: 콤보 궤적 / 회전베기 / 홀드 자세(계열별) / 내려찍기 / 배쉬 / 일섬 / 시전 */
    swingAngle: function () {
      var d = this.dir, base = { right: 0, left: 180, down: 90, up: -90 }[d];
      if (this.state === 'atk' || this.state === 'gather') {
        var t = U.clamp(this.st / this.atkDur(), 0, 1);
        if (this.combo === 2) return (base - 150 + 360 * U.easeInOut(U.clamp((t - 0.1) / 0.75, 0, 1))) * DEG;   // 회전베기
        var a = ARC[d], s = this.side === -1 ? a[1] : a[0], e = this.side === -1 ? a[0] : a[1], sg = e > s ? 1 : -1, back = s - sg * 28, over = e + sg * 12;
        if (t < 0.25) return (s + (back - s) * U.easeOut(t / 0.25)) * DEG;
        if (t < 0.62) return (back + (over - back) * U.easeOut((t - 0.25) / 0.37)) * DEG;
        return (over + (e - over) * U.easeInOut((t - 0.62) / 0.38)) * DEG;
      }
      if (this.state === 'bash') return (base + (d === 'left' ? -1 : 1) * 125) * DEG;   // 칼은 뒤로, 방패가 앞
      if (this.state === 'iai') { var ti = U.clamp(this.st / C.IAI_DUR, 0, 1); return (base - 80 + 250 * U.easeOut(ti)) * (d === 'left' ? 1 : 1) * DEG; }
      if (this.state === 'charge' && this.chargeMode === 'one') return (base + (d === 'left' ? -1 : 1) * 40) * DEG;
      if (this.state === 'charge' && this.chargeMode === 'tachi') return (base + (d === 'left' ? -1 : 1) * 150 + Math.sin(this.animT * 30)) * DEG;   // 발도 자세(칼을 뒤로 낮게)
      var up = { right: -115, left: -65, down: -95, up: 95 }[d], down = { right: 35, left: 145, down: 90, up: -90 }[d];
      if (this.state === 'charge' || this.state === 'cast' || this.state === 'guillo') { var shiver = this.chargeMode === 'great' ? this.gsStage() : (this.chargeT >= C.CHARGE_FULL ? 3 : 1); return (up + Math.sin(this.animT * 30) * shiver) * DEG; }
      var tc = U.clamp(this.st / C.CHARGE_DUR, 0, 1);
      var dn = d === 'up' ? down - 360 : down;
      return (tc < 0.34 ? up : U.lerp(up, d === 'up' ? -270 : dn, U.easeOut(U.clamp((tc - 0.34) / 0.26, 0, 1)))) * DEG;
    },
    /* 지금 검신에 번질 빛(대검 단계 · 태도 연마 · 마검 마력 · 신화 원소) */
    auraColor: function () {
      var m = this.mode();
      if (this.state === 'charge' && m === 'great') { var s = this.gsStage(); return s ? GS_COL[s - 1] : null; }
      if (this.state === 'catk' && this.cStage) return GS_COL[this.cStage - 1];
      if (m === 'tachi') { var lv = this.state === 'iai' ? this.iaiLv : this.kiLevel(); if (lv) return KI_COL[lv - 1]; }
      if (m === 'arcane' && (this.state === 'charge' || this.state === 'guillo')) return this.mp >= C.GUILLO_MIN || this.state === 'guillo' ? '#b090f0' : null;
      var el = this.weapon().def.elem; if (el && el !== 'fire') return el === 'frost' ? '#bff6ff' : '#9ad8ff';
      return null;
    },
    drawArmSword: function (ctx, cx, feetY, t) {
      var S = MG.Sprites, idx = this.state === 'atk' ? Math.min(2, Math.floor(U.clamp(this.st / this.atkDur(), 0, 0.99) * 3)) : 1;
      var sh = this.shoulder(this.dir, cx, feetY, idx), ang = this.swingAngle();
      var charge = this.state === 'charge', m = this.chargeMode, basic = charge && (m === 'basic' || (m === 'tachi' && !this.kiLevel())), full = charge && basic && this.chargeT >= C.CHARGE_FULL, aura = this.auraColor();
      if (this.state === 'atk' || this.state === 'catk') {
        var tt = this.state === 'atk' ? this.st / this.atkDur() : this.st / C.CHARGE_DUR;
        if (tt > 0.25 && tt < 0.75) {
          var keep = this.st; for (var g = 2; g >= 1; g--) { this.st = Math.max(0, keep - g * 0.03); var ga = this.swingAngle(); this.drawSword(ctx, sh.x + Math.cos(ga) * 5.5, sh.y + Math.sin(ga) * 5.5, ga, g === 2 ? 0.2 : 0.4, this.state === 'catk' && !this.cStage ? 3 : 0, aura); } this.st = keep;
          if (!this.trail) this.drawSlashArc(ctx, sh, tt);   // v85 궤적은 FX.trail(판정 중심 · 반경 그대로)이 그린다
        }
      }
      if (charge && (basic || m === 'great' || m === 'arcane')) {
        var cc = m === 'great' ? (aura || 'rgba(255,255,255,0)') : m === 'arcane' ? (this.mp >= C.GUILLO_MIN ? '#b090f0' : '#4a4a66') : (full ? '#fff6c0' : '#ffd866'), rr = m === 'great' ? 10 + this.gsStage() * 4 : (full ? 18 : 12);
        var cg = ctx.createRadialGradient && ctx.createRadialGradient(sh.x, sh.y - 10, 1, sh.x, sh.y - 10, rr);
        if (cg && cg.addColorStop && cc.charAt(0) === '#') { cg.addColorStop(0, cc); cg.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.globalAlpha = 0.55; ctx.fillStyle = cg; ctx.fillRect(sh.x - 24, sh.y - 34, 48, 48); ctx.globalAlpha = 1; }
      }
      var arm = S.item('gear', 'arm_' + this.outfit()) || S.item('gear', 'arm');   // v84 갑주별 팔
      if (arm) { ctx.save(); ctx.translate(Math.round(sh.x), Math.round(sh.y)); ctx.rotate(ang); ctx.drawImage(S.img('gear'), arm.x, arm.y, arm.w, arm.h, -arm.ax, -arm.ay, arm.w, arm.h); ctx.restore(); }
      this.drawSword(ctx, sh.x + Math.cos(ang) * 5.5, sh.y + Math.sin(ang) * 5.5, ang, 1, basic ? (full ? 3 : 2) : (this.state === 'catk' && !this.cStage ? 3 : (this.critBuff > 0 ? 2 : 0)), aura);
      if (this.state === 'cast') { ctx.fillStyle = 'rgba(138, 232, 248, 0.6)'; ctx.beginPath(); ctx.arc(sh.x + Math.cos(ang) * 14, sh.y + Math.sin(ang) * 14, 3 + Math.sin(t * 30), 0, Math.PI * 2); ctx.fill(); }
    },
    /* 베기 궤적(반달 빛) — 신화 무기는 원소 색 */
    drawSlashArc: function (ctx, sh, tt) {
      var W = this.weapon().def, R = C.REACH + (W.reach || 0) - 4, a1 = this.swingAngle(), keep = this.st;
      this.st = Math.max(0, keep - 0.09); var a0 = this.swingAngle(); this.st = keep;
      var col = this.state === 'catk' ? (this.cStage === 3 ? 'rgba(255, 60, 80, ' : 'rgba(255, 216, 102, ') : (this.critBuff > 0 ? 'rgba(138, 232, 248, ' : (ELEM_COL[W.elem] || 'rgba(235, 248, 255, '));
      ctx.strokeStyle = col + (0.65 * (1 - Math.abs(tt - 0.45) * 2)).toFixed(2) + ')'; ctx.lineWidth = this.state === 'catk' ? (this.cStage === 3 ? 6 : 4) : (W.myth ? 3.5 : 2.5);
      ctx.beginPath(); ctx.arc(sh.x, sh.y, R, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
      if (W.myth && W.elem && this.state === 'atk') { ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sh.x, sh.y, R + 3, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke(); }
    }
  };
  function segD(px, py, ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? U.clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0; return U.dist(px, py, ax + dx * t, ay + dy * t); }
  MG.Player = P;
})(window);
