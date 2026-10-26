-- ==========================================================================
-- reboot.lua — 「검과 마법」 리부트 전용 도트: 화톳불(4프레임) · 고대 비석 · 바위 장벽 · 가시덩굴 장벽 · 보물상자(닫힘/열림) ·
--              금광맥 · 수정 광맥 · 비전 마법 아이콘 3종 · 에스트 물약 · 액션 버튼(마법/물약) · 핏자국(잃어버린 골드) · 보스 소재 반짝임
--   v82: 방랑 NPC 5인(npc_*_0/1) · 사신수의 성소 4(beast_*) · 보스 둥지의 불안정한 지형 5(trap_* + 잔해 _x) · 전실 봉인 장치(dev_*) ·
--        봉인된 보물상자(chest_sealed) · 스마트 원버튼 아이콘(ic_talk · ic_bless)
--   aseprite -b --script-param dir=<이 폴더> --script-param out=<assets/sprites> --script reboot.lua
-- 결과: rb.aseprite(슬라이스 = 이름), rb.png, rb.json { items: { 이름: [x, y, w, h, ax, ay] } }
--   월드 물체의 기준점은 바닥 가운데(ax = w/2, ay = h-1), 아이콘은 가운데.
-- ==========================================================================
local DIR = app.params.dir
local OUT = app.params.out
package.path = DIR .. "/?.lua;" .. package.path
local L = require("lib")

local OL = "#0b0a10"
local WOOD = { "#2a170c", "#4a2a14", "#6e4220", "#965e30", "#c08a4e" }
local STONE = { "#1e2228", "#30363f", "#4a525e", "#6c7684", "#98a2b0", "#c4ccd6" }
local FIRE = { "#6a1406", "#b83614", "#ec7424", "#ffb238", "#ffe890", "#fffbe0" }
local GOLD = { "#5a3a10", "#8a5e1c", "#c08a34", "#e8b850", "#f8dc88", "#fff6d0" }
local TEAL = { "#0c3442", "#145a6e", "#1f8aa0", "#3fc0d8", "#8ae8f8", "#e4fdff" }
local VIOLET = { "#22123e", "#3a2070", "#5c38a8", "#8a64e0", "#c4a8ff", "#efe4ff" }
local CRIM = { "#3a0814", "#6a1024", "#a01c34", "#d8364e", "#ff7a8a" }
local THORN = { "#1a0e10", "#3a1a1e", "#5e2a2a", "#8a3e34", "#b85a44" }
local LEAF = { "#123a1c", "#1f5a2c", "#2f7f3c", "#4fa854", "#8ad070" }
local GLASS = { "#3a1a08", "#7a3410", "#c86a1c", "#f0a030", "#ffd870", "#fff4c0" }

local items = {}
local function add(name, b, ax, ay) items[#items + 1] = { name = name, buf = b, ax = ax or math.floor(b.w / 2), ay = ay or (b.h - 1) } end
local function icon(name, w, fn) local b = L.new(w, w); fn(b); L.outline(b, OL); add(name, b, w / 2, w / 2) end
local function obj(name, w, h, fn, noOutline) local b = L.new(w, h); fn(b); if not noOutline then L.outline(b, OL) end; add(name, b) end

-- ----------------------------------------------------------- 화톳불 4프레임(40×46): 둥근 돌 테 + 엇갈린 장작 + 꽂힌 검 + 일렁이는 불길
for f = 0, 3 do
  obj("bonfire_" .. f, 40, 46, function(b)
    -- 돌 테두리(타원 위의 돌 8개)
    for k = 0, 7 do
      local a = k / 8 * math.pi * 2
      local sx, sy = 20 + math.cos(a) * 15, 39 + math.sin(a) * 5
      L.shadeEllipse(b, sx, sy, 3.4, 2.6, STONE, 0.05)
    end
    L.ellipse(b, 20, 39, 11, 3, "#2a1a10")
    -- 장작 셋(엇갈림)
    L.line(b, 9, 41, 31, 34, WOOD[2]); L.line(b, 9, 40, 31, 33, WOOD[4]); L.line(b, 10, 40, 30, 34, WOOD[3])
    L.line(b, 31, 41, 9, 34, WOOD[2]); L.line(b, 31, 40, 9, 33, WOOD[4])
    L.line(b, 20, 42, 20, 33, WOOD[3])
    L.set(b, 12, 39, FIRE[3]); L.set(b, 27, 38, FIRE[3]); L.set(b, 18, 37, FIRE[4])   -- 숯불
    -- 꽂힌 나선 검(어둠의 영혼식): 가운데 위로 비스듬히
    for y = 8, 36 do local x = 20 + math.floor((36 - y) * 0.12); L.set(b, x, y, (y % 3 == 0) and STONE[4] or STONE[5]); L.set(b, x + 1, y, STONE[3]) end
    L.hline(b, 19, 25, 10, GOLD[3]); L.set(b, 22, 9, GOLD[5]); L.rect(b, 22, 5, 2, 4, WOOD[3]); L.set(b, 22, 4, GOLD[4])
    -- 불길: 프레임마다 혀 모양이 흔들린다
    local sway = ({ 0, 1, 0, -1 })[f + 1]
    local tall = ({ 0, 2, 1, 3 })[f + 1]
    for y = 14 - tall, 38 do
      local t = (y - (14 - tall)) / (38 - (14 - tall))      -- 0(꼭대기) → 1(바닥)
      local hw = 1.5 + t * 9 + math.sin(y * 0.7 + f) * 1.2
      local cxf = 20 + sway * (1 - t) * 2
      for x = math.floor(cxf - hw), math.ceil(cxf + hw) do
        local d = math.abs(x + 0.5 - cxf) / hw
        if d <= 1 then
          local v = (1 - d) * 0.7 + (1 - t) * 0.1 + t * 0.25
          local c = v > 0.72 and FIRE[6] or v > 0.55 and FIRE[5] or v > 0.38 and FIRE[4] or v > 0.2 and FIRE[3] or FIRE[2]
          if not (x >= 20 and x <= 21 and y > 20 and y < 30 and f % 2 == 0) then L.set(b, x, y, c) end
        end
      end
    end
    -- 튀는 불씨
    local sp = { { 12, 9 }, { 29, 6 }, { 15, 3 }, { 26, 12 } }
    L.set(b, sp[f + 1][1], sp[f + 1][2], FIRE[5]); L.set(b, sp[(f + 2) % 4 + 1][1] + 1, sp[(f + 2) % 4 + 1][2] + 4, FIRE[4])
  end, true)
end
obj("bonfire_out", 40, 46, function(b)   -- 아직 불붙지 않은 화톳불(재 + 검)
  for k = 0, 7 do local a = k / 8 * math.pi * 2; L.shadeEllipse(b, 20 + math.cos(a) * 15, 39 + math.sin(a) * 5, 3.4, 2.6, STONE, 0.05) end
  L.ellipse(b, 20, 39, 11, 3, "#3a3634")
  L.line(b, 9, 41, 31, 34, WOOD[1]); L.line(b, 31, 41, 9, 34, WOOD[1])
  for y = 8, 36 do local x = 20 + math.floor((36 - y) * 0.12); L.set(b, x, y, STONE[3]); L.set(b, x + 1, y, STONE[2]) end
  L.hline(b, 19, 25, 10, GOLD[2]); L.rect(b, 22, 5, 2, 4, WOOD[2])
end)

-- ----------------------------------------------------------- 고대 비석(26×44): 룬이 새겨진 이끼 낀 돌판, 활성이면 청록 룬이 빛난다
for _, st in ipairs({ { "stele", TEAL }, { "stele_used", STONE } }) do
  obj(st[1], 26, 44, function(b)
    L.shadePoly(b, { { 4, 43 }, { 3, 10 }, { 8, 3 }, { 18, 2 }, { 23, 9 }, { 22, 43 } }, STONE, 0)
    L.rect(b, 1, 40, 24, 4, STONE[2]); L.hline(b, 1, 24, 40, STONE[4])
    local R = st[2]
    for k = 0, 4 do local y = 11 + k * 6; L.hline(b, 8, 18, y, R[3]); L.set(b, 9 + (k * 3) % 8, y - 1, R[5]); L.set(b, 16 - (k * 2) % 6, y + 1, R[4]) end
    L.vline(b, 13, 8, 36, R[2])
    for _, p in ipairs({ { 5, 30 }, { 6, 31 }, { 20, 22 }, { 21, 23 }, { 4, 15 } }) do L.set(b, p[1], p[2], LEAF[3]) end   -- 이끼
  end)
end

-- ----------------------------------------------------------- 바위 장벽(40×38): 금이 간 거대한 바위 덩이 + 부서진 조각
for k = 0, 2 do   -- 0 멀쩡 · 1 금 · 2 크게 갈라짐
  obj("boulder_" .. k, 40, 38, function(b)
    L.shadeEllipse(b, 20, 22, 18, 15, STONE, 0.05)
    L.shadeEllipse(b, 12, 28, 9, 8, STONE, -0.05)
    L.shadeEllipse(b, 29, 27, 10, 9, STONE, 0)
    if k >= 1 then L.line(b, 18, 9, 22, 20, STONE[1]); L.line(b, 22, 20, 17, 30, STONE[1]); L.line(b, 22, 20, 30, 24, STONE[1]) end
    if k >= 2 then L.line(b, 10, 14, 18, 22, STONE[1]); L.line(b, 26, 10, 31, 18, STONE[1]); L.line(b, 6, 26, 14, 33, STONE[1]); L.set(b, 20, 21, GOLD[4]) end
  end)
end
obj("rubble", 34, 12, function(b)
  for _, r in ipairs({ { 6, 7, 5, 3 }, { 15, 8, 4, 3 }, { 25, 7, 6, 4 }, { 11, 4, 3, 2 }, { 21, 4, 3, 2 } }) do L.shadeEllipse(b, r[1], r[2], r[3], r[4], STONE, 0) end
end)

-- ----------------------------------------------------------- 가시덩굴 장벽(48×36): 검붉은 가시 줄기가 엉킨 벽 / 타고 남은 재
obj("thornwall", 48, 36, function(b)
  for k = 0, 6 do
    local x0 = 2 + k * 7
    for y = 4, 35 do
      local x = x0 + math.floor(math.sin(y * 0.35 + k * 1.7) * 3)
      L.set(b, x, y, THORN[3 + (y + k) % 2]); L.set(b, x + 1, y, THORN[2])
      if (y + k * 3) % 6 == 0 then L.set(b, x - 1, y - 1, THORN[5]); L.set(b, x - 2, y - 2, "#e8c8a0") end
      if (y + k * 5) % 7 == 0 then L.set(b, x + 2, y - 1, THORN[5]); L.set(b, x + 3, y - 2, "#e8c8a0") end
    end
  end
  for _, p in ipairs({ { 8, 10 }, { 22, 6 }, { 36, 12 }, { 15, 22 }, { 40, 25 } }) do L.shadeEllipse(b, p[1], p[2], 2.2, 2.2, CRIM, 0.1) end   -- 핏빛 꽃봉오리
end)
obj("thorn_ash", 48, 12, function(b)
  for x = 2, 45 do local h = 2 + math.floor((math.sin(x * 1.3) + 1) * 2); for y = 11 - h, 11 do L.set(b, x, y, (x + y) % 3 == 0 and "#5a4a44" or "#2e2624") end end
  L.set(b, 12, 8, FIRE[3]); L.set(b, 31, 9, FIRE[2])
end, true)

-- ----------------------------------------------------------- 보물상자(24×20) 닫힘/열림
for _, op in ipairs({ false, true }) do
  obj(op and "chest_open" or "chest", 24, 20, function(b)
    L.rect(b, 2, 9, 20, 10, WOOD[3]); L.hline(b, 2, 21, 9, WOOD[5]); L.hline(b, 2, 21, 18, WOOD[1])
    for x = 2, 21, 5 do L.vline(b, x, 10, 17, WOOD[2]) end
    L.rect(b, 2, 12, 20, 2, GOLD[3]); L.hline(b, 2, 21, 12, GOLD[5])
    if op then
      L.rect(b, 3, 3, 18, 6, WOOD[2]); L.rect(b, 4, 7, 16, 3, "#1a0e06")
      L.set(b, 8, 8, GOLD[5]); L.set(b, 12, 7, GOLD[6]); L.set(b, 16, 8, GOLD[4])
    else
      L.rect(b, 2, 3, 20, 7, WOOD[4]); L.hline(b, 3, 20, 3, WOOD[5]); L.rect(b, 2, 6, 20, 2, GOLD[3])
      L.rect(b, 10, 8, 4, 5, GOLD[4]); L.set(b, 11, 10, "#1a0e06"); L.set(b, 12, 10, "#1a0e06")
    end
  end)
end

-- ----------------------------------------------------------- 광맥: 금광맥(30×24) · 수정 광맥(28×30) · 캔 자리
obj("vein_gold", 30, 24, function(b)
  L.shadeEllipse(b, 15, 14, 14, 10, STONE, 0)
  for _, p in ipairs({ { 9, 10 }, { 18, 8 }, { 21, 15 }, { 12, 17 }, { 15, 12 } }) do L.rect(b, p[1], p[2], 3, 2, GOLD[4]); L.set(b, p[1], p[2], GOLD[6]) end
end)
obj("vein_crystal", 28, 30, function(b)
  L.shadeEllipse(b, 14, 25, 13, 5, STONE, 0)
  L.shadePoly(b, { { 6, 26 }, { 8, 8 }, { 12, 3 }, { 14, 26 } }, VIOLET, 0.1)
  L.shadePoly(b, { { 13, 26 }, { 16, 12 }, { 20, 9 }, { 22, 26 } }, VIOLET, 0.2)
  L.shadePoly(b, { { 3, 27 }, { 4, 17 }, { 7, 16 }, { 8, 27 } }, TEAL, 0.1)
  L.set(b, 10, 7, VIOLET[6]); L.set(b, 18, 12, VIOLET[6])
end)
obj("vein_spent", 28, 12, function(b) L.shadeEllipse(b, 14, 7, 12, 4, STONE, -0.1) end)

-- ----------------------------------------------------------- 핏자국(잃어버린 골드) 20×10
obj("bloodstain", 20, 10, function(b)
  L.ellipse(b, 10, 5, 8, 3, "#6a0e14"); L.ellipse(b, 9, 5, 5, 2, "#a01c24")
  L.set(b, 16, 2, "#8a1018"); L.set(b, 3, 7, "#8a1018"); L.set(b, 10, 4, GOLD[5])
end, true)

-- ----------------------------------------------------------- 비전 마법 아이콘(16×16): 초승달 열파참 · 홍련의 화염진 · 천벌의 벼락창 · 에스트
icon("sp_wave", 16, function(b)
  for y = 0, 15 do for x = 0, 15 do
    local d = math.sqrt((x + 0.5 - 5) ^ 2 + (y + 0.5 - 8) ^ 2); local e = math.sqrt((x + 0.5 - 2.5) ^ 2 + (y + 0.5 - 8) ^ 2)
    if d <= 7.5 and e > 7 then L.set(b, x, y, d > 6.6 and TEAL[3] or (e < 8.2 and TEAL[6] or TEAL[5])) end
  end end
  L.line(b, 1, 4, 4, 4, TEAL[4]); L.line(b, 1, 12, 4, 12, TEAL[4])
end)
icon("sp_fire", 16, function(b)
  L.ellipse(b, 8, 11, 7, 3, CRIM[3]); L.ellipse(b, 8, 11, 5, 2, FIRE[2])
  for k = 0, 4 do local x = 3 + k * 2.5; local h = (k % 2 == 0) and 9 or 6; L.line(b, math.floor(x), 11, math.floor(x), 11 - h, FIRE[3 + k % 2]); L.set(b, math.floor(x), 11 - h, FIRE[5]) end
end)
icon("sp_bolt", 16, function(b)
  L.poly(b, { { 9, 0 }, { 3, 9 }, { 7, 9 }, { 5, 15 }, { 13, 5 }, { 9, 5 }, { 11, 0 } }, GOLD[5])
  L.line(b, 9, 1, 5, 8, GOLD[6]); L.set(b, 6, 13, "#ffffff")
end)
icon("estus", 16, function(b)
  L.rect(b, 6, 1, 4, 2, WOOD[4]); L.rect(b, 7, 3, 2, 3, GLASS[2])
  L.shadeEllipse(b, 8, 10, 5.5, 5, GLASS, 0.15)
  L.set(b, 6, 8, GLASS[6]); L.set(b, 6, 9, GLASS[6])
end)
icon("estus_empty", 16, function(b)
  L.rect(b, 6, 1, 4, 2, WOOD[2]); L.rect(b, 7, 3, 2, 3, STONE[3])
  L.shadeEllipse(b, 8, 10, 5.5, 5, STONE, 0.1)
end)

-- ----------------------------------------------------------- 큰 액션 버튼 아이콘(32×32): 비전 마법 · 에스트 물약
icon("btn_magic", 32, function(b)
  for y = 0, 31 do for x = 0, 31 do
    local d = math.sqrt((x + 0.5 - 16) ^ 2 + (y + 0.5 - 16) ^ 2)
    if d >= 12 and d < 14 then L.set(b, x, y, ((math.floor(math.atan(y - 16, x - 16) * 4) % 2) == 0) and TEAL[5] or TEAL[3]) end
  end end
  -- 여덟 갈래 별(마나 결정)
  L.poly(b, { { 16, 3 }, { 18, 13 }, { 28, 16 }, { 18, 19 }, { 16, 29 }, { 14, 19 }, { 4, 16 }, { 14, 13 } }, VIOLET[5])
  L.poly(b, { { 16, 8 }, { 17, 15 }, { 23, 16 }, { 17, 17 }, { 16, 24 }, { 15, 17 }, { 9, 16 }, { 15, 15 } }, VIOLET[6])
  L.set(b, 16, 16, "#ffffff"); L.set(b, 22, 9, TEAL[6]); L.set(b, 9, 23, TEAL[6]); L.set(b, 23, 22, VIOLET[6])
end)
icon("btn_estus", 32, function(b)
  L.rect(b, 13, 2, 6, 3, WOOD[4]); L.hline(b, 13, 18, 2, WOOD[5])
  L.rect(b, 14, 5, 4, 6, GLASS[3]); L.vline(b, 14, 5, 10, GLASS[5])
  L.shadeEllipse(b, 16, 20, 10, 9.5, GLASS, 0.15)
  for x = 8, 24 do if (x % 3) == 0 then L.set(b, x, 15, GLASS[6]) end end
  L.rect(b, 10, 16, 3, 5, GLASS[6])
  L.shadeEllipse(b, 16, 23, 5, 3, FIRE, 0.25)
end)

-- ==========================================================================
-- v80 「SOUL TEMPEST」 컨텐츠 대확장: ❄️빙하 협곡 · 🌋용화산 타일/장식 · 고목/얼음/흑요석/봉인문 장벽 · 던전 계단/귀환 제단 ·
--      심연의 투기장 포털 받침 · 고대 성소 · 한손검 방패 · 비전 마법 아이콘 3종(절대영도 · 칼날장막 · 건곤대나이·극)
-- ==========================================================================
local ICE = { "#1a4a6a", "#2f6e94", "#5aa0c8", "#8ad2ea", "#c8f0ff", "#ffffff" }
local SNOW = { "#9ab0c8", "#b8cce0", "#d4e2f0", "#e6f0f8", "#f6fbff" }
local OBS = { "#08060c", "#141018", "#221a2a", "#3a3048", "#5a4a70", "#8a7aa8" }
local LAVA = { "#5a0e06", "#a82a10", "#e8581c", "#ff9a3c", "#ffd070", "#fff4c0" }
local ABY = { "#0e0618", "#22103a", "#3e2066", "#6a44a8", "#b090f0", "#efe4ff" }
local function tile(name, fn) local b = L.new(32, 32); fn(b); add(name, b, 0, 0) end

-- ----------------------------------------------------------- 바닥 타일(32×32, 테두리 없음): 눈 4 · 얼음 호수 2 · 흑요석 재 4
for v = 0, 3 do
  tile("t_snow" .. v, function(b)
    local r = L.rng(300 + v)
    for y = 0, 31 do for x = 0, 31 do
      local n = r()
      L.set(b, x, y, n < 0.12 and SNOW[1] or (n < 0.55 and SNOW[2] or (n < 0.93 and SNOW[3] or SNOW[4])))   -- v84: 잿빛이 감도는 눈(순백 대신) · 결
    end end
    for k = 1, 3 + v do local x, y = math.floor(r() * 28), math.floor(r() * 30); L.hline(b, x, x + 3, y, SNOW[2]); L.hline(b, x + 1, x + 4, y + 1, SNOW[5]) end   -- 바람 자국
    if v == 3 then for k = 1, 5 do L.set(b, math.floor(r() * 32), math.floor(r() * 32), "#ffffff") end end
  end)
end
for v = 0, 1 do
  tile("t_ice" .. v, function(b)
    local r = L.rng(330 + v)
    for y = 0, 31 do for x = 0, 31 do local n = r(); L.set(b, x, y, n < 0.2 and ICE[2] or (n < 0.9 and ICE[3] or ICE[4])) end end   -- v84: 깊은 얼음
    local x0, y0 = math.floor(r() * 10), math.floor(r() * 10)
    L.line(b, x0, y0, x0 + 14, y0 + 9, ICE[5]); L.line(b, x0 + 14, y0 + 9, x0 + 24, y0 + 7, ICE[5]); L.line(b, x0 + 14, y0 + 9, x0 + 12, y0 + 20, ICE[3])
    L.line(b, 3, 26, 9, 22, ICE[6]); L.set(b, 20 + v * 4, 4, ICE[6])
  end)
end
for v = 0, 3 do
  tile("t_ash" .. v, function(b)
    local r = L.rng(360 + v)
    for y = 0, 31 do for x = 0, 31 do local n = r(); L.set(b, x, y, n < 0.3 and OBS[2] or (n < 0.85 and OBS[3] or OBS[4])) end end
    for k = 1, 4 do local x, y = math.floor(r() * 30), math.floor(r() * 30); L.set(b, x, y, OBS[5]); L.set(b, x + 1, y, OBS[4]) end
    if v >= 2 then local x, y = math.floor(r() * 22) + 4, math.floor(r() * 22) + 4; L.line(b, x, y, x + 5, y + 2, LAVA[2]); L.set(b, x + 2, y + 1, LAVA[4]) end
  end)
end

-- ----------------------------------------------------------- 바닥 장식(충돌 없음)
obj("sd_snow0", 12, 5, function(b) L.shadeEllipse(b, 6, 3, 5.5, 2.2, SNOW, 0.2) end)
obj("sd_snow1", 7, 9, function(b) L.poly(b, { { 3, 0 }, { 6, 8 }, { 0, 8 } }, ICE[5]); L.vline(b, 3, 2, 7, ICE[6]) end)
obj("sd_snow2", 12, 4, function(b) L.set(b, 1, 2, SNOW[1]); L.set(b, 4, 1, SNOW[1]); L.set(b, 7, 2, SNOW[1]); L.set(b, 10, 1, SNOW[1]) end, true)
obj("sd_tuft", 10, 7, function(b) L.line(b, 2, 6, 1, 1, "#8a8a6a"); L.line(b, 5, 6, 5, 0, "#a8a080"); L.line(b, 8, 6, 9, 2, "#8a8a6a"); L.hline(b, 0, 9, 6, SNOW[5]) end, true)
obj("sd_ash0", 12, 5, function(b) L.shadeEllipse(b, 6, 3, 5.5, 2, OBS, 0.1) end)
obj("sd_ash1", 10, 4, function(b) L.rect(b, 1, 2, 2, 2, OBS[4]); L.rect(b, 5, 1, 2, 2, OBS[3]); L.set(b, 8, 2, OBS[5]) end, true)
obj("sd_ember0", 12, 4, function(b) L.hline(b, 1, 6, 2, LAVA[2]); L.hline(b, 6, 10, 1, LAVA[3]); L.set(b, 6, 1, LAVA[5]); L.set(b, 3, 2, LAVA[4]) end, true)
obj("sd_ember1", 7, 5, function(b) L.shadeEllipse(b, 3.5, 3, 3, 2, LAVA, 0.3) end)
obj("snowcap", 16, 7, function(b) L.shadeEllipse(b, 8, 4, 7.5, 3, SNOW, 0.25); L.set(b, 2, 6, SNOW[4]); L.set(b, 12, 6, SNOW[4]) end)

-- ----------------------------------------------------------- 용화산 장식: 흑요석 바위 2 · 불탄 고사목
for v = 0, 1 do
  obj("obsrock" .. v, 22, 20, function(b)
    L.shadePoly(b, v == 0 and { { 1, 19 }, { 3, 9 }, { 9, 2 }, { 14, 4 }, { 20, 11 }, { 21, 19 } } or { { 2, 19 }, { 5, 6 }, { 11, 1 }, { 18, 8 }, { 20, 19 } }, OBS, 0.12)
    L.line(b, 8, 4, 6, 14, OBS[6]); L.line(b, 13, 5, 16, 12, OBS[5])
    L.line(b, 5, 17, 11, 13, LAVA[2]); L.set(b, 9, 14, LAVA[4])
  end)
end
obj("deadtree", 26, 36, function(b)
  L.shadeCyl(b, 11, 12, 5, 23, { "#120c0a", "#1e1612", "#2e221a", "#3e2e22" }, 0.0)
  L.line(b, 13, 14, 21, 5, "#2e221a"); L.line(b, 13, 15, 22, 6, "#1e1612"); L.line(b, 12, 18, 3, 9, "#2e221a"); L.line(b, 12, 19, 2, 10, "#1e1612")
  L.line(b, 18, 8, 22, 2, "#2e221a"); L.line(b, 6, 12, 4, 5, "#2e221a")
  L.set(b, 22, 1, LAVA[4]); L.set(b, 4, 4, LAVA[3]); L.set(b, 2, 9, LAVA[4]); L.hline(b, 7, 18, 35, OBS[2])
end)

-- ----------------------------------------------------------- 광맥: 빙결 광맥(28×30) · 용암 광맥(30×24)
obj("vein_frost", 28, 30, function(b)
  L.shadeEllipse(b, 14, 25, 13, 5, { STONE[2], STONE[3], STONE[4], SNOW[3], SNOW[5] }, 0)
  L.shadePoly(b, { { 6, 26 }, { 8, 8 }, { 12, 3 }, { 14, 26 } }, ICE, 0.12)
  L.shadePoly(b, { { 13, 26 }, { 16, 12 }, { 20, 9 }, { 22, 26 } }, ICE, 0.2)
  L.shadePoly(b, { { 3, 27 }, { 4, 17 }, { 7, 16 }, { 8, 27 } }, ICE, 0.05)
  L.set(b, 10, 7, ICE[6]); L.set(b, 18, 12, ICE[6]); L.vline(b, 9, 9, 20, ICE[6])
end)
obj("vein_lava", 30, 24, function(b)
  L.shadePoly(b, { { 1, 23 }, { 3, 12 }, { 9, 4 }, { 18, 3 }, { 26, 9 }, { 29, 23 } }, OBS, 0.08)
  L.line(b, 5, 18, 12, 10, LAVA[3]); L.line(b, 12, 10, 20, 12, LAVA[4]); L.line(b, 20, 12, 25, 19, LAVA[3]); L.line(b, 12, 10, 14, 5, LAVA[4])
  L.set(b, 12, 10, LAVA[6]); L.set(b, 20, 12, LAVA[5]); L.set(b, 8, 14, LAVA[5])
end)

-- ----------------------------------------------------------- 신록의 숲 기믹: 고목(96×92, 입구를 막은 거대한 고대 나무) / 쓰러진 고목
obj("oldtree", 96, 92, function(b)
  -- 땅을 움켜쥔 뿌리(입구 폭 전체)
  for _, rt in ipairs({ { 48, 74, 4, 90 }, { 46, 76, 12, 88 }, { 50, 76, 86, 88 }, { 48, 78, 92, 90 }, { 44, 78, 26, 91 }, { 52, 78, 70, 91 } }) do
    L.line(b, rt[1], rt[2], rt[3], rt[4], WOOD[3]); L.line(b, rt[1], rt[2] + 1, rt[3], rt[4] + 1, WOOD[2]); L.line(b, rt[1], rt[2] - 1, rt[3], rt[4] - 1, WOOD[4])
  end
  -- 굵은 줄기(이끼 낀 나무껍질 + 얼굴 같은 옹이)
  L.shadeCyl(b, 34, 36, 28, 50, WOOD, 0.05)
  for y = 38, 84, 5 do L.hline(b, 36 + (y % 3), 58 - (y % 4), y, WOOD[2]) end
  L.ellipse(b, 48, 60, 5, 7, "#1a0e06"); L.ellipse(b, 48, 61, 3, 4, "#0a0602")
  L.set(b, 41, 52, LEAF[5]); L.set(b, 42, 51, LEAF[4]); L.set(b, 56, 66, LEAF[5]); L.rect(b, 35, 70, 4, 6, LEAF[3]); L.rect(b, 57, 44, 3, 8, LEAF[3])
  -- 거대한 수관(겹겹의 잎 덩이)
  for _, c in ipairs({ { 48, 22, 34, 18 }, { 24, 32, 18, 13 }, { 72, 32, 18, 13 }, { 48, 10, 22, 10 }, { 34, 40, 14, 8 }, { 62, 40, 14, 8 } }) do L.shadeEllipse(b, c[1], c[2], c[3], c[4], LEAF, 0.06) end
  local r = L.rng(91); for _ = 1, 60 do local x, y = math.floor(14 + r() * 68), math.floor(4 + r() * 42); if L.get(b, x, y) then L.set(b, x, y, r() < 0.5 and LEAF[5] or LEAF[2]) end end
  L.set(b, 40, 14, "#fff6c0"); L.set(b, 62, 20, "#fff6c0")   -- 반딧불
end)
obj("oldtree_fallen", 96, 30, function(b)
  L.shadeCyl(b, 38, 12, 20, 16, WOOD, 0.05); L.ellipse(b, 48, 14, 8, 3, WOOD[5]); L.ellipse(b, 48, 14, 5, 2, WOOD[4]); L.set(b, 48, 14, WOOD[3])
  L.shadeCyl(b, 2, 18, 34, 10, WOOD, 0.0); L.shadeCyl(b, 60, 19, 34, 9, WOOD, 0.0)
  for x = 4, 34, 4 do L.set(b, x, 22, WOOD[2]) end; for x = 62, 92, 4 do L.set(b, x, 22, WOOD[2]) end
  L.set(b, 10, 18, LEAF[4]); L.set(b, 80, 19, LEAF[4])
end)

-- ----------------------------------------------------------- 빙하 협곡 기믹: 만년설 얼음 장벽(32×36) 2단계 · 녹은 물웅덩이
for k = 0, 1 do
  obj("icewall_" .. k, 32, 36, function(b)
    local top = k == 0 and 1 or 9
    L.shadePoly(b, { { 1, 35 }, { 2, top + 10 }, { 8, top + 2 }, { 15, top }, { 23, top + 3 }, { 30, top + 12 }, { 31, 35 } }, ICE, 0.15)
    L.line(b, 9, top + 3, 7, 32, ICE[5]); L.line(b, 20, top + 3, 23, 33, ICE[3]); L.line(b, 15, top + 1, 15, 20, ICE[6])
    L.shadeEllipse(b, 16, top + 2, 9, 2.5, SNOW, 0.3)
    if k == 1 then for x = 4, 28, 5 do L.vline(b, x, 30, 34, ICE[5]) end; L.hline(b, 2, 30, 35, ICE[4]) end
  end)
end
obj("ice_puddle", 32, 10, function(b) L.shadeEllipse(b, 16, 5, 15, 4, { ICE[2], ICE[3], ICE[4], ICE[5] }, 0.2); L.set(b, 10, 4, ICE[6]); L.set(b, 20, 6, ICE[6]) end)

-- ----------------------------------------------------------- 용화산 기믹: 흑요석 봉인암(32×36) · 급랭되어 얼어붙은 봉인암 · 부서진 파편
obj("obsidian_0", 32, 36, function(b)
  L.shadePoly(b, { { 1, 35 }, { 3, 12 }, { 10, 3 }, { 18, 1 }, { 26, 6 }, { 31, 16 }, { 30, 35 } }, OBS, 0.14)
  L.line(b, 9, 5, 6, 30, OBS[6]); L.line(b, 19, 3, 24, 22, OBS[5])
  -- 붉게 빛나는 봉인 룬
  L.line(b, 11, 14, 21, 14, LAVA[3]); L.line(b, 16, 9, 16, 25, LAVA[3]); L.line(b, 12, 21, 20, 21, LAVA[2])
  L.set(b, 16, 14, LAVA[6]); L.set(b, 11, 14, LAVA[5]); L.set(b, 21, 14, LAVA[5]); L.set(b, 16, 9, LAVA[5]); L.set(b, 16, 25, LAVA[4])
end)
obj("obsidian_ice", 32, 36, function(b)
  L.shadePoly(b, { { 1, 35 }, { 3, 12 }, { 10, 3 }, { 18, 1 }, { 26, 6 }, { 31, 16 }, { 30, 35 } }, { OBS[3], OBS[4], ICE[2], ICE[3], ICE[4], ICE[5] }, 0.14)
  L.line(b, 4, 20, 15, 12, ICE[6]); L.line(b, 15, 12, 27, 18, ICE[6]); L.line(b, 15, 12, 13, 30, ICE[5]); L.line(b, 20, 3, 18, 12, ICE[6])
  L.line(b, 11, 14, 21, 14, "#6a3a5a"); L.line(b, 16, 9, 16, 25, "#6a3a5a")
  L.shadeEllipse(b, 16, 3, 9, 2, SNOW, 0.3)
end)
obj("obsidian_shards", 44, 14, function(b)
  for _, s in ipairs({ { 4, 13, 8, 4 }, { 12, 13, 15, 2 }, { 20, 13, 24, 5 }, { 28, 13, 31, 3 }, { 35, 13, 40, 6 } }) do L.poly(b, { { s[1], s[2] }, { s[3], s[4] }, { s[3] + 4, s[2] } }, OBS[3]); L.set(b, s[3], s[4] + 1, OBS[6]) end
  L.set(b, 14, 11, ICE[5]); L.set(b, 30, 11, LAVA[3])
end)

-- ----------------------------------------------------------- 던전 전실의 봉인문(64×40) 닫힘/열림
obj("seal", 64, 40, function(b)
  L.rect(b, 0, 4, 64, 36, STONE[2]); L.rect(b, 4, 8, 56, 32, STONE[3])
  for y = 12, 36, 6 do L.hline(b, 4, 59, y, STONE[2]) end; for x = 12, 52, 10 do L.vline(b, x, 8, 39, STONE[2]) end
  L.rect(b, 0, 0, 64, 5, STONE[4]); L.hline(b, 0, 63, 0, STONE[5])
  -- 청록 봉인 문양(원 + 십자)
  for a = 0, 31 do local t = a / 32 * math.pi * 2; L.set(b, math.floor(32 + math.cos(t) * 10), math.floor(23 + math.sin(t) * 10), TEAL[5]) end
  L.vline(b, 32, 11, 35, TEAL[4]); L.hline(b, 20, 44, 23, TEAL[4]); L.rect(b, 30, 21, 5, 5, TEAL[6])
end)
obj("seal_open", 64, 40, function(b)
  L.rect(b, 0, 0, 64, 5, STONE[4]); L.hline(b, 0, 63, 0, STONE[5]); L.rect(b, 0, 5, 8, 35, STONE[3]); L.rect(b, 56, 5, 8, 35, STONE[3])
  L.rect(b, 8, 5, 48, 35, "#05060a"); L.rect(b, 8, 30, 48, 10, "#10121a")
  L.hline(b, 10, 54, 34, STONE[2]); L.hline(b, 12, 52, 37, STONE[2])
  L.set(b, 6, 18, TEAL[4]); L.set(b, 58, 18, TEAL[4])
end, true)

-- ----------------------------------------------------------- 던전 계단(내려가기 40×30 · 올라가기 40×28) · 귀환 제단(36×32) · 투기장 포털 받침(44×20)
obj("stairs_down", 44, 32, function(b)
  L.shadeEllipse(b, 22, 18, 21, 13, STONE, 0.05)
  L.ellipse(b, 22, 18, 16, 10, "#05060a")
  for k = 0, 3 do L.hline(b, 10 + k * 2, 34 - k * 2, 12 + k * 3, STONE[3 - math.min(2, k)]) end
  L.ellipse(b, 22, 26, 7, 3, "#000000")
  L.set(b, 6, 14, LEAF[4]); L.set(b, 38, 20, LEAF[4])
end)
obj("stairs_up", 40, 28, function(b)
  for k = 0, 4 do L.rect(b, 6 + k * 2, 4 + k * 5, 28 - k * 4, 5, STONE[6 - k]); L.hline(b, 6 + k * 2, 33 - k * 2, 4 + k * 5, STONE[6]) end
  L.rect(b, 2, 0, 4, 28, STONE[3]); L.rect(b, 34, 0, 4, 28, STONE[3])
  L.set(b, 20, 1, "#fff6d0"); L.set(b, 18, 2, "#fff6d0")
end)
obj("altar", 36, 34, function(b)
  L.shadeCyl(b, 6, 22, 24, 10, STONE, 0.05); L.hline(b, 6, 29, 22, STONE[6])
  L.shadeCyl(b, 12, 14, 12, 9, STONE, 0.1)
  L.shadePoly(b, { { 18, 0 }, { 23, 8 }, { 18, 15 }, { 13, 8 } }, TEAL, 0.25); L.vline(b, 17, 3, 12, TEAL[6])
  L.set(b, 9, 26, TEAL[5]); L.set(b, 26, 26, TEAL[5]); L.set(b, 18, 27, TEAL[4])
end)
obj("abyss_gate", 48, 22, function(b)
  L.shadeEllipse(b, 24, 12, 23, 9, { ABY[1], ABY[2], STONE[2], STONE[3], STONE[4] }, 0.05)
  L.ellipse(b, 24, 11, 16, 5, ABY[2])
  for k = 0, 5 do local x = 6 + k * 7; L.set(b, x, 16 - (k % 2), ABY[5]) end
  L.set(b, 24, 8, ABY[6])
end)

-- ----------------------------------------------------------- 고대 성소(28×44): 금빛 해 원반을 인 오벨리스크 / 조사 뒤
for k = 0, 1 do
  obj(k == 0 and "shrine" or "shrine_used", 28, 44, function(b)
    local G = k == 0 and GOLD or { STONE[2], STONE[3], STONE[3], STONE[4], STONE[5], STONE[5] }
    L.shadeCyl(b, 3, 38, 22, 6, STONE, 0.05); L.hline(b, 3, 24, 38, STONE[6])
    L.shadePoly(b, { { 9, 38 }, { 10, 14 }, { 14, 10 }, { 18, 14 }, { 19, 38 } }, STONE, 0.12)
    L.vline(b, 12, 15, 36, STONE[5])
    for y = 18, 34, 4 do L.set(b, 14, y, k == 0 and GOLD[5] or STONE[4]) end
    L.shadeEllipse(b, 14, 7, 6.5, 6.5, G, 0.2)
    for a = 0, 7 do local t = a / 8 * math.pi * 2; L.set(b, math.floor(14 + math.cos(t) * 8.5), math.floor(7 + math.sin(t) * 8.5), G[5]) end
    L.set(b, 13, 5, k == 0 and "#ffffff" or STONE[5])
  end)
end

-- ----------------------------------------------------------- 한손검의 방패(12×15): 강철 연 방패 + 금 테두리 + 청록 문장
obj("shield", 12, 15, function(b)
  L.shadePoly(b, { { 0, 1 }, { 11, 1 }, { 11, 8 }, { 6, 14 }, { 5, 14 }, { 0, 8 } }, STONE, 0.15)
  L.hline(b, 0, 11, 1, GOLD[4]); L.vline(b, 0, 1, 8, GOLD[3]); L.vline(b, 11, 1, 8, GOLD[2]); L.line(b, 0, 8, 5, 14, GOLD[3]); L.line(b, 11, 8, 6, 14, GOLD[2])
  L.vline(b, 5, 3, 11, TEAL[4]); L.hline(b, 3, 8, 5, TEAL[4]); L.set(b, 5, 5, TEAL[6])
end)

-- ----------------------------------------------------------- 비전 마법 아이콘(16×16): ④ 절대영도 눈보라 · ⑤ 폭풍의 칼날장막 · ⑥ 건곤대나이·극
icon("sp_frost", 16, function(b)
  for a = 0, 5 do local t = a / 6 * math.pi * 2; L.line(b, 8, 8, 8 + math.cos(t) * 6.5, 8 + math.sin(t) * 6.5, ICE[5]); L.set(b, math.floor(8 + math.cos(t) * 4 + math.cos(t + 1.2) * 1.5), math.floor(8 + math.sin(t) * 4 + math.sin(t + 1.2) * 1.5), ICE[6]) end
  L.rect(b, 7, 7, 3, 3, ICE[6]); L.set(b, 8, 8, ICE[4])
end)
icon("sp_storm", 16, function(b)
  for a = 0, 3 do local t = a / 4 * math.pi * 2; local x, y = 8 + math.cos(t) * 5, 8 + math.sin(t) * 5; L.line(b, x, y, x + math.cos(t + 1.9) * 4, y + math.sin(t + 1.9) * 4, "#eef6ff"); L.set(b, math.floor(x), math.floor(y), TEAL[5]) end
  for a = 0, 11 do local t = a / 12 * math.pi * 2; L.set(b, math.floor(8 + math.cos(t) * 7), math.floor(8 + math.sin(t) * 7), a % 2 == 0 and TEAL[4] or "#8aa4c8") end
end)
icon("sp_abyss", 16, function(b)
  for y = 0, 15 do for x = 0, 15 do
    local d = math.sqrt((x + 0.5 - 6) ^ 2 + (y + 0.5 - 8) ^ 2); local e = math.sqrt((x + 0.5 - 3.5) ^ 2 + (y + 0.5 - 8) ^ 2)
    if d <= 7.6 and e > 6.8 then L.set(b, x, y, d > 6.8 and ABY[3] or (e < 8 and ABY[6] or ABY[5])) end
  end end
  L.line(b, 1, 8, 14, 8, ABY[6]); L.set(b, 14, 8, "#ffffff"); L.set(b, 12, 3, TEAL[5]); L.set(b, 12, 13, TEAL[5])
end)

-- =========================================================== v82 ─ 방랑 NPC 5인 · 사신수 성소 · 둥지 지형 함정 · 전실 봉인 장치 · 아이콘
local SKIN = { "#5a3020", "#8a5038", "#c8906a", "#e8b890" }
local ASH = { "#1a1c22", "#2e323c", "#4a505c", "#6e7684", "#9aa2b0", "#c8ced8" }
local FUR = { "#3a2a1c", "#5e4630", "#8a6a48", "#b8966a", "#e0c8a0" }
local SPEC = { "#0c3442", "#1f8aa0", "#4deeea", "#8ae8f8", "#c8f8ff", "#ffffff" }
local JADE = { "#0e2a1e", "#1e4a34", "#2e7050", "#4a9a70", "#7ad8a8", "#c8f8e0" }
local RUST = { "#2a1a14", "#4a2a1a", "#6e3e22", "#8a5a30", "#a87444" }

-- ----------------------------------------------------------- 방랑 NPC(18×28 · 숨쉬기 2프레임): 바닥 가운데 기준
local function npc(name, fn) for f = 0, 1 do obj(name .. "_" .. f, 18, 28, function(b) fn(b, f) end) end end
-- ① 단조장인 발드르: 땅딸막한 대장장이 — 대머리 · 땋은 붉은 수염 · 가죽 앞치마 · 어깨에 멘 큰 망치
npc("npc_baldr", function(b, f)
  local y = f
  L.rect(b, 5, 23, 3, 5, WOOD[1]); L.rect(b, 10, 23, 3, 5, WOOD[1]); L.hline(b, 4, 8, 27, "#0e0806"); L.hline(b, 10, 14, 27, "#0e0806")
  L.shadeCyl(b, 3, 12 + y, 12, 12 - y, CRIM, 0.05)
  L.poly(b, { { 5, 14 + y }, { 13, 14 + y }, { 14, 24 }, { 4, 24 } }, WOOD[3]); L.vline(b, 9, 15 + y, 23, WOOD[2]); L.hline(b, 5, 13, 14 + y, WOOD[5])
  L.rect(b, 1, 13 + y, 3, 7, SKIN[3]); L.rect(b, 14, 13 + y, 3, 7, SKIN[3]); L.set(b, 2, 19 + y, SKIN[2]); L.set(b, 15, 19 + y, SKIN[2])
  L.shadeEllipse(b, 9, 7 + y, 5, 5, SKIN, 0.1)
  L.set(b, 7, 6 + y, "#1a0e08"); L.set(b, 11, 6 + y, "#1a0e08"); L.hline(b, 6, 12, 5 + y, SKIN[2])
  L.poly(b, { { 4, 8 + y }, { 14, 8 + y }, { 12, 15 + y }, { 9, 18 + y }, { 6, 15 + y } }, "#c86a2c")
  L.vline(b, 9, 10 + y, 17 + y, "#8a3a14"); L.set(b, 9, 18 + y, GOLD[4]); L.hline(b, 6, 12, 9 + y, "#e89a4c")
  L.line(b, 15, 2 + y, 15, 14 + y, WOOD[4]); L.rect(b, 13, 0 + y, 5, 4, STONE[4]); L.hline(b, 13, 17, 0 + y, STONE[6])
end)
-- ② 잿빛 사냥꾼 카일: 재를 뒤집어쓴 회색 판금 · 해진 망토 · 투구 틈의 잉걸불 빛 · 등에 멘 대검
npc("npc_kyle", function(b, f)
  local y = f
  L.poly(b, { { 3, 9 + y }, { 15, 9 + y }, { 17, 26 }, { 13, 25 }, { 9, 27 }, { 5, 25 }, { 1, 26 } }, ASH[2])
  for x = 2, 16, 3 do L.set(b, x, 26 - (x % 2), ASH[1]) end
  L.line(b, 4, 1 + y, 14, 22, STONE[5]); L.line(b, 5, 1 + y, 15, 22, STONE[3]); L.rect(b, 3, 1 + y, 3, 2, WOOD[3])
  L.rect(b, 6, 22, 2, 6, ASH[3]); L.rect(b, 10, 22, 2, 6, ASH[3]); L.hline(b, 5, 8, 27, ASH[1]); L.hline(b, 10, 13, 27, ASH[1])
  L.shadeCyl(b, 4, 11 + y, 10, 12 - y, ASH, 0.1); L.hline(b, 4, 13, 16 + y, ASH[2]); L.hline(b, 5, 12, 11 + y, ASH[6])
  L.rect(b, 2, 12 + y, 3, 6, ASH[4]); L.rect(b, 13, 12 + y, 3, 6, ASH[4])
  L.shadeEllipse(b, 9, 6 + y, 4.5, 5, ASH, 0.15); L.hline(b, 6, 12, 6 + y, "#14100c"); L.set(b, 8, 6 + y, FIRE[4]); L.set(b, 10, 6 + y, FIRE[3])
  L.vline(b, 9, 1 + y, 3 + y, ASH[6])
end)
-- ③ 비전 현자 이실리아: 끝이 휜 보랏빛 두건 · 은발 · 별 수놓은 긴 로브 · 청록 수정 지팡이
npc("npc_isilia", function(b, f)
  local y = f
  L.poly(b, { { 6, 10 + y }, { 12, 10 + y }, { 15, 27 }, { 3, 27 } }, VIOLET[3]); L.poly(b, { { 7, 12 + y }, { 11, 12 + y }, { 12, 27 }, { 6, 27 } }, VIOLET[2])
  L.hline(b, 3, 15, 27, VIOLET[1]); L.set(b, 5, 21, VIOLET[6]); L.set(b, 12, 18, VIOLET[6]); L.set(b, 9, 24, GOLD[5])
  L.rect(b, 4, 13 + y, 2, 6, VIOLET[4]); L.rect(b, 12, 13 + y, 2, 6, VIOLET[4])
  L.shadeEllipse(b, 9, 7 + y, 4, 4, SKIN, 0.2); L.set(b, 8, 7 + y, "#2a1a3a"); L.set(b, 10, 7 + y, "#2a1a3a")
  L.vline(b, 5, 7 + y, 13 + y, "#e8eef8"); L.vline(b, 13, 7 + y, 13 + y, "#e8eef8")
  L.poly(b, { { 4, 6 + y }, { 9, 0 + y }, { 14, 6 + y }, { 13, 8 + y }, { 5, 8 + y } }, VIOLET[4]); L.set(b, 9, 0 + y, VIOLET[5]); L.line(b, 9, 0 + y, 4, 1 + y, VIOLET[4])
  L.vline(b, 16, 4, 27, WOOD[4]); L.shadeEllipse(b, 16, 3, 2, 2.5, TEAL, 0.25); L.set(b, 16, 2, "#ffffff")
end)
-- ④ 설원 행상인 보르크: 몸보다 큰 등짐 · 흰 털모자 · 남색 털외투 · 손에 든 등불
npc("npc_bork", function(b, f)
  local y = f
  L.shadeEllipse(b, 9, 10 + y, 8, 9, FUR, 0.0); L.hline(b, 2, 16, 8 + y, FUR[1]); L.rect(b, 4, 3 + y, 10, 3, WOOD[3]); L.set(b, 6, 4 + y, GOLD[4]); L.set(b, 12, 4 + y, ICE[5])
  L.rect(b, 5, 22, 3, 6, FUR[2]); L.rect(b, 10, 22, 3, 6, FUR[2]); L.hline(b, 4, 8, 27, FUR[1]); L.hline(b, 10, 14, 27, FUR[1])
  L.shadeCyl(b, 4, 13 + y, 10, 10 - y, { "#14203a", "#22345a", "#34507e", "#4a6c9c" }, 0.05); L.hline(b, 4, 13, 13 + y, SNOW[4]); L.vline(b, 9, 14 + y, 22, SNOW[3])
  L.shadeEllipse(b, 9, 10 + y, 3.5, 3.5, SKIN, 0.15); L.set(b, 8, 10 + y, "#1a0e08"); L.set(b, 10, 10 + y, "#1a0e08"); L.hline(b, 7, 11, 12 + y, FUR[4])
  L.shadeEllipse(b, 9, 7 + y, 5, 3, SNOW, 0.1); L.set(b, 9, 3 + y, SNOW[5])
  L.vline(b, 15, 15 + y, 18 + y, STONE[3]); L.rect(b, 14, 18 + y, 3, 4, GLASS[4]); L.set(b, 15, 19 + y, GLASS[6])
end)
-- ⑤ 선대 사냥꾼의 망령: 청록 빛으로만 남은 사냥꾼 — 찢긴 망토 자락 · 빛나는 눈 · 반쯤 바랜 장검
npc("npc_ghost", function(b, f)
  local y = f
  L.poly(b, { { 4, 9 + y }, { 14, 9 + y }, { 16, 22 }, { 13, 27 }, { 11, 23 }, { 9, 27 }, { 7, 23 }, { 5, 27 }, { 2, 22 } }, SPEC[2])
  L.poly(b, { { 6, 11 + y }, { 12, 11 + y }, { 13, 21 }, { 5, 21 } }, SPEC[3]); L.vline(b, 9, 12 + y, 21, SPEC[5])
  L.shadeEllipse(b, 9, 6 + y, 4.5, 4.5, SPEC, 0.2); L.hline(b, 6, 12, 6 + y, SPEC[1]); L.set(b, 7, 6 + y, "#ffffff"); L.set(b, 11, 6 + y, "#ffffff")
  L.line(b, 15, 6 + y, 15, 20 + y, SPEC[5]); L.hline(b, 13, 17, 19 + y, SPEC[4]); L.set(b, 15, 5 + y, "#ffffff")
  if f == 1 then L.set(b, 3, 14, SPEC[4]); L.set(b, 15, 24, SPEC[4]) else L.set(b, 2, 18, SPEC[4]); L.set(b, 16, 13, SPEC[4]) end
end)

-- ----------------------------------------------------------- 사신수의 성소(32×46): 받침돌 위의 석상 + 색 보주
local function pedestal(b, gem)
  L.shadeCyl(b, 3, 38, 26, 8, STONE, 0.05); L.hline(b, 3, 28, 38, STONE[6]); L.shadeCyl(b, 6, 32, 20, 7, STONE, 0.12); L.hline(b, 6, 25, 32, STONE[5])
  L.shadeEllipse(b, 16, 41, 2.5, 2.5, gem, 0.3); L.set(b, 15, 40, "#ffffff")
end
obj("beast_dragon", 32, 46, function(b)   -- 🐉 동방 청룡: 구름 위로 똬리를 튼 푸른 용
  pedestal(b, TEAL)
  for k = 0, 20 do local t = k / 20; local x = 8 + t * 16 + math.sin(t * 7) * 4; local yy = 31 - t * 22 + math.cos(t * 7) * 3; L.shadeEllipse(b, x, yy, 3.4 - t, 3 - t * 0.8, TEAL, 0.05) end
  L.shadeEllipse(b, 22, 7, 4.5, 3.5, TEAL, 0.2); L.set(b, 24, 6, "#fff6d0"); L.line(b, 20, 3, 17, 0, TEAL[5]); L.line(b, 23, 3, 25, 0, TEAL[5]); L.line(b, 26, 9, 30, 11, TEAL[6])
  for k = 0, 4 do L.set(b, 10 + k * 3, 26 - k * 4, TEAL[6]) end
end)
obj("beast_tiger", 32, 46, function(b)   -- 🐯 서방 백호: 앞발을 모으고 앉은 흰 범(검은 줄무늬)
  pedestal(b, { "#4a525e", "#98a2b0", "#c4ccd6", "#eef6ff", "#ffffff" })
  local W = { "#6c7684", "#98a2b0", "#c4ccd6", "#e4ecf4", "#ffffff" }
  L.shadeEllipse(b, 16, 22, 9, 10, W, 0.05); L.shadeEllipse(b, 16, 10, 6.5, 6, W, 0.15)
  L.set(b, 11, 4, W[4]); L.set(b, 12, 4, W[4]); L.set(b, 20, 4, W[4]); L.set(b, 21, 4, W[4])
  L.set(b, 13, 10, "#2a8aa0"); L.set(b, 19, 10, "#2a8aa0"); L.hline(b, 14, 18, 14, "#30363f")
  for k = 0, 3 do L.line(b, 9 + k, 16 + k * 3, 12 + k, 17 + k * 3, "#1e2228"); L.line(b, 23 - k, 16 + k * 3, 20 - k, 17 + k * 3, "#1e2228") end
  L.rect(b, 11, 28, 4, 4, W[4]); L.rect(b, 17, 28, 4, 4, W[4]); L.line(b, 25, 29, 28, 20, W[3])
end)
obj("beast_phoenix", 32, 46, function(b)   -- 🦅 남방 주작: 날개를 활짝 편 붉은 불새
  pedestal(b, FIRE)
  L.poly(b, { { 16, 14 }, { 1, 4 }, { 4, 12 }, { 2, 18 }, { 9, 20 }, { 16, 24 } }, FIRE[3]); L.poly(b, { { 16, 14 }, { 31, 4 }, { 28, 12 }, { 30, 18 }, { 23, 20 }, { 16, 24 } }, FIRE[3])
  for k = 0, 3 do L.line(b, 16, 16, 3 + k * 2, 5 + k * 3, FIRE[4]); L.line(b, 16, 16, 29 - k * 2, 5 + k * 3, FIRE[4]) end
  L.shadeEllipse(b, 16, 18, 4, 6, FIRE, 0.15); L.shadeEllipse(b, 16, 9, 3, 3, FIRE, 0.25); L.set(b, 17, 8, "#1a0e08"); L.set(b, 19, 9, GOLD[5])
  L.line(b, 16, 6, 14, 1, FIRE[5]); L.line(b, 16, 6, 18, 1, FIRE[5]); L.poly(b, { { 14, 23 }, { 18, 23 }, { 20, 31 }, { 16, 28 }, { 12, 31 } }, FIRE[4])
end)
obj("beast_turtle", 32, 46, function(b)   -- 🐢 북방 현무: 등딱지를 휘감은 뱀
  pedestal(b, JADE)
  L.shadeEllipse(b, 16, 22, 12, 8, JADE, 0.0)
  for _, p in ipairs({ { 12, 19 }, { 20, 19 }, { 16, 24 }, { 9, 24 }, { 23, 24 } }) do L.rect(b, p[1] - 1, p[2] - 1, 3, 2, JADE[2]); L.set(b, p[1], p[2] - 1, JADE[5]) end
  L.shadeEllipse(b, 4, 25, 3, 2.5, JADE, 0.2); L.set(b, 3, 24, "#1a0e08")
  L.rect(b, 7, 28, 4, 3, JADE[3]); L.rect(b, 21, 28, 4, 3, JADE[3])
  for k = 0, 24 do local t = k / 24 * math.pi * 1.6; L.set(b, math.floor(16 + math.cos(t + 1) * 13), math.floor(18 + math.sin(t + 1) * 9 - k * 0.35), k % 3 == 0 and "#1a2a3a" or "#2e4a6a") end
  L.shadeEllipse(b, 25, 8, 3, 2.5, { "#1a2a3a", "#2e4a6a", "#4a6c9c", "#7a9ac8" }, 0.2); L.set(b, 26, 7, "#ff6a5a")
end)

-- ----------------------------------------------------------- 보스 둥지의 불안정한 지형(24×50) / 무너진 잔해(34×16)
obj("trap_root", 24, 50, function(b)   -- 고대 균열 석주: 뿌리가 파고든 금 간 돌기둥
  L.shadeCyl(b, 5, 6, 14, 42, STONE, 0.05); L.rect(b, 3, 2, 18, 5, STONE[4]); L.hline(b, 3, 20, 2, STONE[6]); L.rect(b, 3, 44, 18, 5, STONE[3])
  L.line(b, 12, 8, 9, 20, "#14100c"); L.line(b, 9, 20, 13, 31, "#14100c"); L.line(b, 13, 31, 10, 42, "#14100c")
  for _, r in ipairs({ { 2, 46, 8, 30 }, { 22, 47, 16, 24 }, { 6, 49, 11, 38 } }) do L.line(b, r[1], r[2], r[3], r[4], WOOD[3]); L.line(b, r[1] + 1, r[2], r[3] + 1, r[4], WOOD[2]) end
  L.set(b, 7, 14, LEAF[4]); L.set(b, 16, 26, LEAF[4]); L.set(b, 6, 36, LEAF[5])
end)
obj("trap_crystal", 24, 50, function(b)   -- 과충전 수정 기둥: 금이 가 빛이 새는 보랏빛 수정
  L.shadePoly(b, { { 12, 0 }, { 19, 10 }, { 18, 44 }, { 6, 44 }, { 5, 10 } }, VIOLET, 0.1); L.shadePoly(b, { { 3, 20 }, { 7, 16 }, { 8, 46 }, { 2, 46 } }, VIOLET, 0)
  L.shadePoly(b, { { 20, 24 }, { 23, 30 }, { 22, 47 }, { 17, 47 } }, VIOLET, 0); L.rect(b, 2, 45, 21, 4, STONE[3])
  L.vline(b, 10, 4, 42, VIOLET[6]); L.line(b, 13, 12, 9, 22, "#ffffff"); L.line(b, 9, 22, 14, 33, TEAL[5])
end)
obj("trap_brazier", 24, 50, function(b)   -- 부식된 화로 기둥: 녹슨 철 기둥 위의 불 그릇
  L.shadeCyl(b, 8, 14, 8, 32, RUST, 0.05)
  for y = 18, 44, 6 do L.hline(b, 8, 15, y, RUST[1]); L.set(b, 10, y + 2, "#3a6a4a") end
  L.shadeEllipse(b, 12, 11, 10, 4, RUST, 0.1); L.ellipse(b, 12, 9, 7, 2, FIRE[2]); L.hline(b, 7, 17, 9, FIRE[3])
  L.set(b, 10, 7, FIRE[5]); L.set(b, 13, 6, FIRE[4]); L.rect(b, 4, 45, 16, 4, STONE[3]); L.line(b, 14, 30, 11, 38, "#14100c")
end)
obj("trap_icicle", 24, 50, function(b)   -- 거대 고드름 기둥: 천장에서 바닥까지 얼어붙은 기둥
  L.shadePoly(b, { { 4, 0 }, { 20, 0 }, { 16, 28 }, { 18, 47 }, { 6, 47 }, { 8, 28 } }, ICE, 0.15)
  L.vline(b, 9, 2, 44, "#ffffff"); L.line(b, 15, 6, 12, 18, ICE[6]); L.line(b, 12, 18, 15, 30, "#3a6a8a"); L.rect(b, 3, 45, 18, 4, SNOW[2])
  L.set(b, 5, 3, ICE[6]); L.set(b, 18, 3, ICE[6])
end)
obj("trap_geyser", 24, 50, function(b)   -- 용암 간헐천 암석: 용암이 비치는 흑요석 바위 탑
  L.shadePoly(b, { { 9, 2 }, { 16, 4 }, { 20, 22 }, { 22, 46 }, { 2, 46 }, { 5, 20 } }, OBS, 0.1)
  L.line(b, 12, 6, 10, 18, LAVA[4]); L.line(b, 10, 18, 14, 30, LAVA[3]); L.line(b, 14, 30, 11, 42, LAVA[4]); L.set(b, 12, 6, LAVA[6])
  L.ellipse(b, 12, 3, 3, 1.5, LAVA[5]); L.rect(b, 2, 45, 20, 4, OBS[2])
end)
for _, rb in ipairs({ { "trap_root", STONE }, { "trap_crystal", VIOLET }, { "trap_brazier", RUST }, { "trap_icicle", ICE }, { "trap_geyser", OBS } }) do
  obj(rb[1] .. "_x", 34, 16, function(b)   -- 무너진 잔해
    local r = L.rng(#rb[1] * 7)
    for k = 0, 7 do L.shadeEllipse(b, 4 + k * 3.6 + r() * 2, 10 + r() * 3, 3 + r() * 2, 2.5 + r(), rb[2], 0.05) end
    L.hline(b, 2, 31, 15, rb[2][1])
  end)
end

-- ----------------------------------------------------------- 전실의 고대 봉인 장치
for k = 0, 1 do
  obj(k == 0 and "dev_brazier_off" or "dev_brazier_on", 20, 22, function(b)   -- 룬 화로: 돌 받침 + 쇠 그릇 + 룬
    L.shadeCyl(b, 6, 10, 8, 10, STONE, 0.05); L.rect(b, 3, 19, 14, 3, STONE[3])
    L.shadeEllipse(b, 10, 8, 8, 3.5, RUST, 0.1); L.ellipse(b, 10, 7, 6, 1.5, k == 1 and FIRE[3] or "#141014")
    local rc = k == 1 and FIRE[5] or STONE[4]; L.set(b, 8, 13, rc); L.set(b, 10, 15, rc); L.set(b, 12, 13, rc); L.vline(b, 10, 12, 13, rc)
  end)
  obj(k == 0 and "dev_switch_off" or "dev_switch_on", 16, 26, function(b)   -- 공명 수정 스위치
    local C = k == 1 and TEAL or { STONE[2], STONE[3], VIOLET[2], VIOLET[3], STONE[4], STONE[5] }
    L.shadeCyl(b, 3, 20, 10, 5, STONE, 0.05); L.hline(b, 3, 12, 20, STONE[5])
    L.shadePoly(b, { { 8, 0 }, { 13, 8 }, { 11, 20 }, { 5, 20 }, { 3, 8 } }, C, 0.15); L.vline(b, 7, 3, 18, C[6])
    if k == 1 then L.set(b, 8, 1, "#ffffff"); L.set(b, 2, 4, TEAL[6]); L.set(b, 14, 6, TEAL[6]) end
  end)
end
obj("dev_stone", 20, 30, function(b)   -- 균열된 봉인 비석(보랏빛 봉인 문양)
  L.shadePoly(b, { { 3, 29 }, { 2, 6 }, { 6, 1 }, { 14, 1 }, { 18, 6 }, { 17, 29 } }, STONE, 0.05)
  L.line(b, 6, 4, 9, 14, "#14100c"); L.line(b, 9, 14, 6, 22, "#14100c"); L.line(b, 14, 8, 12, 19, "#14100c")
  for a = 0, 15 do local t = a / 16 * math.pi * 2; L.set(b, math.floor(10 + math.cos(t) * 4), math.floor(15 + math.sin(t) * 4), VIOLET[5]) end
  L.set(b, 10, 15, VIOLET[6]); L.rect(b, 1, 27, 18, 3, STONE[3])
end)
obj("dev_stone_x", 24, 12, function(b)
  for k = 0, 4 do L.shadeEllipse(b, 4 + k * 4, 7 + (k % 2), 3, 2.5, STONE, 0.05) end
  L.set(b, 11, 5, VIOLET[4]); L.hline(b, 1, 22, 11, STONE[1])
end)
obj("chest_sealed", 24, 22, function(b)   -- 봉인된 보물상자: 보랏빛 사슬과 자물쇠
  L.rect(b, 2, 11, 20, 10, WOOD[2]); L.rect(b, 2, 5, 20, 7, WOOD[3]); L.rect(b, 2, 14, 20, 2, GOLD[2])
  L.line(b, 1, 6, 22, 19, STONE[4]); L.line(b, 22, 6, 1, 19, STONE[4]); L.line(b, 1, 7, 22, 20, STONE[2]); L.line(b, 22, 7, 1, 20, STONE[2])
  L.rect(b, 9, 10, 6, 6, VIOLET[3]); L.rect(b, 10, 8, 4, 2, VIOLET[4]); L.set(b, 11, 12, VIOLET[6]); L.set(b, 12, 13, "#1a0e2a")
end)

-- ----------------------------------------------------------- 스마트 원버튼 아이콘(16×16): 💬 대화 · 🔥 가호 받기
icon("ic_talk", 16, function(b)
  L.ellipse(b, 8, 7, 7, 5.5, "#eef6ff"); L.poly(b, { { 4, 10 }, { 8, 11 }, { 2, 15 } }, "#eef6ff"); L.ellipse(b, 8, 7, 6, 4.5, "#ffffff")
  for x = 4, 12, 4 do L.rect(b, x, 6, 2, 2, "#2a3650") end
end)
icon("ic_bless", 16, function(b)
  L.poly(b, { { 8, 0 }, { 12, 6 }, { 13, 11 }, { 8, 15 }, { 3, 11 }, { 4, 6 } }, FIRE[3]); L.poly(b, { { 8, 4 }, { 10, 8 }, { 10, 12 }, { 8, 14 }, { 6, 12 }, { 6, 8 } }, FIRE[5])
  L.set(b, 8, 10, "#ffffff"); L.set(b, 2, 3, TEAL[5]); L.set(b, 13, 2, TEAL[5])
end)

-- =========================================================== v83 ─ 영혼 수렵 파트너(늑대 · 매) · 사신수 환영 문장
-- 영혼 설원늑대(22×16 · 달리기 2프레임): 청록 · 은백으로만 된 반투명 늑대(그릴 때 반투명)
for f = 0, 1 do
  obj("comp_wolf_" .. f, 22, 16, function(b)
    local leg = f == 0 and 2 or -2
    L.shadeEllipse(b, 10, 8, 7, 4, SPEC, 0.15)                     -- 몸
    L.shadeEllipse(b, 17, 6, 3.5, 3, SPEC, 0.25)                   -- 머리
    L.poly(b, { { 16, 3 }, { 17, 0 }, { 18, 3 } }, SPEC[5]); L.poly(b, { { 18, 3 }, { 20, 1 }, { 20, 4 } }, SPEC[4])   -- 귀
    L.rect(b, 19, 6, 3, 2, SPEC[4]); L.set(b, 18, 5, "#ffffff")    -- 주둥이 · 눈
    L.line(b, 3, 7, 0, 4 + f, SPEC[4]); L.line(b, 3, 8, 0, 6 + f, SPEC[3])   -- 꼬리(흩날림)
    L.vline(b, 6 + leg, 11, 15, SPEC[3]); L.vline(b, 8 - leg, 11, 15, SPEC[4]); L.vline(b, 13 + leg, 11, 15, SPEC[3]); L.vline(b, 15 - leg, 11, 15, SPEC[4])
    L.hline(b, 5, 15, 6, SPEC[6])
  end)
end
-- 폭풍의 영혼매(20×14 · 날갯짓 2프레임)
for f = 0, 1 do
  obj("comp_hawk_" .. f, 20, 14, function(b)
    if f == 0 then L.poly(b, { { 9, 7 }, { 1, 1 }, { 4, 6 }, { 2, 9 } }, SPEC[3]); L.poly(b, { { 11, 7 }, { 19, 1 }, { 16, 6 }, { 18, 9 } }, SPEC[4])
    else L.poly(b, { { 9, 7 }, { 1, 12 }, { 5, 8 } }, SPEC[3]); L.poly(b, { { 11, 7 }, { 19, 12 }, { 15, 8 } }, SPEC[4]) end
    L.shadeEllipse(b, 10, 8, 3, 4, SPEC, 0.2); L.shadeEllipse(b, 12, 4, 2.2, 2.2, SPEC, 0.3)
    L.set(b, 14, 4, "#ffe066"); L.set(b, 13, 3, "#ffffff"); L.poly(b, { { 9, 11 }, { 11, 11 }, { 10, 13 } }, SPEC[5])
  end)
end
-- 사신수 환영 문장(40×40, 한 빛깔 + 밝은 심): 청룡 · 백호 · 주작 · 현무
local function emblem(name, C, fn) obj(name, 40, 40, function(b) for a = 0, 47 do local t = a / 48 * math.pi * 2; L.set(b, math.floor(20 + math.cos(t) * 18), math.floor(20 + math.sin(t) * 18), a % 2 == 0 and C[3] or C[2]) end; fn(b, C) end, true) end
emblem("ph_dragon", TEAL, function(b, C)
  for k = 0, 30 do local t = k / 30; local x = 10 + t * 22 + math.sin(t * 9) * 5; local y = 30 - t * 20 + math.cos(t * 9) * 4; L.shadeEllipse(b, x, y, 2.6 - t * 1.2, 2.4 - t, C, 0.2) end
  L.shadeEllipse(b, 30, 9, 3.5, 2.8, C, 0.3); L.set(b, 31, 8, "#ffffff"); L.line(b, 29, 6, 27, 3, C[6]); L.line(b, 32, 6, 34, 3, C[6])
end)
emblem("ph_tiger", { "#4a525e", "#98a2b0", "#dce6f0", "#eef6ff", "#ffffff", "#ffffff" }, function(b, C)
  L.shadeEllipse(b, 20, 21, 10, 9, C, 0.15); L.poly(b, { { 11, 15 }, { 13, 8 }, { 16, 13 } }, C[4]); L.poly(b, { { 29, 15 }, { 27, 8 }, { 24, 13 } }, C[4])
  L.set(b, 16, 19, "#4deeea"); L.set(b, 24, 19, "#4deeea"); L.hline(b, 18, 22, 25, "#30363f")
  for k = 0, 2 do L.line(b, 12 + k, 20 + k * 3, 15 + k, 21 + k * 3, "#30363f"); L.line(b, 28 - k, 20 + k * 3, 25 - k, 21 + k * 3, "#30363f") end
  L.vline(b, 20, 12, 15, "#30363f"); L.hline(b, 18, 22, 13, "#30363f")   -- 王
end)
emblem("ph_phoenix", FIRE, function(b, C)
  L.poly(b, { { 20, 18 }, { 3, 8 }, { 7, 17 }, { 4, 23 }, { 20, 26 } }, C[3]); L.poly(b, { { 20, 18 }, { 37, 8 }, { 33, 17 }, { 36, 23 }, { 20, 26 } }, C[3])
  for k = 0, 3 do L.line(b, 20, 20, 5 + k * 2, 9 + k * 3, C[4]); L.line(b, 20, 20, 35 - k * 2, 9 + k * 3, C[4]) end
  L.shadeEllipse(b, 20, 20, 3, 5, C, 0.25); L.shadeEllipse(b, 20, 12, 2.5, 2.5, C, 0.3); L.set(b, 21, 11, "#ffffff")
  L.poly(b, { { 18, 25 }, { 22, 25 }, { 24, 34 }, { 20, 31 }, { 16, 34 } }, C[5])
end)
emblem("ph_turtle", JADE, function(b, C)
  L.shadeEllipse(b, 20, 22, 11, 7, C, 0.1)
  for _, p in ipairs({ { 16, 20 }, { 24, 20 }, { 20, 25 } }) do L.rect(b, p[1] - 1, p[2] - 1, 3, 2, C[2]); L.set(b, p[1], p[2] - 1, C[6]) end
  L.shadeEllipse(b, 8, 24, 2.5, 2, C, 0.25); L.rect(b, 11, 28, 3, 3, C[3]); L.rect(b, 26, 28, 3, 3, C[3])
  for k = 0, 20 do local t = k / 20 * math.pi * 1.5; L.set(b, math.floor(20 + math.cos(t + 1.2) * 13), math.floor(19 + math.sin(t + 1.2) * 9 - k * 0.4), "#7a9ac8") end
  L.shadeEllipse(b, 29, 9, 2.6, 2, { "#1a2a3a", "#2e4a6a", "#4a6c9c", "#7a9ac8" }, 0.2); L.set(b, 30, 8, "#ff6a5a")
end)


-- ----------------------------------------------------------- v84 ⚔️ 왕의 무덤 입구(용화산 북동쪽 끝): 왕관 부조의 석조 아치
--   tomb_gate      = 봉인 — 문짝에 보랏빛 사슬 X + 봉인 문양
--   tomb_gate_open = 열림 — 문 안쪽 아래로 내려가는 계단과 흑염
local TOMB = { "#121016", "#1e1a24", "#2c2834", "#3e3a48", "#56525e", "#78747e" }
local function tombArch(b, open)
  local cx, cy, RO, RI = 32, 30, 29, 18
  for y = 0, 59 do for x = 0, 63 do
    local dx, dy = x + 0.5 - cx, y + 0.5 - cy
    local d = math.sqrt(dx * dx + dy * dy)
    local inArch = (y <= cy and d <= RO and d >= RI)
    local pillar = (y > cy and y <= 56 and ((x >= 3 and x <= 13) or (x >= 50 and x <= 60)))
    if inArch or pillar then
      local t = 3 + (dx < -4 and 1 or 0) + ((x % 7 == 0) and -1 or 0)
      if pillar then t = (x == 3 or x == 50) and 5 or ((x == 13 or x == 60) and 2 or 3 + ((x - 3) % 11 < 4 and 1 or 0)) end
      if pillar and (y - cy) % 7 == 0 then t = 1 end   -- 돌 블록 줄눈
      if inArch then local a = math.atan(dy, dx); if math.floor((a + math.pi) / (math.pi / 9)) % 2 == 0 and math.abs(d - RO) > 1.2 and math.abs(d - RI) > 1.2 then t = t + 0 elseif math.abs(d - RI) <= 1.2 then t = 2 elseif math.abs(d - RO) <= 1.2 then t = 5 end
        local seg = (math.atan(dy, dx) + math.pi) / (math.pi / 9); if math.abs(seg - math.floor(seg + 0.5)) < 0.07 then t = 1 end end
      L.set(b, x, y, TOMB[math.max(1, math.min(6, t))])
    end
  end end
  -- 문 안쪽
  for y = 13, 56 do for x = 14, 49 do
    local dx, dy = x + 0.5 - cx, y + 0.5 - cy
    if (y > cy or math.sqrt(dx * dx + dy * dy) < RI) then
      if open then
        local q = (y - 13) / 43
        local c = q < 0.35 and "#05030a" or (q < 0.7 and "#120a22" or "#22123e")
        L.set(b, x, y, c)
      else
        L.set(b, x, y, ((x + y) % 9 == 0) and TOMB[1] or TOMB[2])
      end
    end
  end end
  if open then
    for k = 0, 4 do local yy = 44 + k * 3; L.hline(b, 18 + k, 45 - k, yy, k % 2 == 0 and "#3a2070" or "#5c38a8"); L.hline(b, 18 + k, 45 - k, yy + 1, "#120a22") end   -- 아래로 내려가는 계단
    for k = 0, 6 do L.set(b, 22 + k * 3, 30 + (k % 3) * 3, k % 2 == 0 and VIOLET[4] or "#ff6a3a") end   -- 흑염 불씨
    L.shadeEllipse(b, 32, 36, 6, 8, { "#22123e", "#3a2070", "#5c38a8", "#8a64e0" }, 0.4)
  else
    L.vline(b, 32, 14, 56, TOMB[1])   -- 두 쪽 문짝
    for k = 0, 33 do   -- 보랏빛 사슬 X
      local x1, y1 = 15 + k, 16 + math.floor(k * 1.15)
      local x2 = 48 - k
      local c = (k % 3 == 0) and VIOLET[5] or VIOLET[3]
      L.set(b, x1, y1, c); L.set(b, x2, y1, c)
    end
    for a = 0, 23 do local t = a / 24 * math.pi * 2; L.set(b, math.floor(32 + math.cos(t) * 6), math.floor(35 + math.sin(t) * 6), a % 2 == 0 and VIOLET[5] or VIOLET[4]) end   -- 봉인 문양
    L.rect(b, 31, 34, 3, 3, VIOLET[6]); L.set(b, 32, 30, VIOLET[5]); L.set(b, 32, 40, VIOLET[5]); L.set(b, 27, 35, VIOLET[5]); L.set(b, 37, 35, VIOLET[5])
  end
  -- 이맛돌의 왕관 부조
  L.rect(b, 25, 0, 15, 9, TOMB[3]); L.hline(b, 25, 39, 0, TOMB[5]); L.vline(b, 25, 0, 8, TOMB[5]); L.vline(b, 39, 0, 8, TOMB[1])
  L.poly(b, { { 27, 7 }, { 27, 3 }, { 29, 5 }, { 32, 1 }, { 35, 5 }, { 37, 3 }, { 37, 7 } }, GOLD[2])
  L.hline(b, 27, 37, 7, GOLD[3]); L.set(b, 32, 2, GOLD[4]); L.set(b, 27, 3, GOLD[3]); L.set(b, 37, 3, GOLD[3]); L.set(b, 32, 5, open and VIOLET[5] or CRIM[4])
  L.line(b, 30, 6, 33, 3, TOMB[1])   -- 깨진 금
  -- 기둥머리 · 받침 · 계단
  L.rect(b, 1, 30, 15, 3, TOMB[4]); L.hline(b, 1, 15, 30, TOMB[6]); L.rect(b, 48, 30, 15, 3, TOMB[4]); L.hline(b, 48, 62, 30, TOMB[6])
  L.rect(b, 0, 56, 64, 4, TOMB[3]); L.hline(b, 0, 63, 56, TOMB[5]); L.hline(b, 0, 63, 59, TOMB[1])
  -- 해골 장식 · 금 간 돌
  for _, sx in ipairs({ 8, 55 }) do L.rect(b, sx - 2, 22, 5, 4, "#a8a2b0"); L.set(b, sx - 1, 23, TOMB[1]); L.set(b, sx + 1, 23, TOMB[1]); L.hline(b, sx - 1, sx + 1, 26, "#8a8492") end
  L.line(b, 6, 40, 9, 47, TOMB[1]); L.line(b, 57, 36, 55, 44, TOMB[1])
end
obj("tomb_gate", 64, 60, function(b) tombArch(b, false) end)
obj("tomb_gate_open", 64, 60, function(b) tombArch(b, true) end)


-- ----------------------------------------------------------- v86 시네마틱 도트(오프닝 · 진 엔딩)
--   cine_king   = 심연에 잠식된 기사왕 카인 — 바닥에 꽂은 대검에 두 손을 얹고 선 실루엣 · 왕관 · 진홍 안광 · 발밑의 흑염
--   cine_hunter = 폭풍을 마주 보고 선 사냥꾼의 뒷모습 — 바람에 나부끼는 망토 · 등의 검 · 바위 언덕
--   cine_sun    = 폭풍이 걷힌 뒤 떠오르는 새벽 해(반원 + 빛살)
obj("cine_king", 56, 66, function(b)
  L.shadePoly(b, { { 15, 20 }, { 41, 20 }, { 52, 63 }, { 4, 63 } }, { ABY[1], ABY[2], ABY[2], ABY[3] }, -0.1)     -- 망토
  for k = 0, 5 do L.line(b, 9 + k * 7, 63, 12 + k * 6, 40, ABY[1]) end                                               -- 망토 주름
  L.shadeCyl(b, 20, 44, 7, 19, OBS, -0.22); L.shadeCyl(b, 29, 44, 7, 19, OBS, -0.22)                                   -- 다리(정강이 갑주)
  L.rect(b, 19, 60, 9, 3, OBS[2]); L.rect(b, 28, 60, 9, 3, OBS[2])
  L.shadePoly(b, { { 17, 21 }, { 39, 21 }, { 37, 45 }, { 19, 45 } }, OBS, -0.18)                                      -- 흉갑
  L.hline(b, 20, 36, 33, OBS[1]); L.hline(b, 19, 37, 44, OBS[1]); L.vline(b, 28, 22, 44, OBS[2])
  L.poly(b, { { 26, 26 }, { 30, 26 }, { 28, 31 } }, CRIM[3])                                                          -- 심연에 물든 문장
  L.shadeEllipse(b, 15, 22, 7, 5, OBS, -0.12); L.shadeEllipse(b, 41, 22, 7, 5, OBS, -0.12)                               -- 견갑
  for _, sx in ipairs({ 10, 13, 16, 40, 43, 46 }) do L.set(b, sx, 18, OBS[5]) end                                     -- 견갑 가시
  L.shadeEllipse(b, 28, 12, 7, 8, OBS, -0.12)                                                                          -- 투구
  L.hline(b, 23, 33, 13, OL); L.set(b, 25, 13, "#ff3a4a"); L.set(b, 26, 13, "#ff9aa4"); L.set(b, 30, 13, "#ff9aa4"); L.set(b, 31, 13, "#ff3a4a")   -- 진홍 안광
  L.poly(b, { { 21, 6 }, { 21, 2 }, { 24, 4 }, { 28, 0 }, { 32, 4 }, { 35, 2 }, { 35, 6 } }, GOLD[3])                  -- 금 간 왕관
  L.hline(b, 21, 35, 6, GOLD[2]); L.set(b, 28, 1, GOLD[5]); L.set(b, 28, 4, CRIM[4]); L.line(b, 30, 2, 31, 5, GOLD[1])
  L.rect(b, 27, 30, 3, 33, STONE[4]); L.vline(b, 27, 30, 62, STONE[6]); L.vline(b, 29, 30, 62, STONE[3])              -- 바닥에 꽂은 대검
  for y = 34, 60, 5 do L.set(b, 28, y, VIOLET[4]) end                                                                 -- 검신의 심연 룬
  L.rect(b, 22, 28, 13, 2, GOLD[2]); L.hline(b, 22, 34, 28, GOLD[4])                                                  -- 코등이
  L.shadeEllipse(b, 24, 25, 3, 3, OBS, 0.2); L.shadeEllipse(b, 32, 25, 3, 3, OBS, 0.2)                                -- 두 손(건틀릿)
  L.rect(b, 27, 22, 3, 4, WOOD[2]); L.rect(b, 26, 20, 5, 2, GOLD[3])                                                  -- 손잡이 · 폼멜
  for k = 0, 9 do L.set(b, 6 + k * 5, 64 - (k % 3), k % 2 == 0 and ABY[5] or "#ff6a3a"); L.set(b, 8 + k * 5, 62 - (k % 2) * 2, ABY[4]) end   -- 발밑의 흑염
end)
obj("cine_hunter", 40, 52, function(b)
  L.shadePoly(b, { { 0, 52 }, { 6, 40 }, { 16, 37 }, { 28, 38 }, { 36, 43 }, { 40, 52 } }, STONE, -0.05)              -- 바위 언덕
  L.line(b, 8, 44, 14, 49, STONE[1]); L.line(b, 26, 42, 31, 48, STONE[1])
  L.shadeCyl(b, 14, 28, 5, 11, ASH, 0); L.shadeCyl(b, 21, 28, 5, 11, ASH, 0)                                          -- 다리
  L.rect(b, 13, 38, 6, 2, ASH[1]); L.rect(b, 21, 38, 6, 2, ASH[1])
  L.shadePoly(b, { { 12, 12 }, { 28, 12 }, { 39, 34 }, { 31, 31 }, { 34, 37 }, { 22, 33 }, { 9, 35 } }, { TEAL[1], TEAL[2], TEAL[2], TEAL[3] }, -0.05)   -- 바람에 나부끼는 망토
  L.line(b, 20, 14, 33, 34, TEAL[1]); L.line(b, 16, 15, 14, 33, TEAL[1])
  L.line(b, 11, 30, 27, 6, STONE[5]); L.line(b, 12, 30, 28, 6, STONE[3]); L.rect(b, 25, 8, 4, 2, GOLD[3]); L.set(b, 28, 5, GOLD[4])   -- 등에 멘 검
  L.shadeEllipse(b, 20, 9, 6, 6, { TEAL[1], TEAL[2], TEAL[3] }, 0)                                                     -- 두건
  L.line(b, 25, 6, 31, 4, TEAL[2]); L.set(b, 32, 4, TEAL[3])                                                           -- 두건 끝자락
  L.hline(b, 15, 25, 13, ASH[2])
end)
obj("cine_sun", 64, 30, function(b)
  for k = 0, 10 do local a = math.pi + k / 10 * math.pi; for r = 21, 30 do if r % 2 == 0 or k % 2 == 0 then L.set(b, math.floor(32 + math.cos(a) * r), math.floor(29 + math.sin(a) * r * 0.95), r < 25 and GOLD[5] or GOLD[4]) end end end   -- 빛살
  L.shadeEllipse(b, 32, 29, 18, 18, { GOLD[3], GOLD[4], GOLD[5], GOLD[6] }, 0.15, function(x, y) return y <= 29 end)     -- 반원 해
  L.hline(b, 10, 54, 29, GOLD[6])
end, true)

-- ----------------------------------------------------------- 저장
local sheet = L.atlas(items, 384, 1)
L.saveAtlas(OUT .. "/rb.aseprite", OUT .. "/rb.png", sheet, items)
local meta = { items = {} }
for _, it in ipairs(items) do meta.items[it.name] = { it.x, it.y, it.buf.w, it.buf.h, it.ax, it.ay } end
meta.w, meta.h = sheet.w, sheet.h
L.writeFile(OUT .. "/rb.json", L.json(meta))
print("reboot: " .. #items .. " sprites, sheet " .. sheet.w .. "x" .. sheet.h)
