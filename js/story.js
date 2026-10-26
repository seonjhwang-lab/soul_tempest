/* ==========================================================================
   story.js — v86 스토리 패키징: 도트 시네마틱 오프닝(새로 시작 · 10초) · 진 엔딩(기사왕 카인 토벌 → 폭풍이 걷히는 새벽 → 엔딩 크레딧)
   · 화면 전체 캔버스 컷씬(대사 창 없음). 오른쪽 위 [스킵 ⏩] · ESC · 화면 터치 · 패드 START/B 로 언제든 건너뛴다.
   · 컷씬 동안 HUD · 조작 버튼은 감춘다(body.mg-cine). 월드는 멈춘다(Game.paused).
   · 오프닝: 폭풍 하늘 · 왕의 무덤 → 기사왕 카인(cine_king) → 다섯 괴수의 혼과 봉인 사슬 → 폭풍을 마주 선 사냥꾼(cine_hunter) + 로고
   · 진 엔딩: 폭풍 구름이 갈라지고 새벽 해(cine_sun)가 떠오른다 → 사냥꾼의 야영지(실제 월드) 위로 크레딧이 올라간다(전설의 사냥꾼 기록 + 개발 스태프)
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;
  var doc = global.document;

  var INTRO_LINES = [
    [0.3, 2.8, '백 년 전, 폭풍의 왕국을 지키던 기사왕 카인이 있었다.'],
    [2.9, 5.4, '왕의 무덤에 잠든 그는 심연에 잠식되어, 끝나지 않는 폭풍을 부른다.'],
    [5.5, 7.9, '다섯 괴수의 혼이 무덤의 봉인을 붙들고 있다 — 사슬은 다섯.'],
    [8.0, 10.0, '사냥꾼이여, 검을 들어라. 폭풍의 끝에서 왕이 기다린다.']
  ];
  var DAWN_LINES = [
    [0.4, 2.9, '카인이 쓰러지자, 백 년의 폭풍이 걷혔다.'],
    [3.0, 5.6, '심연의 왕은 마침내 안식을 얻었고 —'],
    [5.7, 8.2, '왕의 무덤 위로, 백 년 만의 새벽이 밝아 온다.']
  ];
  var CFG = { INTRO: 10, DAWN: 8.6, SCROLL: 30, HOLD: 2.6, SKIP_GUARD: 0.35 };

  var Story = MG.Story = {
    active: null, CFG: CFG, INTRO_LINES: INTRO_LINES, DAWN_LINES: DAWN_LINES, played: [],
    /* 컷씬 시작: id = 'intro' | 'ending', done = 끝나면(스킵 포함) 부를 함수 */
    play: function (id, done) {
      var H = MG.H;
      this.active = { id: id, t: 0, done: done || null, parts: [], streaks: [], bolt: null, boltT: 0, skipped: false, credits: id === 'ending' ? this.creditList() : null, scrollY: H, phase: id === 'ending' ? 'dawn' : 'storm', bgSet: false };
      this.played.push(id);
      this.setUi(true);
      if (MG.Input && MG.Input.reset) MG.Input.reset();   // 누르고 있던 공격 · 이동이 컷씬 뒤로 새지 않게
      if (MG.SFX && MG.SFX.bgmStop) try { MG.SFX.bgmStop(); } catch (e) { /* 무음 */ }
      MG.emit('storyStart', id);
      return this.active;
    },
    setUi: function (on) {
      var b = doc && doc.body; if (b && b.classList) b.classList.toggle('mg-cine', !!on);
      var c = doc && doc.getElementById && doc.getElementById('cine-ui'); if (c) c.hidden = !on;
      var k = doc && doc.getElementById && doc.getElementById('cine-skip'); if (k) k.textContent = '스킵 ⏩';
    },
    phase: function () { var A = this.active; return A ? A.phase : null; },
    /* 크레딧 구간은 실제 월드(사냥꾼의 야영지)를 배경으로 그린다 */
    worldBg: function () { var A = this.active; return !!(A && A.id === 'ending' && A.phase !== 'dawn'); },
    skip: function () { var A = this.active; if (!A || A.t < CFG.SKIP_GUARD) return false; A.skipped = true; this.finish(); return true; },
    finish: function () {
      var A = this.active; if (!A) return;
      this.active = null; this.setUi(false);
      if (A.id === 'ending') this.toCamp();
      if (MG.Input && MG.Input.reset) MG.Input.reset();
      MG.emit('storyEnd', A.id, A.skipped);
      if (A.done) A.done(A.skipped);
    },
    /* 진 엔딩 뒤에는 사냥꾼의 야영지 화톳불 곁에서 다시 시작한다 */
    toCamp: function () {
      var G = MG.Game, W = MG.World; if (!G) return;
      var camp = (D.MAPS.field.bonfires || []).filter(function (b) { return b.id === 'camp'; })[0];
      var cx = camp ? camp.x : D.WORLD.START[0], cy = camp ? camp.y + 26 : D.WORLD.START[1];
      if (W.id !== 'field') G.enterMap('field', cx, cy, true); else { MG.Player.place(cx, cy); }
      MG.S.lastFire = 'camp'; G.snapCam();
    },
    update: function (dt, b) {
      var A = this.active; if (!A) return;
      A.t += dt;
      if (b && (b.esc.pressed || b.menu.pressed)) { this.skip(); if (!this.active) return; }
      var W = MG.W, H = MG.H, k;
      // 푸른 불티(아래에서 위로) · 칼바람 줄기(대각선)
      var dawn = A.id === 'ending';
      if (A.parts.length < 90 && Math.random() < dt * 60) A.parts.push({ x: Math.random() * W, y: H + 6, vx: (Math.random() - 0.3) * 18, vy: -(26 + Math.random() * 46), life: 3 + Math.random() * 3, t: 0, s: Math.random() < 0.25 ? 2 : 1, c: dawn ? (Math.random() < 0.5 ? '#ffd866' : '#fff6c0') : (Math.random() < 0.6 ? '#4deeea' : '#9ad8ff') });
      if (A.streaks.length < 14 && Math.random() < dt * 8) A.streaks.push({ x: -40 - Math.random() * 120, y: Math.random() * H * 0.9, v: 340 + Math.random() * 260, L: 40 + Math.random() * 70, t: 0 });
      for (k = A.parts.length - 1; k >= 0; k--) { var p = A.parts[k]; p.t += dt; p.x += (p.vx + Math.sin(A.t * 2 + k) * 10) * dt; p.y += p.vy * dt; if (p.t > p.life || p.y < -8) A.parts.splice(k, 1); }
      for (k = A.streaks.length - 1; k >= 0; k--) { var s = A.streaks[k]; s.t += dt; s.x += s.v * dt; s.y += s.v * 0.32 * dt; if (s.x > W + 80) A.streaks.splice(k, 1); }
      // 번개(오프닝 · 새벽 직전)
      A.boltT -= dt;
      var strikes = A.id === 'intro' ? [1.1, 3.0, 4.4, 6.9, 8.6] : [0.2, 1.4];
      for (k = 0; k < strikes.length; k++) if (A.t - dt < strikes[k] && A.t >= strikes[k]) { A.bolt = this.makeBolt(W, H); A.boltT = 0.22; }
      if (A.id === 'intro') { A.phase = A.t < 2.9 ? 'storm' : A.t < 5.5 ? 'king' : A.t < 8.0 ? 'seals' : 'hunter'; if (A.t >= CFG.INTRO) this.finish(); return; }
      // 진 엔딩: 새벽 → 크레딧(야영지 배경으로 옮겨 간다) → 마지막 인사
      if (A.phase === 'dawn' && A.t >= CFG.DAWN) { A.phase = 'credits'; this.toCamp(); A.creditT = 0; }
      if (A.phase === 'credits') {
        A.creditT += dt; var G = MG.Game, P = MG.Player;
        if (G) { var tx = U.clamp(P.x - MG.VW / 2 + Math.sin(A.creditT * 0.12) * 26, 0, Math.max(0, MG.World.W - MG.VW)), ty = U.clamp(P.y - MG.VH / 2 - 10, 0, Math.max(0, MG.World.H - MG.VH)); G.cam.x = tx; G.cam.y = ty; }
        A.scrollY = H - A.creditT * this.speed();
        if (A.scrollY + this.creditHeight() < H * 0.42) { A.phase = 'thanks'; A.thanksT = 0; }
      } else if (A.phase === 'thanks') { A.thanksT += dt; if (A.thanksT >= CFG.HOLD) this.finish(); }
    },
    speed: function () { return Math.max(28, (MG.H + this.creditHeight()) / CFG.SCROLL); },
    makeBolt: function (W, H) { var x = W * (0.2 + Math.random() * 0.6), pts = [[x, -4]], y = -4; while (y < H * 0.5) { y += 18 + Math.random() * 22; x += (Math.random() - 0.5) * 40; pts.push([x, y]); } return pts; },

    /* ---------------------------------------------------------------- 엔딩 크레딧: 전설의 사냥꾼(나의 수렵 기록) + 개발 스태프 */
    creditList: function () {
      var S = MG.S || {}, out = [], H = S.hunts || {}, RK = function (r) { return r === 'S' ? '👑S' : r; };
      var add = function (t, k) { out.push({ t: t, k: k || 'line' }); };
      add('SOUL TEMPEST', 'logo'); add('LEGEND OF THE HUNTER', 'sub'); add('', 'gap');
      add('— 전설의 사냥꾼 —', 'head'); add('폭풍을 끝내고 새벽을 되찾은 자', 'line');
      D.HUNT.order.forEach(function (id) { var b = id === 'k1' ? D.KING : D.BOSSES.filter(function (x) { return x.id === id; })[0], o = H[id], kills = S.bosses && S.bosses[id] && S.bosses[id].kills; add(b.name + '  ' + (o ? o.best.toFixed(1) + '초 · ' + RK(o.rank) : (kills ? '토벌' : '—')), 'rec'); });
      add('⚔️ 상쇄 ' + (S.parries || 0) + '회 · 「격」 ' + (S.gyeoks || 0) + '회 · 보스 러시 최고 ' + (S.rushBest || 0) + '/' + D.RUSH.rounds, 'rec'); add('', 'gap');
      add('— 개발 스태프 —', 'head');
      [['기획 · 디렉션', 'SOUL TEMPEST 개발팀'], ['프로그래밍 · 도트 · 사운드 · 연출', 'Claude Code (Anthropic)'], ['도트 생성기', 'Aseprite Lua 스크립트'], ['품질 검증', '헤드리스 Chrome · 8 뷰포트 자동 실측'], ['테스트 플레이', '폭풍 속을 끝까지 걸어온 모든 사냥꾼']].forEach(function (r) { add(r[0], 'role'); add(r[1], 'name'); });
      add('', 'gap'); add('THANK YOU FOR PLAYING', 'end'); add('수렵은 계속된다 — 재수렵 · 보스 러시 · 👑S 랭크', 'line');
      return out;
    },
    LH: { logo: 34, sub: 22, gap: 26, head: 30, line: 22, rec: 20, role: 18, name: 26, end: 34 },
    creditHeight: function () { var A = this.active, h = 0, L = this.LH; if (!A || !A.credits) return 0; A.credits.forEach(function (c) { h += L[c.k] || 22; }); return h; },

    /* ---------------------------------------------------------------- 그리기(화면 좌표) */
    render: function (g, t) {
      var A = this.active; if (!A) return;
      g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
      if (A.id === 'intro') this.drawIntro(g, A); else if (A.phase === 'dawn') this.drawDawn(g, A); else this.drawCredits(g, A);
      void t;
    },
    sc: function () { return Math.max(2, Math.min(5, Math.floor(Math.min(MG.W / 120, MG.H / 150)))); },
    sprite: function (g, sheet, name, x, y, sc, alpha, tint) {
      var S = MG.Sprites; if (!S || !S.ready || !S.ready(sheet) || !S.item(sheet, name)) return false;
      var a0 = g.globalAlpha; g.globalAlpha = a0 * (alpha === undefined ? 1 : alpha);
      S.draw(g, sheet, name, Math.round(x), Math.round(y), false, sc, tint ? S.tinted(sheet, tint) || undefined : undefined); g.globalAlpha = a0; return true;
    },
    fade: function (t, a, b) { return U.clamp(Math.min((t - a) / 0.5, (b - t) / 0.5), 0, 1); },
    drawSky: function (g, A, top, bot) {
      var W = MG.W, H = MG.H, lg = g.createLinearGradient && g.createLinearGradient(0, 0, 0, H);
      if (lg && lg.addColorStop) { lg.addColorStop(0, top); lg.addColorStop(1, bot); g.fillStyle = lg; } else g.fillStyle = top;
      g.fillRect(0, 0, W, H);
    },
    drawClouds: function (g, A, alpha, part) {   // 폭풍 구름 띠 — part(0~1) 만큼 양옆으로 갈라진다
      var W = MG.W, H = MG.H, i;
      for (i = 0; i < 9; i++) {
        var y = H * (0.04 + i * 0.05), w = W * (0.5 + (i % 3) * 0.2), drift = Math.sin(A.t * 0.25 + i) * 30, side = i % 2 ? 1 : -1, x = W / 2 - w / 2 + drift + side * part * W * 0.7;
        g.globalAlpha = alpha * (0.32 + (i % 3) * 0.12) * (1 - part * 0.8); g.fillStyle = i % 2 ? '#1a1a2c' : '#24203a';
        g.beginPath(); if (g.ellipse) g.ellipse(x + w / 2, y, w / 2, 16 + (i % 4) * 6, 0, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    },
    drawParts: function (g, A) {
      var i;
      for (i = 0; i < A.streaks.length; i++) { var s = A.streaks[i]; g.strokeStyle = A.id === 'ending' && A.phase === 'dawn' ? 'rgba(255, 230, 170, 0.18)' : 'rgba(154, 216, 255, 0.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.L, s.y - s.L * 0.32); g.stroke(); }
      for (i = 0; i < A.parts.length; i++) { var p = A.parts[i]; g.globalAlpha = Math.sin(Math.min(1, p.t / p.life) * Math.PI); g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
      g.globalAlpha = 1;
    },
    drawBolt: function (g, A) {
      if (!A.bolt || A.boltT <= 0) return;
      var f = A.boltT / 0.22, i;
      g.globalAlpha = 0.35 * f; g.fillStyle = '#c8e4ff'; g.fillRect(0, 0, MG.W, MG.H); g.globalAlpha = f;
      for (var w = 3; w >= 1; w--) { g.strokeStyle = w === 3 ? 'rgba(120, 180, 255, 0.5)' : (w === 2 ? '#9ad8ff' : '#ffffff'); g.lineWidth = w * 1.5; g.beginPath(); g.moveTo(A.bolt[0][0], A.bolt[0][1]); for (i = 1; i < A.bolt.length; i++) g.lineTo(A.bolt[i][0], A.bolt[i][1]); g.stroke(); }
      g.globalAlpha = 1;
    },
    drawGround: function (g, col, h) { var W = MG.W, H = MG.H; g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (var x = 0; x <= W; x += 16) g.lineTo(x, H - h - Math.round(Math.sin(x * 0.021) * 10 + Math.sin(x * 0.007) * 16)); g.lineTo(W, H); g.closePath(); g.fill(); },
    /* 내레이션: 화면 아래 3분의 1 · 글자 크기는 화면에 맞춘다 · 긴 줄은 접는다(대사 창 없이 글자만) */
    drawLines: function (g, A, lines, yq) {
      var W = MG.W, H = MG.H, size = Math.round(U.clamp(Math.min(W, H) / 24, 13, 20)), maxW = Math.min(W - 40, 520), i;
      for (i = 0; i < lines.length; i++) {
        var L = lines[i], a = this.fade(A.t, L[0], L[1]); if (a <= 0) continue;
        g.font = size + 'px Galmuri11, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        var rows = this.wrap(g, L[2], maxW), y0 = Math.round(H * (yq || 0.8)) - (rows.length - 1) * (size + 8) / 2;
        for (var r = 0; r < rows.length; r++) { g.globalAlpha = a; g.lineWidth = 4; g.strokeStyle = 'rgba(4, 4, 10, 0.9)'; g.strokeText(rows[r], W / 2, y0 + r * (size + 8)); g.fillStyle = A.id === 'ending' ? '#fff3d0' : '#e4f4ff'; g.fillText(rows[r], W / 2, y0 + r * (size + 8)); }
        A.lastLine = L[2];
      }
      g.globalAlpha = 1;
    },
    wrap: function (g, s, maxW) { var out = [], cur = '', words = String(s).split(' '); for (var i = 0; i < words.length; i++) { var nx = cur ? cur + ' ' + words[i] : words[i]; if (cur && g.measureText && g.measureText(nx).width > maxW) { out.push(cur); cur = words[i]; } else cur = nx; } if (cur) out.push(cur); return out; },
    drawIntro: function (g, A) {
      var W = MG.W, H = MG.H, sc = this.sc(), t = A.t, gy = H * 0.66;
      this.drawSky(g, A, '#03040a', '#0a1124');
      this.drawClouds(g, A, 1, 0);
      // 1) 폭풍 속 왕의 무덤
      var a1 = U.clamp(Math.min(t / 0.6, (3.2 - t) / 0.4), 0, 1); if (a1 > 0) this.sprite(g, 'rb', 'tomb_gate', W / 2, gy, sc, a1);
      // 2) 기사왕 카인 — 번개가 칠 때만 진홍 안광과 윤곽이 드러난다
      var a2 = this.fade(t, 2.9, 5.6); if (a2 > 0) { var glow = g.createRadialGradient && g.createRadialGradient(W / 2, gy - 34 * sc, 4, W / 2, gy - 34 * sc, 46 * sc); if (glow && glow.addColorStop) { glow.addColorStop(0, 'rgba(140, 60, 255, 0.35)'); glow.addColorStop(1, 'rgba(0, 0, 0, 0)'); g.globalAlpha = a2; g.fillStyle = glow; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } this.sprite(g, 'rb', 'cine_king', W / 2, gy, sc, a2); }
      // 3) 다섯 괴수의 혼 — 무덤으로 이어진 봉인 사슬
      var a3 = this.fade(t, 5.5, 8.1);
      if (a3 > 0) {
        var R = Math.min(W * 0.36, H * 0.24), cy = H * 0.42;
        for (var i = 0; i < 5; i++) {
          var ang = -Math.PI / 2 + (i - 2) * 0.62, bx = W / 2 + Math.cos(ang) * R * 1.1, by = cy + Math.sin(ang) * R * 0.55 + R * 0.5, bs = Math.max(1, sc - 2);
          g.globalAlpha = a3 * 0.7; g.strokeStyle = '#8a64e0'; g.lineWidth = 2; g.setLineDash && g.setLineDash([4, 4]); g.beginPath(); g.moveTo(bx, by - 10); g.lineTo(W / 2, cy + R * 0.95); g.stroke(); g.setLineDash && g.setLineDash([]);
          g.globalAlpha = 1; this.sprite(g, 'bs', D.BOSSES[i].sprite + '_idle1', bx, by, bs * 0.5, a3 * 0.9, '#3a2070');
        }
        this.sprite(g, 'rb', 'tomb_gate', W / 2, cy + R * 0.95 + 30 * Math.max(1, sc - 2) * 0.5, Math.max(1, sc - 2), a3);
      }
      // 4) 폭풍을 마주 선 사냥꾼 + 로고
      var a4 = U.clamp((t - 8.0) / 0.5, 0, 1);
      if (a4 > 0) { this.sprite(g, 'rb', 'cine_hunter', W / 2, H * 0.68, sc, a4); var lg = MG.Sprites && MG.Sprites.item && MG.Sprites.item('title', 'logo'); if (lg) { var ls = Math.min(1.4, (W - 40) / lg.w); g.globalAlpha = a4; g.drawImage(MG.Sprites.img('title'), lg.x, lg.y, lg.w, lg.h, Math.round(W / 2 - lg.w * ls / 2), Math.round(H * 0.16), Math.round(lg.w * ls), Math.round(lg.h * ls)); g.globalAlpha = 1; } }
      this.drawParts(g, A); this.drawBolt(g, A);
      this.drawLines(g, A, INTRO_LINES);
    },
    drawDawn: function (g, A) {
      var W = MG.W, H = MG.H, sc = this.sc(), t = A.t, q = U.clamp(t / CFG.DAWN, 0, 1), e = U.easeInOut(q), gy = H * 0.72;
      var top = this.mix('#05060e', '#3a4a8a', e), bot = this.mix('#0c0a18', '#ffb070', e);
      this.drawSky(g, A, top, bot);
      var sunY = gy + 18 * sc - e * 34 * sc; this.sprite(g, 'rb', 'cine_sun', W / 2, sunY, sc, U.clamp(q * 2, 0, 1));
      if (e > 0.2) { var rg = g.createRadialGradient && g.createRadialGradient(W / 2, sunY, 4, W / 2, sunY, Math.max(W, H) * 0.7); if (rg && rg.addColorStop) { rg.addColorStop(0, 'rgba(255, 220, 140, ' + (0.35 * e).toFixed(2) + ')'); rg.addColorStop(1, 'rgba(0, 0, 0, 0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); } }
      this.drawClouds(g, A, 1, e);
      this.drawGround(g, this.mix('#06060c', '#2a1c26', e), H * 0.26);
      this.sprite(g, 'rb', 'tomb_gate_open', W * 0.78, gy + 4, Math.max(1, sc - 2), 0.9, '#120c18');
      this.sprite(g, 'rb', 'cine_hunter', W * 0.38, H * 0.9, sc, 1, e > 0.5 ? null : '#0c0a14');
      this.drawParts(g, A); this.drawBolt(g, A);
      g.font = Math.round(U.clamp(Math.min(W, H) / 28, 12, 18)) + 'px Galmuri11, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = U.clamp(t / 0.8, 0, 1) * (1 - U.clamp((t - 7.6) / 0.8, 0, 1)); g.fillStyle = '#ffd866'; g.fillText('☀️ 진 엔딩 — 폭풍의 끝', W / 2, Math.round(H * 0.1)); g.globalAlpha = 1;
      this.drawLines(g, A, DAWN_LINES, 0.24);   // 새벽 장면은 하늘 쪽에(사냥꾼 · 언덕과 겹치지 않게)
    },
    drawCredits: function (g, A) {
      var W = MG.W, H = MG.H, L = this.LH, y = A.scrollY, i;
      var vg = g.createLinearGradient && g.createLinearGradient(0, 0, 0, H);   // 야영지 위의 새벽빛 + 글자가 읽히도록 가운데를 어둡게
      if (vg && vg.addColorStop) { vg.addColorStop(0, 'rgba(255, 176, 96, 0.28)'); vg.addColorStop(0.35, 'rgba(6, 6, 14, 0.62)'); vg.addColorStop(0.75, 'rgba(6, 6, 14, 0.62)'); vg.addColorStop(1, 'rgba(255, 176, 96, 0.22)'); g.fillStyle = vg; } else g.fillStyle = 'rgba(6, 6, 14, 0.6)';
      g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      var FONT = { logo: [26, '#ffd866'], sub: [13, '#c4ccd6'], head: [15, '#ffd866'], line: [13, '#e8e0d0'], rec: [12, '#fff3d0'], role: [11, '#9aa2b0'], name: [15, '#ffffff'], end: [22, '#ffd866'], gap: [10, '#000'] };
      A.visible = [];
      for (i = 0; i < A.credits.length; i++) {
        var c = A.credits[i], h = L[c.k] || 22, cy = y + h / 2;
        if (c.t && cy > -20 && cy < H + 20) {
          var F = FONT[c.k] || FONT.line, edge = U.clamp(Math.min(cy / 60, (H - cy) / 60), 0, 1);
          g.globalAlpha = edge; g.font = F[0] + 'px Galmuri11, serif'; g.lineWidth = 4; g.strokeStyle = 'rgba(4, 4, 10, 0.85)'; g.strokeText(c.t, W / 2, Math.round(cy)); g.fillStyle = F[1]; g.fillText(c.t, W / 2, Math.round(cy));
          A.visible.push(c.t);
        }
        y += h;
      }
      g.globalAlpha = 1;
      this.drawParts(g, A);
    },
    mix: function (a, b, t) { var p = function (h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }, A = p(a), B = p(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ', ' + Math.round(A[1] + (B[1] - A[1]) * t) + ', ' + Math.round(A[2] + (B[2] - A[2]) * t) + ')'; }
  };
})(window);
