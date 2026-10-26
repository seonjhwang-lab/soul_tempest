/* ==========================================================================
   input.js — 키보드 + 터치(왼쪽 가상 조이스틱, 오른쪽 아크 버튼 4개)
   버튼 하나 = { down(누르고 있다), pressed(이번 프레임에 눌렀다), released(이번 프레임에 뗐다), heldT(누른 시간) }
     act   ⚔️ 공격/상호작용 — J · Space · E (꾹 누르면 모아베기)
     roll  🪽 구르기       — K · Shift
     magic ✨ 비전 마법     — L
     estus 🧪 에스트       — H · Q
     cycle   마법 바꾸기   — R (터치: HUD 의 마법 아이콘)
     menu  📜 장비·도감     — Tab · I        esc — Esc
   v86 게임패드(Gamepad API · 표준 배치 — Xbox / PS / 블루투스 패드):
     왼쪽 스틱 · 십자키 = 이동(창이 열려 있으면 항목 고르기) · A(아래) = 대화 · 조사 · 상호작용 · 메뉴 선택 · X(왼쪽) = ⚔️ 공격(탭 평타 · 홀드 특수기/모아베기)
     Y(위) = 🪽 구르기 · B(오른쪽) = ✨ 비전 마법(창에서는 닫기) · LB / LT = 🧪 에스트 · RB / RT = 🔥 화톳불 전송(화톳불 곁) · START = 📜 · SELECT = 마법 바꾸기
   v86 햅틱: rumble(ms, 세기) — navigator.vibrate + 패드 진동 모터(vibrationActuator). 상쇄 · 진 모아베기 적중 · 부위 파괴 · 피격 때 울린다
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG;
  var KEYMAP = {
    KeyJ: 'act', Space: 'act', KeyE: 'act', KeyK: 'roll', ShiftLeft: 'roll', ShiftRight: 'roll', KeyL: 'magic', KeyH: 'estus', KeyQ: 'estus', KeyR: 'cycle',
    Tab: 'menu', KeyI: 'menu', Escape: 'esc'
  };
  var MOVE = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
  var NAMES = ['act', 'roll', 'magic', 'estus', 'cycle', 'menu', 'esc'];
  /* v86 표준 게임패드 버튼 번호: 0 A · 1 B · 2 X · 3 Y · 4 LB · 5 RB · 6 LT · 7 RT · 8 SELECT · 9 START · 12~15 십자키(위 · 아래 · 왼쪽 · 오른쪽) */
  var PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  var PAD_MAP = [['X', 'act'], ['Y', 'roll'], ['LB', 'estus'], ['LT', 'estus'], ['SELECT', 'cycle'], ['START', 'menu']];   // 언제나 같은 뜻인 버튼(A · B · RB · RT 는 상황에 따라)
  var PAD_GUIDE = [['X', '⚔️ 공격 (탭 평타 · 홀드 특수기)'], ['Y', '🪽 구르기 · 회피'], ['B', '✨ 비전 마법 · 창 닫기'], ['A', '💬 대화 · 조사 · 상호작용 · 선택'], ['LB / LT', '🧪 에스트 물약'], ['RB / RT', '🔥 화톳불 전송 (화톳불 곁)'], ['L 스틱 / 십자키', '이동 · 메뉴 고르기'], ['START', '📜 장비 · 도감'], ['SELECT', '마법 바꾸기']];

  var Input = {
    axis: { x: 0, y: 0 }, keys: {}, b: {}, touch: false, joy: { id: null, ox: 0, oy: 0, x: 0, y: 0 }, src: {},
    PAD: PAD, PAD_MAP: PAD_MAP, PAD_GUIDE: PAD_GUIDE, pad: { on: false, index: -1, id: '', prev: [], ax: 0, ay: 0, navT: 0, wants: {} }, rumbles: [],
    init: function () {
      var self = this; this.reset();
      if (!global.addEventListener) return;
      global.addEventListener('keydown', function (e) {
        var k = e.code;
        if ((KEYMAP[k] || MOVE[k]) && e.preventDefault) e.preventDefault();
        if (e.repeat) return;
        self.keys[k] = true;
        if (KEYMAP[k]) self.set(KEYMAP[k], true, 'k:' + k);
      });
      global.addEventListener('keyup', function (e) { self.keys[e.code] = false; if (KEYMAP[e.code]) self.set(KEYMAP[e.code], false, 'k:' + e.code); });
      global.addEventListener('blur', function () { self.reset(); });
      global.addEventListener('gamepadconnected', function (e) { self.padConnected(e && e.gamepad); });
      global.addEventListener('gamepaddisconnected', function () { self.padGone(); });
      this.initTouch();
    },
    reset: function () {
      this.keys = {}; this.src = {}; this.axis = { x: 0, y: 0 }; this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
      for (var i = 0; i < NAMES.length; i++) this.b[NAMES[i]] = { down: false, pressed: false, released: false, heldT: 0 };
    },
    /* 같은 버튼을 여러 입력원(키 여러 개 · 터치)이 누를 수 있다 — 모두 떼야 뗀 것 */
    set: function (name, on, source) {
      var s = this.src[name] = this.src[name] || {}, b = this.b[name];
      if (!b) return;
      if (on) s[source || 'x'] = true; else delete s[source || 'x'];
      var any = false; for (var k in s) { if (s[k]) any = true; }
      if (any && !b.down) { b.down = true; b.pressed = true; b.heldT = 0; }
      else if (!any && b.down) { b.down = false; b.released = true; }
      if (MG.UI && MG.UI.pressVisual) MG.UI.pressVisual(name, b.down);
    },
    /* 테스트/스크립트: 누르기 · 떼기 */
    hold: function (name, on) { this.set(name, on, 'script'); },
    update: function (dt) {
      this.pollPad(dt);
      var kx = 0, ky = 0;
      for (var k in MOVE) if (this.keys[k]) { kx += MOVE[k][0]; ky += MOVE[k][1]; }
      if (this.joy.id !== null) { kx = this.joy.x; ky = this.joy.y; }
      if (this.pad.on && (this.pad.ax || this.pad.ay) && !this.padMenu()) { kx = this.pad.ax; ky = this.pad.ay; }   // v86 패드 스틱 · 십자키
      if (this.script) { kx = this.script.x; ky = this.script.y; }
      var l = Math.sqrt(kx * kx + ky * ky);
      if (l > 1) { kx /= l; ky /= l; }
      this.axis.x = kx; this.axis.y = ky;
      for (var i = 0; i < NAMES.length; i++) if (this.b[NAMES[i]].down) this.b[NAMES[i]].heldT += dt;
    },
    /* ---------------------------------------------------------------- v86 게임패드 */
    pads: function () { var n = global.navigator; try { return n && n.getGamepads ? n.getGamepads() || [] : []; } catch (e) { return []; } },
    padConnected: function (gp) {
      var was = this.pad.on; this.pad.on = true; if (gp) { this.pad.index = gp.index; this.pad.id = String(gp.id || 'gamepad'); }
      var d = global.document; if (d && d.body && d.body.classList) d.body.classList.add('mg-pad');
      if (!was && MG.UI && MG.UI.ribbon && MG.Game && MG.Game.state === 'PLAY') MG.UI.ribbon('🎮 패드 연결 — X 공격 · Y 회피 · B 마법 · LB 물약', 3200);
      if (!was) MG.emit('padOn', this.pad.id);
    },
    padGone: function () { if (!this.pad.on) return; this.pad.on = false; this.pad.index = -1; var d = global.document; if (d && d.body && d.body.classList) d.body.classList.remove('mg-pad'); for (var k in this.src) { for (var s in this.src[k]) if (s.indexOf('g:') === 0) this.set(k, false, s); } this.pad.ax = 0; this.pad.ay = 0; this.pad.prev = []; this.pad.wants = {}; MG.emit('padOff'); },
    /* 창(타이틀 · 📜 · 전송 · 각인 · 대화) · 대장간 · 컷씬이 열려 있으면 스틱 · 십자키는 이동 대신 항목 고르기 */
    padMenu: function () { var G = MG.Game, UI = MG.UI; if (!G) return null; if (G.state === 'TITLE') return 'title'; if (MG.Story && MG.Story.active) return 'cine'; if (MG.Forge && MG.Forge.open) return MG.Forge.craft ? null : 'forge'; if (UI && UI.modalOpen && UI.modalOpen()) return 'modal'; if (MG.NPC && MG.NPC.open) return 'talk'; return null; },
    pollPad: function (dt) {
      var list = this.pads(), gp = null, i;
      for (i = 0; i < list.length; i++) if (list[i] && list[i].connected !== false && list[i].buttons && list[i].buttons.length) { gp = list[i]; break; }
      if (!gp) { if (this.pad.on) this.padGone(); return; }
      if (!this.pad.on || this.pad.index !== gp.index) this.padConnected(gp);
      var prev = this.pad.prev, now = [];
      for (i = 0; i < 16; i++) now[i] = !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
      var hit = function (k) { return now[PAD[k]] && !prev[PAD[k]]; }, menu = this.padMenu();
      // 이동: 왼쪽 스틱(데드존 0.22) + 십자키
      var ax = gp.axes && gp.axes.length > 1 ? +gp.axes[0] || 0 : 0, ay = gp.axes && gp.axes.length > 1 ? +gp.axes[1] || 0 : 0;
      if (Math.sqrt(ax * ax + ay * ay) < 0.22) { ax = 0; ay = 0; }
      if (now[PAD.LEFT]) ax = -1; if (now[PAD.RIGHT]) ax = 1; if (now[PAD.UP]) ay = -1; if (now[PAD.DOWN]) ay = 1;
      this.pad.ax = ax; this.pad.ay = ay;
      // 언제나 같은 버튼(창이 열려 있으면 START 만 — 📜 닫기)
      for (i = 0; i < PAD_MAP.length; i++) { var pm = PAD_MAP[i], on = now[PAD[pm[0]]] && (!menu || (pm[1] === 'menu' && menu !== 'cine' && menu !== 'title') || (pm[1] === 'act' && menu === 'forge')); this.padSet(pm[1], !!on, 'g:' + pm[0]); }
      // B = 마법(필드) · 닫기(창 · 컷씬 스킵) — A = 상호작용(대상이 있을 때) · 메뉴 선택 — RB / RT = 화톳불 전송
      this.padSet('magic', !menu && now[PAD.B], 'g:B');
      this.padSet('esc', !!menu && menu !== 'title' && now[PAD.B], 'g:B2');
      var G = MG.Game, near = !menu && G && !!G.ctx;
      this.padSet('act', !!(near && now[PAD.A]) || !!(!menu && MG.Forge && MG.Forge.open && now[PAD.A]), 'g:A');
      if (menu && menu !== 'cine') { this.pad.navT -= dt; var dir = ay > 0.5 ? 1 : ay < -0.5 ? -1 : (ax > 0.5 ? 1 : ax < -0.5 ? -1 : 0); if (!dir) this.pad.navT = 0; else if (this.pad.navT <= 0) { this.pad.navT = 0.22; if (MG.UI && MG.UI.padNav) MG.UI.padNav(dir, menu); } if (hit('A') && MG.UI && MG.UI.padPick) MG.UI.padPick(menu); }
      if (menu === 'cine' && (hit('A') || hit('START') || hit('B'))) { if (MG.Story) MG.Story.skip(); }
      if (!menu && (hit('RB') || hit('RT')) && G && G.padWarp) G.padWarp();
      this.pad.prev = now;
    },
    /* 패드 버튼은 「바뀐 순간」에만 누름/뗌을 보낸다 — 창이 열리며 입력이 초기화돼도(openModal · 컷씬) 쥐고 있던 버튼이 다시 눌리지 않는다 */
    padSet: function (name, want, source) { var w = this.pad.wants; want = !!want; if (want && !w[source]) this.set(name, true, source); else if (!want && w[source]) this.set(name, false, source); w[source] = want; },
    /* 지금 ⚔️ 를 누르는 것이 패드 X 뿐인가(X = 언제나 공격 · 상호작용은 A) */
    padAttackOnly: function () { var s = this.src.act || {}, any = false; for (var k in s) { if (!s[k]) continue; if (k !== 'g:X') return false; any = true; } return any; },
    /* ---------------------------------------------------------------- v86 햅틱 진동: ms = 길이 · mag = 세기(0~1) · why = 기록용 */
    rumble: function (ms, mag, why) {
      ms = Math.max(0, Math.min(400, Math.round(+ms || 0))); mag = Math.max(0, Math.min(1, +mag || 0.6)); if (!ms) return false;
      this.rumbles.push({ ms: ms, mag: mag, why: why || '' }); if (this.rumbles.length > 40) this.rumbles.shift();
      var n = global.navigator, ok = false;
      try { if (n && typeof n.vibrate === 'function') ok = n.vibrate(ms) !== false; } catch (e) { /* 지원 안 함 */ }
      try { var gp = this.pad.on ? this.pads()[this.pad.index] : null, va = gp && gp.vibrationActuator; if (va && va.playEffect) { va.playEffect(va.type || 'dual-rumble', { duration: ms, strongMagnitude: mag, weakMagnitude: mag * 0.6 }); ok = true; } } catch (e2) { /* 지원 안 함 */ }
      return ok;
    },
    /* 프레임 끝: 이번 프레임의 눌림/뗌 표시를 지운다 */
    endFrame: function () { for (var i = 0; i < NAMES.length; i++) { this.b[NAMES[i]].pressed = false; this.b[NAMES[i]].released = false; } },

    initTouch: function () {
      var self = this, doc = global.document; if (!doc || !doc.getElementById) return;
      var zone = doc.getElementById('joy-zone'), base = doc.getElementById('joy-base'), knob = doc.getElementById('joy-knob');
      var R = 42;
      var place = function () { if (!base || !base.style) return; base.style.left = self.joy.bx + 'px'; base.style.top = self.joy.by + 'px'; if (knob) knob.style.transform = 'translate(' + (self.joy.x * R) + 'px, ' + (self.joy.y * R) + 'px)'; };
      var local = function (e) { var r = zone.getBoundingClientRect(), s = (MG.UI && MG.UI.sx) || 1; return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s }; };
      if (zone) {
        zone.addEventListener('pointerdown', function (e) {
          if (self.joy.id !== null) return;
          self.touch = true; if (e.preventDefault) e.preventDefault();
          var p = local(e); self.joy.id = e.pointerId; self.joy.ox = e.clientX; self.joy.oy = e.clientY; self.joy.bx = p.x; self.joy.by = p.y; self.joy.x = 0; self.joy.y = 0;
          try { zone.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ }
          if (base && base.classList) base.classList.add('is-on'); place();
        });
        zone.addEventListener('pointermove', function (e) {
          if (e.pointerId !== self.joy.id) return;
          var s = (MG.UI && MG.UI.sx) || 1, dx = (e.clientX - self.joy.ox) / s, dy = (e.clientY - self.joy.oy) / s, l = Math.sqrt(dx * dx + dy * dy);
          var m = Math.min(1, l / R); if (m < 0.18) { self.joy.x = 0; self.joy.y = 0; } else { self.joy.x = dx / l * m; self.joy.y = dy / l * m; }
          place();
        });
        var up = function (e) { if (e.pointerId !== self.joy.id) return; self.joy.id = null; self.joy.x = 0; self.joy.y = 0; if (base && base.classList) base.classList.remove('is-on'); };
        zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
      }
      var bind = function (id, name) {
        var el = doc.getElementById(id); if (!el) return;
        el.addEventListener('pointerdown', function (e) { self.touch = true; if (e.preventDefault) e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } self.set(name, true, 'p:' + e.pointerId); });
        var off = function (e) { self.set(name, false, 'p:' + e.pointerId); };
        el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off);
        el.addEventListener('contextmenu', function (e) { if (e.preventDefault) e.preventDefault(); });
      };
      bind('btn-act', 'act'); bind('btn-roll', 'roll'); bind('btn-magic', 'magic'); bind('btn-estus', 'estus');
    }
  };
  MG.Input = Input;
})(window);
