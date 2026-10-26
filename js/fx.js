/* ==========================================================================
   fx.js — 손맛 연출: 불티/파편 · 떠오르는 글(피해 숫자 · CRIT! · 부위 파괴) · 화면 흔들림 · 히트스톱 · 슬로모션(저스트 회피) ·
           잔상 · 충격파 고리 · 번쩍임 · 푸른 번개 불꽃(3티어 폭풍 무기) · 땅의 균열(진 모아베기). 게임 판정은 하나도 바꾸지 않는다(시간 배율만 game.js 가 읽는다).
   v85 액션 디테일 업:
     · 다이내믹 액션 카메라 impact(): 결정적 순간(상쇄 1.08 · 부위 파괴 1.07 · 진 모아베기/천상 용 기둥/발도 마무리 1.06 · 보스 마지막 일격 1.1)에
       0.18~0.28초 동안 1.00 → peak → 1.00 줌(실제 시간 · 끝나면 정확히 1) + 휘두른 방향으로 튕기는 카메라 펀치. finisher() = 보스 마지막 일격 0.28초 슬로모션
     · 무기 계열별 참격 궤적 trail(): 한손검 이중 백은 검선 · 대검 3겹 검붉은/황금 중력 아크 · 태도 면도날 진홍/청록 호선 · 비전 마검 룬 문양 + 푸른 결정 ·
       ★천상제일검 황금 용린 검기(판정 반경 · 부채꼴과 같은 수치로 그린다) + 금빛 번개 잔류 스파크
     · debris(): 바닥에 튀어 구르는 파편(대검 내려찍기 돌멩이 · 부위 파괴 뿔/수정/비늘 조각) · cone(): 실드 배쉬 방패 충격파 · cross(): 발도 일섬 십자 참격 ·
       dragonStrike(): ★천상 황금 용 기둥(판정 캡슐을 그대로 그린다) · xring(): 상쇄 황금/청록 교차 섬광 링
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U;

  var FX = {
    parts: [], texts: [], rings: [], ghosts: [], bolts: [], cracks: [], beams: [], phantoms: [], shakeT: 0, shakeMag: 0, stopT: 0, slowT: 0, slowScale: 1, flashT: 0, flashCol: '#ffffff',
    trails: [], debrisList: [], cones: [], crosses: [], strikes: [], xrings: [], zoomT: 0, zoomDur: 0, zoomPeak: 1, zfx: 0, zfy: 0, kdx: 0, kdy: 0, kick: 0, finT: 0, impacts: 0, lastImpact: 0,
    reset: function () { this.parts = []; this.texts = []; this.rings = []; this.ghosts = []; this.bolts = []; this.cracks = []; this.beams = []; this.phantoms = []; this.shakeT = 0; this.stopT = 0; this.slowT = 0; this.flashT = 0; this.scaledReal = 0; this.slowScale = 1; this.trails = []; this.debrisList = []; this.cones = []; this.crosses = []; this.strikes = []; this.xrings = []; this.zoomT = 0; this.zoomDur = 0; this.zoomPeak = 1; this.kick = 0; this.finT = 0; },

    shake: function (mag, dur) { if (mag >= this.shakeMag || this.shakeT <= 0) { this.shakeMag = mag; this.shakeT = Math.max(this.shakeT, dur); } },
    /* v79: 시간 배율은 언제나 실제 시간(realDt)으로만 줄어들고, 한 번에 걸 수 있는 길이에 상한이 있다(히트스톱 0.12초 · 슬로모션 0.22초 — v80).
       배율은 0.05~1 사이로만(0 · NaN · 음수 차단). 연속으로 계속 걸려도 0.6초를 넘게 느린 상태가 이어지면 워치독이 풀어 버린다. */
    HITSTOP_MAX: 0.12, SLOW_MAX: 0.22, SCALED_MAX: 0.6, scaledReal: 0,
    hitstop: function (sec) { sec = +sec; if (!(sec > 0)) return; this.stopT = Math.min(this.HITSTOP_MAX, Math.max(this.stopT, sec)); },
    slow: function (scale, sec) { scale = +scale; sec = +sec; if (!(sec > 0) || !(scale > 0)) return; this.slowScale = Math.min(1, Math.max(0.1, scale)); this.slowT = Math.min(this.SLOW_MAX, Math.max(this.slowT, sec)); },
    flash: function (col, sec) { this.flashCol = col; this.flashT = Math.max(this.flashT, sec || 0.12); },
    /* 게임 시간 배율(히트스톱 → 0.05, 저스트 회피 → 0.35) */
    timeScale: function () { var s = this.stopT > 0 ? 0.05 : (this.slowT > 0 ? this.slowScale : (this.finT > 0 ? this.FIN_SCALE : 1)); return (s >= 0.05 && s <= 1) ? s : 1; },
    /* v85 보스 마지막 일격: 0.28초(상한 0.3) 슬로모션 — 저스트 회피 슬로모(SLOW_MAX 0.22)와 따로 센다 */
    FIN_MAX: 0.3, FIN_SCALE: 0.25, ZOOM_MAX: 1.12, ZOOM_DUR_MAX: 0.3,
    finisher: function (sec, x, y) { sec = +sec; if (!(sec > 0)) return; this.finT = Math.min(this.FIN_MAX, Math.max(this.finT, sec)); this.impact(1.1, Math.min(this.FIN_MAX, sec), x, y, 0, 0, 0); },
    /* v85 다이내믹 액션 카메라: peak 배 줌(이징 1 → peak → 1) + (dx, dy) 방향으로 kick 화면 px 튕김. 실제 시간으로만 흐르고 dur 가 지나면 정확히 1.0 */
    impact: function (peak, dur, x, y, dx, dy, kick) {
      peak = +peak; dur = +dur; if (!(peak > 1) || !(dur > 0) || !isFinite(x) || !isFinite(y)) return false;
      peak = Math.min(this.ZOOM_MAX, peak); dur = Math.min(this.ZOOM_DUR_MAX, dur);
      if (this.zoomT < this.zoomDur && this.zoomPeak > peak && this.zoomEnv() > 0.5) return false;   // 더 센 연출이 한창이면 그대로
      var l = Math.sqrt((dx || 0) * (dx || 0) + (dy || 0) * (dy || 0));
      this.zoomT = 0; this.zoomDur = dur; this.zoomPeak = peak; this.zfx = x; this.zfy = y; this.kdx = l ? dx / l : 0; this.kdy = l ? dy / l : 0; this.kick = l ? (kick || 0) : 0;
      this.impacts++; this.lastImpact = peak; return true;
    },
    zoomEnv: function () { if (!(this.zoomDur > 0) || !(this.zoomT < this.zoomDur)) return 0; var q = this.zoomT / this.zoomDur; return q < 0.28 ? U.easeOut(q / 0.28) : 1 - U.easeInOut((q - 0.28) / 0.72); },
    zoom: function () { var e = this.zoomEnv(), z = e > 0 ? 1 + (this.zoomPeak - 1) * e : 1; return z >= 1 && z <= this.ZOOM_MAX ? z : 1; },
    kickOffset: function () { if (!this.kick || !(this.zoomT < this.zoomDur)) return { x: 0, y: 0 }; var q = this.zoomT / this.zoomDur, e = q < 0.15 ? q / 0.15 : Math.pow(1 - (q - 0.15) / 0.85, 2); return { x: Math.round(this.kdx * this.kick * e), y: Math.round(this.kdy * this.kick * e) }; },
    /* 월드 → 화면(줌 · 카메라 펀치 포함) — game.js 의 월드 변환과 같은 식 */
    view: function (cam) { var z = this.zoom(), k = this.kickOffset(), Z = MG.Z; return { s: Z * z, ox: (this.zfx - cam.x) * Z - this.zfx * Z * z + k.x, oy: (this.zfy - cam.y) * Z - this.zfy * Z * z + k.y }; },
    project: function (x, y, cam) { var v = this.view(cam); return { x: x * v.s + v.ox, y: y * v.s + v.oy }; },

    burst: function (x, y, n, cols, spd, opt) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, v = (spd || 80) * (0.35 + Math.random() * 0.75);
        this.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (opt && opt.up ? 40 : 0), g: opt && opt.g !== undefined ? opt.g : 140, t: 0, life: 0.35 + Math.random() * 0.4, c: cols[i % cols.length], s: (opt && opt.s) || (Math.random() < 0.3 ? 2 : 1) });
      }
    },
    ember: function (x, y) { this.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 14, vy: -18 - Math.random() * 24, g: -6, t: 0, life: 0.7 + Math.random() * 0.5, c: Math.random() < 0.5 ? '#ffb238' : '#ff7424', s: 1 }); },
    /* 모이는 빛(모아베기): 반경 r 에서 중심으로 */
    gather: function (x, y, r, col) { var a = Math.random() * Math.PI * 2; this.parts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, tx: x, ty: y, home: true, t: 0, life: 0.28, c: col, s: 1 }); },
    ring: function (x, y, r0, r1, life, col, w) { this.rings.push({ x: x, y: y, r0: r0, r1: r1, t: 0, life: life, c: col, w: w || 2 }); },
    ghost: function (snap) { snap.t = 0; this.ghosts.push(snap); },
    /* 푸른 번개 불꽃: 작은 지그재그 번개 n 갈래 */
    spark: function (x, y, n, col, life) { for (var k = 0; k < (n || 2); k++) { var a = Math.random() * Math.PI * 2, L = 8 + Math.random() * 10, pts = [[x, y]]; for (var j = 1; j <= 3; j++) pts.push([x + Math.cos(a) * L * j / 3 + (Math.random() - 0.5) * 5, y + Math.sin(a) * L * j / 3 + (Math.random() - 0.5) * 5]); this.bolts.push({ pts: pts, t: 0, life: life || 0.16, col: col || undefined, gold: col === '#ffd866' }); } },
    /* ---------------------------------------------------------------- v85 무기 계열별 참격 궤적
       o = { kind: basic|one|great|tachi|arcane|ultimate, x, y(판정 중심 = 사냥꾼 발밑), a(바라보는 각), arc(반각 rad), r(판정 반경), spin, side, hold(판정이 살아 있는 시간), heavy }
       궤적은 판정과 같은 중심 · 반경 · 부채꼴로만 그린다(바깥으로 넘치지 않는다). */
    trail: function (o) {
      var t = { kind: o.kind || 'basic', x: o.x, y: o.y, a: o.a || 0, arc: o.spin ? Math.PI : (o.arc || 1), r: o.r || 20, spin: !!o.spin, side: o.side || 1, hold: o.hold || 0.12, t: 0, heavy: !!o.heavy, follow: o.follow || null, sparked: false };
      t.life = t.hold + (t.kind === 'ultimate' ? 0.22 : 0.14); this.trails.push(t);
      var i, aa, k;
      if (t.kind === 'arcane') {   // 고대 룬 문양 입자 + 푸른 마력 결정
        for (i = 0; i < 7; i++) { aa = t.a + (i / 6 - 0.5) * 2 * t.arc * 0.9; k = t.r * (0.55 + Math.random() * 0.4); this.parts.push({ x: t.x + Math.cos(aa) * k, y: t.y + Math.sin(aa) * k, vx: Math.cos(aa) * 10, vy: -16 - Math.random() * 14, g: -10, t: 0, life: 0.55 + Math.random() * 0.3, c: i % 2 ? '#4deeea' : '#b090f0', s: 1, glyph: 1 + (i % 4) }); }
        this.burst(t.x + Math.cos(t.a) * t.r * 0.7, t.y + Math.sin(t.a) * t.r * 0.7, 6, ['#4deeea', '#9ad8ff', '#e4fdff'], 50, { g: 30, s: 2 });
      }
      if (t.kind === 'ultimate') for (i = 0; i < 5; i++) { aa = t.a + (i / 4 - 0.5) * 2 * t.arc * 0.92; this.spark(t.x + Math.cos(aa) * t.r * 0.94, t.y + Math.sin(aa) * t.r * 0.94, 1, '#ffd866', 0.32); }   // 금빛 번개 잔류 스파크
      return t;
    },
    /* 바닥에 튀어 구르는 파편: kind = rock(돌멩이) · horn(뿔 · 나무껍질) · crystal(수정 · 얼음) · scale(비늘) · thorn(가시) — 높이 z · 중력 · 튕김 · 마찰로 실제로 굴러간다 */
    debris: function (x, y, n, kind, cols, spd, z0) {
      var C = cols || { rock: ['#8a8478', '#5e5a52', '#b4ad9e'], horn: ['#d8c49a', '#8a6a3a', '#f4e8c8'], crystal: ['#bff6ff', '#8ae8f8', '#ffffff'], scale: ['#4deeea', '#2a8a9a', '#c8fff6'], thorn: ['#6a3a8a', '#2a1030', '#c48ae0'] }[kind] || ['#8a8478'];
      for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, v = (spd || 70) * (0.4 + Math.random() * 0.8); this.debrisList.push({ x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 4, z: (z0 || 2) + Math.random() * 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: 70 + Math.random() * 110, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 18, sz: (kind === 'rock' ? 1.6 : 2.6) + Math.random() * (kind === 'rock' ? 2 : 3), kind: kind || 'rock', c: C[i % C.length], t: 0, life: 2.0 + Math.random() * 0.6, bounces: 0 }); }
    },
    /* 실드 배쉬: 정면으로 퍼져 나가는 반투명 방패 충격파(부채꼴) */
    cone: function (x, y, a, len, spread, col) { this.cones.push({ x: x, y: y, a: a, len: len, spread: spread || 0.6, c: col || '210, 228, 255', t: 0, life: 0.28 }); },
    /* 발도 일섬: 적의 몸 위에 십자(十) + 사선 다중 참격 섬광이 그어졌다가(0.12초) 터진다 */
    cross: function (x, y, col, n) { this.crosses.push({ x: x, y: y, c: col || '#ff2a4a', n: n || 4, t: 0, life: 0.34, boom: false, rot: Math.random() * 0.5 }); },
    /* ★천상 황금 용 기둥: 판정 캡슐(시작점 → 기둥 중심, 반경 r)을 바닥에 그대로 그리고, 기둥 중심에 폭발 고리(정확히 r 까지) */
    dragonStrike: function (o) { var st = { x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1, r: o.r, t: 0, life: 0.7 }; this.strikes.push(st); this.ring(o.x1, o.y1, 4, o.r, 0.32, '#ffd866', 3); this.ring(o.x1, o.y1, 2, o.r * 0.7, 0.26, '#fff6c0', 2); this.burst(o.x1, o.y1 - 6, 30, ['#ffd866', '#fff6c0', '#ffffff', '#ffb238'], 150, { up: true }); return st; },
    /* 상쇄: 황금/청록 교차 섬광 링(두 타원이 엇갈려 돈다) */
    xring: function (x, y, r) { this.xrings.push({ x: x, y: y, r: r || 26, t: 0, life: 0.32 }); },
    /* 참격 한 줄(발도 일섬의 참격 폭풍) */
    slash: function (x, y, a, col) { var L = 10 + Math.random() * 8; this.bolts.push({ pts: [[x - Math.cos(a) * L, y - Math.sin(a) * L], [x + Math.cos(a) * L, y + Math.sin(a) * L]], t: 0, life: 0.14, col: col || '#ffffff' }); },
    /* 땅의 균열(진 모아베기): 중심에서 뻗는 금 몇 갈래 */
    crack: function (x, y, a, len) { var arms = []; for (var k = 0; k < 7; k++) { var aa = a + (k - 3) * 0.42 + (Math.random() - 0.5) * 0.2, L = len * (0.55 + Math.random() * 0.45), pts = [[x, y]]; for (var j = 1; j <= 4; j++) pts.push([x + Math.cos(aa) * L * j / 4 + (Math.random() - 0.5) * 4, y + Math.sin(aa) * L * j / 4 * 0.6 + (Math.random() - 0.5) * 3]); arms.push(pts); } this.cracks.push({ arms: arms, t: 0, life: 1.1 }); },
    /* v82 신화 무기 「격」: 대상 위로 내리꽂히는 빛기둥(bolt = 지그재그 낙뢰 · flame = 흑적 화염 · frost = 서릿빛 · star = 성흔) */
    pillar: function (x, y, col, kind) { var pts = [[x + 3, y - 150]]; for (var j = 1; j <= 7; j++) pts.push([x + (Math.random() - 0.5) * 12, y - 150 + j * 21]); pts[pts.length - 1] = [x, y - 4]; this.beams.push({ x: x, y: y, c: col, kind: kind || 'star', t: 0, life: 0.65, pts: pts }); },
    /* v83 사신수 환영: 청룡 · 백호 · 주작 · 현무의 반투명 도트 문장이 피어올라 커지며 사라진다(가호 · 격 · 재탄생) */
    phantom: function (x, y, id, sc) { this.phantoms.push({ x: x, y: y, id: id || 'dragon', t: 0, life: 1.1, sc: sc || 1 }); },
    /* 떠오르는 글: size = 화면 px */
    text: function (x, y, str, col, life, size, opt) { this.texts.push({ x: x, y: y, s: String(str), c: col || '#ffffff', t: 0, life: life || 0.8, size: size || 11, rise: opt && opt.rise !== undefined ? opt.rise : 14, pop: !!(opt && opt.pop) }); },
    dmg: function (x, y, n, crit, part) {
      if (crit) this.text(x, y - 4, 'CRIT! ' + n, '#ffe066', 0.9, 15, { pop: true });
      else this.text(x + (Math.random() - 0.5) * 6, y, n, part ? '#ffb0f0' : '#ffffff', 0.6, 11);
    },

    update: function (realDt, dt) {
      var i, p;
      if (!(realDt >= 0) || !isFinite(realDt)) realDt = 0; if (!(dt >= 0) || !isFinite(dt)) dt = 0;
      this.shakeT = Math.max(0, this.shakeT - realDt); this.stopT = Math.max(0, this.stopT - realDt); this.slowT = Math.max(0, this.slowT - realDt); this.flashT = Math.max(0, this.flashT - realDt);
      if (!isFinite(this.stopT)) this.stopT = 0; if (!isFinite(this.slowT)) this.slowT = 0;
      this.finT = Math.max(0, this.finT - realDt); if (!isFinite(this.finT)) this.finT = 0;
      if (this.zoomT < this.zoomDur) this.zoomT += realDt; if (!isFinite(this.zoomT)) { this.zoomT = 0; this.zoomDur = 0; }   // v85 카메라 줌은 실제 시간으로
      if (this.stopT > 0 || this.slowT > 0 || this.finT > 0) { this.scaledReal += realDt; if (this.scaledReal > this.SCALED_MAX) { this.stopT = 0; this.slowT = 0; this.finT = 0; this.scaledReal = 0; } } else this.scaledReal = 0;   // 워치독
      for (i = this.parts.length - 1; i >= 0; i--) {
        p = this.parts[i]; p.t += dt;
        if (p.home) { var k = Math.min(1, p.t / p.life); p.x += (p.tx - p.x) * k * 0.35; p.y += (p.ty - p.y) * k * 0.35; }
        else { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.98; }
        if (p.t > p.life) this.parts.splice(i, 1);
      }
      for (i = this.texts.length - 1; i >= 0; i--) { this.texts[i].t += realDt; if (this.texts[i].t > this.texts[i].life) this.texts.splice(i, 1); }
      for (i = this.rings.length - 1; i >= 0; i--) { this.rings[i].t += dt; if (this.rings[i].t > this.rings[i].life) this.rings.splice(i, 1); }
      for (i = this.bolts.length - 1; i >= 0; i--) { this.bolts[i].t += realDt; if (this.bolts[i].t > this.bolts[i].life) this.bolts.splice(i, 1); }
      for (i = this.cracks.length - 1; i >= 0; i--) { this.cracks[i].t += realDt; if (this.cracks[i].t > this.cracks[i].life) this.cracks.splice(i, 1); }
      for (i = this.phantoms.length - 1; i >= 0; i--) { this.phantoms[i].t += realDt; if (this.phantoms[i].t > this.phantoms[i].life) this.phantoms.splice(i, 1); }
      for (i = this.beams.length - 1; i >= 0; i--) { this.beams[i].t += realDt; if (this.beams[i].t > this.beams[i].life) this.beams.splice(i, 1); }
      for (i = this.ghosts.length - 1; i >= 0; i--) { this.ghosts[i].t += realDt; if (this.ghosts[i].t > 0.35) this.ghosts.splice(i, 1); }
      for (i = this.trails.length - 1; i >= 0; i--) {   // v85 참격 궤적: 판정이 살아 있는 동안은 사냥꾼을 따라간다(중심 = 판정 중심)
        var tr = this.trails[i]; tr.t += dt; if (tr.follow && tr.t <= tr.hold) { tr.x = tr.follow.x; tr.y = tr.follow.y; }
        if (tr.kind === 'ultimate' && !tr.sparked && tr.t > tr.hold) { tr.sparked = true; for (var sk = 0; sk < 4; sk++) { var sa = tr.a + (Math.random() - 0.5) * 2 * tr.arc; this.spark(tr.x + Math.cos(sa) * tr.r * (0.6 + Math.random() * 0.35), tr.y + Math.sin(sa) * tr.r * (0.6 + Math.random() * 0.35), 1, '#ffd866', 0.4); } }
        if (tr.t > tr.life) this.trails.splice(i, 1);
      }
      for (i = this.debrisList.length - 1; i >= 0; i--) {   // 파편 물리: 중력 · 튕김(반발 0.42) · 바닥 마찰로 구른다
        var db = this.debrisList[i]; db.t += dt; db.vz -= 420 * dt; db.z += db.vz * dt; db.x += db.vx * dt; db.y += db.vy * dt; db.rot += db.vr * dt;
        if (db.z <= 0) { db.z = 0; if (db.vz < -35) { db.vz = -db.vz * 0.42; db.vx *= 0.7; db.vy *= 0.7; db.vr *= 0.7; db.bounces++; } else { db.vz = 0; var fr = Math.pow(0.08, dt); db.vx *= fr; db.vy *= fr; db.vr = (db.vx + db.vy) * 0.25; } }
        if (db.t > db.life) this.debrisList.splice(i, 1);
      }
      for (i = this.cones.length - 1; i >= 0; i--) { this.cones[i].t += dt; if (this.cones[i].t > this.cones[i].life) this.cones.splice(i, 1); }
      for (i = this.xrings.length - 1; i >= 0; i--) { this.xrings[i].t += realDt; if (this.xrings[i].t > this.xrings[i].life) this.xrings.splice(i, 1); }
      for (i = this.strikes.length - 1; i >= 0; i--) { this.strikes[i].t += dt; if (this.strikes[i].t > this.strikes[i].life) this.strikes.splice(i, 1); }
      for (i = this.crosses.length - 1; i >= 0; i--) {
        var cr = this.crosses[i]; cr.t += dt;
        if (!cr.boom && cr.t > 0.12) { cr.boom = true; this.burst(cr.x, cr.y, 18, [cr.c, '#ffffff', '#4deeea'], 140); this.ring(cr.x, cr.y, 3, 22, 0.25, cr.c, 2); }
        if (cr.t > cr.life) this.crosses.splice(i, 1);
      }
    },
    shakeOffset: function () { if (this.shakeT <= 0) return { x: 0, y: 0 }; var m = this.shakeMag * Math.min(1, this.shakeT * 6); return { x: Math.round((Math.random() - 0.5) * 2 * m), y: Math.round((Math.random() - 0.5) * 2 * m) }; },

    /* 땅 층(균열) — y 정렬 전에 */
    drawGround: function (ctx) {
      for (var si = 0; si < this.strikes.length; si++) drawStrike(ctx, this.strikes[si]);
      for (var di = 0; di < this.debrisList.length; di++) { var db = this.debrisList[di], da = Math.max(0, Math.min(1, (db.life - db.t) / 0.3)); ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.28 * da).toFixed(2) + ')'; ctx.fillRect(Math.round(db.x - db.sz * 0.6), Math.round(db.y), Math.max(1, Math.round(db.sz * 1.2)), 1); }
      for (var i = 0; i < this.cracks.length; i++) {
        var c = this.cracks[i], f = Math.max(0, 1 - c.t / c.life);
        for (var k = 0; k < c.arms.length; k++) { var p = c.arms[k]; for (var w = 2; w >= 1; w--) { ctx.strokeStyle = w === 2 ? 'rgba(255, 60, 70, ' + (0.45 * f).toFixed(2) + ')' : 'rgba(20, 8, 10, ' + (0.9 * f).toFixed(2) + ')'; ctx.lineWidth = w === 2 ? 3 : 1.2; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (var j = 1; j < p.length; j++) ctx.lineTo(p[j][0], p[j][1]); ctx.stroke(); } }
      }
    },
    /* 월드 좌표 층(파편 · 고리 · 번개 불꽃) */
    drawWorld: function (ctx) {
      var i;
      for (i = 0; i < this.beams.length; i++) {   // v82 「격」 빛기둥
        var bm = this.beams[i], q = bm.t / bm.life, fa = Math.max(0, 1 - q), drop = Math.min(1, bm.t / 0.08);
        ctx.globalAlpha = fa;
        if (bm.kind === 'bolt') { for (var bw = 3; bw >= 1; bw--) { ctx.strokeStyle = bw === 3 ? 'rgba(154, 216, 255, 0.55)' : (bw === 2 ? bm.c : '#ffffff'); ctx.lineWidth = bw * 2; ctx.beginPath(); ctx.moveTo(bm.pts[0][0], bm.pts[0][1]); for (var bj = 1; bj < bm.pts.length; bj++) { if (bj / bm.pts.length > drop) break; ctx.lineTo(bm.pts[bj][0], bm.pts[bj][1]); } ctx.stroke(); } }
        else {
          var top = bm.y - 140 * drop, wd = (bm.kind === 'flame' ? 14 : 10) * (1 - q * 0.6), lg = ctx.createLinearGradient && ctx.createLinearGradient(0, top, 0, bm.y);
          if (lg && lg.addColorStop) { lg.addColorStop(0, 'rgba(255, 255, 255, 0)'); lg.addColorStop(0.7, bm.c); lg.addColorStop(1, '#ffffff'); ctx.fillStyle = lg; ctx.fillRect(bm.x - wd / 2, top, wd, bm.y - top); }
          ctx.fillStyle = bm.kind === 'flame' ? '#2a0a10' : '#ffffff'; ctx.fillRect(Math.round(bm.x - 1), Math.round(top), 2, Math.round(bm.y - top));
          if (bm.kind === 'star') { ctx.strokeStyle = bm.c; ctx.lineWidth = 1.5; for (var sk = 0; sk < 5; sk++) { var sa = bm.t * 3 + sk * 1.2566; ctx.beginPath(); ctx.moveTo(bm.x + Math.cos(sa) * 18, bm.y - 2 + Math.sin(sa) * 8); ctx.lineTo(bm.x + Math.cos(sa + 2.513) * 18, bm.y - 2 + Math.sin(sa + 2.513) * 8); ctx.stroke(); } }
        }
      }
      ctx.globalAlpha = 1;
      var S = MG.Sprites, PCOL = { dragon: '#4deeea', tiger: '#eef6ff', phoenix: '#ff8a3c', turtle: '#7ad8a8' };
      for (i = 0; i < this.phantoms.length; i++) {   // v83 사신수 환영
        var ph = this.phantoms[i], pq = ph.t / ph.life, pa = pq < 0.2 ? pq / 0.2 : Math.max(0, 1 - (pq - 0.2) / 0.8), psc = ph.sc * (0.8 + 0.5 * U.easeOut(Math.min(1, pq * 1.4))), py = ph.y - 14 * pq;
        var pg = ctx.createRadialGradient && ctx.createRadialGradient(ph.x, py, 2, ph.x, py, 26 * psc);
        if (pg && pg.addColorStop) { pg.addColorStop(0, PCOL[ph.id] || '#ffffff'); pg.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.globalAlpha = pa * 0.35; ctx.fillStyle = pg; ctx.fillRect(ph.x - 26 * psc, py - 26 * psc, 52 * psc, 52 * psc); }
        ctx.globalAlpha = pa * 0.78;
        if (S && S.ready && S.ready('rb') && S.item('rb', 'ph_' + ph.id)) S.draw(ctx, 'rb', 'ph_' + ph.id, ph.x, py + 20 * psc, false, psc);
        else { ctx.strokeStyle = PCOL[ph.id] || '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ph.x, py, 14 * psc, 14 * psc, 0, 0, Math.PI * 2); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < this.rings.length; i++) {
        var r = this.rings[i], q = r.t / r.life;
        ctx.globalAlpha = Math.max(0, 1 - q); ctx.strokeStyle = r.c; ctx.lineWidth = r.w;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * U.easeOut(q), 0, Math.PI * 2); ctx.stroke();
      }
      for (i = 0; i < this.cones.length; i++) {   // v85 실드 배쉬 충격파
        var cn = this.cones[i], cq = cn.t / cn.life, cl = cn.len * U.easeOut(Math.min(1, cq * 1.3));
        ctx.globalAlpha = Math.max(0, 1 - cq); ctx.fillStyle = 'rgba(' + cn.c + ', 0.28)'; ctx.beginPath(); ctx.moveTo(cn.x, cn.y); ctx.arc(cn.x, cn.y, cl, cn.a - cn.spread, cn.a + cn.spread); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(' + cn.c + ', 0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cn.x, cn.y, cl, cn.a - cn.spread, cn.a + cn.spread); ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; ctx.beginPath(); ctx.arc(cn.x, cn.y, cl * 0.8, cn.a - cn.spread * 0.8, cn.a + cn.spread * 0.8); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < this.trails.length; i++) drawTrail(ctx, this.trails[i]);   // v85 무기 계열별 참격 궤적
      for (i = 0; i < this.crosses.length; i++) {   // v85 발도 십자 참격
        var cr = this.crosses[i], grow = Math.min(1, cr.t / 0.08), L2 = 22 * grow;
        ctx.globalAlpha = cr.boom ? Math.max(0, 1 - (cr.t - 0.12) / (cr.life - 0.12)) : 1;
        for (var ck = 0; ck < cr.n; ck++) { var ca = cr.rot + ck * Math.PI / cr.n; for (var cw = 2; cw >= 1; cw--) { ctx.strokeStyle = cw === 2 ? cr.c : '#ffffff'; ctx.lineWidth = cw === 2 ? 3 : 1; ctx.beginPath(); ctx.moveTo(cr.x - Math.cos(ca) * L2, cr.y - Math.sin(ca) * L2); ctx.lineTo(cr.x + Math.cos(ca) * L2, cr.y + Math.sin(ca) * L2); ctx.stroke(); } }
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < this.xrings.length; i++) {   // v85 상쇄 교차 섬광 링
        var xr = this.xrings[i], xq = xr.t / xr.life, rr = xr.r * U.easeOut(xq);
        ctx.globalAlpha = Math.max(0, 1 - xq); ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffd866'; ctx.beginPath(); ctx.ellipse(xr.x, xr.y, rr, rr * 0.38, 0.7 + xq * 1.2, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#4deeea'; ctx.beginPath(); ctx.ellipse(xr.x, xr.y, rr, rr * 0.38, -0.7 - xq * 1.2, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xr.x - rr, xr.y); ctx.lineTo(xr.x + rr, xr.y); ctx.moveTo(xr.x, xr.y - rr * 0.7); ctx.lineTo(xr.x, xr.y + rr * 0.7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < this.debrisList.length; i++) drawDebris(ctx, this.debrisList[i]);
      ctx.globalAlpha = 1;
      for (i = 0; i < this.bolts.length; i++) { var bo = this.bolts[i]; ctx.globalAlpha = Math.max(0, 1 - bo.t / bo.life); for (var w = 2; w >= 1; w--) { ctx.strokeStyle = w === 2 ? (bo.col || 'rgba(120, 200, 255, 0.7)') : '#f4fbff'; ctx.lineWidth = bo.col ? w * 1.5 : w; ctx.beginPath(); ctx.moveTo(bo.pts[0][0], bo.pts[0][1]); for (var j = 1; j < bo.pts.length; j++) ctx.lineTo(bo.pts[j][0], bo.pts[j][1]); ctx.stroke(); } }
      for (i = 0; i < this.parts.length; i++) { var p = this.parts[i]; ctx.globalAlpha = Math.max(0, 1 - p.t / p.life); if (p.glyph) { drawGlyph(ctx, p); continue; } ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
      ctx.globalAlpha = 1;
    },
    /* 화면 좌표 층(글): cam = 월드 왼쪽 위 */
    drawScreen: function (ctx, cam) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var i = 0; i < this.texts.length; i++) {
        var t = this.texts[i], q = t.t / t.life, pj = this.project(t.x, t.y, cam), sx = pj.x, sy = pj.y - t.rise * 2 * U.easeOut(Math.min(1, q * 1.6));   // v85 줌 · 카메라 펀치를 따라간다
        var sz = t.size * (t.pop ? 1 + 0.45 * Math.max(0, 1 - t.t / 0.12) : 1);
        ctx.globalAlpha = q < 0.7 ? 1 : Math.max(0, (1 - q) / 0.3);
        ctx.font = Math.round(sz) + 'px Galmuri11, sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10, 6, 4, 0.92)';
        ctx.strokeText(t.s, Math.round(sx), Math.round(sy)); ctx.fillStyle = t.c; ctx.fillText(t.s, Math.round(sx), Math.round(sy));
      }
      ctx.globalAlpha = 1;
      if (this.flashT > 0) { ctx.globalAlpha = Math.min(0.6, this.flashT * 4); ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, MG.W, MG.H); ctx.globalAlpha = 1; }
    }
  };
  /* ---------------------------------------------------------------- v85 그리기 도우미 */
  function sweepEdge(tr) { var p = tr.hold > 0 ? Math.min(1, tr.t / (tr.hold * 0.85)) : 1, a0 = tr.a - tr.arc * tr.side, a1 = tr.a + tr.arc * tr.side; return { a0: a0, a1: a1, e: a0 + (a1 - a0) * U.easeOut(p), ccw: (a1 - a0) < 0 }; }
  function arcS(ctx, x, y, r, a0, a1, ccw, col, w) { if (r <= 0) return; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, a0, a1, ccw); ctx.stroke(); }
  function drawTrail(ctx, tr) {
    var f = tr.t <= tr.hold ? 1 : Math.max(0, 1 - (tr.t - tr.hold) / (tr.life - tr.hold)), E = sweepEdge(tr), x = tr.x, y = tr.y, R = tr.r, a0 = E.a0, e = E.e, ccw = E.ccw, k;
    if (f <= 0) return;
    ctx.save(); ctx.globalAlpha = f; ctx.lineCap = 'round';
    if (tr.kind === 'ultimate') {   // ★ 황금 용린 검기: 판정 부채꼴 전체(반경 R · 반각 arc)를 그대로 덮는다 — 바깥으로 넘치지 않는다
      ctx.globalCompositeOperation = 'lighter';
      var A0 = tr.a - tr.arc, A1 = tr.a + tr.arc, g = ctx.createRadialGradient && ctx.createRadialGradient(x, y, R * 0.2, x, y, R);
      if (g && g.addColorStop) { g.addColorStop(0, 'rgba(255, 216, 102, 0)'); g.addColorStop(0.7, 'rgba(255, 200, 80, 0.22)'); g.addColorStop(1, 'rgba(255, 246, 192, 0.42)'); ctx.fillStyle = g; } else ctx.fillStyle = 'rgba(255, 216, 102, 0.25)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, A0, A1); ctx.closePath(); ctx.fill();
      for (var row = 0; row < 3; row++) {   // 용비늘: 반원 비늘 세 줄(바깥 줄은 반경 R 안쪽에 딱 붙는다)
        var rr = R * (0.6 + row * 0.15), step = 12 / rr, sr = 3.2 + row;
        ctx.strokeStyle = row === 2 ? 'rgba(255, 246, 192, 0.85)' : 'rgba(255, 216, 102, 0.6)'; ctx.lineWidth = 1;
        for (k = A0 + step / 2; k < A1; k += step) { ctx.beginPath(); ctx.arc(x + Math.cos(k) * (rr - sr), y + Math.sin(k) * (rr - sr), sr, k - 1.4, k + 1.4); ctx.stroke(); }
      }
      arcS(ctx, x, y, R - 3, a0, e, ccw, 'rgba(255, 200, 70, 0.55)', 6); arcS(ctx, x, y, R - 1.5, a0, e, ccw, '#ffd866', 2.5); arcS(ctx, x, y, R - 0.5, a0, e, ccw, '#fff6c0', 1);
      ctx.strokeStyle = 'rgba(255, 246, 192, 0.9)'; ctx.lineWidth = 1; ctx.beginPath();
      if (!tr.spin) { ctx.moveTo(x + Math.cos(A0) * R * 0.2, y + Math.sin(A0) * R * 0.2); ctx.lineTo(x + Math.cos(A0) * R, y + Math.sin(A0) * R); ctx.moveTo(x + Math.cos(A1) * R * 0.2, y + Math.sin(A1) * R * 0.2); ctx.lineTo(x + Math.cos(A1) * R, y + Math.sin(A1) * R); }
      ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    } else if (tr.kind === 'one') {   // 한손검: 날렵한 이중 백은색 검선
      arcS(ctx, x, y, R - 1, a0, e, ccw, 'rgba(244, 248, 255, 0.95)', tr.heavy ? 2.5 : 1.8); arcS(ctx, x, y, R - 4.5, a0, e, ccw, 'rgba(196, 204, 214, 0.85)', 1.2);
    } else if (tr.kind === 'great') {   // 대검: 묵직한 3겹 검붉은/황금 중력 아크
      var hw = tr.heavy ? 1.5 : 1; arcS(ctx, x, y, R - 3, a0, e, ccw, 'rgba(74, 10, 18, 0.7)', 7 * hw); arcS(ctx, x, y, R - 2.5, a0, e, ccw, 'rgba(200, 36, 58, 0.85)', 4 * hw); arcS(ctx, x, y, R - 1, a0, e, ccw, '#ffd866', 1.6 * hw);
    } else if (tr.kind === 'tachi') {   // 태도: 면도날처럼 예리한 진홍/청록 호선
      arcS(ctx, x, y, R - 0.5, a0, e, ccw, '#ffffff', 0.9); arcS(ctx, x, y, R - 2.5, a0, e, ccw, 'rgba(255, 42, 74, 0.9)', 1); arcS(ctx, x, y, R - 5, a0, e, ccw, 'rgba(77, 238, 234, 0.75)', 0.7);
    } else if (tr.kind === 'arcane') {   // 비전 마검: 보랏빛 마력 호 + 푸른 결정
      arcS(ctx, x, y, R - 1.5, a0, e, ccw, 'rgba(176, 144, 240, 0.85)', 2.6); arcS(ctx, x, y, R - 4.5, a0, e, ccw, 'rgba(77, 238, 234, 0.85)', 1);
      for (k = 0; k < 4; k++) { var ra = a0 + (e - a0) * (k + 0.5) / 4, rx = x + Math.cos(ra) * (R - 3), ry = y + Math.sin(ra) * (R - 3); ctx.fillStyle = '#e4fdff'; ctx.beginPath(); ctx.moveTo(rx, ry - 2.5); ctx.lineTo(rx + 1.5, ry); ctx.lineTo(rx, ry + 2.5); ctx.lineTo(rx - 1.5, ry); ctx.closePath(); ctx.fill(); }
    } else arcS(ctx, x, y, R - 1, a0, e, ccw, 'rgba(235, 248, 255, 0.8)', 2.2);
    ctx.restore();
  }
  function drawStrike(ctx, st) {   // 판정 캡슐: 시작점(사냥꾼 발밑) → 기둥 중심, 반경 r — 그 밖으로는 그리지 않는다
    var q = st.t / st.life, f = Math.max(0, 1 - Math.max(0, q - 0.35) / 0.65), dx = st.x1 - st.x0, dy = st.y1 - st.y0, a = Math.atan2(dy, dx), r = st.r, n = Math.PI / 2;
    ctx.save(); ctx.globalAlpha = f; ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255, 216, 102, 0.2)'; ctx.beginPath(); ctx.arc(st.x0, st.y0, r, a + n, a - n); ctx.arc(st.x1, st.y1, r, a - n, a + n); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 246, 192, 0.85)'; ctx.lineWidth = 1.5; ctx.stroke();
    var reach = Math.min(1, q / 0.2);   // 용비늘 갈기가 기둥 쪽으로 달려 나간다
    ctx.strokeStyle = '#ffd866'; ctx.lineWidth = 1.5;
    for (var k = 0; k < 9; k++) { var u = (k + 0.5) / 9; if (u > reach) break; var cx = st.x0 + dx * u, cy = st.y0 + dy * u, w = r * 0.55; ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 4 + Math.cos(a + n) * w, cy - Math.sin(a) * 4 + Math.sin(a + n) * w); ctx.lineTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4); ctx.lineTo(cx - Math.cos(a) * 4 - Math.cos(a + n) * w, cy - Math.sin(a) * 4 - Math.sin(a + n) * w); ctx.stroke(); }
    var g = ctx.createRadialGradient && ctx.createRadialGradient(st.x1, st.y1, 2, st.x1, st.y1, r);
    if (g && g.addColorStop) { g.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); g.addColorStop(0.5, 'rgba(255, 216, 102, 0.55)'); g.addColorStop(1, 'rgba(255, 178, 56, 0.1)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(st.x1, st.y1, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(st.x1, st.y1, r - 1, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function drawDebris(ctx, d) {
    var a = Math.max(0, Math.min(1, (d.life - d.t) / 0.3)), s = d.sz;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(d.x), Math.round(d.y - d.z)); ctx.rotate(d.rot); ctx.fillStyle = d.c; ctx.beginPath();
    if (d.kind === 'crystal') { ctx.moveTo(0, -s * 1.6); ctx.lineTo(s * 0.8, 0); ctx.lineTo(0, s * 1.6); ctx.lineTo(-s * 0.8, 0); }
    else if (d.kind === 'horn' || d.kind === 'thorn') { ctx.moveTo(-s, s * 0.6); ctx.lineTo(s * 1.4, 0); ctx.lineTo(-s, -s * 0.6); }
    else if (d.kind === 'scale') { ctx.arc(0, 0, s, Math.PI, 0); ctx.lineTo(0, s * 0.8); }
    else { ctx.moveTo(-s, -s * 0.5); ctx.lineTo(s * 0.4, -s); ctx.lineTo(s, s * 0.3); ctx.lineTo(-s * 0.2, s); }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(12, 8, 20, 0.75)'; ctx.lineWidth = 0.7; ctx.stroke(); ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; ctx.fillRect(-1, -1, 1, 1); ctx.restore();   // 어두운 외곽선 — 밝은 보스 몸 위에서도 조각이 보인다
  }
  function drawGlyph(ctx, p) {   // 고대 룬 문양 입자(네 가지 획)
    var x = Math.round(p.x), y = Math.round(p.y); ctx.strokeStyle = p.c; ctx.lineWidth = 1; ctx.beginPath();
    if (p.glyph === 1) { ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.moveTo(x, y - 1); ctx.lineTo(x + 2, y - 3); }
    else if (p.glyph === 2) { ctx.moveTo(x - 2, y + 3); ctx.lineTo(x, y - 3); ctx.lineTo(x + 2, y + 3); ctx.moveTo(x - 1, y + 1); ctx.lineTo(x + 1, y + 1); }
    else if (p.glyph === 3) { ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y + 2); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x - 2, y + 2); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); }
    else { ctx.moveTo(x - 2, y - 3); ctx.lineTo(x + 2, y - 3); ctx.lineTo(x - 2, y + 3); ctx.lineTo(x + 2, y + 3); }
    ctx.stroke();
  }
  MG.FX = FX;
})(window);
