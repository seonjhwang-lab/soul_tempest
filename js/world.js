/* ==========================================================================
   world.js — 맵 하나(필드 2400×1600 또는 지하 던전의 방)를 불러와 그린다.
     필드: 5대 바이옴(🌲신록의 숲 · 💎수정 고원 · 🍁홍련의 유적 · ❄️만년설의 빙하 협곡 · 🌋칠흑의 용화산 성소) ·
           절벽/성벽/흑요석 벼랑 · 부술 수 있는 장벽(바위 · 가시덩굴 · 고목 · 얼음 · 흑요석) · 화톳불 5곳 · 보물상자 · 고대 비석/성소 ·
           채집 지점 · 장식 숲 · 지하 던전 입구 5곳 · 심연의 투기장 포털
     던전: 전실(정예 수문장 + 상자/비석 + 봉인문) / 보스 둥지(사방이 닫힌 아레나 + 토벌 뒤 귀환 제단) — 테마별 바닥/벽/횃불
   v83 HD-2D 하이브리드: 다층 절벽 · 불규칙한 경계(+맵 가장자리 암벽 띠) · 바닥 디테일 2배 · 접지 그림자/림 · 동적 광원(lighter 가산 패스) · 왕의 무덤 계단 · 미궁 포털
   v82: 방랑 NPC 5인 · 사신수 성소 4곳 · 전실 봉인 장치 · 보스 둥지 지형 함정(그리기/판정은 npc.js · gimmick.js) · 봉인된 전실 보물상자
   충돌(원 vs 사각형/원, 격자) · 땅/물체 그리기 · 상호작용 찾기
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;
  var TILE = 32, GRID = 64;

  /* 시트 색 변환 캐시(유적의 붉은 나무, 고원의 푸른 나무, 설원의 흰 나무, 몬스터 색 변종) — 브라우저에서 한 번 만들어 둔다 */
  var Tint = MG.Tint = {
    cache: {},
    get: function (sheet, key, filter) {
      var S = MG.Sprites, k = sheet + '|' + key;
      if (this.cache[k] !== undefined) return this.cache[k];
      if (!S || !S.ready(sheet) || !global.document || !global.document.createElement) return null;
      try {
        var im = S.img(sheet), c = global.document.createElement('canvas'); c.width = im.width; c.height = im.height;
        var g = c.getContext('2d'); if (!g || typeof g.drawImage !== 'function') { this.cache[k] = null; return null; }
        g.filter = filter; g.drawImage(im, 0, 0); g.filter = 'none';
        this.cache[k] = c; return c;
      } catch (e) { this.cache[k] = null; return null; }
    }
  };

  /* 필드의 바이옴: 동쪽 경계(1616) 너머는 위 = 용화산, 아래 = 빙하 협곡 */
  function fieldBiome(x, y) { if (x >= 1616) return y < 716 ? 'volcano' : 'glacier'; return y < 616 ? 'ruins' : (x > 1016 ? 'crystal' : 'forest'); }
  var BIOME_NAME = { forest: '신록의 숲', crystal: '수정 고원', ruins: '홍련의 유적', glacier: '만년설의 빙하 협곡', volcano: '칠흑의 용화산 성소' };
  var BIOME_ICON = { forest: '🌲', crystal: '💎', ruins: '🍁', glacier: '❄️', volcano: '🌋' };
  /* 던전 테마 색: 바닥 덧칠 · 벽(면/윗면/그늘) · 횃불 빛 */
  var THEME = {
    root: { floor: 'rgba(40, 90, 40, 0.42)', face: '#2e3a22', top: '#5a6a3a', dark: '#141c0e', light: 'rgba(160, 255, 140, 0.22)', fog: 'rgba(6, 20, 8, 0.35)' },
    crystal: { floor: 'rgba(110, 80, 220, 0.42)', face: '#2c2a52', top: '#6a5ac0', dark: '#120f2a', light: 'rgba(196, 168, 255, 0.26)', fog: 'rgba(12, 8, 40, 0.35)' },
    thorn: { floor: 'rgba(150, 40, 40, 0.38)', face: '#4a1e1c', top: '#8a3e34', dark: '#1e0a0a', light: 'rgba(255, 140, 90, 0.26)', fog: 'rgba(30, 6, 8, 0.35)' },
    ice: { floor: 'rgba(170, 220, 255, 0.5)', face: '#3a5a7a', top: '#a8d8f0', dark: '#162638', light: 'rgba(190, 246, 255, 0.26)', fog: 'rgba(10, 24, 40, 0.3)' },
    storm: { floor: 'rgba(30, 20, 40, 0.62)', face: '#1a1622', top: '#4a4060', dark: '#08060c', light: 'rgba(120, 200, 255, 0.24)', fog: 'rgba(8, 6, 16, 0.4)', lava: true },
    abyss: { floor: 'rgba(60, 20, 110, 0.6)', face: '#1a1030', top: '#5a3a90', dark: '#08040e', light: 'rgba(170, 120, 255, 0.28)', fog: 'rgba(10, 4, 22, 0.42)' }
  };

  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? U.clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0;
    return U.dist(px, py, ax + dx * t, ay + dy * t);
  }

  var World = {
    W: 2400, H: 1600, TILE: TILE, id: 'field', map: null,
    BIOME_NAME: BIOME_NAME, BIOME_ICON: BIOME_ICON, THEME: THEME,
    walls: [], barriers: [], bonfires: [], chests: [], steles: [], nodes: [], decor: [], ground: [], exits: [], stairs: [], tiles: null, anvil: null, abyssGate: null,
    grid: {},

    biomeAt: function (x, y) { return this.map && this.map.kind === 'dungeon' ? 'dungeon' : fieldBiome(x, y); },
    isField: function () { return !this.map || this.map.kind === 'field'; },
    placeName: function (x, y) { if (this.isField()) { var b = fieldBiome(x, y); return BIOME_ICON[b] + ' ' + BIOME_NAME[b]; } return (this.map.dungeon ? (D.THEMES[this.map.dungeon].icon + ' ') : '') + this.map.name; },

    init: function (mapId) {
      var M = D.MAPS[mapId || 'field'] || D.MAPS.field, r = U.rng(7);
      this.map = M; this.id = M.id; this.W = M.W; this.H = M.H;
      this.walls = M.walls.map(function (w) { return { x: w.x, y: w.y, w: w.w, h: w.h, kind: w.kind }; });
      this.barriers = M.barriers.map(function (b) { return { id: b.id, kind: b.kind, x: b.x, y: b.y, w: b.w, h: b.h, hp: b.hp || 1, maxHp: b.hp || 1, broken: false, burnT: 0, hitT: 0, freezeT: 0 }; });
      this.bonfires = M.bonfires.map(function (b) { return { id: b.id, name: b.name, icon: b.icon || '🔥', x: b.x, y: b.y, lit: !!b.lit }; });
      this.chests = M.chests.map(function (c) { return { id: c.id, x: c.x, y: c.y, reward: c.reward, open: false, openT: 0, sealed: c.sealed || null }; });
      this.steles = M.steles.map(function (s) { return { id: s.id, x: s.x, y: s.y, kind: s.kind, spell: s.spell, boost: s.boost, used: false }; });
      this.nodes = M.nodes.map(function (n, k) { return { id: M.id + '_n' + k, type: n[0], x: n[1], y: n[2], taken: false, shakeT: 0 }; });
      this.stairs = (M.stairs || []).map(function (s) { return { id: s.id, to: s.to, x: s.x, y: s.y, name: s.name, need: s.need || null }; });
      this.exits = (M.exits || []).map(function (e) { var o = {}; for (var k in e) o[k] = e[k]; return o; });
      this.anvil = M.anvil ? { x: M.anvil.x, y: M.anvil.y } : null;
      this.abyssGate = M.abyssGate ? { x: M.abyssGate.x, y: M.abyssGate.y, open: false } : null;
      this.kingGate = M.kingGate ? { x: M.kingGate.x, y: M.kingGate.y, open: false } : null;   // v84 ⚔️ 왕의 무덤(용화산 북동쪽 끝)
      // v82: 방랑 NPC · 사신수 성소 · 전실 봉인 장치 · 보스 둥지 지형 함정
      var gm = MG.Gimmick ? MG.Gimmick.build(M) : { devices: [], traps: [], beasts: [] };
      this.npcs = MG.NPC ? MG.NPC.build(M) : []; this.devices = gm.devices; this.traps = gm.traps; this.beasts = gm.beasts;
      this.buildDecor(r);
      this.buildTiles();
      this.buildGrid();
    },
    bonfire: function (id) { var L = D.MAPS.field.bonfires; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; },

    /* ---------------------------------------------------------------- 장식(충돌 있음) */
    free: function (x, y, pad) {
      var i, k, M = this.map;
      if (x < 12 || y < 12 || x > this.W - 12 || y > this.H - 12) return false;
      for (i = 0; i < M.keep.length; i++) { k = M.keep[i]; if (U.dist(x, y, k[0], k[1]) < k[2]) return false; }
      for (i = 0; i < M.paths.length; i++) { var p = M.paths[i]; for (var j = 0; j < p.length - 1; j++) if (segDist(x, y, p[j][0], p[j][1], p[j + 1][0], p[j + 1][1]) < 24) return false; }
      for (i = 0; i < this.walls.length; i++) { var w = this.walls[i]; if (U.circRect(x, y, pad + 14, w.x, w.y, w.w, w.h)) return false; }
      for (i = 0; i < this.barriers.length; i++) { var b = this.barriers[i]; if (U.circRect(x, y, pad + 30, b.x, b.y, b.w, b.h)) return false; }
      for (i = 0; i < this.nodes.length; i++) if (U.dist(x, y, this.nodes[i].x, this.nodes[i].y) < pad + 22) return false;
      for (i = 0; i < this.decor.length; i++) if (U.dist(x, y, this.decor[i].x, this.decor[i].y) < pad + this.decor[i].r + 8) return false;
      var lk = M.lakes || []; for (i = 0; i < lk.length; i++) { var q = lk[i], ex = (x - q[0]) / (q[2] + 10), ey = (y - q[1]) / (q[3] + 10); if (ex * ex + ey * ey < 1) return false; }
      return true;
    },
    /* v82: NPC · 사신수 성소 자리의 장식 나무/바위를 치운다(난수 순서는 그대로 — 다른 장식 배치는 바뀌지 않는다) */
    clearAround: function () {
      var spots = []; (this.npcs || []).forEach(function (n) { spots.push([n.x, n.y, 22]); }); (this.beasts || []).forEach(function (b) { spots.push([b.x, b.y, 26], [b.x, b.y + 30, 30]); }); if (this.kingGate) spots.push([this.kingGate.x, this.kingGate.y - 10, 46], [this.kingGate.x, this.kingGate.y + 34, 34]);   // 성소 앞(아래쪽)도 비워 석상과 사냥꾼이 나무에 가리지 않게
      if (MG.NPC && this.map.kind === 'field') D.NPCS.kyle.stops.forEach(function (p) { spots.push([p[0], p[1], 22]); });
      if (!spots.length) return;
      this.decor = this.decor.filter(function (d) { for (var i = 0; i < spots.length; i++) if (U.dist(d.x, d.y, spots[i][0], spots[i][1]) < spots[i][2] + d.r) return false; return true; });
    },
    addDecor: function (kind, x, y, r) { this.decor.push({ kind: kind, x: Math.round(x), y: Math.round(y), r: r }); },
    buildDecor: function (r) {
      this.decor = []; this.ground = [];
      var i, x, y, b, tries, M = this.map, W = this.W, H = this.H;
      if (M.kind === 'dungeon') {   // 던전: 벽을 따라 테마 소품(충돌 없음 — 바닥 장식)
        for (i = 0; i < 70; i++) { x = 30 + r() * (W - 60); y = 30 + r() * (H - 60); this.ground.push({ x: Math.round(x), y: Math.round(y), n: 'dg' + Math.floor(r() * 4) }); }
        return;
      }
      // 가장자리 숲(바깥으로 못 나가게 보이는 울타리 — 충돌은 맵 경계가 맡는다)
      for (i = 0; i < 4; i++) for (var s = 10; s < (i < 2 ? W : H); s += 26) {
        x = i < 2 ? s : (i === 2 ? 8 + r() * 14 : W - 8 - r() * 14); y = i === 0 ? 8 + r() * 14 : (i === 1 ? H - 8 - r() * 14 : s);
        b = fieldBiome(x, y);
        this.addDecor(b === 'crystal' ? (r() < 0.5 ? 'crystal' : 'tree') : b === 'ruins' ? (r() < 0.35 ? 'pillar' : 'tree') : b === 'volcano' ? (r() < 0.5 ? 'obsrock' : 'deadtree') : b === 'glacier' ? (r() < 0.4 ? 'icecrystal' : 'tree') : 'tree', x, y, 7);
        this.decor[this.decor.length - 1].edge = true;   // v83: 경계 장식 — 그릴 때 위치 · 크기 · 겹침이 불규칙해진다
      }
      var want = { forest: 120, crystal: 70, ruins: 75, glacier: 90, volcano: 80 };
      var box = { forest: [20, 640, 980, 1580], crystal: [1040, 640, 1580, 1580], ruins: [20, 20, 1580, 590], glacier: [1650, 750, 2380, 1580], volcano: [1650, 20, 2380, 690] };
      for (var bio in want) {
        var bx = box[bio], n = 0; tries = 0;
        while (n < want[bio] && tries++ < 4000) {
          x = bx[0] + r() * (bx[2] - bx[0]); y = bx[1] + r() * (bx[3] - bx[1]);
          var kind = bio === 'forest' ? (r() < 0.86 ? 'tree' : 'rock') : bio === 'crystal' ? (r() < 0.55 ? 'crystal' : (r() < 0.6 ? 'tree' : 'rock')) : bio === 'ruins' ? (r() < 0.4 ? 'pillar' : (r() < 0.75 ? 'tree' : 'rock'))
            : bio === 'glacier' ? (r() < 0.55 ? 'tree' : (r() < 0.6 ? 'icecrystal' : 'rock')) : (r() < 0.45 ? 'obsrock' : (r() < 0.6 ? 'deadtree' : 'rock'));
          var rr = kind === 'rock' || kind === 'obsrock' ? 9 : 7;
          if (!this.free(x, y, rr + 4)) continue;
          this.addDecor(kind, x, y, rr); n++;
        }
      }
      for (i = 0; i < this.decor.length; i++) this.decor[i].v = Math.floor(r() * 6);
      this.clearAround();
      // 바닥 장식(충돌 없음): 꽃 · 풀 · 버섯 · 돌멩이 · 고원의 작은 수정 · 유적의 판석 조각 · 설원의 눈 더미 · 화산의 잿더미
      for (i = 0; i < 1400; i++) {
        x = r() * W; y = r() * H; b = fieldBiome(x, y);
        var names = b === 'forest' ? ['flower_y', 'flower_w', 'flower_p', 'tuft0', 'tuft1', 'tuft2', 'fern0', 'shroom_r', 'pebbles0'] : b === 'crystal' ? ['flower_b', 'tuft0', 'stone0', 'stone1', 'pebbles1', 'flower_w']
          : b === 'ruins' ? ['stone2', 'stone3', 'pebbles0', 'leaves0', 'tuft2', 'shroom_b'] : b === 'glacier' ? ['sd_snow0', 'sd_snow1', 'sd_snow2', 'sd_tuft'] : ['sd_ash0', 'sd_ash1', 'sd_ember0', 'sd_ember1'];
        this.ground.push({ x: Math.round(x), y: Math.round(y), n: names[Math.floor(r() * names.length)], b: b });
      }
      this.buildDetail();
    },
    /* v83 바닥 디테일 2배(절차적 — 별도 난수): 고저차 음영 패치 · 야생화 · 이끼 · 조약돌 · 눈더미 · 얼음 금 · 용암 균열 · 불티 · 고대 문양 보도블록 · 수정 조각 */
    buildDetail: function () {
      var r = U.rng(29), W = this.W, H = this.H, dun = this.map.kind === 'dungeon', n = dun ? 160 : 1500, out = [], i;
      var KIND = { forest: ['patch', 'patch', 'flowers', 'flowers', 'moss', 'pebble'], crystal: ['patch', 'shard', 'flowers', 'pebble', 'moss'], ruins: ['glyph', 'glyph', 'patch', 'leaves', 'pebble'], glacier: ['drift', 'drift', 'patch', 'icecrack', 'pebble'], volcano: ['lavacrack', 'ash', 'patch', 'ember', 'pebble'], dungeon: ['dcrack', 'glyph', 'rubble', 'patch'] };
      for (i = 0; i < n; i++) { var x = 16 + r() * (W - 32), y = 16 + r() * (H - 32), b = dun ? 'dungeon' : fieldBiome(x, y), ks = KIND[b], k = ks[Math.floor(r() * ks.length)]; out.push({ x: Math.round(x), y: Math.round(y), k: k, b: b, s: r(), c: Math.floor(r() * 4) }); }
      out.sort(function (a, b) { return (a.k === 'patch' ? 0 : 1) - (b.k === 'patch' ? 0 : 1); });   // 음영 패치가 맨 아래
      this.detail = out;
    },
    /* 바닥 타일 표: 0 풀 · 1 흙길 · 2 판석 · 3 눈 · 4 얼음 호수 · 5 흑요석 재 · 6 던전 바닥, v = 변형 번호 */
    buildTiles: function () {
      var cols = Math.ceil(this.W / TILE), rows = Math.ceil(this.H / TILE), t = [], r = U.rng(11), M = this.map, dun = M.kind === 'dungeon';
      for (var ty = 0; ty < rows; ty++) for (var tx = 0; tx < cols; tx++) {
        var cx = tx * TILE + 16, cy = ty * TILE + 16, k = 0, b = dun ? 'dungeon' : fieldBiome(cx, cy);
        if (dun) { t.push({ k: 6, v: Math.floor(r() * 4), b: b }); continue; }
        for (var i = 0; i < M.paths.length && !k; i++) { var p = M.paths[i]; for (var j = 0; j < p.length - 1; j++) if (segDist(cx, cy, p[j][0], p[j][1], p[j + 1][0], p[j + 1][1]) < 17) { k = 1; break; } }
        if (b === 'ruins' && (k === 1 || r() < 0.35)) k = 2;
        if (b === 'glacier') { k = k === 1 ? 1 : 3; var lk = M.lakes || []; for (var q = 0; q < lk.length; q++) { var ex = (cx - lk[q][0]) / lk[q][2], ey = (cy - lk[q][1]) / lk[q][3]; if (ex * ex + ey * ey < 1) k = 4; } }
        if (b === 'volcano') k = k === 1 ? 1 : 5;
        t.push({ k: k, v: Math.floor(r() * 4), b: b });
      }
      this.tiles = t; this.cols = cols; this.rows = rows;
    },

    /* ---------------------------------------------------------------- 충돌 격자(정적: 벽 · 장식 / 동적: 장벽 · 물체) */
    buildGrid: function () {
      this.grid = {};
      var self = this;
      var put = function (c) { var x0 = Math.floor(c.bx0 / GRID), x1 = Math.floor(c.bx1 / GRID), y0 = Math.floor(c.by0 / GRID), y1 = Math.floor(c.by1 / GRID); for (var gy = y0; gy <= y1; gy++) for (var gx = x0; gx <= x1; gx++) (self.grid[gx + ',' + gy] = self.grid[gx + ',' + gy] || []).push(c); };
      this.walls.forEach(function (w) { put({ t: 'r', x: w.x, y: w.y, w: w.w, h: w.h, bx0: w.x, by0: w.y, bx1: w.x + w.w, by1: w.y + w.h }); });
      this.decor.forEach(function (d) { put({ t: 'c', x: d.x, y: d.y - 2, r: d.r, bx0: d.x - d.r, by0: d.y - d.r - 2, bx1: d.x + d.r, by1: d.y + d.r }); });
      this.bonfires.forEach(function (b) { put({ t: 'c', x: b.x, y: b.y - 2, r: 10, bx0: b.x - 10, by0: b.y - 12, bx1: b.x + 10, by1: b.y + 8 }); });
      this.steles.forEach(function (s) { put({ t: 'c', x: s.x, y: s.y - 3, r: 9, bx0: s.x - 9, by0: s.y - 12, bx1: s.x + 9, by1: s.y + 6 }); });
      this.chests.forEach(function (c) { put({ t: 'r', x: c.x - 10, y: c.y - 8, w: 20, h: 8, bx0: c.x - 10, by0: c.y - 8, bx1: c.x + 10, by1: c.y }); });
      this.nodes.forEach(function (n) { put({ t: 'c', x: n.x, y: n.y - 3, r: n.type === 'herb' ? 6 : 8, bx0: n.x - 8, by0: n.y - 11, bx1: n.x + 8, by1: n.y + 5 }); });
      var a = this.anvil; if (a) put({ t: 'r', x: a.x - 18, y: a.y - 12, w: 36, h: 12, bx0: a.x - 18, by0: a.y - 12, bx1: a.x + 18, by1: a.y });
      (this.npcs || []).forEach(function (n) { put({ t: 'c', x: n.x, y: n.y - 2, r: 5, bx0: n.x - 5, by0: n.y - 7, bx1: n.x + 5, by1: n.y + 3 }); });
      (this.beasts || []).forEach(function (b) { put({ t: 'c', x: b.x, y: b.y - 3, r: 10, bx0: b.x - 10, by0: b.y - 13, bx1: b.x + 10, by1: b.y + 7 }); });
      var kgt = this.kingGate; if (kgt) { put({ t: 'r', x: kgt.x - 30, y: kgt.y - 16, w: 18, h: 16, bx0: kgt.x - 30, by0: kgt.y - 16, bx1: kgt.x - 12, by1: kgt.y }); put({ t: 'r', x: kgt.x + 12, y: kgt.y - 16, w: 18, h: 16, bx0: kgt.x + 12, by0: kgt.y - 16, bx1: kgt.x + 30, by1: kgt.y }); }   // 아치 기둥 둘
      (this.devices || []).forEach(function (d) { put({ t: 'c', x: d.x, y: d.y - 2, r: 7, bx0: d.x - 7, by0: d.y - 9, bx1: d.x + 7, by1: d.y + 5 }); });
    },
    /* 원(x, y, r)을 막힌 곳 밖으로 밀어낸다 — { x, y } */
    resolve: function (x, y, r) {
      x = U.clamp(x, 12, this.W - 12); y = U.clamp(y, 12, this.H - 12);
      if (!isFinite(x) || !isFinite(y)) return { x: 100, y: 100 };
      for (var pass = 0; pass < 2; pass++) {
        var gx = Math.floor(x / GRID), gy = Math.floor(y / GRID), seen = [];
        for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
          var cell = this.grid[(gx + ox) + ',' + (gy + oy)];
          if (!cell) continue;
          for (var i = 0; i < cell.length; i++) { var c = cell[i]; if (seen.indexOf(c) >= 0) continue; seen.push(c); var p = this.push(x, y, r, c); x = p.x; y = p.y; }
        }
        for (var j = 0; j < this.barriers.length; j++) { var b = this.barriers[j]; if (b.broken) continue; var q = this.push(x, y, r, { t: 'r', x: b.x, y: b.y, w: b.w, h: b.h }); x = q.x; y = q.y; }
        for (var tj = 0; tj < (this.traps || []).length; tj++) { var tr = this.traps[tj]; if (tr.down) continue; var tq = this.push(x, y, r, { t: 'c', x: tr.x, y: tr.y - 2, r: D.TRAP.r }); x = tq.x; y = tq.y; }   // v82 지형 함정(무너지면 지나갈 수 있다)
      }
      return { x: x, y: y };
    },
    push: function (x, y, r, c) {
      if (c.t === 'c') {
        var d = U.dist(x, y, c.x, c.y), m = r + c.r;
        if (d < m) { if (d < 0.001) return { x: x + m, y: y }; return { x: c.x + (x - c.x) / d * m, y: c.y + (y - c.y) / d * m }; }
        return { x: x, y: y };
      }
      var nx = U.clamp(x, c.x, c.x + c.w), ny = U.clamp(y, c.y, c.y + c.h), dx = x - nx, dy = y - ny, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd >= r) return { x: x, y: y };
      if (dd > 0.001) return { x: nx + dx / dd * r, y: ny + dy / dd * r };
      var l = x - c.x, rt = c.x + c.w - x, t = y - c.y, bt = c.y + c.h - y, mn = Math.min(l, rt, t, bt);
      if (mn === l) return { x: c.x - r, y: y }; if (mn === rt) return { x: c.x + c.w + r, y: y }; if (mn === t) return { x: x, y: c.y - r }; return { x: x, y: c.y + c.h + r };
    },
    blocked: function (x, y, r) { var p = this.resolve(x, y, r); return Math.abs(p.x - x) > 0.5 || Math.abs(p.y - y) > 0.5; },

    /* ---------------------------------------------------------------- 장벽 */
    barrierNear: function (x, y, r, kind) { for (var i = 0; i < this.barriers.length; i++) { var b = this.barriers[i]; if (!b.broken && (!kind || b.kind === kind) && U.circRect(x, y, r, b.x, b.y, b.w, b.h)) return b; } return null; },
    barrierById: function (id) { for (var i = 0; i < this.barriers.length; i++) if (this.barriers[i].id === id) return this.barriers[i]; return null; },
    breakBarrier: function (b, text, col) {
      if (!b || b.broken) return false;
      b.broken = true;
      if (MG.FX) { MG.FX.text(b.x + b.w / 2, b.y - 6, text, col || '#ffd866', 1.4, 15); MG.FX.shake(3, 0.25); }
      MG.emit('barrier', b);
      return true;
    },
    /* 모아베기(대검은 한 번에) · 실드 배쉬 · 발도가 바위 장벽에 닿았다: power 만큼 깎는다 */
    hitRock: function (b, power) {
      if (!b || b.broken || b.kind !== 'rock') return false;
      b.hp -= power; b.hitT = 0.25;
      if (MG.FX) { MG.FX.shake(3, 0.2); MG.FX.burst(b.x + b.w / 2, b.y + b.h / 2, 16, ['#c4ccd6', '#6c7684', '#98a2b0'], 90); }
      if (MG.Audio && MG.Audio.playShellCrack) MG.Audio.playShellCrack();
      if (b.hp <= 0) { if (MG.FX) MG.FX.burst(b.x + b.w / 2, b.y + b.h / 2, 30, ['#c4ccd6', '#4a525e', '#ffd866'], 140); this.breakBarrier(b, '💥 바위 장벽 붕괴!'); }
      else if (MG.FX) MG.FX.text(b.x + b.w / 2, b.y - 6, '쩌억! (' + b.hp + ')', '#e8e0d0', 0.8, 12);
      return true;
    },
    /* 고목(신록의 숲 기믹): 공격 버튼(🪓 벌목) 세 번 */
    chop: function (b) {
      if (!b || b.broken || b.kind !== 'oldtree') return false;
      b.hp -= 1; b.hitT = 0.3;
      if (MG.FX) { MG.FX.burst(b.x + b.w / 2, b.y + 4, 14, ['#965e30', '#4fa854', '#c08a4e'], 80); MG.FX.shake(1.5, 0.12); }
      if (b.hp <= 0) this.breakBarrier(b, '🪓 고목이 쓰러졌다!', '#c8f0a0');
      else if (MG.FX) MG.FX.text(b.x + b.w / 2, b.y - 10, '🪓 쿵! (' + b.hp + ')', '#e8e0d0', 0.8, 12);
      return true;
    },
    /* 불길(홍련의 화염진 · 화염 무기): 반경 안의 가시덩굴은 타고, 얼음 장벽은 녹는다 */
    burn: function (x, y, r, weaponOnly) {
      var n = MG.Gimmick ? MG.Gimmick.burn(x, y, r) : 0;   // v82: 꺼진 룬 화로도 불이 붙는다
      for (var i = 0; i < this.barriers.length; i++) {
        var b = this.barriers[i]; if (b.broken || b.burnT > 0) continue;
        if (b.kind !== 'ice' && (b.kind !== 'thorn' || weaponOnly)) continue;
        if (U.circRect(x, y, r, b.x, b.y, b.w, b.h)) { b.burnT = 0.01; n++; }
      }
      return n;
    },
    burnThorns: function (x, y, r) { return this.burn(x, y, r); },
    /* 절대영도 눈보라: 흑요석 봉인암이 급랭되어 금이 가고 산산이 부서진다 */
    freeze: function (x, y, r) {
      var n = 0;
      for (var i = 0; i < this.barriers.length; i++) { var b = this.barriers[i]; if (b.broken || b.kind !== 'obsidian' || b.freezeT > 0) continue; if (U.circRect(x, y, r, b.x, b.y, b.w, b.h)) { b.freezeT = 0.01; n++; } }
      return n;
    },
    openSeal: function (id) { var b = this.barrierById(id); if (b && !b.broken) { this.breakBarrier(b, '🔓 봉인문이 열렸다!', '#bff6ff'); if (MG.FX) MG.FX.burst(b.x + b.w / 2, b.y + b.h / 2, 30, ['#8ae8f8', '#e4fdff', '#c4a8ff'], 120); return true; } return false; },
    update: function (dt) {
      for (var i = 0; i < this.barriers.length; i++) {
        var b = this.barriers[i]; b.hitT = Math.max(0, b.hitT - dt);
        if (b.burnT > 0 && !b.broken) {
          b.burnT += dt;
          if (MG.FX && Math.random() < 0.6) { if (b.kind === 'ice') MG.FX.burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 1, ['#bff6ff', '#8ad2ea'], 20, { g: 60 }); else MG.FX.ember(b.x + Math.random() * b.w, b.y + Math.random() * b.h); }
          if (b.burnT > (b.kind === 'ice' ? 1.4 : 1.1)) this.breakBarrier(b, b.kind === 'ice' ? '💧 만년설 얼음 장벽이 녹아내렸다!' : '🔥 가시덩굴이 타 버렸다!', b.kind === 'ice' ? '#bff6ff' : '#ffb238');
        }
        if (b.freezeT > 0 && !b.broken) {
          b.freezeT += dt;
          if (MG.FX && Math.random() < 0.5) MG.FX.burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 1, ['#e4fdff', '#8ae8f8'], 30, { g: 0 });
          if (b.freezeT > 0.9) { if (MG.FX) MG.FX.burst(b.x + b.w / 2, b.y + b.h / 2, 34, ['#1a1622', '#e4fdff', '#ff6a3c', '#8ae8f8'], 150); this.breakBarrier(b, '❄️ 급랭된 흑요석 봉인암이 산산이 부서졌다!', '#bff6ff'); }
        }
      }
      for (var j = 0; j < this.nodes.length; j++) this.nodes[j].shakeT = Math.max(0, this.nodes[j].shakeT - dt);
      if (MG.Gimmick) MG.Gimmick.update(dt);
      for (var k = 0; k < this.chests.length; k++) if (this.chests[k].open) this.chests[k].openT += dt;
    },
    /* 화톳불에서 쉬면 채집 지점이 다시 자란다 */
    regrow: function () { for (var i = 0; i < this.nodes.length; i++) this.nodes[i].taken = false; },

    /* ---------------------------------------------------------------- 상호작용(머리 위 말풍선 + 메인 버튼이 바뀐다) */
    NODE_INFO: {
      tree: { label: '벌목', icon: 'axe', emo: '🪓', mat: 'wood', n: [2, 3] },
      ore: { label: '채광', icon: 'hammer', emo: '⛏️', mat: 'ore', n: [2, 3] },
      herb: { label: '채집', icon: 'herb', emo: '🌿', mat: 'herb', n: [1, 2] },
      crystal: { label: '채광', icon: 'hammer', emo: '⛏️', mat: 'crystal', n: [2, 3] },
      gold: { label: '채광', icon: 'hammer', emo: '⛏️', mat: 'gold_ore', n: [1, 2] },
      frost: { label: '채광', icon: 'hammer', emo: '⛏️', mat: 'frost', n: [1, 2] },
      lava: { label: '채광', icon: 'hammer', emo: '⛏️', mat: 'lava', n: [1, 2] }
    },
    exitOpen: function (e) {
      var S = MG.S;
      if (e.needBroken) { var b = this.barrierById(e.needBroken); return !!(b && b.broken); }
      if (e.needBossDead) { var B = MG.Bosses && MG.Bosses.byId(e.needBossDead); return !!(B && !B.alive); }
      if (e.needArenaDone) return !!(MG.Bosses && MG.Bosses.arenaDone);
      void S; return true;
    },
    interactAt: function (x, y) {
      var best = null, bd = 1e9, i;
      var take = function (o, kind, label, emo, icon, range) { var dd = U.dist(x, y, o.x, o.y); if (dd < range && dd < bd) { bd = dd; best = { kind: kind, obj: o, label: label, emo: emo, icon: icon }; } };
      for (i = 0; i < this.bonfires.length; i++) take(this.bonfires[i], 'bonfire', this.bonfires[i].lit ? '화톳불' : '점화', '🔥', 'fire', 30);
      if (this.anvil) take(this.anvil, 'forge', '대장간', '🔨', 'anvil', 34);
      for (i = 0; i < this.chests.length; i++) if (!this.chests[i].open && !this.chestLocked(this.chests[i])) take(this.chests[i], 'chest', '열기', '📦', 'box', 26);
      // v82: 방랑 NPC(반경 48) · 사신수 성소 — 같은 메인 버튼이 [💬 대화] / [🔥 가호 받기]
      var NR = D.NPC_CFG.RANGE;
      for (i = 0; i < (this.npcs || []).length; i++) { var np = this.npcs[i], nd = U.dist(x, y, np.x, np.y); if (nd < NR && nd < bd) { bd = nd; best = { kind: 'npc', obj: np, label: '대화', emo: '💬', icon: 'ic_talk', rb: true }; } }
      for (i = 0; i < (this.beasts || []).length; i++) { var bs = this.beasts[i], on = MG.S.blessing === bs.id; take(bs, 'beast', on ? '가호 중' : '가호 받기', '🔥', 'ic_bless', 32); if (best && best.obj === bs) best.rb = true; }
      for (i = 0; i < this.steles.length; i++) if (!this.steles[i].used) take(this.steles[i], 'stele', this.steles[i].kind === 'shrine' ? '성소 조사' : '조사', this.steles[i].kind === 'shrine' ? '⛩️' : '🗿', 'scroll', 28);
      for (i = 0; i < this.nodes.length; i++) { var n = this.nodes[i]; if (n.taken) continue; var inf = this.NODE_INFO[n.type]; take(n, 'node', inf.label, inf.emo, inf.icon, 24); }
      for (i = 0; i < this.stairs.length; i++) if (!this.stairs[i].need || MG.S[this.stairs[i].need]) take(this.stairs[i], 'stairs', this.stairs[i].id === 'd6' ? '왕의 무덤' : '내려가기', '🕳️', 'gate', 26);
      if (this.kingGate && this.kingGate.open) take(this.kingGate, 'tomb', '왕의 무덤', '👑', 'relic', 34);   // v84
      for (i = 0; i < this.exits.length; i++) { var e = this.exits[i]; if (this.exitOpen(e)) take(e, 'exit', e.label, e.emo, e.kind === 'altar' ? 'relic' : 'gate', e.kind === 'door' ? 30 : 26); }
      if (this.abyssGate && this.abyssGate.open) take(this.abyssGate, 'abyss', '심연의 투기장', '⚔️', 'relic', 28);
      for (i = 0; i < this.barriers.length; i++) { var b = this.barriers[i]; if (b.broken || b.kind !== 'oldtree') continue; var cx = U.clamp(x, b.x, b.x + b.w), cy = b.y + b.h; take({ x: cx, y: cy, ref: b }, 'fell', '고목 벌목', '🪓', 'axe', 26); }
      return best;
    },
    /* 행동이 아닌 안내 말풍선(장벽 앞) */
    chestLocked: function (c) { if (!c.sealed) return false; var b = this.barrierById(c.sealed); return !(b && b.broken); },
    hintAt: function (x, y, has) {
      var gh = MG.Gimmick && MG.Gimmick.hint(x, y); if (gh) return gh;
      for (var si = 0; si < this.stairs.length; si++) { var st = this.stairs[si]; if (st.need && !MG.S[st.need] && U.dist(x, y, st.x, st.y) < 40) return { emo: '🔒', label: '폭풍룡을 쓰러뜨려야 열린다' }; }
      if (this.kingGate && !this.kingGate.open && U.dist(x, y, this.kingGate.x, this.kingGate.y) < 44) return { emo: '🔒', label: '왕의 무덤 — 5대 괴수 토벌 ' + (MG.Game ? MG.Game.bossesDown() : 0) + '/5' };
      var b = this.barrierNear(x, y, 34);
      if (!b) return null;
      has = has || {};
      if (b.kind === 'rock') return { emo: '💥', label: '모아베기로 부수기' };
      if (b.kind === 'thorn') return { emo: '🔥', label: has.fire ? '화염진으로 태우기' : '불길이 필요하다' };
      if (b.kind === 'ice') return { emo: '🔥', label: has.fire || has.fireWeapon ? '불길로 녹이기' : '만년설 — 불길이 필요하다' };
      if (b.kind === 'obsidian') return { emo: '❄️', label: has.frost ? '절대영도로 얼려 깨기' : '흑요석 — 절대영도의 냉기가 필요하다' };
      if (b.kind === 'seal') return { emo: '🔒', label: '수문장을 쓰러뜨려라' };
      return null;
    },

    /* ---------------------------------------------------------------- 그리기 */
    drawGround: function (ctx, cam, t) {
      var S = MG.Sprites, hd = S && S.ready('tiles'), rb = S && S.ready('rb'), x0 = Math.max(0, Math.floor(cam.x / TILE)), y0 = Math.max(0, Math.floor(cam.y / TILE));
      var x1 = Math.min(this.cols - 1, Math.floor((cam.x + MG.VW) / TILE)), y1 = Math.min(this.rows - 1, Math.floor((cam.y + MG.VH) / TILE));
      var GRASS = ['grass0', 'grass1', 'grass2', 'grass3'], TINT = { forest: null, crystal: 'rgba(150, 128, 255, 0.36)', ruins: 'rgba(196, 70, 60, 0.22)' };
      var th = this.map.kind === 'dungeon' ? THEME[this.map.theme] : null;
      for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
        var c = this.tiles[ty * this.cols + tx], px = tx * TILE, py = ty * TILE;
        if (c.k === 3 || c.k === 4 || c.k === 5) {
          if (rb) S.draw(ctx, 'rb', c.k === 3 ? 't_snow' + c.v : c.k === 4 ? 't_ice' + (c.v % 2) : 't_ash' + c.v, px, py);
          else { ctx.fillStyle = c.k === 3 ? '#dce8f4' : c.k === 4 ? '#9ad2ea' : '#2a2430'; ctx.fillRect(px, py, TILE, TILE); }
          continue;
        }
        if (c.k === 6) {
          if (hd) S.draw(ctx, 'tiles', 'flag' + (c.v % 2), px, py); else { ctx.fillStyle = '#3a3a44'; ctx.fillRect(px, py, TILE, TILE); }
          ctx.fillStyle = th.floor; ctx.fillRect(px, py, TILE, TILE);
          if ((tx + ty) % 2) { ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'; ctx.fillRect(px, py, TILE, TILE); }
          continue;
        }
        if (hd) {
          var nm = c.k === 1 ? 'dirt' + (c.v % 2) : c.k === 2 ? 'flag' + (c.v % 2) : GRASS[c.v];
          S.draw(ctx, 'tiles', nm, px, py);
        } else { ctx.fillStyle = c.k === 1 ? '#9a7a4a' : c.b === 'crystal' ? '#7a8ad0' : c.b === 'ruins' ? '#8a6a4a' : '#4fa854'; ctx.fillRect(px, py, TILE, TILE); }
        if (c.b === 'glacier' && c.k === 1) { ctx.fillStyle = 'rgba(220, 236, 255, 0.45)'; ctx.fillRect(px, py, TILE, TILE); }
        else if (c.b === 'volcano' && c.k === 1) { ctx.fillStyle = 'rgba(24, 16, 22, 0.74)'; ctx.fillRect(px, py, TILE, TILE); }
        else if (TINT[c.b] && c.k !== 1) { ctx.fillStyle = TINT[c.b]; ctx.fillRect(px, py, TILE, TILE); }
      }
      // 용암 균열(빛나는 금): 맥박치듯 밝아진다
      var LV = this.map.lava || [];
      if (LV.length) {
        ctx.lineCap = 'round';
        for (var li = 0; li < LV.length; li++) {
          var Lq = LV[li]; if (Math.max(Lq[0], Lq[2]) < cam.x - 20 || Math.min(Lq[0], Lq[2]) > cam.x + MG.VW + 20 || Math.max(Lq[1], Lq[3]) < cam.y - 20 || Math.min(Lq[1], Lq[3]) > cam.y + MG.VH + 20) continue;
          var pu = 0.6 + 0.4 * Math.sin(t * 2.2 + li);
          ctx.strokeStyle = 'rgba(255, 90, 30, ' + (0.25 * pu).toFixed(2) + ')'; ctx.lineWidth = 9; this.crack(ctx, Lq, li);
          ctx.strokeStyle = 'rgba(255, 150, 50, ' + (0.8 * pu).toFixed(2) + ')'; ctx.lineWidth = 2.5; this.crack(ctx, Lq, li);
          ctx.strokeStyle = 'rgba(255, 240, 160, ' + (0.7 * pu).toFixed(2) + ')'; ctx.lineWidth = 1; this.crack(ctx, Lq, li);
        }
        ctx.lineCap = 'butt';
      }
      this.drawDetail(ctx, cam, t);
      if (this.isField()) this.drawEdgeRim(ctx, cam, t);
      if (S && S.ready('world')) for (var i = 0; i < this.ground.length; i++) {
        var g = this.ground[i];
        if (g.x < cam.x - 12 || g.x > cam.x + MG.VW + 12 || g.y < cam.y - 12 || g.y > cam.y + MG.VH + 12) continue;
        if (g.n.charAt(0) === 'd' && g.n.charAt(1) === 'g') { this.drawDungeonBit(ctx, g, t); continue; }
        if (g.b === 'glacier' || g.b === 'volcano') { if (rb) S.draw(ctx, 'rb', g.n, g.x, g.y); continue; }
        S.draw(ctx, 'world', g.n, g.x, g.y);
      }
      for (var w = 0; w < this.walls.length; w++) this.drawWall(ctx, this.walls[w], cam, t);
      this.drawExits(ctx, cam, t);
    },
    /* v81 맵 바깥(넓은 화면에서 던전 방보다 시야가 넓을 때): 검은 여백 대신 어두운 지하 심연 석재 + 방 가장자리에서 번지는 안개 */
    drawVoid: function (ctx, cam, t) {
      var x0 = cam.x, y0 = cam.y, x1 = cam.x + MG.VW, y1 = cam.y + MG.VH, W = this.W, H = this.H;
      if (x0 >= 0 && y0 >= 0 && x1 <= W && y1 <= H) return false;
      var th = this.map.kind === 'dungeon' ? THEME[this.map.theme] : null, tx, ty;
      var tx0 = Math.floor(x0 / 32), ty0 = Math.floor(y0 / 32), tx1 = Math.floor(x1 / 32), ty1 = Math.floor(y1 / 32);
      for (ty = ty0; ty <= ty1; ty++) for (tx = tx0; tx <= tx1; tx++) {
        var px = tx * 32, py = ty * 32; if (px >= 0 && py >= 0 && px + 32 <= W && py + 32 <= H) continue;
        var hs = ((tx * 73856093) ^ (ty * 19349663)) >>> 0, v = hs % 7, far = Math.min(1, Math.max(px < 0 ? -px : px - W, py < 0 ? -py : py - H, 0) / 160);
        ctx.fillStyle = ['#0c0d16', '#0e1019', '#0a0b13', '#0d0f18', '#0b0c15', '#0f111b', '#090a11'][v]; ctx.fillRect(px, py, 32, 32);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; ctx.fillRect(px, py, 32, 1); ctx.fillRect(px + ((ty & 1) ? 16 : 0), py, 1, 16); ctx.fillRect(px + ((ty & 1) ? 0 : 16), py + 16, 1, 16); ctx.fillRect(px, py + 16, 32, 1);
        if (v === 2) { ctx.fillStyle = th ? th.top : '#4a4060'; ctx.globalAlpha = 0.18; ctx.fillRect(px + 5, py + 9, 6, 1); ctx.fillRect(px + 10, py + 10, 1, 4); ctx.globalAlpha = 1; }
        if (v === 5) { ctx.fillStyle = 'rgba(120, 150, 220, 0.08)'; ctx.fillRect(px + 20, py + 22, 2, 2); }
        if (far > 0) { ctx.fillStyle = 'rgba(2, 2, 6, ' + (far * 0.6).toFixed(2) + ')'; ctx.fillRect(px, py, 32, 32); }
      }
      // 방 가장자리에서 바깥으로 번지는 안개(테마 색) + 천천히 흐르는 물안개
      var fog = th ? th.light.replace(/[\d.]+\)$/, '') : 'rgba(120, 140, 200, ', band = 48;
      var edge = function (gx0, gy0, gx1, gy1, rx, ry, rw, rh) { var lg = ctx.createLinearGradient && ctx.createLinearGradient(gx0, gy0, gx1, gy1); if (!lg || !lg.addColorStop) return; lg.addColorStop(0, fog + '0.22)'); lg.addColorStop(1, fog + '0)'); ctx.fillStyle = lg; ctx.fillRect(rx, ry, rw, rh); };
      if (x0 < 0) edge(0, 0, -band, 0, -band, Math.max(y0, -band), band, Math.min(y1, H + band) - Math.max(y0, -band));
      if (x1 > W) edge(W, 0, W + band, 0, W, Math.max(y0, -band), band, Math.min(y1, H + band) - Math.max(y0, -band));
      if (y0 < 0) edge(0, 0, 0, -band, Math.max(x0, 0), -band, Math.min(x1, W) - Math.max(x0, 0), band);
      if (y1 > H) edge(0, H, 0, H + band, Math.max(x0, 0), H, Math.min(x1, W) - Math.max(x0, 0), band);
      for (var k = 0; k < 6; k++) {
        var mx = x0 + ((t * (6 + k * 2) + k * 157) % (MG.VW + 120)) - 60, my = y0 + (k * 97 % Math.max(1, MG.VH));
        if (mx > 0 && mx < W && my > 0 && my < H) continue;
        var mg = ctx.createRadialGradient && ctx.createRadialGradient(mx, my, 2, mx, my, 70);
        if (mg && mg.addColorStop) { mg.addColorStop(0, 'rgba(70, 80, 120, 0.10)'); mg.addColorStop(1, 'rgba(70, 80, 120, 0)'); ctx.fillStyle = mg; ctx.fillRect(mx - 70, my - 70, 140, 140); }
      }
      return true;
    },
    drawDetail: function (ctx, cam, t) {
      var D2 = this.detail || [], x0 = cam.x - 50, x1 = cam.x + MG.VW + 50, y0 = cam.y - 50, y1 = cam.y + MG.VH + 50, n = 0;
      var FL = ['#ffe066', '#f4f8ff', '#ff8ac8', '#8ab8ff'], dun = THEME[this.map.theme];
      for (var i = 0; i < D2.length; i++) {
        var d = D2[i]; if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue; n++;
        var x = d.x, y = d.y, k = d.k, s = d.s;
        if (k === 'patch') { var pr = 16 + s * 30, dark = d.c < 2, col = d.b === 'glacier' ? (dark ? 'rgba(70, 110, 160, 0.10)' : 'rgba(255, 255, 255, 0.16)') : d.b === 'volcano' ? (dark ? 'rgba(0, 0, 0, 0.16)' : 'rgba(120, 60, 40, 0.10)') : d.b === 'dungeon' ? 'rgba(0, 0, 0, 0.14)' : (dark ? 'rgba(10, 30, 10, 0.12)' : 'rgba(255, 250, 200, 0.07)'); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, pr, pr * 0.55, 0, 0, Math.PI * 2); ctx.fill(); continue; }
        if (k === 'flowers') { for (var f = 0; f < 4; f++) { ctx.fillStyle = FL[(d.c + f) % 4]; ctx.fillRect(x + ((f * 5 + d.c * 3) % 9) - 4, y + ((f * 7) % 5) - 2, 1, 1); } ctx.fillStyle = 'rgba(40, 120, 50, 0.7)'; ctx.fillRect(x - 2, y + 2, 5, 1); continue; }
        if (k === 'moss') { ctx.fillStyle = d.b === 'crystal' ? 'rgba(120, 110, 220, 0.35)' : 'rgba(60, 150, 70, 0.4)'; ctx.fillRect(x - 3, y, 7, 2); ctx.fillRect(x - 1, y - 1, 4, 1); continue; }
        if (k === 'pebble') { ctx.fillStyle = d.b === 'volcano' ? '#2a2430' : d.b === 'glacier' ? '#b8cce0' : '#8a8a80'; ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + 3, y + 1, 1, 1); ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; ctx.fillRect(x, y, 1, 1); continue; }
        if (k === 'shard') { ctx.fillStyle = d.c % 2 ? '#c4a8ff' : '#8ae8f8'; ctx.fillRect(x, y - 2, 1, 3); ctx.fillRect(x + 2, y - 1, 1, 2); continue; }
        if (k === 'glyph') { ctx.strokeStyle = d.b === 'dungeon' ? (dun ? dun.top : '#5a5a70') : 'rgba(120, 70, 50, 0.55)'; ctx.globalAlpha = d.b === 'dungeon' ? 0.35 : 1; ctx.lineWidth = 1; ctx.strokeRect(x - 7, y - 4, 14, 8); ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); if (d.c % 2) { ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); } ctx.stroke(); ctx.globalAlpha = 1; continue; }
        if (k === 'leaves') { ctx.fillStyle = d.c % 2 ? '#c8502a' : '#e8903a'; ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + 4, y + 2, 1, 1); continue; }
        if (k === 'drift') { ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'; ctx.beginPath(); ctx.ellipse(x, y, 5 + s * 6, 2 + s * 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(150, 190, 230, 0.4)'; ctx.fillRect(x - 3, y + 1, 7, 1); continue; }
        if (k === 'icecrack') { ctx.strokeStyle = 'rgba(70, 130, 180, 0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x, y + 2); ctx.lineTo(x + 5, y - 2); ctx.stroke(); continue; }
        if (k === 'lavacrack') { var pu = 0.55 + 0.45 * Math.sin(t * 2.4 + x * 0.1); ctx.strokeStyle = 'rgba(255, 110, 40, ' + (0.5 * pu).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 6, y - 1); ctx.lineTo(x - 1, y + 1); ctx.lineTo(x + 6, y - 1); ctx.stroke(); continue; }
        if (k === 'ash') { ctx.fillStyle = 'rgba(20, 16, 20, 0.5)'; ctx.fillRect(x - 4, y, 9, 2); continue; }
        if (k === 'ember') { ctx.fillStyle = 'rgba(255, 150, 60, ' + (0.4 + 0.4 * Math.sin(t * 5 + x)).toFixed(2) + ')'; ctx.fillRect(x, y, 1, 1); continue; }
        if (k === 'dcrack') { ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 7, y - 2); ctx.lineTo(x, y + 1); ctx.lineTo(x + 3, y - 3); ctx.lineTo(x + 8, y); ctx.stroke(); continue; }
        if (k === 'rubble') { ctx.fillStyle = dun ? dun.face : '#30363f'; ctx.fillRect(x - 2, y, 3, 2); ctx.fillRect(x + 2, y + 1, 2, 1); }
      }
      this.detailDrawn = n; return n;
    },
    /* v83 맵 경계의 다층 암벽 띠(일정한 줄 대신 — 두께 · 층 · 꼭대기 이끼/눈/재가 들쭉날쭉) */
    drawEdgeRim: function (ctx, cam, t) {
      var W = this.W, H = this.H, step = 16, self = this, x0 = Math.max(0, Math.floor(cam.x / step) * step), x1 = Math.min(W, cam.x + MG.VW + step), y0 = Math.max(0, Math.floor(cam.y / step) * step), y1 = Math.min(H, cam.y + MG.VH + step), n = 0;
      var CAP = { forest: '#4f9a4c', crystal: '#8a7ad8', ruins: '#8a3e34', glacier: '#f4f8ff', volcano: '#3a3048' }, ROCK = { forest: ['#30363f', '#4a525e', '#6c7684'], crystal: ['#2c2a52', '#4a4280', '#6a5ac0'], ruins: ['#3a1a16', '#5a2e26', '#7a4a3a'], glacier: ['#4a7090', '#8ab8d8', '#c8e0f0'], volcano: ['#08060c', '#1a1622', '#3a3048'] };
      var band = function (side, a) {   // side: 0 위 · 1 아래 · 2 왼쪽 · 3 오른쪽, a = 그 변을 따라가는 위치
        var hs = hash(a, side), th = 10 + hs * 12, x = side < 2 ? a : (side === 2 ? 0 : W - th), y = side < 2 ? (side === 0 ? 0 : H - th) : a, w = side < 2 ? step : th, h = side < 2 ? th : step, bio = fieldBiome(side === 3 ? W - 20 : x + 8, side === 1 ? H - 20 : y + 8), R = ROCK[bio];
        ctx.fillStyle = R[0]; ctx.fillRect(x, y, w, h); n++;
        ctx.fillStyle = R[1]; for (var q = 3; q < th; q += 6) { if (side < 2) ctx.fillRect(x, side === 0 ? y + q : y + th - q - 2, w, 2); else ctx.fillRect(side === 2 ? x + q : x + th - q - 2, y, 2, h); }
        ctx.fillStyle = R[2]; if (side < 2) ctx.fillRect(x, side === 0 ? y + th - 2 : y, w, 2); else ctx.fillRect(side === 2 ? x + th - 2 : x, y, 2, h);
        ctx.fillStyle = CAP[bio]; var cx = side < 2 ? x + hash(a + 3, side) * 12 : (side === 2 ? x + th - 2 : x - 1), cy = side < 2 ? (side === 0 ? y + th - 2 : y - 1) : y + hash(a + 3, side) * 12; ctx.fillRect(Math.round(cx), Math.round(cy), side < 2 ? 5 : 3, side < 2 ? 3 : 5);
        var sg = ctx.createLinearGradient && (side < 2 ? ctx.createLinearGradient(0, side === 0 ? th : H - th, 0, side === 0 ? th + 10 : H - th - 10) : ctx.createLinearGradient(side === 2 ? th : W - th, 0, side === 2 ? th + 10 : W - th - 10, 0));
        if (sg && sg.addColorStop) { sg.addColorStop(0, 'rgba(0, 0, 0, 0.28)'); sg.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = sg; if (side < 2) ctx.fillRect(x, side === 0 ? th : H - th - 10, w, 10); else ctx.fillRect(side === 2 ? th : W - th - 10, y, 10, h); }
      };
      var a;
      if (cam.y < 30) for (a = x0; a < x1; a += step) band(0, a);
      if (cam.y + MG.VH > H - 30) for (a = x0; a < x1; a += step) band(1, a);
      if (cam.x < 30) for (a = y0; a < y1; a += step) band(2, a);
      if (cam.x + MG.VW > W - 30) for (a = y0; a < y1; a += step) band(3, a);
      void self; void t; return n;
    },
    /* v83 접지 그림자 + 림: 번진 바깥 그림자 · 진한 안쪽 그림자 · 왼쪽 위(달빛)에서 비치는 얇은 하이라이트 */
    groundShadow: function (ctx, x, y, rx, ry, a) {
      this.shadowN = (this.shadowN || 0) + 1; a = a === undefined ? 0.3 : a;
      ctx.fillStyle = 'rgba(0, 0, 0, ' + (a * 0.45).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x + 1.5, y + 0.5, rx * 1.3, ry * 1.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0, 0, 0, ' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 246, 220, ' + (a * 0.5).toFixed(3) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 0.5, rx + 1, ry + 0.6, 0, Math.PI * 1.02, Math.PI * 1.62); ctx.stroke();
    },
    /* v83 다층 절벽(필드의 절벽 · 얼음 벼랑 · 흑요석 벼랑): 지층 · 들쭉날쭉한 윗면 · 바이옴 이끼/눈/재 · 돌출 바위턱 · 발치의 크기 다른 바위 군락과 수풀 */
    drawLayeredCliff: function (ctx, w, t, P) {
      var S = MG.Sprites, vert = w.h > w.w, len = vert ? w.h : w.w, thick = vert ? w.w : w.h, i, k, bio = fieldBiome(w.x + w.w / 2, w.y + w.h / 2);
      var cap = w.kind === 'icecliff' || bio === 'glacier' ? '#f4f8ff' : w.kind === 'obsid' || bio === 'volcano' ? '#4a4060' : bio === 'crystal' ? '#8a7ad8' : bio === 'ruins' ? '#8a3e34' : '#4f9a4c';
      // 발치 그림자
      var sg = ctx.createLinearGradient && ctx.createLinearGradient(0, w.y + w.h, 0, w.y + w.h + 10);
      if (sg && sg.addColorStop) { sg.addColorStop(0, 'rgba(0, 0, 0, 0.35)'); sg.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = sg; ctx.fillRect(w.x - 4, w.y + w.h, w.w + 8, 10); }
      ctx.fillStyle = P[2]; ctx.fillRect(w.x, w.y, w.w, w.h);
      // 울퉁불퉁한 실루엣: 줄마다 좌우로 0~6px 튀어나온 암괴(충돌 상자보다 넓게 그려 자연스러운 벼랑으로)
      var row = 5, k2, mid = vert ? w.x + w.w / 2 : w.y + w.h / 2;
      for (k = 0; k < len; k += row) {
        var e1 = Math.floor(hash(w.x + k, w.y * 3) * 11), e2 = Math.floor(hash(w.y + k, w.x * 5) * 11), sh = hash(k * 7, w.x + w.y);
        var c0 = sh < 0.3 ? P[2] : sh < 0.78 ? P[1] : P[0];
        ctx.fillStyle = c0;
        if (vert) ctx.fillRect(w.x - e1, w.y + k, w.w + e1 + e2, row); else ctx.fillRect(w.x + k, w.y - e1 * 0.6, row, w.h + e1 * 0.6 + e2 * 0.5);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'; if (vert) ctx.fillRect(w.x - e1, w.y + k, 2, row); else ctx.fillRect(w.x + k, w.y - e1 * 0.6, row, 1);   // 왼쪽 위 빛 받는 모서리
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'; if (vert) ctx.fillRect(w.x + w.w + e2 - 2, w.y + k, 2, row); else ctx.fillRect(w.x + k, w.y + w.h + e2 * 0.5 - 1, row, 1);
      }
      // 지층: 두께가 제각각인 띠(규칙적인 벽돌 줄이 아니라 기울어진 바위 결)
      for (k = 3; k < len; k += 6 + Math.floor(hash(k, w.x) * 8)) {
        var tilt = (hash(k, w.y) - 0.5) * 4;
        ctx.strokeStyle = hash(k + 1, w.x) < 0.5 ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.10)'; ctx.lineWidth = 1; ctx.beginPath();
        if (vert) { ctx.moveTo(w.x - 2, w.y + k); ctx.lineTo(w.x + w.w + 2, w.y + k + tilt); } else { ctx.moveTo(w.x + k, w.y - 2); ctx.lineTo(w.x + k + tilt, w.y + w.h + 2); }
        ctx.stroke();
      }
      void k2; void mid;
      // 윗면 테두리 + 바이옴 덮개(이끼/눈/재) — 덩어리 크기가 제각각
      for (k = 0; k < len; k += 5) { var hc = hash(w.x + k * 13, w.y + 5); if (hc < 0.4) continue; ctx.fillStyle = cap; ctx.globalAlpha = 0.6 + hc * 0.35; var e3 = Math.floor(hash(w.x + k, w.y * 3) * 7); if (vert) ctx.fillRect(w.x - e3 - 1, w.y + k, 3 + Math.floor(hc * 5), 2 + Math.floor(hc * 4)); else ctx.fillRect(w.x + k, w.y - 2, 3 + Math.floor(hc * 5), 2 + Math.floor(hc * 3)); ctx.globalAlpha = 1; }
      // 돌출 바위턱
      for (k = 24; k < len - 12; k += 34 + Math.floor(hash(w.x, w.y + k) * 18)) { ctx.fillStyle = P[0]; if (vert) { ctx.fillRect(w.x - 5, w.y + k, w.w + 10, 2); ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx.fillRect(w.x - 5, w.y + k + 2, w.w + 10, 2); ctx.fillStyle = cap; ctx.fillRect(w.x - 4 + Math.floor(hash(k, 1) * (w.w)), w.y + k - 1, 5, 1); } else { ctx.fillRect(w.x + k, w.y - 4, 2, w.h + 8); } }
      // 금(균열)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'; ctx.lineWidth = 1; for (k = 10; k < len; k += 29) { var cx2 = vert ? w.x + 4 + hash(k, 2) * (w.w - 8) : w.x + k, cy2 = vert ? w.y + k : w.y + 3 + hash(k, 3) * (w.h - 6); ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + 3, cy2 + 4); ctx.lineTo(cx2 + 1, cy2 + 8); ctx.stroke(); }
      if (w.kind === 'obsid') { ctx.fillStyle = 'rgba(255, 100, 40, ' + (0.35 + 0.25 * Math.sin(t * 2 + w.x)).toFixed(2) + ')'; for (i = 6; i < w.w - 4; i += 23) ctx.fillRect(w.x + i, w.y + 6 + (i % 3) * 5, 5, 1); }
      // 발치의 바위 군락 · 수풀(크기 · 좌우 뒤집기 · 간격이 모두 다르게)
      if (S && S.ready('world')) for (k = 8; k < len; k += 18 + Math.floor(hash(w.x + k, w.y) * 26)) {
        var hz = hash(w.x + k * 3, w.y + k), side = hz < 0.5 ? -1 : 1, sc = 0.55 + hash(k, w.x) * 0.6;
        var bx = vert ? w.x + w.w / 2 + side * (w.w / 2 + 3 + hz * 4) : w.x + k, by = vert ? w.y + k + 10 : w.y + w.h + 4 + hz * 3;
        if (hz > 0.82 && S.ready('forge')) S.draw(ctx, 'forge', bio === 'glacier' || bio === 'volcano' ? 'rock_broken' : 'bush_live', bx, by, side < 0, 0.7);
        else S.draw(ctx, 'world', 'rock' + (Math.floor(hz * 9) % 3), bx, by, side < 0, sc, bio === 'volcano' || w.kind === 'obsid' ? (Tint.get('world', 'basalt', 'brightness(0.45) saturate(0.4)') || undefined) : bio === 'glacier' ? (Tint.get('world', 'snowrock', 'brightness(1.3) saturate(0.3)') || undefined) : undefined);
      }
    },
    /* v83 동적 광원 목록(HD-2D): 화톳불 · 대장간 · 용암 · 던전 횃불 · 수정/얼음 반사광 · 불붙인 장치 · 사냥꾼의 검신 발광 · 각성한 보스 오라 · 화염진 · 파트너 */
    lightList: function (cam) {
      var L = [], i, m = 110, vis = function (x, y) { return x > cam.x - m && x < cam.x + MG.VW + m && y > cam.y - m && y < cam.y + MG.VH + m; };
      var add = function (x, y, r, rgb, a, kind) { if (vis(x, y)) L.push({ x: x, y: y, r: r, rgb: rgb, a: a, kind: kind }); };
      for (i = 0; i < this.bonfires.length; i++) if (this.bonfires[i].lit) add(this.bonfires[i].x, this.bonfires[i].y - 10, 80, '255, 160, 60', 0.34, 'fire');
      if (this.anvil) add(this.anvil.x + 12, this.anvil.y - 10, 46, '255, 160, 60', 0.3, 'fire');
      var LV = this.map.lava || []; for (i = 0; i < LV.length; i++) add((LV[i][0] + LV[i][2]) / 2, (LV[i][1] + LV[i][3]) / 2, 96, '255, 80, 30', 0.3, 'lava');
      if (this.map.kind === 'dungeon') { var th = THEME[this.map.theme], tl = th.light.match(/\d+, \d+, \d+/); for (i = 0; i < this.walls.length; i++) { var w = this.walls[i]; if (w.kind === 'dwall' && w.h <= 30) for (var tx = w.x + 40; tx < w.x + w.w - 10; tx += 80) add(tx, w.y + 14, 62, tl ? tl[0] : '255, 180, 90', 0.3, 'torch'); } }
      for (i = 0; i < this.decor.length; i++) { var d = this.decor[i]; if (d.kind === 'crystal' || d.kind === 'icecrystal') add(d.x, d.y - 8, 30, d.kind === 'crystal' ? '170, 140, 255' : '170, 230, 255', 0.22, 'crystal'); }
      for (i = 0; i < this.nodes.length; i++) { var nd = this.nodes[i]; if (!nd.taken && (nd.type === 'crystal' || nd.type === 'frost')) add(nd.x, nd.y - 8, 30, nd.type === 'crystal' ? '170, 140, 255' : '170, 230, 255', 0.24, 'crystal'); if (!nd.taken && nd.type === 'lava') add(nd.x, nd.y - 6, 30, '255, 110, 40', 0.24, 'lava'); }
      for (i = 0; i < (this.traps || []).length; i++) { var tp = this.traps[i]; if (tp.down) continue; add(tp.x, tp.y - 26, 40, tp.kind === 'crystal' ? '190, 160, 255' : tp.kind === 'ice' ? '190, 240, 255' : tp.kind === 'root' ? '160, 255, 140' : '255, 110, 50', 0.24, tp.kind === 'crystal' || tp.kind === 'ice' ? 'crystal' : 'lava'); }
      for (i = 0; i < (this.devices || []).length; i++) { var dv = this.devices[i]; if (dv.on) add(dv.x, dv.y - 14, dv.torch ? 64 : 44, dv.kind === 'switch' ? '138, 232, 248' : '255, 150, 60', 0.3, 'fire'); }
      var P = MG.Player, st = P && P.weaponStyle ? P.weaponStyle() : null;
      if (st && st.light && P.alive()) { var hx = parseInt(st.light.col.slice(1, 3), 16), hy = parseInt(st.light.col.slice(3, 5), 16), hz = parseInt(st.light.col.slice(5, 7), 16); add(P.x + P.fx * 8, P.y - 12, st.light.r + (P.attacking ? 10 : 0), hx + ', ' + hy + ', ' + hz, P.attacking ? 0.34 : 0.24, 'weapon'); }
      if (MG.Bosses) { var bh = MG.Bosses.here(); for (i = 0; i < bh.length; i++) { var bb = bh[i]; if (bb.alive && bb.phase2) { var ak = bb.auraKind(); add(bb.x, bb.y - 30, 90, ak === 'fire' ? '255, 110, 50' : ak === 'storm' ? '140, 210, 255' : ak === 'frost' ? '220, 250, 255' : '170, 120, 255', 0.3, 'aura'); } } }
      if (MG.Magic) for (i = 0; i < MG.Magic.list.length; i++) { var mg = MG.Magic.list[i]; if (mg.k === 'fire') add(mg.x, mg.y, 90, '255, 120, 40', 0.32, 'fire'); else if (mg.k === 'bolt' || mg.k === 'strike') add(mg.x, mg.y - 10, 60, '255, 240, 160', 0.3, 'spell'); }
      var pet = MG.Companion && MG.Companion.pet; if (pet) add(pet.x, pet.y - 8, 34, '138, 232, 248', 0.2, 'spirit');
      return L;
    },
    /* v83 HD-2D 빛 패스: 스프라이트까지 다 그린 뒤 'lighter'(가산)로 한 번 더 — 둘레의 바닥과 캐릭터를 실제로 물들인다 */
    drawLightsAfter: function (ctx, cam, t) {
      var L = this.lightList(cam), prev = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
      for (var j = 0; j < L.length; j++) { var l = L[j], fl = l.kind === 'fire' || l.kind === 'torch' ? 0.88 + 0.12 * Math.sin(t * 9 + j) * Math.sin(t * 5.3) : 0.94 + 0.06 * Math.sin(t * 2 + j), r = l.r * fl, g = ctx.createRadialGradient && ctx.createRadialGradient(l.x, l.y, 1, l.x, l.y, r); if (!g || !g.addColorStop) continue; g.addColorStop(0, 'rgba(' + l.rgb + ', ' + (l.a * 0.55).toFixed(3) + ')'); g.addColorStop(0.5, 'rgba(' + l.rgb + ', ' + (l.a * 0.18).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + l.rgb + ', 0)'); ctx.fillStyle = g; ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2); }
      ctx.globalCompositeOperation = prev || 'source-over'; this.lightsDrawn = L.length;
      return L.length;
    },
    crack: function (ctx, L, seed) {
      var n = 6; ctx.beginPath(); ctx.moveTo(L[0], L[1]);
      for (var k = 1; k <= n; k++) { var q = k / n, jx = k < n ? Math.sin(seed * 7 + k * 3.1) * 7 : 0, jy = k < n ? Math.cos(seed * 5 + k * 2.3) * 7 : 0; ctx.lineTo(L[0] + (L[2] - L[0]) * q + jx, L[1] + (L[3] - L[1]) * q + jy); }
      ctx.stroke();
    },
    drawDungeonBit: function (ctx, g, t) {
      var th = this.map.theme, k = +g.n.charAt(2), x = g.x, y = g.y;
      if (th === 'root') { ctx.fillStyle = k % 2 ? '#3a5a2a' : '#5a3a20'; ctx.fillRect(x, y, 6, 1); ctx.fillRect(x + 2, y + 1, 1, 2); if (k === 3) { ctx.fillStyle = '#8ad070'; ctx.fillRect(x + 1, y - 1, 1, 1); } }
      else if (th === 'crystal') { ctx.fillStyle = k % 2 ? '#c4a8ff' : '#8ae8f8'; ctx.fillRect(x, y - 3, 2, 3); ctx.fillStyle = '#efe4ff'; ctx.fillRect(x, y - 3, 1, 1); }
      else if (th === 'thorn') { ctx.fillStyle = k % 2 ? '#8a3e34' : '#5e2a2a'; ctx.fillRect(x, y, 4, 1); ctx.fillRect(x + 1, y - 1, 1, 1); }
      else if (th === 'ice') { ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'; ctx.fillRect(x, y, 5, 1); ctx.fillRect(x + 2, y - 1, 1, 3); }
      else if (th === 'storm') { var pu = 0.5 + 0.5 * Math.sin(t * 3 + x); ctx.fillStyle = 'rgba(255, 120, 40, ' + (0.4 + 0.4 * pu).toFixed(2) + ')'; ctx.fillRect(x, y, 5, 1); ctx.fillRect(x + 4, y + 1, 3, 1); }
      else { ctx.fillStyle = 'rgba(190, 150, 255, 0.5)'; ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 3, y + 2, 1, 1); }
    },
    drawWall: function (ctx, w, cam, t) {
      if (w.x > cam.x + MG.VW || w.x + w.w < cam.x || w.y > cam.y + MG.VH + 20 || w.y + w.h < cam.y - 20) return;
      var S = MG.Sprites, i;
      if (w.kind === 'hedge') {
        ctx.fillStyle = '#1f5a2c'; ctx.fillRect(w.x, w.y, w.w, w.h);
        if (S && S.ready('forge')) for (var hx = w.x + 6; hx < w.x + w.w; hx += 14) for (var hy = w.y + w.h; hy > w.y; hy -= 14) S.draw(ctx, 'forge', 'bush_live', hx, hy + 4, false, 0.8);
        return;
      }
      var th = this.map.kind === 'dungeon' ? THEME[this.map.theme] : null;
      var P = { ruin: ['#7a4a3a', '#5a2e26', '#3a1a16'], cliff: ['#8a94a2', '#4a525e', '#30363f'], obsid: ['#4a4060', '#1a1622', '#08060c'], icecliff: ['#e4f4ff', '#8ab8d8', '#4a7090'] }[w.kind] || (th ? [th.top, th.face, th.dark] : ['#8a94a2', '#4a525e', '#30363f']);
      if (w.kind === 'cliff' || w.kind === 'icecliff' || w.kind === 'obsid') { this.drawLayeredCliff(ctx, w, t, P); return; }   // v83 다층 절벽
      ctx.fillStyle = P[1]; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = P[0]; ctx.fillRect(w.x, w.y, w.w, 4);
      ctx.fillStyle = P[2]; ctx.fillRect(w.x, w.y + w.h - 3, w.w, 3);
      if (w.kind === 'ruin' || w.kind === 'dwall') { ctx.fillStyle = 'rgba(10, 6, 8, 0.5)'; for (var by = w.y + 8; by < w.y + w.h - 2; by += 8) for (var bx = w.x + ((by / 8) % 2) * 8; bx < w.x + w.w; bx += 16) ctx.fillRect(bx, by, 1, 8); for (by = w.y + 8; by < w.y + w.h; by += 8) ctx.fillRect(w.x, by, w.w, 1); }
      else if (w.kind === 'obsid') { ctx.fillStyle = 'rgba(255, 100, 40, ' + (0.35 + 0.25 * Math.sin(t * 2 + w.x)).toFixed(2) + ')'; for (i = 6; i < w.w - 4; i += 23) ctx.fillRect(w.x + i, w.y + 6 + (i % 3) * 5, 5, 1); ctx.fillStyle = 'rgba(160, 140, 220, 0.4)'; for (i = 3; i < w.w; i += 17) ctx.fillRect(w.x + i, w.y + 1, 2, 1); }
      else if (w.kind === 'icecliff') { ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; for (i = 0; i < w.h; i += 9) ctx.fillRect(w.x + (i * 7) % Math.max(1, w.w - 4), w.y + i, 3, 1); }
      else if (w.kind === 'dpillar') { ctx.fillStyle = th ? th.top : '#888'; ctx.fillRect(w.x + 2, w.y - 14, w.w - 4, 16); ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx.fillRect(w.x + w.w - 6, w.y - 14, 4, 16); }
      else { ctx.fillStyle = 'rgba(20, 24, 30, 0.35)'; for (i = 0; i < w.h; i += 11) ctx.fillRect(w.x + (i * 7) % Math.max(1, w.w - 4), w.y + i, 4, 2); }
      if (w.kind === 'ruin' && S && S.ready('world')) for (var px = w.x + 30; px < w.x + w.w; px += 96) S.draw(ctx, 'world', 'pillar', px, w.y + w.h - 2);
      if (w.kind === 'dwall' && th && w.h <= 30) for (var tx = w.x + 40; tx < w.x + w.w - 10; tx += 80) {   // 벽 횃불
        var fl = 0.7 + 0.3 * Math.sin(t * 11 + tx);
        ctx.fillStyle = '#3a2418'; ctx.fillRect(tx - 1, w.y + 8, 3, 10);
        ctx.fillStyle = this.map.theme === 'ice' ? 'rgba(160, 240, 255, ' + fl.toFixed(2) + ')' : this.map.theme === 'crystal' || this.map.theme === 'abyss' ? 'rgba(196, 168, 255, ' + fl.toFixed(2) + ')' : 'rgba(255, 180, 70, ' + fl.toFixed(2) + ')';
        ctx.fillRect(tx - 2, w.y + 3, 5, 5); ctx.fillStyle = '#fff6d0'; ctx.fillRect(tx, w.y + 5, 1, 2);
      }
    },
    /* 던전 입구/출구/투기장 포털(바닥에 그린다) */
    drawExits: function (ctx, cam, t) {
      var S = MG.Sprites, rb = S && S.ready('rb'), i, vis = function (o) { return o.x > cam.x - 40 && o.x < cam.x + MG.VW + 40 && o.y > cam.y - 40 && o.y < cam.y + MG.VH + 40; };
      for (i = 0; i < this.stairs.length; i++) {
        var s = this.stairs[i]; if (!vis(s)) continue;
        if (s.id === 'd6') { var kg = ctx.createRadialGradient && ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 34); if (kg && kg.addColorStop) { kg.addColorStop(0, 'rgba(150, 90, 255, ' + (0.3 + 0.15 * Math.sin(t * 2)).toFixed(2) + ')'); kg.addColorStop(1, 'rgba(150, 90, 255, 0)'); ctx.fillStyle = kg; ctx.fillRect(s.x - 34, s.y - 34, 68, 68); } }
        if (rb) S.draw(ctx, 'rb', 'stairs_down', s.x, s.y + 10); else { ctx.fillStyle = '#000'; ctx.fillRect(s.x - 14, s.y - 8, 28, 18); }
        if (s.need && !MG.S[s.need]) { ctx.strokeStyle = 'rgba(176, 144, 240, 0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x - 14, s.y - 6); ctx.lineTo(s.x + 14, s.y + 8); ctx.moveTo(s.x + 14, s.y - 6); ctx.lineTo(s.x - 14, s.y + 8); ctx.stroke(); ctx.fillStyle = '#b090f0'; ctx.fillRect(s.x - 3, s.y - 2, 6, 6); }   // 봉인 사슬
      }
      var KG = this.kingGate;
      if (KG && vis(KG)) {   // v84 ⚔️ 왕의 무덤: 왕관 부조의 석조 아치 — 봉인 중에는 보랏빛 사슬, 열리면 문 안쪽에서 흑염이 일렁인다
        var kq = 0.5 + 0.5 * Math.sin(t * 2.2), kg2 = ctx.createRadialGradient && ctx.createRadialGradient(KG.x, KG.y - 22, 4, KG.x, KG.y - 22, 54);
        if (kg2 && kg2.addColorStop) { kg2.addColorStop(0, KG.open ? 'rgba(150, 90, 255, ' + (0.3 + 0.15 * kq).toFixed(2) + ')' : 'rgba(90, 70, 120, 0.18)'); kg2.addColorStop(1, 'rgba(90, 60, 160, 0)'); ctx.fillStyle = kg2; ctx.fillRect(KG.x - 54, KG.y - 76, 108, 108); }
        if (rb && S.item('rb', 'tomb_gate')) S.draw(ctx, 'rb', KG.open ? 'tomb_gate_open' : 'tomb_gate', KG.x, KG.y + 2); else { ctx.fillStyle = '#1a1622'; ctx.fillRect(KG.x - 26, KG.y - 48, 52, 50); }
        if (KG.open && MG.FX && Math.random() < 0.3) MG.FX.burst(KG.x + (Math.random() - 0.5) * 18, KG.y - 10 - Math.random() * 20, 1, ['#b090f0', '#1a0a2a', '#ff6a3a'], 18, { g: -30 });
      }
      for (i = 0; i < this.exits.length; i++) {
        var e = this.exits[i]; if (!vis(e)) continue; var open = this.exitOpen(e);
        if (e.kind === 'up') { if (rb) S.draw(ctx, 'rb', 'stairs_up', e.x, e.y + 12); }
        else if (e.kind === 'door') { if (open) { var g = 0.5 + 0.5 * Math.sin(t * 4); ctx.fillStyle = 'rgba(255, 216, 102, ' + (0.18 + 0.15 * g).toFixed(2) + ')'; ctx.fillRect(e.x - 30, 0, 60, 34); } }
        else if (e.kind === 'altar' && open) {
          var pu = 0.5 + 0.5 * Math.sin(t * 3);
          var rg = ctx.createRadialGradient && ctx.createRadialGradient(e.x, e.y - 8, 2, e.x, e.y - 8, 34);
          if (rg && rg.addColorStop) { rg.addColorStop(0, 'rgba(77, 238, 234, ' + (0.35 + 0.2 * pu).toFixed(2) + ')'); rg.addColorStop(1, 'rgba(77, 238, 234, 0)'); ctx.fillStyle = rg; ctx.fillRect(e.x - 34, e.y - 42, 68, 68); }
          if (rb) S.draw(ctx, 'rb', 'altar', e.x, e.y + 6);
        }
      }
      var A = this.abyssGate;
      if (A && A.open && vis(A)) {
        var q = 0.5 + 0.5 * Math.sin(t * 2.6);
        ctx.save(); ctx.translate(A.x, A.y - 14); ctx.rotate(t * 0.8);
        for (var k = 0; k < 3; k++) { ctx.strokeStyle = k === 1 ? 'rgba(238, 246, 255, 0.8)' : 'rgba(150, 90, 255, ' + (0.5 + 0.3 * q).toFixed(2) + ')'; ctx.lineWidth = k === 1 ? 1 : 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 12 + k * 3, 16 + k * 3, 0, k, k + 4.6); ctx.stroke(); }
        ctx.restore();
        if (rb) S.draw(ctx, 'rb', 'abyss_gate', A.x, A.y + 4);
      }
    },
    /* y 정렬 대상(장식 · 물체)을 목록에 넣는다 */
    collect: function (list, cam) {
      var m = 70, i;
      var vis = function (x, y) { return x > cam.x - m && x < cam.x + MG.VW + m && y > cam.y - 20 && y < cam.y + MG.VH + m; };
      for (i = 0; i < this.decor.length; i++) { var d = this.decor[i]; if (vis(d.x, d.y)) list.push({ y: d.y, o: d, f: drawDecor }); }
      for (i = 0; i < this.nodes.length; i++) if (vis(this.nodes[i].x, this.nodes[i].y)) list.push({ y: this.nodes[i].y, o: this.nodes[i], f: drawNode });
      for (i = 0; i < this.bonfires.length; i++) if (vis(this.bonfires[i].x, this.bonfires[i].y)) list.push({ y: this.bonfires[i].y, o: this.bonfires[i], f: drawBonfire });
      for (i = 0; i < this.chests.length; i++) if (vis(this.chests[i].x, this.chests[i].y)) list.push({ y: this.chests[i].y, o: this.chests[i], f: drawChest });
      for (i = 0; i < this.steles.length; i++) if (vis(this.steles[i].x, this.steles[i].y)) list.push({ y: this.steles[i].y, o: this.steles[i], f: drawStele });
      for (i = 0; i < this.barriers.length; i++) { var b = this.barriers[i]; if (vis(b.x + b.w / 2, b.y + b.h)) list.push({ y: b.y + b.h, o: b, f: drawBarrier }); }
      if (this.anvil && vis(this.anvil.x, this.anvil.y)) list.push({ y: this.anvil.y, o: this.anvil, f: drawAnvil });
      if (MG.NPC) MG.NPC.collect(list, vis);
      if (MG.Gimmick) MG.Gimmick.collect(list, vis);
    },
    /* 화톳불 · 대장간 · 던전 횃불 · 용암 빛(땅 위에 더한다) */
    drawLights: function (ctx, cam, t) {
      var lights = [], i;
      if (this.lightList) { var LL = this.lightList(cam); for (i = 0; i < LL.length; i++) if (LL[i].kind !== 'fire' && LL[i].kind !== 'lava' && LL[i].kind !== 'torch') lights.push([LL[i].x, LL[i].y + 6, LL[i].r * 0.8, 'rgba(' + LL[i].rgb + ', ']); }   // v83 수정 · 검신 · 오라도 바닥을 비춘다
      for (i = 0; i < this.bonfires.length; i++) if (this.bonfires[i].lit) lights.push([this.bonfires[i].x, this.bonfires[i].y - 10, 70, 'rgba(255, 170, 70, ']);
      if (this.anvil) lights.push([this.anvil.x, this.anvil.y - 10, 40, 'rgba(255, 170, 70, ']);
      var LV = this.map.lava || []; for (i = 0; i < LV.length; i++) lights.push([(LV[i][0] + LV[i][2]) / 2, (LV[i][1] + LV[i][3]) / 2, 90, 'rgba(255, 80, 30, ']);
      if (this.map.kind === 'dungeon') { var th = THEME[this.map.theme]; for (i = 0; i < this.walls.length; i++) { var w = this.walls[i]; if (w.kind === 'dwall' && w.h <= 30) for (var tx = w.x + 40; tx < w.x + w.w - 10; tx += 80) lights.push([tx, w.y + 14, 60, th.light.replace(/[\d.]+\)$/, '')]); } }
      for (var j = 0; j < lights.length; j++) {
        var L = lights[j]; if (L[0] < cam.x - 100 || L[0] > cam.x + MG.VW + 100 || L[1] < cam.y - 100 || L[1] > cam.y + MG.VH + 100) continue;
        var fl = 0.85 + 0.15 * Math.sin(t * 9 + j) * Math.sin(t * 5.3);
        var g = ctx.createRadialGradient && ctx.createRadialGradient(L[0], L[1], 2, L[0], L[1], L[2] * fl);
        if (g && g.addColorStop) { g.addColorStop(0, L[3] + '0.32)'); g.addColorStop(1, L[3] + '0)'); ctx.fillStyle = g; ctx.fillRect(L[0] - L[2], L[1] - L[2], L[2] * 2, L[2] * 2); }
      }
    }
  };

  /* ---------------------------------------------------------------- 물체별 그리기(ctx 는 월드 좌표) */
  function drawDecor(ctx, d) {
    var S = MG.Sprites; if (!S || !S.ready('world')) { ctx.fillStyle = '#2f7f3c'; ctx.fillRect(d.x - 6, d.y - 14, 12, 14); return; }
    var b = fieldBiome(d.x, d.y), W0 = MG.World;
    if (d.edge) {   // v83 경계 장식: 위치 흔들림 · 크기 · 덧붙는 바위/수풀 — 일렬로 찍힌 느낌을 없앤다
      var h1 = hash(d.x, d.y), h2 = hash(d.y, d.x), ox = Math.round((h1 - 0.5) * 10), oy = Math.round((h2 - 0.5) * 8);
      ctx.save(); ctx.translate(d.x + ox, d.y + oy); var es = 0.85 + h1 * 0.45; ctx.scale(es, es); ctx.translate(-d.x, -d.y);
      W0.groundShadow(ctx, d.x, d.y + 1, 10, 3.2, 0.26); drawDecorBody(ctx, d, b, S);
      ctx.restore();
      if (h2 > 0.55) S.draw(ctx, 'world', 'rock' + (Math.floor(h2 * 7) % 3), d.x + ox + (h1 < 0.5 ? -10 : 10), d.y + oy + 6, h1 < 0.5, 0.55 + h2 * 0.4, b === 'volcano' ? (Tint.get('world', 'basalt', 'brightness(0.45) saturate(0.4)') || undefined) : b === 'glacier' ? (Tint.get('world', 'snowrock', 'brightness(1.3) saturate(0.3)') || undefined) : undefined);
      else if (h2 < 0.25 && S.ready('forge') && b !== 'volcano' && b !== 'glacier') S.draw(ctx, 'forge', 'bush_live', d.x + ox + 8, d.y + oy + 5, h1 > 0.5, 0.75);
      return;
    }
    W0.groundShadow(ctx, d.x, d.y + 1, d.kind === 'rock' || d.kind === 'obsrock' ? 11 : d.kind === 'tree' || d.kind === 'deadtree' ? 10 : 7, 3.2, d.kind === 'crystal' || d.kind === 'icecrystal' ? 0.2 : 0.3);   // v83 접지 그림자 + 림
    drawDecorBody(ctx, d, b, S);
  }
  function hash(a, b) { var h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); }
  function drawDecorBody(ctx, d, b, S) {
    if (d.kind === 'tree') {
      var nm = ['tree_l0', 'tree_l1', 'tree_m0', 'tree_m1', 'tree_s0', 'tree_s1'][d.v];
      var src = b === 'ruins' ? Tint.get('world', 'autumn', 'hue-rotate(-75deg) saturate(1.25) brightness(0.92)') : b === 'crystal' ? Tint.get('world', 'frost', 'hue-rotate(115deg) saturate(0.9) brightness(1.05)') : b === 'glacier' ? Tint.get('world', 'snowy', 'hue-rotate(80deg) saturate(0.3) brightness(1.55)') : null;
      S.draw(ctx, 'world', nm, d.x, d.y, d.v % 2 === 1, 1, src || undefined);
      if (b === 'glacier' && S.ready('rb')) S.draw(ctx, 'rb', 'snowcap', d.x + (d.v % 2 ? 1 : -1), d.y - (d.v < 2 ? 30 : d.v < 4 ? 24 : 18));
    } else if (d.kind === 'crystal') S.draw(ctx, 'world', d.v % 2 ? 'crystal_on' : 'crystal_off', d.x, d.y, d.v > 2);
    else if (d.kind === 'icecrystal') S.draw(ctx, 'world', d.v % 2 ? 'crystal_on' : 'crystal_off', d.x, d.y, d.v > 2, 1, Tint.get('world', 'icecry', 'saturate(0.2) brightness(1.75)') || undefined);
    else if (d.kind === 'pillar') S.draw(ctx, 'world', 'pillar', d.x, d.y);
    else if (d.kind === 'obsrock') { if (S.ready('rb')) S.draw(ctx, 'rb', 'obsrock' + (d.v % 2), d.x, d.y); }
    else if (d.kind === 'deadtree') { if (S.ready('rb')) S.draw(ctx, 'rb', 'deadtree', d.x, d.y, d.v % 2 === 1); }
    else S.draw(ctx, 'world', 'rock' + (d.v % 3), d.x, d.y, false, 1, b === 'volcano' ? (Tint.get('world', 'basalt', 'brightness(0.45) saturate(0.4)') || undefined) : b === 'glacier' ? (Tint.get('world', 'snowrock', 'brightness(1.3) saturate(0.3)') || undefined) : undefined);
  }
  function drawNode(ctx, n, t) {
    var S = MG.Sprites, sh = n.shakeT > 0 ? Math.round(Math.sin(n.shakeT * 60) * 1.5) : 0;
    if (!S || !S.ready('forge', 'rb')) { ctx.fillStyle = n.taken ? '#555' : '#8ad070'; ctx.fillRect(n.x - 6, n.y - 10, 12, 10); return; }
    MG.World.groundShadow(ctx, n.x, n.y + 1, n.type === 'herb' ? 6 : 9, 2.8, 0.28);
    if (n.type === 'tree') S.draw(ctx, 'forge', n.taken ? 'stump' : 'tree_live', n.x + sh, n.y);
    else if (n.type === 'ore') S.draw(ctx, 'forge', n.taken ? 'rock_broken' : 'rock_live', n.x + sh, n.y);
    else if (n.type === 'herb') S.draw(ctx, 'forge', n.taken ? 'bush_cut' : 'bush_live', n.x + sh, n.y);
    else if (n.type === 'crystal') S.draw(ctx, 'rb', n.taken ? 'vein_spent' : 'vein_crystal', n.x + sh, n.y);
    else if (n.type === 'frost') S.draw(ctx, 'rb', n.taken ? 'vein_spent' : 'vein_frost', n.x + sh, n.y);
    else if (n.type === 'lava') { S.draw(ctx, 'rb', n.taken ? 'vein_spent' : 'vein_lava', n.x + sh, n.y); if (!n.taken && Math.random() < 0.05 && MG.FX) MG.FX.ember(n.x, n.y - 10); }
    else if (n.type === 'gold') { S.draw(ctx, 'rb', n.taken ? 'vein_spent' : 'vein_gold', n.x + sh, n.y); if (!n.taken && Math.floor(t * 3 + n.x) % 4 === 0) { ctx.fillStyle = '#fff6d0'; ctx.fillRect(n.x - 4 + (Math.floor(t * 7) % 9), n.y - 12, 1, 1); } }
  }
  function drawBonfire(ctx, b, t) {
    var S = MG.Sprites;
    if (!S || !S.ready('rb')) { ctx.fillStyle = b.lit ? '#ff9a3c' : '#555'; ctx.fillRect(b.x - 6, b.y - 12, 12, 12); return; }
    MG.World.groundShadow(ctx, b.x, b.y + 3, 13, 4, 0.3);
    S.draw(ctx, 'rb', b.lit ? 'bonfire_' + (Math.floor(t * 8 + b.x) % 4) : 'bonfire_out', b.x, b.y + 4, false, 0.8);
  }
  function drawChest(ctx, c) {
    var S = MG.Sprites; if (!S || !S.ready('rb')) { ctx.fillStyle = '#965e30'; ctx.fillRect(c.x - 9, c.y - 12, 18, 12); return; }
    if (!c.open && !MG.World.chestLocked(c)) { var g = 0.5 + 0.5 * Math.sin((MG.Game ? MG.Game.time : 0) * 3); ctx.fillStyle = (c.reward && c.reward.seed ? 'rgba(255, 216, 102, ' : 'rgba(255, 230, 140, ') + (0.15 + 0.15 * g).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(c.x, c.y - 6, c.reward && c.reward.seed ? 18 : 14, 0, Math.PI * 2); ctx.fill(); }
    var locked = MG.World.chestLocked(c);
    if (locked && !c.open) { S.draw(ctx, 'rb', S.item('rb', 'chest_sealed') ? 'chest_sealed' : 'chest', c.x, c.y); var pz = 0.5 + 0.5 * Math.sin((MG.Game ? MG.Game.time : 0) * 4); ctx.fillStyle = 'rgba(176, 144, 240, ' + (0.25 + 0.3 * pz).toFixed(2) + ')'; ctx.fillRect(c.x - 1, c.y - 9, 3, 3); return; }   // v82: 봉인된 상자(사슬 + 보랏빛 자물쇠)
    S.draw(ctx, 'rb', c.open ? 'chest_open' : 'chest', c.x, c.y);
  }
  function drawStele(ctx, s, t) {
    var S = MG.Sprites, shrine = s.kind === 'shrine'; if (!S || !S.ready('rb')) { ctx.fillStyle = '#6c7684'; ctx.fillRect(s.x - 8, s.y - 30, 16, 30); return; }
    if (!s.used) { var g = ctx.createRadialGradient && ctx.createRadialGradient(s.x, s.y - 18, 2, s.x, s.y - 18, 30); if (g && g.addColorStop) { g.addColorStop(0, (shrine ? 'rgba(255, 216, 102, ' : 'rgba(120, 230, 255, ') + (0.25 + 0.12 * Math.sin(t * 3)).toFixed(2) + ')'); g.addColorStop(1, shrine ? 'rgba(255, 216, 102, 0)' : 'rgba(120, 230, 255, 0)'); ctx.fillStyle = g; ctx.fillRect(s.x - 30, s.y - 48, 60, 60); } }
    MG.World.groundShadow(ctx, s.x, s.y + 1, 11, 3.4, 0.3);
    S.draw(ctx, 'rb', shrine ? (s.used ? 'shrine_used' : 'shrine') : (s.used ? 'stele_used' : 'stele'), s.x, s.y);
  }
  function drawBarrier(ctx, b, t) {
    var S = MG.Sprites, hd = S && S.ready('rb'), vertical = b.h > b.w, n, i, jit = b.hitT > 0 ? Math.round(Math.sin(b.hitT * 80) * 2) : 0;
    if (b.kind === 'rock') {
      if (b.broken) { if (hd) S.draw(ctx, 'rb', 'rubble', b.x + b.w / 2, b.y + b.h); return; }
      var st = b.hp >= b.maxHp ? 0 : (b.hp >= 2 ? 1 : 2);
      n = Math.max(1, Math.round((vertical ? b.h : b.w) / 34));
      for (i = 0; i < n; i++) { var px = vertical ? b.x + b.w / 2 : b.x + (i + 0.5) * b.w / n, py = vertical ? b.y + (i + 1) * b.h / n + 2 : b.y + b.h + 2; if (hd) S.draw(ctx, 'rb', 'boulder_' + st, px + jit, py, i % 2 === 1, vertical ? 0.95 : 0.85); else { ctx.fillStyle = '#6c7684'; ctx.fillRect(px - 14, py - 26, 28, 26); } }
      return;
    }
    if (b.kind === 'oldtree') {
      if (hd) S.draw(ctx, 'rb', b.broken ? 'oldtree_fallen' : 'oldtree', b.x + b.w / 2 + jit, b.y + b.h + 2);
      else { ctx.fillStyle = b.broken ? '#4a2a14' : '#2f7f3c'; ctx.fillRect(b.x, b.y - (b.broken ? 0 : 40), b.w, b.h + (b.broken ? 0 : 40)); }
      return;
    }
    if (b.kind === 'ice') {
      if (b.broken) { if (hd) { n = Math.max(1, Math.round((vertical ? b.h : b.w) / 34)); for (i = 0; i < n; i++) S.draw(ctx, 'rb', 'ice_puddle', vertical ? b.x + b.w / 2 : b.x + (i + 0.5) * b.w / n, vertical ? b.y + (i + 1) * b.h / n : b.y + b.h); } return; }
      var melt = b.burnT > 0 ? U.clamp(b.burnT / 1.4, 0, 1) : 0;
      n = Math.max(1, Math.round((vertical ? b.h : b.w) / 32));
      for (i = 0; i < n; i++) { var ix = vertical ? b.x + b.w / 2 : b.x + (i + 0.5) * b.w / n, iy = vertical ? b.y + (i + 1) * b.h / n + 2 : b.y + b.h + 2; if (hd) S.draw(ctx, 'rb', melt > 0.5 ? 'icewall_1' : 'icewall_0', ix, iy, i % 2 === 1, 1 - melt * 0.35); else { ctx.fillStyle = '#bfe8ff'; ctx.fillRect(ix - 14, iy - 30, 28, 30); } }
      if (b.burnT > 0 && S && S.ready('forge')) for (i = 0; i < 3; i++) S.draw(ctx, 'forge', 'fire_' + ((Math.floor(t * 12) + i) % 4), b.x + b.w / 2 + (i - 1) * 9, b.y + b.h, false, 0.7);
      return;
    }
    if (b.kind === 'obsidian') {
      if (b.broken) { if (hd) S.draw(ctx, 'rb', 'obsidian_shards', b.x + b.w / 2, b.y + b.h + 2); return; }
      var fr = b.freezeT > 0;
      n = Math.max(1, Math.round((vertical ? b.h : b.w) / 32));
      for (i = 0; i < n; i++) { var ox = vertical ? b.x + b.w / 2 : b.x + (i + 0.5) * b.w / n, oy = vertical ? b.y + (i + 1) * b.h / n + 2 : b.y + b.h + 2; if (hd) S.draw(ctx, 'rb', fr ? 'obsidian_ice' : 'obsidian_0', ox + (fr ? Math.round(Math.sin(t * 60)) : 0), oy, i % 2 === 1); else { ctx.fillStyle = '#1a1622'; ctx.fillRect(ox - 15, oy - 30, 30, 30); } }
      return;
    }
    if (b.kind === 'seal') {
      if (hd) S.draw(ctx, 'rb', b.broken ? 'seal_open' : 'seal', b.x + b.w / 2, b.y + b.h + 2);
      if (!b.broken) { var pz = 0.5 + 0.5 * Math.sin(t * 4); ctx.fillStyle = 'rgba(138, 232, 248, ' + (0.15 + 0.2 * pz).toFixed(2) + ')'; ctx.fillRect(b.x + 6, b.y + 4, b.w - 12, b.h - 6); }
      return;
    }
    if (b.broken) { if (hd) { n = Math.max(1, Math.round((vertical ? b.h : b.w) / 46)); for (i = 0; i < n; i++) S.draw(ctx, 'rb', 'thorn_ash', b.x + (i + 0.5) * b.w / n, b.y + b.h); } return; }
    n = Math.max(1, Math.round(b.w / 46));
    for (i = 0; i < n; i++) { var tx = b.x + (i + 0.5) * b.w / n; if (hd) S.draw(ctx, 'rb', 'thornwall', tx, b.y + b.h + 2, i % 2 === 1, b.h < 26 ? 0.75 : 1); else { ctx.fillStyle = '#5e2a2a'; ctx.fillRect(tx - 20, b.y - 4, 40, b.h + 4); } }
    if (b.burnT > 0 && S && S.ready('forge')) for (i = 0; i < 4; i++) S.draw(ctx, 'forge', 'fire_' + ((Math.floor(t * 12) + i) % 4), b.x + (i + 0.5) * b.w / 4, b.y + b.h, false, 0.9 + 0.3 * Math.sin(t * 9 + i));
  }
  function drawAnvil(ctx, a, t) {
    var S = MG.Sprites;
    if (!S || !S.ready('forge', 'mobs')) { ctx.fillStyle = '#6a768c'; ctx.fillRect(a.x - 14, a.y - 10, 28, 10); return; }
    S.draw(ctx, 'forge', 'furnace', a.x + 14, a.y - 2, false, 0.5);
    S.draw(ctx, 'forge', 'fire_' + (Math.floor(t * 10) % 4), a.x + 14, a.y - 6, false, 0.45);
    S.draw(ctx, 'mobs', 'anvil', a.x - 8, a.y + 1);
    S.draw(ctx, 'forge', 'smith_hammer', a.x - 10, a.y - 13);
  }

  MG.World = World;
})(window);
