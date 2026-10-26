/* ==========================================================================
   save.js — 진행 상태 하나(MG.S)와 저장/불러오기(localStorage 'mg_reboot1')
   MG.S: 골드 · 소재 · 무기(보유/연마/명장) · 장착 · 갑주(보유/장착) · 비전 마법 · 마법 각인 · 에스트 최대치(황금 씨앗) ·
         고대 성소 보너스(최대 HP/MP/SP) · 불붙인 화톳불 · 마지막 화톳불 · 연 상자 · 조사한 비석 · 부순 장벽 · 열린 봉인문 ·
         보스 기록(토벌/파괴 수) · 심연의 투기장(열림/제패 수) · v82: 전실 봉인 장치 · 사신수의 가호 · 방랑 NPC 진행 ·
         v85: 수렵 기록 hunts[보스] = { best: 최단 토벌 초, rank: 최고 랭크 S/A/B, hits: 그때 피격 수, n: 기록 수 } · 보스 러시 8라운드 최단 제패 시간 rushBestT
   ========================================================================== */
(function (global) {
  'use strict';
  var MG = global.MG, D = MG.Data;
  var KEY = 'mg_reboot1';

  function fresh() {
    var mats = {}; D.MAT_ORDER.forEach(function (k) { mats[k] = 0; });
    return {
      v: 1, gold: 0, mats: mats,
      weapons: { wanderer: { lvl: 0, master: false } }, equipped: 'wanderer', armors: { coat: { master: false } }, armor: 'coat',
      spells: ['wave'], spellSel: 0, runes: [], estusMax: D.PLAYER.ESTUS,
      bonus: { hp: 0, mp: 0, sp: 0 }, seeds: 0, gates: {}, abyssOpen: false, arenaClears: 0,
      lit: { camp: true }, lastFire: 'camp', chests: {}, steles: {}, barriers: {}, bosses: {}, blood: null, crafted: 0,
      puzzles: {}, blessing: null, phoenixUsed: false, npc: { kyle: -1, bounty: 0 }, parries: 0, gyeoks: 0, collapses: 0,
      relics: [], relic: null, companion: { unlocked: false, kind: 'wolf' }, seen: {}, rushBest: 0, rushRuns: 0, hunts: {}, rushBestT: 0, bgm: true, ragarKills: 0, joints: 0   // v84: 무기 파생 해금(본 핵심 소재) · 보스 러시 최고 라운드 · 도전 수   // v83: 유물 · 영혼 수렵 파트너 · 보스 BGM · 난입 괴수   // v82: 전실 봉인 장치 · 사신수의 가호 · 주작 재탄생 · NPC(카일 보급 단계 · 받은 현상금) · 기록
    };
  }

  var Save = {
    KEY: KEY, fresh: fresh,
    store: function () { try { return global.localStorage || null; } catch (e) { return null; } },
    has: function () { var s = this.store(); try { return !!(s && s.getItem(KEY)); } catch (e) { return false; } },
    newGame: function () { MG.S = fresh(); return MG.S; },
    save: function () {
      var s = this.store(); if (!s || !MG.S) return false;
      try { s.setItem(KEY, JSON.stringify(MG.S)); return true; } catch (e) { return false; }
    },
    load: function () {
      var s = this.store(); if (!s) return null;
      try {
        var d = JSON.parse(s.getItem(KEY) || 'null'); if (!d || d.v !== 1) return null;
        var f = fresh();
        for (var k in f) if (d[k] === undefined) d[k] = f[k];
        for (var m in f.mats) if (typeof d.mats[m] !== 'number') d.mats[m] = 0;
        for (var w in d.weapons) if (!D.WEAPONS[w]) delete d.weapons[w];
        if (!d.weapons[d.equipped]) d.equipped = 'wanderer';
        for (var a in d.armors) if (!D.ARMORS[a]) delete d.armors[a];
        if (!d.armors.coat) d.armors.coat = { master: false };
        if (!d.armors[d.armor]) d.armor = 'coat';
        d.estusMax = Math.min(D.PLAYER.ESTUS_MAX, d.estusMax || D.PLAYER.ESTUS);
        for (var bk in f.bonus) if (typeof d.bonus[bk] !== 'number') d.bonus[bk] = 0;
        d.spells = d.spells.filter(function (x) { return !!D.SPELLS[x]; }); if (!d.spells.length) d.spells = ['wave'];
        d.spellSel = Math.min(d.spellSel || 0, d.spells.length - 1);
        d.runes = d.runes.filter(function (x) { return !!D.RUNES[x]; });
        MG.S = d; return d;
      } catch (e) { return null; }
    },
    clear: function () { var s = this.store(); try { if (s) s.removeItem(KEY); } catch (e) { /* 무시 */ } }
  };
  MG.S = fresh();
  MG.Save = Save;
})(window);
