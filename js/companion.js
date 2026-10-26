/* ==========================================================================
   companion.js — v83 《몬스터 헌터》 영혼 수렵 파트너(MG.Companion): 🐺 영혼 설원늑대 / 🦅 폭풍의 영혼매 — 버튼 없이 스스로 협동한다.
     · 해금: 잿빛 사냥꾼 카일에게서(대화 바 [기능 실행]) · 늑대 ↔ 매 전환: 카일 대화 또는 📜 장비 창
     · 평소: 사냥꾼 뒤를 따라다니며 호위 — 몇 초마다 90px 안의 적을 할퀴어 견제(작은 피해)
     · 합동 일격: 사냥꾼의 홀드 강공격(진 모아베기 · 발도 일섬 · 실드 배쉬 · 비전 단두대)이나 상쇄가 적중하는 순간
       파트너가 함께 돌진해 꽂는다 — 부위 내구도 30 추가 + 늑대는 출혈 · 매는 기절
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;

  var Comp = MG.Companion = {
    pet: null, joints: 0,
    state: function () { var S = MG.S; S.companion = S.companion || { unlocked: false, kind: 'wolf' }; return S.companion; },
    unlocked: function () { return !!this.state().unlocked; },
    def: function () { return D.COMPANIONS[this.state().kind] || D.COMPANIONS.wolf; },
    unlock: function (kind) {
      var st = this.state(), was = st.unlocked; st.unlocked = true; if (kind) st.kind = kind;
      this.spawn();
      var d = this.def(), P = MG.Player;
      if (MG.FX) { MG.FX.flash('#8ae8f8', 0.12); MG.FX.burst(this.pet.x, this.pet.y - 10, 26, ['#8ae8f8', '#eef6ff', '#4deeea'], 100, { up: true, g: -30 }); MG.FX.text(P.x, P.y - 44, d.icon + ' ' + d.name + '!', '#bff6ff', 1.4, 13, { pop: true }); }
      if (MG.UI) MG.UI.ribbon(d.icon + ' 영혼 수렵 파트너 — ' + d.name, 2400);
      MG.emit('companion', st.kind, !was);
      if (MG.Save) MG.Save.save();
      return true;
    },
    setKind: function (kind) { if (!D.COMPANIONS[kind] || !this.unlocked()) return false; this.state().kind = kind; var old = this.pet; this.spawn(); if (old && this.pet) { this.pet.x = old.x; this.pet.y = old.y; } if (MG.FX && this.pet) MG.FX.ring(this.pet.x, this.pet.y - 8, 3, 22, 0.4, '#8ae8f8', 2); if (MG.Save) MG.Save.save(); return true; },
    /* 맵에 들어설 때 사냥꾼 곁에 */
    spawn: function () {
      if (!this.unlocked()) { this.pet = null; return null; }
      var P = MG.Player, d = this.def();
      this.pet = { kind: this.state().kind, x: P.x - P.fx * 16 - 10, y: P.y - P.fy * 16 + 6, vx: 0, vy: 0, mode: 'follow', t: 0, cd: 1.5, jcd: 0, target: null, face: 1, anim: 0, z: d.fly ? 14 : 0, hitDone: false, joint: false };
      return this.pet;
    },
    update: function (dt) {
      if (!this.unlocked()) { this.pet = null; return; }
      if (!this.pet || this.pet.kind !== this.state().kind) this.spawn();
      var p = this.pet, P = MG.Player, d = this.def(), W = MG.World;
      p.anim += dt; p.t += dt; p.cd = Math.max(0, p.cd - dt); p.jcd = Math.max(0, p.jcd - dt);
      if (U.dist(p.x, p.y, P.x, P.y) > 260) { p.x = P.x - 16; p.y = P.y + 6; p.mode = 'follow'; }   // 너무 멀어지면 영혼처럼 곁으로
      if (p.mode === 'follow') {
        var side = Math.sin(p.anim * 0.7) * 6, tx = P.x - P.fx * 20 + P.fy * 12 + side, ty = P.y - P.fy * 16 - P.fx * 8 + 4, dx = tx - p.x, dy = ty - p.y, dd = Math.sqrt(dx * dx + dy * dy);
        if (dd > 6) { var sp = Math.min(d.speed * (dd > 60 ? 1.6 : 1), dd * 6); p.vx = dx / dd * sp; p.vy = dy / dd * sp; } else { p.vx *= 0.7; p.vy *= 0.7; }
        if (Math.abs(p.vx) > 4) p.face = p.vx < 0 ? -1 : 1;
        if (p.cd <= 0 && P.alive()) { var e = MG.Combat.nearest(P.x, P.y, 90); if (e) { p.mode = 'dash'; p.target = e; p.t = 0; p.hitDone = false; p.joint = false; } else p.cd = 0.6; }
      } else if (p.mode === 'dash') {
        var e2 = p.target;
        if (!e2 || !e2.alive || p.t > 1.2) { p.mode = 'follow'; p.cd = d.every; }
        else {
          var ex = e2.x - p.x, ey = e2.y - p.y, ed = Math.sqrt(ex * ex + ey * ey) || 1, spd = d.speed * (p.joint ? 4.2 : 2.6);
          p.vx = ex / ed * spd; p.vy = ey / ed * spd; p.face = ex < 0 ? -1 : 1;
          if (MG.FX && Math.random() < 0.5) MG.FX.burst(p.x, p.y - 6 - p.z, 1, ['#8ae8f8', '#eef6ff'], 20, { g: 0 });
          if (!p.hitDone && ed < e2.r + 8) { p.hitDone = true; this.strike(e2, p.joint); p.mode = 'back'; p.t = 0; p.cd = d.every; }
        }
      } else if (p.mode === 'back') { p.vx *= 0.8; p.vy *= 0.8; if (p.t > 0.25) p.mode = 'follow'; }
      var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (d.fly) { p.x = U.clamp(nx, 8, W.W - 8); p.y = U.clamp(ny, 8, W.H - 8); }   // 매는 날아서 벽을 넘는다
      else { var q = W.resolve(nx, ny, 4); p.x = q.x; p.y = q.y; }
    },
    /* 파트너의 일격(평소 견제 / 합동 일격) */
    strike: function (e, joint) {
      var d = this.def(), C = MG.Combat, FX = MG.FX, n = Math.max(1, Math.round(C.attackPower() * (joint ? d.atk * 1.8 : d.atk)));
      var res = e.hurt({ dmg: n, part: joint ? d.joint.part : 0, kind: 'pet', dot: !joint, stun: joint && d.joint.stun ? d.joint.stun : 0, kx: e.x - this.pet.x, ky: e.y - this.pet.y, knock: joint ? 0.8 : 0.3 });
      if (joint && e.alive && d.joint.bleed) e.bleed = { t: 3, dps: d.joint.bleed };
      if (FX) {
        FX.text(e.x + 10, e.y - (e.hy || 8) - 14, joint ? d.icon + ' 합동 일격! ' + n : String(n), joint ? '#bff6ff' : '#8ae8f8', joint ? 1.1 : 0.5, joint ? 13 : 10, joint ? { pop: true } : null);
        FX.burst(e.x, e.y - (e.hy || 8), joint ? 20 : 6, ['#8ae8f8', '#eef6ff', '#ffffff'], joint ? 130 : 60);
        if (joint) { FX.ring(e.x, e.y - 4, 3, 26, 0.35, '#8ae8f8', 2); if (this.pet.kind === 'wolf') FX.slash(e.x, e.y - 10, 0.6, '#eef6ff'); else FX.spark(e.x, e.y - 12, 3); }
      }
      if (joint) { this.joints++; MG.S.joints = (MG.S.joints || 0) + 1; MG.emit('joint', e); }
      return res;
    },
    /* 사냥꾼의 홀드 강공격 · 상쇄가 적중했다 — 함께 돌진(1.2초에 한 번) */
    joint: function (e) {
      var p = this.pet; if (!p || !e || !e.alive || p.jcd > 0) return false;
      p.jcd = 1.2; p.mode = 'dash'; p.target = e; p.t = 0; p.hitDone = false; p.joint = true;
      if (MG.FX) MG.FX.ghost({ x: p.x, y: p.y, dir: 'right', a: 0.0, sil: 'cyan' });
      return true;
    },
    collect: function (list, cam) { var p = this.pet; if (!p) return; if (p.x < cam.x - 30 || p.x > cam.x + MG.VW + 30 || p.y < cam.y - 30 || p.y > cam.y + MG.VH + 40) return; list.push({ y: p.y, o: p, f: drawPet }); }
  };
  function drawPet(ctx, p, t) {
    var S = MG.Sprites, d = D.COMPANIONS[p.kind], z = d.fly ? 14 + Math.sin(t * 3) * 3 : 0, f = Math.floor(t * (p.mode === 'follow' ? 6 : 10)) % 2;
    if (MG.World.groundShadow) MG.World.groundShadow(ctx, p.x, p.y + 1, d.fly ? 5 : 7, 2.2, 0.22);
    var g = ctx.createRadialGradient && ctx.createRadialGradient(p.x, p.y - 8 - z, 1, p.x, p.y - 8 - z, 16);
    if (g && g.addColorStop) { g.addColorStop(0, 'rgba(138, 232, 248, 0.32)'); g.addColorStop(1, 'rgba(138, 232, 248, 0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 16, p.y - 24 - z, 32, 32); }
    ctx.globalAlpha = 0.86;
    if (S && S.ready('rb') && S.item('rb', d.sprite + '_' + f)) S.draw(ctx, 'rb', d.sprite + '_' + f, p.x, p.y - z, p.face < 0);
    else { ctx.fillStyle = '#8ae8f8'; ctx.fillRect(Math.round(p.x - 6), Math.round(p.y - 10 - z), 12, 9); }
    ctx.globalAlpha = 1;
  }
  Comp.drawPet = drawPet;
})(window);
