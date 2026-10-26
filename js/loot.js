/* ==========================================================================
   loot.js — 실물 전리품: 쓰러진 자리에서 '툭' 튀어나와 통통 튀고, 가까이 가면 자석처럼 빨려 들어온다.
   보스 소재는 황금 빛기둥과 반짝임으로 멀리서도 보인다. 죽은 자리에는 핏자국(잃어버린 골드)이 남는다 — 밟으면 회수.
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;

  var Loot = MG.Loot = {
    list: [],
    reset: function () { this.list = []; },
    drop: function (x, y, kind, id, n, o) {
      o = o || {};
      var a = Math.random() * Math.PI * 2, sp = o.fountain ? 40 + Math.random() * 70 : 20 + Math.random() * 30;
      var it = { kind: kind, id: id, n: n || 1, x: x, y: y, z: 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: o.fountain ? 120 + Math.random() * 90 : 70 + Math.random() * 40, t: 0, boss: !!o.boss, wait: !!o.wait };   // v85 wait = 보스 마지막 일격 슬로모션이 끝나면 터져 나온다
      this.list.push(it);
      return it;
    },
    blood: function (x, y, gold) { this.list = this.list.filter(function (i) { return i.kind !== 'blood'; }); if (gold > 0) this.list.push({ kind: 'blood', n: gold, x: x, y: y, z: 0, vx: 0, vy: 0, vz: 0, t: 0 }); },
    frame: 0,
    update: function (dt) {
      var P = MG.Player; this.frame++;
      for (var i = this.list.length - 1; i >= 0; i--) {
        var it = this.list[i];
        if (it.wait) { if (MG.FX && MG.FX.finT > 0) continue; it.wait = false; if (MG.FX && this.burstF !== this.frame) { this.burstF = this.frame; MG.FX.burst(it.x, it.y - 6, 36, ['#ffd866', '#fff6c0', '#ffffff', '#ffb238'], 170, { up: true }); MG.FX.ring(it.x, it.y, 4, 34, 0.4, '#ffd866', 2); } }   // v85 전리품 분수
        it.t += dt;
        if (it.kind === 'blood') { if (P.alive() && U.dist(P.x, P.y, it.x, it.y) < 12) { MG.S.gold += it.n; MG.S.blood = null; if (MG.FX) MG.FX.text(P.x, P.y - 32, '🩸 골드 회수 +' + it.n, '#ffd866', 1.2, 12); this.list.splice(i, 1); } continue; }
        if (it.z > 0 || it.vz > 0) { it.vz -= 380 * dt; it.z += it.vz * dt; it.x += it.vx * dt; it.y += it.vy * dt; if (it.z <= 0) { it.z = 0; if (it.vz < -40) { it.vz *= -0.45; } else it.vz = 0; it.vx *= 0.55; it.vy *= 0.55; } }
        var d = U.dist(P.x, P.y - 4, it.x, it.y);
        if (it.t > 0.45 && P.alive() && d < (it.boss ? 70 : 48)) { var s = Math.min(260, 90 + (it.t - 0.45) * 260), l = d || 1; it.x += (P.x - it.x) / l * s * dt; it.y += (P.y - 4 - it.y) / l * s * dt; }
        if (it.t > 0.45 && d < 8) { this.pick(it); this.list.splice(i, 1); }
      }
    },
    pick: function (it) {
      var P = MG.Player, S = MG.S;
      if (it.kind === 'gold') { S.gold += it.n; if (MG.FX) MG.FX.text(P.x + 6, P.y - 26, '+' + it.n, '#ffd866', 0.5, 9); }
      else if (it.kind === 'mat') {
        S.mats[it.id] = (S.mats[it.id] || 0) + it.n; var m = D.MATS[it.id];
        if (MG.FX) MG.FX.text(P.x, P.y - 34, '+' + m.emo + ' ' + m.name + (it.n > 1 ? ' ×' + it.n : ''), it.boss ? '#ffd866' : '#e8f4ff', it.boss ? 1.6 : 0.9, it.boss ? 13 : 10, { pop: it.boss });
        if (it.boss && MG.UI && MG.UI.ribbon) MG.UI.ribbon('✨ ' + m.emo + ' ' + m.name + ' 획득!', 2000);
      }
      if (MG.Audio && MG.Audio.playReward && it.boss) try { MG.Audio.playReward(); } catch (e) { /* 무음 */ }
      MG.emit('pickup', it);
    },
    collect: function (list, cam) {
      for (var i = 0; i < this.list.length; i++) { var it = this.list[i]; if (it.wait) continue; if (it.x < cam.x - 20 || it.x > cam.x + MG.VW + 20 || it.y < cam.y - 20 || it.y > cam.y + MG.VH + 20) continue; list.push({ y: it.y, o: it, f: drawItem }); }
    }
  };
  function drawItem(ctx, it, t) {
    var S = MG.Sprites;
    if (it.kind === 'blood') { if (S && S.ready('rb')) S.draw(ctx, 'rb', 'bloodstain', it.x, it.y + 4); if (Math.floor(t * 4) % 2) { ctx.fillStyle = '#ffd866'; ctx.fillRect(Math.round(it.x), Math.round(it.y - 2), 1, 1); } return; }
    if (it.boss) {
      var g = 0.5 + 0.5 * Math.sin(t * 5);
      var lg = ctx.createLinearGradient && ctx.createLinearGradient(0, it.y - 60, 0, it.y);
      if (lg && lg.addColorStop) { lg.addColorStop(0, 'rgba(255, 216, 102, 0)'); lg.addColorStop(1, 'rgba(255, 216, 102, ' + (0.35 + 0.2 * g).toFixed(2) + ')'); ctx.fillStyle = lg; ctx.fillRect(Math.round(it.x - 5), Math.round(it.y - 60), 10, 60); }
      ctx.strokeStyle = 'rgba(255, 230, 140, ' + (0.4 + 0.4 * g).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(it.x, it.y, 9 + g * 2, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; ctx.beginPath(); ctx.ellipse(Math.round(it.x), Math.round(it.y + 1), 4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    var ic = it.kind === 'gold' ? 'gold' : D.MATS[it.id].ic, sc = it.kind === 'gold' ? 0.55 : (it.boss ? 1 : 0.72), bob = it.z > 0 ? 0 : Math.sin(t * 4 + it.x) * 1;
    if (S && S.ready('icons')) S.draw(ctx, 'icons', ic, it.x - 8 * sc, it.y - it.z - 2 - 16 * sc + bob, false, sc);   // icons 시트는 왼쪽 위 기준
    else { ctx.fillStyle = it.kind === 'gold' ? '#ffd866' : '#8ae8f8'; ctx.fillRect(Math.round(it.x - 2), Math.round(it.y - it.z - 6), 4, 4); }
    if (Math.floor(t * 3 + it.x) % 5 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(it.x + 3), Math.round(it.y - it.z - 9), 1, 1); }
  }
})(window);
