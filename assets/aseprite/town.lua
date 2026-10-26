-- ==========================================================================
-- town.lua — 야외 마을: 공방 4종 × 단계(폐허/오두막/공방/완성), 마을 회관 4단계, 오두막, 횃불대, 우물, 분수,
--            성문 아치, 돌담, 유물 복원 화로, 준비대, 돌무더기/잡초
--   aseprite -b --script-param dir=<이 폴더> --script-param out=<assets/sprites> --script town.lua
-- 결과: town.aseprite / town.png / town.json  (공방은 부지 왼쪽 위가 기준점 — townview.js 가 (pl.x, pl.y) 에 그린다)
-- ==========================================================================
local DIR = app.params.dir
local OUT = app.params.out
package.path = DIR .. "/?.lua;" .. package.path
local L = require("lib")

local OL = "#0b0c10"
local WOOD = { "#24150b", "#3c2414", "#5a361d", "#7a4c28", "#9a6838", "#b98a52" }
local PLASTER = { "#6e6250", "#8a7c64", "#a8987a", "#c4b494", "#ddd0b0" }
local STONE = { "#1b2028", "#2b323c", "#3f4853", "#56616d", "#707d8a", "#919daa", "#b9c3cd" }
local THATCH = { "#4a3a1c", "#6a5428", "#8a7038", "#a8894a", "#c8a862" }
local DIRT = { "#3a2c1e", "#4a3826", "#5a4630", "#6a5438" }
local MOSS = { "#1b3d22", "#25532d", "#356e3a", "#4a8a48", "#6aa85a" }
local GOLD = { "#6e4c18", "#a8792a", "#d8ad55", "#f6dc8e" }
local LIGHT = { "#c87a2a", "#ffb347", "#ffd36a", "#fff0b0" }
local GLASS_DARK = { "#141820", "#1e2430" }
local ROOF = {
  carpentry = { "#3e2410", "#5e3818", "#7e4e22", "#a06a32", "#c08a4a" },
  butcher = { "#3e1416", "#5e2024", "#80303a", "#a64650", "#c86a70" },
  smelter = { "#1c2028", "#2c3240", "#404a5c", "#58667c", "#7a8aa0" },
  potion = { "#24183e", "#36265c", "#4c3a80", "#6a54a8", "#8c78c8" }
}

local items = {}
local function add(name, buf, ax, ay) items[#items + 1] = { name = name, buf = buf, ax = ax, ay = ay } end

-- ----------------------------------------------------------- 공통 부품
local function dirtPatch(b, x0, y0, x1, y1, seed)
  local r = L.rng(seed)
  L.each(b, x0, y0, x1, y1, function(x, y)
    local nx = (x - (x0 + x1) / 2) / ((x1 - x0) / 2); local ny = (y - (y0 + y1) / 2) / ((y1 - y0) / 2)
    if nx * nx * 0.6 + ny * ny * 0.6 + r() * 0.15 < 1 then return L.pick(DIRT, 0.35 + r() * 0.5 - ny * 0.1) end
  end)
  for _ = 1, 30 do local x, y = x0 + math.floor(r() * (x1 - x0)), y0 + math.floor(r() * (y1 - y0)); if L.get(b, x, y) then L.set(b, x, y, r() < 0.5 and STONE[4] or DIRT[1]) end end
end
local function window(b, x, y, w, h, lit, shutters)
  L.rect(b, x - 1, y - 1, w + 2, h + 2, WOOD[2])
  if lit then
    L.rect(b, x, y, w, h, LIGHT[3]); L.hline(b, x, x + w - 1, y, LIGHT[4]); L.vline(b, x + w - 1, y, y + h - 1, LIGHT[2])
  else
    L.rect(b, x, y, w, h, GLASS_DARK[1]); L.set(b, x, y, GLASS_DARK[2])
  end
  L.vline(b, x + math.floor(w / 2), y, y + h - 1, WOOD[2]); L.hline(b, x, x + w - 1, y + math.floor(h / 2), WOOD[2])
  L.hline(b, x - 1, x + w, y + h + 1, WOOD[4])
  if shutters then L.rect(b, x - 4, y - 1, 3, h + 2, WOOD[3]); L.rect(b, x + w + 1, y - 1, 3, h + 2, WOOD[3]); L.vline(b, x - 3, y, y + h - 1, WOOD[4]); L.vline(b, x + w + 2, y, y + h - 1, WOOD[4]) end
end
local function door(b, x, y, w, h, lit)
  L.rect(b, x - 1, y - 1, w + 2, h + 1, WOOD[1])
  L.shadeCyl(b, x, y, w, h, WOOD, 0.0)
  for xx = x + 2, x + w - 2, 3 do L.vline(b, xx, y + 1, y + h - 1, WOOD[2]) end
  L.set(b, x + w - 3, y + math.floor(h / 2), GOLD[3])
  if lit then L.hline(b, x + 1, x + w - 2, y + h - 1, LIGHT[2]) end
end
local function plankWall(b, x0, y0, x1, y1)
  for y = y0, y1 do
    local row = math.floor((y - y0) / 3)
    for x = x0, x1 do
      local edge = (y - y0) % 3 == 0
      L.set(b, x, y, edge and WOOD[2] or L.pick({ WOOD[3], WOOD[4], WOOD[4], WOOD[5] }, ((x * 7 + row * 13) % 11) / 11))
    end
  end
end
local function plasterWall(b, x0, y0, x1, y1)
  L.shadeCyl(b, x0, y0, x1 - x0 + 1, y1 - y0 + 1, PLASTER, -0.02)
  -- 반목조 들보
  L.hline(b, x0, x1, y0, WOOD[2]); L.hline(b, x0, x1, y1, WOOD[2]); L.hline(b, x0, x1, math.floor((y0 + y1) / 2), WOOD[3])
  for x = x0, x1, 16 do L.vline(b, x, y0, y1, WOOD[2]) end
  L.vline(b, x1, y0, y1, WOOD[2])
  for x = x0 + 8, x1 - 8, 32 do L.line(b, x - 6, y0 + 1, x + 6, math.floor((y0 + y1) / 2) - 1, WOOD[3]) end
end
local function stoneBase(b, x0, y0, x1, y1)
  for y = y0, y1 do for x = x0, x1 do
    local row = math.floor((y - y0) / 3)
    local off = (row % 2) * 4
    local edge = (y - y0) % 3 == 2 or (x + off) % 8 == 0
    L.set(b, x, y, edge and STONE[2] or L.pick({ STONE[3], STONE[4], STONE[5] }, (((x + off) // 8 * 5 + row * 3) % 7) / 7))
  end end
  L.hline(b, x0, x1, y0, STONE[6])
end
local function roofTiles(b, pts, ramp, rowH, seed)
  local r = L.rng(seed)
  L.poly(b, pts, function(x, y)
    local row = math.floor(y / rowH)
    local inrow = y % rowH
    local off = (row % 2) * 3
    local c = inrow == rowH - 1 and ramp[1] or (inrow == 0 and ramp[4] or ramp[3])
    if (x + off) % 6 == 0 and inrow ~= 0 then c = ramp[2] end
    if r() < 0.006 then c = ramp[5] end
    return c
  end)
end
local function thatchRoof(b, pts, seed)
  local r = L.rng(seed)
  L.poly(b, pts, function(x, y)
    local v = ((y % 4) == 0) and 0.15 or 0.55
    v = v + (r() - 0.5) * 0.3 - (y - pts[3][2]) * 0.004
    return L.pick(THATCH, v)
  end)
  -- 너덜한 처마
  local by = math.floor(pts[1][2])
  for x = math.floor(pts[1][1]), math.floor(pts[2][1]) do if r() < 0.5 then L.set(b, x, by + 1, THATCH[2]) end end
end
local function sign(b, x, y, kind)
  L.vline(b, x + 2, y - 3, y, WOOD[2]); L.vline(b, x + 10, y - 3, y, WOOD[2])
  L.rect(b, x, y, 13, 9, WOOD[4]); L.hline(b, x, x + 12, y, WOOD[5]); L.hline(b, x, x + 12, y + 8, WOOD[2])
  local cx, cy = x + 6, y + 4
  if kind == "carpentry" then L.hline(b, cx - 4, cx + 2, cy, STONE[6]); L.hline(b, cx - 4, cx + 2, cy + 1, STONE[4]); L.rect(b, cx + 3, cy - 1, 2, 3, WOOD[2])
  elseif kind == "butcher" then L.rect(b, cx - 3, cy - 2, 5, 3, STONE[6]); L.set(b, cx - 3, cy + 1, STONE[4]); L.rect(b, cx + 2, cy - 1, 3, 1, WOOD[2])
  elseif kind == "smelter" then L.hline(b, cx - 4, cx + 3, cy, STONE[3]); L.rect(b, cx - 2, cy + 1, 4, 2, STONE[2]); L.hline(b, cx - 3, cx + 1, cy - 1, STONE[5])
  else L.rect(b, cx - 2, cy - 1, 5, 4, "#5fd8c0"); L.set(b, cx - 1, cy - 1, "#c8fff0"); L.rect(b, cx - 1, cy - 3, 3, 2, "#d8e8f0") end
end
local function fence(b, x0, x1, y)
  for x = x0, x1, 5 do L.vline(b, x, y - 5, y, WOOD[3]); L.set(b, x, y - 5, WOOD[5]) end
  L.hline(b, x0, x1, y - 4, WOOD[4]); L.hline(b, x0, x1, y - 2, WOOD[3])
end
local function barrel(b, x, y)
  L.shadeCyl(b, x, y, 7, 9, WOOD, 0.02); L.hline(b, x, x + 6, y + 2, STONE[3]); L.hline(b, x, x + 6, y + 6, STONE[3]); L.hline(b, x + 1, x + 5, y, WOOD[6])
end
local function crate(b, x, y, w, h)
  L.rect(b, x, y, w, h, WOOD[4]); L.hline(b, x, x + w - 1, y, WOOD[6]); L.line(b, x, y, x + w - 1, y + h - 1, WOOD[3]); L.line(b, x + w - 1, y, x, y + h - 1, WOOD[3])
  L.vline(b, x, y, y + h - 1, WOOD[3]); L.vline(b, x + w - 1, y, y + h - 1, WOOD[2]); L.hline(b, x, x + w - 1, y + h - 1, WOOD[2])
end
local function logPile(b, x, y)
  for k = 0, 2 do
    local yy = y + (2 - k) * 0
    for j = 0, 2 - k do
      local cx, cy = x + j * 6 + k * 3, y - k * 5
      L.shadeEllipse(b, cx + 2.5, cy + 2.5, 2.8, 2.8, { "#8a5f2f", "#c8975a", "#e0b880" }, 0.0)
      L.set(b, cx + 2, cy + 2, "#6a4422")
    end
  end
end

-- ----------------------------------------------------------- 공방: 120×84, 부지 왼쪽 위 = (4, 20)
local PX, PY = 4, 20   -- 부지 원점의 시트 안 위치. 부지 112×62 → 시트 x 4..115, y 20..81
local function facility(id, tier)
  local yard = L.new(120, 84)
  local b = L.new(120, 84)
  local seed = (#id * 31 + tier * 7)
  -- 마당 흙(작업대가 놓일 앞마당) — 윤곽선 없이 땅에 스며들게 따로 그린다
  dirtPatch(yard, PX + 6, PY + 30, PX + 106, PY + 61, seed)
  local function finish() L.outline(b, OL); L.blit(yard, b, 0, 0); return yard end
  if tier == 0 then
    -- 폐허: 무너진 담, 탄 들보, 돌무더기, 잡초
    dirtPatch(yard, PX + 6, PY + 10, PX + 106, PY + 40, seed + 1)
    stoneBase(b, PX + 8, PY + 26, PX + 30, PY + 33); stoneBase(b, PX + 8, PY + 14, PX + 13, PY + 33)
    stoneBase(b, PX + 84, PY + 22, PX + 104, PY + 30); stoneBase(b, PX + 98, PY + 10, PX + 104, PY + 30)
    L.line(b, PX + 30, PY + 20, PX + 64, PY + 24, WOOD[2]); L.line(b, PX + 30, PY + 21, PX + 64, PY + 25, WOOD[1])
    L.line(b, PX + 50, PY + 30, PX + 80, PY + 26, WOOD[3]); L.line(b, PX + 50, PY + 31, PX + 80, PY + 27, WOOD[2])
    local r = L.rng(seed + 9)
    for _ = 1, 9 do local x, y = PX + 14 + math.floor(r() * 84), PY + 28 + math.floor(r() * 26); L.shadeEllipse(b, x, y, 2 + r() * 3, 1.5 + r() * 2, STONE, 0.0) end
    for _ = 1, 8 do local x, y = PX + 10 + math.floor(r() * 92), PY + 40 + math.floor(r() * 20); L.line(b, x, y, x + (r() - 0.5) * 3, y - 3 - r() * 3, MOSS[4]) end
    return finish()
  end
  local ramp = ROOF[id]
  local wall0, wall1 = PY + 14, PY + 34
  local bx0, bx1 = PX + 8, PX + 104
  if tier == 1 then bx0, bx1 = PX + 22, PX + 90 end
  -- 벽
  if tier == 1 then plankWall(b, bx0, wall0 + 2, bx1, wall1)
  elseif tier == 2 then plasterWall(b, bx0, wall0, bx1, wall1)
  else plasterWall(b, bx0, wall0 - 2, bx1, wall1 - 6); stoneBase(b, bx0 - 2, wall1 - 5, bx1 + 2, wall1) end
  -- 문과 창
  local cx = PX + 56
  door(b, cx - 6, wall0 + 6, 12, wall1 - wall0 - 6, tier >= 2)
  if tier == 1 then window(b, bx0 + 8, wall0 + 7, 7, 6, false)
  else
    window(b, bx0 + 10, wall0 + 5, 10, 7, true, tier >= 3); window(b, bx1 - 20, wall0 + 5, 10, 7, true, tier >= 3)
    if tier >= 3 then L.rect(b, bx0 + 9, wall0 + 14, 12, 2, "#a8404a"); L.rect(b, bx1 - 21, wall0 + 14, 12, 2, "#a8404a"); for x = bx0 + 10, bx0 + 20, 3 do L.set(b, x, wall0 + 13, "#f0a0b0") end; for x = bx1 - 20, bx1 - 10, 3 do L.set(b, x, wall0 + 13, "#e8d26a") end end
  end
  L.rect(b, cx - 9, wall1, 18, 2, STONE[4]); L.hline(b, cx - 9, cx + 8, wall1, STONE[6])   -- 문턱 돌
  -- 지붕
  if tier == 1 then
    thatchRoof(b, { { bx0 - 8, wall0 + 4 }, { bx1 + 8, wall0 + 4 }, { bx1 - 6, PY - 4 }, { bx0 + 6, PY - 4 } }, seed)
  else
    local over = tier >= 3 and 6 or 4
    roofTiles(b, { { PX - over + 4, wall0 + 3 }, { PX + 108 + over, wall0 + 3 }, { PX + 96, PY - 6 }, { PX + 16, PY - 6 } }, ramp, 3, seed)
    L.hline(b, PX + 16, PX + 96, PY - 6, tier >= 3 and GOLD[3] or ramp[5])   -- 용마루
    L.hline(b, PX - over + 4, PX + 108 + over, wall0 + 3, ramp[1])
    if tier >= 3 then
      for x = PX + 20, PX + 92, 12 do L.set(b, x, PY - 7, GOLD[4]) end
    end
  end
  -- 굴뚝(제철소는 2단계부터, 다른 공방은 3단계)
  if (id == "smelter" and tier >= 2) or tier >= 3 then
    local chx = PX + 82
    stoneBase(b, chx, PY - 14, chx + 8, PY + 4)
    L.rect(b, chx - 1, PY - 16, 11, 3, STONE[3]); L.hline(b, chx - 1, chx + 9, PY - 16, STONE[6])
    if id == "smelter" then L.rect(b, chx + 2, PY - 15, 5, 1, LIGHT[1]) end
  end
  -- 간판(2단계부터)
  if tier >= 2 then sign(b, bx0 + 23, wall0 + 6, id) end
  -- 3단계: 처마 등불 두 개(빛은 게임이 덧그린다), 깃대
  if tier >= 3 then
    for _, lx in ipairs({ bx0 + 1, bx1 - 1 }) do L.rect(b, lx - 1, wall0 + 1, 3, 4, LIGHT[3]); L.set(b, lx, wall0 + 2, LIGHT[4]); L.hline(b, lx - 1, lx + 1, wall0, STONE[2]) end
    L.vline(b, PX + 14, PY - 18, PY + 2, WOOD[2])
  end
  -- 마당 소품(작업대 자리인 가운데는 비운다)
  if tier >= 2 then
    fence(b, PX + 6, PX + 30, PY + 61); fence(b, PX + 82, PX + 106, PY + 61)
  end
  if id == "carpentry" then logPile(b, PX + 8, PY + 44); if tier >= 2 then logPile(b, PX + 88, PY + 46) end
  elseif id == "butcher" then barrel(b, PX + 10, PY + 42); if tier >= 2 then barrel(b, PX + 92, PY + 44); L.hline(b, PX + 88, PX + 104, PY + 37, STONE[3]); for x = PX + 90, PX + 102, 5 do L.vline(b, x, PY + 38, PY + 40, STONE[4]); L.rect(b, x - 1, PY + 41, 3, 4, "#a8404a") end end
  elseif id == "smelter" then L.shadeEllipse(b, PX + 16, PY + 48, 7, 4, { "#0e0e10", "#1c1c20", "#2c2c32" }, 0.0); if tier >= 2 then L.rect(b, PX + 90, PY + 44, 12, 4, STONE[2]); L.rect(b, PX + 93, PY + 48, 6, 4, STONE[3]); L.hline(b, PX + 89, PX + 103, PY + 44, STONE[5]) end
  else crate(b, PX + 10, PY + 42, 9, 8); for k = 0, 2 do L.shadeEllipse(b, PX + 90 + k * 6, PY + 48, 2.5, 2.5, { "#4a2a1a", "#6a3a22" }, 0.0); L.set(b, PX + 90 + k * 6, PY + 45, "#5aa060"); L.set(b, PX + 89 + k * 6, PY + 44, "#7cc062") end end
  return finish()
end
for _, id in ipairs({ "carpentry", "butcher", "smelter", "potion" }) do
  for tier = 0, 3 do add("fac_" .. id .. "_" .. tier, facility(id, tier), PX, PY) end
end

-- ----------------------------------------------------------- 마을 회관: 136×84, 부지(128×58) 왼쪽 위 = (4, 24)
local HX, HY = 4, 24
local function hall(stage)
  local b = L.new(136, 84)
  local r = L.rng(900 + stage)
  -- 계단과 앞뜰
  stoneBase(b, HX + 30, HY + 50, HX + 98, HY + 57)
  -- 벽(돌 아래 + 회벽 위)
  stoneBase(b, HX + 4, HY + 34, HX + 124, HY + 50)
  plasterWall(b, HX + 6, HY + 14, HX + 122, HY + 34)
  -- 큰 지붕
  local ramp = stage >= 4 and { "#4a3216", "#6e4c1e", "#946a2a", "#c09040", "#e8c46a" } or (stage >= 2 and { "#2a1e18", "#40302a", "#5a463a", "#76604e", "#92806a" } or { "#1e1814", "#2e2620", "#40362c", "#544838", "#6a5c48" })
  roofTiles(b, { { HX - 4, HY + 17 }, { HX + 132, HY + 17 }, { HX + 112, HY - 10 }, { HX + 16, HY - 10 } }, ramp, 3, 950 + stage)
  L.hline(b, HX + 16, HX + 112, HY - 10, stage >= 4 and GOLD[4] or ramp[5])
  if stage < 2 then   -- 지붕 구멍
    L.ellipse(b, HX + 30, HY + 2, 6, 3, "#07090c"); L.ellipse(b, HX + 92, HY + 6, 5, 2.5, "#07090c")
    L.line(b, HX + 25, HY + 2, HX + 35, HY + 1, WOOD[2]); L.line(b, HX + 88, HY + 6, HX + 97, HY + 5, WOOD[2])
  end
  -- 가운데 박공(둥근 창)
  L.poly(b, { { HX + 50, HY + 17 }, { HX + 78, HY + 17 }, { HX + 64, HY - 4 } }, function(x, y) return y < HY + 3 and PLASTER[4] or PLASTER[3] end)
  L.ellipse(b, HX + 64, HY + 8, 4, 4, stage >= 3 and LIGHT[3] or GLASS_DARK[1]); L.vline(b, HX + 64, HY + 4, HY + 12, WOOD[2])
  -- 창(1단계는 판자로 막혀 있다)
  for _, wx in ipairs({ HX + 14, HX + 104 }) do
    if stage >= 2 then window(b, wx, HY + 20, 10, 9, stage >= 3, stage >= 3)
    else L.rect(b, wx - 1, HY + 19, 12, 11, GLASS_DARK[1]); L.line(b, wx - 1, HY + 20, wx + 10, HY + 28, WOOD[4]); L.line(b, wx - 1, HY + 28, wx + 10, HY + 20, WOOD[4]) end
  end
  -- 게시판(앞)
  L.vline(b, HX + 38, HY + 26, HY + 50, WOOD[2]); L.vline(b, HX + 90, HY + 26, HY + 50, WOOD[2])
  L.rect(b, HX + 38, HY + 24, 53, 24, WOOD[1]); L.rect(b, HX + 39, HY + 25, 51, 22, WOOD[4])
  for x = HX + 39, HX + 89, 4 do L.vline(b, x, HY + 25, HY + 46, WOOD[3]) end
  local paper = stage >= 2 and "#e8dcc0" or "#b8a888"
  for _, p in ipairs({ { HX + 43, HY + 28, 12, 9 }, { HX + 58, HY + 27, 11, 12 }, { HX + 73, HY + 29, 12, 8 }, { HX + 46, HY + 39, 9, 6 } }) do
    L.rect(b, p[1], p[2], p[3], p[4], paper); L.hline(b, p[1] + 2, p[1] + p[3] - 3, p[2] + 3, "#8a7a60"); L.hline(b, p[1] + 2, p[1] + p[3] - 4, p[2] + 5, "#8a7a60")
    L.set(b, p[1] + math.floor(p[3] / 2), p[2], "#b0505a")
  end
  L.rect(b, HX + 36, HY + 22, 57, 2, WOOD[5])
  -- 단계 장식
  if stage >= 2 then   -- 처마 깃발 천(정면 휘장)
    L.rect(b, HX + 8, HY + 18, 5, 12, "#8e2f3a"); L.rect(b, HX + 115, HY + 18, 5, 12, "#8e2f3a")
    L.set(b, HX + 10, HY + 24, GOLD[3]); L.set(b, HX + 117, HY + 24, GOLD[3])
  end
  if stage >= 3 then   -- 등불 + 돌계단 화분
    for _, lx in ipairs({ HX + 28, HX + 100 }) do L.rect(b, lx - 1, HY + 36, 4, 5, LIGHT[3]); L.set(b, lx, HY + 37, LIGHT[4]); L.hline(b, lx - 2, lx + 3, HY + 35, STONE[2]) end
    for _, px in ipairs({ HX + 24, HX + 104 }) do L.rect(b, px, HY + 51, 6, 5, "#6a3a22"); L.set(b, px + 2, HY + 50, "#7cc062"); L.set(b, px + 3, HY + 49, "#e894bc") end
  end
  if stage >= 4 then   -- 금빛 장식과 종탑
    L.rect(b, HX + 58, HY - 24, 13, 15, PLASTER[3]); L.hline(b, HX + 58, HX + 70, HY - 24, GOLD[3])
    L.poly(b, { { HX + 56, HY - 24 }, { HX + 72, HY - 24 }, { HX + 64, HY - 34 } }, function(x, y) return y < HY - 29 and GOLD[4] or GOLD[3] end)
    L.rect(b, HX + 61, HY - 20, 7, 8, "#1a1410"); L.shadeEllipse(b, HX + 64.5, HY - 15, 2.6, 2.6, GOLD, 0.0)
    for x = HX + 18, HX + 110, 10 do L.set(b, x, HY + 14, GOLD[4]); L.set(b, x, HY + 15, GOLD[3]) end
  end
  for _ = 1, 10 do local x, y = HX + 4 + math.floor(r() * 120), HY + 48 + math.floor(r() * 3); if L.get(b, x, y) then L.set(b, x, y, MOSS[3]) end end
  L.outline(b, OL)
  return b
end
for st = 1, 4 do add("hall_" .. st, hall(st), HX, HY) end

-- ----------------------------------------------------------- 일꾼의 오두막 48×36 (기준점 = 지붕 꼭대기 아래 가운데, 예전 drawCabin(x, y) 의 (x, y))
do
  local b = L.new(48, 36)
  plankWall(b, 7, 14, 40, 32)
  door(b, 20, 20, 8, 13, false)
  window(b, 31, 19, 6, 5, true)
  thatchRoof(b, { { 2, 16 }, { 45, 16 }, { 30, 2 }, { 17, 2 } }, 77)
  L.rect(b, 32, 0, 5, 6, STONE[3]); L.hline(b, 32, 36, 0, STONE[6])
  L.outline(b, OL)
  add("cabin", b, 24, 10)
end

-- ----------------------------------------------------------- 횃불대(불꽃은 게임이 그린다) 10×22, 기준점 = 발 (5, 21)
do
  local b = L.new(10, 22)
  L.shadeCyl(b, 4, 6, 3, 15, WOOD, 0.0)
  L.rect(b, 1, 3, 8, 4, STONE[2]); L.hline(b, 1, 8, 3, STONE[5]); L.hline(b, 2, 7, 6, STONE[1])
  L.hline(b, 2, 7, 2, "#3a1a10"); L.set(b, 4, 2, LIGHT[1])
  L.hline(b, 3, 7, 21, STONE[3])
  L.outline(b, OL)
  add("torch", b, 5, 21)
end

-- ----------------------------------------------------------- 우물(3단계) / 분수(4단계): 기준점 = 광장 가운데
do
  local b = L.new(44, 34)
  L.shadeEllipse(b, 22, 22, 17, 9, STONE, 0.05)
  L.ellipse(b, 22, 21, 12, 5.5, "#123a4d"); L.ellipse(b, 22, 21.5, 10, 4, "#1d5a74")
  for a = 0, 11 do local t = a / 12 * math.pi * 2; L.set(b, math.floor(22 + math.cos(t) * 15), math.floor(22 + math.sin(t) * 8), STONE[2]) end
  L.vline(b, 8, 4, 20, WOOD[3]); L.vline(b, 36, 4, 20, WOOD[3])
  L.poly(b, { { 4, 6 }, { 40, 6 }, { 34, 0 }, { 10, 0 } }, function(x, y) return y < 2 and WOOD[5] or WOOD[4] end)
  L.hline(b, 9, 35, 9, WOOD[2]); L.vline(b, 22, 9, 15, STONE[4]); L.rect(b, 20, 15, 5, 4, WOOD[3])
  L.outline(b, OL)
  add("well", b, 22, 22)
  local f = L.new(68, 48)
  L.shadeEllipse(f, 34, 32, 31, 14, STONE, 0.05)
  L.ellipse(f, 34, 31, 26, 10.5, "#123a4d"); L.ellipse(f, 34, 31.5, 23, 8.5, "#1d5a74")
  for a = 0, 17 do local t = a / 18 * math.pi * 2; L.set(f, math.floor(34 + math.cos(t) * 29), math.floor(32 + math.sin(t) * 13), (a % 2 == 0) and STONE[6] or STONE[2]) end
  L.shadeCyl(f, 30, 14, 8, 17, STONE, 0.05)
  L.shadeEllipse(f, 34, 14, 9, 3.5, STONE, 0.1); L.ellipse(f, 34, 13.6, 6, 2, "#2f86a8")
  L.shadeCyl(f, 32, 4, 4, 10, STONE, 0.1); L.set(f, 33, 3, GOLD[4]); L.set(f, 34, 3, GOLD[3])
  L.outline(f, OL)
  add("fountain", f, 34, 32)
end

-- ----------------------------------------------------------- 남쪽 원정 성문(아치) 100×70, 기준점 = 가운데 아래(문턱) (50, 64)
do
  local b = L.new(100, 70)
  local function pillar(x)
    stoneBase(b, x, 14, x + 13, 66)
    L.rect(b, x - 2, 10, 18, 5, STONE[4]); L.hline(b, x - 2, x + 15, 10, STONE[7])
    L.rect(b, x - 1, 60, 16, 7, STONE[3]); L.hline(b, x - 1, x + 14, 60, STONE[6])
    for y = 52, 59 do if (y + x) % 3 == 0 then L.set(b, x + (y % 5), y, MOSS[4]) end end
  end
  pillar(11); pillar(76)
  -- 아치
  L.each(b, 8, 0, 92, 22, function(x, y)
    local dx = (x + 0.5 - 50) / 41; local dy = (y + 0.5 - 22) / 21
    local d = dx * dx + dy * dy
    if d <= 1 and d >= 0.55 then
      local ang = math.atan(dy, dx)
      local seg = math.floor((ang + math.pi) / (math.pi / 9))
      return (seg % 2 == 0) and STONE[5] or STONE[4]
    end
  end)
  L.rect(b, 46, 0, 9, 7, STONE[6]); L.set(b, 50, 3, "#5fd8f0"); L.set(b, 49, 3, "#2f8fa0"); L.set(b, 51, 3, "#2f8fa0")   -- 이맛돌의 룬
  -- 걸린 등불 두 개
  for _, lx in ipairs({ 30, 70 }) do L.vline(b, lx, 14, 17, STONE[2]); L.rect(b, lx - 1, 18, 3, 4, LIGHT[3]); L.set(b, lx, 19, LIGHT[4]) end
  -- 덩굴
  for y = 8, 40, 2 do L.set(b, 12 + (y % 4 == 0 and 1 or 0), y, MOSS[3]); L.set(b, 88 - (y % 4 == 0 and 1 or 0), y + 1, MOSS[3]) end
  L.outline(b, OL)
  add("gate", b, 50, 64)
end

-- ----------------------------------------------------------- 돌담 마디(가로 16×13, 세로 12×16)
do
  local h = L.new(16, 13)
  stoneBase(h, 0, 3, 15, 12)
  for x = 0, 15 do if (x * 3) % 5 < 3 then L.set(h, x, 2, MOSS[4]); L.set(h, x, 3, MOSS[3]) end end
  L.innerEdge(h, 0.3, true)
  add("wallH", h, 0, 8)
  local v = L.new(12, 16)
  stoneBase(v, 1, 0, 10, 15)
  for y = 0, 15, 3 do L.set(v, 1, y, MOSS[3]) end
  L.innerEdge(v, 0.25, false)
  add("wallV", v, 6, 8)
end

-- ----------------------------------------------------------- 유물 복원 화로(룬 돌 화덕) 44×30, 기준점 = 화로 상자 왼쪽 위 (2, 6)
do
  local b = L.new(44, 30)
  stoneBase(b, 2, 8, 41, 27)
  L.shadeEllipse(b, 21.5, 9, 19, 5, STONE, 0.1)
  L.ellipse(b, 21.5, 9, 14, 3.4, "#141010")
  for _, c in ipairs({ { 12, 9 }, { 18, 10 }, { 25, 9 }, { 30, 10 }, { 21, 8 } }) do L.set(b, c[1], c[2], LIGHT[1]); L.set(b, c[1] + 1, c[2], "#7a2a12") end
  for x = 6, 38, 8 do L.set(b, x, 18, "#2f8fa0"); L.set(b, x + 1, 19, "#5fd8f0"); L.set(b, x, 20, "#2f8fa0") end   -- 룬 띠
  L.hline(b, 2, 41, 27, STONE[1])
  L.outline(b, OL)
  add("stove", b, 2, 6)
end

-- ----------------------------------------------------------- 준비대(짐 상자와 탁자) 64×30, 기준점 = (2, 8)
do
  local b = L.new(64, 30)
  L.rect(b, 2, 12, 60, 4, WOOD[5]); L.hline(b, 2, 61, 12, WOOD[6]); L.rect(b, 2, 16, 60, 10, WOOD[3])
  for x = 4, 60, 8 do L.vline(b, x, 16, 25, WOOD[2]) end
  crate(b, 6, 3, 12, 10); crate(b, 44, 5, 10, 8)
  L.rect(b, 22, 8, 18, 5, "#d8c39a"); L.hline(b, 22, 39, 8, "#efe0b8"); L.set(b, 30, 10, "#b0505a")
  barrel(b, 54, 2)
  L.outline(b, OL)
  add("prep", b, 2, 8)
end

-- ----------------------------------------------------------- 광장의 돌무더기/잡초(복구되면 사라진다)
local function rubble(seed)
  local b = L.new(16, 10)
  local r = L.rng(seed)
  for _ = 1, 5 do L.shadeEllipse(b, 3 + r() * 10, 5 + r() * 3, 2 + r() * 2.5, 1.5 + r() * 1.5, STONE, 0.0) end
  L.line(b, 2, 8, 12, 5, WOOD[3])
  L.outline(b, OL)
  return b
end
add("rubble0", rubble(1), 8, 8); add("rubble1", rubble(5), 8, 8); add("rubble2", rubble(9), 8, 8)
do
  local b = L.new(12, 10)
  for k = -2, 2 do L.line(b, 6 + k * 2, 9, 6 + k * 2.5, 2 + math.abs(k), k % 2 == 0 and MOSS[4] or MOSS[3]) end
  L.set(b, 6, 1, MOSS[5])
  add("weed", b, 6, 9)
end

local sheet, placed = L.atlas(items, 512, 1)
L.saveAtlas(OUT .. "/town.aseprite", OUT .. "/town.png", sheet, placed)
local m = { items = {} }
for _, it in ipairs(placed) do m.items[it.name] = { it.x, it.y, it.buf.w, it.buf.h, it.ax, it.ay } end
L.writeFile(OUT .. "/town.json", L.json(m))
print("town: " .. #placed .. " items, sheet " .. sheet.w .. "x" .. sheet.h)
