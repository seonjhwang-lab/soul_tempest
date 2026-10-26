/* ==========================================================================
   sfx.js — v82 외부 파일 없는 프로시저럴 WebAudio 효과음(MG.SFX). AudioContext 의 오실레이터 + 노이즈 버퍼 + 필터만으로 그 자리에서 합성한다.
     slash(heavy)  검 베기 / 강공격 타격음 — 바람 가르는 대역 노이즈 휙 + (강공격이면) 묵직한 저음 쿵
     anvil(n)      대장간 모루 — 「깡—!」 맑은 금속 공명(비조화 배음 4개), 1 · 2 · 3타로 갈수록 피치가 오른다
     parry()       상쇄 · 저스트 회피 — 「카앙—!」 통쾌한 고주파 강철 울림 + 짧은 쇳소리 노이즈
     crash()       보스 부위 파괴 · 지형 붕괴 — 낮게 떨어지는 파열 노이즈 + 서브 베이스 쿵
   안전: 오디오가 없거나(Node 테스트 · 헤드리스) 브라우저가 소리를 막아도 절대 예외를 내지 않는다(모든 호출 try/catch → false).
         사용자 제스처 전에는 AudioContext 를 만들지 않는다(MG.Audio.unlock 뒤 그 컨텍스트를 함께 쓴다).
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG;

  var SFX = MG.SFX = {
    ctx: null, master: null, noiseBuf: null, played: 0, errors: 0, last: null, muted: false,
    /* 쓸 컨텍스트: 테스트가 넣어 준 것 → 잠금 해제된 MG.Audio 의 것 → 없으면 null(조용히 아무것도 안 한다) */
    ac: function () {
      if (this.ctx) return this.ctx;
      var A = MG.Audio; if (A && A.unlocked && A.ctx) { this.use(A.ctx); return this.ctx; }
      return null;
    },
    use: function (ctx) {
      this.ctx = ctx || null; this.master = null; this.noiseBuf = null;
      if (!ctx) return false;
      try { this.master = ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(ctx.destination); } catch (e) { this.master = null; this.errors++; }
      return true;
    },
    out: function () { var c = this.ac(); return this.master || (c && c.destination) || null; },
    noise: function (c) {
      if (this.noiseBuf) return this.noiseBuf;
      var len = Math.floor((c.sampleRate || 44100) * 0.6), b = c.createBuffer(1, len, c.sampleRate || 44100), d = b.getChannelData(0), s = 22222;
      for (var i = 0; i < len; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
      this.noiseBuf = b; return b;
    },
    /* 한 겹: 오실레이터(type, f0 → f1) + 감쇠 엔벌로프 */
    tone: function (c, type, f0, f1, t0, dur, vol, dest) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(dest || this.out()); o.start(t0); o.stop(t0 + dur + 0.05);
      return o;
    },
    /* 한 겹: 노이즈 → 필터(type, 주파수 f0 → f1) → 감쇠 */
    hiss: function (c, ftype, f0, f1, q, t0, dur, vol) {
      var n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      n.buffer = this.noise(c); f.type = ftype; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t0); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      n.connect(f); f.connect(g); g.connect(this.out()); n.start(t0); n.stop(t0 + dur + 0.05);
      return n;
    },
    run: function (name, fn) {
      if (this.muted) return false;
      var c = this.ac(); if (!c) return false;
      try { if (c.state === 'suspended' && c.resume) c.resume(); fn.call(this, c, c.currentTime || 0); this.played++; this.last = name; return true; }
      catch (e) { this.errors++; return false; }
    },

    /* 검 베기(heavy = 모아베기 · 실드 배쉬 · 발도 · 진 모아베기) */
    slash: function (heavy) {
      return this.run(heavy ? 'slash_heavy' : 'slash', function (c, t) {
        this.hiss(c, 'bandpass', heavy ? 900 : 1800, heavy ? 3200 : 5200, 1.4, t, heavy ? 0.22 : 0.14, heavy ? 0.32 : 0.22);   // 휙 — 바람 가르는 소리
        if (heavy) { this.tone(c, 'sine', 120, 42, t + 0.03, 0.32, 0.55); this.tone(c, 'triangle', 220, 70, t + 0.03, 0.18, 0.18); this.hiss(c, 'lowpass', 600, 120, 0.7, t + 0.03, 0.25, 0.3); }   // 쿵 — 묵직한 저음 타격
        else this.tone(c, 'triangle', 330, 160, t + 0.02, 0.08, 0.08);
      });
    },
    /* 모루 타격음: n = 1 · 2 · 3타(피치 상승) */
    anvil: function (n) {
      n = Math.max(1, Math.min(3, n || 1));
      return this.run('anvil' + n, function (c, t) {
        var base = 1180 * Math.pow(1.122, n - 1), parts = [1, 2.76, 5.4, 8.93], vols = [0.3, 0.16, 0.08, 0.04];
        for (var i = 0; i < parts.length; i++) this.tone(c, 'sine', base * parts[i], base * parts[i] * 0.995, t, 0.9 - i * 0.18, vols[i]);   // 깡— 맑은 비조화 금속 공명
        this.hiss(c, 'highpass', 3000, 0, 0.8, t, 0.05, 0.25);   // 망치가 닿는 순간의 쨍
        this.tone(c, 'sine', 180, 90, t, 0.12, 0.2);
      });
    },
    /* 상쇄 · 저스트 회피: 카앙— */
    parry: function () {
      return this.run('parry', function (c, t) {
        this.tone(c, 'sawtooth', 2350, 1900, t, 0.08, 0.12);
        this.tone(c, 'sine', 1760, 1740, t, 0.75, 0.26); this.tone(c, 'sine', 2637, 2610, t, 0.6, 0.14); this.tone(c, 'sine', 3951, 3900, t + 0.005, 0.45, 0.07);
        this.hiss(c, 'highpass', 4200, 0, 0.9, t, 0.12, 0.28);
        this.tone(c, 'triangle', 440, 220, t, 0.15, 0.12);
      });
    },
    /* ---------------------------------------------------------------- v83 프로시저럴 보스 전투 BGM
       묵직한 다크 판타지 베이스 드론(디튠된 톱니파 둘 + 저역 필터 + 느린 숨결) 위에 타악기 리듬(킥 · 톰 · 쇳소리 하이햇)을
       오디오 시계 기준으로 0.25초 앞서 예약한다. 2페이즈 각성이면 템포 76 → 108 BPM · 필터가 열리고 하이햇이 촘촘해진다.
       📜 장비 창의 「🎵 보스 BGM」으로 켜고 끈다(MG.S.bgm). 오디오가 없거나 막혀도 예외 없이 false. */
    BGM: { bpm: [76, 108], ahead: 0.25, tick: 90 },
    bgm: { playing: false, phase: 1, next: 0, step: 0, timer: null, nodes: null, beats: 0 },
    bgmOn: function () { var S = MG.S; return !(S && S.bgm === false); },
    bgmToggle: function (on) { var S = MG.S; if (S) S.bgm = on === undefined ? !this.bgmOn() : !!on; if (!this.bgmOn()) this.bgmStop(); else if (MG.Bosses && MG.Bosses.active && MG.Bosses.active()) this.bgmStart(); if (MG.Save) MG.Save.save(); return this.bgmOn(); },
    bgmStart: function () {
      var B = this.bgm; if (B.playing || !this.bgmOn() || this.muted) return false;
      var c = this.ac(); if (!c) return false;
      try {
        var t = c.currentTime || 0, out = this.out(), g = c.createGain(), f = c.createBiquadFilter(), o1 = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain();
        o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.setValueAtTime(55, t); o2.frequency.setValueAtTime(55.6, t);
        f.type = 'lowpass'; f.frequency.setValueAtTime(180, t); f.Q.value = 6;
        lfo.type = 'sine'; lfo.frequency.setValueAtTime(0.18, t); lg.gain.value = 60; lfo.connect(lg); lg.connect(f.frequency);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 1.2);
        o1.connect(f); o2.connect(f); f.connect(g); g.connect(out); o1.start(t); o2.start(t); lfo.start(t);
        B.nodes = { g: g, f: f, o: [o1, o2, lfo] }; B.playing = true; B.phase = 1; B.next = t + 0.1; B.step = 0; B.beats = 0;
        this.bgmSchedule(); MG.emit('bgm', true);
        return true;
      } catch (e) { this.errors++; B.playing = false; return false; }
    },
    bgmSchedule: function () {
      var B = this.bgm, self = this; if (!B.playing) return;
      var c = this.ac(); if (!c) { B.playing = false; return; }
      try {
        var spb = 60 / this.BGM.bpm[B.phase - 1] / 2;   // 8분음표
        while (B.next < (c.currentTime || 0) + this.BGM.ahead && B.beats < 100000) { this.bgmBeat(c, B.step, B.next); B.next += spb; B.step = (B.step + 1) % 16; B.beats++; }
        if ((c.currentTime || 0) === 0 && B.beats > 32) return;   // 시계가 멈춘 환경(테스트)에서는 끝없이 예약하지 않는다
      } catch (e) { this.errors++; }
      if (global.setTimeout) B.timer = global.setTimeout(function () { self.bgmSchedule(); }, this.BGM.tick);
    },
    bgmBeat: function (c, s, t) {
      var p2 = this.bgm.phase === 2;
      if (s % 8 === 0 || (p2 && s % 8 === 3)) { this.tone(c, 'sine', 70, 34, t, 0.32, 0.42); this.hiss(c, 'lowpass', 300, 80, 0.7, t, 0.12, 0.18); }        // 킥
      if (s === 6 || s === 14 || (p2 && s === 11)) this.tone(c, 'triangle', 130, 70, t, 0.22, 0.22);                                                    // 톰
      if (p2 ? s % 2 === 1 : s % 4 === 2) this.hiss(c, 'highpass', 6000, 0, 0.8, t, 0.04, p2 ? 0.08 : 0.05);                                          // 쇳소리 하이햇
      if (s === 0) this.tone(c, 'sawtooth', p2 ? 82.4 : 73.4, p2 ? 82 : 73, t, 1.1, 0.05);                                                             // 마디 머리의 저음
    },
    bgmPhase: function (p) {
      var B = this.bgm; B.phase = p === 2 ? 2 : 1;
      if (B.playing && B.nodes) { try { var c = this.ac(), t = c.currentTime || 0; B.nodes.f.frequency.setValueAtTime(B.phase === 2 ? 420 : 180, t); B.nodes.o[0].frequency.setValueAtTime(B.phase === 2 ? 61.7 : 55, t); B.nodes.o[1].frequency.setValueAtTime(B.phase === 2 ? 62.4 : 55.6, t); } catch (e) { this.errors++; } }
      return B.phase;
    },
    bgmStop: function () {
      var B = this.bgm; if (B.timer && global.clearTimeout) global.clearTimeout(B.timer); B.timer = null;
      if (B.nodes) { try { var c = this.ac(), t = c ? c.currentTime || 0 : 0; B.nodes.g.gain.setValueAtTime(0.12, t); B.nodes.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8); B.nodes.o.forEach(function (o) { o.stop(t + 0.9); }); } catch (e) { this.errors++; } }
      var was = B.playing; B.nodes = null; B.playing = false; B.phase = 1;
      if (was) MG.emit('bgm', false);
      return was;
    },

    /* 부위 파괴 · 지형 붕괴: 묵직한 파열음 */
    crash: function () {
      return this.run('crash', function (c, t) {
        this.hiss(c, 'lowpass', 2400, 160, 0.9, t, 0.7, 0.5);
        this.hiss(c, 'bandpass', 700, 220, 2.2, t + 0.04, 0.45, 0.3);
        this.tone(c, 'sine', 90, 34, t, 0.6, 0.65); this.tone(c, 'square', 60, 40, t + 0.02, 0.18, 0.08);
        for (var k = 0; k < 4; k++) this.hiss(c, 'bandpass', 1600 + k * 500, 0, 3, t + 0.12 + k * 0.07, 0.06, 0.12);   // 튀는 파편
      });
    }
  };
  /* v83 보스 BGM 연결: 보스와 맞붙으면 시작 · 2페이즈 각성이면 템포 상승 · 토벌/이탈/맵 이동이면 멈춘다 */
  if (MG.on) {
    MG.on('bossEngage', function () { SFX.bgmStart(); });
    MG.on('bossAwaken', function () { SFX.bgmPhase(2); });
    var stopIfQuiet = function () { if (!(MG.Bosses && MG.Bosses.active && MG.Bosses.active())) SFX.bgmStop(); };
    MG.on('bossDown', function () { global.setTimeout ? global.setTimeout(stopIfQuiet, 1500) : stopIfQuiet(); });
    MG.on('bossLeave', stopIfQuiet); MG.on('map', stopIfQuiet);
  }
})(window);
