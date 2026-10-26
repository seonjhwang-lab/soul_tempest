/* ==========================================================================
   forge.js — 사냥꾼의 대장간(몬스터 헌터식): 손님/장사 없음. 내가 수렵한 소재와 광석으로 내 무기를 벼린다.
   (v81: 화면 가운데 360×640 작업대 — 넓은 화면에서도 카드가 늘어지지 않고, 둘레는 돌벽으로 채운다)
   위: 무기 계보(4계열 × 3단 = 12종, 3티어 ★신화 → 맨 위 ★궁극 파생 천상제일검 · v84 블라인드: 핵심 보스 소재를 얻기 전엔 ??? 실루엣) + 사냥꾼 갑주 5종 — 스크롤 카드(DOM, ui.js) / 아래: 직접 단조 작업대(캔버스 클로즈업)
   단조 3단계(만들기 · 연마 모두):
     ① 가죽 풀무 꾹 누르기(Hold & Release) — 누르는 동안 온도가 빠르게 오른다. 황금 구간 75~92%에서 떼면 대성공. 100% 넘으면 펑(다시 달군다)
     ② 모루 위 검신 3점 직접 타격 — 반짝이는 점을 직접 눌러라. 바깥 고리가 금빛 점에 겹치게 줄어든 순간이 완벽: 깡! → 콰앙! → ★초절정 단조!★
     ③ 담금질 — 물통을 누르면 치익! 황금 온도 + 3점 완벽 = ★명장(Masterwork: 공격력 +25%, 금빛 검기). 완성 즉시 손에 장착.
   이미 만든 무기는 소재를 더 넣어 +1강 → +2강 → +3강(단계마다 공격력 +12%). 갑주는 같은 단조로 벼려 입는다(★명장 갑주 = HP 보너스 +10%).
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;
  var CFG = { HOLD: 0.55, COOL: 0.06, GOLD_LO: 0.75, GOLD_HI: 0.92, BURN: 1.0, RING: 1.0, PERFECT: 0.8, REVEAL: 1.8 };
  /* 작업대 좌표(캔버스 = 논리 360×640) */
  var ST = { top: 356, bot: 562, PX: [128, 180, 232], PY: 470, BX: 104, FX: 262, FB: 548, GY: 372 };

  var Forge = MG.Forge = {
    CFG: CFG, ST: ST, open: false, sel: null, craft: null, pops: [], sparks: [], steam: [], flashT: 0, hammerT: -9,
    have: function (k) { return MG.S.mats[k] || 0; },
    afford: function (cost) { for (var k in cost) if (this.have(k) < cost[k]) return false; return true; },
    pay: function (cost) { for (var k in cost) MG.S.mats[k] -= cost[k]; },
    isArmor: function (id) { return !!D.ARMORS[id] && !D.WEAPONS[id]; },
    def: function (id) { return D.WEAPONS[id] || D.ARMORS[id] || null; },
    owned: function (wid) { return this.isArmor(wid) ? ((MG.S.armors || {})[wid] || null) : (MG.S.weapons[wid] || null); },
    /* 카드 한 장의 상태 */
    card: function (wid) {
      var arm = this.isArmor(wid), w = this.def(wid), own = this.owned(wid), locked = w.ultimate ? !this.mythT3() : !!(w.req && !this.owned(w.req)), known = arm || this.known(wid);
      var upCost = !arm && own && own.lvl < 3 ? D.upgradeCost(wid, own.lvl + 1) : null;
      return { wid: wid, armor: arm, myth: !!w.myth, ultimate: !!w.ultimate, known: known, hint: known ? '' : this.hint(wid), atk: arm ? 0 : w.atk, fx: w.fx, name: known ? w.name : '??? (미확인 무기)', line: arm ? 'armor' : w.line, tier: w.tier, tag: w.tag, recipe: w.recipe, owned: !!own, lvl: own && own.lvl ? own.lvl : 0, master: !!(own && own.master), equipped: arm ? MG.S.armor === wid : MG.S.equipped === wid,
        locked: locked, canMake: known && !own && !locked && this.afford(w.recipe), upCost: upCost, canUp: !!(upCost && this.afford(upCost)) };
    },
    defaultSel: function () {
      var all = D.WEAPON_ORDER.concat(D.ARMOR_ORDER);
      for (var i = 0; i < all.length; i++) if (this.card(all[i]).canMake) return all[i];
      return D.WEAPONS[MG.S.equipped] && MG.S.equipped !== 'wanderer' ? MG.S.equipped : D.WEAPON_ORDER[0];
    },
    openShop: function () {
      if (this.open) return true;
      this.open = true; this.craft = null; this.sel = this.sel && this.def(this.sel) && this.sel !== 'wanderer' && this.sel !== 'coat' ? this.sel : this.defaultSel();
      this.pops = []; this.sparks = []; this.steam = [];
      if (MG.Input) MG.Input.reset();
      if (MG.UI) MG.UI.setForge(true);
      this.sync();
      return true;
    },
    close: function () {
      if (!this.open) return false;
      if (this.craft && this.craft.step !== 'done') { this.say('단조 중에는 나갈 수 없다 — 마저 벼리자!'); return false; }
      this.open = false; this.craft = null;
      if (MG.UI) MG.UI.setForge(false);
      if (MG.Save) MG.Save.save();
      return true;
    },
    select: function (wid) { if (this.craft || !this.def(wid)) return false; this.sel = wid; this.sync(); return true; },
    say: function (t) { this.msg = { t: t, until: (MG.Game ? MG.Game.time : 0) + 2.4 }; this.sync(); },

    /* ---------------------------------------------------------------- 시작: 만들기 / 연마 */
    startMake: function (wid) {
      wid = wid || this.sel; var c = this.card(wid);
      if (c.owned) { if (c.armor) { this.equip(wid); return true; } return this.startUpgrade(wid); }
      if (!c.known) { this.say('??? 미확인 무기 — ' + c.hint); return false; }   // v84 블라인드
      if (c.locked) { this.say(c.ultimate ? '🔒 먼저 3티어 ★신화 무기를 하나 벼려야 한다' : '🔒 먼저 ' + this.def(this.def(wid).req).name + '을(를) 벼려야 한다'); return false; }
      if (!c.canMake) { this.say('소재가 모자라다 — ' + this.costText(this.def(wid).recipe)); return false; }
      this.pay(this.def(wid).recipe); this.begin(wid, 'make'); return true;
    },
    startUpgrade: function (wid) {
      wid = wid || this.sel; var c = this.card(wid);
      if (!c.owned || c.armor) return false;
      if (!c.upCost) { this.say('이미 +3강 — 더 연마할 수 없다'); return false; }
      if (!c.canUp) { this.say('연마 소재가 모자라다 — ' + this.costText(c.upCost)); return false; }
      this.pay(c.upCost); this.begin(wid, 'up'); return true;
    },
    begin: function (wid, mode) {
      this.sel = wid; this.craft = { wid: wid, mode: mode, step: 'bellows', temp: 0.12, holding: false, hits: [], ringT: 0, heatOk: false, burns: 0, t: 0, revealT: 0 };
      this.pop(180, 330, mode === 'make' ? '🔥 단조 시작!' : '⬆ 연마 시작!', '#ffd866', 1.0, 16);
      this.sync();
    },
    costText: function (cost) { var o = []; for (var k in cost) o.push(D.MATS[k].emo + D.MATS[k].name + ' ' + this.have(k) + '/' + cost[k]); return o.join(' · '); },

    /* ---------------------------------------------------------------- 손맛 입력: 누르기 / 떼기 (캔버스 좌표) */
    press: function (x, y) {
      var c = this.craft; if (!c) return false;
      if (c.step === 'bellows') { c.holding = true; return true; }
      if (c.step === 'anvil') {
        var k = c.hits.length, px = ST.PX[k];
        if (U.dist(x, y, px, ST.PY) < 30) return this.strike();
        this.pop(x, y - 10, '반짝이는 점을 노려!', '#c8b898', 0.6, 11); return false;
      }
      if (c.step === 'quench') { if (Math.abs(x - 180) < 104 && y > 430) return this.quench(); this.pop(180, 440, '물통을 눌러라!', '#8ae8f8', 0.6, 11); return false; }
      return false;
    },
    release: function () {
      var c = this.craft; if (!c || c.step !== 'bellows' || !c.holding) return false;
      c.holding = false;
      if (c.temp >= CFG.GOLD_LO) {
        c.heatOk = c.temp <= CFG.GOLD_HI; c.step = 'anvil'; c.ringT = 0;
        this.pop(180, 400, c.heatOk ? '★황금 온도! 대성공!' : '조금 뜨겁다 — 모루로!', c.heatOk ? '#ffd866' : '#ffe9b8', 1.0, c.heatOk ? 18 : 14);
        this.sync(); return true;
      }
      this.pop(ST.BX, 450, c.temp > 0.5 ? '조금만 더!' : '더 꾹!', '#ffe9b8', 0.6, 13);
      return false;
    },
    /* 키보드: J/Space/E 를 누르면 press(현재 점/물통), 떼면 release */
    key: function (down) {
      var c = this.craft; if (!c) return false;
      if (c.step === 'bellows') { if (down) { c.holding = true; return true; } return this.release(); }
      if (!down) return false;
      if (c.step === 'anvil') return this.strike();
      if (c.step === 'quench') return this.quench();
      return false;
    },
    strike: function () {
      var c = this.craft; if (!c || c.step !== 'anvil') return false;
      var p = (c.ringT % CFG.RING) / CFG.RING, perfect = p >= CFG.PERFECT, n = c.hits.length;
      c.hits.push(perfect); c.ringT = 0; this.hammerT = c.t;
      var px = ST.PX[n], words = ['깡!', '콰앙!!', '★초절정 단조!★'], pw = [1, 1.6, 2.6][n];
      for (var k = 0; k < Math.round((perfect ? 16 : 9) * pw); k++) { var a = Math.random() * Math.PI * 2, sv = (80 + Math.random() * 90) * (0.8 + 0.3 * pw); this.sparks.push({ x: px, y: ST.PY - 4, vx: Math.cos(a) * sv, vy: Math.sin(a) * 70 * pw - 80, t: 0, c: perfect ? (k % 2 ? '#fff6c0' : '#ffd86a') : '#ff9a3c', big: n === 2 }); }
      this.pop(n === 2 ? 180 : px, ST.PY - 50 - n * 8, words[n] + (perfect && n < 2 ? ' 완벽!' : ''), perfect ? '#ffd866' : '#ffe9b8', 0.7 + 0.25 * n, [16, 21, 26][n]);
      if (MG.FX) MG.FX.shake((perfect ? 2 : 1) * pw, 0.1 + 0.05 * n);
      if (n === 2) this.flashT = 0.2;
      if (MG.SFX) MG.SFX.anvil(c.hits.length); else if (MG.Audio && MG.Audio.playShellClink) try { MG.Audio.playShellClink(); } catch (e) { /* 무음 */ }   // v82: 깡— 1 · 2 · 3타 피치 상승
      if (c.hits.length >= 3) { c.step = 'quench'; }
      this.sync();
      return true;
    },
    quench: function () {
      var c = this.craft; if (!c || c.step !== 'quench') return false;
      var perfect = c.hits.filter(function (h) { return h; }).length, S = MG.S, w = this.def(c.wid), arm = this.isArmor(c.wid);
      for (var k = 0; k < 26; k++) this.steam.push({ x: 120 + Math.random() * 120, y: 500, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 80, t: -k * 0.02 });
      c.step = 'done'; c.revealT = 0; this.flashT = 0.25;
      if (c.mode === 'make') {
        c.master = c.heatOk && perfect === 3;
        if (arm) S.armors[c.wid] = { master: c.master }; else S.weapons[c.wid] = { lvl: 0, master: c.master };
        S.crafted = (S.crafted || 0) + 1;
        this.pop(180, 380, c.master ? '★명장! ' + w.name : w.name + ' 완성!', c.master ? '#ffd866' : '#e8f4ff', CFG.REVEAL, c.master ? 18 : 16);
      } else {
        S.weapons[c.wid].lvl++;
        c.master = S.weapons[c.wid].master;
        this.pop(180, 380, w.name + ' +' + S.weapons[c.wid].lvl + '강!' + (perfect === 3 && c.heatOk ? ' 완벽한 연마!' : ''), '#bff6ff', CFG.REVEAL, 17);
      }
      this.pop(180, 352, '치익—!', '#e4fdff', 0.8, 15);
      this.equip(c.wid, true);
      if (MG.FX) MG.FX.shake(c.master ? 5 : 3, 0.3);
      if (MG.Audio && MG.Audio.playReward) try { MG.Audio.playReward(); } catch (e) { /* 무음 */ }
      if (MG.Save) MG.Save.save();
      MG.emit('forged', c);
      this.sync();
      return true;
    },
    /* 장착(완성 즉시 자동 · 상태 창에서도) */
    /* ---------------------------------------------------------------- v84 블라인드 무기 트리(몬스터 헌터식)
       파생에 필요한 「핵심 보스 소재」를 한 번도 손에 넣지 못한 무기는 검은 실루엣 · 「??? (미확인 무기)」 · 힌트만 보인다.
       그 소재를 처음 얻는 순간 「✨ 새로운 무기 파생 해금!」 — 이름 · 공격력 · 특성 · 소재가 드러난다(대장간 · 도감 공통). */
    keyMat: function (wid) { var w = D.WEAPONS[wid]; if (!w || !w.recipe) return null; var best = null; for (var k in w.recipe) { var m = D.MATS[k]; if (m && m.boss && m.boss !== 6 && (!best || m.boss > D.MATS[best].boss)) best = k; } return best; },
    keyBoss: function (mk) { var m = D.MATS[mk]; if (!m) return ''; if (mk === 'kcrown') return D.KING.name; if (mk === 'ragar') return D.RAGAR.name; var b = D.BOSSES[m.boss - 1]; return b ? b.name : m.name; },
    known: function (wid) { if (!D.WEAPONS[wid]) return true; var mk = this.keyMat(wid), S = MG.S; if (!mk) return true; return !!(S.weapons[wid] || (S.seen && S.seen[mk]) || (S.mats[mk] || 0) > 0); },
    hint: function (wid) { var mk = this.keyMat(wid); return mk ? '힌트: [' + this.keyBoss(mk) + '] 수렵 시 해금' : ''; },
    /* 매 프레임(game.js): 핵심 소재를 처음 얻으면 그 소재로 열리는 파생을 드러낸다 */
    discover: function () {
      var S = MG.S; if (!S || !S.mats) return 0; S.seen = S.seen || {}; var news = [], self = this;
      for (var k in D.MATS) {
        if (!D.MATS[k].boss || S.seen[k] || !((S.mats[k] || 0) > 0)) continue;
        S.seen[k] = 1;
        D.WEAPON_ORDER.concat([D.ULTIMATE]).forEach(function (id) { if (self.keyMat(id) === k && !S.weapons[id]) news.push(id); });
      }
      if (!news.length) return 0;
      var names = news.map(function (id) { return D.WEAPONS[id].name; }).join(' · '), P = MG.Player;
      if (MG.UI && MG.UI.ribbon) MG.UI.ribbon('✨ 새로운 무기 파생 해금! — ' + names, 2800);
      if (MG.FX && P) { MG.FX.text(P.x, P.y - 50, '✨ 새로운 무기 파생 해금!', '#ffd866', 1.6, 13, { pop: true }); MG.FX.ring(P.x, P.y - 12, 4, 30, 0.5, '#ffd866', 2); }
      if (MG.SFX && MG.SFX.anvil) MG.SFX.anvil(3);
      this.revealed = news; MG.emit('reveal', news);
      if (this.open) this.sync();
      if (MG.Save) MG.Save.save();
      return news.length;
    },
    /* ★궁극 파생: 3티어 ★신화 무기를 하나라도 벼렸어야 열린다 */
    mythT3: function () { var W = MG.S.weapons; return D.WEAPON_ORDER.some(function (id) { return D.WEAPONS[id].tier === 3 && !!W[id]; }); },
    equip: function (wid, quiet) {
      if (this.isArmor(wid)) {
        if (!(MG.S.armors || {})[wid]) return false;
        MG.S.armor = wid; if (MG.Player && MG.Player.refreshStats) MG.Player.refreshStats(false);
        if (!quiet && MG.FX && MG.Player) MG.FX.text(MG.Player.x, MG.Player.y - 34, '🛡️ ' + D.ARMORS[wid].name + ' 착용', '#bff6ff', 1.0, 11);
        if (this.open) this.sync(); if (MG.UI && MG.UI.syncHud) MG.UI.syncHud(true);
        return true;
      }
      if (!MG.S.weapons[wid]) return false;
      MG.S.equipped = wid;
      if (!quiet && MG.FX && MG.Player) MG.FX.text(MG.Player.x, MG.Player.y - 34, '⚔ ' + D.WEAPONS[wid].name + ' 장착', '#bff6ff', 1.0, 11);
      if (this.open) this.sync();
      if (MG.UI && MG.UI.syncHud) MG.UI.syncHud(true);
      return true;
    },

    update: function (dt) {
      var c = this.craft, k;
      if (c) {
        c.t += dt;
        if (c.step === 'bellows') {
          if (c.holding) {
            c.temp += CFG.HOLD * dt;
            if (Math.random() < 0.8) this.sparks.push({ x: ST.FX + (Math.random() - 0.5) * 40, y: ST.FB - 70, vx: (Math.random() - 0.5) * 70, vy: -60 - Math.random() * 90, t: 0, c: Math.random() < 0.5 ? '#ffd86a' : '#ff9a3c' });
            if (c.temp > CFG.BURN) { c.holding = false; c.temp = 0.2; c.burns++; this.pop(ST.FX, 420, '펑! 과열 — 다시 달구자', '#ff6a5a', 1.1, 15); if (MG.FX) MG.FX.shake(3, 0.2); for (k = 0; k < 16; k++) { var a = Math.random() * 6.28; this.sparks.push({ x: ST.FX, y: ST.FB - 60, vx: Math.cos(a) * 130, vy: Math.sin(a) * 110 - 40, t: 0, c: k % 3 ? '#5a4a40' : '#ff6a3c', big: true }); } this.sync(); }
          } else c.temp = Math.max(0.12, c.temp - CFG.COOL * dt);
        } else if (c.step === 'anvil') c.ringT += dt;
        else if (c.step === 'done') { c.revealT += dt; if (c.revealT > CFG.REVEAL + 0.2) { this.craft = null; this.sync(); } }
      }
      for (k = this.sparks.length - 1; k >= 0; k--) { var p = this.sparks[k]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; if (p.t > 0.7) this.sparks.splice(k, 1); }
      for (k = this.steam.length - 1; k >= 0; k--) { var s = this.steam[k]; s.t += dt; if (s.t > 0) { s.x += s.vx * dt; s.y += s.vy * dt; } if (s.t > 1.4) this.steam.splice(k, 1); }
      for (k = this.pops.length - 1; k >= 0; k--) { this.pops[k].t += dt; if (this.pops[k].t > this.pops[k].life) this.pops.splice(k, 1); }
      this.flashT = Math.max(0, this.flashT - dt);
      if (this.msg && MG.Game && MG.Game.time > this.msg.until) { this.msg = null; this.sync(); }
      if (c && c.step === 'bellows' && MG.UI && MG.UI.forgeTemp) MG.UI.forgeTemp(c.temp);
    },
    pop: function (x, y, text, col, life, size) { this.pops.push({ x: x, y: y, text: text, col: col, life: life || 0.9, size: size || 14, t: 0 }); },

    /* ---------------------------------------------------------------- DOM 상태(ui.js 가 그린다) */
    sync: function () { if (this.open && MG.UI && MG.UI.renderForge) MG.UI.renderForge(this.uiState()); },
    uiState: function () {
      var self = this, sel = this.sel, c = this.craft, card = sel ? this.card(sel) : null, w = sel ? this.def(sel) : null, arm = sel && this.isArmor(sel);
      return {
        gold: MG.S.gold, sel: sel, cards: D.WEAPON_ORDER.map(function (id) { return self.card(id); }), ultCard: this.card(D.ULTIMATE), armorCards: D.ARMOR_ORDER.map(function (id) { return self.card(id); }), lines: D.LINES,
        detail: card && !card.known ? { blind: true, name: card.name, hint: card.hint, card: card } : card ? (arm ? { armor: true, name: w.name, hp: Math.round(w.hp * (card.master ? 1.1 : 1)), fx: w.fx, src: w.src, recipe: w.recipe, card: card } : { name: w.name, line: card.line, atk: Math.round(w.atk * (1 + 0.12 * card.lvl) * (card.master ? 1.25 : 1)), spd: w.spd, fx: w.fx, src: w.src, recipe: w.recipe, card: card }) : null,
        craft: c ? { step: c.step, temp: Math.round(c.temp * 100), hits: c.hits.length, mode: c.mode, master: !!c.master, heatOk: c.heatOk, wid: c.wid } : null,
        msg: this.msg ? this.msg.t : ''
      };
    },

    /* ---------------------------------------------------------------- 그리기(캔버스 360×640 전체) */
    render: function (ctx, t) {
      var S = MG.Sprites, hd = !!(S && S.ready('forge')), c = this.craft, k, x, y;
      var V = this.view || { fs: 1, ox: 0, oy: 0 };
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
      if (V.ox > 0 || V.oy > 0) {   // v81 풀스크린: 작업대 둘레도 대장간 돌벽 + 화덕의 따뜻한 불빛(검은 여백 없음)
        if (hd) { for (y = 0; y < MG.H; y += 32) for (x = 0; x < MG.W; x += 32) S.draw(ctx, 'forge', 'wall', x, y); } else { ctx.fillStyle = '#2c313b'; ctx.fillRect(0, 0, MG.W, MG.H); }
        ctx.fillStyle = 'rgba(5, 4, 7, 0.7)'; ctx.fillRect(0, 0, MG.W, MG.H);
        var og = ctx.createRadialGradient && ctx.createRadialGradient(MG.W / 2, MG.H * 0.7, 40, MG.W / 2, MG.H * 0.7, Math.max(MG.W, MG.H) * 0.6);
        if (og && og.addColorStop) { og.addColorStop(0, 'rgba(255, 140, 50, 0.16)'); og.addColorStop(1, 'rgba(255, 140, 50, 0)'); ctx.fillStyle = og; ctx.fillRect(0, 0, MG.W, MG.H); }
        ctx.strokeStyle = 'rgba(216, 173, 85, 0.35)'; ctx.lineWidth = 1; ctx.strokeRect(V.ox - 0.5, V.oy - 0.5, 360 * V.fs + 1, 640 * V.fs + 1);
      }
      ctx.setTransform(V.fs, 0, 0, V.fs, V.ox, V.oy);
      ctx.beginPath(); ctx.rect(0, 0, 360, 640); ctx.clip();   // 작업대 그림은 360×640 패널 밖으로 새지 않는다
      // 돌 벽(위: 무기 계보 카드 뒤) · 바닥(격자선 없음) · 횃불 빛
      if (hd) { for (y = 0; y < 300; y += 32) for (x = 0; x < 360; x += 32) S.draw(ctx, 'forge', 'wall', x, y); } else { ctx.fillStyle = '#2c313b'; ctx.fillRect(0, 0, 360, 300); }
      ctx.fillStyle = 'rgba(6, 4, 8, 0.62)'; ctx.fillRect(0, 0, 360, 300);
      var fg = ctx.createLinearGradient && ctx.createLinearGradient(0, 300, 0, 640);
      if (fg && fg.addColorStop) { fg.addColorStop(0, '#2c2520'); fg.addColorStop(1, '#100d0b'); ctx.fillStyle = fg; } else ctx.fillStyle = '#211c18';
      ctx.fillRect(0, 300, 360, 340);
      for (var row = 0; row < 8; row++) for (var col = -1; col < 6; col++) { var tone = (row * 7 + col * 13 + 40) % 5; ctx.fillStyle = 'rgba(' + (74 + tone * 6) + ', ' + (62 + tone * 5) + ', ' + (52 + tone * 4) + ', 0.14)'; ctx.fillRect(col * 72 + (row % 2) * 36 + 5, 304 + row * 44, 64, 38); }
      var wg = ctx.createRadialGradient && ctx.createRadialGradient(180, 470, 20, 180, 470, 260);
      if (wg && wg.addColorStop) { wg.addColorStop(0, 'rgba(255, 140, 50, 0.3)'); wg.addColorStop(1, 'rgba(255, 140, 50, 0)'); ctx.fillStyle = wg; ctx.fillRect(0, 300, 360, 340); }
      // 작업대 틀
      ctx.strokeStyle = 'rgba(216, 173, 85, 0.6)'; ctx.lineWidth = 2; ctx.strokeRect(9, ST.top + 1, 342, ST.bot - ST.top - 2);
      var step = c ? c.step : 'idle';
      var mouth = function (fx, fb, sc, heat) { ctx.fillStyle = 'rgba(255, ' + Math.round(90 + 120 * heat) + ', 40, ' + (0.45 + 0.5 * heat).toFixed(2) + ')'; ctx.fillRect(Math.round(fx - 14 * sc), Math.round(fb - 37 * sc), Math.round(28 * sc), Math.round(29 * sc)); };
      var fire = function (fx, fb, sc, heat) { if (hd) S.draw(ctx, 'forge', 'fire_' + (Math.floor(t * 10) % 4), fx, fb - 9 * sc, false, sc * Math.max(0.45, Math.min(1.35, 0.45 + heat * 0.95))); };
      var blade = function (x0, x1, by) {
        var hg = ctx.createRadialGradient && ctx.createRadialGradient((x0 + x1) / 2, by, 4, (x0 + x1) / 2, by, (x1 - x0) * 0.7);
        if (hg && hg.addColorStop) { hg.addColorStop(0, 'rgba(255, 150, 60, 0.35)'); hg.addColorStop(1, 'rgba(255, 150, 60, 0)'); ctx.fillStyle = hg; ctx.fillRect(x0 - 40, by - 60, x1 - x0 + 80, 120); }
        ctx.fillStyle = '#3a2418'; ctx.fillRect(x0 - 22, by - 5, 18, 6); ctx.fillStyle = '#a8792a'; ctx.fillRect(x0 - 5, by - 9, 4, 14);
        ctx.fillStyle = '#c8401a'; ctx.beginPath(); ctx.moveTo(x0, by - 7); ctx.lineTo(x1 - 10, by - 7); ctx.lineTo(x1 + 4, by - 2); ctx.lineTo(x1 - 10, by + 3); ctx.lineTo(x0, by + 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff9a3c'; ctx.fillRect(x0, by - 6, x1 - x0 - 10, 5); ctx.fillStyle = '#fff0a0'; ctx.fillRect(x0 + 2, by - 6, x1 - x0 - 16, 2);
      };
      if (step === 'idle') {
        // 고른 무기를 모루 위에 — 옆에 화덕과 풀무(배경)
        mouth(ST.FX + 40, ST.FB, 1.3, 0.35); fire(ST.FX + 40, ST.FB, 1.3, 0.3); if (hd) { S.draw(ctx, 'forge', 'furnace', ST.FX + 40, ST.FB, false, 1.3); S.draw(ctx, 'forge', 'bellows_0', 52, ST.FB - 4, false, 1.8); S.draw(ctx, 'forge', 'anvil_big', 180, ST.FB + 6, false, 2.4); }
        if (this.sel && hd) { var fl = Math.sin(t * 3) * 3; var gg = ctx.createRadialGradient && ctx.createRadialGradient(180, 440, 4, 180, 440, 60); if (gg && gg.addColorStop) { gg.addColorStop(0, 'rgba(255, 230, 140, 0.35)'); gg.addColorStop(1, 'rgba(255, 230, 140, 0)'); ctx.fillStyle = gg; ctx.fillRect(110, 380, 140, 120); } var blindSil = !this.isArmor(this.sel) && !this.known(this.sel) ? S.tinted('forge', '#0a0806') : null; S.draw(ctx, 'forge', 'wi_' + this.def(this.sel).sprite, 180, 470 + fl, false, 3, blindSil || undefined); }   // v84 미확인 무기는 모루 위에서도 검은 실루엣
      } else if (step === 'bellows') {
        var heat = Math.min(1.1, c.temp);
        mouth(ST.FX, ST.FB, 2.0, Math.min(1, heat)); fire(ST.FX, ST.FB, 2.0, heat); if (hd) { S.draw(ctx, 'forge', 'billet', ST.FX, ST.FB - 24, false, 2); S.draw(ctx, 'forge', 'furnace', ST.FX, ST.FB, false, 2.0); }
        ctx.fillStyle = '#2a170c'; ctx.fillRect(ST.BX + 50, ST.FB - 44, ST.FX - ST.BX - 98, 9);
        var bf = c.holding ? 1 + Math.floor(t * 14) % 3 : 0;
        if (hd) S.draw(ctx, 'forge', 'bellows_' + bf, ST.BX, ST.FB - 8, false, 3.2);
        if (!c.holding) { var hr = 0.5 + 0.5 * Math.sin(t * 5); ctx.strokeStyle = 'rgba(255, 216, 102, ' + (0.45 + 0.45 * hr).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ST.BX, ST.FB - 52, 40 + hr * 6, 0, Math.PI * 2); ctx.stroke(); }
        var gx = 28, gw = 304, gy = ST.GY, X = function (v) { return gx + gw * v / 1.1; };
        ctx.fillStyle = '#120c08'; ctx.fillRect(gx - 2, gy - 2, gw + 4, 20); ctx.fillStyle = '#3a2a20'; ctx.fillRect(gx, gy, gw, 16);
        ctx.fillStyle = '#ffd86a'; ctx.fillRect(X(CFG.GOLD_LO), gy, X(CFG.GOLD_HI) - X(CFG.GOLD_LO), 16);
        ctx.fillStyle = '#c8344a'; ctx.fillRect(X(CFG.BURN), gy, gx + gw - X(CFG.BURN), 16);
        var inGold = heat >= CFG.GOLD_LO && heat <= CFG.GOLD_HI;
        ctx.fillStyle = inGold ? '#fff6c0' : '#ff8a3c'; ctx.fillRect(gx, gy + 5, Math.max(0, X(heat) - gx), 6);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(X(heat)) - 2, gy - 6, 4, 28);
        ctx.font = '22px Galmuri11, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(14, 8, 4, 0.92)';
        var tt = Math.round(heat * 100) + '%'; ctx.strokeText(tt, 180, gy + 38); ctx.fillStyle = inGold ? '#ffd86a' : heat > CFG.GOLD_HI ? '#ff8a7a' : '#ffe9b8'; ctx.fillText(tt, 180, gy + 38);
      } else if (step === 'anvil') {
        if (hd) S.draw(ctx, 'forge', 'anvil_big', 180, ST.FB + 8, false, 3.0);
        blade(108, 252, ST.PY);
        var n = c.hits.length, p = (c.ringT % CFG.RING) / CFG.RING;
        for (k = 0; k < 3; k++) {
          var hx = ST.PX[k], hy = ST.PY - 2;
          if (k < n) { ctx.fillStyle = c.hits[k] ? '#ffd86a' : '#ff9a3c'; ctx.fillRect(hx - 1, hy - 9, 3, 19); ctx.fillRect(hx - 9, hy - 1, 19, 3); if (c.hits[k]) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(hx - 2, hy - 2, 5, 5); } }
          else if (k === n) {
            var ringR = 12 + 42 * (1 - p), sweet = p >= CFG.PERFECT, tw = 0.5 + 0.5 * Math.sin(t * 14);
            ctx.fillStyle = 'rgba(255, 216, 102, ' + (sweet ? 0.5 : 0.22 + 0.1 * tw).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(hx, hy, 12, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffd866'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, 12, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = sweet ? '#fffbe0' : 'rgba(255, 216, 102, 0.85)'; ctx.lineWidth = sweet ? 5 : 2; ctx.beginPath(); ctx.arc(hx, hy, ringR, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.fillRect(hx - 1 + Math.round(Math.cos(t * 9) * 4), hy - 1 + Math.round(Math.sin(t * 9) * 4), 2, 2);
          } else { ctx.strokeStyle = 'rgba(255, 216, 102, 0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.stroke(); }
        }
        var ht = c.t - this.hammerT, hang = ht < 0.18 ? -0.2 + ht * 6 : (ht < 0.35 ? 0.9 - (ht - 0.18) * 5 : -0.6), hpx = ST.PX[Math.min(2, Math.max(0, n - (ht < 0.35 ? 1 : 0)))];
        if (hd) { ctx.save(); ctx.translate(hpx + 34, ST.PY - 66); ctx.rotate(Math.PI + hang); var hm = S.item('forge', 'smith_hammer'); if (hm) ctx.drawImage(S.img('forge'), hm.x, hm.y, hm.w, hm.h, -hm.ax * 2.4, -hm.ay * 2.4, hm.w * 2.4, hm.h * 2.4); ctx.restore(); }
      } else if (step === 'quench' || step === 'done') {
        if (step === 'quench') { var pq = 0.5 + 0.5 * Math.sin(t * 5); ctx.strokeStyle = 'rgba(138, 232, 248, ' + (0.4 + 0.5 * pq).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(180, ST.FB - 46, 98 + pq * 6, 56 + pq * 4, 0, 0, Math.PI * 2); ctx.stroke(); }
        if (hd) S.draw(ctx, 'forge', 'tub', 180, ST.FB + 6, false, 3.2);
        ctx.fillStyle = 'rgba(138, 232, 248, 0.55)'; for (k = 0; k < 5; k++) ctx.fillRect(110 + ((t * 30 + k * 31) % 130), ST.FB - 78 + (k % 2) * 4, 12, 2);
        if (step === 'quench') blade(120, 240, ST.FB - 128 + Math.round(Math.sin(t * 3) * 3));
        else if (hd) {
          var rq = c.revealT / CFG.REVEAL, grow = Math.min(1, c.revealT / 0.35), fade = rq > 0.85 ? Math.max(0, (1 - rq) / 0.15) : 1, rcx = 180, rcy = 450;
          ctx.globalAlpha = 0.5 * fade; ctx.fillStyle = '#000'; ctx.fillRect(10, ST.top + 2, 340, ST.bot - ST.top - 4);
          if (c.master) { var pl = ctx.createLinearGradient && ctx.createLinearGradient(0, ST.top, 0, ST.bot); if (pl && pl.addColorStop) { pl.addColorStop(0, 'rgba(255, 216, 102, 0)'); pl.addColorStop(0.5, 'rgba(255, 216, 102, 0.75)'); pl.addColorStop(1, 'rgba(255, 216, 102, 0)'); ctx.globalAlpha = fade; ctx.fillStyle = pl; ctx.fillRect(rcx - 34 - 10 * Math.sin(c.revealT * 9), ST.top + 2, 68 + 20 * Math.sin(c.revealT * 9), ST.bot - ST.top - 4); } }
          ctx.save(); ctx.translate(rcx, rcy); ctx.rotate(c.revealT * 1.4); ctx.globalAlpha = 0.5 * fade;
          for (k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = c.master ? '#ffd866' : '#e8f4ff'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5, -80 * grow); ctx.lineTo(5, -80 * grow); ctx.closePath(); ctx.fill(); }
          ctx.restore(); ctx.globalAlpha = fade;
          S.draw(ctx, 'forge', 'wi_' + this.def(c.wid).sprite, rcx, rcy + 24, false, 1 + 3 * (1 - Math.pow(1 - grow, 3)));
          if (c.master && S.ready('icons')) S.draw(ctx, 'icons', 'star', rcx + 30, rcy - 70, false, 1.8);
          ctx.globalAlpha = 1;
        }
      }
      // 연출
      for (k = 0; k < this.sparks.length; k++) { var sp = this.sparks[k]; ctx.globalAlpha = Math.max(0, 1 - sp.t / 0.7); ctx.fillStyle = sp.c; ctx.fillRect(Math.round(sp.x), Math.round(sp.y), sp.big ? 4 : 3, sp.big ? 4 : 3); }
      for (k = 0; k < this.steam.length; k++) { var stm = this.steam[k]; if (stm.t < 0) continue; ctx.globalAlpha = Math.max(0, 0.9 * (1 - stm.t / 1.4)); if (hd) S.draw(ctx, 'forge', 'steam', stm.x, stm.y, false, 1.5 + stm.t * 2); }
      ctx.globalAlpha = 1;
      if (this.flashT > 0) { ctx.globalAlpha = Math.min(0.7, this.flashT * 3); ctx.fillStyle = '#fffbe8'; ctx.fillRect(10, ST.top + 2, 340, ST.bot - ST.top - 4); ctx.globalAlpha = 1; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (k = 0; k < this.pops.length; k++) {
        var pp = this.pops[k], q = pp.t / pp.life, py = pp.y - 18 * Math.min(1, q * 2), sz = pp.size * (1 + 0.3 * Math.max(0, 1 - pp.t / 0.12));
        ctx.globalAlpha = q < 0.7 ? 1 : Math.max(0, (1 - q) / 0.3);
        ctx.font = Math.round(sz) + 'px Galmuri11, sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(14, 8, 4, 0.92)'; ctx.strokeText(pp.text, pp.x, py); ctx.fillStyle = pp.col; ctx.fillText(pp.text, pp.x, py);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };
})(window);
