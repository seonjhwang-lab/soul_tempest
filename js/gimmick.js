/* ==========================================================================
   gimmick.js — v82 지형 기믹 세 가지(MG.Gimmick). 새 버튼 없이 — 오직 공격/마법 판정 · 스마트 원버튼 · 인게임 이펙트와 소리로만.
     ① 《젤다》 지하 던전 전실의 고대 봉인 장치: 꺼진 룬 화로(화염이면 즉시 · 공격 3번이면 불씨가 옮겨붙는다) ·
        공명 수정 스위치(베기/검기 한 번) · 균열된 봉인 비석(모아베기 · 실드 배쉬 · 발도 · 단두대 같은 강공격) →
        방의 장치를 모두 켜면(또는 수문장을 쓰러뜨리면) 「🔓 고대 봉인 해제!」 — 보스 둥지 문이 열리고 전실 가운데 보물상자가 깨어난다.
     ② 《몬스터 헌터》 보스 둥지의 불안정한 지형(둥지마다 2개): 보스가 돌진/강타로 기둥을 들이받거나, 보스가 곁에 있을 때
        플레이어가 모아베기/마법으로 무너뜨리면 「💥 지형 붕괴 대경직!」 — 보스 최대 체력 12% · 부위 내구도 40% · 3.5초 그로기.
     ③ 《바람의 나라》 필드 4방위 사신수의 성소: [🔥 가호 받기] — 청룡 · 백호 · 주작 · 현무 중 하나(동시에 하나, 언제든 바꾼다).
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;

  function strongOf(info) { return !!(info.strong || info.kind === 'charge' || info.kind === 'special'); }

  var Gim = MG.Gimmick = {
    /* World.init 이 부른다: 이 맵의 장치 · 함정 · 성소 목록 */
    build: function (M) {
      var S = MG.S, out = { devices: [], traps: [], beasts: [] };
      (M.puzzle || []).forEach(function (p) { var open = !p.temp && !!(S.gates && S.gates[p.gate]); out.devices.push({ id: p.id, kind: p.kind, x: p.x, y: p.y, gate: p.gate, temp: !!p.temp, torch: !!p.torch, on: open || (!p.temp && !!(S.puzzles && S.puzzles[p.id])), prog: 0, hitT: 0, onT: 9, msgT: 0 }); });   // v83: 미궁의 장치(temp)는 저장하지 않는다
      var boss = M.boss && MG.Bosses && MG.Bosses.byId ? MG.Bosses.byId(M.boss) : null;
      (M.traps || []).forEach(function (t) { out.traps.push({ i: t.i, kind: t.kind, x: t.x, y: t.y, down: !!(boss && boss.trapsDown && boss.trapsDown[t.i]), shakeT: 0, msgT: 0, downT: 9 }); });
      if (M.kind === 'field') D.BEAST_ORDER.forEach(function (id) { var b = D.BEASTS[id]; out.beasts.push({ id: id, x: b.x, y: b.y }); });
      return out;
    },
    update: function (dt) {
      var W = MG.World, i;
      for (i = 0; i < W.devices.length; i++) { var d = W.devices[i]; d.hitT = Math.max(0, d.hitT - dt); d.onT += dt; d.msgT = Math.max(0, d.msgT - dt); }
      for (i = 0; i < W.traps.length; i++) { var t = W.traps[i]; t.shakeT = Math.max(0, t.shakeT - dt); t.msgT = Math.max(0, t.msgT - dt); t.downT += dt; }
    },

    /* ---------------------------------------------------------------- 플레이어 판정 → 장치/함정 */
    /* 근접 휘두르기(Combat.sweep 이 매 프레임): 부채꼴 안의 장치 · 기둥 — 한 번 휘두르기에 한 번(P.hitSet) */
    sweep: function (P, o) {
      var W = MG.World, fa = Math.atan2(P.fy, P.fx), list = W.devices.concat(W.traps), n = 0;
      for (var i = 0; i < list.length; i++) {
        var g = list[i]; if (P.hitSet.indexOf(g) >= 0 || g.down) continue;
        var d = U.dist(P.x, P.y, g.x, g.y), rr = (g.i !== undefined && g.gate === undefined) ? D.TRAP.r : 8;
        if (d > o.range + rr + 2) continue;
        // 록온은 언제나 적을 향한다 — 모아베기 · 특수기의 충격은 사방의 지형을 흔들고(방향 무관), 평타는 부채꼴 +30° 안
        if (!o.spin && !strongOf(o) && d > rr + 4 && Math.abs(U.angDiff(fa, Math.atan2(g.y - P.y, g.x - P.x))) > (o.arc + 30) * Math.PI / 180) continue;
        P.hitSet.push(g); this.hitOne(g, { kind: o.kind, fire: MG.Combat.weapon().def.elem === 'fire' }); n++;
      }
      return n;
    },
    /* 원형 범위(마법 · 단두대 · 낙뢰 · 충격파): seen 배열이 있으면 한 번만 */
    area: function (x, y, r, info, seen) {
      var W = MG.World, list = W.devices.concat(W.traps), n = 0;
      for (var i = 0; i < list.length; i++) {
        var g = list[i]; if (g.down || (seen && seen.indexOf(g) >= 0)) continue;
        if (U.dist(x, y, g.x, g.y - 6) < r + 8) { if (seen) seen.push(g); this.hitOne(g, info); n++; }
      }
      return n;
    },
    /* 직사각형(건곤대나이 참격) */
    rect: function (x, y, a, len, hw, info) {
      var W = MG.World, list = W.devices.concat(W.traps), n = 0;
      for (var i = 0; i < list.length; i++) { var g = list[i]; if (g.down) continue; var dx = g.x - x, dy = g.y - y, al = dx * Math.cos(a) + dy * Math.sin(a), sd = -dx * Math.sin(a) + dy * Math.cos(a); if (al > -6 && al < len && Math.abs(sd) < hw + 8) { this.hitOne(g, info); n++; } }
      return n;
    },
    /* 불길(World.burn — 화염진 · 화염 무기): 꺼진 룬 화로는 곧바로 붙는다 */
    burn: function (x, y, r) {
      var W = MG.World, n = 0;
      for (var i = 0; i < W.devices.length; i++) { var d = W.devices[i]; if (d.kind !== 'brazier' || d.on) continue; if (U.dist(x, y, d.x, d.y) < r + 8) { this.activate(d, '🔥 룬 화로 점화!'); n++; } }
      return n;
    },
    hitOne: function (g, info) {
      if (g.gate !== undefined) return this.hitDevice(g, info);
      return this.hitTrap(g, info);
    },

    /* ---------------------------------------------------------------- ① 전실 봉인 장치 */
    hitDevice: function (d, info) {
      var FX = MG.FX; if (d.on) return false;
      d.hitT = 0.25;
      if (d.kind === 'switch') { this.activate(d, '💠 수정 공명!'); return true; }
      if (d.kind === 'brazier') {
        if (info.fire) { this.activate(d, '🔥 룬 화로 점화!'); return true; }
        d.prog++;
        if (FX) { FX.burst(d.x, d.y - 14, 6, ['#ffb238', '#ff7424', '#fff6c0'], 60, { up: true }); FX.text(d.x, d.y - 30, '불씨 ' + d.prog + '/' + D.DEVICE.brazier.sparks, '#ffb238', 0.6, 10); }
        if (d.prog >= D.DEVICE.brazier.sparks) this.activate(d, '🔥 룬 화로 점화!');
        return true;
      }
      if (d.kind === 'stone') {
        if (strongOf(info)) { this.activate(d, '💥 봉인 비석 파괴!'); return true; }
        if (FX && d.msgT <= 0) { d.msgT = 0.8; FX.text(d.x, d.y - 34, '팅! 강공격이 필요하다', '#c4ccd6', 0.7, 10); FX.burst(d.x, d.y - 16, 4, ['#c4ccd6', '#6c7684'], 50); }
        return false;
      }
      return false;
    },
    activate: function (d, text) {
      var S = MG.S, FX = MG.FX, SFX = MG.SFX;
      if (d.on) return false;
      d.on = true; d.onT = 0; if (!d.temp) { S.puzzles = S.puzzles || {}; S.puzzles[d.id] = true; }
      if (FX) {
        var col = d.kind === 'switch' ? ['#8ae8f8', '#e4fdff', '#c4a8ff'] : d.kind === 'brazier' ? ['#ffb238', '#ff7424', '#fff6c0'] : ['#c4ccd6', '#4a525e', '#ffd866'];
        FX.burst(d.x, d.y - 16, 22, col, 110, { up: true }); FX.ring(d.x, d.y - 12, 3, 22, 0.4, col[0], 2); FX.text(d.x, d.y - 38, text, col[0], 1.1, 12, { pop: true }); FX.shake(2, 0.15);
      }
      if (SFX) { if (d.kind === 'stone') SFX.crash(); else SFX.anvil(d.kind === 'switch' ? 3 : 1); }
      MG.emit('device', d);
      if (d.temp) return true;   // v83 미궁: 횃불은 빛만 · 퍼즐 방 돌파는 labyrinth.js 가 판정
      var all = MG.World.devices.filter(function (o) { return o.gate === d.gate; }).every(function (o) { return o.on; });
      if (all && MG.Game && MG.Game.unseal) MG.Game.unseal(d.gate, 'puzzle');
      else if (MG.Save) MG.Save.save();
      return true;
    },
    /* 봉인이 풀렸다: 남은 장치도 모두 빛나게 */
    lightAll: function (gate) { MG.World.devices.forEach(function (o) { if (o.gate === gate && !o.on) { o.on = true; o.onT = 0; } }); },

    /* ---------------------------------------------------------------- ② 보스 둥지 지형 함정 */
    bossHere: function () { var h = MG.Bosses ? MG.Bosses.here() : []; for (var i = 0; i < h.length; i++) if (h[i].alive && !h[i].dormant) return h[i]; return null; },
    hitTrap: function (t, info) {
      if (t.down) return false;
      var strong = strongOf(info) || info.kind === 'spell', B = this.bossHere(), FX = MG.FX;
      t.shakeT = 0.3;
      if (!strong) { if (FX && t.msgT <= 0) { t.msgT = 1; FX.text(t.x, t.y - 44, '쩌억… 모아베기나 마법이 필요하다', '#e8e0d0', 0.8, 10); } return false; }
      if (B && U.dist(B.x, B.y, t.x, t.y) <= D.TRAP.near + B.r) return this.collapse(t, B, 'player');
      if (FX && t.msgT <= 0) { t.msgT = 1; FX.text(t.x, t.y - 44, '흔들린다 — 보스를 기둥 곁으로 유인하라', '#ffd866', 1.0, 10); FX.burst(t.x, t.y - 20, 8, D.TRAPS[t.kind].col, 60); }
      return false;
    },
    /* 보스의 강타/돌진이 기둥에 닿았다(원형 · 몸통) */
    bossStrike: function (boss, x, y, r) { var W = MG.World, n = 0; for (var i = 0; i < W.traps.length; i++) { var t = W.traps[i]; if (!t.down && U.dist(x, y, t.x, t.y) < r + D.TRAP.r) { this.collapse(t, boss, 'boss'); n++; } } return n; },
    bossLine: function (boss, a, len, w) { var n = 0; for (var s = 20; s <= len; s += 18) n += this.bossStrike(boss, boss.x + Math.cos(a) * s, boss.y + Math.sin(a) * s, w / 2); return n; },
    bossBody: function (boss) { return this.bossStrike(boss, boss.x, boss.y, boss.r + 4); },
    collapse: function (t, boss, by) {
      var FX = MG.FX, T = D.TRAP, info = D.TRAPS[t.kind] || D.TRAPS.root;
      if (t.down) return false;
      t.down = true; t.downT = 0;
      if (boss) { boss.trapsDown = boss.trapsDown || {}; boss.trapsDown[t.i] = true; }
      if (FX) { FX.shake(7, 0.45); FX.flash('#fff3c0', 0.12); FX.burst(t.x, t.y - 24, 46, info.col.concat(['#ffffff']), 170); FX.ring(t.x, t.y - 6, 6, 52, 0.5, info.col[0], 4); FX.crack(t.x, t.y + 2, Math.PI / 2, 46); FX.hitstop(0.1); }
      if (MG.SFX) MG.SFX.crash();
      if (boss && boss.alive) { if (by === 'boss') boss.trapPending = t.kind; else this.stagger(boss, t.kind); }   // 보스가 스스로 들이받았다 → 그 공격 판정이 끝난 다음 프레임에 대경직
      MG.emit('trap', t, by);
      return true;
    },
    /* 💥 지형 붕괴 대경직: 최대 체력 12% · 부위 내구도 40% · 3.5초 그로기 */
    stagger: function (boss, kind) {
      var FX = MG.FX, T = D.TRAP, info = D.TRAPS[kind] || D.TRAPS.root;
      boss.trapPending = null; if (!boss.alive) return false;
      {
        var dmg = Math.round(boss.maxHp * T.dmg), part = boss.partBroken ? 0 : Math.round(boss.partMax * T.part);
        if (boss.state === 'groggy') dmg = Math.round(dmg / 1.3);   // 이미 쓰러져 있어도 붕괴 피해는 언제나 최대 체력의 12%
        boss.hurt({ dmg: dmg, part: part, kind: 'trap', dot: true });
        if (boss.alive) { boss.state = 'groggy'; boss.st = 0; boss.tele = null; boss.atk = null; boss.z = 0; boss.stagger = 0; }
        if (FX) { FX.text(boss.x, boss.y - 58, '💥 지형 붕괴 대경직!', '#ffd866', 1.8, 17, { pop: true, rise: 8 }); FX.text(boss.x, boss.y - 36, '-' + dmg, '#ffffff', 1.0, 14, { pop: true }); FX.slow(0.4, 0.2); }
        if (MG.UI && MG.UI.ribbon) MG.UI.ribbon('💥 ' + info.name + ' 붕괴 — 대경직!', 2400);   // 360px 폭에도 한 줄
        var S = MG.S; S.collapses = (S.collapses || 0) + 1;
      }
      return true;
    },

    /* ---------------------------------------------------------------- ③ 사신수의 성소 */
    bless: function (b) {
      var S = MG.S, P = MG.Player, B = D.BEASTS[b.id], FX = MG.FX;
      if (S.blessing === b.id) { if (FX) FX.text(P.x, P.y - 34, B.icon + ' 이미 ' + B.name + '의 가호 아래 있다', B.col, 0.9, 11); return false; }
      S.blessing = b.id;
      if (FX) { FX.flash(B.col, 0.14); FX.ring(b.x, b.y - 18, 4, 46, 0.7, B.col, 3); FX.ring(P.x, P.y - 4, 30, 6, 0.6, B.col, 2); FX.burst(b.x, b.y - 24, 34, [B.col, '#ffffff', '#ffd866'], 120, { up: true, g: -30 }); FX.text(b.x, b.y - 52, B.icon + ' ' + B.name + '의 가호!', B.col, 1.4, 14, { pop: true }); }
      if (MG.SFX) MG.SFX.parry();
      if (FX && FX.phantom) FX.phantom(P.x, P.y - 34, b.id, 1.2);   // v83 신수 환영이 머리 위로 피어오른다
      if (MG.UI) MG.UI.ribbon(B.icon + ' ' + B.name + '의 가호 — ' + B.short, 2800);
      MG.emit('bless', b.id);
      if (MG.Save) MG.Save.save();
      return true;
    },

    /* 안내 말풍선(행동 아님) */
    hint: function (x, y) {
      var W = MG.World, i;
      for (i = 0; i < W.devices.length; i++) { var d = W.devices[i]; if (!d.on && U.dist(x, y, d.x, d.y) < 40) return { emo: D.DEVICE[d.kind].hint.slice(0, 2), label: D.DEVICE[d.kind].hint.slice(2).trim() }; }
      for (i = 0; i < W.traps.length; i++) { var t = W.traps[i]; if (!t.down && U.dist(x, y, t.x, t.y) < 40) return { emo: '💥', label: '보스를 유인해 무너뜨리기' }; }
      return null;
    },

    /* ---------------------------------------------------------------- 그리기(월드 좌표, y 정렬) */
    collect: function (list, vis) {
      var W = MG.World, i;
      for (i = 0; i < W.devices.length; i++) if (vis(W.devices[i].x, W.devices[i].y)) list.push({ y: W.devices[i].y, o: W.devices[i], f: drawDevice });
      for (i = 0; i < W.traps.length; i++) if (vis(W.traps[i].x, W.traps[i].y)) list.push({ y: W.traps[i].y, o: W.traps[i], f: drawTrap });
      for (i = 0; i < W.beasts.length; i++) if (vis(W.beasts[i].x, W.beasts[i].y)) list.push({ y: W.beasts[i].y, o: W.beasts[i], f: drawBeast });
    }
  };

  function glow(ctx, x, y, r, col, a) { var g = ctx.createRadialGradient && ctx.createRadialGradient(x, y, 1, x, y, r); if (!g || !g.addColorStop) return; g.addColorStop(0, col.replace(')', ', ' + a.toFixed(2) + ')').replace('rgb(', 'rgba(')); g.addColorStop(1, col.replace(')', ', 0)').replace('rgb(', 'rgba(')); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function drawDevice(ctx, d, t) {
    var S = MG.Sprites, rb = S && S.ready('rb'), jit = d.hitT > 0 ? Math.round(Math.sin(d.hitT * 70) * 1.5) : 0, pu = 0.5 + 0.5 * Math.sin(t * 4 + d.x);
    MG.World.groundShadow(ctx, d.x, d.y + 1, 9, 3, 0.3);
    if (d.kind === 'brazier') {
      if (d.on) glow(ctx, d.x, d.y - 16, 30, 'rgb(255, 150, 60)', 0.3 + 0.12 * pu);
      if (rb) S.draw(ctx, 'rb', d.on ? 'dev_brazier_on' : 'dev_brazier_off', d.x + jit, d.y); else { ctx.fillStyle = d.on ? '#ff9a3c' : '#4a525e'; ctx.fillRect(d.x - 7, d.y - 18, 14, 18); }
      if (d.on && S && S.ready('forge')) S.draw(ctx, 'forge', 'fire_' + ((Math.floor(t * 12) + (d.x | 0)) % 4), d.x, d.y - 15, false, 0.6);
      else if (d.prog > 0) { ctx.fillStyle = 'rgba(255, 178, 56, ' + (0.4 + 0.4 * pu).toFixed(2) + ')'; for (var k = 0; k < d.prog; k++) ctx.fillRect(Math.round(d.x - 3 + k * 3), Math.round(d.y - 19), 2, 2); }
    } else if (d.kind === 'switch') {
      if (d.on) glow(ctx, d.x, d.y - 14, 28, 'rgb(138, 232, 248)', 0.28 + 0.15 * pu);
      if (rb) S.draw(ctx, 'rb', d.on ? 'dev_switch_on' : 'dev_switch_off', d.x + jit, d.y); else { ctx.fillStyle = d.on ? '#8ae8f8' : '#3a3048'; ctx.fillRect(d.x - 6, d.y - 22, 12, 22); }
    } else {
      if (rb) S.draw(ctx, 'rb', d.on ? 'dev_stone_x' : 'dev_stone', d.x + jit, d.y); else { ctx.fillStyle = d.on ? '#30363f' : '#6c7684'; ctx.fillRect(d.x - 8, d.y - (d.on ? 6 : 26), 16, d.on ? 6 : 26); }
      if (!d.on) { ctx.fillStyle = 'rgba(176, 144, 240, ' + (0.35 + 0.35 * pu).toFixed(2) + ')'; ctx.fillRect(Math.round(d.x - 1), Math.round(d.y - 20), 2, 9); }
    }
    if (d.on && d.onT < 0.6) { ctx.strokeStyle = 'rgba(255, 246, 192, ' + (1 - d.onT / 0.6).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(d.x, d.y, 10 + d.onT * 40, 5 + d.onT * 20, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  function drawTrap(ctx, tr, t) {
    var S = MG.Sprites, rb = S && S.ready('rb'), info = D.TRAPS[tr.kind] || D.TRAPS.root, jit = tr.shakeT > 0 ? Math.round(Math.sin(tr.shakeT * 80) * 2) : 0, pu = 0.5 + 0.5 * Math.sin(t * 3 + tr.i);
    if (tr.down) { if (rb) S.draw(ctx, 'rb', info.sprite + '_x', tr.x, tr.y + 2); else { ctx.fillStyle = '#30363f'; ctx.fillRect(tr.x - 14, tr.y - 6, 28, 8); } return; }
    MG.World.groundShadow(ctx, tr.x, tr.y + 1, 13, 4, 0.34);   // v83 접지 그림자 + 림
    if (tr.kind === 'crystal') glow(ctx, tr.x, tr.y - 28, 26, 'rgb(196, 168, 255)', 0.18 + 0.2 * pu);
    else if (tr.kind === 'thorn' || tr.kind === 'storm') glow(ctx, tr.x, tr.y - 22, 24, 'rgb(255, 120, 50)', 0.16 + 0.18 * pu);
    if (rb) S.draw(ctx, 'rb', info.sprite, tr.x + jit, tr.y); else { ctx.fillStyle = info.col[0]; ctx.fillRect(tr.x - 9, tr.y - 44, 18, 44); }
    if (MG.FX && Math.random() < 0.05) { if (tr.kind === 'storm' || tr.kind === 'thorn') MG.FX.ember(tr.x + (Math.random() - 0.5) * 10, tr.y - 30); else if (tr.kind === 'ice') MG.FX.burst(tr.x + (Math.random() - 0.5) * 12, tr.y - 40, 1, ['#e4fdff'], 10, { g: 40 }); }
    // 금(균열) — 무너질 듯한 지형임을 알려 주는 빛나는 틈
    ctx.fillStyle = 'rgba(255, 216, 102, ' + (0.25 + 0.3 * pu).toFixed(2) + ')'; ctx.fillRect(Math.round(tr.x - 2 + jit), Math.round(tr.y - 30), 1, 10); ctx.fillRect(Math.round(tr.x - 1 + jit), Math.round(tr.y - 21), 3, 1);
  }
  function drawBeast(ctx, b, t) {
    var S = MG.Sprites, B = D.BEASTS[b.id], on = MG.S.blessing === b.id, pu = 0.5 + 0.5 * Math.sin(t * 2.4 + b.x);
    var rgb = B.col.replace('#', ''), r = parseInt(rgb.slice(0, 2), 16), g = parseInt(rgb.slice(2, 4), 16), bb = parseInt(rgb.slice(4, 6), 16), c = 'rgb(' + r + ', ' + g + ', ' + bb + ')';
    MG.World.groundShadow(ctx, b.x, b.y + 1, 15, 4.5, 0.32);
    glow(ctx, b.x, b.y - 20, on ? 40 : 28, c, (on ? 0.3 : 0.14) + 0.12 * pu);
    if (S && S.ready('rb')) S.draw(ctx, 'rb', B.sprite, b.x, b.y); else { ctx.fillStyle = B.col; ctx.fillRect(b.x - 10, b.y - 36, 20, 36); }
    if (on) { ctx.fillStyle = B.col; for (var k = 0; k < 3; k++) { var a = t * 1.6 + k * 2.09; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 5 + k); ctx.fillRect(Math.round(b.x + Math.cos(a) * 16), Math.round(b.y - 22 + Math.sin(a) * 6), 2, 2); } ctx.globalAlpha = 1; }
  }
  Gim.drawDevice = drawDevice; Gim.drawTrap = drawTrap; Gim.drawBeast = drawBeast;
})(window);
