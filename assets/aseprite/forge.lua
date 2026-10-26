-- ==========================================================================
-- forge.lua — v73 「마법 대장간」 시트: 대장간 건물(마을), 작업대 소품(화덕/서양식 가죽 풀무/모루/망치/담금질 수조/카운터/벽/무기 걸이),
--   손님 상반신 6종, 무기 12종(손에 쥔 그림 + 도감용 24×24 비스듬한 그림), 채집 도구 3종(도끼/망치/낫),
--   살아 있는 자원 지점(나무/광맥 바위/약초 군락 + 황금 희귀 지점 + 베고 난 자리), 셋째 보스의 원거리 무늬(가시 뿌리/가시 씨앗).
--   aseprite -b --script-param dir=<이 폴더> --script-param out=<assets/sprites> --script forge.lua
-- 결과: forge.aseprite(슬라이스 = 이름, 기준점 = pivot), forge.png, forge.json { items: { 이름: [x, y, w, h, ax, ay] } }
-- ==========================================================================
local DIR = app.params.dir
local OUT = app.params.out
package.path = DIR .. "/?.lua;" .. package.path
local L = require("lib")

local OL = "#0b0a10"
local WOOD = { "#2a170c", "#4a2a14", "#6e4220", "#965e30", "#c08a4e", "#e0b880" }
local STEEL = { "#262c38", "#424c5e", "#6a768c", "#a2aec4", "#e2e9f5" }
local GOLD = { "#6e4c18", "#a8792a", "#d8ad55", "#f6dc8e", "#fff6d0" }
local LEATHER = { "#2a140c", "#4e2616", "#74402a", "#9a6040", "#c0885c" }
local STONE = { "#1c1f26", "#2c313b", "#424955", "#5c6573", "#7e8896", "#a6b0bc" }
local BRICK = { "#2a1410", "#48231a", "#6a3424", "#8a4a32", "#a8664a" }
local FIRE = { "#7a1a0a", "#c8401a", "#f08028", "#ffc040", "#fff0a0" }
local TEAL = { "#14485a", "#21788c", "#3fb8d0", "#8ae8f8", "#e4fdff" }
local VIOLET = { "#2c1a4a", "#4a2c80", "#7a52c0", "#b090f0", "#e8dcff" }
local RED = { "#4a0e18", "#8a1c2c", "#c8344a", "#f0708a", "#ffc0c8" }
local LEAF = { "#0f2c16", "#174222", "#22602f", "#348040", "#4fa854", "#8ad070" }
local BARK = { "#1f1510", "#33241a", "#4a3624", "#664c33", "#866848" }
local MOSS = { "#14301c", "#285c33", "#4f9a4c", "#7cc062" }
local WATER = { "#0e2a3a", "#16425a", "#226482", "#3a8cae", "#8ad2ea" }
local SKIN = { "#7a4a32", "#a8704c", "#d09870", "#ecc49a" }

local items = {}
local function add(name, buf, ax, ay) items[#items + 1] = { name = name, buf = buf, ax = ax or 0, ay = ay or 0 } end

-- 버퍼를 각도 a(라디안)로 돌린 새 버퍼(가장 가까운 픽셀) — 도감 아이콘용
local function rotated(src, a, W, H, cx, cy)
  local o = L.new(W, H)
  local ca, sa = math.cos(-a), math.sin(-a)
  local scx, scy = src.w / 2, src.h / 2
  for y = 0, H - 1 do for x = 0, W - 1 do
    local dx, dy = x + 0.5 - cx, y + 0.5 - cy
    local sx, sy = dx * ca - dy * sa + scx, dx * sa + dy * ca + scy
    local c = L.get(src, math.floor(sx), math.floor(sy))
    if c then L.set(o, x, y, c) end
  end end
  return o
end
local function strip(b) local o = L.copy(b); return o end

-- ==========================================================================
-- 무기 12종 — 오른쪽을 가리키는 그림, 기준점 = 손잡이 축
-- ==========================================================================
local function blade(b, x0, x1, ymid, half, edge, body, back, tipC)
  for x = x0, x1 do
    local h = half
    if x > x1 - half then h = math.max(0, half - (x - (x1 - half))) end
    for dy = -h, h do
      local c = body
      if dy == -h then c = edge elseif dy == h then c = back end
      L.set(b, x, ymid + dy, c)
    end
  end
  L.set(b, x1 + 1, ymid, tipC or edge)
end
local function grip(b, gx, ymid, len, wrap, pommel)
  for x = gx, gx + len - 1 do L.set(b, x, ymid, (x % 2 == 0) and wrap[1] or wrap[2]) end
  L.set(b, gx - 1, ymid, pommel[2]); L.set(b, gx - 1, ymid - 1, pommel[1]); L.set(b, gx - 1, ymid + 1, pommel[1])
end
local function guard(b, x, ymid, h, c)
  for dy = -h, h do L.set(b, x, ymid + dy, dy == -h and c[3] or (dy == h and c[1] or c[2])) end
end
local W = {}
-- 단검(짧고 가늘다)
local function dagger(bladeC, guardC, wrap, gem, extra)
  local b = L.new(15, 7)
  grip(b, 1, 3, 3, wrap, guardC)
  guard(b, 4, 3, 2, guardC)
  blade(b, 5, 12, 3, 1, bladeC[3], bladeC[2], bladeC[1], bladeC[3])
  if gem then L.set(b, 4, 3, gem) end
  if extra then extra(b) end
  L.outline(b, OL)
  return b
end
local function longsword(bladeC, guardC, wrap, gem, extra)
  local b = L.new(22, 7)
  grip(b, 1, 3, 4, wrap, guardC)
  guard(b, 5, 3, 3, guardC)
  blade(b, 6, 19, 3, 1, bladeC[3], bladeC[2], bladeC[1], bladeC[3])
  for x = 7, 16 do if x % 3 == 0 then L.set(b, x, 3, bladeC[2]) end end
  if gem then L.set(b, 5, 3, gem) end
  if extra then extra(b) end
  L.outline(b, OL)
  return b
end
local function greatsword(bladeC, guardC, wrap, gem, extra)
  local b = L.new(28, 11)
  grip(b, 1, 5, 5, wrap, guardC)
  for dy = -4, 4 do L.set(b, 6, 5 + dy, dy == -4 and guardC[3] or (dy == 4 and guardC[1] or guardC[2])); L.set(b, 7, 5 + dy, guardC[2]) end
  blade(b, 8, 24, 5, 2, bladeC[3], bladeC[2], bladeC[1], bladeC[3])
  L.hline(b, 9, 20, 5, bladeC[1])
  if gem then L.set(b, 6, 5, gem); L.set(b, 7, 5, gem) end
  if extra then extra(b) end
  L.outline(b, OL)
  return b
end
local function arcane(bladeC, guardC, wrap, gem, glowC, extra)
  local b = L.new(25, 9)
  grip(b, 1, 4, 4, wrap, guardC)
  guard(b, 5, 4, 3, guardC); L.set(b, 5, 0, glowC); L.set(b, 5, 8, glowC)
  blade(b, 6, 21, 4, 1, bladeC[3], bladeC[2], bladeC[1], glowC)
  for x = 8, 19, 3 do L.set(b, x, 4, glowC) end
  if gem then L.set(b, 5, 4, gem) end
  if extra then extra(b) end
  L.outline(b, OL)
  return b
end
local SILVER = { STEEL[2], STEEL[4], STEEL[5] }
local WRAP_L = { LEATHER[3], LEATHER[4] }
W.trainee_dagger = { dagger({ STEEL[2], STEEL[3], STEEL[4] }, { WOOD[2], WOOD[3], WOOD[4] }, WRAP_L), 2, 3 }
W.fang_dagger = { dagger({ "#8a8270", "#d8d0b8", "#fffaea" }, { BARK[2], BARK[3], BARK[4] }, { "#5a1a1e", "#8e2a30" }, "#c8344a", function(b) L.set(b, 8, 1, "#fffaea"); L.set(b, 10, 5, "#d8d0b8") end), 2, 3 }
W.rune_dagger = { dagger({ TEAL[2], TEAL[4], TEAL[5] }, { STEEL[2], STEEL[3], STEEL[4] }, { "#14485a", "#21788c" }, TEAL[4]), 2, 3 }
W.moon_dagger = { dagger({ "#5a6aa0", "#b8c8f0", "#f4f8ff" }, { VIOLET[2], VIOLET[3], VIOLET[4] }, { VIOLET[1], VIOLET[2] }, "#fff6a0", function(b) L.set(b, 7, 2, "#fff6a0") end), 2, 3 }
W.steel_sword = { longsword({ STEEL[2], STEEL[4], STEEL[5] }, { GOLD[1], GOLD[2], GOLD[3] }, WRAP_L), 3, 3 }
W.moss_sword = { longsword({ "#2f5a3a", "#7cc062", "#c8f0a0" }, { BARK[2], BARK[3], BARK[4] }, { MOSS[1], MOSS[2] }, "#7cc062", function(b) L.set(b, 10, 1, LEAF[5]); L.set(b, 14, 5, LEAF[4]) end), 3, 3 }
W.flame_sword = { longsword({ FIRE[1], FIRE[3], FIRE[5] }, { "#3a1a10", "#6a2a14", "#a8401a" }, { "#3a1a10", "#6a2a14" }, FIRE[4], function(b) L.set(b, 12, 1, FIRE[4]); L.set(b, 16, 1, FIRE[5]) end), 3, 3 }
W.world_sword = { longsword({ "#4a7a3a", "#d8f0b0", "#ffffe0" }, { GOLD[2], GOLD[3], GOLD[4] }, { "#2f5a2c", "#4a8044" }, "#8ad070", function(b) L.set(b, 6, 0, LEAF[5]); L.set(b, 6, 6, LEAF[5]) end), 3, 3 }
W.antler_great = { greatsword({ STEEL[2], STEEL[4], STEEL[5] }, { BARK[3], BARK[4], BARK[5] }, WRAP_L, nil, function(b) L.line(b, 7, 0, 10, 2, BARK[5]); L.line(b, 7, 10, 10, 8, BARK[5]); L.set(b, 6, 0, BARK[4]); L.set(b, 6, 10, BARK[4]) end), 3, 5 }
W.mithril_great = { greatsword({ "#3a6a8a", "#a8e0f0", "#f0ffff" }, { STEEL[3], STEEL[4], STEEL[5] }, { "#1a3a5a", "#2a5a7a" }, TEAL[5]), 3, 5 }
W.golem_arcane = { arcane({ STONE[3], STONE[5], STONE[6] }, { STONE[2], STONE[3], STONE[4] }, { STONE[1], STONE[2] }, TEAL[4], TEAL[3]), 3, 4 }
W.thorn_arcane = { arcane({ "#3a1a2a", "#8a2a48", "#e0607a" }, { "#1a2414", "#34502a", "#679048" }, { "#26361f", "#34502a" }, RED[3], RED[4], function(b) L.set(b, 9, 1, "#679048"); L.set(b, 13, 7, "#679048"); L.set(b, 17, 1, "#679048") end), 3, 4 }
-- v80 3티어 ★신화 무기 4종(서리 송곳니 · 폭풍룡 소재)
local ICEB = { '#3a7aa8', '#bff0ff', '#ffffff' }
W.frost_sword = { longsword(ICEB, { STEEL[3], STEEL[4], STEEL[5] }, { TEAL[1], TEAL[2] }, '#e4fdff', function(b) L.set(b, 9, 1, '#ffffff'); L.set(b, 12, 5, '#e4fdff'); L.set(b, 15, 1, '#bff0ff'); L.set(b, 17, 5, '#ffffff'); L.set(b, 5, 0, '#e4fdff'); L.set(b, 5, 6, '#e4fdff') end), 3, 3 }
W.dragon_great = { greatsword({ '#16121e', '#3a3448', '#7a7090' }, { '#3a0a14', '#7a1a2a', '#c8344a' }, { '#1a1622', '#2a2434' }, '#4deeea', function(b) for x = 10, 22, 3 do L.set(b, x, 5, '#4ab8ff'); L.set(b, x + 1, 4, '#9ad8ff') end; L.set(b, 6, 0, '#c8344a'); L.set(b, 6, 10, '#c8344a'); L.set(b, 5, 1, '#7a1a2a'); L.set(b, 5, 9, '#7a1a2a') end), 3, 5 }
W.thunder_tachi = { longsword({ '#4a5a8a', '#cfe0ff', '#ffffff' }, { GOLD[2], GOLD[3], GOLD[4] }, { '#1a1a3a', '#2a2a5a' }, '#ffe066', function(b) L.set(b, 9, 2, '#ffe066'); L.set(b, 11, 4, '#ffe066'); L.set(b, 13, 2, '#9ad8ff'); L.set(b, 15, 4, '#ffe066'); L.set(b, 18, 3, '#ffffff') end), 3, 3 }
W.astral_arcane = { arcane({ '#141c3a', '#3a5a9a', '#9ad8ff' }, { '#2a1a40', '#5a3a90', '#b090f0' }, { '#14102a', '#2a1a40' }, '#4deeea', '#4deeea', function(b) L.set(b, 10, 2, '#eef6ff'); L.set(b, 16, 6, '#eef6ff'); L.set(b, 5, 0, '#b090f0'); L.set(b, 5, 8, '#b090f0') end), 3, 4 }
local WEAPON_ORDER = { "trainee_dagger", "fang_dagger", "rune_dagger", "moon_dagger", "steel_sword", "moss_sword", "flame_sword", "world_sword", "antler_great", "mithril_great", "golem_arcane", "thorn_arcane", "frost_sword", "dragon_great", "thunder_tachi", "astral_arcane" }
-- v83 성장형 고대 병기(봉인된 고대검 → 각성 진명검 → ★천상제일검): 대검보다 긴 고대의 장검
local function ancientBlade(bladeC, guardC, wrap, gem, extra)
  local b = L.new(31, 11)
  grip(b, 1, 5, 5, wrap, guardC)
  for dy = -4, 4 do L.set(b, 6, 5 + dy, dy == -4 and guardC[3] or (dy == 4 and guardC[1] or guardC[2])); L.set(b, 7, 5 + dy, guardC[2]) end
  blade(b, 8, 27, 5, 2, bladeC[3], bladeC[2], bladeC[1], bladeC[3])
  L.hline(b, 9, 23, 5, bladeC[1])
  if gem then L.set(b, 6, 5, gem); L.set(b, 7, 5, gem) end
  if extra then extra(b) end
  L.outline(b, OL)
  return b
end
-- ① 봉인된 고대검: 빛바랜 회보랏빛 칼날을 보랏빛 봉인 사슬이 감았다
W.ancient_1 = { ancientBlade({ '#3a3448', '#6a6480', '#9a94b0' }, { STONE[2], STONE[3], STONE[4] }, { LEATHER[1], LEATHER[2] }, VIOLET[3], function(b) for x = 10, 24, 5 do L.line(b, x, 2, x + 2, 8, VIOLET[2]); L.set(b, x + 1, 5, VIOLET[4]) end end), 3, 5 }
-- ② 각성 진명검: 은빛 칼날 · 금빛 코등이 · 칼홈을 따라 청록 룬
W.ancient_2 = { ancientBlade({ STEEL[2], STEEL[4], STEEL[5] }, { GOLD[1], GOLD[2], GOLD[3] }, { '#1a2a4a', '#2a4a7a' }, TEAL[4], function(b) for x = 11, 23, 3 do L.set(b, x, 5, TEAL[4]) end; L.set(b, 6, 0, GOLD[4]); L.set(b, 6, 10, GOLD[4]) end), 3, 5 }
-- ③ ★천상제일검: 백금 칼날 · 금빛 날 · 비취 용옥 · 칼끝까지 흐르는 황금 빛
W.ancient_3 = { ancientBlade({ '#c8a040', '#fff6d0', '#ffffff' }, { GOLD[2], GOLD[3], GOLD[4] }, { '#2a1a08', '#5a3a10' }, '#4adfa0', function(b) for x = 10, 26, 2 do L.set(b, x, 5, (x % 4 == 0) and '#ffd866' or '#fff6c0') end; L.set(b, 5, 0, GOLD[5]); L.set(b, 5, 10, GOLD[5]); L.set(b, 4, 1, '#4adfa0'); L.set(b, 4, 9, '#4adfa0'); L.set(b, 28, 4, '#ffffff') end), 3, 5 }
table.insert(WEAPON_ORDER, "ancient_1"); table.insert(WEAPON_ORDER, "ancient_2"); table.insert(WEAPON_ORDER, "ancient_3")

for _, id in ipairs(WEAPON_ORDER) do
  local w = W[id]
  add("wpn_" .. id, w[1], w[2], w[3])
  -- 도감 아이콘(24×24): 왼쪽 아래 → 오른쪽 위로 비스듬히
  local ic = rotated(w[1], -math.pi / 4, 24, 24, 12, 12)
  add("wi_" .. id, ic, 12, 12)
end

-- ==========================================================================
-- v80 사냥꾼 갑주 5종 — 도감/대장간 아이콘(24×24, 가슴 갑옷 정면)
-- ==========================================================================
local function armorIcon(body, trim, gem, deco)
  local b = L.new(24, 24)
  -- 견갑 둘
  L.shadeEllipse(b, 5.5, 7, 4.2, 3.4, body, 0.08); L.shadeEllipse(b, 18.5, 7, 4.2, 3.4, body, 0.08)
  -- 몸통 판(아래로 좁아지는 방패꼴)
  L.shadePoly(b, { { 6, 5 }, { 18, 5 }, { 19, 13 }, { 16, 21 }, { 12, 23 }, { 8, 21 }, { 5, 13 } }, body, 0.05)
  -- 목둘레 · 가운데 이음 · 허리띠
  L.hline(b, 9, 15, 5, trim[2]); L.hline(b, 10, 14, 6, trim[1])
  L.vline(b, 12, 7, 20, trim[1]); L.hline(b, 7, 17, 15, trim[2]); L.hline(b, 7, 17, 16, trim[1])
  L.rect(b, 11, 14, 3, 3, gem); L.set(b, 11, 14, '#ffffff')
  if deco then deco(b) end
  L.outline(b, OL)
  return b
end
local AR = {
  ar_moss = armorIcon({ LEAF[1], LEAF[2], LEAF[3], LEAF[4], LEAF[5] }, { BARK[2], BARK[4] }, '#8ad070', function(b) L.set(b, 8, 9, LEAF[6]); L.set(b, 16, 10, LEAF[6]); L.set(b, 4, 5, LEAF[6]); L.set(b, 20, 5, LEAF[6]) end),
  ar_crystal = armorIcon({ VIOLET[1], VIOLET[2], VIOLET[3], VIOLET[4], VIOLET[5] }, { STEEL[2], STEEL[4] }, TEAL[4], function(b) for y = 8, 19, 3 do for x = 7 + (y % 2), 17, 3 do L.set(b, x, y, VIOLET[5]) end end; L.poly(b, { { 3, 6 }, { 5, 1 }, { 6, 6 } }, TEAL[4]); L.poly(b, { { 18, 6 }, { 19, 1 }, { 21, 6 } }, TEAL[4]) end),
  ar_thorn = armorIcon({ RED[1], RED[2], RED[3], RED[4], RED[5] }, { '#1a2414', '#34502a' }, '#ffb238', function(b) L.poly(b, { { 2, 7 }, { 0, 2 }, { 5, 5 } }, '#e8c8a0'); L.poly(b, { { 22, 7 }, { 23, 2 }, { 19, 5 } }, '#e8c8a0'); L.set(b, 8, 11, '#e8c8a0'); L.set(b, 16, 11, '#e8c8a0'); L.set(b, 12, 21, '#e8c8a0') end),
  ar_frost = armorIcon({ '#3a6a90', '#5a90b8', '#8ac0e0', '#c8e8f8', '#ffffff' }, { STEEL[3], STEEL[5] }, '#e4fdff', function(b) for x = 2, 22 do if x % 2 == 0 then L.set(b, x, 4, '#f4f8ff'); L.set(b, x, 3, '#dfe8f5') end end; L.set(b, 9, 10, '#ffffff'); L.set(b, 15, 10, '#ffffff'); L.line(b, 9, 18, 15, 18, '#bff0ff') end),
  ar_astral = armorIcon({ '#0e1222', '#1e2a4a', '#2e4a7a', '#4a7ab0', '#9ad8ff' }, { '#3a0a14', '#c8344a' }, '#4deeea', function(b) for y = 8, 20, 2 do for x = 7 + (y % 4 == 0 and 1 or 0), 17, 2 do L.set(b, x, y, '#2e4a7a') end end; L.poly(b, { { 3, 6 }, { 1, 0 }, { 6, 5 } }, '#c8344a'); L.poly(b, { { 21, 6 }, { 23, 0 }, { 18, 5 } }, '#c8344a'); L.set(b, 12, 9, '#9ad8ff') end)
}
for _, id in ipairs({ 'ar_moss', 'ar_crystal', 'ar_thorn', 'ar_frost', 'ar_astral' }) do add('wi_' .. id, AR[id], 12, 12) end

-- ==========================================================================
-- 채집 도구 3종(손에 쥔 그림, 오른쪽을 가리킨다, 기준점 = 손잡이 끝)
-- ==========================================================================
do
  local b = L.new(16, 11)   -- 도끼
  L.hline(b, 0, 12, 6, WOOD[4]); L.hline(b, 0, 12, 7, WOOD[3])
  L.poly(b, { { 10, 1 }, { 15, 2 }, { 15, 10 }, { 10, 9 }, { 11, 5 } }, function(x, y) return x > 13 and STEEL[5] or (y < 5 and STEEL[4] or STEEL[3]) end)
  L.outline(b, OL); add("tool_axe", b, 1, 6)
  local h = L.new(16, 11)   -- 망치(광맥용 쇠망치)
  L.hline(h, 0, 11, 5, WOOD[4]); L.hline(h, 0, 11, 6, WOOD[3])
  L.rect(h, 10, 1, 5, 9, STEEL[3]); L.vline(h, 10, 1, 9, STEEL[4]); L.hline(h, 10, 14, 1, STEEL[5]); L.vline(h, 14, 2, 9, STEEL[2])
  L.outline(h, OL); add("tool_hammer", h, 1, 5)
  local s = L.new(16, 13)   -- 낫
  L.hline(s, 0, 8, 9, WOOD[4]); L.hline(s, 0, 8, 10, WOOD[3])
  L.each(s, 0, 0, 15, 12, function(x, y) local d = math.sqrt((x + 0.5 - 9.5) ^ 2 + (y + 0.5 - 9) ^ 2); if d > 4.6 and d < 7.2 and y < 9 and x > 3 then return d < 5.6 and STEEL[5] or (d < 6.4 and STEEL[4] or STEEL[3]) end end); L.set(s, 3, 8, STEEL[4]); L.set(s, 3, 7, STEEL[5])
  L.outline(s, OL); add("tool_sickle", s, 1, 9)
end

-- ==========================================================================
-- 서양식 가죽 풀무(Bellows) 4프레임 — 0 활짝 벌어짐 → 3 꽉 눌림. 노즐은 오른쪽(화덕 쪽).
-- ==========================================================================
local function bellows(k)
  local b = L.new(40, 26)
  local open = ({ 9, 6, 3, 1 })[k + 1]          -- 위아래 판 사이(주름) 높이의 절반
  local cy = 14
  -- 노즐(쇠)
  L.rect(b, 30, cy - 1, 9, 3, STEEL[3]); L.hline(b, 30, 38, cy - 1, STEEL[4]); L.set(b, 39, cy, STEEL[5])
  L.rect(b, 27, cy - 2, 3, 5, GOLD[2]); L.vline(b, 27, cy - 2, cy + 2, GOLD[3])
  -- 가죽 주름(아코디언): 판 사이를 지그재그로
  for x = 6, 27 do
    local reach = math.floor(open * (1 - (x - 6) / 30) + 1)
    for dy = -reach, reach do
      local fold = ((x + (dy > 0 and 1 or 0)) % 4)
      local c = fold == 0 and LEATHER[2] or (fold == 1 and LEATHER[3] or (fold == 2 and LEATHER[4] or LEATHER[3]))
      if math.abs(dy) == reach then c = LEATHER[1] end
      L.set(b, x, cy + dy, c)
    end
  end
  -- 위/아래 나무판(물방울 모양) + 손잡이
  local function board(sign)
    local y0 = cy + sign * (open + 1)
    for x = 2, 28 do
      local th = x < 6 and 1 or 2
      for t = 0, th do L.set(b, x, y0 + sign * t, t == 0 and WOOD[5] or WOOD[4]) end
    end
    L.hline(b, 2, 28, y0 + sign * 2, WOOD[3])
    L.rect(b, 0, y0 + (sign < 0 and -2 or 0), 4, 3, WOOD[3]); L.set(b, 0, y0, WOOD[5])   -- 손잡이
    for x = 9, 21, 6 do L.set(b, x, y0 + sign, GOLD[3]) end   -- 놋쇠 못
  end
  board(-1); board(1)
  -- 경첩(노즐 쪽에서 두 판이 만난다)
  L.vline(b, 28, cy - 2, cy + 2, GOLD[3])
  L.outline(b, OL)
  return b
end
for k = 0, 3 do add("bellows_" .. k, bellows(k), 20, 25) end

-- ==========================================================================
-- 화덕(돌 벽돌 아치) — 아궁이 안의 불은 게임이 온도에 따라 그린다. 불꽃 4프레임.
-- ==========================================================================
do
  local b = L.new(60, 66)
  -- 돌 기단 + 벽돌 몸통(아치 지붕)
  L.each(b, 0, 0, 59, 65, function(x, y)
    local inBody = (y >= 14 and y <= 61 and x >= 3 and x <= 56) or ((x + 0.5 - 30) ^ 2 / 27 ^ 2 + (y + 0.5 - 22) ^ 2 / 16 ^ 2 <= 1 and y < 22)
    if not inBody then return nil end
    local row = math.floor(y / 5)
    local off = (row % 2) * 5
    local edge = ((x + off) % 10 == 0) or (y % 5 == 0)
    local shade = x < 12 and 4 or (x > 46 and 2 or 3)
    return edge and BRICK[1] or BRICK[shade + (y < 20 and 1 or 0) > 5 and 5 or shade + (y < 20 and 1 or 0)]
  end)
  L.rect(b, 0, 58, 60, 8, STONE[3]); L.hline(b, 0, 59, 58, STONE[5]); L.hline(b, 0, 59, 65, STONE[1])
  for x = 0, 59, 12 do L.vline(b, x, 59, 64, STONE[2]) end
  -- 아궁이(아치 입구) — 비워 둔다(어두운 안쪽)
  L.each(b, 14, 28, 46, 57, function(x, y)
    local inside = (y >= 40 and x >= 16 and x <= 43) or ((x + 0.5 - 30) ^ 2 / 14 ^ 2 + (y + 0.5 - 40) ^ 2 / 12 ^ 2 <= 1)
    if inside and y <= 56 then return "#120806" end
  end)
  -- 아치 테두리 돌
  L.each(b, 12, 26, 48, 57, function(x, y)
    local d = (x + 0.5 - 30) ^ 2 / 16 ^ 2 + (y + 0.5 - 40) ^ 2 / 14 ^ 2
    if d <= 1 and d > 0.78 and y <= 40 then return y < 32 and STONE[5] or STONE[4] end
  end)
  L.vline(b, 15, 40, 56, STONE[4]); L.vline(b, 44, 40, 56, STONE[3])
  -- 굴뚝 + 룬
  L.rect(b, 40, 0, 10, 12, STONE[3]); L.vline(b, 40, 0, 11, STONE[5]); L.hline(b, 39, 50, 0, STONE[6])
  for _, p in ipairs({ { 9, 30 }, { 50, 30 }, { 30, 9 } }) do L.set(b, p[1], p[2], TEAL[4]); L.set(b, p[1], p[2] + 1, TEAL[3]) end
  L.outline(b, OL)
  add("furnace", b, 30, 65)
  for k = 0, 3 do
    local f = L.new(26, 22)
    local r = L.rng(91 + k * 7)
    for i = 0, 6 do
      local cx = 3 + i * 3.4 + (r() - 0.5) * 2
      local hgt = 9 + r() * 10 + (i % 2) * 3
      L.poly(f, { { cx - 3, 21 }, { cx, 21 - hgt }, { cx + 3, 21 } }, i % 2 == 0 and FIRE[3] or FIRE[2])
      L.poly(f, { { cx - 1.5, 21 }, { cx, 21 - hgt * 0.6 }, { cx + 1.5, 21 } }, FIRE[4])
    end
    L.hline(f, 2, 23, 21, FIRE[5]); L.hline(f, 4, 21, 20, FIRE[4])
    add("fire_" .. k, f, 13, 21)
  end
  -- 잉걸불 위에 놓인 쇳덩이(달궈지는 재료)
  local ig = L.new(14, 6)
  L.rect(ig, 0, 1, 14, 4, STEEL[2]); L.hline(ig, 0, 13, 1, STEEL[4]); L.outline(ig, OL)
  add("billet", ig, 7, 5)
end

-- ==========================================================================
-- 모루(큰 것), 대장장이 망치, 담금질 수조, 카운터/벽/무기 걸이, 자물쇠
-- ==========================================================================
do
  local b = L.new(50, 32)
  L.poly(b, { { 2, 4 }, { 40, 4 }, { 49, 7 }, { 40, 11 }, { 32, 12 }, { 30, 18 }, { 18, 18 }, { 16, 12 }, { 6, 11 } }, function(x, y) return y < 6 and STEEL[5] or (y < 9 and STEEL[4] or STEEL[3]) end)
  L.hline(b, 3, 40, 4, STEEL[5])
  L.rect(b, 14, 18, 20, 4, STEEL[2])
  L.shadeCyl(b, 10, 22, 30, 10, { WOOD[2], WOOD[3], WOOD[4], WOOD[5] }, 0.0)   -- 그루터기 받침
  L.hline(b, 10, 39, 22, WOOD[6])
  L.outline(b, OL)
  add("anvil_big", b, 25, 31)
  local h = L.new(20, 12)
  L.hline(h, 0, 13, 6, WOOD[4]); L.hline(h, 0, 13, 7, WOOD[3])
  L.rect(h, 12, 1, 7, 10, STEEL[3]); L.hline(h, 12, 18, 1, STEEL[5]); L.vline(h, 12, 1, 10, STEEL[4]); L.vline(h, 18, 2, 10, STEEL[2])
  L.outline(h, OL)
  add("smith_hammer", h, 2, 6)
  local t = L.new(52, 30)
  L.shadeCyl(t, 2, 6, 48, 23, { WOOD[2], WOOD[3], WOOD[4], WOOD[5] }, 0.0)
  for _, y in ipairs({ 9, 22 }) do L.hline(t, 2, 49, y, STEEL[3]); L.hline(t, 2, 49, y + 1, STEEL[2]) end
  for x = 6, 46, 6 do L.vline(t, x, 11, 21, WOOD[2]) end
  L.each(t, 2, 1, 49, 9, function(x, y) local d = ((x + 0.5 - 26) / 24) ^ 2 + ((y + 0.5 - 6) / 4.4) ^ 2; if d <= 1 then return d > 0.75 and WOOD[5] or (d > 0.45 and WATER[3] or WATER[2]) end end)
  L.set(t, 18, 5, WATER[5]); L.set(t, 19, 5, WATER[5]); L.set(t, 30, 7, WATER[4])
  L.outline(t, OL)
  add("tub", t, 26, 29)
  -- 카운터 앞판(가로로 이어 붙인다) 32×30
  local c = L.new(32, 30)
  L.rect(c, 0, 0, 32, 6, WOOD[5]); L.hline(c, 0, 31, 0, WOOD[6]); L.hline(c, 0, 31, 5, WOOD[3])
  L.rect(c, 0, 6, 32, 24, WOOD[3])
  for y = 10, 28, 6 do L.hline(c, 0, 31, y, WOOD[2]) end
  L.vline(c, 0, 6, 29, WOOD[2]); L.vline(c, 16, 6, 29, WOOD[2])
  L.set(c, 4, 13, GOLD[3]); L.set(c, 20, 13, GOLD[3]); L.set(c, 4, 25, GOLD[3]); L.set(c, 20, 25, GOLD[3])
  add("counter", c, 0, 0)
  -- 뒷벽 돌 32×32
  local wl = L.new(32, 32)
  L.each(wl, 0, 0, 31, 31, function(x, y)
    local row = math.floor(y / 8); local off = (row % 2) * 8
    if (x + off) % 16 == 0 or y % 8 == 0 then return STONE[1] end
    local r = ((x * 7 + y * 13 + row * 5) % 11)
    return r < 2 and STONE[2] or (r > 8 and STONE[4] or STONE[3])
  end)
  add("wall", wl, 0, 0)
  -- 바닥 판석 32×32
  local fl = L.new(32, 32)
  L.each(fl, 0, 0, 31, 31, function(x, y)
    if x % 16 == 0 or y % 16 == 0 then return "#1a1410" end
    local r = ((x * 5 + y * 3) % 9)
    return r < 2 and "#3a2c22" or (r > 6 and "#54402e" or "#46362a")
  end)
  add("floor", fl, 0, 0)
  -- 무기 걸이(나무 판 + 못)
  local rk = L.new(110, 14)
  L.rect(rk, 0, 3, 110, 8, WOOD[3]); L.hline(rk, 0, 109, 3, WOOD[5]); L.hline(rk, 0, 109, 10, WOOD[2])
  for x = 8, 104, 16 do L.rect(rk, x, 0, 2, 4, STEEL[4]) end
  L.outline(rk, OL)
  add("rack", rk, 0, 0)
  -- 자물쇠(잠긴 화구)
  local lk = L.new(14, 16)
  L.each(lk, 2, 0, 11, 8, function(x, y) local d = math.sqrt((x + 0.5 - 7) ^ 2 + (y + 0.5 - 7) ^ 2); if d > 3 and d < 5.2 and y < 8 then return STEEL[4] end end)
  L.rect(lk, 1, 7, 12, 8, GOLD[3]); L.hline(lk, 1, 12, 7, GOLD[4]); L.hline(lk, 1, 12, 14, GOLD[1]); L.rect(lk, 6, 9, 2, 4, "#2a1a0a")
  L.outline(lk, OL)
  add("lock", lk, 7, 15)
  -- 수증기 덩이 / 바람 줄기 / 불티
  local st = L.new(12, 10)
  L.each(st, 0, 0, 11, 9, function(x, y) local d = ((x + 0.5 - 6) / 5.6) ^ 2 + ((y + 0.5 - 5) / 4.4) ^ 2; if d <= 1 then return d < 0.4 and "#ffffff" or "#d8e8f0" end end)
  add("steam", st, 6, 5)
  local wd = L.new(14, 5)
  L.hline(wd, 0, 10, 1, "#d8f0ff"); L.hline(wd, 3, 13, 3, "#a8d8f0"); L.set(wd, 12, 1, "#ffffff")
  add("wind", wd, 0, 2)
end

-- ==========================================================================
-- 손님 상반신(카운터 너머) 6종 — 32×34, 기준점 = 아래 가운데
-- ==========================================================================
local BUSTS = {
  { cloak = { "#5a1a1e", "#8e2a30", "#c04048" }, head = "helm" },     -- 붉은 망토 검사
  { cloak = { "#1e3a1e", "#2f5a2c", "#4a8044" }, head = "hood" },     -- 초록 두건 궁수
  { cloak = { "#1e2a5a", "#2c3e8a", "#4a62c0" }, head = "hat" },      -- 푸른 모자 마법사
  { cloak = { "#4a3018", "#6e4a24", "#966a38" }, head = "beard" },    -- 갈색 수염 도끼 용병
  { cloak = { "#3a404c", "#6a7488", "#a2aec4" }, head = "knight" },   -- 은빛 기사(깃털 투구)
  { cloak = { "#2c1a4a", "#4a2c80", "#7a52c0" }, head = "witch" }     -- 보랏빛 마녀
}
local function bust(lk, blink)
  local b = L.new(32, 34)
  -- 어깨/몸
  L.shadeEllipse(b, 16, 33, 14, 12, lk.cloak, 0.04)
  L.hline(b, 6, 25, 26, lk.cloak[1])
  L.set(b, 16, 27, GOLD[3]); L.set(b, 16, 28, GOLD[2])
  -- 얼굴
  L.shadeEllipse(b, 16, 15, 7, 7.5, SKIN, 0.06)
  local ey = 16
  if blink then L.hline(b, 12, 13, ey, "#2a1a14"); L.hline(b, 19, 20, ey, "#2a1a14")
  else L.rect(b, 12, ey - 1, 2, 2, "#1a1210"); L.rect(b, 19, ey - 1, 2, 2, "#1a1210"); L.set(b, 12, ey - 1, "#ffffff"); L.set(b, 19, ey - 1, "#ffffff") end
  L.hline(b, 15, 17, 20, "#7a3a2a")
  L.set(b, 10, 18, "#e08a7a"); L.set(b, 22, 18, "#e08a7a")
  if lk.head == "helm" then L.shadeEllipse(b, 16, 10, 8.5, 5.5, STEEL, 0.1); L.vline(b, 16, 2, 5, "#c04048"); L.hline(b, 8, 24, 12, STEEL[2])
  elseif lk.head == "hood" then L.poly(b, { { 6, 20 }, { 16, 1 }, { 26, 20 }, { 23, 11 }, { 16, 8 }, { 9, 11 } }, lk.cloak[2]); L.line(b, 16, 1, 9, 11, lk.cloak[3])
  elseif lk.head == "hat" then L.poly(b, { { 3, 10 }, { 29, 10 }, { 19, 0 } }, lk.cloak[2]); L.hline(b, 3, 29, 10, lk.cloak[1]); L.hline(b, 3, 29, 11, lk.cloak[1]); L.set(b, 19, 0, GOLD[4]); L.set(b, 18, 1, GOLD[3])
  elseif lk.head == "beard" then L.poly(b, { { 9, 18 }, { 23, 18 }, { 21, 26 }, { 16, 28 }, { 11, 26 } }, "#c0602a"); L.hline(b, 13, 19, 21, "#9a4a20"); L.shadeEllipse(b, 16, 9, 7, 3, { "#2a1a10", "#4a3220", "#6a4a30" }, 0.0)
  elseif lk.head == "knight" then L.shadeEllipse(b, 16, 13, 8.5, 8.5, STEEL, 0.12); L.hline(b, 10, 22, 15, "#141820"); L.hline(b, 10, 22, 16, "#141820"); L.set(b, 13, 16, "#8ae8f8"); L.set(b, 19, 16, "#8ae8f8"); L.poly(b, { { 15, 5 }, { 18, 0 }, { 24, 2 }, { 18, 6 } }, RED[3])
  else L.poly(b, { { 4, 11 }, { 28, 11 }, { 13, 0 } }, lk.cloak[2]); L.hline(b, 4, 28, 11, lk.cloak[1]); L.set(b, 13, 0, "#8ae8f8"); L.ellipse(b, 9, 17, 2, 5, lk.cloak[3]); L.ellipse(b, 23, 17, 2, 5, lk.cloak[3]) end
  L.outline(b, OL)
  return b
end
for i, lk in ipairs(BUSTS) do
  add("bust" .. (i - 1) .. "_0", bust(lk, false), 16, 33)
  add("bust" .. (i - 1) .. "_1", bust(lk, true), 16, 33)
end

-- ==========================================================================
-- 마을의 「마법 대장간」 건물 — 180×128, 기준점 = 발치 가운데(부지 아래 가운데)
-- ==========================================================================
do
  local Wd, Ht = 180, 128
  local b = L.new(Wd, Ht)
  local base = Ht - 1
  -- 돌 기단
  L.rect(b, 6, base - 14, Wd - 12, 14, STONE[3]); L.hline(b, 6, Wd - 7, base - 14, STONE[5]); L.hline(b, 6, Wd - 7, base, STONE[1])
  for x = 10, Wd - 10, 14 do L.vline(b, x, base - 13, base - 1, STONE[2]) end
  -- 벽(돌 + 반목조)
  L.each(b, 12, 44, Wd - 13, base - 15, function(x, y)
    local row = math.floor(y / 6); local off = (row % 2) * 7
    if (x + off) % 14 == 0 or y % 6 == 0 then return STONE[2] end
    return x < 40 and STONE[5] or (x > Wd - 40 and STONE[3] or STONE[4])
  end)
  for _, x in ipairs({ 12, 50, Wd - 51, Wd - 14 }) do L.rect(b, x, 44, 3, base - 59, WOOD[2]); L.vline(b, x, 44, base - 16, WOOD[3]) end
  L.rect(b, 12, 44, Wd - 24, 3, WOOD[2])
  -- 지붕(짙은 슬레이트 + 금빛 용마루) — 박공
  L.each(b, 0, 2, Wd - 1, 48, function(x, y)
    local cx = Wd / 2
    local top = 6 + math.abs(x + 0.5 - cx) * 0.42
    if y < top or y > 48 then return nil end
    local band = math.floor((y - top) / 4)
    local tile = ((x + band * 3) % 8 == 0)
    if y > 45 then return "#141018" end
    return tile and "#1c1a28" or (band % 2 == 0 and "#3a3450" or "#2e2a42")
  end)
  L.line(b, 4, 46, Wd / 2, 6, GOLD[3]); L.line(b, Wd - 5, 46, Wd / 2, 6, GOLD[2])
  -- 굴뚝 둘(오른쪽 큰 것은 불티를 뿜는다 — 게임이 연기/불티를 그린다)
  L.rect(b, Wd - 50, 0, 16, 24, BRICK[3]); L.vline(b, Wd - 50, 0, 23, BRICK[5]); L.hline(b, Wd - 52, Wd - 33, 0, STONE[5])
  for y = 3, 21, 4 do L.hline(b, Wd - 49, Wd - 35, y, BRICK[1]) end
  L.rect(b, 30, 10, 10, 16, BRICK[3]); L.hline(b, 28, 41, 10, STONE[5])
  -- 큰 아치문(안에서 화덕 빛이 새어 나온다 — 안쪽은 게임이 칠한다)
  L.each(b, Wd / 2 - 22, 58, Wd / 2 + 22, base - 15, function(x, y)
    local d = ((x + 0.5 - Wd / 2) / 22) ^ 2 + ((y + 0.5 - 76) / 18) ^ 2
    local inside = (y >= 76 and math.abs(x + 0.5 - Wd / 2) <= 19) or d <= 0.85
    local rim = (y >= 76 and math.abs(x + 0.5 - Wd / 2) > 19 and math.abs(x + 0.5 - Wd / 2) <= 22) or (d <= 1 and d > 0.85 and y < 76)
    if inside then return "#ff9a3c" end
    if rim then return y < 70 and STONE[6] or STONE[5] end
  end)
  -- 문 안쪽: 화덕 빛 + 모루 실루엣
  L.each(b, Wd / 2 - 19, 62, Wd / 2 + 19, base - 15, function(x, y)
    if L.get(b, x, y) ~= "#ff9a3c" then return nil end
    local glow = (y - 62) / 50
    return glow > 0.7 and FIRE[4] or (glow > 0.35 and FIRE[3] or FIRE[2])
  end)
  L.poly(b, { { Wd / 2 - 12, base - 26 }, { Wd / 2 + 10, base - 26 }, { Wd / 2 + 14, base - 23 }, { Wd / 2 + 8, base - 21 }, { Wd / 2 + 4, base - 16 }, { Wd / 2 - 4, base - 16 }, { Wd / 2 - 6, base - 21 } }, "#1a0c06")
  -- 창 둘(불빛) + 덧문
  for _, wx in ipairs({ 24, Wd - 42 }) do
    L.rect(b, wx, 64, 18, 16, "#120806"); L.rect(b, wx + 2, 66, 14, 12, FIRE[3]); L.rect(b, wx + 2, 66, 14, 4, FIRE[4])
    L.vline(b, wx + 9, 66, 77, WOOD[2]); L.hline(b, wx + 2, wx + 15, 71, WOOD[2])
    L.rect(b, wx - 4, 63, 4, 18, WOOD[3]); L.rect(b, wx + 18, 63, 4, 18, WOOD[3])
  end
  -- 간판: 모루와 검 문장 + 청록 룬
  L.rect(b, Wd / 2 - 20, 30, 40, 18, WOOD[3]); L.hline(b, Wd / 2 - 20, Wd / 2 + 19, 30, WOOD[5]); L.hline(b, Wd / 2 - 20, Wd / 2 + 19, 47, WOOD[1])
  L.poly(b, { { Wd / 2 - 11, 38 }, { Wd / 2 + 9, 38 }, { Wd / 2 + 13, 40 }, { Wd / 2 + 7, 42 }, { Wd / 2 + 3, 44 }, { Wd / 2 - 3, 44 }, { Wd / 2 - 5, 42 } }, STEEL[4])
  L.line(b, Wd / 2 - 9, 44, Wd / 2 + 8, 32, STEEL[5]); L.set(b, Wd / 2 - 7, 42, GOLD[3]); L.set(b, Wd / 2 - 6, 41, GOLD[3])
  for _, p in ipairs({ { Wd / 2 - 16, 34 }, { Wd / 2 + 15, 34 }, { Wd / 2 - 16, 43 }, { Wd / 2 + 15, 43 } }) do L.set(b, p[1], p[2], TEAL[4]) end
  L.vline(b, Wd / 2 - 14, 22, 30, STEEL[3]); L.vline(b, Wd / 2 + 13, 22, 30, STEEL[3])
  -- 문 옆 화로 기둥 둘
  for _, x in ipairs({ Wd / 2 - 34, Wd / 2 + 30 }) do
    L.rect(b, x, base - 34, 5, 20, STONE[4]); L.vline(b, x, base - 34, base - 15, STONE[6])
    L.rect(b, x - 2, base - 38, 9, 4, STEEL[2]); L.hline(b, x - 2, x + 6, base - 38, STEEL[4])
  end
  -- 앞마당의 숯 자루와 철 막대(소품)
  L.rect(b, 14, base - 12, 12, 10, LEATHER[3]); L.hline(b, 14, 25, base - 12, LEATHER[5]); L.rect(b, 16, base - 15, 8, 3, "#1a1414")
  for k = 0, 2 do L.line(b, Wd - 30 + k * 3, base - 2, Wd - 26 + k * 3, base - 18, STEEL[3 + (k % 2)]) end
  L.outline(b, OL)
  add("forge_bld", b, Wd / 2, Ht - 1)
end

-- ==========================================================================
-- 살아 있는 자원 지점(나무 / 광맥 바위 / 약초 군락) + 황금 희귀 지점 + 베고 난 자리 — 기준점 = 발치
-- ==========================================================================
local function treeNode(gold)
  local b = L.new(40, 52)
  local leaf = gold and { "#5a4010", "#8a6418", "#c09a30", "#e8c858", "#fff0a0", "#fffbe0" } or LEAF
  local bark = gold and { "#3a2a10", "#5a4218", "#806020", "#a88430", "#d0b050" } or BARK
  L.shadeCyl(b, 16, 30, 8, 21, bark, 0.0)
  L.set(b, 15, 50, bark[2]); L.set(b, 24, 50, bark[2]); L.hline(b, 13, 26, 51, bark[1])
  for _, c in ipairs({ { 20, 18, 14, 12 }, { 11, 25, 9, 8 }, { 29, 25, 9, 8 }, { 20, 9, 10, 8 } }) do L.shadeEllipse(b, c[1], c[2], c[3], c[4], leaf, 0.04) end
  local r = L.rng(gold and 77 or 41)
  for i = 1, 18 do local x, y = 8 + math.floor(r() * 24), 4 + math.floor(r() * 26); if L.get(b, x, y) then L.set(b, x, y, leaf[#leaf]) end end
  L.vline(b, 19, 34, 44, bark[1]); L.set(b, 22, 38, bark[5])   -- 도끼 자국 자리
  L.outline(b, OL)
  return b
end
add("tree_live", treeNode(false), 20, 51)
add("tree_gold", treeNode(true), 20, 51)
do
  local s = L.new(22, 14)
  L.shadeCyl(s, 6, 4, 10, 9, BARK, 0.0)
  L.shadeEllipse(s, 11, 4, 5, 2.2, { "#a8784a", "#c8975a", "#e0b880" }, 0.0); L.set(s, 11, 4, "#8a5f2f")
  L.line(s, 2, 12, 6, 10, BARK[3]); L.line(s, 19, 12, 15, 10, BARK[3]); L.hline(s, 1, 20, 13, BARK[1])
  L.outline(s, OL); add("stump", s, 11, 13)
end
local function rockNode(gold)
  local b = L.new(32, 26)
  local ramp = gold and { "#3a3020", "#5a5038", "#7a7458", "#a0a088", "#d8e0f0", "#ffffff" } or STONE
  L.shadePoly(b, { { 1, 24 }, { 4, 12 }, { 11, 4 }, { 20, 3 }, { 28, 9 }, { 31, 24 } }, ramp, 0.05)
  local vein = gold and { "#8ae8f8", "#e4fdff" } or { "#c87a3a", "#e8a050" }
  for _, p in ipairs({ { 12, 10 }, { 18, 8 }, { 9, 16 }, { 22, 15 }, { 16, 19 } }) do L.set(b, p[1], p[2], vein[1]); L.set(b, p[1] + 1, p[2], vein[2]); L.set(b, p[1], p[2] - 1, vein[2]) end
  for x = 3, 28 do if L.get(b, x, 24) then L.set(b, x, 24, MOSS[2]) end end
  L.line(b, 15, 4, 13, 12, ramp[1])
  L.outline(b, OL)
  return b
end
add("rock_live", rockNode(false), 16, 25)
add("rock_gold", rockNode(true), 16, 25)
do
  local s = L.new(26, 10)
  for _, c in ipairs({ { 6, 6, 5, 3 }, { 14, 7, 4, 2.6 }, { 20, 6, 4, 3 } }) do L.shadeEllipse(s, c[1], c[2], c[3], c[4], STONE, 0.05) end
  L.outline(s, OL); add("rock_broken", s, 13, 9)
end
local function bushNode(gold)
  local b = L.new(28, 22)
  local lf = gold and { "#5a4a10", "#a08a20", "#e0c848", "#fff0a0" } or { "#1d5a2c", "#2f8a4a", "#3da35a", "#7ad08a" }
  for k = -4, 4 do L.line(b, 14 + k * 2.4, 21, 14 + k * 3.1, 7 + math.abs(k) * 1.6, k % 2 == 0 and lf[3] or lf[2]) end
  for k = -3, 3 do L.line(b, 14 + k * 2, 21, 14 + k * 2.6, 11 + math.abs(k) * 1.4, lf[1]) end
  local fl = gold and { "#fff6d0", "#ffd86a" } or { "#9ff0d0", "#c9a6ff" }
  for _, p in ipairs({ { 14, 4 }, { 7, 8 }, { 21, 8 }, { 10, 12 }, { 18, 11 } }) do L.set(b, p[1], p[2], fl[1]); L.set(b, p[1] + 1, p[2], fl[2]); L.set(b, p[1], p[2] + 1, fl[2]) end
  L.outline(b, OL)
  return b
end
add("bush_live", bushNode(false), 14, 21)
add("bush_gold", bushNode(true), 14, 21)
do
  local s = L.new(24, 8)
  for k = -4, 4 do L.line(s, 12 + k * 2.4, 7, 12 + k * 2.4, 4 + (k % 2), k % 2 == 0 and "#2f8a4a" or "#1d5a2c") end
  L.outline(s, OL); add("bush_cut", s, 12, 7)
end
-- 조각 파편(나뭇조각 / 돌 조각 / 풀잎)
do
  local c1 = L.new(4, 3); L.rect(c1, 0, 0, 4, 3, WOOD[5]); L.hline(c1, 0, 3, 2, WOOD[3]); add("chip_wood", c1, 2, 1)
  local c2 = L.new(3, 3); L.rect(c2, 0, 0, 3, 3, STONE[4]); L.set(c2, 0, 0, STONE[6]); add("chip_rock", c2, 1, 1)
  local c3 = L.new(4, 2); L.hline(c3, 0, 3, 0, "#7ad08a"); L.hline(c3, 1, 3, 1, "#2f8a4a"); add("chip_leaf", c3, 2, 1)
end

-- ==========================================================================
-- 셋째 보스 원거리 무늬: 땅속 가시 뿌리(솟는 3프레임) / 가시 씨앗(오른쪽을 가리킨다)
-- ==========================================================================
local THORN = { "#1a2414", "#26361f", "#34502a", "#4a6e36", "#679048", "#8ab060" }
for k = 0, 2 do
  local h = ({ 12, 26, 34 })[k + 1]
  local b = L.new(30, 36)
  local function spike(cx, hh, w)
    L.poly(b, { { cx - w, 35 }, { cx, 35 - hh }, { cx + w, 35 } }, function(x, y) return x < cx and THORN[5] or THORN[3] end)
    L.set(b, cx, 35 - hh, "#e0607a")
  end
  spike(15, h, 5); spike(8, h * 0.6, 3); spike(23, h * 0.7, 3)
  L.hline(b, 2, 27, 35, "#2a1a10")
  for x = 4, 26, 5 do L.set(b, x, 34, "#4a3020") end
  L.outline(b, OL)
  add("root_spike_" .. k, b, 15, 35)
end
do
  local b = L.new(14, 8)
  L.poly(b, { { 0, 4 }, { 4, 1 }, { 13, 4 }, { 4, 7 } }, function(x, y) return y < 4 and THORN[6] or THORN[4] end)
  L.set(b, 13, 4, "#e0607a"); L.set(b, 12, 4, "#f0a0b0"); L.set(b, 3, 4, "#2a1a10")
  L.outline(b, OL)
  add("thorn_seed", b, 7, 4)
end

local sheet, placed = L.atlas(items, 512, 1)
L.saveAtlas(OUT .. "/forge.aseprite", OUT .. "/forge.png", sheet, placed)
local m = { items = {} }
for _, it in ipairs(placed) do m.items[it.name] = { it.x, it.y, it.buf.w, it.buf.h, it.ax, it.ay } end
m.w, m.h = sheet.w, sheet.h
L.writeFile(OUT .. "/forge.json", L.json(m))
print("forge: " .. #placed .. " items, sheet " .. sheet.w .. "x" .. sheet.h)
