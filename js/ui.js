/* ==========================================================================
   ui.js — DOM 층(v81: 화면 비율에 맞춘 W×H 논리 상자를 뷰포트 전체에 균일 확대 — 레터박스 없음, HUD/버튼은 실제 화면 모서리에): HUD(HP/MP/SP · 무기/마법 · 골드/에스트) · 보스 슬림 바 · 한 줄 리본 ·
           오른쪽 아래 아크 버튼 4개(⚔️ 공격/상호작용 · 🪽 구르기 · ✨ 마법 · 🧪 에스트) · 타이틀 · 대장간(무기 계보 + 작업대 글/버튼) ·
           📜 장비·도감 창(무기 12 · 갑주 5 · 마법 6 · 탐험 수집품) · 고대 비석의 3택 1 각인 카드 · 🔥 화톳불 전송(5곳)
   v80 원칙: 조작 버튼/게이지/글 상자를 새로 만들지 않는다 — 새 내용은 대장간/도감 안의 스크롤 카드로만.
   v83: 📜 장비 창 안에서만 — 유물 장착 · 파트너 전환 · 미궁 기록/축복 · 보스 BGM 켜고 끄기 / 도감에 고대 병기 · 유물 6종 · 숨겨진 강자
   v82: ✨ 버튼 안의 재사용 대기시간 부채꼴 + 남은 초 · 방랑 NPC 대화 바(화면 아래 가운데 · 버튼 묶음과 겹치면 옆/위로 비켜 선다) · [💬 대화] / [🔥 가호 받기] 아이콘
   글자는 Galmuri11(번들 내장). 아이콘은 Aseprite 시트를 CSS 배경으로 잘라 쓴다(.pxi 16 · .pxb 32 · .rbi/.rbb 리부트 시트 · .wpi 무기).
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data, esc = U.esc;
  var doc = global.document;
  function $(id) { return doc.getElementById(id); }
  function set(id, html) { var el = $(id); if (el && el.innerHTML !== html) el.innerHTML = html; return el; }
  function mat(k, n, have) { var m = D.MATS[k]; return '<span class="mt' + (have !== undefined ? (have >= n ? ' is-ok' : ' is-no') : '') + '" title="' + esc(m.name) + '"><i class="pxi" data-ic="' + m.ic + '"></i><b>' + (have !== undefined ? have + '/' : '') + n + '</b></span>'; }

  var SPELL_SRC = { wave: '처음부터 알고 있다', fire: '🌲 신록의 숲 — 보물상자', bolt: '💎 수정 고원 — 고대 비석', frost: '❄️ [얼음 궁전] 전실의 고대 비석', storm: '💎 [결정 동굴] 전실의 고대 비석', abyss: '🌋 칠흑의 용화산 북동쪽 끝 — 숨겨진 고대 비석' };

  var UI = MG.UI = {
    sx: 1, modal: null, _hud: {}, _rib: null,
    init: function () {
      var self = this;
      this.installIcons();
      this.initTitle();
      var on = function (id, fn) { var el = $(id); if (el) el.addEventListener('click', function (e) { if (e && e.preventDefault) e.preventDefault(); fn(e); }); };
      on('btn-status', function () { self.toggleStatus(); });
      var cu = $('cine-ui'); if (cu) cu.addEventListener('pointerdown', function (e) { if (e && e.preventDefault) e.preventDefault(); if (MG.Story) MG.Story.skip(); });   // v86 컷씬: 화면 어디든 누르면 스킵
      on('hud-spell', function () { if (MG.Game) MG.Game.cycleSpell(); });
      on('st-close', function () { self.closeModal(); });
      on('fg-close', function () { MG.Forge.close(); });
      var st = $('status-ui'); if (st) st.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target.closest('[data-tab],[data-equip],[data-armor],[data-spell],[data-relic],[data-comp],[data-bgm]') : null; if (!t) return;
        var d = t.dataset || {};
        if (d.tab) self.renderStatus(d.tab);
        else if (d.equip) { MG.Forge.equip(d.equip); self.renderStatus('gear'); }
        else if (d.armor) { MG.Forge.equip(d.armor); self.renderStatus('gear'); }
        else if (d.spell !== undefined) { MG.S.spellSel = +d.spell; self.renderStatus('gear'); self.syncHud(true); }
        else if (d.relic !== undefined) { MG.Game.equipRelic(d.relic === 'none' ? null : d.relic); self.renderStatus('gear'); }   // v83 유물 장착/해제
        else if (d.comp) { MG.Companion.setKind(d.comp); self.renderStatus('gear'); }                                          // v83 파트너 전환
        else if (d.bgm !== undefined) { MG.SFX.bgmToggle(); self.renderStatus('gear'); }                                        // v83 보스 BGM
      });
      var fu = $('forge-ui'); if (fu) fu.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target.closest('[data-wid],[data-fact]') : null; if (!t) return;
        var d = t.dataset || {};
        if (d.wid) MG.Forge.select(d.wid);
        else if (d.fact === 'make') MG.Forge.startMake();
        else if (d.fact === 'up') MG.Forge.startUpgrade();
        else if (d.fact === 'equip') MG.Forge.equip(MG.Forge.sel);
        else if (d.fact === 'quench') MG.Forge.quench();
      });
      // 작업대 직접 누르기(풀무 꾹 · 모루 점 · 물통) + 아래 큰 풀무 버튼
      var hit = $('fg-hit'), hold = $('fg-hold');
      var local = function (e) { var r = hit.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 360, y: 356 + (e.clientY - r.top) / r.height * 206 }; };
      if (hit) { hit.addEventListener('pointerdown', function (e) { if (e.preventDefault) e.preventDefault(); try { hit.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } var p = local(e); MG.Forge.press(p.x, p.y); }); hit.addEventListener('pointerup', function () { MG.Forge.release(); }); hit.addEventListener('pointercancel', function () { MG.Forge.release(); }); }
      var fa = $('fg-actions'); if (fa) {
        fa.addEventListener('pointerdown', function (e) { var t = e.target && e.target.closest ? e.target.closest('[data-hold]') : null; if (!t) return; if (e.preventDefault) e.preventDefault(); try { t.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } MG.Forge.press(180, 450); });
        var rel = function () { if (MG.Forge.craft && MG.Forge.craft.holding) MG.Forge.release(); };
        fa.addEventListener('pointerup', rel); fa.addEventListener('pointercancel', rel);
      }
      void hold;
      // v79 화톳불 전송
      var wu = $('warp-ui'); if (wu) wu.addEventListener('click', function (e) { var t = e.target && e.target.closest ? e.target.closest('[data-warp],#wp-stay') : null; if (!t) return; if (t.id === 'wp-stay') { self.closeModal(); return; } if (t.disabled) return; var id = t.dataset.warp; self.closeModal(); MG.Game.warp(id); });
      if (global.addEventListener) global.addEventListener('keydown', function (e) { if (self.modal !== 'warp-ui') return; var n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 }[e.code]; if (n === undefined) return; var L = D.MAPS.field.bonfires[n]; if (L && MG.S.lit[L.id] && L.id !== self._warpFrom) { self.closeModal(); MG.Game.warp(L.id); } });
      // v82 대화 바: [기능 실행] · [닫기]
      var tk = $('talk-ui'); if (tk) tk.addEventListener('click', function (e) { var t = e.target && e.target.closest ? e.target.closest('[data-tact],#tk-close') : null; if (!t) return; if (t.id === 'tk-close') { MG.NPC.close(); return; } if (t.disabled) return; MG.NPC.act(+t.dataset.tact); });
      var ru = $('rune-ui'); if (ru) ru.addEventListener('click', function (e) { var t = e.target && e.target.closest ? e.target.closest('[data-rune]') : null; if (!t || !self._runeCb) return; var cb = self._runeCb; self._runeCb = null; self.closeModal(); cb(t.dataset.rune); });
      if (doc.body && doc.body.classList) doc.body.classList.add('mg-title');
    },
    /* v81 반응형 풀스크린: 뷰포트(w×h, CSS px) → 논리 해상도(W×H)와 균일 배율 sx(도트는 언제나 정사각형).
       세로 폰(가로/세로 ≤ 9/16): 폭 360 기준 — 높이가 화면 비율만큼 늘어난다(390×844 → 360×779).
       가로 · 폴더블 · 태블릿 · PC: 높이 기준(640, 낮은 화면은 540~640) — 폭이 늘어나 예전 레터박스 자리에 월드가 펼쳐진다(1280×800 → 1024×640).
       --fs = 360×640 패널(타이틀 기둥 · 대장간 작업대)을 화면에 넣기 위한 추가 축소(1 이하). */
    layout: function (w, h) {
      var sx, W, H;
      if (w / h > 360 / 640) { H = h >= 640 ? 640 : Math.max(540, h); sx = h / H; W = w / sx; if (W < 360) { sx = w / 360; W = 360; H = h / sx; } }
      else { sx = w / 360; W = 360; H = h / sx; }
      W = Math.round(W); H = Math.round(H);
      return { sx: sx, W: W, H: H, fs: Math.min(1, H / 640, W / 360), ps: Math.min(1, 1.08 / sx) };   // ps: 큰 화면에서 버튼 묶음은 화면 배율만큼 커지지 않는다(엄지 거리 유지)
    },
    onResize: function (w, h) {
      var L = this.layout(w, h); this.sx = L.sx; this.view = L;
      MG.setView(L.W, L.H);
      var st = $('stage'), ui = $('ui');
      if (st && st.style && st.style.setProperty) { st.style.setProperty('--sx', String(L.sx)); st.style.setProperty('--fs', String(L.fs)); st.style.setProperty('--ps', String(L.ps)); }
      if (ui && ui.style) { ui.style.width = L.W + 'px'; ui.style.height = L.H + 'px'; }
      if (doc.body && doc.body.classList) doc.body.classList.toggle('mg-wide', L.W > 480);
      this.placeTalk();
      return L;
    },

    /* ---------------------------------------------------------------- 아이콘 CSS(시트 → 배경) */
    installIcons: function () {
      var S = MG.Sprites; if (!S || !S.DATA || !doc || !doc.head || !doc.createElement) return;
      var css = '', DA = S.DATA;
      var sheet = function (name, cls, unit, prop, def, test) {
        var d = DA[name]; if (!d) return;
        var m = d.meta, W = m.w / unit, H = m.h / unit;
        css += '.' + cls + ' { display: inline-block; width: var(' + prop + ', ' + def + 'px); height: var(' + prop + ', ' + def + 'px); font-size: 0; line-height: 0; overflow: hidden; vertical-align: middle; flex: 0 0 auto; background-image: url(' + d.src + '); background-repeat: no-repeat; background-size: calc(var(' + prop + ', ' + def + 'px) * ' + W + ') calc(var(' + prop + ', ' + def + 'px) * ' + H + '); image-rendering: pixelated; }\n';
        for (var k in m.items) { var it = m.items[k]; if (!test(k, it)) continue; css += '.' + cls + '[data-ic="' + k + '"] { background-position: calc(var(' + prop + ', ' + def + 'px) * -' + (it[0] / unit) + ') calc(var(' + prop + ', ' + def + 'px) * -' + (it[1] / unit) + '); }\n'; }
      };
      sheet('icons', 'pxi', 16, '--pxs', 16, function (k, it) { return it[2] === 16; });
      sheet('icons', 'pxb', 32, '--pxb', 32, function (k, it) { return it[2] === 32; });
      sheet('rb', 'rbi', 16, '--pxs', 16, function (k, it) { return it[2] === 16 && it[3] === 16; });
      sheet('rb', 'rbb', 32, '--pxb', 32, function (k, it) { return it[2] === 32 && it[3] === 32; });
      var f = DA.forge; if (f) {
        css += '.wpi { display: inline-block; width: calc(24px * var(--wps, 1)); height: calc(24px * var(--wps, 1)); background-image: url(' + f.src + '); background-repeat: no-repeat; background-size: calc(' + f.meta.w + 'px * var(--wps, 1)) calc(' + f.meta.h + 'px * var(--wps, 1)); image-rendering: pixelated; flex: 0 0 auto; }\n';
        for (var k2 in f.meta.items) if (k2.indexOf('wi_') === 0) { var it2 = f.meta.items[k2]; css += '.wpi[data-wp="' + k2.slice(3) + '"] { background-position: calc(-' + it2[0] + 'px * var(--wps, 1)) calc(-' + it2[1] + 'px * var(--wps, 1)); }\n'; }
      }
      try { var st = doc.createElement('style'); st.id = 'icon-css'; st.textContent = css; doc.head.appendChild(st); } catch (e) { /* 아이콘 없이 */ }
    },
    /* 시트의 한 조각을 잘라 <img> 로(타이틀 엠블럼/로고 — 옆 조각이 비칠 수 없다) */
    cropImg: function (sheet, name, scale, cls) {
      var S = MG.Sprites, it = S.item(sheet, name); if (!it || !S.ready(sheet)) return null;
      try { var c = doc.createElement('canvas'); c.width = it.w; c.height = it.h; c.getContext('2d').drawImage(S.img(sheet), it.x, it.y, it.w, it.h, 0, 0, it.w, it.h); var im = doc.createElement('img'); im.src = c.toDataURL(); im.alt = ''; im.className = cls; im.width = it.w * scale; im.height = it.h * scale; return im; } catch (e) { return null; }
    },

    /* ---------------------------------------------------------------- 타이틀 */
    initTitle: function () {
      var self = this, S = MG.Sprites, has = MG.Save && MG.Save.has();
      var cont = $('btn-continue'), nw = $('btn-new');
      if (cont) cont.hidden = !has;
      if (nw) nw.textContent = '새로 시작';
      if (S && S.onReady) S.onReady('title', function () {
        // v78 『SOUL TEMPEST』: 부서진 폭풍의 고리 엠블럼 · 장식선 · 세리프 로고 · 부제 — 시트의 조각을 하나씩 잘라 낸 그림
        var put = function (id, name, sc, cls) { var im = self.cropImg('title', name, sc, cls), box = $(id); if (im && box) { box.innerHTML = ''; box.appendChild(im); } };
        var e = self.cropImg('title', 'emblem', 1.14, 'tt-emblem-img'), l = self.cropImg('title', 'logo', 1.3, 'tt-logo-img');
        var eb = $('tt-emblem'), lb = $('tt-logo');
        if (e && eb) { eb.innerHTML = ''; eb.appendChild(e); }
        if (l && lb) { lb.innerHTML = ''; lb.appendChild(l); }
        put('tt-div1', 'divider', 1.25, 'tt-div-img'); put('tt-div2', 'divider', 1.25, 'tt-div-img'); put('tt-sub', 'subtitle', 1.5, 'tt-sub-img');
      });
      var armed = false;
      var go = function (fn) { if (MG.Audio && MG.Audio.unlock) try { MG.Audio.unlock(); } catch (er) { /* 무음 */ } fn(); };
      if (cont) cont.addEventListener('click', function () { go(function () { MG.Game.continueGame(); }); });
      if (nw) nw.addEventListener('click', function () {
        if (has && !armed) { armed = true; nw.textContent = '정말 새로 시작? (한 번 더)'; setTimeout(function () { armed = false; nw.textContent = '새로 시작'; }, 2600); return; }
        go(function () { MG.Game.newHunt(); });   // v86 새로 시작 = 도트 시네마틱 오프닝부터
      });
      var v = $('tt-version'); if (v) v.textContent = MG.VERSION;
    },
    onBegin: function () {
      var t = $('title-ui'); if (t) t.hidden = true;
      if (doc.body && doc.body.classList) { doc.body.classList.remove('mg-title'); doc.body.classList.add('mg-play'); }
      this._hud = {}; this.syncHud(true);
    },

    /* ---------------------------------------------------------------- HUD(매 프레임 — 바뀐 것만 고친다) */
    syncHud: function (force) {
      if (!MG.Game || MG.Game.state !== 'PLAY') return;
      var P = MG.Player, S = MG.S, H = this._hud, W = MG.Combat.weapon();
      if (force) this._hud = H = {};
      var bar = function (id, v, max, key) { var r = Math.max(0, Math.min(1, v / max)), w = (r * 100).toFixed(1); if (H[key] !== w) { H[key] = w; var el = $(id); if (el) el.style.width = w + '%'; } };
      bar('bar-hp', P.hp, P.maxHp, 'hp'); bar('bar-mp', P.mp, P.maxMp, 'mp'); bar('bar-sp', P.sp, P.maxSp, 'sp');
      var hpt = Math.ceil(P.hp) + '/' + P.maxHp; if (H.hpt !== hpt) { H.hpt = hpt; set('bar-hp-t', hpt); }
      var low = P.hp < P.maxHp * 0.3; if (H.low !== low) { H.low = low; var hb = $('hud-bars'); if (hb) hb.classList.toggle('is-low', low); }
      var g = '<i class="pxi" data-ic="gold"></i>' + S.gold; if (H.g !== g) { H.g = g; set('hud-gold', g); }
      var es = '<i class="rbi" data-ic="' + (P.estus > 0 ? 'estus' : 'estus_empty') + '"></i>' + P.estus + '/' + S.estusMax; if (H.es !== es) { H.es = es; set('hud-estus', es); set('estus-n', String(P.estus)); var eb = $('btn-estus'); if (eb) eb.classList.toggle('is-empty', P.estus <= 0); }
      var wk = W.id + W.lvl + W.master; if (H.w !== wk) { H.w = wk; set('hud-weapon', W.def.sprite ? '<i class="wpi" data-wp="' + W.def.sprite + '"></i>' + (W.lvl ? '<b class="slot-lv">+' + W.lvl + '</b>' : '') + (W.master ? '<b class="slot-star">★</b>' : '') : '<i class="pxi" data-ic="sword"></i>'); var hw = $('hud-weapon'); if (hw) hw.setAttribute('aria-label', '장착 무기: ' + W.def.name); }
      var spid = S.spells[S.spellSel], sp = D.SPELLS[spid], sk = spid + S.spells.length; if (H.sp !== sk) { H.sp = sk; set('hud-spell', '<i class="rbi" data-ic="' + sp.ic + '"></i>' + (S.spells.length > 1 ? '<b class="slot-cyc">⇄</b>' : '')); set('magic-cost', String(sp.mp)); var hs = $('hud-spell'); if (hs) hs.setAttribute('aria-label', '비전 마법: ' + sp.name + ' (눌러서 바꾸기)'); }
      // v82 마법 재사용 대기시간: ✨ 버튼 위의 부채꼴(남은 비율) + 남은 초 — 새 게이지 없이 버튼 안에서만
      var cdl = P.cooldown ? P.cooldown(spid) : 0, cdk = cdl > 0 ? (cdl >= 1 ? String(Math.ceil(cdl)) : cdl.toFixed(1)) + '|' + Math.round(cdl / (sp.cd || 1) * 100) : '';
      if (H.cd !== cdk) { H.cd = cdk; var ce = $('magic-cd'); if (ce) { ce.hidden = !cdk; if (cdk) { var pc = cdk.split('|'); set('magic-cd-t', pc[0]); ce.style.background = 'conic-gradient(rgba(4, 6, 14, 0.74) 0 ' + pc[1] + '%, rgba(4, 6, 14, 0) ' + pc[1] + '% 100%)'; } } }
      var noMp = P.mp < sp.mp || cdl > 0; if (H.noMp !== noMp) { H.noMp = noMp; var mb = $('btn-magic'); if (mb) mb.classList.toggle('is-dim', noMp); }
      // 메인 버튼: 상호작용 대상 앞이면 그 아이콘으로 바뀐다
      var c = MG.Game.ctx, ck = c ? c.kind + c.label : '';
      if (H.ctx !== ck) {
        H.ctx = ck; var ab = $('btn-act');
        if (ab) { ab.classList.toggle('is-ctx', !!c); ab.setAttribute('aria-label', c ? c.label + ' (공격 버튼)' : '공격 (꾹 누르면 모아베기)'); }
        set('act-ic', c ? '<i class="' + (c.rb ? 'rbi' : 'pxi') + '" data-ic="' + c.icon + '"></i>' : '<i class="pxb" data-ic="btn_attack"></i>');   // v82: [💬 대화] · [🔥 가호 받기] 아이콘은 rb 시트
        set('act-lab', c ? esc(c.label) : '');
      }
      this.syncBoss();
    },
    syncBoss: function () {
      var b = MG.Bosses && MG.Bosses.active(), H = this._hud, el = $('boss-bar');
      if (!el) return;
      if (!b) { if (!el.hidden) el.hidden = true; H.boss = null; return; }
      if (el.hidden) el.hidden = false;
      if (H.boss !== b.id + b.variant) { H.boss = b.id + b.variant; set('bb-name', esc(b.vname || b.def.name)); el.classList.toggle('is-variant', !!b.variant); set('bb-pic', '<i class="pxi" data-ic="' + b.def.part.ic + '"></i>' + esc(b.def.part.name)); }
      var hp = (Math.max(0, b.hp / b.maxHp) * 100).toFixed(1), pt = (Math.max(0, b.partDur / b.partMax) * 100).toFixed(1);
      if (H.bhp !== hp) { H.bhp = hp; $('bb-hp').style.width = hp + '%'; }
      if (H.bpt !== pt + b.partBroken) { H.bpt = pt + b.partBroken; $('bb-pt').style.width = pt + '%'; el.classList.toggle('is-broken', b.partBroken); }
    },
    pressVisual: function (name, down) { var id = { act: 'btn-act', roll: 'btn-roll', magic: 'btn-magic', estus: 'btn-estus' }[name]; var el = id && $(id); if (el && el.classList) el.classList.toggle('is-down', down); },

    /* 화면 위 얇은 한 줄 알림(2초) — 화면 가운데는 절대 가리지 않는다 */
    ribbon: function (text, ms) {
      var el = $('ribbon'); if (!el) return;
      el.textContent = text; el.hidden = false; el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in');
      if (el.style) { el.style.fontSize = ''; for (var fs = 12; fs >= 9 && el.scrollWidth > el.clientWidth + 1; fs--) el.style.fontSize = fs + 'px'; }
      this._ribLast = text;
      if (this._rib) global.clearTimeout(this._rib);
      this._rib = global.setTimeout(function () { el.hidden = true; }, ms || 2000);
    },

    /* ---------------------------------------------------------------- 모달(📜 창 · 각인 카드) — 여는 동안 시간이 멈춘다 */
    modalOpen: function () { return !!this.modal; },
    /* ---------------------------------------------------------------- v86 게임패드로 창 고르기(스틱 · 십자키 = 다음/이전 · A = 누르기) */
    padItems: function (menu) {
      var sel = menu === 'title' ? '#title-ui button' : menu === 'forge' ? '#forge-ui .fg-card, #fg-actions button, #fg-close' : menu === 'talk' ? '#talk-ui button' : (this.modal ? '#' + this.modal + ' button' : '');
      if (!sel || !doc.querySelectorAll) return [];
      return Array.prototype.filter.call(doc.querySelectorAll(sel), function (e) { return !e.hidden && !e.disabled && e.getClientRects && e.getClientRects().length > 0; });
    },
    padNav: function (dir, menu) {
      var it = this.padItems(menu); if (!it.length) return null; var cur = it.indexOf(this._padEl);
      var n = cur < 0 ? (dir > 0 ? 0 : it.length - 1) : (cur + dir + it.length) % it.length;
      if (this._padEl && this._padEl.classList) this._padEl.classList.remove('pad-focus');
      this._padEl = it[n]; if (this._padEl.classList) this._padEl.classList.add('pad-focus'); if (this._padEl.scrollIntoView) try { this._padEl.scrollIntoView({ block: 'nearest' }); } catch (e) { /* 무시 */ }
      return this._padEl;
    },
    padPick: function (menu) { var it = this.padItems(menu), el = it.indexOf(this._padEl) >= 0 ? this._padEl : it[0]; if (!el || !el.click) return false; el.click(); return true; },
    closeModal: function () { var m = this.modal; if (!m) return; var el = $(m); if (el) el.hidden = true; this.modal = null; this._runeCb = null; if (doc.body && doc.body.classList) doc.body.classList.remove('mg-modal'); },
    openModal: function (id) { this.closeModal(); var el = $(id); if (el) el.hidden = false; this.modal = id; if (MG.Input) MG.Input.reset(); if (doc.body && doc.body.classList) doc.body.classList.add('mg-modal'); },
    toggleStatus: function (tab) { if (this.modal === 'status-ui') { this.closeModal(); return false; } if (!MG.Game || MG.Game.state !== 'PLAY' || MG.Forge.open) return false; this.openModal('status-ui'); this.renderStatus(tab || this._stTab || 'gear'); return true; },
    renderStatus: function (tab) {
      var S = MG.S, P = MG.Player, W = MG.Combat.weapon(), h = '', i, k;
      tab = tab === 'mats' || tab === 'codex' ? tab : 'gear'; this._stTab = tab;
      var tabs = doc.querySelectorAll ? doc.querySelectorAll('#status-ui .st-tab') : [];
      for (i = 0; i < tabs.length; i++) tabs[i].classList.toggle('is-on', tabs[i].dataset.tab === tab);
      if (tab === 'gear') {
        var stats = [['❤️ 체력', Math.ceil(P.hp) + '/' + P.maxHp], ['🔷 마력', Math.floor(P.mp) + '/' + P.maxMp], ['🟢 기력', Math.floor(P.sp) + '/' + P.maxSp], ['⚔️ 공격력', String(Math.round(MG.Combat.attackPower()))], ['✨ 마법 위력', '×' + MG.Combat.spellPower().toFixed(2)], ['🧪 에스트', P.estus + '/' + S.estusMax], ['🎯 치명타율', Math.round(MG.Combat.critChance() * 100) + '%']];
        h += '<div class="st-sec">📊 능력치</div><div class="st-grid">' + stats.map(function (s) { return '<div class="st-stat"><span>' + s[0] + '</span><b>' + esc(s[1]) + '</b></div>'; }).join('') + '</div>';
        h += '<div class="st-sec">🗡️ 무기 — 눌러서 바꿔 들기</div><div class="st-list">';
        var own = Object.keys(S.weapons);
        for (i = 0; i < own.length; i++) { k = own[i]; var w = D.WEAPONS[k], o = S.weapons[k], eq = S.equipped === k; h += '<div class="st-item' + (eq ? ' is-eq' : '') + '">' + (w.sprite ? '<i class="wpi" data-wp="' + w.sprite + '"></i>' : '<i class="pxi" data-ic="sword"></i>') + '<span class="st-txt"><b>' + (o.master ? '★' : '') + esc(w.name) + (o.lvl ? ' +' + o.lvl : '') + '</b><small>' + esc((D.LINES.filter(function (l) { return l.id === w.line; })[0] || {}).name + ' · ' + w.fx) + '</small></span>' + (eq ? '<em class="st-tag">장착 중</em>' : '<button type="button" class="st-btn" data-equip="' + k + '">장착</button>') + '</div>'; }
        h += '</div><div class="st-sec">🛡️ 갑주 — 눌러서 갈아입기</div><div class="st-list">';
        var ownA = Object.keys(S.armors || {});
        for (i = 0; i < ownA.length; i++) { k = ownA[i]; var ar = D.ARMORS[k], oa = S.armors[k], ea = (S.armor || 'coat') === k; h += '<div class="st-item' + (ea ? ' is-eq' : '') + '">' + (ar.sprite ? '<i class="wpi" data-wp="' + ar.sprite + '"></i>' : '<span class="st-emo">🧥</span>') + '<span class="st-txt"><b>' + (oa.master ? '★' : '') + esc(ar.name) + '</b><small>' + esc(ar.fx) + '</small></span>' + (ea ? '<em class="st-tag">착용 중</em>' : '<button type="button" class="st-btn" data-armor="' + k + '">착용</button>') + '</div>'; }
        h += '</div><div class="st-sec">✨ 비전 마법 — 눌러서 장착</div><div class="st-list">';
        for (i = 0; i < S.spells.length; i++) { var sp = D.SPELLS[S.spells[i]]; h += '<button type="button" class="st-item st-spell' + (i === S.spellSel ? ' is-eq' : '') + '" data-spell="' + i + '"><i class="rbi" data-ic="' + sp.ic + '"></i><span class="st-txt"><b>' + esc(sp.name) + ' <small>MP ' + sp.mp + (sp.hpPct ? ' · HP ' + Math.round(sp.hpPct * 100) + '%' : '') + ' · ⏳' + sp.cd + '초</small></b><small>' + esc(sp.desc) + '</small></span></button>'; }
        h += '</div><div class="st-sec">💠 고대 마법 각인</div><div class="st-list">' + (S.runes.length ? S.runes.map(function (r) { return '<div class="st-item"><span class="st-emo">' + D.RUNES[r].icon + '</span><span class="st-txt"><b>' + esc(D.RUNES[r].name) + '</b><small>' + esc(D.RUNES[r].desc) + '</small></span></div>'; }).join('') : '<div class="st-dim">아직 없다 — 고대 비석을 조사하면 셋 중 하나를 새긴다</div>') + '</div>';
        // v83 저주와 축복의 유물(하나만) · 영혼 수렵 파트너 · 미궁 · 보스 BGM
        var rel = S.relics || [], rq = MG.Combat.relic();
        h += '<div class="st-sec">🏺 저주와 축복의 유물 — 하나만 장착(언제든 교체)</div><div class="st-list">' + (rel.length ? rel.map(function (id) { var R = D.RELICS[id], on = rq === id; return '<div class="st-item' + (on ? ' is-eq' : '') + '"><span class="st-emo">' + R.icon + '</span><span class="st-txt"><b>' + esc(R.name) + '</b><small>' + esc(R.desc) + (R.curse ? ' · ⚠ ' + esc(R.curse) : '') + '</small></span>' + (on ? '<button type="button" class="st-btn" data-relic="none">해제</button>' : '<button type="button" class="st-btn" data-relic="' + id + '">장착</button>') + '</div>'; }).join('') : '<div class="st-dim">아직 없다 — 지하 던전 전실의 보물상자 · 미궁 · 난입 괴수에서</div>') + '</div>';
        var CP = MG.Companion;
        h += '<div class="st-sec">🐾 영혼 수렵 파트너</div><div class="st-list">' + (CP && CP.unlocked() ? D.COMPANIONS && Object.keys(D.COMPANIONS).map(function (k) { var c = D.COMPANIONS[k], on = CP.state().kind === k; return '<div class="st-item' + (on ? ' is-eq' : '') + '"><span class="st-emo">' + c.icon + '</span><span class="st-txt"><b>' + esc(c.name) + '</b><small>' + esc(c.desc) + '</small></span>' + (on ? '<em class="st-tag">함께</em>' : '<button type="button" class="st-btn" data-comp="' + k + '">부르기</button>') + '</div>'; }).join('') : '<div class="st-dim">아직 없다 — 잿빛 사냥꾼 카일에게 말을 걸어라</div>') + '</div>';
        var RB = MG.Bosses.arena;   // v84 무회복 보스 러시 기록
        h += '<div class="st-sec">⚔️ 심연의 투기장 : 무회복 보스 러시</div><div class="st-list"><div class="st-item"><span class="st-emo">🏟️</span><span class="st-txt"><b>' + (RB && MG.World.id === 'abyss' ? '도전 중 — ' + Math.min(D.RUSH.rounds, RB.idx + 1) + '/' + D.RUSH.rounds + '라운드' : '최고 기록 ' + (S.rushBest || 0) + '/' + D.RUSH.rounds + '라운드') + '</b><small>체력 · 에스트는 라운드 사이에 돌아오지 않는다 — 5대 보스 → 라가르 → 아종 → 심연의 기사왕</small></span></div></div>';
        var IP = MG.Input;   // v86 🎮 게임패드 매핑(새 버튼 없이 글자로만)
        h += '<div class="st-sec">🎮 게임패드 — ' + (IP.pad.on ? '연결됨' : '연결하면 바로 쓸 수 있다 (Xbox · PS · 블루투스 패드)') + '</div><div class="st-list st-pads">' + IP.PAD_GUIDE.map(function (p) { return '<div class="st-item st-pad"><span class="st-key">' + esc(p[0]) + '</span><span class="st-txt"><b>' + esc(p[1]) + '</b></span></div>'; }).join('') + '</div>';
        h += '<div class="st-sec">🎵 보스 전투 BGM</div><div class="st-list"><div class="st-item"><span class="st-emo">🥁</span><span class="st-txt"><b>' + (MG.SFX.bgmOn() ? '켜짐' : '꺼짐') + '</b><small>보스와 맞붙으면 울리고 · 2페이즈 각성이면 템포가 오른다</small></span><button type="button" class="st-btn" data-bgm="1">' + (MG.SFX.bgmOn() ? '끄기' : '켜기') + '</button></div></div>';
        var bl = MG.Combat.beast();   // v82 사신수의 가호
        h += '<div class="st-sec">🐾 사신수의 가호 — 필드 동서남북의 성소에서 하나</div><div class="st-list">' + (bl ? '<div class="st-item is-eq"><span class="st-emo">' + bl.icon + '</span><span class="st-txt"><b>' + esc(bl.name) + '의 가호</b><small>' + esc(bl.desc) + '</small></span></div>' : '<div class="st-dim">아직 없다 — 🐉 동 · 🐯 서 · 🦅 남 · 🐢 북의 성소에서 [🔥 가호 받기]</div>') + '</div>';
        var shr = D.MAPS.field.steles.filter(function (x) { return x.kind === 'shrine'; }), shN = shr.filter(function (x) { return S.steles[x.id]; }).length, bo = S.bonus || {};
        h += '<div class="st-sec">🧭 탐험 수집품 — 레벨업 대신 이것으로 강해진다</div><div class="st-list"><div class="st-item"><span class="st-emo">🧪</span><span class="st-txt"><b>황금 씨앗 ' + (S.seeds || 0) + '/4</b><small>에스트 최대 ' + S.estusMax + '/' + D.PLAYER.ESTUS_MAX + '병 — 다섯 구역의 숨겨진 기믹 너머 보물상자</small></span></div><div class="st-item"><span class="st-emo">⛩️</span><span class="st-txt"><b>고대 성소 ' + shN + '/' + shr.length + '</b><small>최대 HP +' + (bo.hp || 0) * D.PLAYER.SHRINE.hp + ' · MP +' + (bo.mp || 0) * D.PLAYER.SHRINE.mp + ' · SP +' + (bo.sp || 0) * D.PLAYER.SHRINE.sp + '</small></span></div></div>';
      } else if (tab === 'mats') {
        h += '<div class="st-sec">🎒 보유 소재 · 얻는 곳</div><div class="st-list">';
        for (i = 0; i < D.MAT_ORDER.length; i++) { k = D.MAT_ORDER[i]; var m = D.MATS[k]; h += '<div class="st-item' + (m.boss ? ' is-boss' : '') + ((S.mats[k] || 0) > 0 ? '' : ' is-zero') + '"><i class="pxi" data-ic="' + m.ic + '"></i><span class="st-txt"><b>' + esc(m.name) + ' ×' + (S.mats[k] || 0) + '</b><small>' + esc(m.from) + '</small></span></div>'; }
        h += '</div><div class="st-row"><span class="st-chip"><i class="pxi" data-ic="gold"></i>' + S.gold + ' 골드</span></div>';
      } else {
        // v85 《몬스터 헌터》식 수렵 기록: 보스별 최단 토벌 시간 · 최고 랭크(👑S 황금 왕관 / A / B) · 무회복 보스 러시 최고 기록
        var HU = S.hunts || {};
        h += '<div class="st-sec">🏆 수렵 기록 — 보스 방 진입부터 토벌까지 · 👑S = 기준 시간 안 · 피격 ' + D.HUNT.S.hits + '회 이하</div><div class="st-list st-hunts">';
        D.HUNT.order.forEach(function (id) {
          var b = id === 'k1' ? D.KING : D.BOSSES.filter(function (x) { return x.id === id; })[0], o = HU[id], par = D.HUNT.par[id];
          h += '<div class="st-item st-hunt' + (o ? ' is-own' : ' is-zero') + (o && o.rank === 'S' ? ' is-s' : '') + '" data-hunt="' + id + '"><span class="st-rank' + (o ? ' rk-' + o.rank : '') + '">' + (o ? (o.rank === 'S' ? '👑S' : o.rank) : '—') + '</span><span class="st-txt"><b>' + esc(b.name) + (o ? ' <em class="st-time">' + o.best.toFixed(1) + '초</em>' : ' <em class="st-dim">미수렵</em>') + '</b><small>' + (o ? '최단 기록 때 피격 ' + o.hits + '회 · 수렵 ' + o.n + '회 · 기준 ' + par + '초' : '기준 ' + par + '초 · 피격 ' + D.HUNT.S.hits + '회 이하로 토벌하면 👑S') + '</small></span></div>';
        });
        h += '<div class="st-item st-hunt' + (S.rushBest ? ' is-own' : ' is-zero') + (S.rushBest >= D.RUSH.rounds ? ' is-s' : '') + '" data-hunt="rush"><span class="st-rank' + (S.rushBest >= D.RUSH.rounds ? ' rk-S' : '') + '">' + (S.rushBest >= D.RUSH.rounds ? '👑' : (S.rushBest || 0)) + '</span><span class="st-txt"><b>⚔️ 무회복 보스 러시 <em class="st-time">' + (S.rushBest || 0) + '/' + D.RUSH.rounds + '라운드</em></b><small>' + (S.rushBestT ? '8라운드 최단 제패 ' + S.rushBestT.toFixed(1) + '초' : '8라운드 제패 기록 없음') + ' · 도전 ' + (S.rushRuns || 0) + '회</small></span></div>';
        h += '</div>';
        h += '<div class="st-sec">📖 무기 계보 4계열 × 3단 → ★궁극 파생 — 대장간(사냥꾼의 야영지 모루)에서 벼린다</div>';
        var wItem = function (id) {   // v84 이름 · 공격력 · 특성 한 줄 — 핵심 보스 소재 전엔 실루엣 ???
          var w = D.WEAPONS[id], o = S.weapons[id];
          if (!MG.Forge.known(id)) return '<div class="st-item is-blind"><i class="wpi" data-wp="' + w.sprite + '"></i><span class="st-txt"><b>??? (미확인 무기)</b><small>' + esc(MG.Forge.hint(id)) + '</small></span></div>';
          var rec = Object.keys(w.recipe).map(function (r) { return mat(r, w.recipe[r], S.mats[r] || 0); }).join('');
          return '<div class="st-item' + (o ? ' is-own' : '') + '"><i class="wpi" data-wp="' + w.sprite + '"></i><span class="st-txt"><b>' + (w.ultimate ? '<em class="st-myth">★궁극</em> ' : w.myth ? '<em class="st-myth">★신화</em> ' : '') + (o ? (o.master ? '★' : '') + esc(w.name) + (o.lvl ? ' +' + o.lvl : '') : esc(w.name) + ' <em class="st-dim">미제작</em>') + ' <small>⚔ ' + w.atk + '</small></b><small>' + esc(w.fx) + '</small><span class="st-rec">' + rec + '</span><small class="st-src">📍 ' + esc(w.src) + '</small></span></div>';
        };
        for (var li = 0; li < D.LINES.length; li++) {
          var L = D.LINES[li]; h += '<div class="st-line"><b>' + esc(L.name) + '</b> <small>' + esc(L.note) + '</small></div><div class="st-list">';
          D.WEAPON_ORDER.filter(function (id) { return D.WEAPONS[id].line === L.id; }).forEach(function (id) { h += wItem(id); });
          h += '</div>';
        }
        h += '<div class="st-sec">🛡️ 사냥꾼 갑주 5종</div><div class="st-list">';
        D.ARMOR_ORDER.forEach(function (id) { var a = D.ARMORS[id], o = (S.armors || {})[id], rec = Object.keys(a.recipe).map(function (r) { return mat(r, a.recipe[r], S.mats[r] || 0); }).join(''); h += '<div class="st-item' + (o ? ' is-own' : '') + '"><i class="wpi" data-wp="' + a.sprite + '"></i><span class="st-txt"><b>' + (a.myth ? '<em class="st-myth">★신화</em> ' : '') + esc(a.name) + (o ? '' : ' <em class="st-dim">미제작</em>') + '</b><small>' + esc(a.fx) + '</small><span class="st-rec">' + rec + '</span><small class="st-src">📍 ' + esc(a.src) + '</small></span></div>'; });
        // v84 ★궁극 파생 · 유물 6종 · 숨겨진 강자
        h += '</div><div class="st-sec">👑 ★궁극 파생 — 무기 트리의 맨 위</div><div class="st-list">' + wItem(D.ULTIMATE);
        h += '</div><div class="st-sec">🏺 저주와 축복의 유물 6종</div><div class="st-list">';
        D.RELIC_ORDER.forEach(function (id) { var R = D.RELICS[id], has = (S.relics || []).indexOf(id) >= 0; h += '<div class="st-item' + (has ? ' is-own' : ' is-zero') + '"><span class="st-emo">' + R.icon + '</span><span class="st-txt"><b>' + esc(R.name) + (has ? '' : ' <em class="st-dim">미발견</em>') + '</b><small>' + esc(R.desc) + '</small>' + (R.curse ? '<small class="st-src">⚠ ' + esc(R.curse) + '</small>' : '') + '</span></div>'; });
        h += '</div><div class="st-sec">👑 숨겨진 강자</div><div class="st-list">';
        [D.KING, D.RAGAR].forEach(function (b) { var rec = S.bosses[b.id] || {}; h += '<div class="st-item' + (rec.kills ? ' is-own' : ' is-zero') + '"><span class="st-emo">' + (b.id === 'k1' ? '👑' : '⚡') + '</span><span class="st-txt"><b>' + esc(b.name) + (rec.kills ? ' <em class="st-tag">토벌 ' + rec.kills + '</em>' : '') + '</b><small>' + (b.id === 'k1' ? '[왕의 무덤] 인간형 검사 — 연속 대시 베기 · 공중 회전 찍기 · 흑염 검기 · 부위: ' : '🌑 붉은 폭풍의 밤의 난입 괴수 · 부위: ') + esc(b.part.name) + '</small></span></div>'; });
        h += '</div><div class="st-sec">✨ 비전 마법 6종</div><div class="st-list">';
        D.SPELL_ORDER.forEach(function (id) { var sp = D.SPELLS[id], has = S.spells.indexOf(id) >= 0; h += '<div class="st-item' + (has ? ' is-own' : ' is-zero') + '"><i class="rbi" data-ic="' + sp.ic + '"></i><span class="st-txt"><b>' + esc(sp.name) + ' <small>MP ' + sp.mp + (sp.hpPct ? ' · HP ' + Math.round(sp.hpPct * 100) + '%' : '') + ' · ⏳' + sp.cd + '초</small>' + (has ? '' : ' <em class="st-dim">미습득</em>') + '</b><small>' + esc(sp.desc) + '</small><small class="st-src">📍 ' + esc(SPELL_SRC[id]) + '</small></span></div>'; });
        h += '</div>';
      }
      var body = $('st-body'); if (body && body.innerHTML !== h) { body.innerHTML = h; body.scrollTop = 0; }
      return tab;
    },
    /* v79 화톳불 전송 목록: 지금 화톳불은 「여기」, 불붙인 곳은 누르면 전송, 아직 못 찾은 곳은 잠김 */
    openWarp: function (fromId) {
      var self = this; this._warpFrom = fromId;
      var h = D.MAPS.field.bonfires.map(function (b, i) {
        var lit = !!MG.S.lit[b.id], here = b.id === fromId, ok = lit && !here; b = { id: b.id, name: b.name, icon: b.icon, lit: lit };
        return '<button type="button" class="wp-item' + (here ? ' is-here' : '') + (b.lit ? '' : ' is-locked') + '" data-warp="' + b.id + '"' + (ok ? '' : ' disabled') + '><span class="wp-ic">' + (b.lit ? b.icon : '🔒') + '</span><span class="wp-name">' + esc(b.lit ? b.name : '??? — 아직 불을 붙이지 않은 화톳불') + '</span><span class="wp-tag">' + (here ? '여기' : b.lit ? (i + 1) + ' · 전송' : '미발견') + '</span></button>';
      }).join('');
      set('wp-list', h); this.openModal('warp-ui');
      void self;
    },
    openRunes: function (ids, cb) {
      var h = ids.map(function (r) { var R = D.RUNES[r]; return '<button type="button" class="rn-card" data-rune="' + r + '"><span class="rn-ic">' + R.icon + '</span><b>' + esc(R.name) + '</b><small>' + esc(R.desc) + '</small></button>'; }).join('');
      set('rn-cards', h); this.openModal('rune-ui'); this._runeCb = cb;
    },

    /* ---------------------------------------------------------------- v82 대화 바(화면 아래 가운데 · 시간은 멈추지 않는다 · 멀어지면 닫힌다) */
    openTalk: function (v) {
      var el = $('talk-ui'); if (!el) return false;
      var ic = $('tk-ic'), im = this._npcImg && this._npcImg[v.id];
      if (!im && MG.Sprites && MG.Sprites.ready('rb')) { im = this.cropImg('rb', D.NPCS[v.id].sprite + '_0', 1, 'tk-img'); (this._npcImg = this._npcImg || {})[v.id] = im; }
      if (ic) { if (im) { if (ic.firstChild !== im) { ic.innerHTML = ''; ic.appendChild(im); } } else set('tk-ic', esc(v.emo)); }
      set('tk-name', esc(v.emo + ' ' + v.name)); set('tk-l1', esc(v.lines[0])); set('tk-l2', esc(v.lines[1]));
      set('tk-acts', v.acts.map(function (a, i) { return '<button type="button" class="tk-btn' + (a.ok ? '' : ' is-off') + '" data-tact="' + i + '"' + (a.ok ? '' : ' disabled') + '>' + esc(a.label) + '</button>'; }).join(''));
      el.hidden = false; this.talk = v.id; this.placeTalk();
      if (doc.body && doc.body.classList) doc.body.classList.add('mg-talk');
      return true;
    },
    closeTalk: function () { var el = $('talk-ui'); if (el) el.hidden = true; this.talk = null; if (doc.body && doc.body.classList) doc.body.classList.remove('mg-talk'); },
    /* 버튼 묶음(오른쪽 아래)과 겹치지 않게: 넓으면 가운데 bottom 24px, 조금 좁으면 버튼 왼쪽 빈 곳의 가운데로, 세로 폰은 버튼 묶음 위로 */
    placeTalk: function () {
      var el = $('talk-ui'); if (!el || !el.classList) return;
      var W = MG.W, ps = (this.view && this.view.ps) || 1, bw = Math.min(W * 0.9, 440), freeR = W - 4 - 184 * ps - 8;
      el.classList.remove('is-shift'); el.classList.remove('is-raised'); if (el.style) el.style.left = '';
      if ((W + bw) / 2 <= freeR) return 'center';
      if (bw + 16 <= freeR) { el.classList.add('is-shift'); if (el.style) el.style.left = Math.round((freeR - bw) / 2) + 'px'; return 'shift'; }
      el.classList.add('is-raised'); return 'raised';
    },

    /* ---------------------------------------------------------------- 대장간 DOM */
    setForge: function (open) {
      var el = $('forge-ui'); if (el) el.hidden = !open;
      if (doc.body && doc.body.classList) doc.body.classList.toggle('mg-forge', !!open);
      if (!open) this.syncHud(true);
    },
    forgeTemp: function () { /* 온도는 캔버스가 크게 그린다 */ },
    renderForge: function (st) {
      var S = MG.S, h = '', i;
      set('fg-gold', '<i class="pxi" data-ic="gold"></i>' + st.gold);
      // v84 몬스터 헌터식 무기 트리: 계열마다 한 줄 [T1] ─▶ [T2] ─▶ [T3] · 3티어 열을 잇는 줄기 위 맨 꼭대기 ★궁극 파생 · 아래 갑주 5종
      // 카드 = 이름 · ⚔공격력 · 특성 한 줄 · 소재. 핵심 보스 소재를 아직 못 얻은 무기는 검은 실루엣 「??? (미확인 무기)」 + 힌트
      var card = function (c, icon) {
        var w = MG.Forge.def(c.wid), cost = c.armor ? (c.owned ? null : c.recipe) : (c.owned ? c.upCost : c.recipe), rec = '';
        var cls = 'fg-card' + (st.sel === c.wid ? ' is-sel' : '') + (c.owned ? ' is-own' : '') + (c.canMake || c.canUp ? ' is-can' : '') + (c.locked ? ' is-locked' : '') + (c.master ? ' is-master' : '') + (c.myth ? ' is-myth' : '') + (c.ultimate ? ' is-ult' : '');
        if (!c.known) return '<button type="button" class="fg-card' + (st.sel === c.wid ? ' is-sel' : '') + (c.ultimate ? ' is-ult' : '') + ' is-blind" data-wid="' + c.wid + '" aria-label="??? (미확인 무기)"><i class="wpi" data-wp="' + icon + '"></i><b class="fc-name">??? <small>(미확인 무기)</small></b><span class="fc-hint">' + esc(c.hint) + '</span></button>';
        if (cost) for (var k in cost) rec += mat(k, cost[k], S.mats[k] || 0); else rec = '<span class="fc-max">' + (c.armor ? '보유' : '최고 단계') + '</span>';
        var badge = c.equipped ? '<em class="fc-badge is-eq">' + (c.armor ? '착용' : '장착') + '</em>' : c.owned ? '<em class="fc-badge">' + (c.master ? '★' : '') + (c.lvl ? '+' + c.lvl : '보유') + '</em>' : c.locked ? '<em class="fc-badge is-lock">🔒</em>' : '';
        var mid = c.armor ? '<span class="fc-tag">' + esc(w.tag) + '</span>' : '<span class="fc-atk">⚔ ' + w.atk + '</span><span class="fc-fx">' + esc(w.fx) + '</span>';
        return '<button type="button" class="' + cls + '" data-wid="' + c.wid + '" aria-label="' + esc(w.name) + '">' + badge +
          '<i class="wpi" data-wp="' + icon + '"></i><b class="fc-name">' + (c.myth ? '<span class="fc-myth">★</span>' : '') + esc(w.name) + '</b>' + mid + '<span class="fc-rec">' + rec + '</span></button>';
      };
      var uc = st.ultCard, link = '<i class="fg-link" aria-hidden="true"></i>';
      h += '<div class="fg-mh"><div class="fg-ultrow"><span class="fg-ulab"><b>👑 ★궁극 파생</b><small>3티어 ★신화 무기 하나 + 기사왕의 흑관으로 벼린다</small></span>' + card(uc, D.WEAPONS[uc.wid].sprite) + '</div><div class="fg-rows">';
      for (i = 0; i < st.lines.length; i++) {
        var L = st.lines[i], cards = st.cards.filter(function (c) { return c.line === L.id; });
        h += '<div class="fg-row"><span class="fg-lh">' + esc(L.name) + '</span>';
        for (var j = 0; j < cards.length; j++) h += (j ? link : '') + card(cards[j], D.WEAPONS[cards[j].wid].sprite);
        h += '</div>';
      }
      h += '</div></div><div class="fg-sec">🛡️ 사냥꾼 갑주 — 입으면 최대 HP가 오르고 모습이 바뀐다</div><div class="fg-agrid">';
      for (i = 0; i < st.armorCards.length; i++) h += card(st.armorCards[i], D.ARMORS[st.armorCards[i].wid].sprite);
      h += '</div>';
      var tree = set('fg-tree', h);
      if (tree && st.sel && st.sel !== this._fgSel && tree.querySelector) { this._fgSel = st.sel; var sc = tree.querySelector('[data-wid="' + st.sel + '"]'); if (sc && sc.offsetTop !== undefined && (sc.offsetTop < tree.scrollTop || sc.offsetTop + sc.offsetHeight > tree.scrollTop + tree.clientHeight)) tree.scrollTop = Math.max(0, sc.offsetTop - 14); }
      // 상세 / 단계 안내
      var d = st.detail, cr = st.craft, dh = '';
      if (cr) {
        var cap = cr.step === 'bellows' ? '① 🪗 풀무를 꾹 누르기 — 75~92% 황금 구간에서 손을 떼면 대성공!' : cr.step === 'anvil' ? '② 🔨 반짝이는 점을 직접 탭 — 고리가 금빛 점에 겹칠 때 완벽! (' + cr.hits + '/3)' : cr.step === 'quench' ? '③ 💧 물통을 탭해 담금질!' : (cr.master ? (MG.Forge.isArmor(cr.wid) ? '★명장 갑주! HP 보너스 +10% — 바로 입었다' : '★명장(Masterwork) 탄생! 공격력 +25% — 바로 장착했다') : '완성 — 바로 ' + (MG.Forge.isArmor(cr.wid) ? '입었다' : '장착했다'));
        dh = '<div class="fd-step' + (cr.step === 'done' && cr.master ? ' is-master' : '') + '">' + esc(cap) + '</div>';
      } else if (d && d.blind) {   // v84 미확인 무기
        dh = '<div class="fd-head"><b class="fd-name">??? (미확인 무기)</b><span class="fd-stat">⚔ ???</span></div><div class="fd-fx">' + esc(d.hint) + '</div><div class="fd-src">핵심 보스 소재를 처음 손에 넣으면 이름 · 공격력 · 특성이 드러난다</div>';
      } else if (d) {
        dh = '<div class="fd-head"><b class="fd-name">' + (d.card.myth ? '★신화 · ' : '') + (d.card.master ? '★' : '') + esc(d.name) + (d.card.lvl ? ' +' + d.card.lvl : '') + '</b><span class="fd-stat">' + (d.armor ? '❤️ HP +' + d.hp : '⚔️ ' + d.atk + ' · 속도 ×' + d.spd) + '</span></div><div class="fd-fx">' + esc(d.fx) + '</div><div class="fd-src">📍 ' + esc(d.src || '') + '</div>';
      }
      if (st.msg) dh += '<div class="fd-msg">' + esc(st.msg) + '</div>';
      set('fg-detail', dh);
      // 아래 버튼
      var ah = '';
      if (cr) {
        if (cr.step === 'bellows') ah = '<button type="button" class="fg-big fg-hold" data-hold="1">🪗 풀무 꾹 누르기</button>';
        else if (cr.step === 'quench') ah = '<button type="button" class="fg-big" data-fact="quench">💧 담금질</button>';
        else if (cr.step === 'anvil') ah = '<div class="fg-note">빛나는 점을 직접 두드려라 (키보드: J)</div>';
      } else if (d) {
        var cd = d.card;
        if (!cd.owned) ah = '<button type="button" class="fg-big' + (cd.canMake ? ' is-go' : ' is-off') + '" data-fact="make">' + (cd.known ? '🔨 단조 시작' : '🔒 미확인') + '</button>';
        else if (cd.armor) ah = cd.equipped ? '<span class="fg-eq">🛡️ 착용 중</span>' : '<button type="button" class="fg-big fg-equip" data-fact="equip">🛡️ 착용</button>';
        else {
          ah = '<button type="button" class="fg-big' + (cd.canUp ? ' is-go' : ' is-off') + '" data-fact="up">' + (cd.upCost ? '⬆ +' + (cd.lvl + 1) + ' 연마' : '최고 단계') + '</button>';
          ah += cd.equipped ? '<span class="fg-eq">⚔ 장착 중</span>' : '<button type="button" class="fg-big fg-equip" data-fact="equip">⚔ 장착</button>';
        }
      }
      set('fg-actions', ah);
      var fu = $('forge-ui'); if (fu) fu.classList.toggle('is-craft', !!cr);
    }
  };
})(window);
