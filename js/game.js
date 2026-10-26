/* ==========================================================================
   game.js — 상태(타이틀/플레이) · 고정 루프 · 맵 전환(필드 ↔ 지하 던전 전실 ↔ 보스 둥지 · 심연의 투기장) · 카메라 · y 정렬 그리기 ·
             스마트 원버튼 상호작용 · 화톳불 휴식/전송 · 사망/부활 · 지역 진입 알림 · 비석/성소/상자(황금 씨앗) 보상 · 날씨(눈보라/재) · 저장 연동
   v83: 심연의 지하 미궁 · 영혼 수렵 파트너 · 붉은 폭풍의 밤 · 유물 · HD-2D 빛 패스와 암흑 방
   v82: [💬 대화](방랑 NPC) · [🔥 가호 받기](사신수의 성소) · 「🔓 고대 봉인 해제!」(전실 퍼즐 · 수문장) — 모두 같은 메인 버튼
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;

  var Game = MG.Game = {
    state: 'TITLE', time: 0, cam: { x: 0, y: 0 }, ctx: null, hint: null, biome: null, deadT: 0, titleT: 0, started: false,
    init: function (canvas) {
      this.canvas = canvas || null;
      if (canvas) { canvas.width = MG.W; canvas.height = MG.H; this.g = canvas.getContext('2d'); }
      MG.World.init('field'); MG.Enemies.spawnAll(); MG.Bosses.init(); MG.Player.init();
      this.state = 'TITLE';
      var self = this;
      MG.on('eliteDown', function (m) { self.onElite(m); });
      MG.on('bossDown', function (bo) { if (bo && bo.id === 'k1' && !bo.def.rush && MG.S && !MG.S.endingSeen) self.endingT = self.ENDING_DELAY; });   // v86 진 엔딩: 기사왕 카인(왕의 무덤) 첫 토벌
    },
    /* ---------------------------------------------------------------- 시작 */
    newGame: function () { MG.Save.newGame(); this.begin(); MG.Save.save(); },
    /* v86 타이틀의 「새로 시작」: 새 게임 + 도트 시네마틱 오프닝(10초 · 언제든 스킵) */
    newHunt: function () { this.newGame(); MG.S.introSeen = true; if (MG.Story) MG.Story.play('intro', function (skipped) { var G0 = MG.Game, P0 = MG.Player; G0.biome = MG.World.biomeAt(P0.x, P0.y); G0.mapRibbon = 'field'; if (MG.UI) MG.UI.ribbon('🔥 사냥꾼의 야영지 — 북쪽 [고대 뿌리 신전]의 거목부터 베어라', 2600); void skipped; }); },
    ENDING_DELAY: 2.8, endingT: 0,
    /* v86 진 엔딩: 남은 전리품은 모두 챙기고(맵을 옮겨도 잃지 않게) → 새벽 컷씬 → 야영지 위 엔딩 크레딧 */
    playEnding: function () {
      var S = MG.S, L = MG.Loot; this.endingT = 0; if (!MG.Story || S.endingSeen) return false;
      if (L) { L.list.slice().forEach(function (it) { if (it.kind !== 'blood') L.pick(it); }); L.list = L.list.filter(function (it) { return it.kind === 'blood'; }); }
      S.endingSeen = true; S.endings = (S.endings || 0) + 1; MG.Save.save();
      MG.Story.play('ending', function () { if (MG.UI) MG.UI.ribbon('🌅 새벽이 밝았다 — 수렵은 계속된다 (재수렵 · 심연의 투기장 보스 러시)', 3000); MG.Save.save(); });
      return true;
    },
    /* v86 패드 RB / RT: 화톳불 곁이면 「🔥 화톳불 전송」 */
    padWarp: function () {
      var P = MG.Player, W = MG.World, f = null; (W.bonfires || []).forEach(function (b) { if (b.lit && U.dist(P.x, P.y, b.x, b.y) < 54) f = b; });
      if (f && MG.UI && MG.UI.openWarp) { MG.UI.openWarp(f.id); return true; }
      if (MG.UI) MG.UI.ribbon('🔥 화톳불 전송은 불을 붙인 화톳불 곁에서 (RB)', 1600); return false;
    },
    continueGame: function () { if (!MG.Save.load()) MG.Save.newGame(); this.begin(); },
    begin: function () {
      var S = MG.S, W = MG.World;
      this.endingT = 0; this.gateLore = false; if (MG.Story && MG.Story.active) { MG.Story.active = null; MG.Story.setUi(false); }   // v86 이전 판의 컷씬 · 엔딩 대기는 넘어오지 않는다
      W.init('field'); this.applyFlags();
      MG.Enemies.spawnAll(); MG.Bosses.init(); MG.Shots.reset(); MG.Magic.reset(); MG.Loot.reset(); MG.FX.reset();
      MG.Player.init();
      var f = this.fire(S.lastFire) || W.bonfires[0], fresh = f === W.bonfires[0] && !S.crafted && S.gold === 0;
      MG.Player.place(fresh ? D.WORLD.START[0] : f.x, fresh ? D.WORLD.START[1] : f.y + 26);
      this.dropBlood();
      this.state = 'PLAY'; this.started = true; this.biome = null; this.deadT = 0; this.ctx = null; this.hint = null;
      if (MG.UI && MG.UI.closeModal) MG.UI.closeModal();
      if (MG.Tempest) MG.Tempest.reset(); if (MG.Companion) MG.Companion.spawn();
      this.snapCam();
      if (MG.UI) MG.UI.onBegin();
    },
    applyFlags: function () {
      var S = MG.S, W = MG.World;
      W.bonfires.forEach(function (b) { b.lit = !!S.lit[b.id]; });
      W.chests.forEach(function (c) { c.open = !!S.chests[c.id]; c.openT = 9; });
      W.steles.forEach(function (s) { s.used = !!S.steles[s.id]; });
      W.barriers.forEach(function (b) { if (S.barriers[b.id] || (b.kind === 'seal' && S.gates[b.id])) b.broken = true; });
      if (W.abyssGate) W.abyssGate.open = !!S.abyssOpen;
      if (W.kingGate) W.kingGate.open = this.kingReady();   // v84 왕의 무덤: 5대 괴수 토벌 뒤에
    },
    dropBlood: function () { var S = MG.S; if (S.blood && (S.blood.map || 'field') === MG.World.id) MG.Loot.blood(S.blood.x, S.blood.y, S.blood.n); },
    fire: function (id) { var L = MG.World.bonfires; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; },
    safeAt: function (x, y) { var L = MG.World.bonfires; for (var i = 0; i < L.length; i++) if (L[i].lit && U.dist(x, y, L[i].x, L[i].y) < 54) return true; return false; },
    paused: function () { return (MG.Forge && MG.Forge.open) || (MG.UI && MG.UI.modalOpen && MG.UI.modalOpen()) || !!(MG.Story && MG.Story.active); },

    /* ---------------------------------------------------------------- 맵 전환: 필드 ↔ 던전 전실 ↔ 보스 둥지 · 심연의 투기장 */
    enterMap: function (id, x, y, quiet) {
      var P = MG.Player, W = MG.World, wasArena = W.id === 'abyss';
      if (!D.MAPS[id]) return false;
      W.init(id); this.applyFlags();
      MG.Enemies.spawnAll(); MG.Shots.reset(); MG.Magic.reset(); MG.Loot.reset();
      if (wasArena && id !== 'abyss') { MG.Bosses.arena = null; MG.Bosses.arenaBoss = null; MG.Bosses.arenaDone = false; }
      if (id === 'abyss') MG.Bosses.startArena();
      P.toIdle(); P.storm = null; P.place(x, y); P.vx = 0; P.vy = 0;
      if (MG.NPC) MG.NPC.close();
      if (MG.Companion) MG.Companion.spawn();   // v83 파트너는 언제나 곁에
      this.dropBlood();
      this.snapCam(); this.biome = null; this.ctx = null; this.hint = null;
      if (MG.FX) { MG.FX.flash('#000000', 0.2); MG.FX.burst(P.x, P.y - 10, 18, ['#4deeea', '#eef6ff'], 60, { up: true, g: -20 }); }
      if (!quiet && MG.UI) MG.UI.ribbon(W.placeName(P.x, P.y), 2000);
      this.mapRibbon = W.id;
      MG.emit('map', id);
      return true;
    },
    /* 던전 입구(필드의 계단) 바로 아래 */
    stairsSpot: function (did) { var L = D.MAPS.field.stairs; for (var i = 0; i < L.length; i++) if (L[i].id === did) return { x: L[i].x, y: L[i].y + 30 }; var c = D.MAPS.field.bonfires[0]; return { x: c.x, y: c.y + 26 }; },
    goDown: function (st) { var M = D.MAPS[st.to]; return this.enterMap(st.to, M.arrive.down[0], M.arrive.down[1]); },
    useExit: function (e) {
      if (e.to === 'field' && e.at === 'tomb') { var KG = D.MAPS.field.kingGate; return this.enterMap('field', KG.x, KG.y + 30); }   // v84 왕의 무덤에서 귀환
      if (e.to === 'field') {
        var sp = e.at === 'abyss' ? { x: D.MAPS.field.abyssGate.x, y: D.MAPS.field.abyssGate.y + 28 } : this.stairsSpot(e.at);
        if (e.kind === 'altar' && MG.FX) MG.FX.flash('#4deeea', 0.15);
        return this.enterMap('field', sp.x, sp.y);
      }
      var M = D.MAPS[e.to], a = M.arrive[e.at] || M.arrive.in || M.arrive.down;
      return this.enterMap(e.to, a[0], a[1]);
    },
    /* 정예 수문장 처치 → 봉인문이 열린다(영구) */
    onElite: function (m) { if (m.gate) this.unseal(m.gate, 'elite', m); },
    /* v82 「🔓 고대 봉인 해제!」: 전실의 봉인 장치를 모두 켜거나 수문장을 쓰러뜨렸다 — 보스 둥지 문 + 전실 가운데 보물상자 */
    unseal: function (gate, why, m) {
      var S = MG.S, W = MG.World, FX = MG.FX; if (S.gates[gate]) return false;
      S.gates[gate] = true; W.openSeal(gate); if (MG.Gimmick) MG.Gimmick.lightAll(gate);
      var b = W.barrierById(gate), cx = b ? b.x + b.w / 2 : MG.Player.x, cy = b ? b.y + b.h + 12 : MG.Player.y - 30;
      if (FX) { var P0 = MG.Player; FX.text(P0.x, P0.y - 46, '🔓 고대 봉인 해제!', '#bff6ff', 1.8, 17, { pop: true, rise: 6 }); FX.burst(cx, cy, 30, ['#8ae8f8', '#e4fdff', '#c4a8ff'], 120); FX.flash('#bff6ff', 0.12); FX.shake(3, 0.3); }
      W.chests.forEach(function (c) { if (c.sealed === gate && !c.open && FX) { FX.burst(c.x, c.y - 8, 26, ['#ffd866', '#c4a8ff', '#fff6c0'], 100, { up: true }); FX.ring(c.x, c.y - 6, 4, 26, 0.5, '#ffd866', 2); FX.text(c.x, c.y - 26, '📦 보물상자가 깨어났다', '#ffd866', 1.4, 11); } });
      if (MG.SFX) MG.SFX.crash();
      if (MG.UI) MG.UI.ribbon('🔓 고대 봉인 해제! — 둥지 문 · 보물상자 개방', 2600);
      MG.emit('unseal', gate, why);
      if (MG.Save) MG.Save.save();
      return true;
    },

    /* ---------------------------------------------------------------- 한 걸음(테스트도 이걸 부른다) */
    step: function (dt) {
      var I = MG.Input, b = I.b;
      dt = Math.min(0.05, dt);
      I.update(dt);
      this.time += dt;
      if (this.state === 'TITLE') { this.titleT += dt; I.endFrame(); return; }
      if (MG.Story && MG.Story.active) { MG.Story.update(dt, b); I.endFrame(); return; }   // v86 컷씬(오프닝 · 진 엔딩) — 월드는 멈춘다
      if (b.menu.pressed && !(MG.Forge && MG.Forge.open) && MG.UI) MG.UI.toggleStatus();
      if (MG.Forge && MG.Forge.open) {
        if (b.esc.pressed) MG.Forge.close();
        if (b.act.pressed) { if (MG.Forge.craft) MG.Forge.key(true); else MG.Forge.startMake(); }
        if (b.act.released) MG.Forge.key(false);
        MG.Forge.update(dt);
      } else if (MG.UI && MG.UI.modalOpen && MG.UI.modalOpen()) {
        if (b.esc.pressed) MG.UI.closeModal();
      } else this.updateWorld(dt);
      MG.FX.update(dt, dt * MG.FX.timeScale());
      I.endFrame();
      if (MG.UI) MG.UI.syncHud();
    },
    hasFlags: function () { var S = MG.S, W = MG.Combat.weapon().def; return { fire: S.spells.indexOf('fire') >= 0, frost: S.spells.indexOf('frost') >= 0, fireWeapon: W.elem === 'fire' }; },
    updateWorld: function (dt) {
      var P = MG.Player, I = MG.Input, gdt = dt * MG.FX.timeScale(), W = MG.World;
      if (I.b.cycle.pressed) this.cycleSpell();
      // 스마트 상호작용: 멈춰 서 있을 때(또는 걷는 중) 가장 가까운 대상 — 머리 위 말풍선 + 메인 버튼 아이콘
      this.ctx = P.alive() && P.state === 'idle' ? W.interactAt(P.x, P.y) : null;
      this.hint = !this.ctx && P.alive() ? W.hintAt(P.x, P.y, this.hasFlags()) : null;
      P.update(gdt, dt);   // 워치독은 실제 시간으로
      if (MG.NPC) MG.NPC.update(gdt);   // v82: 대화 바 — 걸어서 멀어지면 저절로 닫힌다
      if (MG.Companion) MG.Companion.update(gdt); if (MG.Tempest) MG.Tempest.update(gdt); if (MG.Forge && MG.Forge.discover) MG.Forge.discover();   // v83 · v84 무기 파생 해금 감시
      MG.Enemies.update(gdt); MG.Bosses.update(gdt); MG.Shots.update(gdt); MG.Magic.update(gdt); MG.Loot.update(gdt); W.update(gdt);
      // 지역 진입(젤다식 지역 이름) — 필드에서만 바이옴이 바뀐다
      if (W.isField()) {
        var bio = W.biomeAt(P.x, P.y);
        if (bio !== this.biome) { if (MG.UI && (this.biome !== null || this.mapRibbon !== 'field')) MG.UI.ribbon(W.placeName(P.x, P.y), 2000); this.biome = bio; this.mapRibbon = 'field'; }
      }
      // 부서진 장벽 기록
      W.barriers.forEach(function (b) { if (b.broken && b.kind !== 'seal' && !MG.S.barriers[b.id]) { MG.S.barriers[b.id] = true; if (MG.Save) MG.Save.save(); } });
      // v86 왕의 무덤 봉인 서사: 닫힌 문 앞에 서면 「다섯 괴수의 혼이 사슬을 붙들고 있다」 한 줄(가까이 올 때마다 한 번)
      var KG = W.kingGate; if (KG && !KG.open) { var kd = U.dist(P.x, P.y, KG.x, KG.y); if (kd < 60 && !this.gateLore) { this.gateLore = true; var nd = this.bossesDown(); if (MG.UI) MG.UI.ribbon('⛓ 다섯 괴수의 혼이 왕의 무덤 봉인을 붙들고 있다 — 끊어진 사슬 ' + nd + '/5', 2600); } else if (kd > 140) this.gateLore = false; }
      if (this.endingT > 0) { this.endingT -= dt; if (this.endingT <= 0) this.playEnding(); }   // v86 진 엔딩(카인 토벌 2.8초 뒤 — 전리품 분수가 끝난 다음)
      this.updateCam(dt);
    },
    cycleSpell: function () {
      var S = MG.S; if (S.spells.length < 2) { if (MG.FX) MG.FX.text(MG.Player.x, MG.Player.y - 34, '아직 다른 마법이 없다', '#c8b898', 0.7, 10); return false; }
      S.spellSel = (S.spellSel + 1) % S.spells.length;
      if (MG.FX) MG.FX.text(MG.Player.x, MG.Player.y - 34, '✨ ' + D.SPELLS[S.spells[S.spellSel]].name, '#bff6ff', 0.9, 11);
      return true;
    },

    /* ---------------------------------------------------------------- 상호작용(메인 버튼 = 그 일) */
    interact: function (c) {
      var P = MG.Player, S = MG.S, o = c.obj, k;
      if (c.kind === 'bonfire') { this.rest(o); return; }
      if (c.kind === 'forge') { MG.Forge.openShop(); return; }
      if (c.kind === 'stairs') { this.goDown(o); return; }
      if (c.kind === 'exit') { this.useExit(o); return; }
      if (c.kind === 'abyss') { var A = D.MAPS.abyss.arrive.in; this.enterMap('abyss', A[0], A[1]); return; }
      if (c.kind === 'tomb') { var KT = D.MAPS.kingtomb.arrive.in; this.enterMap('kingtomb', KT[0], KT[1]); return; }   // v84 ⚔️ 왕의 무덤
      if (c.kind === 'npc') { MG.NPC.talk(o); return; }          // v82 [💬 대화]
      if (c.kind === 'beast') { MG.Gimmick.bless(o); return; }   // v82 [🔥 가호 받기]
      if (c.kind === 'fell') { P.state = 'gather'; P.st = 0; P.combo = 0; P.face(o.x - P.x, o.y - P.y); MG.World.chop(o.ref); if (MG.Audio && MG.Audio.playShellClink) try { MG.Audio.playShellClink(); } catch (e) { /* 무음 */ } return; }
      if (c.kind === 'chest') {
        o.open = true; o.openT = 0; S.chests[o.id] = true;
        var r = o.reward;
        if (MG.FX) { MG.FX.burst(o.x, o.y - 8, 20, ['#ffd866', '#fff6c0', '#c08a34'], 90, { up: true }); MG.FX.shake(1.5, 0.12); }
        if (MG.Audio && MG.Audio.playTreasureOpen) try { MG.Audio.playTreasureOpen(); } catch (e) { /* 무음 */ }
        if (r.gold) for (k = 0; k < Math.ceil(r.gold / 10); k++) MG.Loot.drop(o.x, o.y - 6, 'gold', null, 10, { fountain: true });
        if (r.mats) for (var m in r.mats) MG.Loot.drop(o.x, o.y - 6, 'mat', m, r.mats[m], { fountain: true });
        if (r.spell) this.learn(r.spell);
        if (r.relic) this.gainRelic(r.relic);   // v83 유물
        if (r.seed) this.seed(o);
        else if (r.estus) { S.estusMax = Math.min(D.PLAYER.ESTUS_MAX, S.estusMax + r.estus); P.estus += r.estus; if (MG.UI) MG.UI.ribbon('🧪 에스트 병이 늘었다 — 최대 ' + S.estusMax + '병', 2200); }
        else if (!r.spell && MG.UI) MG.UI.ribbon('📦 보물상자를 열었다', 1600);
        MG.Save.save(); return;
      }
      if (c.kind === 'stele') {
        if (o.kind === 'shrine') { this.shrine(o); return; }
        if (o.kind === 'spell') { o.used = true; S.steles[o.id] = true; this.learn(o.spell); MG.Save.save(); return; }
        var pool = D.RUNE_ORDER.filter(function (rr) { return S.runes.indexOf(rr) < 0; }), pick = [];
        while (pool.length && pick.length < 3) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        if (!pick.length) { o.used = true; S.steles[o.id] = true; return; }
        if (MG.UI) MG.UI.openRunes(pick, function (rid) { S.runes.push(rid); o.used = true; S.steles[o.id] = true; MG.UI.ribbon(D.RUNES[rid].icon + ' ' + D.RUNES[rid].name + ' 각인 — ' + D.RUNES[rid].desc, 2400); MG.Save.save(); });
        return;
      }
      if (c.kind === 'node') {
        var inf = MG.World.NODE_INFO[o.type], n = inf.n[0] + Math.floor(Math.random() * (inf.n[1] - inf.n[0] + 1));
        o.taken = true; o.shakeT = 0.3;
        P.state = 'gather'; P.st = 0; P.combo = 0; P.face(o.x - P.x, o.y - P.y);
        if (MG.FX) { MG.FX.burst(o.x, o.y - 10, 12, o.type === 'tree' ? ['#965e30', '#4fa854', '#c08a4e'] : o.type === 'herb' ? ['#8ad070', '#4fa854'] : o.type === 'gold' ? ['#ffd866', '#fff6c0', '#6c7684'] : o.type === 'frost' ? ['#e4fdff', '#8ae8f8', '#ffffff'] : o.type === 'lava' ? ['#ff7424', '#ffb238', '#2a2430'] : ['#c4ccd6', '#6c7684', '#c4a8ff'], 70); MG.FX.text(o.x, o.y - 24, inf.emo + ' ' + inf.label + '!', '#ffe9b8', 0.7, 11); }
        if (MG.Audio && MG.Audio.playShellClink) try { MG.Audio.playShellClink(); } catch (e) { /* 무음 */ }
        MG.Loot.drop(o.x, o.y - 8, 'mat', inf.mat, n);
        return;
      }
    },
    /* v84 왕의 무덤의 봉인: 5대 괴수(거목 · 골렘 · 가시 군주 · 서리 송곳니 · 폭풍룡)를 모두 토벌하면 풀린다 */
    bossesDown: function () { var S = MG.S, n = 0; D.BOSSES.forEach(function (b) { if (S.bosses[b.id] && S.bosses[b.id].kills > 0) n++; }); return n; },
    kingReady: function () { return this.bossesDown() >= D.KING_GATE_NEED; },
    /* v83 🏺 유물 획득: 처음 얻으면 바로 장착(빈 손일 때) — 📜 장비 창에서 언제든 바꾼다 */
    gainRelic: function (id) {
      var S = MG.S, R = D.RELICS[id], P = MG.Player; if (!R) return false;
      S.relics = S.relics || []; if (S.relics.indexOf(id) >= 0) return false;
      S.relics.push(id); if (!S.relic) S.relic = id;
      if (MG.FX) { MG.FX.flash('#ffd866', 0.12); MG.FX.ring(P.x, P.y - 10, 4, 34, 0.6, '#ffd866', 3); MG.FX.text(P.x, P.y - 46, R.icon + ' ' + R.name, '#ffd866', 1.6, 13, { pop: true }); }
      if (MG.UI) MG.UI.ribbon('🏺 유물 획득 — ' + R.icon + ' ' + R.name, 2400);
      MG.emit('relic', id); if (MG.Save) MG.Save.save();
      return true;
    },
    equipRelic: function (id) { var S = MG.S; if (id && (S.relics || []).indexOf(id) < 0) return false; S.relic = id || null; if (MG.Save) MG.Save.save(); return true; },
    /* 🧪 황금 씨앗: 에스트 최대 개수가 영구히 +1(3 → 최대 7) — 레벨업을 대신하는 탐험 보상 */
    seed: function (o) {
      var S = MG.S, P = MG.Player, before = S.estusMax;
      S.seeds = (S.seeds || 0) + 1; S.estusMax = Math.min(D.PLAYER.ESTUS_MAX, S.estusMax + 1); P.estus = Math.min(S.estusMax, P.estus + (S.estusMax - before));
      if (MG.FX) { MG.FX.flash('#ffd866', 0.15); MG.FX.ring(P.x, P.y - 10, 4, 34, 0.6, '#ffd866', 3); MG.FX.burst(o.x, o.y - 12, 26, ['#ffd866', '#fff6c0', '#7dff9a'], 100, { up: true, g: -30 }); }
      if (MG.UI) MG.UI.ribbon('🧪 황금 씨앗! 에스트 물약 최대 ' + S.estusMax + '병' + (S.estusMax >= D.PLAYER.ESTUS_MAX ? ' (최대)' : ''), 2600);
    },
    /* ⛩️ 고대 성소: 최대 HP/MP/SP 통이 영구히 커진다 */
    shrine: function (o) {
      var S = MG.S, P = MG.Player, C = D.PLAYER.SHRINE, txt = [];
      o.used = true; S.steles[o.id] = true; S.bonus = S.bonus || { hp: 0, mp: 0, sp: 0 };
      for (var k in o.boost) { S.bonus[k] = (S.bonus[k] || 0) + o.boost[k]; txt.push((k === 'hp' ? '❤️ 최대 HP +' : k === 'mp' ? '🔷 최대 MP +' : '🟢 최대 SP +') + C[k] * o.boost[k]); }
      P.refreshStats(false); P.hp = P.maxHp; P.mp = P.maxMp; P.sp = P.maxSp;
      if (MG.FX) { MG.FX.flash('#fff3c0', 0.15); MG.FX.ring(o.x, o.y - 16, 4, 40, 0.7, '#ffd866', 3); MG.FX.burst(o.x, o.y - 20, 30, ['#ffd866', '#fff6c0', '#ffffff'], 110, { up: true, g: -30 }); }
      if (MG.UI) MG.UI.ribbon('⛩️ 고대 성소 — ' + txt.join(' · '), 2600);
      MG.Save.save();
    },
    learn: function (id) {
      var S = MG.S; if (S.spells.indexOf(id) >= 0) return;
      S.spells.push(id); S.spellSel = S.spells.length - 1;
      if (MG.FX) { MG.FX.flash('#bff6ff', 0.15); MG.FX.ring(MG.Player.x, MG.Player.y - 8, 4, 40, 0.6, '#8ae8f8', 3); }
      if (MG.UI) MG.UI.ribbon('✨ 새 비전 마법 — ' + D.SPELLS[id].name + '! (' + D.SPELLS[id].desc + ')', 2600);
    },
    /* 화톳불: 불을 붙이고 쉰다 — 체력/마력/기력/에스트 회복, 몬스터 · 토벌한 보스 · 채집 지점이 되살아난다(싸우던 보스는 그대로) */
    rest: function (b) {
      var P = MG.Player, S = MG.S, first = !b.lit;
      b.lit = true; S.lit[b.id] = true; S.lastFire = b.id;
      P.hp = P.maxHp; P.mp = P.maxMp; P.sp = P.maxSp; P.estus = S.estusMax; P.toIdle(); P.resetCooldowns(); S.phoenixUsed = false;   // v82: 마법 대기시간 · 주작의 재탄생도 다시
      MG.Enemies.spawnAll(); MG.Bosses.respawn(); MG.World.regrow(); MG.Shots.reset();
      if (MG.FX) { MG.FX.flash('#ffb060', 0.18); MG.FX.burst(b.x, b.y - 14, 26, ['#ffb238', '#ffe890', '#ff7424'], 70, { up: true, g: -40 }); }
      if (MG.UI) MG.UI.ribbon(first ? '🔥 화톳불 점화 — ' + b.name : '🔥 휴식 — 체력 · 마력 · 에스트 회복 (적이 되살아났다)', 2200);
      MG.emit('rest', b);
      MG.Save.save();
      if (MG.UI && MG.UI.openWarp) MG.UI.openWarp(b.id);   // 쉬고 나면 「🔥 화톳불 전송」 고르기
    },
    /* 화톳불 전송(Fast Travel): 불을 붙인 화톳불로만(5곳). 도착 자리는 화톳불 바로 아래의 막히지 않은 곳. */
    warpSpot: function (f) {
      var W = MG.World, tries = [[0, 26], [0, 34], [22, 22], [-22, 22], [26, 0], [-26, 0], [0, -26]];
      for (var i = 0; i < tries.length; i++) { var x = f.x + tries[i][0], y = f.y + tries[i][1]; if (!W.blocked(x, y, MG.Player.r) && !W.barrierNear(x, y, MG.Player.r + 2)) return { x: x, y: y }; }
      var p = W.resolve(f.x, f.y + 30, MG.Player.r); return { x: p.x, y: p.y };
    },
    warp: function (id) {
      var P = MG.Player, S = MG.S;
      if (!MG.World.isField()) { var df = MG.World.bonfire(id); if (!df || !S.lit[id]) return false; this.enterMap('field', df.x, df.y + 26, true); }
      var f = this.fire(id);
      if (!f || !f.lit) return false;
      if (MG.FX) MG.FX.ring(P.x, P.y - 10, 4, 34, 0.5, '#4deeea', 3);
      var spot = this.warpSpot(f);
      P.toIdle(); P.place(spot.x, spot.y); P.vx = 0; P.vy = 0; P.face(0, 1);
      S.lastFire = id; MG.Shots.reset(); MG.Magic.reset();
      this.snapCam(); this.biome = MG.World.biomeAt(P.x, P.y);
      if (MG.FX) { MG.FX.flash('#4deeea', 0.15); MG.FX.ring(P.x, P.y - 10, 30, 4, 0.5, '#eef6ff', 2); MG.FX.burst(P.x, P.y - 12, 26, ['#4deeea', '#eef6ff', '#8aa4c8'], 80, { up: true, g: -30 }); }
      if (MG.UI) MG.UI.ribbon('🌀 영혼의 폭풍을 타고 — ' + f.name + '(으)로 전송', 2200);
      MG.Save.save();
      MG.emit('warp', f);
      return true;
    },
    onDeath: function () {
      var P = MG.Player, S = MG.S;
      this.deadT = 0;
      if (S.gold > 0) { S.blood = { x: Math.round(P.x), y: Math.round(P.y), n: S.gold, map: MG.World.id }; MG.Loot.blood(P.x, P.y, S.gold); S.gold = 0; }
      if (MG.FX) { MG.FX.slow(0.4, 0.8); MG.FX.shake(4, 0.4); }
      MG.Save.save();
    },
    /* 사망 → 마지막 화톳불에서 깨어난다. 보스는 오직 이때만 처음 상태로 돌아간다(싸우던 보스 · 투기장). */
    respawn: function () {
      var P = MG.Player, S = MG.S, fid = S.lastFire, df = MG.World.bonfire(fid) || D.MAPS.field.bonfires[0];
      MG.Bosses.list.concat(MG.Bosses.extra || []).forEach(function (b) { if (b.alive && b.engaged) b.disengage(); });
      if (MG.Tempest && MG.Tempest.on) MG.Tempest.end(false, true);
      MG.Bosses.arena = null; MG.Bosses.arenaBoss = null; MG.Bosses.arenaDone = false;
      if (!MG.World.isField()) this.enterMap('field', df.x, df.y + 26, true);
      var f = this.fire(fid) || MG.World.bonfires[0];
      P.init(); P.place(f.x, f.y + 26); S.phoenixUsed = false; if (MG.NPC) MG.NPC.close();
      MG.Enemies.spawnAll(); MG.Shots.reset(); MG.Magic.reset();
      this.snapCam();
      if (MG.UI) MG.UI.ribbon('🔥 ' + f.name + '에서 깨어났다 — 핏자국에서 골드를 되찾자', 2200);
    },

    /* ---------------------------------------------------------------- 카메라 */
    camTarget: function () { var P = MG.Player, W = MG.World; return { x: W.W <= MG.VW ? (W.W - MG.VW) / 2 : U.clamp(P.x - MG.VW / 2, 0, W.W - MG.VW), y: W.H <= MG.VH ? (W.H - MG.VH) / 2 : U.clamp(P.y - MG.VH / 2 - 8, 0, W.H - MG.VH) }; },
    snapCam: function () { var t = this.camTarget(); this.cam.x = t.x; this.cam.y = t.y; },
    updateCam: function (dt) { var t = this.camTarget(), k = Math.min(1, dt * 8); this.cam.x += (t.x - this.cam.x) * k; this.cam.y += (t.y - this.cam.y) * k; },

    /* ---------------------------------------------------------------- 그리기 */
    render: function () {
      var g = this.g; if (!g) return;
      var t = this.time;
      g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
      if (this.state === 'TITLE') { this.renderTitle(g, t); return; }
      var ST = MG.Story; if (ST && ST.active && !ST.worldBg()) { ST.render(g, t); return; }   // v86 컷씬(크레딧은 야영지 월드 위에)
      if (MG.Forge.open) {   // v81: 화면 가운데 360×640 작업대 — 둘레는 대장간 돌벽과 화덕 불빛이 화면 끝까지
        var fs = Math.min(1, MG.H / 640, MG.W / 360);
        MG.Forge.view = { fs: fs, ox: Math.round((MG.W - 360 * fs) / 2), oy: Math.round((MG.H - 640 * fs) / 2) };
        MG.Forge.render(g, t); return;
      }
      var sh = MG.FX.shakeOffset(), cam = { x: Math.round(this.cam.x * MG.Z) / MG.Z, y: Math.round(this.cam.y * MG.Z) / MG.Z }, W = MG.World;
      g.fillStyle = W.isField() ? '#1a2a1a' : '#06070c'; g.fillRect(0, 0, MG.W, MG.H);
      var vw = MG.FX.view(cam); this.camZoom = vw.s / MG.Z;   // v85 다이내믹 액션 카메라: 임팩트 줌(타격 지점 중심) + 방향성 카메라 펀치
      g.setTransform(vw.s, 0, 0, vw.s, vw.ox + sh.x, vw.oy + sh.y);
      W.drawVoid(g, cam, t);   // v81: 맵이 화면보다 좁으면(던전 방) 바깥은 어두운 심연 석재 + 안개
      W.drawGround(g, cam, t);
      W.drawLights(g, cam, t);
      MG.FX.drawGround(g); MG.Shots.drawGround(g, t); MG.Magic.drawGround(g, t); MG.Enemies.drawWarn(g); MG.Bosses.drawWarn(g, t); MG.Player.drawLock(g, t);
      var list = [], P = MG.Player;
      W.collect(list, cam); MG.Loot.collect(list, cam); MG.Enemies.collect(list, cam); MG.Bosses.collect(list, cam); if (MG.Companion) MG.Companion.collect(list, cam);
      list.push({ y: P.y, o: P, f: function (ctx, o, tt) { o.draw(ctx, tt); } });
      list.sort(function (a, b) { return a.y - b.y; });
      for (var i = 0; i < list.length; i++) list[i].f(g, list[i].o, t);
      P.drawGhosts(g);
      MG.Shots.draw(g, t); MG.Magic.drawAir(g, t); MG.FX.drawWorld(g);
      if (W.drawLightsAfter) W.drawLightsAfter(g, cam, t);   // v83 HD-2D 동적 광원(가산)
      // 화면 좌표
      g.setTransform(1, 0, 0, 1, 0, 0);
      var bio = W.biomeAt(P.x, P.y);
      this.drawWeather(g, bio, cam, t);
      if (MG.Tempest) MG.Tempest.drawSky(g, cam, t);   // v83 붉은 폭풍의 밤
      var th = !W.isField() && W.THEME[W.map.theme], vg = g.createRadialGradient && g.createRadialGradient(MG.W / 2, MG.H / 2, Math.min(MG.W, MG.H) * 0.42, MG.W / 2, MG.H / 2, Math.max(MG.W, MG.H) * 0.66);
      var VCOL = { ruins: 'rgba(40, 6, 10, 0.32)', crystal: 'rgba(10, 8, 40, 0.28)', forest: 'rgba(4, 16, 8, 0.24)', glacier: 'rgba(20, 40, 70, 0.3)', volcano: 'rgba(40, 6, 4, 0.38)' };
      if (vg && vg.addColorStop) { vg.addColorStop(0, 'rgba(0, 0, 0, 0)'); vg.addColorStop(1, th ? 'rgba(0, 0, 0, 0.6)' : VCOL[bio]); g.fillStyle = vg; g.fillRect(0, 0, MG.W, MG.H); }
      if (th) { g.fillStyle = th.fog; g.fillRect(0, 0, MG.W, MG.H); }
      this.drawBubble(g, cam, t);
      MG.FX.drawScreen(g, cam);
      if (P.state === 'dead') {
        var a = U.clamp(P.st / 0.8, 0, 1);
        g.fillStyle = 'rgba(0, 0, 0, ' + (0.45 * a).toFixed(2) + ')'; g.fillRect(0, MG.H / 2 - 70, MG.W, 90);
        g.globalAlpha = a; g.font = '30px Galmuri11, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c8243a'; g.fillText('사 망 했 다', MG.W / 2, MG.H / 2 - 25); g.globalAlpha = 1;
      }
      if (ST && ST.active) ST.render(g, t);   // v86 엔딩 크레딧(야영지 위로 올라간다)
    },
    /* 날씨(화면 좌표, 상태 없음): ❄️ 빙하 협곡 = 비스듬한 눈보라 · 🌋 용화산 = 떠오르는 재와 불티 · 얼음 궁전 = 가는 눈 */
    drawWeather: function (g, bio, cam, t) {
      var i, n, W = MG.World, theme = !W.isField() && W.map.theme;
      if (bio === 'glacier' || theme === 'ice') {
        var aw = MG.W + 40, ah = MG.H + 60, ar = Math.max(1, MG.W * MG.H / (360 * 640));
        n = Math.round((bio === 'glacier' ? 120 : 50) * ar);
        for (i = 0; i < n; i++) {
          var sp = 60 + (i % 5) * 18, ph = (t * sp + i * 97) % ah, x = ((((i * 53 + cam.x * 2.2 + ph * 0.55) % aw) + aw) % aw) - 20, y = ((ph + i * 31 - cam.y * 2) % ah + ah) % ah - 30;
          g.fillStyle = i % 4 ? 'rgba(240, 248, 255, 0.75)' : 'rgba(200, 230, 255, 0.5)'; g.fillRect(Math.round(x), Math.round(y), i % 7 === 0 ? 3 : 2, i % 7 === 0 ? 3 : 2);
        }
        if (bio === 'glacier') { g.fillStyle = 'rgba(220, 236, 255, ' + (0.08 + 0.04 * Math.sin(t * 0.7)).toFixed(3) + ')'; g.fillRect(0, 0, MG.W, MG.H); }
      } else if (bio === 'volcano' || theme === 'storm') {
        var bw = MG.W + 20, nA = Math.round(70 * Math.max(1, MG.W * MG.H / (360 * 640)));
        for (i = 0; i < nA; i++) {
          var life = 5 + (i % 4), q = ((t + i * 0.73) % life) / life, ax = ((i * 71 - cam.x * 2) % bw + bw) % bw - 10 + Math.sin(t + i) * 10, ay = MG.H + 20 - q * (MG.H + 60);
          g.globalAlpha = Math.sin(q * Math.PI) * 0.8; g.fillStyle = i % 3 ? '#4a4048' : (i % 2 ? '#ff7424' : '#ffb238'); g.fillRect(Math.round(ax), Math.round(ay), 2, 2);
        }
        g.globalAlpha = 1;
      }
    },
    /* 머리 위 작은 말풍선(📦열기 · 🪓벌목 · ⛏️채광 · 🔥화톳불 · 🔨대장간 · 🕳️내려가기) 또는 안내(💥 모아베기로 부수기) */
    drawBubble: function (g, cam, t) {
      var c = this.ctx || this.hint, P = MG.Player; if (!c || this.paused()) return;   // 창이 열려 시간이 멈춘 동안에는 말풍선을 감춘다
      var an = c.kind === 'npc' && c.obj ? c.obj : P, pj = MG.FX.project(an.x, an.y, cam), sx = pj.x, sy = pj.y - (an === P ? 74 : 86) + Math.round(Math.sin(t * 4) * 2), act = !!this.ctx;   // v82: NPC 앞이면 말풍선은 NPC 머리 위에
      g.font = '12px Galmuri11, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
      var txt = c.label, w = Math.ceil(g.measureText ? g.measureText(txt).width : txt.length * 12) + 30, h = 22, x = Math.round(U.clamp(sx - w / 2, 4, MG.W - w - 4)), y = Math.round(sy);
      g.fillStyle = act ? 'rgba(20, 14, 8, 0.9)' : 'rgba(10, 10, 16, 0.72)'; g.fillRect(x, y, w, h);
      g.strokeStyle = act ? '#ffd866' : 'rgba(200, 200, 220, 0.6)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = act ? 'rgba(20, 14, 8, 0.9)' : 'rgba(10, 10, 16, 0.72)'; g.beginPath(); g.moveTo(sx - 5, y + h); g.lineTo(sx + 5, y + h); g.lineTo(sx, y + h + 6); g.closePath(); g.fill();
      var S = MG.Sprites;
      if (act && c.rb && c.icon && S && S.ready('rb') && S.item('rb', c.icon)) S.draw(g, 'rb', c.icon, x + 12, y + 11, false, 1);
      else if (act && c.icon && S && S.ready('icons') && S.item('icons', c.icon)) S.draw(g, 'icons', c.icon, x + 4, y + 3, false, 1); else { g.font = '12px sans-serif'; g.fillStyle = '#fff'; g.fillText(c.emo, x + 5, y + h / 2 + 1); g.font = '12px Galmuri11, sans-serif'; }
      g.fillStyle = act ? '#fff3c0' : '#d8d8e8'; g.fillText(txt, x + 24, y + h / 2 + 1);
    },
    /* 타이틀(v79 → v81 풀스크린): 『SOUL TEMPEST』 — 화톳불 · 기사 · 바닥 타일 없이, 심연의 남색(#060913)이 화면 전체(레터박스 없음)를 덮는다.
       화면 가운데 360×640 기둥(.tt-col)에 문장 · 로고 · 버튼이 서고, 캔버스는 그 둘레 전체에 폭풍을 그린다:
       문장을 감싸 도는 칼바람 줄기 · 화면을 대각선으로 가로지르며 몰아치는 영혼의 칼바람(Wind Streaks) · 흘러가는 푸른 불씨와 은빛 재 · 남빛 안개. */
    titleFrame: function () {
      var W = MG.W, H = MG.H, fs = Math.min(1, H / 640, W / 360), top = (H - 640 * fs) / 2;
      return { W: W, H: H, fs: fs, CX: W / 2, CY: top + 184 * fs };
    },
    renderTitle: function (g, t) {
      var i, k, F = this.titleFrame(), W = F.W, H = F.H, CX = F.CX, CY = F.CY, fs = F.fs, area = W * H / (360 * 640);
      var bg = g.createLinearGradient && g.createLinearGradient(0, 0, 0, H);
      if (bg && bg.addColorStop) { bg.addColorStop(0, '#04060d'); bg.addColorStop(0.45, '#060913'); bg.addColorStop(1, '#0a1124'); g.fillStyle = bg; } else g.fillStyle = '#060913';
      g.fillRect(0, 0, W, H);
      // 문장 뒤의 차가운 청록 후광(숨 쉰다) + 아주 가끔 구름 속 번개빛
      var br = 0.5 + 0.5 * Math.sin(t * 0.8), flick = (Math.sin(t * 0.37) > 0.985) ? 0.12 : 0;
      var halo = g.createRadialGradient && g.createRadialGradient(CX, CY, 8, CX, CY, 230 * fs + Math.max(0, W - 360) * 0.25);
      if (halo && halo.addColorStop) { halo.addColorStop(0, 'rgba(77, 238, 234, ' + (0.09 + 0.05 * br + flick).toFixed(3) + ')'); halo.addColorStop(0.45, 'rgba(60, 90, 140, 0.06)'); halo.addColorStop(1, 'rgba(0, 0, 0, 0)'); g.fillStyle = halo; g.fillRect(0, 0, W, H); }
      var nStars = Math.round(26 * area);
      for (i = 0; i < nStars; i++) { var sx = (i * 151 + 37) % W, sy = (i * 97 + 11) % Math.max(1, H * 0.6), tw = 0.25 + 0.75 * Math.abs(Math.sin(t * 0.7 + i * 2.3)); g.fillStyle = 'rgba(200, 220, 255, ' + (0.16 * tw).toFixed(3) + ')'; g.fillRect(Math.round(sx), Math.round(sy), 1, 1); }
      // 화면 전체를 대각선(왼쪽 아래 → 오른쪽 위)으로 몰아치는 영혼의 칼바람 줄기
      var ang = -0.42, ca = Math.cos(ang), sa = Math.sin(ang), span = W + H, nStreak = Math.round(44 * Math.max(1, area * 0.8));
      g.lineCap = 'round';
      for (k = 0; k < nStreak; k++) {
        var spd = 120 + (k % 5) * 45, len = 40 + (k % 4) * 26, prog = ((t * spd + k * 211) % (span * 1.2 + 200)) - 100, lane = ((k * 97 + 13) % 101) / 101 * (span * 1.2) - span * 0.95;
        var x0 = ca * prog - sa * lane, y0 = H + sa * prog + ca * lane;   // 왼쪽 아래에서 오른쪽 위로, lane 은 바람에 수직인 차선
        if (x0 < -len || x0 > W + len || y0 < -len || y0 > H + len) continue;
        g.strokeStyle = k % 3 === 0 ? 'rgba(238, 246, 255, 0.11)' : 'rgba(77, 238, 234, ' + (0.07 + 0.04 * (k % 2)).toFixed(2) + ')';
        g.lineWidth = k % 4 === 0 ? 2 : 1;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + ca * len, y0 + sa * len); g.stroke();
      }
      // 영혼의 폭풍: 문장 둘레를 도는 칼바람 줄기(나선으로 감겨 들어가는 호, 바깥은 은백 · 안쪽은 청록)
      for (k = 0; k < 18; k++) {
        var spin = t * (0.35 + (k % 4) * 0.08) * (k % 2 ? 1 : 1.15), R = (108 + (k % 6) * 22 + Math.sin(t * 0.6 + k) * 6) * fs;
        var a0 = k * 2.1 + spin, ln = 0.5 + (k % 3) * 0.28;
        g.strokeStyle = k % 3 === 0 ? 'rgba(238, 246, 255, 0.16)' : 'rgba(77, 238, 234, ' + (0.10 + 0.05 * (k % 2)).toFixed(2) + ')';
        g.lineWidth = k % 4 === 0 ? 2 : 1;
        g.beginPath(); g.ellipse(CX, CY + 6 * fs, R, R * 0.72, -0.18, a0, a0 + ln); g.stroke();
      }
      g.lineCap = 'butt';
      // 낮게 깔리는 남빛 안개(화면 폭 전체로 겹겹이 흘러간다)
      var nFog = Math.round(8 * Math.max(1, W / 360));
      for (k = 0; k < nFog; k++) {
        var fsp = 5 + k * 2.2, fxp = ((t * fsp + k * 97) % (W + 200)) - 100, fyp = H * 0.73 + (k % 4) * 42 * fs + Math.sin(t * 0.3 + k) * 8, rw = 150 + (k % 3) * 40;
        var fogG = g.createRadialGradient && g.createRadialGradient(fxp, fyp, 4, fxp, fyp, rw);
        if (fogG && fogG.addColorStop) { fogG.addColorStop(0, 'rgba(70, 96, 140, ' + (0.10 + 0.03 * (k % 2)).toFixed(3) + ')'); fogG.addColorStop(1, 'rgba(70, 96, 140, 0)'); g.fillStyle = fogG; g.save(); g.translate(fxp, fyp); g.scale(1, 0.3); g.translate(-fxp, -fyp); g.fillRect(fxp - rw, fyp - rw, rw * 2, rw * 2); g.restore(); }
      }
      // 떠오르는 영혼 입자(청록)와 은빛 재 — 바람에 비스듬히 휩쓸리며 화면 전체로
      var nMote = Math.round(110 * Math.max(1, area * 0.9));
      for (i = 0; i < nMote; i++) {
        var life = 6 + (i % 7), ph = ((t + i * 1.37) % life) / life, drift = ph * 120 * (0.5 + (i % 3) * 0.25);
        var ax = ((i * 59) % W + drift + Math.cos(ph * 3 + i) * 10) % (W + 20) - 10, ay = H + 20 - ph * (H + 80) + ((i * 31) % 60);
        g.globalAlpha = Math.max(0, Math.sin(ph * Math.PI)) * (0.45 + 0.45 * Math.abs(Math.sin(t * 3 + i)));
        g.fillStyle = i % 3 === 0 ? '#eef6ff' : (i % 5 === 0 ? '#8aa4c8' : '#4deeea'); g.fillRect(Math.round(ax), Math.round(ay), i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1);
      }
      var nEmber = Math.round(10 * Math.max(1, W / 360));
      for (i = 0; i < nEmber; i++) {   // 큰 영혼 불씨(푸른 불씨, 번진 빛)
        var ph3 = ((t * 0.07 + i * 0.1) % 1), wx = (CX + Math.sin(t * 0.5 + i * 2) * (40 + i * 11) + ph3 * 160 * ((i % 2) ? 1 : -1) + W) % W, wy = H * 0.66 - ph3 * H * 0.6;
        g.globalAlpha = 0.55 * Math.sin(ph3 * Math.PI);
        var wg = g.createRadialGradient && g.createRadialGradient(wx, wy, 0, wx, wy, 6);
        if (wg && wg.addColorStop) { wg.addColorStop(0, 'rgba(184, 255, 251, 0.95)'); wg.addColorStop(1, 'rgba(44, 198, 204, 0)'); g.fillStyle = wg; g.fillRect(wx - 6, wy - 6, 12, 12); }
      }
      g.globalAlpha = 1;
      // 가장자리 비네트(화면 크기에 맞춰)
      var vr = Math.max(W, H) * 0.7, vg = g.createRadialGradient && g.createRadialGradient(CX, H * 0.47, Math.min(W, H) * 0.25, CX, H * 0.5, vr);
      if (vg && vg.addColorStop) { vg.addColorStop(0, 'rgba(0, 0, 0, 0)'); vg.addColorStop(1, 'rgba(2, 3, 8, 0.75)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
    },

    /* ---------------------------------------------------------------- 실제 루프 */
    loop: function () {
      var self = this, last = U.now();
      var frame = function () {
        var now = U.now(), dt = (now - last) / 1000; last = now;
        try { self.step(dt); self.render(); } catch (e) { if (global.console) console.error(e); }
        global.requestAnimationFrame(frame);
      };
      global.requestAnimationFrame(frame);
    }
  };
})(window);
