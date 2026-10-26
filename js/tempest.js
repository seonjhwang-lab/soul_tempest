/* ==========================================================================
   tempest.js — v83 《몬스터 헌터》 기상 이변 「🌑 붉은 폭풍의 밤(Blood Tempest)」과 필드 난입 괴수(MG.Tempest)
     · 필드에서 5분마다(또는 선대 사냥꾼의 망령에게 부탁하면 곧바로) 하늘이 붉은 폭풍우로 물든다 — 붉은 비 · 번개 섬광 · 핏빛 하늘
     · 폭풍이 시작되고 잠시 뒤 사냥꾼 둘레의 빈 땅에 「광포한 파멸수 라가르」가 난입한다(필드 보스 — 보스 바 · 2페이즈 각성 그대로)
     · 쓰러뜨리면 폭풍이 걷히고 대량의 골드 · 파멸수의 뇌각(천상제일검 각성 의식 재료) · 심연의 정수 · (처음 한 번) 사신수의 혼석
     · 3분 안에 쓰러뜨리지 못하고 싸우고 있지도 않으면 라가르는 폭풍과 함께 떠난다. 필드를 떠나도 폭풍은 걷힌다.
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;

  var T = MG.Tempest = {
    on: false, t: 0, timer: 0, flashT: 0, wins: 0,
    reset: function () { this.on = false; this.t = 0; this.flashT = 0; if (MG.Bosses) MG.Bosses.invader = null; },
    update: function (dt) {
      var W = MG.World, C = D.TEMPEST;
      if (!W.isField()) { if (this.on) this.end(false, true); return; }
      if (!this.on) { this.timer += dt; if (this.timer >= C.every && !(MG.Bosses.active && MG.Bosses.active())) this.start(); return; }
      this.t += dt; this.flashT = Math.max(0, this.flashT - dt);
      if (Math.random() < dt * 0.35) { this.flashT = 0.18; if (MG.FX) MG.FX.shake(1.5, 0.15); }
      var B = MG.Bosses.invader;
      if (!B && this.t >= C.spawn) this.spawn();
      else if (B && !B.alive) { if (B.deadT > 2.2) this.end(true); }
      else if (B && this.t > C.life && !B.engaged) this.end(false);
    },
    start: function () {
      if (this.on || !MG.World.isField()) return false;
      this.on = true; this.t = 0; this.timer = 0; this.flashT = 0.3;
      if (MG.FX) { MG.FX.flash('#a0101a', 0.25); MG.FX.shake(3, 0.4); }
      if (MG.SFX) MG.SFX.crash();
      if (MG.UI) MG.UI.ribbon('🌑 붉은 폭풍의 밤 — 무언가가 다가온다…', 2600);
      MG.emit('tempest', true);
      return true;
    },
    /* 사냥꾼 둘레 120~170px 의 막히지 않은 땅에 라가르를 */
    spawn: function () {
      var P = MG.Player, W = MG.World, spot = null;
      for (var k = 0; k < 24 && !spot; k++) { var a = k * 0.83, r = 120 + (k % 3) * 25, x = U.clamp(P.x + Math.cos(a) * r, 40, W.W - 40), y = U.clamp(P.y + Math.sin(a) * r, 40, W.H - 40); if (!W.blocked(x, y, 22)) spot = [x, y]; }
      if (!spot) spot = [P.x, P.y - 120];
      var def = {}; for (var q in D.RAGAR) def[q] = D.RAGAR[q]; def.home = [Math.round(spot[0]), Math.round(spot[1])];
      var b = new MG.Bosses.Boss(def); MG.Bosses.invader = b; b.engage();
      if (MG.FX) { MG.FX.flash('#ff3a2a', 0.2); MG.FX.shake(6, 0.5); MG.FX.ring(b.x, b.y - 10, 6, 70, 0.7, '#ff5a3a', 4); MG.FX.burst(b.x, b.y - 20, 50, ['#ff3a2a', '#1a0608', '#ffd866', '#ffffff'], 190); MG.FX.pillar(b.x, b.y, '#ff5a3a', 'bolt'); }
      if (MG.UI) MG.UI.ribbon('⚠️ 난입! — ' + D.RAGAR.name, 2600);
      MG.emit('invader', b);
      return b;
    },
    end: function (won, quiet) {
      var B = MG.Bosses.invader, S = MG.S;
      this.on = false; this.t = 0; this.timer = 0;
      if (won) {
        this.wins++; S.ragarKills = (S.ragarKills || 0) + 1;
        if (S.ragarKills === 1 && MG.Game.gainRelic) MG.Game.gainRelic('soulstone');
        if (MG.UI && !quiet) MG.UI.ribbon('🌅 붉은 폭풍이 걷혔다 — 파멸수 토벌!', 2400);
      } else if (MG.UI && !quiet) MG.UI.ribbon('🌫️ 붉은 폭풍이 걷혔다 — 라가르가 떠났다', 2200);
      if (B && B.alive) B.alive = false;
      MG.Bosses.invader = null;
      MG.emit('tempest', false);
      return true;
    },
    /* 화면 좌표: 핏빛 하늘 + 비스듬한 붉은 비 + 번개 섬광 */
    drawSky: function (g, cam, t) {
      if (!this.on) return false;
      var a = Math.min(1, this.t / 1.5), i, n = Math.round(90 * Math.max(1, MG.W * MG.H / (360 * 640)));
      g.fillStyle = 'rgba(90, 6, 14, ' + (0.26 * a).toFixed(3) + ')'; g.fillRect(0, 0, MG.W, MG.H);
      var sk = g.createLinearGradient && g.createLinearGradient(0, 0, 0, MG.H * 0.5);
      if (sk && sk.addColorStop) { sk.addColorStop(0, 'rgba(40, 0, 6, ' + (0.45 * a).toFixed(3) + ')'); sk.addColorStop(1, 'rgba(40, 0, 6, 0)'); g.fillStyle = sk; g.fillRect(0, 0, MG.W, MG.H * 0.5); }
      g.strokeStyle = 'rgba(255, 110, 110, ' + (0.35 * a).toFixed(2) + ')'; g.lineWidth = 1; g.beginPath();
      for (i = 0; i < n; i++) { var sp = 420 + (i % 5) * 60, ph = (t * sp + i * 131) % (MG.H + 80), x = (((i * 97 - cam.x * 2 + ph * 0.35) % (MG.W + 40)) + MG.W + 40) % (MG.W + 40) - 20, y = ph - 40; g.moveTo(Math.round(x), Math.round(y)); g.lineTo(Math.round(x - 5), Math.round(y + 14)); }
      g.stroke();
      if (this.flashT > 0) { g.fillStyle = 'rgba(255, 220, 220, ' + (this.flashT * 1.6).toFixed(2) + ')'; g.fillRect(0, 0, MG.W, MG.H); }
      return true;
    }
  };
})(window);
