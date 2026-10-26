#!/usr/bin/env node
/* ==========================================================================
   pack_sprites.js — Aseprite 가 내보낸 assets/sprites/*.png + *.json 을 js/sprites.js 하나로 묶는다.
   PNG 는 base64 data URI 로 넣는다(단일 파일 번들/Artifact 에서도 경로가 깨지지 않는다).
   사용: node assets/tools/pack_sprites.js   (assets/tools/build_sprites.sh 가 Aseprite 생성 뒤에 부른다)
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'assets', 'sprites');
const ORDER = ['knight', 'knight_moss', 'knight_crystal', 'knight_thorn', 'knight_frost', 'knight_astral', 'gear', 'mobs', 'world', 'tiles', 'town', 'icons', 'title', 'forge', 'rb', 'bs'];

const sheets = [];
for (const name of ORDER) {
  const png = path.join(SRC, name + '.png'), js = path.join(SRC, name + '.json');
  if (!fs.existsSync(png)) continue;
  const meta = fs.existsSync(js) ? JSON.parse(fs.readFileSync(js, 'utf8')) : {};
  const b64 = fs.readFileSync(png).toString('base64');
  sheets.push({ name, meta, b64 });
}

const head = `/* ==========================================================================
   sprites.js — Aseprite 로 만든 픽셀 아트 시트(자동 생성 파일 — 직접 고치지 말 것)
   원본: assets/aseprite/*.lua → assets/sprites/*.aseprite / *.png / *.json
   다시 만들기: bash assets/tools/build_sprites.sh
   시트: ${sheets.map(s => s.name).join(', ')}

   안전: 이미지가 아직 디코딩되지 않았거나(브라우저 첫 프레임), Image 가 없는 환경(Node 테스트 하네스)에서는
   ready() 가 false 이고, 모든 그리기 코드는 예전의 절차적 그리기로 그대로 돌아간다.
   ========================================================================== */
(function (global) {
  'use strict';

  var MG = global.MG = global.MG || {};
  var DATA = {
`;
const body = sheets.map(s => `    ${s.name}: { meta: ${JSON.stringify(s.meta)},\n      src: 'data:image/png;base64,${s.b64}' }`).join(',\n');
const tail = `
  };

  var Sprites = {
    DATA: DATA,
    imgs: {},
    loaded: {},
    disabled: false,          // 테스트/비교용: true 면 언제나 절차적 그리기
    _listeners: [],
    _tint: {},

    init: function () {
      if (typeof global.Image !== 'function') return;
      var self = this;
      for (var k in DATA) (function (name) {
        var im;
        try { im = new global.Image(); } catch (e) { return; }
        if (!im) return;
        im.onload = function () { self.loaded[name] = true; self._fire(name); };
        im.onerror = function () { self.loaded[name] = false; };
        self.imgs[name] = im;
        try { im.src = DATA[name].src; } catch (e2) { /* 무시 */ }
      }(k));
    },

    /* 이름 하나 또는 여럿이 모두 준비됐는가 */
    ready: function () {
      if (this.disabled) return false;
      for (var i = 0; i < arguments.length; i++) if (!this.loaded[arguments[i]]) return false;
      return arguments.length > 0;
    },
    allReady: function () { for (var k in DATA) if (!this.loaded[k]) return false; return !this.disabled; },
    meta: function (name) { return DATA[name] ? DATA[name].meta : null; },
    img: function (name) { return this.imgs[name]; },

    /* 시트가 준비되면 한 번 부른다(이미 준비됐으면 바로) */
    onReady: function (name, fn) {
      if (this.loaded[name]) { try { fn(); } catch (e) { /* 무시 */ } return; }
      this._listeners.push({ name: name, fn: fn });
    },
    _fire: function (name) {
      var keep = [];
      for (var i = 0; i < this._listeners.length; i++) {
        var l = this._listeners[i];
        if (l.name === name) { try { l.fn(); } catch (e) { /* 무시 */ } } else keep.push(l);
      }
      this._listeners = keep;
    },

    /* 아틀라스 항목 { x, y, w, h, ax, ay } (메타가 [x,y,w,h,ax,ay] 배열) */
    item: function (sheet, name) {
      var m = DATA[sheet] && DATA[sheet].meta && DATA[sheet].meta.items;
      var a = m ? m[name] : (DATA[sheet] && DATA[sheet].meta[name]);
      return a ? { x: a[0], y: a[1], w: a[2], h: a[3], ax: a[4], ay: a[5] } : null;
    },

    /* 아틀라스 항목을 기준점(ax, ay)이 (x, y) 에 오도록 그린다. flip 이면 좌우 반전. 그렸으면 true. */
    draw: function (ctx, sheet, name, x, y, flip, scale, src) {
      if (!this.ready(sheet)) return false;
      var it = this.item(sheet, name);
      if (!it) return false;
      var s = scale || 1, im = src || this.imgs[sheet];
      if (flip) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.scale(-s, s);
        ctx.drawImage(im, it.x, it.y, it.w, it.h, -it.ax, -it.ay, it.w, it.h);
        ctx.restore();
      } else if (s !== 1) {
        ctx.drawImage(im, it.x, it.y, it.w, it.h, Math.round(x - it.ax * s), Math.round(y - it.ay * s), Math.round(it.w * s), Math.round(it.h * s));
      } else {
        ctx.drawImage(im, it.x, it.y, it.w, it.h, Math.round(x - it.ax), Math.round(y - it.ay), it.w, it.h);
      }
      return true;
    },

    /* 시트 전체를 한 색 실루엣으로 칠한 캔버스(피격 번쩍임용) — 처음 한 번 만들고 기억한다 */
    tinted: function (sheet, color) {
      var key = sheet + '|' + color;
      if (this._tint[key]) return this._tint[key];
      if (!this.ready(sheet) || !global.document) return null;
      try {
        var im = this.imgs[sheet], c = global.document.createElement('canvas');
        c.width = im.width; c.height = im.height;
        var g = c.getContext('2d');
        g.drawImage(im, 0, 0);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
        this._tint[key] = c;
        return c;
      } catch (e) { return null; }
    }
  };

  MG.Sprites = Sprites;
  Sprites.init();
})(window);
`;
const out = head + body + tail;
fs.writeFileSync(path.join(ROOT, 'js', 'sprites.js'), out);
console.log('js/sprites.js: ' + sheets.map(s => s.name + ' ' + (s.b64.length / 1024).toFixed(1) + 'KB').join(', ') + ' — total ' + (out.length / 1024).toFixed(1) + 'KB');
