/* ==========================================================================
   main.js — 부팅: 입력 · UI · 게임 초기화, 풀스크린 무대(v81: 레터박스 없음 — 뷰포트 전체)에 논리 해상도 맞추기, 루프 시작
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG;
  function viewport() {
    var w = global.innerWidth || 360, h = global.innerHeight || 640, v = global.visualViewport;
    if (v && v.width > 0 && v.height > 0) { w = Math.min(w, v.width); h = Math.min(h, v.height); }
    return { w: w, h: h };
  }
  function resize() {
    var st = document.getElementById('stage'); if (!st) return;
    // 무대는 CSS 로 언제나 뷰포트 전체(position: fixed; inset: 0). 그 실제 크기에 논리 해상도를 맞춘다.
    var r = st.getBoundingClientRect(), v = viewport(), w = r.width || v.w, h = r.height || v.h;
    if (w === resize.w && h === resize.h) return;
    resize.w = w; resize.h = h;
    MG.UI.onResize(w, h);
  }
  function boot() {
    MG.Input.init();
    MG.UI.init();
    MG.Game.init(document.getElementById('game'));
    if (MG.Audio && MG.Audio.init) try { MG.Audio.init(); } catch (e) { /* 소리 없이 */ }
    resize();
    global.addEventListener('resize', resize);
    if (global.visualViewport) global.visualViewport.addEventListener('resize', resize);
    global.setInterval(resize, 800);
    if (('ontouchstart' in global) || (global.navigator && global.navigator.maxTouchPoints > 0)) document.body.classList.add('mg-touch');
    MG.Game.loop();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
