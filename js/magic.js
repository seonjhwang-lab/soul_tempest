/* ==========================================================================
   magic.js — 비전 마법 6종(《바람의 나라》 감성): MP 를 써서 장착한 마법을 시전한다(원거리 공격은 오직 이 버튼으로만)
     ① 초승달 열파참   전방으로 관통하는 거대 검기 — 일직선 위의 적을 모두 베어 넘긴다
     ② 홍련의 화염진   발밑에 불의 고리 → 2초간 불바다(지속 피해) · 가시덩굴은 타고 얼음 장벽은 녹는다
     ③ 천벌의 벼락창   가장 강한 적(최대 체력이 가장 큰) 머리 위에 굵은 낙뢰 — 큰 피해 + 기절
     ④ 절대영도 눈보라  몸 둘레로 퍼지는 눈보라 — 광역 빙결 피해 + 둔화 · 흑요석 봉인암을 급랭시켜 깨뜨린다
     ⑤ 폭풍의 칼날장막  5초간 몸 주변을 도는 회전 칼바람 네 자루
     ⑥ 건곤대나이·극   MP 와 약간의 HP 를 태워 전방에 압도적인 심연 참격을 꽂는 궁극기
   + 비전 마검의 「비전 단두대」(표적 머리 위로 떨어지는 마법 대검 기둥) · 흑룡 파멸대검 진 모아베기의 낙뢰 · 수정 대검의 충격파
   마법은 보스 부위 내구도도 깎는다(모아베기 · 특수기와 함께 부위 파괴의 수단).
   v82: 마법마다 재사용 대기시간(player.js) · 마법 증폭 상한 1.35×(combat.js) · 주문은 전실 봉인 장치 · 둥지 기둥(gimmick.js)에도 닿는다.
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;

  function inRect(ex, ey, x, y, a, len, hw) { var dx = ex - x, dy = ey - y, along = dx * Math.cos(a) + dy * Math.sin(a), side = -dx * Math.sin(a) + dy * Math.cos(a); return along > -6 && along < len && Math.abs(side) < hw; }

  var Magic = MG.Magic = {
    list: [],
    reset: function () { this.list = []; },
    has: function (k) { for (var i = 0; i < this.list.length; i++) if (this.list[i].k === k) return true; return false; },
    cast: function (id) {
      var P = MG.Player, FX = MG.FX;
      if (id === 'wave') this.list.push({ k: 'wave', x: P.x + P.fx * 8, y: P.y - 8 + P.fy * 8, vx: P.fx * 210, vy: P.fy * 210, a: Math.atan2(P.fy, P.fx), t: 0, life: 1.25, hit: [] });
      else if (id === 'fire') {
        this.list.push({ k: 'fire', x: P.x, y: P.y, t: 0, life: 2.2, tick: 0 });
        var n = MG.World.burn(P.x, P.y, 92);
        if (n && FX) FX.text(P.x, P.y - 36, '불길이 번진다!', '#ffb238', 1.2, 12);
      } else if (id === 'bolt') {
        var best = null, bs = -1, t = MG.Combat.targets();
        for (var i = 0; i < t.length; i++) { var d = U.dist(P.x, P.y, t[i].x, t[i].y); if (d < 230 && t[i].maxHp > bs) { bs = t[i].maxHp; best = t[i]; } }
        var tx = best ? best.x : P.x + P.fx * 60, ty = best ? best.y : P.y + P.fy * 60;
        this.list.push({ k: 'bolt', target: best, x: tx, y: ty, t: 0, life: 0.75, struck: false });
      } else if (id === 'frost') {
        this.list.push({ k: 'frost', x: P.x, y: P.y, t: 0, life: 1.6, tick: 0 });
        var f = MG.World.freeze(P.x, P.y, 96);
        if (FX) { FX.flash('#e4fdff', 0.12); FX.ring(P.x, P.y - 6, 6, 80, 0.6, '#e4fdff', 3); if (f) FX.text(P.x, P.y - 36, '흑요석이 얼어붙는다!', '#bff6ff', 1.2, 12); }
      } else if (id === 'storm') {
        for (var j = this.list.length - 1; j >= 0; j--) if (this.list[j].k === 'storm') this.list.splice(j, 1);
        this.list.push({ k: 'storm', t: 0, life: 5, cd: [] });
        if (FX) FX.ring(P.x, P.y - 8, 4, 30, 0.4, '#eef6ff', 2);
      } else if (id === 'abyss') {
        this.list.push({ k: 'abyss', x: P.x, y: P.y - 6, a: Math.atan2(P.fy, P.fx), t: 0, life: 1.0, struck: false });
        if (FX) { FX.flash('#2a0a40', 0.2); FX.text(P.x, P.y - 44, '건곤대나이 · 극!', '#d8b8ff', 1.1, 16, { pop: true }); }
      }
      if (MG.Audio && MG.Audio.playBeam) try { MG.Audio.playBeam(); } catch (e) { /* 무음 */ }
      MG.emit('cast', id);
    },
    /* 비전 마검 홀드: 표적 머리 위로 거대한 마법 대검 기둥이 0.35초 뒤 꽂힌다(날아가는 투사체가 아니다) */
    guillotine: function (x, y, target, power, spent) { this.list.push({ k: 'guillo', x: x, y: y, target: target, power: power, spent: spent, t: 0, life: 0.95, struck: false }); },
    /* 흑룡 파멸대검 진 모아베기의 낙뢰(그 자리에 바로) */
    strike: function (x, y, r) { this.list.push({ k: 'strike', x: x, y: y, r: r, t: 0, life: 0.4, struck: false }); },
    /* 수정 갑주 대검의 모아베기: 수정 충격파(작은 원형 피해) */
    shockwave: function (x, y) { this.list.push({ k: 'quake', x: x, y: y, t: 0, life: 0.35, hit: [] }); if (MG.FX) MG.FX.ring(x, y, 4, 34, 0.35, '#c4a8ff', 3); },
    update: function (dt) {
      var P = MG.Player;
      for (var i = this.list.length - 1; i >= 0; i--) {
        var m = this.list[i], tg, k; m.t += dt;
        if (m.k === 'wave') {
          m.x += m.vx * dt; m.y += m.vy * dt;
          tg = MG.Combat.targets();
          for (k = 0; k < tg.length; k++) { var e = tg[k]; if (m.hit.indexOf(e) >= 0) continue; if (U.dist(m.x, m.y, e.x, e.y - (e.hy || 6)) < 14 + e.r) { m.hit.push(e); MG.Combat.playerHit(e, { spell: true, dmg: 28, part: true, kind: 'spell', knock: 1.2 }); } }
          if (MG.Gimmick) MG.Gimmick.area(m.x, m.y + 6, 12, { kind: 'spell' }, m.hit);   // v82: 검기로 공명 수정을 울리고 · 둥지 기둥을 무너뜨린다
          if (MG.FX && Math.random() < 0.7) MG.FX.burst(m.x - m.vx * 0.03, m.y - m.vy * 0.03, 1, ['#8ae8f8', '#e4fdff'], 20, { g: 0 });
          var rock = MG.World.barrierNear(m.x, m.y, 8, 'rock');
          if (rock || MG.World.blocked(m.x, m.y + 8, 2)) m.t = Math.max(m.t, m.life - 0.08);
        } else if (m.k === 'fire') {
          m.tick -= dt;
          var R = Math.min(70, 20 + m.t * 200);
          if (m.tick <= 0) { m.tick = 0.25; tg = MG.Combat.targets(); for (k = 0; k < tg.length; k++) if (U.dist(m.x, m.y, tg[k].x, tg[k].y) < R + tg[k].r) MG.Combat.playerHit(tg[k], { spell: true, dmg: 7, part: true, kind: 'spell', knock: 0.2, fire: true }); if (MG.Gimmick) MG.Gimmick.area(m.x, m.y, R, { kind: 'spell', fire: true }, (m.gh = m.gh || [])); }
          if (MG.FX && Math.random() < 0.9) { var a = Math.random() * 6.28; MG.FX.ember(m.x + Math.cos(a) * R * Math.random(), m.y + Math.sin(a) * R * 0.6 * Math.random()); }
          if (m.t < 0.4) MG.World.burn(m.x, m.y, 92);
        } else if (m.k === 'frost') {
          m.tick -= dt;
          var FR = Math.min(76, 18 + m.t * 160);
          if (m.tick <= 0) { m.tick = 0.3; tg = MG.Combat.targets(); for (k = 0; k < tg.length; k++) if (U.dist(m.x, m.y, tg[k].x, tg[k].y) < FR + tg[k].r) MG.Combat.playerHit(tg[k], { spell: true, dmg: 11, part: true, kind: 'spell', knock: 0.1, slow: 2.6 }); if (MG.Gimmick) MG.Gimmick.area(m.x, m.y, FR, { kind: 'spell' }, (m.gh = m.gh || [])); }
          if (MG.FX) for (var s = 0; s < 3; s++) { var aa = Math.random() * 6.28, rr = FR * Math.random(); MG.FX.burst(m.x + Math.cos(aa) * rr, m.y - 4 + Math.sin(aa) * rr * 0.6, 1, ['#ffffff', '#e4fdff', '#8ae8f8'], 30, { g: 10 }); }
          if (m.t < 0.5) MG.World.freeze(m.x, m.y, 96);
        } else if (m.k === 'storm') {
          tg = MG.Combat.targets();
          for (k = 0; k < 4; k++) {
            var ba = m.t * 7 + k * Math.PI / 2, bx = P.x + Math.cos(ba) * 26, by = P.y - 6 + Math.sin(ba) * 18;
            for (var q = 0; q < tg.length; q++) { var te = tg[q], last = m.cd.indexOf(te); if (last >= 0 && m.cd[last + 1] > m.t) continue; if (U.dist(bx, by, te.x, te.y - (te.hy ? te.hy * 0.4 : 4)) < 9 + te.r) { if (last >= 0) m.cd.splice(last, 2); m.cd.push(te, m.t + 0.32); MG.Combat.playerHit(te, { spell: true, dmg: 9, part: 0.6, kind: 'spell', knock: 0.6 }); } }
            if (MG.Gimmick) MG.Gimmick.area(bx, by + 6, 9, { kind: 'spell' }, (m.gh = m.gh || []));
          }
        } else if (m.k === 'abyss') {
          if (!m.struck && m.t >= 0.25) {
            m.struck = true; tg = MG.Combat.targets();
            for (k = 0; k < tg.length; k++) if (inRect(tg[k].x, tg[k].y, m.x, m.y + 6, m.a, 140, 26 + tg[k].r)) MG.Combat.playerHit(tg[k], { spell: true, dmg: 120, part: true, kind: 'spell', stun: 1.0, knock: 2.2 });
            if (MG.Gimmick) MG.Gimmick.rect(m.x, m.y + 6, m.a, 140, 26, { kind: 'spell', strong: true });
            if (MG.FX) { MG.FX.flash('#b090f0', 0.16); MG.FX.shake(7, 0.4); MG.FX.crack(m.x + Math.cos(m.a) * 50, m.y + 8 + Math.sin(m.a) * 50, m.a, 70); MG.FX.burst(m.x + Math.cos(m.a) * 70, m.y + Math.sin(m.a) * 70, 40, ['#2a0a40', '#b090f0', '#ffffff', '#4deeea'], 180); MG.FX.hitstop(0.1); }
            var rk = MG.World.barrierNear(m.x + Math.cos(m.a) * 40, m.y + Math.sin(m.a) * 40, 40, 'rock'); if (rk) MG.World.hitRock(rk, 3);
          }
        } else if (m.k === 'guillo') {
          if (m.target && m.target.alive) { m.x = m.target.x; m.y = m.target.y; }
          if (!m.struck && m.t >= D.PLAYER.GUILLO_DELAY) {
            m.struck = true; tg = MG.Combat.targets();
            for (k = 0; k < tg.length; k++) if (U.dist(m.x, m.y, tg[k].x, tg[k].y) < 30 + tg[k].r) MG.Combat.playerHit(tg[k], { spell: true, dmg: m.power, part: 1.5, kind: 'spell', stun: 0.8, knock: 0.6, hold: true });
            if (MG.Gimmick) MG.Gimmick.area(m.x, m.y, 30, { kind: 'spell', strong: true });
            if (MG.FX) { MG.FX.flash('#d8c8ff', 0.12); MG.FX.shake(6, 0.3); MG.FX.ring(m.x, m.y, 6, 40, 0.45, '#b090f0', 4); MG.FX.burst(m.x, m.y - 10, 36, ['#b090f0', '#4deeea', '#ffffff', '#efe4ff'], 170); MG.FX.crack(m.x, m.y + 2, -Math.PI / 2, 30); }
            var rr2 = MG.World.barrierNear(m.x, m.y, 30, 'rock'); if (rr2) MG.World.hitRock(rr2, 2);
          }
        } else if (m.k === 'strike') {
          if (!m.struck) { m.struck = true; tg = MG.Combat.targets(); for (k = 0; k < tg.length; k++) if (U.dist(m.x, m.y, tg[k].x, tg[k].y) < m.r + tg[k].r) MG.Combat.playerHit(tg[k], { mult: 1.2, part: 1, kind: 'special', stun: 0.5, knock: 0.6 }); if (MG.Gimmick) MG.Gimmick.area(m.x, m.y, m.r, { kind: 'special', strong: true }); if (MG.FX) { MG.FX.flash('#e8f4ff', 0.08); MG.FX.spark(m.x, m.y - 6, 5); } }
        } else if (m.k === 'bolt') {
          if (m.target && m.target.alive) { m.x = m.target.x; m.y = m.target.y; }
          if (!m.struck && m.t >= 0.32) {
            m.struck = true;
            if (m.target && m.target.alive) MG.Combat.playerHit(m.target, { spell: true, dmg: 52, part: true, kind: 'spell', stun: 1.6, knock: 0.5 });
            if (MG.Gimmick) MG.Gimmick.area(m.x, m.y, 16, { kind: 'spell' });
            if (MG.FX) { MG.FX.flash('#fff8c0', 0.12); MG.FX.shake(4, 0.25); MG.FX.ring(m.x, m.y, 4, 30, 0.4, '#fff3a0', 3); MG.FX.burst(m.x, m.y - 8, 24, ['#fff6c0', '#ffe066', '#ffffff'], 140); }
          }
        } else if (m.k === 'quake') {
          tg = MG.Combat.targets();
          for (k = 0; k < tg.length; k++) { var qq = tg[k]; if (m.hit.indexOf(qq) >= 0) continue; if (U.dist(m.x, m.y, qq.x, qq.y) < 34 + qq.r) { m.hit.push(qq); MG.Combat.playerHit(qq, { spell: true, dmg: 18, part: true, kind: 'spell' }); } }
          if (MG.Gimmick) MG.Gimmick.area(m.x, m.y, 34, { kind: 'spell', strong: true }, m.hit);
        }
        if (m.t >= m.life) this.list.splice(i, 1);
      }
    },
    /* 땅에 깔리는 것(화염진 · 눈보라) — y 정렬 전에 */
    drawGround: function (ctx, t) {
      var S = MG.Sprites;
      for (var i = 0; i < this.list.length; i++) {
        var m = this.list[i];
        if (m.k === 'frost') {
          var FR = Math.min(76, 18 + m.t * 160), ff = m.t > m.life - 0.4 ? (m.life - m.t) / 0.4 : 1;
          ctx.fillStyle = 'rgba(200, 240, 255, ' + (0.22 * ff).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(m.x, m.y, FR, FR * 0.62, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(240, 252, 255, ' + (0.85 * ff).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(m.x, m.y, FR, FR * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.9 * ff).toFixed(2) + ')';
          for (var k = 0; k < 10; k++) { var a = k * 0.63 + m.t * 0.8; ctx.fillRect(Math.round(m.x + Math.cos(a) * FR * 0.8), Math.round(m.y + Math.sin(a) * FR * 0.5), 2, 2); }
          continue;
        }
        if (m.k !== 'fire') continue;
        var R = Math.min(70, 20 + m.t * 200), fade = m.t > m.life - 0.4 ? (m.life - m.t) / 0.4 : 1;
        var g = ctx.createRadialGradient && ctx.createRadialGradient(m.x, m.y, 4, m.x, m.y, R);
        if (g && g.addColorStop) { g.addColorStop(0, 'rgba(255, 120, 40, ' + (0.18 * fade).toFixed(2) + ')'); g.addColorStop(0.75, 'rgba(255, 80, 30, ' + (0.32 * fade).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255, 60, 20, 0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(m.x, m.y, R, R * 0.62, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255, 178, 56, ' + (0.8 * fade).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(m.x, m.y, R, R * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
        if (S && S.ready('forge')) { ctx.globalAlpha = fade; for (var j = 0; j < 12; j++) { var b = j / 12 * Math.PI * 2 + m.t * 0.6; S.draw(ctx, 'forge', 'fire_' + ((Math.floor(t * 12) + j) % 4), m.x + Math.cos(b) * R, m.y + Math.sin(b) * R * 0.62 + 4, false, 0.55); } ctx.globalAlpha = 1; }
      }
    },
    /* 공중의 것(검기 · 벼락 · 칼날장막 · 심연 참격 · 단두대) — y 정렬 뒤에 */
    drawAir: function (ctx, t) {
      var P = MG.Player;
      for (var i = 0; i < this.list.length; i++) {
        var m = this.list[i], k, w;
        if (m.k === 'wave') {
          var fade = m.t > m.life - 0.2 ? (m.life - m.t) / 0.2 : 1;
          ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a); ctx.globalAlpha = fade;
          for (var s = 3; s >= 0; s--) { ctx.strokeStyle = s === 0 ? '#ffffff' : (s === 1 ? '#e4fdff' : (s === 2 ? 'rgba(138, 232, 248, 0.7)' : 'rgba(63, 192, 216, 0.35)')); ctx.lineWidth = s === 0 ? 2 : 3 + s * 2; ctx.beginPath(); ctx.arc(-10 - s * 3, 0, 16, -1.15, 1.15); ctx.stroke(); }
          ctx.restore(); ctx.globalAlpha = 1;
        } else if (m.k === 'storm') {
          var sf = m.t > m.life - 0.4 ? (m.life - m.t) / 0.4 : 1;
          for (k = 0; k < 4; k++) {
            var ba = m.t * 7 + k * Math.PI / 2, bx = P.x + Math.cos(ba) * 26, by = P.y - 6 + Math.sin(ba) * 18;
            ctx.save(); ctx.translate(bx, by); ctx.rotate(ba + Math.PI / 2); ctx.globalAlpha = sf;
            ctx.strokeStyle = 'rgba(77, 238, 234, 0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 4, 8, -2.4, -0.7); ctx.stroke();
            ctx.strokeStyle = '#eef6ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 4, 8, -2.4, -0.7); ctx.stroke();
            ctx.restore();
          }
          ctx.globalAlpha = sf * 0.35; ctx.strokeStyle = '#8aa4c8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(P.x, P.y - 6, 26, 18, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        } else if (m.k === 'abyss') {
          if (!m.struck) {   // 모이는 심연(검은 보랏빛 소용돌이)
            var gq = m.t / 0.25; ctx.save(); ctx.translate(P.x, P.y - 12); ctx.rotate(m.t * 12);
            for (k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.fillStyle = k % 2 ? 'rgba(176, 144, 240, 0.7)' : 'rgba(30, 8, 50, 0.8)'; ctx.fillRect(18 * (1 - gq), -1, 6, 2); }
            ctx.restore();
          } else if (m.t < 0.9) {
            var af = 1 - (m.t - 0.25) / 0.65; ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a); ctx.globalAlpha = Math.max(0, af);
            // 심연 참격: 앞으로 넓어지는 보랏빛 칼날 부채 + 끝의 거대한 초승달 + 흰 칼심
            var reach = 140 * Math.min(1, (m.t - 0.25) * 7), fg = ctx.createLinearGradient && ctx.createLinearGradient(0, 0, 150, 0);
            if (fg && fg.addColorStop) { fg.addColorStop(0, 'rgba(176, 144, 240, 0.1)'); fg.addColorStop(0.6, 'rgba(90, 40, 170, 0.55)'); fg.addColorStop(1, 'rgba(30, 8, 60, 0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(reach, -24); ctx.quadraticCurveTo(reach + 14, 0, reach, 24); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill(); }
            for (w = 3; w >= 0; w--) { ctx.strokeStyle = w === 0 ? '#ffffff' : w === 1 ? '#efe4ff' : w === 2 ? 'rgba(176, 144, 240, 0.85)' : 'rgba(77, 238, 234, 0.45)'; ctx.lineWidth = w === 0 ? 2 : 3 + w * 2.5; ctx.beginPath(); ctx.arc(reach - 46, 0, 50, -0.62, 0.62); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(77, 238, 234, 0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(reach, -24); ctx.moveTo(0, 3); ctx.lineTo(reach, 24); ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -1, reach, 2);
            ctx.restore(); ctx.globalAlpha = 1;
          }
        } else if (m.k === 'guillo') {
          var dq = U.clamp(m.t / D.PLAYER.GUILLO_DELAY, 0, 1), top = m.y - 150 + 150 * U.easeOut(dq) * dq, gf = m.struck ? Math.max(0, 1 - (m.t - D.PLAYER.GUILLO_DELAY) / 0.6) : 1;
          ctx.globalAlpha = gf;
          ctx.fillStyle = 'rgba(176, 144, 240, ' + (0.15 + 0.15 * dq).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(m.x, m.y, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(77, 238, 234, 0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(m.x, m.y, 30 * (1.2 - dq * 0.2), 18 * (1.2 - dq * 0.2), 0, 0, Math.PI * 2); ctx.stroke();
          // 거대한 마법 대검(칼끝이 아래): 빛 기둥 + 칼날 + 가드
          var lg = ctx.createLinearGradient && ctx.createLinearGradient(0, top - 90, 0, top);
          if (lg && lg.addColorStop) { lg.addColorStop(0, 'rgba(176, 144, 240, 0)'); lg.addColorStop(1, 'rgba(176, 144, 240, 0.55)'); ctx.fillStyle = lg; ctx.fillRect(m.x - 10, top - 90, 20, 90); }
          ctx.fillStyle = '#efe4ff'; ctx.beginPath(); ctx.moveTo(m.x - 6, top - 70); ctx.lineTo(m.x + 6, top - 70); ctx.lineTo(m.x + 6, top - 8); ctx.lineTo(m.x, top); ctx.lineTo(m.x - 6, top - 8); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#b090f0'; ctx.fillRect(m.x - 1, top - 68, 2, 60);
          ctx.fillStyle = '#4deeea'; ctx.fillRect(m.x - 14, top - 76, 28, 4); ctx.fillStyle = '#5a3a90'; ctx.fillRect(m.x - 2, top - 92, 4, 16);
          ctx.globalAlpha = 1;
        } else if (m.k === 'strike') {
          var sq = 1 - m.t / m.life; ctx.globalAlpha = Math.max(0, sq);
          for (w = 3; w >= 1; w--) { ctx.strokeStyle = w === 3 ? 'rgba(120, 200, 255, 0.5)' : (w === 2 ? '#cfe8ff' : '#ffffff'); ctx.lineWidth = w * 2; ctx.beginPath(); ctx.moveTo(m.x + 4, m.y - 160); for (k = 1; k <= 7; k++) ctx.lineTo(m.x + Math.sin(m.x + k * 11) * 7, m.y - 160 + k * 23); ctx.stroke(); }
          ctx.globalAlpha = 1;
        } else if (m.k === 'bolt') {
          var q = m.t / 0.32;
          if (!m.struck) { ctx.strokeStyle = 'rgba(255, 240, 140, ' + (0.4 + 0.5 * q).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(m.x, m.y - 4, 16 - 10 * q, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(255, 240, 140, 0.25)'; ctx.beginPath(); ctx.arc(m.x, m.y - 4, 16 - 10 * q, 0, Math.PI * 2); ctx.fill(); }
          else if (m.t < 0.6) {
            var f2 = 1 - (m.t - 0.32) / 0.28; ctx.globalAlpha = Math.max(0, f2);
            var top2 = m.y - 200, x0 = m.x, pts = [[x0, top2]]; var seed = Math.floor(m.x * 7 + m.y);
            for (k = 1; k <= 8; k++) pts.push([x0 + Math.sin(seed + k * 12.9) * 8, top2 + k * 25]);
            pts[pts.length - 1] = [m.x, m.y - 4];
            for (w = 3; w >= 1; w--) { ctx.strokeStyle = w === 3 ? 'rgba(255, 230, 102, 0.45)' : (w === 2 ? '#fff3a0' : '#ffffff'); ctx.lineWidth = w * 2; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]); ctx.stroke(); }
            ctx.globalAlpha = 1;
          }
        }
      }
      void t;
    }
  };
})(window);
