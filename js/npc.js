/* ==========================================================================
   npc.js — v82 방랑 NPC 5인(MG.NPC). 반경 48px 안에 들어가면 머리 위에 말풍선이 뜨고 메인 버튼이 [💬 대화]로 바뀐다.
   누르면 화면 아래 가운데의 슬림한 대화 바(아이콘 · 이름 · 대사 2줄 · [기능 실행] · [닫기]) — 시간은 멈추지 않고, 걸어서 멀어지면 저절로 닫힌다.
   v84: 교환(연성 · 소재 판매 · 고대 병기 의식) 폐기 — NPC 는 진행도에 맞는 다음 목적지 · 패턴 공략 힌트 · 버프 · 골드 상점만.
     ① 🔨 단조장인 발드르   (야영지 모루 옆)       다음 목적지 + 패턴 공략 · [🔪 숫돌 손질 — 150초 공격 +12%]
     ② 🔥 잿빛 사냥꾼 카일   (토벌 수에 따라 화톳불을 옮겨 다닌다) 세계관 이야기 · [🎁 사냥꾼의 보급품(골드 + 희귀 소재) — 단계마다 한 번]
     ③ 🧙‍♀️ 비전 현자 이실리아 (수정 고원 비석 옆)     [✨ 80골드 — 고대 비석 각인 재선택] · [🔮 비전 가호 — 150초 격 +10% · 기력 회복 +20%]
     ④ 🎒 설원 행상인 보르크 (빙하 협곡 화톳불 옆)  [🧪 에스트 보충(가득)] · [⚡ 사냥꾼의 영약(에스트 1병 보충 + 120초 공격/기력 버프)]
     ⑤ ⚔️ 선대 사냥꾼의 망령 (용화산 화톳불)      [🏆 수렵 현상금 — 누적 토벌 · 부위 파괴 · 투기장 제패에 따라 골드 & 심연의 정수]
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data, C = D.NPC_CFG;

  /* v84 진행도에 맞는 다음 목적지 + 패턴 공략(⚡ 황금 안광 = 상쇄 가능 · 🩸 진홍 안광 = 가드 · 상쇄 불능 → 굴러라) */
  var HINT = {
    b1: ['야영지 북쪽 [고대 뿌리 신전]의 고대 거목 수호자를 베어라.', '⚡ 휘두르기는 상쇄하라. 🩸 뿌리 쥐기는 방패로 못 막는다 — 굴러라. 뒤따르는 뿌리 가시까지!'],
    b2: ['수정 고원 한가운데 [결정 동굴]의 수정 갑주 골렘을 노려라.', '회전 뒤엔 망치가 곧바로 떨어진다. 망치를 쳐든 채 멈칫하면 한 박자 늦게 굴러라. 🩸 지진은 굴러서만.'],
    b3: ['홍련의 유적 북쪽 끝 [가시 제단]의 심연의 가시 군주가 다음이다.', '촉수 다음엔 가시 탄막이 이어진다. 🩸 손을 뻗는 잡기는 가드 불능 — 옆으로 굴러라.'],
    b4: ['빙하 협곡 남동쪽 [얼음 궁전]의 서리 송곳니를 찾아라.', '덮치기 → 돌진 → 🩸 냉기 숨결 연계. 거리를 벌리면 뒤로 뛰어 숨결을 쏜다.'],
    b5: ['용화산 북동쪽 [폭풍룡의 둥지]의 폭풍룡이 마지막 괴수다.', '꼬리 → 회오리 → 🩸 낙뢰 연계. 꼬리를 치켜든 채 멈추면 엇박자다 — 서두르지 마라.'],
    king: ['5대 괴수를 모두 베었다면 용화산 북동쪽 끝 왕의 무덤으로 향하라!', '기사왕의 ⚡ 돌진 베기는 상쇄하고, 🩸 붙잡기는 굴러서 피하라. 베기 뒤엔 흑염 검기가 따라온다.'],
    rush: ['기사왕까지 쓰러뜨렸군. 야영지 서쪽 포털 — 심연의 투기장에서 무회복 보스 러시 8라운드에 도전하라.', '라운드 사이엔 체력도 에스트도 돌아오지 않는다. 진홍 눈빛만은 반드시 굴러서 넘겨라.']
  };
  /* v86 서사: 잿빛 사냥꾼 카일 — 왕의 무덤에 잠든 기사왕 카인이 심연에 잠식되어 폭풍을 부르고, 다섯 괴수의 혼이 무덤의 봉인 사슬을 붙들고 있다.
     첫 줄 = 이 단계의 이야기(왜 그 바이옴으로 가는가) · 둘째 줄 = 진행도에 맞는 다음 목적지(HINT) */
  var KYLE = [
    ['이 폭풍은 하늘이 아니라 왕의 무덤에서 온다. 그곳에 잠든 기사왕 카인이 심연에 잠식되어 폭풍을 부르고 있지.', '불이 꺼지기 전에 돌아와라. 화톳불만이 우리를 기억한다.'],
    ['거목이 쓰러지자 무덤의 사슬 하나가 끊어졌다. 다섯 괴수의 혼이 그 봉인을 붙들고 있는 거다 — 다음은 수정 고원.', '결정 동굴의 골렘은 칼날을 튕겨 낸다 — 모아베기를 믿어라.'],
    ['홍련의 유적은 한때 기사왕을 모시던 사냥꾼의 성채였다. 그가 심연에 삼켜진 뒤로는 가시뿐이지.', '가시 군주를 꺾으면 동쪽 빙하의 길이 보일 거다.'],
    ['이 추위도 왕의 폭풍이 부른 것이다. 남은 사슬은 둘 — 빙하의 서리 송곳니, 그리고 용화산의 폭풍룡.', '불길로 얼음 장벽을 녹이고, 흑요석은 냉기로 깨라.'],
    ['폭풍룡이 마지막 사슬이다. 다섯 혼이 모두 풀리면 용화산 북동쪽 끝, 왕의 무덤이 열린다. 카인을 쉬게 해 줘라.', '쓰러뜨리면 야영지에 심연의 투기장이 열린다고 들었다.']
  ];
  var KYLE_AFTER = ['새벽이다… 백 년 만에 보는 해로군. 카인도 이제 쉴 수 있겠지. 고맙다, 사냥꾼.', '왕의 무덤이 무너지기 전에, 투기장에서 네 검을 더 벼려 두어라.'];   // v86 진 엔딩 뒤

  var NPC = MG.NPC = {
    open: null,
    state: function () { var S = MG.S; S.npc = S.npc || { kyle: -1, bounty: 0 }; if (S.npc.kyle === undefined) S.npc.kyle = -1; if (S.npc.bounty === undefined) S.npc.bounty = 0; return S.npc; },
    /* 카일의 단계 = 토벌한 서로 다른 보스 수(0~4) */
    stage: function () { var S = MG.S, n = 0; D.BOSSES.forEach(function (b) { if (S.bosses[b.id] && S.bosses[b.id].kills > 0) n++; }); return Math.min(4, n); },
    posOf: function (id) { var d = D.NPCS[id]; if (id === 'kyle') { var p = d.stops[this.stage()]; return { x: p[0], y: p[1] }; } return { x: d.x, y: d.y }; },
    /* World.init 이 부른다(필드에만) */
    build: function (M) {
      if (M.kind !== 'field') return [];
      var self = this;
      return D.NPC_ORDER.map(function (id) { var p = self.posOf(id); return { id: id, x: p.x, y: p.y, face: 1, talkT: 0 }; });
    },
    find: function (id) { var L = MG.World.npcs || []; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; },
    /* 다음 보스(아직 한 번도 쓰러뜨리지 않은 첫 보스) */
    nextBoss: function () { var S = MG.S; for (var i = 0; i < D.BOSSES.length; i++) { var b = D.BOSSES[i]; if (!(S.bosses[b.id] && S.bosses[b.id].kills > 0)) return b; } return null; },
    bountyPoints: function () { var S = MG.S, p = 0; D.BOSSES.forEach(function (b) { var r = S.bosses[b.id]; if (r) p += (r.kills || 0) * 2 + (r.breaks || 0); }); return p + (S.arenaClears || 0) * 5; },
    /* v84 진행도 힌트: 다음 보스 → (5대 괴수 토벌) 왕의 무덤 → (기사왕 토벌) 보스 러시 */
    progress: function () { var S = MG.S, nb = this.nextBoss(); if (nb) return nb.id; return S.bosses.k1 && S.bosses.k1.kills > 0 ? 'rush' : 'king'; },
    hint: function () { return HINT[this.progress()].slice(); },

    /* ---------------------------------------------------------------- 대화 내용: { id, name, emo, lines[2], acts[{ label, ok }] } */
    view: function (id, result) {
      var S = MG.S, st = this.state(), d = D.NPCS[id], v = { id: id, name: d.name, emo: d.emo, col: d.col, lines: ['', ''], acts: [] }, k, m;
      if (id === 'baldr') {
        v.lines = this.hint(); var BW = C.BUFF.whet, P0 = MG.Player;
        v.acts.push({ label: P0.whetT > 0 ? '🔪 숫돌 손질 중 (' + Math.ceil(P0.whetT) + '초)' : '🔪 숫돌 손질 (' + BW.cost + 'G) — 공격 +' + Math.round(BW.atk * 100) + '%', ok: !(P0.whetT > 0) && S.gold >= BW.cost });
      } else if (id === 'kyle') {
        var s = this.stage(); v.lines = (S.bosses.k1 && S.bosses.k1.kills > 0 ? KYLE_AFTER : KYLE[s]).slice(); v.lines[1] = this.hint()[0];   // v84 두 번째 줄은 진행도에 맞는 다음 목적지
        var sup = C.SUPPLY[s], can = st.kyle < s;
        v.acts.push({ label: can ? '🎁 사냥꾼의 보급품 (' + sup.gold + 'G)' : '🎁 보급품 — 다음 토벌 뒤에', ok: can });
        var CP = MG.Companion; v.acts.push(!CP.unlocked() ? { label: '🐺 영혼 수렵 파트너', ok: true } : { label: CP.state().kind === 'wolf' ? '🔁 🦅 영혼매로' : '🔁 🐺 늑대로', ok: true });   // v83
      } else if (id === 'isilia') {
        v.lines = S.runes.length ? ['비석에 새긴 마지막 각인 「' + D.RUNES[S.runes[S.runes.length - 1]].name + '」…', C.RUNE_COST + '골드면 지우고 새 각인을 고르게 해 주지.'] : ['아직 새긴 각인이 없구나. 고대 비석부터 찾아라.', '각인을 새기면 ' + C.RUNE_COST + '골드로 다시 고를 수 있다.'];
        var pool = D.RUNE_ORDER.filter(function (r) { return S.runes.indexOf(r) < 0; });
        v.acts.push({ label: '✨ 각인 재선택 (' + C.RUNE_COST + 'G)', ok: S.runes.length > 0 && pool.length > 0 && S.gold >= C.RUNE_COST });
        var BA = C.BUFF.arc, P1 = MG.Player; v.acts.push({ label: P1.arcT > 0 ? '🔮 비전 가호 중 (' + Math.ceil(P1.arcT) + '초)' : '🔮 비전 가호 (' + BA.cost + 'G) — 격 · 기력', ok: !(P1.arcT > 0) && S.gold >= BA.cost });
      } else if (id === 'bork') {
        v.lines = ['소재는 안 판다 — 사냥꾼은 제 손으로 벤 것만 벼리는 법이지.', this.hint()[1]];
        var P2 = MG.Player; v.acts.push({ label: '🧪 에스트 보충 (' + C.REFILL + 'G)', ok: P2.estus < S.estusMax && S.gold >= C.REFILL });
        v.acts.push({ label: '⚡ 사냥꾼의 영약 — ' + C.ELIXIR.cost + 'G', ok: S.gold >= C.ELIXIR.cost });
      } else if (id === 'ghost') {
        var pt = this.bountyPoints(), un = pt - st.bounty;
        v.lines = [this.hint()[0], '토벌 ' + D.BOSSES.reduce(function (a, b) { return a + ((S.bosses[b.id] && S.bosses[b.id].kills) || 0); }, 0) + ' · 부위 파괴 ' + D.BOSSES.reduce(function (a, b) { return a + ((S.bosses[b.id] && S.bosses[b.id].breaks) || 0); }, 0) + ' — 아직 받지 않은 현상금 ' + Math.max(0, un) + '점.'];
        v.acts.push({ label: un > 0 ? '🏆 수렵 현상금 (' + un + '점)' : '🏆 현상금 — 더 사냥하라', ok: un > 0 });
        v.acts.push({ label: MG.Tempest && MG.Tempest.on ? '🌑 폭풍이 이미 불어온다' : '🌑 붉은 폭풍 부르기', ok: !!(MG.Tempest && !MG.Tempest.on && MG.World.isField()) });   // v83
      }
      if (result) v.lines[1] = result;
      return v;
    },

    /* ---------------------------------------------------------------- 대화 시작 / 기능 */
    talk: function (npc) {
      var P = MG.Player; npc = typeof npc === 'string' ? this.find(npc) : npc; if (!npc) return false;
      this.open = npc.id; npc.talkT = 0; npc.face = P.x < npc.x ? -1 : 1; P.face(npc.x - P.x, npc.y - P.y);
      if (MG.UI && MG.UI.openTalk) MG.UI.openTalk(this.view(npc.id));
      if (MG.Audio && MG.Audio.playShellClink) try { MG.Audio.playShellClink(); } catch (e) { /* 무음 */ }
      MG.emit('talk', npc.id);
      return true;
    },
    close: function () { this.open = null; if (MG.UI && MG.UI.closeTalk) MG.UI.closeTalk(); },
    /* 대화 바의 k 번째 [기능 실행] */
    act: function (k) {
      var id = this.open; if (!id) return false;
      var v = this.view(id), a = v.acts[k || 0]; if (!a || !a.ok) return false;
      var res = this['do_' + id](k || 0);
      if (MG.UI && MG.UI.openTalk && this.open) MG.UI.openTalk(this.view(id, res || null));
      if (MG.Save) MG.Save.save();
      return !!res;
    },
    gain: function (mats, gold) {
      var S = MG.S, P = MG.Player, txt = [];
      if (gold) { S.gold += gold; txt.push('💰 ' + gold + 'G'); }
      for (var m in mats) { S.mats[m] = (S.mats[m] || 0) + mats[m]; txt.push(D.MATS[m].emo + ' ' + D.MATS[m].name + ' +' + mats[m]); }
      if (MG.FX) { MG.FX.burst(P.x, P.y - 12, 16, ['#ffd866', '#fff6c0', '#8ae8f8'], 80, { up: true, g: -30 }); MG.FX.text(P.x, P.y - 34, txt[0] || '', '#ffd866', 0.9, 11); }
      if (MG.Audio && MG.Audio.playReward) try { MG.Audio.playReward(); } catch (e) { /* 무음 */ }
      return txt.join(' · ');
    },
    do_baldr: function (k) {
      var S = MG.S, P = MG.Player, B = C.BUFF.whet; if (P.whetT > 0 || S.gold < B.cost) return null;
      S.gold -= B.cost; P.whetT = B.t;
      if (MG.SFX) { MG.SFX.anvil(1); MG.SFX.anvil(3); }
      if (MG.FX) { MG.FX.text(P.x, P.y - 34, '🔪 숫돌 손질!', '#ffd866', 1.0, 12, { pop: true }); MG.FX.burst(P.x + P.fx * 8, P.y - 10, 12, ['#ffd866', '#ffffff'], 70); }
      return '칼날을 세웠다 — ' + B.t + '초간 공격 +' + Math.round(B.atk * 100) + '%';
    },
    do_kyle: function (k) {
      if (k === 1) { var CP = MG.Companion; if (!CP.unlocked()) { CP.unlock('wolf'); return '이 녀석을 데려가라. 네 칼이 무거워질 때 함께 뛰어들 거다.'; } CP.setKind(CP.state().kind === 'wolf' ? 'hawk' : 'wolf'); return CP.def().icon + ' ' + CP.def().name + ' — ' + CP.def().desc; }
      var st = this.state(), s = this.stage(); if (st.kyle >= s) return null;
      st.kyle = s; var sup = C.SUPPLY[s];
      return '받아 둬라. ' + this.gain(sup.mats, sup.gold);
    },
    do_isilia: function (k) {
      var S = MG.S;
      if (k === 1) { var P = MG.Player, B = C.BUFF.arc; if (P.arcT > 0 || S.gold < B.cost) return null; S.gold -= B.cost; P.arcT = B.t; if (MG.FX) { MG.FX.flash('#c4a8ff', 0.1); MG.FX.ring(P.x, P.y - 8, 4, 30, 0.5, '#c4a8ff', 3); MG.FX.text(P.x, P.y - 34, '🔮 비전 가호!', '#c4a8ff', 1.0, 12, { pop: true }); } return '비전 가호 — ' + B.t + '초간 격 +' + Math.round(B.gyeok * 100) + '% · 기력 회복 +' + Math.round(B.sp * 100) + '%'; }
      if (!S.runes.length || S.gold < C.RUNE_COST) return null;
      var pool = D.RUNE_ORDER.filter(function (r) { return S.runes.indexOf(r) < 0; }), pick = [];
      while (pool.length && pick.length < 3) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      if (!pick.length) return null;
      var self = this, old = S.runes[S.runes.length - 1];
      this.close();
      if (MG.UI) MG.UI.openRunes(pick, function (rid) { self.reRune(old, rid); });
      return '각인 재선택';
    },
    reRune: function (old, rid) {
      var S = MG.S, i = S.runes.indexOf(old); if (i < 0 || S.gold < C.RUNE_COST || S.runes.indexOf(rid) >= 0) return false;
      S.gold -= C.RUNE_COST; S.runes[i] = rid;
      if (MG.FX) { var P = MG.Player; MG.FX.flash('#c4a8ff', 0.12); MG.FX.ring(P.x, P.y - 8, 4, 34, 0.5, '#c4a8ff', 3); }
      if (MG.UI) MG.UI.ribbon('✨ 각인 재선택 — ' + D.RUNES[rid].icon + ' ' + D.RUNES[rid].name, 2600);
      if (MG.Save) MG.Save.save();
      return true;
    },
    do_bork: function (k) {
      var S = MG.S, P = MG.Player;
      if (k === 0) { if (P.estus >= S.estusMax || S.gold < C.REFILL) return null; S.gold -= C.REFILL; P.estus = S.estusMax; if (MG.FX) { MG.FX.text(P.x, P.y - 34, '🧪 에스트 가득!', '#7dff9a', 1.0, 12, { pop: true }); MG.FX.ring(P.x, P.y - 8, 4, 24, 0.4, '#7dff9a', 2); } return '🧪 에스트 ' + S.estusMax + '병 가득 — 아껴 마셔라.'; }
      var E = C.ELIXIR; if (S.gold < E.cost) return null;
      S.gold -= E.cost; P.estus = Math.min(S.estusMax, P.estus + 1); P.elixirT = E.t;
      if (MG.FX) { MG.FX.flash('#ffd866', 0.12); MG.FX.ring(P.x, P.y - 8, 4, 30, 0.5, '#ffd866', 3); MG.FX.text(P.x, P.y - 34, '⚡ 사냥꾼의 영약!', '#ffd866', 1.0, 12, { pop: true }); }
      return '⚡ 영약 — 에스트 +1 · 120초간 공격 +' + Math.round(E.atk * 100) + '% · 기력 회복 +' + Math.round(E.sp * 100) + '%';
    },
    do_ghost: function (k) {
      if (k === 1) { if (!MG.Tempest || MG.Tempest.on) return null; MG.Tempest.start(); var self = this; self.close(); return '붉은 폭풍이 온다… 파멸수가 냄새를 맡았다.'; }
      var st = this.state(), pt = this.bountyPoints(), un = pt - st.bounty; if (un <= 0) return null;
      var B = C.BOUNTY, ess = Math.floor(pt / B.abyssEvery) - Math.floor(st.bounty / B.abyssEvery); st.bounty = pt;
      return '현상금 — ' + this.gain(ess > 0 ? { abyss: ess } : {}, un * B.gold);
    },

    /* 매 프레임: 멀어지면 대화 바를 닫는다 · 맵이 바뀌면 닫는다 */
    update: function (dt) {
      var P = MG.Player, L = MG.World.npcs || [];
      for (var i = 0; i < L.length; i++) { L[i].talkT += dt; if (U.dist(P.x, P.y, L[i].x, L[i].y) < 70) L[i].face = P.x < L[i].x ? -1 : 1; }
      if (!this.open) return;
      var n = this.find(this.open);
      if (!n || !P.alive() || U.dist(P.x, P.y, n.x, n.y) > C.LEAVE) this.close();
    },

    /* ---------------------------------------------------------------- 그리기 */
    collect: function (list, vis) { var L = MG.World.npcs || []; for (var i = 0; i < L.length; i++) if (vis(L[i].x, L[i].y)) list.push({ y: L[i].y, o: L[i], f: drawNpc }); }
  };
  function drawNpc(ctx, n, t) {
    var S = MG.Sprites, d = D.NPCS[n.id], f = Math.floor(t * 2 + n.x * 0.01) % 2, ghost = n.id === 'ghost';
    MG.World.groundShadow(ctx, n.x, n.y + 1, 7, 2.4, ghost ? 0.14 : 0.32);   // v83 접지 그림자 + 림
    if (ghost) {   // 망령: 흔들리는 반투명 + 청록 잔광
      var g = ctx.createRadialGradient && ctx.createRadialGradient(n.x, n.y - 14, 2, n.x, n.y - 14, 22);
      if (g && g.addColorStop) { g.addColorStop(0, 'rgba(138, 232, 248, ' + (0.22 + 0.1 * Math.sin(t * 3)).toFixed(2) + ')'); g.addColorStop(1, 'rgba(138, 232, 248, 0)'); ctx.fillStyle = g; ctx.fillRect(n.x - 22, n.y - 36, 44, 44); }
      ctx.globalAlpha = 0.62 + 0.18 * Math.sin(t * 2.3);
    }
    var bob = ghost ? Math.round(Math.sin(t * 2) * 2) - 2 : 0;
    if (S && S.ready('rb') && S.item('rb', d.sprite + '_' + f)) S.draw(ctx, 'rb', d.sprite + '_' + f, n.x, n.y + bob, n.face < 0);
    else { ctx.fillStyle = d.col; ctx.fillRect(Math.round(n.x - 5), Math.round(n.y - 20 + bob), 10, 20); }
    ctx.globalAlpha = 1;
    // 말 걸 수 있는 사냥꾼 표시(작은 금빛 마름모) — 가까이 오면 말풍선이 대신한다
    var near = MG.Game && MG.Game.ctx && MG.Game.ctx.obj === n;
    if (!near) { var pz = 0.5 + 0.5 * Math.sin(t * 3 + n.x); ctx.fillStyle = 'rgba(255, 216, 102, ' + (0.4 + 0.4 * pz).toFixed(2) + ')'; var py = Math.round(n.y - 30 + bob - pz * 2); ctx.fillRect(Math.round(n.x) - 1, py, 3, 1); ctx.fillRect(Math.round(n.x), py - 1, 1, 3); }
  }
  NPC.drawNpc = drawNpc;
})(window);
