/* ==========================================================================
   enemy.js — 필드/던전 몬스터 7종(이끼 슬라임 · 수정 슬라임 · 가시 임프 · ❄️설원 늑대 · ❄️얼음 정령 · 🌋용암 골렘 · 🌋화산 도마뱀) ·
              던전 전실의 정예 수문장(큰 금빛 변종 — 쓰러뜨리면 봉인문이 열린다) · 적 투사체(MG.Shots) · 바닥 위험 지대(냉기 장판 등)
   공격은 언제나 "보이는" 예고 뒤에 온다: 붉게 번쩍이며 땅에 공격 길(빨간 띠/원)이 그려지고, 그다음 판정 — 보고 피하는 전투.
   절대영도 눈보라 · 서리 무기에 맞으면 둔화(slowT): 그동안 모든 움직임과 예고가 느려진다.
   화톳불에서 쉬면 모두 되살아난다(다크 소울).
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, U = MG.U, D = MG.Data;

  /* ---------------------------------------------------------------- 적 투사체(수정 파편 · 가시 · 얼음 · 회오리 · 폭풍구) + 바닥 위험 지대 */
  var Shots = MG.Shots = {
    list: [], zones: [],
    reset: function () { this.list = []; this.zones = []; },
    fire: function (x, y, ang, speed, dmg, kind, life, opt) {
      var s = { x: x, y: y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, a: ang, sp: speed, dmg: dmg, kind: kind || 'shard', life: life || 2.2, t: 0, r: kind === 'thorn' ? 4 : kind === 'tornado' ? 8 : kind === 'orb' ? 5 : kind === 'darkwave' ? 8 : 3 };
      if (opt) for (var k in opt) s[k] = opt[k];
      this.list.push(s); return s;
    },
    /* 바닥 위험 지대: { x, y, r, life, dmg(틱마다), slow } — 위에 서 있으면 0.5초마다 피해 */
    zone: function (x, y, r, life, dmg, kind) { this.zones.push({ x: x, y: y, r: r, life: life, t: 0, dmg: dmg, kind: kind || 'frost', tick: 0 }); },
    update: function (dt) {
      var P = MG.Player, i;
      for (i = this.list.length - 1; i >= 0; i--) {
        var s = this.list[i]; s.t += dt;
        if (s.home && P.alive()) { var want = Math.atan2(P.y - 6 - s.y, P.x - s.x), cur = Math.atan2(s.vy, s.vx), d = U.angDiff(cur, want), na = cur + U.clamp(d, -s.home * dt, s.home * dt); s.vx = Math.cos(na) * s.sp; s.vy = Math.sin(na) * s.sp; s.a = na; }
        s.x += s.vx * dt; s.y += s.vy * dt;
        var dead = s.t > s.life || (s.kind !== 'tornado' && MG.World.blocked(s.x, s.y, 1));
        if (!dead && P.alive() && U.dist(s.x, s.y, P.x, P.y - 8) < s.r + 6) { var r = P.hurt(s.dmg, s); if (r === 'hit' || r === 'guard' || r === null) dead = s.kind !== 'tornado' || r === 'guard'; if (r === 'hit' && s.slow) P.slowT = Math.max(P.slowT || 0, s.slow); }
        if (dead) { if (MG.FX) MG.FX.burst(s.x, s.y, 4, s.kind === 'thorn' ? ['#ff7a8a', '#8a3e34'] : s.kind === 'ice' ? ['#e4fdff', '#8ae8f8'] : s.kind === 'orb' || s.kind === 'tornado' ? ['#9ad8ff', '#eef6ff'] : ['#c4a8ff', '#e4fdff'], 40); this.list.splice(i, 1); }
      }
      for (i = this.zones.length - 1; i >= 0; i--) {
        var z = this.zones[i]; z.t += dt; z.tick -= dt;
        if (z.t > 0.35 && z.tick <= 0 && P.alive() && U.dist(z.x, z.y, P.x, P.y) < z.r + P.r) { z.tick = 0.5; var rr = P.hurt(z.dmg, z, { knock: 20, noKnock: true }); if (rr === 'hit' && z.kind === 'frost') P.slowT = Math.max(P.slowT || 0, 0.8); }
        if (z.t > z.life) this.zones.splice(i, 1);
      }
    },
    drawGround: function (ctx, t) {
      for (var i = 0; i < this.zones.length; i++) {
        var z = this.zones[i], f = z.t < 0.35 ? z.t / 0.35 : (z.t > z.life - 0.4 ? Math.max(0, (z.life - z.t) / 0.4) : 1);
        ctx.globalAlpha = f;
        if (z.kind === 'frost') { ctx.fillStyle = 'rgba(170, 230, 255, 0.35)'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(230, 250, 255, 0.85)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#ffffff'; for (var k = 0; k < 6; k++) { var a = k * 1.05 + t * 0.3; ctx.fillRect(Math.round(z.x + Math.cos(a) * z.r * 0.6), Math.round(z.y + Math.sin(a) * z.r * 0.35), 2, 1); } }
        else if (z.kind === 'poison') { ctx.fillStyle = 'rgba(150, 230, 70, 0.32)'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(210, 255, 140, 0.8)'; for (var pk = 0; pk < 5; pk++) { var pa = pk * 1.26 + t * 0.9; ctx.fillRect(Math.round(z.x + Math.cos(pa) * z.r * 0.5), Math.round(z.y + Math.sin(pa) * z.r * 0.3 - (t * 8 + pk * 3) % 6), 1, 2); } }   // v82 맹독의 고대 거목: 독 웅덩이
        else { ctx.fillStyle = 'rgba(255, 90, 30, 0.3)'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.62, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    },
    draw: function (ctx, t) {
      for (var i = 0; i < this.list.length; i++) {
        var s = this.list[i];
        ctx.save(); ctx.translate(Math.round(s.x), Math.round(s.y)); ctx.rotate(s.a);
        if (s.kind === 'thorn') { ctx.fillStyle = '#5e2a2a'; ctx.fillRect(-5, -1, 9, 3); ctx.fillStyle = '#ff7a8a'; ctx.fillRect(2, -1, 3, 3); ctx.fillStyle = '#e8c8a0'; ctx.fillRect(4, 0, 2, 1); }
        else if (s.kind === 'ice') { ctx.fillStyle = 'rgba(170, 230, 255, 0.5)'; ctx.fillRect(-7, -1, 6, 3); ctx.fillStyle = '#bff6ff'; ctx.fillRect(-2, -2, 6, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(2, -1, 3, 2); }
        else if (s.kind === 'tornado') {
          ctx.rotate(-s.a);
          for (var k = 0; k < 4; k++) { var w = 4 + k * 2.2, y = -k * 5, sp = (t || 0) * 14 + k; ctx.strokeStyle = k % 2 ? 'rgba(238, 246, 255, 0.85)' : 'rgba(77, 238, 234, 0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(Math.sin(sp) * 1.5, y, w, 2, 0, 0, Math.PI * 2); ctx.stroke(); }
        } else if (s.kind === 'orb') { ctx.fillStyle = 'rgba(154, 216, 255, 0.45)'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#eef6ff'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); }
        else if (s.kind === 'darkwave') {   // v83 기사왕의 흑염 검기: 검은 초승달 + 보랏빛 · 붉은 불꽃 테
          for (var dw = 3; dw >= 0; dw--) { ctx.strokeStyle = dw === 0 ? '#ffffff' : dw === 1 ? '#ff6a3a' : dw === 2 ? 'rgba(176, 144, 240, 0.85)' : 'rgba(20, 6, 30, 0.8)'; ctx.lineWidth = dw === 0 ? 1 : 2 + dw * 1.5; ctx.beginPath(); ctx.arc(-6 - dw, 0, 9, -1.1, 1.1); ctx.stroke(); }
        }
        else { ctx.fillStyle = 'rgba(196, 168, 255, 0.5)'; ctx.fillRect(-7, -2, 6, 4); ctx.fillStyle = '#c4a8ff'; ctx.fillRect(-2, -2, 6, 4); ctx.fillStyle = '#efe4ff'; ctx.fillRect(1, -1, 3, 2); }
        ctx.restore();
      }
    }
  };

  /* ---------------------------------------------------------------- 몬스터 하나 */
  function Mob(type, x, y, opt) {
    var d = D.ENEMIES[type], E = D.ELITE;
    opt = opt || {};
    this.type = type; this.def = d; this.x = x; this.y = y; this.hx = x; this.hy0 = y; this.r = d.r; this.hy = 7;
    this.hp = d.hp; this.maxHp = d.hp; this.alive = true; this.state = 'idle'; this.st = Math.random() * 2; this.vx = 0; this.vy = 0;
    this.ax = 0; this.ay = 1; this.hitDone = false; this.cd = 0; this.flash = 0; this.anim = Math.random() * 3; this.wanderA = Math.random() * 6.28; this.deadT = 0;
    this.elite = !!opt.elite; this.gate = opt.gate || null; this.scale = 1; this.dmgMul = 1; this.slowT = 0;
    if (this.elite) { this.hp = this.maxHp = Math.round(d.hp * E.hp); this.scale = E.scale; this.r = Math.round(d.r * E.r); this.dmgMul = E.dmg; this.hy = 12; this.name = '정예 수문장 · ' + d.name; }
  }
  /* v82: 정예 수문장의 근접 타격은 누가 때렸는지 알린다(상쇄 판정) */
  Mob.prototype.hitP = function (dmg, src, opt) { var C = MG.Combat; C.attacker = this.elite ? this : null; try { return MG.Player.hurt(dmg, src, opt); } finally { C.attacker = null; } };
  /* v84 정면 방어: 바라보는 쪽 ±70° 에서 들어온 평타(1 · 2타)는 막는다(피해 20%) — 모아베기 · 3타 마무리 · 특수기 · 마법 · 등 뒤 타격은 뚫린다 */
  Mob.prototype.guards = function (o) {
    if (!this.def.guard || o.dot || o.kind !== 'melee' || (o.stage || 0) >= 2 || this.state === 'stun' || this.state === 'rec') return false;
    var l = Math.sqrt((o.kx || 0) * (o.kx || 0) + (o.ky || 0) * (o.ky || 0)) || 1, fx = this.fdx || 0, fy = this.fdy || 0;
    return (-(o.kx || 0) / l) * fx + (-(o.ky || 0) / l) * fy > 0.34;
  };
  Mob.prototype.hurt = function (o) {
    if (!this.alive) return null;
    if (this.guards(o)) {
      var gd = Math.max(1, Math.round(o.dmg * 0.2)); this.hp -= gd; this.flash = 0.05; this.guardT = 0.3;
      if (MG.FX) { MG.FX.text(this.x, this.y - 30 * this.scale, '🛡 방어!', '#c4ccd6', 0.6, 11); MG.FX.burst(this.x + this.fdx * this.r, this.y - 10 + this.fdy * 6, 10, ['#ffffff', '#ffd866', '#ff9a3c'], 90); }
      if (MG.Audio && MG.Audio.playShellClink) try { MG.Audio.playShellClink(); } catch (e) { /* 무음 */ }
      if (this.hp <= 0) this.die();
      return { dealt: gd, part: 0, blocked: true };
    }
    var dmg = o.dmg; this.hp -= dmg; this.flash = 0.12;
    if (!o.dot) {
      var l = Math.sqrt((o.kx || 0) * (o.kx || 0) + (o.ky || 0) * (o.ky || 0)) || 1, kb = this.elite ? 0.4 : 1;
      this.vx = (o.kx || 0) / l * 110 * (o.knock || 1) * kb; this.vy = (o.ky || 0) / l * 110 * (o.knock || 1) * kb;
      if (o.stun) { this.state = 'stun'; this.st = 0; this.stunT = o.stun * (this.elite ? 0.6 : 1); }
      else if (this.state !== 'atk' && this.state !== 'stun' && !(this.elite && this.state === 'wind')) { this.state = 'hurt'; this.st = 0; }   // v82: 기절(상쇄 경직 포함) 중에 맞아도 기절은 이어진다
      if (this.state === 'idle') this.state = 'chase';
      if (o.slow) this.slowT = Math.max(this.slowT, o.slow);
    }
    if (this.hp <= 0) this.die();
    return { dealt: dmg, part: 0 };
  };
  Mob.prototype.die = function () {
    this.alive = false; this.deadT = 0; this.hp = 0;
    var d = this.def, t = this.type;
    var cols = t === 'crystal' ? ['#c4a8ff', '#efe4ff', '#8ae8f8'] : t === 'imp' ? ['#ff7a8a', '#5e2a2a', '#ffb238'] : t === 'wolf' || t === 'wisp' ? ['#e4fdff', '#8ae8f8', '#ffffff'] : t === 'lgolem' || t === 'lizard' ? ['#ff7424', '#ffb238', '#2a2430'] : ['#8ad070', '#4fa854', '#d8ff9a'];
    if (MG.FX) MG.FX.burst(this.x, this.y - 6, this.elite ? 36 : 18, cols, this.elite ? 130 : 90);
    if (MG.Audio && MG.Audio.playEnemyDefeat) try { MG.Audio.playEnemyDefeat(); } catch (e) { /* 무음 */ }
    if (MG.Loot) {
      var g = d.gold[0] + Math.floor(Math.random() * (d.gold[1] - d.gold[0] + 1));
      MG.Loot.drop(this.x, this.y, 'gold', null, this.elite ? g * 6 : g);
      if (this.elite) { MG.Loot.drop(this.x, this.y, 'mat', d.mat, 3, { fountain: true }); MG.Loot.drop(this.x, this.y, 'mat', 'gold_ore', 1, { fountain: true }); }
      else if (Math.random() < 0.65) MG.Loot.drop(this.x, this.y, 'mat', d.mat, 1);
    }
    MG.emit('kill', this);
    if (this.elite) MG.emit('eliteDown', this);
  };
  Mob.prototype.update = function (rdt) {
    if (!this.alive) { this.deadT += rdt; return; }
    this.slowT = Math.max(0, this.slowT - rdt);
    var dt = this.slowT > 0 ? rdt * 0.45 : rdt;   // 둔화: 그동안 모든 것이 느려진다
    var P = MG.Player, d = this.def, dx = P.x - this.x, dy = P.y - this.y, dist = Math.sqrt(dx * dx + dy * dy) || 1, mx = 0, my = 0;
    this.st += dt; this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.cd = Math.max(0, this.cd - dt);
    MG.Combat.dot(this, dt);
    if (!this.alive) return;
    if (this.parryPending) MG.Combat.applyParry(this);   // v82 상쇄: 방패에 튕긴 정예의 공격 — 판정이 끝난 지금 경직
    var aggro = this.elite ? 400 : d.aggro;
    var seen = P.alive() && dist < aggro && !MG.Game.safeAt(P.x, P.y);
    var reach = this.r + (d.heavy ? 22 : d.dasher ? 44 : 26);
    this.guardT = Math.max(0, (this.guardT || 0) - dt);
    if (d.guard) {   // v84 정면을 사냥꾼 쪽으로 천천히 돌린다(구르기로 등 뒤를 잡을 수 있다)
      if (this.fdx === undefined) { this.fdx = dx / dist; this.fdy = dy / dist; }
      if (this.state === 'idle' || this.state === 'chase') { var fa = Math.atan2(this.fdy, this.fdx), ta = Math.atan2(dy, dx), dd = U.angDiff(fa, ta), turn = 2.2 * dt; fa += Math.max(-turn, Math.min(turn, dd)); this.fdx = Math.cos(fa); this.fdy = Math.sin(fa); }
    }
    switch (this.state) {
      case 'idle':
        if (seen) { this.state = 'chase'; this.st = 0; break; }
        if (U.dist(this.x, this.y, this.hx, this.hy0) > 40) { var hd = U.angle(this.x, this.y, this.hx, this.hy0); mx = Math.cos(hd) * 0.5; my = Math.sin(hd) * 0.5; }
        else if (Math.sin(this.anim * 0.8 + this.wanderA) > 0.6) { mx = Math.cos(this.wanderA) * 0.3; my = Math.sin(this.wanderA) * 0.3; if (this.st > 3) { this.wanderA += 2; this.st = 0; } }
        break;
      case 'chase':
        if (!P.alive() || dist > aggro * 1.8 || MG.Game.safeAt(P.x, P.y)) { this.state = 'idle'; this.st = 0; break; }
        if (d.ranged) {
          var want = dist < 58 ? -1 : (dist > 92 ? 1 : 0); mx = dx / dist * want; my = dy / dist * want;
          if (dist < 120 && this.cd <= 0) this.wind(dx, dy);
        } else if (d.flank && dist < 124 && dist > reach * 0.7 && this.cd <= 0) {   // v84 옆으로 돌아 들어가다(0.85초) 덮친다
          var sd = this.flankDir || (this.flankDir = Math.random() < 0.5 ? -1 : 1); this.flankT = (this.flankT || 0) + dt;
          var keep = dist > 74 ? 0.4 : -0.2; mx = -dy / dist * sd * 0.95 + dx / dist * keep; my = dx / dist * sd * 0.95 + dy / dist * keep;
          if (this.flankT > 0.85) { this.flankT = 0; this.flankDir = -sd; this.lunge = true; this.wind(dx, dy); }
        } else {
          mx = dx / dist; my = dy / dist;
          if (dist < reach && this.cd <= 0) this.wind(dx, dy);
        }
        break;
      case 'wind':
        if (this.st >= d.wind * (this.elite ? 1.15 : 1)) {
          if (d.ranged) {
            var n = this.elite ? 3 : 1, a0 = Math.atan2(this.ay, this.ax);
            for (var k = 0; k < n; k++) Shots.fire(this.x, this.y - 6, a0 + (k - (n - 1) / 2) * 0.28, 125, Math.round(d.dmg * this.dmgMul), d.shot || 'shard', 2.2, d.shot === 'ice' ? { slow: 0.8 } : null);
            this.state = 'rec'; this.st = 0; this.cd = 1.4;
          } else if (d.heavy) {   // 용암 골렘: 앞으로 두 팔 내려찍기(원형 판정)
            var sx = this.x + this.ax * (this.r + 12), sy = this.y + this.ay * (this.r + 12), R = 18 * this.scale;
            if (P.alive() && U.dist(sx, sy, P.x, P.y) < R + P.r) this.hitP(Math.round(d.dmg * this.dmgMul), { x: sx, y: sy }, { knock: 130 });
            if (MG.FX) { MG.FX.shake(2.5, 0.18); MG.FX.ring(sx, sy, 4, R, 0.3, '#ff9a3c', 2); MG.FX.burst(sx, sy, 14, ['#ff7424', '#ffb238', '#2a2430'], 100); }
            this.state = 'rec'; this.st = 0; this.cd = 1.3; this.slamT = 0.25;
          } else { this.state = 'atk'; this.st = 0; this.hitDone = false; var sp = this.lunge ? 290 : d.dasher ? 205 : 150; this.vx = this.ax * sp; this.vy = this.ay * sp; }
        }
        break;
      case 'atk':
        if (!this.hitDone && P.alive() && U.dist(this.x, this.y, P.x, P.y) < this.r + P.r + 3) { var r = this.hitP(Math.round(d.dmg * this.dmgMul), this); if (r) this.hitDone = true; if (r === 'guard') { this.state = 'stun'; this.st = 0; this.stunT = 0.6; this.vx = -this.ax * 60; this.vy = -this.ay * 60; } }
        if (this.state === 'atk' && this.st >= (this.lunge ? 0.36 : d.dasher ? 0.32 : 0.28)) { this.state = 'rec'; this.st = 0; this.cd = d.dasher ? 0.8 : 0.9; this.lunge = false; }
        break;
      case 'rec': this.vx *= 0.85; this.vy *= 0.85; this.slamT = Math.max(0, (this.slamT || 0) - dt); if (this.st >= 0.6) { this.state = 'chase'; this.st = 0; } break;
      case 'hurt': this.vx *= 0.86; this.vy *= 0.86; if (this.st >= 0.2) { this.state = 'chase'; this.st = 0; } break;
      case 'stun': this.vx *= 0.8; this.vy *= 0.8; if (this.st >= this.stunT) { this.state = 'chase'; this.st = 0; } break;
    }
    var vx = this.vx, vy = this.vy;
    if (this.state === 'idle' || this.state === 'chase') { vx = mx * d.speed; vy = my * d.speed; }
    var p = MG.World.resolve(this.x + vx * dt, this.y + vy * dt, this.r);
    this.x = p.x; this.y = p.y;
  };
  Mob.prototype.wind = function (dx, dy) { var l = Math.sqrt(dx * dx + dy * dy) || 1; this.ax = dx / l; this.ay = dy / l; this.state = 'wind'; this.st = 0; this.vx = 0; this.vy = 0; };
  /* 예고(땅) — y 정렬 전에 그린다 */
  Mob.prototype.drawWarn = function (ctx) {
    if (!this.alive || this.state !== 'wind') return;
    var d = this.def, q = U.clamp(this.st / (d.wind * (this.elite ? 1.15 : 1)), 0, 1);
    if (d.heavy) {
      var sx = this.x + this.ax * (this.r + 12), sy = this.y + this.ay * (this.r + 12), R = 18 * this.scale;
      ctx.fillStyle = 'rgba(255, 60, 60, ' + (0.12 + 0.2 * q).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 90, 90, 0.5)'; ctx.beginPath(); ctx.arc(sx, sy, R * q, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(Math.atan2(this.ay, this.ax));
    var len = d.ranged ? 120 : (d.dasher ? 64 : 42), w = d.ranged ? 4 : 12 * (this.elite ? 1.4 : 1);
    ctx.fillStyle = 'rgba(255, 60, 60, ' + (0.12 + 0.2 * q).toFixed(2) + ')'; ctx.fillRect(0, -w / 2, len, w);
    ctx.fillStyle = 'rgba(255, 90, 90, 0.55)'; ctx.fillRect(0, -w / 2, len * q, w);
    ctx.restore();
  };
  /* v84 정예 수문장: 머리 위의 금관(뿔 셋 + 보석) · 양옆의 금빛 견갑 — 필터가 아니라 실제로 그린다 */
  Mob.prototype.drawCrown = function (ctx, sheet, nm, sc, bob, t) {
    var it = MG.Sprites.item(sheet, nm), h = it ? (it.ay + 1) * sc : 16 * sc, top = Math.round(this.y + bob - h), x = Math.round(this.x), pz = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.fillStyle = '#8a5e1c'; ctx.fillRect(x - 6, top + 1, 13, 3); ctx.fillStyle = '#e8b850'; ctx.fillRect(x - 6, top, 13, 2);
    ctx.fillStyle = '#f8dc88'; ctx.fillRect(x - 6, top - 3, 2, 3); ctx.fillRect(x - 1, top - 5, 3, 5); ctx.fillRect(x + 5, top - 3, 2, 3);
    ctx.fillStyle = 'rgba(255, 90, 90, ' + (0.7 + 0.3 * pz).toFixed(2) + ')'; ctx.fillRect(x, top - 1, 1, 1);
    var sw = Math.round(this.r * 0.9); ctx.fillStyle = '#c08a34'; ctx.fillRect(x - sw - 2, top + Math.round(h * 0.45), 3, 4); ctx.fillRect(x + sw, top + Math.round(h * 0.45), 3, 4); ctx.fillStyle = '#fff6d0'; ctx.fillRect(x - sw - 2, top + Math.round(h * 0.45), 1, 1); ctx.fillRect(x + sw, top + Math.round(h * 0.45), 1, 1);
  };
  Mob.prototype.frameName = function () {
    var d = this.def, moving = (this.state === 'chase' || this.state === 'idle') && (Math.abs(this.vx) + Math.abs(this.vy) > 1 || this.state === 'chase');
    if (d.sprite) {
      if (this.state === 'wind') return d.sprite + '_wind';
      if (this.state === 'atk' || (this.state === 'rec' && this.slamT > 0)) return d.sprite + '_atk';
      return d.sprite + '_' + (Math.floor(this.anim * (moving ? 8 : 2.5)) % 2);
    }
    return this.state === 'wind' ? 'moss_windup' : this.state === 'atk' ? 'moss_lunge' : moving ? 'moss_hop' + (Math.floor(this.anim * 8) % 4) : 'moss_idle' + (Math.floor(this.anim * 2) % 2);
  };
  Mob.prototype.draw = function (ctx, t) {
    var S = MG.Sprites, d = this.def;
    if (!this.alive) return;
    var sc = this.scale * (this.type === 'imp' ? 1.05 : 1), sheet = d.sprite ? 'bs' : 'mobs';
    if (this.elite) {   // 정예: 발밑의 금빛 문양 + 등 뒤 빛기둥
      var pz = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.strokeStyle = 'rgba(255, 216, 102, ' + (0.5 + 0.3 * pz).toFixed(2) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r + 8, (this.r + 8) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (MG.World.groundShadow) MG.World.groundShadow(ctx, this.x, this.y + 1, 8 * sc, 2.5 * sc, d.float ? 0.18 : 0.3);   // v83 접지 그림자 + 림
    var nm = this.frameName(), bob = d.float ? Math.round(Math.sin(t * 3 + this.hx) * 2) - 3 : 0;
    if (S && S.ready(sheet)) {
      var src = null;   // v84: 색 필터 금지 — 수정 슬라임 · 가시 임프는 고유 도트(bs 시트), 정예는 금관 · 금빛 견갑을 따로 그린다
      var shake = this.state === 'wind' ? Math.round(Math.sin(t * 60)) : 0, flip = d.sprite ? this.ax < 0 : this.ax < 0;
      S.draw(ctx, sheet, nm, this.x + shake, this.y + bob, flip, sc, src || undefined);
      if (this.elite) this.drawCrown(ctx, sheet, nm, sc, bob, t);
      if (this.slowT > 0) { var ice = S.tinted(sheet, '#bff6ff'); if (ice) { ctx.globalAlpha = 0.35; S.draw(ctx, sheet, nm, this.x + shake, this.y + bob, flip, sc, ice); ctx.globalAlpha = 1; } }
      if (this.flash > 0 || (this.state === 'wind' && Math.floor(t * 16) % 2 === 0)) { var wh = S.tinted(sheet, this.flash > 0 ? '#ffffff' : '#ff4040'); if (wh) { ctx.globalAlpha = this.flash > 0 ? 0.75 : 0.45; S.draw(ctx, sheet, nm, this.x + shake, this.y + bob, flip, sc, wh); ctx.globalAlpha = 1; } }
    } else { ctx.fillStyle = this.flash > 0 ? '#fff' : '#4fa854'; ctx.fillRect(Math.round(this.x - 7 * sc), Math.round(this.y - 12 * sc), Math.round(14 * sc), Math.round(12 * sc)); }
    var top = this.y - (this.elite ? 34 : 23);
    if (this.state === 'stun') { ctx.fillStyle = '#ffe066'; for (var k = 0; k < 3; k++) { var a = t * 6 + k * 2.1; ctx.fillRect(Math.round(this.x + Math.cos(a) * 7), Math.round(top + 3 + Math.sin(a) * 2), 2, 2); } }
    if (this.hp < this.maxHp || this.elite) { var bw = this.elite ? 30 : 16; ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fillRect(Math.round(this.x - bw / 2), Math.round(top), bw, 2); ctx.fillStyle = this.elite ? '#ffd866' : '#ff5a5a'; ctx.fillRect(Math.round(this.x - bw / 2), Math.round(top), Math.round(bw * Math.max(0, this.hp) / this.maxHp), 2); }
  };

  var Enemies = MG.Enemies = {
    list: [], Mob: Mob,
    /* 지금 맵의 몬스터를 모두 새로(정예 수문장은 봉인문이 이미 열렸으면 다시 나오지 않는다) */
    spawnAll: function () {
      var M = MG.World.map || D.MAPS.field, S = MG.S || {};
      this.list = M.enemies.filter(function (e) { return !(e[3] && e[3].gate && S.gates && S.gates[e[3].gate]); }).map(function (e) { return new Mob(e[0], e[1], e[2], e[3]); });
    },
    update: function (dt) { for (var i = 0; i < this.list.length; i++) this.list[i].update(dt); },
    collect: function (list, cam) {
      for (var i = 0; i < this.list.length; i++) { var e = this.list[i]; if (!e.alive) continue; if (e.x < cam.x - 30 || e.x > cam.x + MG.VW + 30 || e.y < cam.y - 30 || e.y > cam.y + MG.VH + 50) continue; list.push({ y: e.y, o: e, f: function (ctx, o, t) { o.draw(ctx, t); } }); }
    },
    drawWarn: function (ctx) { for (var i = 0; i < this.list.length; i++) this.list[i].drawWarn(ctx); }
  };
})(window);
