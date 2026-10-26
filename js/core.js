/* ==========================================================================
   core.js — 『SOUL TEMPEST : LEGEND OF THE HUNTER』(구 「검과 마법」) 리부트: 전역 이름공간(MG)과 작은 도구들
   화면(v81 반응형 풀스크린): 게임은 언제나 뷰포트 전체를 채운다(레터박스 없음). 논리 해상도 W×H 는 화면 비율에 맞춰 바뀐다 —
   세로 폰은 폭 360 기준(높이가 늘어남), 가로/폴더블/태블릿은 높이 540~640 기준(폭이 늘어남). 도트는 언제나 정사각형(균일 확대 --sx).
   월드는 2배 확대(Z = 2) — 한 화면에 월드 W/2 × H/2 픽셀이 보인다. DOM 층(#ui)도 같은 W×H 논리 상자를 --sx 로 확대한다.
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG = global.MG || {};
  MG.VERSION = 'ver. 1.6.0 (v83)';
  MG.TITLE = 'SOUL TEMPEST : LEGEND OF THE HUNTER';   // v78 공식 타이틀
  MG.W = 360; MG.H = 640; MG.Z = 2;          // 캔버스 픽셀 / 월드 확대
  MG.VW = MG.W / MG.Z; MG.VH = MG.H / MG.Z;  // 한 화면의 월드 크기(기본 180×320)
  /* v81: 논리 화면 크기를 바꾼다(UI.onResize 가 부른다). 카메라 · 컬링 · 그리기는 모두 MG.W/H · MG.VW/VH 를 읽는다. */
  MG.setView = function (w, h) {
    w = Math.max(320, Math.round(w)); h = Math.max(400, Math.round(h));
    MG.W = w; MG.H = h; MG.VW = w / MG.Z; MG.VH = h / MG.Z;
    var c = MG.Game && MG.Game.canvas; if (c && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; }
    if (MG.Game && MG.Game.snapCam && MG.Game.state === 'PLAY') MG.Game.snapCam();
  };

  var U = MG.U = {
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    dist: function (ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); },
    dist2: function (ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
    angle: function (ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },
    angDiff: function (a, b) { var d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
    approach: function (v, target, step) { return v < target ? Math.min(target, v + step) : Math.max(target, v - step); },
    easeOut: function (t) { return 1 - (1 - t) * (1 - t) * (1 - t); },
    easeInOut: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    /* 시드 고정 난수(월드 배치/테스트 재현용) */
    rng: function (seed) { var s = (seed >>> 0) || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; },
    pick: function (arr, r) { return arr[Math.floor((r || Math.random)() * arr.length)]; },
    /* 4방향 이름(스프라이트 행) */
    dir4: function (fx, fy) { return Math.abs(fx) > Math.abs(fy) ? (fx > 0 ? 'right' : 'left') : (fy > 0 ? 'down' : 'up'); },
    /* 원 vs 사각형 겹침 */
    circRect: function (cx, cy, r, x, y, w, h) { var nx = U.clamp(cx, x, x + w), ny = U.clamp(cy, y, y + h); return U.dist2(cx, cy, nx, ny) < r * r; },
    esc: function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    now: function () { return (global.performance && global.performance.now) ? global.performance.now() : Date.now(); }
  };

  /* 아주 작은 이벤트 버스(UI ↔ 게임) */
  var handlers = {};
  MG.on = function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); };
  MG.emit = function (ev, a, b) { var h = handlers[ev]; if (!h) return; for (var i = 0; i < h.length; i++) { try { h[i](a, b); } catch (e) { if (global.console) console.error(e); } } };
})(window);
