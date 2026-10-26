-- ==========================================================================
-- world.lua — 원정 숲의 땅 타일 / 장식 / 나무 / 바위 / 상자 / 수정 / 석주 / 가시덤불 / 그루터기 / 달의 돌 / 자원 지점
--   aseprite -b --script-param dir=<이 폴더> --script-param out=<assets/sprites> --script world.lua
-- 결과: tiles.aseprite/png/json (32×32 이음매 없는 타일), world.aseprite/png/json (기준점 = 땅에 닿는 자리)
-- ==========================================================================
local DIR = app.params.dir
local OUT = app.params.out
package.path = DIR .. "/?.lua;" .. package.path
local L = require("lib")

local OL = "#07120b"
local LEAF = { "#123e26", "#1a5634", "#237544", "#2e9152", "#40ad62", "#62c874", "#b4f0c4" }   -- v75: 신록 에메랄드로 밝게(마지막 = 빛받은 가장자리)
local LEAF2 = { "#10382e", "#185040", "#216a54", "#2c8468", "#3ca07e", "#58bc98", "#b0f0e4" }  -- 민트빛 나무(v75 밝게)
local BARK = { "#170f0a", "#2a1c12", "#3e2b1c", "#56402a", "#735a3e", "#8e7556" }
local STONE = { "#1b2028", "#2b323c", "#3f4853", "#56616d", "#707d8a", "#919daa", "#b9c3cd" }
local MOSS = { "#1b3d22", "#25532d", "#356e3a", "#4a8a48", "#6aa85a" }
local WOOD = { "#2a170c", "#452813", "#633a1d", "#83512a", "#a36c3a" }
local GOLD = { "#6e4c18", "#a8792a", "#d8ad55", "#f6dc8e" }
local TEAL = { "#1d4f5c", "#2f7f92", "#5fc8e0", "#bff3ff" }
local VIOLET = { "#3a2a5a", "#5a4290", "#8a6ad0", "#c9a6ff" }

-- ==========================================================================
-- 타일(32×32, 가장자리가 이어진다)
-- ==========================================================================
local tiles = {}
local function tget(b, x, y) return L.get(b, x % b.w, y % b.h) end
local function tset(b, x, y, c) L.set(b, x % b.w, y % b.h, c) end
local function noiseTile(seed, base, cols, blades, bladeCols, specks, speckCol)
  local b = L.new(32, 32)
  local r = L.rng(seed)
  -- 8px 격자의 값 잡음(이어지게 감싼다)
  local g = {}
  for j = 0, 3 do g[j] = {}; for i = 0, 3 do g[j][i] = r() end end
  local function v(x, y)
    local gx, gy = x / 8, y / 8
    local i0, j0 = math.floor(gx), math.floor(gy)
    local fx, fy = gx - i0, gy - j0
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    local a = g[j0 % 4][i0 % 4]; local bb = g[j0 % 4][(i0 + 1) % 4]
    local c = g[(j0 + 1) % 4][i0 % 4]; local d = g[(j0 + 1) % 4][(i0 + 1) % 4]
    return (a * (1 - fx) + bb * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
  end
  for y = 0, 31 do for x = 0, 31 do
    local n = v(x, y) + (r() - 0.5) * 0.18
    L.set(b, x, y, L.pick(cols, n))
  end end
  for _ = 1, blades do
    local x, y, h = math.floor(r() * 32), math.floor(r() * 32), 2 + math.floor(r() * 3)
    local c = bladeCols[1 + math.floor(r() * #bladeCols)]
    for k = 0, h - 1 do tset(b, x + ((k == h - 1 and r() < 0.4) and 1 or 0), y - k, c) end
  end
  for _ = 1, specks do tset(b, math.floor(r() * 32), math.floor(r() * 32), speckCol) end
  return b
end
-- v84 표면 질감(결): 어두운/밝은 낱알과 가는 뿌리 금을 흩뿌린다
local function grain(b, seed, cols, n, roots)
  local r = L.rng(seed * 7 + 3)
  for _ = 1, n do local x, y = math.floor(r() * 32), math.floor(r() * 32); L.set(b, x, y, cols[r() < 0.6 and 1 or 2]) end
  if roots then for _ = 1, 2 do local x, y = math.floor(r() * 28), math.floor(r() * 28); for k = 0, 5 do L.set(b, (x + k) % 32, (y + math.floor(k * 0.6 + r())) % 32, cols[1]) end end end
  return b
end
local GRASS = { "#1b2a1a", "#21321f", "#273a24", "#2e432a" }   -- v84: 채도를 낮춘 이끼빛 다크 판타지 잔디(명암 · 결)
for i = 0, 3 do
  tiles[#tiles + 1] = { name = "grass" .. i, buf = grain(noiseTile(101 + i * 17, nil, GRASS, 46, { "#3c5634", "#4a6640", "#121c12", "#121c12" }, 3, "#7a9468"), 101 + i, { "#141e14", "#3a4a30" }, 70, true), ax = 0, ay = 0 }
end
-- 마을 광장 포석(이끼 낀 줄눈)
local function flagTile(seed)
  local b = L.new(32, 32)
  local r = L.rng(seed)
  L.rect(b, 0, 0, 32, 32, "#16191a")
  local rows = { { 0, 9 }, { 10, 20 }, { 21, 31 } }
  for ri, row in ipairs(rows) do
    local x = (ri % 2) * -6
    while x < 32 do
      local w = 9 + math.floor(r() * 7)
      local col = L.pick({ STONE[2], STONE[3], STONE[3], STONE[4] }, r())
      for y = row[1], row[2] - 1 do for xx = x, x + w - 2 do tset(b, xx, y, col) end end
      for xx = x, x + w - 2 do tset(b, xx, row[1], L.mix(col, "#ffffff", 0.12)) end
      for y = row[1], row[2] - 1 do tset(b, x + w - 2, y, L.darken(col, 0.25)) end
      if r() < 0.5 then tset(b, x + 2 + math.floor(r() * (w - 4)), row[1] + 2 + math.floor(r() * 4), L.darken(col, 0.3)) end
      x = x + w
    end
  end
  for _ = 1, 26 do   -- 줄눈의 이끼
    local x, y = math.floor(r() * 32), math.floor(r() * 32)
    if tget(b, x, y) == "#16191a" then tset(b, x, y, r() < 0.5 and MOSS[2] or MOSS[3]) end
  end
  return b
end
tiles[#tiles + 1] = { name = "flag0", buf = flagTile(7), ax = 0, ay = 0 }
tiles[#tiles + 1] = { name = "flag1", buf = flagTile(13), ax = 0, ay = 0 }
-- 다져진 흙길
local function dirtTile(seed)
  local b = grain(noiseTile(seed, nil, { "#3e3124", "#463729", "#4e3e2e", "#564534" }, 10, { "#6a5640", "#2a2016" }, 8, "#7a6650"), seed, { "#2a2016", "#6a5a44" }, 60, true)   -- v84: 젖은 흙 · 짓밟힌 진흙길
  local r = L.rng(seed + 3)
  for _ = 1, 7 do local x, y = math.floor(r() * 32), math.floor(r() * 32); tset(b, x, y, STONE[4]); tset(b, x + 1, y, STONE[3]) end
  return b
end
tiles[#tiles + 1] = { name = "dirt0", buf = dirtTile(51), ax = 0, ay = 0 }
tiles[#tiles + 1] = { name = "dirt1", buf = dirtTile(77), ax = 0, ay = 0 }
do
  local sheet, placed = L.atlas(tiles, 128, 0)
  L.saveAtlas(OUT .. "/tiles.aseprite", OUT .. "/tiles.png", sheet, placed)
  local m = { items = {} }
  for _, it in ipairs(placed) do m.items[it.name] = { it.x, it.y, it.buf.w, it.buf.h, 0, 0 } end
  L.writeFile(OUT .. "/tiles.json", L.json(m))
end

-- ==========================================================================
-- 소품 아틀라스
-- ==========================================================================
local items = {}
local function add(name, buf, ax, ay) items[#items + 1] = { name = name, buf = buf, ax = ax, ay = ay } end

-- ----------------------------------------------------------- 땅 장식
local function flower(petal, petal2, seed)
  local b = L.new(9, 8)
  local r = L.rng(seed)
  for k = 0, 3 do
    local x, y = 1 + math.floor(r() * 6), 1 + math.floor(r() * 3)
    L.vline(b, x, y + 1, 7, k % 2 == 0 and "#2a5c33" or "#1f4a2a")
    L.set(b, x, y, petal); L.set(b, x - 1, y, petal2); L.set(b, x + 1, y, petal2); L.set(b, x, y - 1, petal2)
    L.set(b, x, y, "#fff6c0")
  end
  return b
end
add("flower_y", flower("#e8d26a", "#c9a84a", 3), 4, 7)
add("flower_p", flower("#e894bc", "#c86a96", 5), 4, 7)
add("flower_b", flower("#bfe0ff", "#86a8d8", 9), 4, 7)
add("flower_w", flower("#f2f2e6", "#c8c8b8", 11), 4, 7)
local function tuft(seed, h)
  local b = L.new(11, h + 2)
  local r = L.rng(seed)
  for k = 0, 6 do
    local x = 1 + math.floor(r() * 9)
    local hh = math.floor(h * (0.5 + r() * 0.5))
    local lean = (r() - 0.5) * 3
    L.line(b, x, h + 1, x + lean, h + 1 - hh, k % 3 == 0 and "#3b7a44" or (k % 3 == 1 and "#2a5c33" or "#1c4226"))
    L.set(b, math.floor(x + lean + 0.5), h + 1 - hh, "#5aa060")
  end
  return b
end
add("tuft0", tuft(21, 7), 5, 8); add("tuft1", tuft(23, 9), 5, 10); add("tuft2", tuft(29, 6), 5, 7)
local function fern(seed)
  local b = L.new(15, 10)
  local r = L.rng(seed)
  for k = -2, 2 do
    local a = -math.pi / 2 + k * 0.45
    local x0, y0 = 7, 9
    for s = 1, 7 do
      local x, y = x0 + math.cos(a) * s, y0 + math.sin(a) * s * 0.9 + s * s * 0.05
      L.set(b, x, y, s > 5 and "#5aa060" or "#2f6a3a")
      if s % 2 == 0 then L.set(b, x - 1, y, "#24552f"); L.set(b, x + 1, y, "#3b7a44") end
    end
  end
  L.outline(b, "#0b1d10")
  return b
end
add("fern0", fern(41), 7, 9); add("fern1", fern(43), 7, 9)
local function pebbles(seed)
  local b = L.new(10, 6)
  local r = L.rng(seed)
  for _ = 1, 4 do
    local x, y, w = math.floor(r() * 7), 1 + math.floor(r() * 3), 1 + math.floor(r() * 2)
    L.rect(b, x, y, w + 1, 2, STONE[4]); L.set(b, x, y, STONE[6]); L.set(b, x + w, y + 1, STONE[2])
  end
  return b
end
add("pebbles0", pebbles(61), 5, 4); add("pebbles1", pebbles(67), 5, 4)
local function mushroom(cap, cap2, glow)
  local b = L.new(9, 8)
  local function one(x, h)
    L.vline(b, x, 7 - h, 7, "#e8dcc0"); L.hline(b, x - 1, x + 1, 6 - h, cap); L.set(b, x, 5 - h, cap2); L.set(b, x - 1, 6 - h, cap2)
  end
  one(3, 2); one(6, 1)
  if glow then L.set(b, 3, 3, "#ffffff") end
  L.outline(b, "#120a08")
  return b
end
add("shroom_r", mushroom("#b8443a", "#f0a088"), 4, 8)
add("shroom_b", mushroom("#3f86b0", "#9fe0ff", true), 4, 8)
-- 이끼 낀 고대 돌길의 판석
local function pathStone(w, h, seed)
  local b = L.new(w + 2, h + 2)
  local r = L.rng(seed)
  local pts = {}
  for k = 0, 7 do
    local a = k / 8 * math.pi * 2
    pts[#pts + 1] = { 1 + w / 2 + math.cos(a) * (w / 2) * (0.82 + r() * 0.18), 1 + h / 2 + math.sin(a) * (h / 2) * (0.8 + r() * 0.2) }
  end
  L.shadePoly(b, pts, { STONE[2], STONE[3], STONE[4], STONE[4], STONE[5] }, 0.0)
  for _ = 1, math.floor(w * h / 10) do   -- 이끼 얼룩과 금
    local x, y = math.floor(1 + r() * w), math.floor(1 + r() * h)
    if L.get(b, x, y) then L.set(b, x, y, r() < 0.55 and MOSS[3] or STONE[2]) end
  end
  for x = 0, w + 1 do for y = 0, h + 1 do   -- 윗면 가장자리 밝게
    if L.get(b, x, y) and not L.get(b, x, y - 1) then L.set(b, x, y, STONE[6]) end
  end end
  L.innerEdge(b, 0.35, true)
  return b
end
add("stone0", pathStone(10, 6, 81), 6, 4); add("stone1", pathStone(12, 7, 83), 7, 5); add("stone2", pathStone(8, 5, 87), 5, 4); add("stone3", pathStone(14, 8, 89), 8, 5)
local function leaves(seed)
  local b = L.new(10, 6)
  local r = L.rng(seed)
  for _ = 1, 5 do local x, y = math.floor(r() * 9), math.floor(r() * 5); L.set(b, x, y, r() < 0.5 and "#8a6a2a" or "#6a4a22"); L.set(b, x + 1, y, "#a8843a") end
  return b
end
add("leaves0", leaves(91), 5, 3)

-- ----------------------------------------------------------- 뒤틀린 고목
local function tree(W, H, scale, seed, leafRamp)
  local b = L.new(W, H)
  local r = L.rng(seed)
  local fx, fy = math.floor(W / 2), H - 3
  local tw = math.max(4, math.floor(7 * scale))
  local th = math.floor(20 * scale)
  local twist = (r() - 0.5) * 4
  -- 뿌리
  for k = -2, 2 do
    if k ~= 0 then
      local ex = fx + k * (3 + r() * 2) * scale
      L.line(b, fx + k, fy - 3, ex, fy + 1, BARK[3]); L.line(b, fx + k, fy - 2, ex + (k > 0 and 1 or -1), fy + 1, BARK[2])
    end
  end
  -- 줄기(아래가 넓고 위로 가며 비틀린다)
  local pts = { { fx - tw / 2 - 1, fy + 1 }, { fx + tw / 2 + 1, fy + 1 }, { fx + tw * 0.32 + twist, fy - th }, { fx - tw * 0.32 + twist, fy - th } }
  L.shadePoly(b, pts, BARK, 0.02)
  for k = 0, 2 do   -- 껍질 결
    local x = fx - tw / 2 + 1 + k * (tw / 3)
    L.line(b, x, fy - 1, x + twist * 0.8, fy - th + 3, BARK[2])
  end
  L.set(b, fx - 1, fy - math.floor(th * 0.45), BARK[1]); L.set(b, fx, fy - math.floor(th * 0.45), BARK[2])   -- 옹이
  -- 가지
  local topX, topY = fx + twist, fy - th
  L.line(b, topX, topY + 2, topX - 9 * scale, topY - 6 * scale, BARK[3])
  L.line(b, topX, topY + 1, topX + 8 * scale, topY - 7 * scale, BARK[3])
  -- 수관: 아래(어두운) 잎 덩이부터 위로
  local cyc = topY - 9 * scale
  local lobes = {
    { -11, 5, 10.5, 8.5, -0.08 }, { 11, 4, 10, 8, -0.08 }, { 0, 7, 11, 7, -0.12 },
    { -7, -4, 11, 9.5, 0.0 }, { 8, -5, 10.5, 9, 0.0 }, { 0, -10, 11.5, 9.5, 0.06 }
  }
  for _, l in ipairs(lobes) do
    L.shadeEllipse(b, topX + l[1] * scale, cyc + l[2] * scale, l[3] * scale, l[4] * scale, { leafRamp[1], leafRamp[2], leafRamp[3], leafRamp[4], leafRamp[5], leafRamp[6] }, l[5])
  end
  -- 잎 결: 잎 뭉치(작은 그늘 + 하이라이트 점)
  for _ = 1, math.floor(110 * scale * scale) do
    local x, y = math.floor(topX + (r() - 0.5) * 44 * scale), math.floor(cyc + (r() - 0.6) * 34 * scale)
    local c = L.get(b, x, y)
    if c and c ~= BARK[3] then
      local up = (y < cyc - 2) and (x < topX + 4)
      L.set(b, x, y, up and leafRamp[6] or leafRamp[2])
      if up and r() < 0.4 then L.set(b, x + 1, y, leafRamp[5]) end
      if not up and r() < 0.5 then L.set(b, x, y + 1, leafRamp[1]) end
    end
  end
  -- 달빛 가장자리(왼쪽 위 테두리)
  local rim = {}
  for y = 0, H - 1 do for x = 0, W - 1 do
    local c = L.get(b, x, y)
    if c and y < fy - th + 4 and not L.get(b, x - 1, y - 1) and (not L.get(b, x, y - 1) or not L.get(b, x - 1, y)) and x < topX + 6 then rim[#rim + 1] = { x, y } end
  end end
  for _, p in ipairs(rim) do L.set(b, p[1], p[2], leafRamp[7]) end
  -- 늘어진 이끼 몇 가닥
  for _ = 1, 4 do
    local x = math.floor(topX + (r() - 0.5) * 30 * scale)
    local y0
    for y = H - 1, 0, -1 do if L.get(b, x, y) and y < fy - th + 2 then y0 = y; break end end
    if y0 then for k = 1, 2 + math.floor(r() * 3) do if not L.get(b, x, y0 + k) then L.set(b, x, y0 + k, "#6a9a7a") end end end
  end
  L.outline(b, OL)
  return b, fx, fy
end
for i, spec in ipairs({ { "tree_s0", 48, 52, 0.84, 301, LEAF }, { "tree_s1", 48, 52, 0.84, 307, LEAF2 }, { "tree_m0", 56, 60, 1.0, 311, LEAF }, { "tree_m1", 56, 60, 1.0, 313, LEAF2 }, { "tree_l0", 64, 68, 1.18, 317, LEAF }, { "tree_l1", 64, 68, 1.18, 331, LEAF2 } }) do
  local b, fx, fy = tree(spec[2], spec[3], spec[4], spec[5], spec[6])
  add(spec[1], b, fx, fy)
end

-- ----------------------------------------------------------- 룬이 새겨진 이끼 바위
local function rock(W, H, seed, rune)
  local b = L.new(W, H)
  local r = L.rng(seed)
  local cx, base = W / 2, H - 2
  local pts = {}
  local n = 9
  for k = 0, n - 1 do
    local a = math.pi + k / (n - 1) * math.pi
    local rr = (0.78 + r() * 0.22)
    pts[#pts + 1] = { cx + math.cos(a) * (W / 2 - 1) * rr, base + math.sin(a) * (H - 4) * rr }
  end
  L.shadePoly(b, pts, STONE, -0.08)
  -- 면 나누기(각진 느낌)
  L.line(b, cx - 2, base - (H - 4) * 0.8, cx + 1, base - 1, STONE[3])
  L.line(b, cx - W * 0.3, base - (H - 4) * 0.45, cx - 2, base - (H - 4) * 0.6, STONE[6])
  -- 이끼 모자
  for x = 0, W - 1 do
    for y = 0, H - 1 do
      if L.get(b, x, y) and not L.get(b, x, y - 1) and r() < 0.85 then
        L.set(b, x, y, MOSS[4]); if r() < 0.7 then L.set(b, x, y + 1, MOSS[3]) end
        if r() < 0.3 then L.set(b, x, y + 2, MOSS[2]) end
      end
    end
  end
  -- 고대 룬(희미한 청록)
  if rune then
    local gx, gy = math.floor(cx + 2), math.floor(base - (H - 4) * 0.45)
    L.vline(b, gx, gy - 2, gy + 2, TEAL[2]); L.set(b, gx - 1, gy - 1, TEAL[2]); L.set(b, gx + 1, gy + 1, TEAL[2]); L.set(b, gx, gy, TEAL[3])
  end
  L.innerEdge(b, 0.3, true)
  L.outline(b, OL)
  return b
end
add("rock0", rock(26, 17, 401, true), 13, 15)
add("rock1", rock(24, 15, 409, false), 12, 13)
add("rock2", rock(30, 19, 419, true), 15, 17)

-- ----------------------------------------------------------- 보물 상자(몸통 + 따로 도는 뚜껑)
do
  local b = L.new(18, 11)
  L.shadeCyl(b, 1, 1, 16, 9, WOOD, 0.02)
  for x = 1, 16 do L.set(b, x, 1, WOOD[4]) end
  L.vline(b, 3, 1, 9, GOLD[2]); L.vline(b, 14, 1, 9, GOLD[2]); L.hline(b, 1, 16, 4, GOLD[2]); L.hline(b, 1, 16, 4, GOLD[3])
  L.set(b, 3, 4, GOLD[4]); L.set(b, 14, 4, GOLD[4])
  for x = 5, 12, 3 do L.vline(b, x, 5, 9, WOOD[2]) end
  L.set(b, 8, 6, TEAL[2]); L.set(b, 9, 6, TEAL[3])   -- 잠든 룬
  L.outline(b, OL)
  add("chest_base", b, 9, 10)
  local lid = L.new(20, 8)
  L.poly(lid, { { 1, 6 }, { 2, 2 }, { 5, 1 }, { 14, 1 }, { 17, 2 }, { 18, 6 } }, function(x, y) return y <= 2 and WOOD[5] or (y <= 4 and WOOD[4] or WOOD[3]) end)
  L.hline(lid, 1, 18, 6, GOLD[2]); L.vline(lid, 4, 1, 6, GOLD[2]); L.vline(lid, 15, 1, 6, GOLD[2]); L.set(lid, 4, 2, GOLD[4]); L.set(lid, 15, 2, GOLD[4])
  L.rect(lid, 9, 4, 2, 3, GOLD[3]); L.set(lid, 9, 6, GOLD[4])   -- 자물쇠
  L.outline(lid, OL)
  add("chest_lid", lid, 10, 7)
  local inner = L.new(16, 4)
  L.rect(inner, 0, 0, 16, 4, "#1a0f08"); L.hline(inner, 2, 13, 1, "#4a6a8a")
  add("chest_inner", inner, 8, 2)
end

-- ----------------------------------------------------------- 연못의 수정(꺼짐 / 켜짐)
local function crystal(lit)
  local b = L.new(22, 36)
  local ramp = lit and { "#1f6f8c", "#2a8fb0", "#4cbfe0", "#8fe6ff", "#e8fbff" } or { "#122a36", "#1a3f50", "#24566a", "#3a7a92", "#6aa8be" }
  L.shadePoly(b, { { 11, 1 }, { 18, 15 }, { 15, 33 }, { 7, 33 }, { 4, 15 } }, ramp, 0.05)
  L.shadePoly(b, { { 4, 20 }, { 7, 13 }, { 8, 33 }, { 3, 33 } }, ramp, -0.05)
  L.shadePoly(b, { { 16, 22 }, { 19, 17 }, { 20, 33 }, { 15, 33 } }, ramp, -0.1)
  L.line(b, 11, 2, 11, 31, ramp[4]); L.line(b, 9, 8, 7, 18, ramp[5])
  L.set(b, 11, 1, ramp[5])
  for x = 2, 20 do if L.get(b, x, 33) then L.set(b, x, 34, "#3a4652") end end
  L.outline(b, OL)
  return b
end
add("crystal_off", crystal(false), 11, 34)
add("crystal_on", crystal(true), 11, 34)

-- ----------------------------------------------------------- 둘째 공터의 룬 석주
do
  local b = L.new(22, 44)
  L.shadeCyl(b, 3, 6, 16, 34, STONE, 0.04)
  L.shadeCyl(b, 2, 3, 18, 4, STONE, 0.14); L.hline(b, 2, 19, 3, STONE[7])
  L.shadeCyl(b, 2, 39, 18, 4, STONE, -0.05)
  for y = 10, 36, 7 do L.hline(b, 4, 17, y, STONE[2]) end   -- 돌 이음
  L.vline(b, 7, 14, 22, TEAL[2]); L.set(b, 8, 16, TEAL[3]); L.set(b, 6, 19, TEAL[2]); L.set(b, 8, 21, TEAL[2])   -- 룬
  L.vline(b, 13, 25, 31, TEAL[2]); L.set(b, 12, 27, TEAL[3]); L.set(b, 14, 29, TEAL[2])
  L.line(b, 15, 8, 13, 16, STONE[2])   -- 금
  for x = 3, 18 do if (x * 5) % 4 < 3 then L.set(b, x, 38, MOSS[3]); L.set(b, x, 37, MOSS[4]) end end
  for x = 2, 19 do if x % 3 == 0 then L.set(b, x, 4, MOSS[4]) end end
  L.outline(b, OL)
  add("pillar", b, 11, 42)
end

-- ----------------------------------------------------------- 가시덤불 문의 덩이
local function thornClump(seed)
  local b = L.new(28, 26)
  local r = L.rng(seed)
  local ramp = { "#121c10", "#1c2a17", "#26361f", "#33492a", "#456238" }
  L.shadeEllipse(b, 10, 16, 8, 7, ramp, 0.0); L.shadeEllipse(b, 18, 14, 8, 7.5, ramp, 0.02); L.shadeEllipse(b, 14, 9, 7, 6, ramp, 0.05)
  for _ = 1, 14 do   -- 가시
    local a = r() * math.pi * 2
    local x, y = 14 + math.cos(a) * 10, 14 + math.sin(a) * 9
    if y < 23 then L.line(b, x, y, x + math.cos(a) * 3, y + math.sin(a) * 3, "#7a3a2a"); L.set(b, x + math.cos(a) * 3, y + math.sin(a) * 3, "#c9524a") end
  end
  for _ = 1, 10 do local x, y = math.floor(4 + r() * 20), math.floor(4 + r() * 18); if L.get(b, x, y) then L.set(b, x, y, "#5a7a3a") end end
  L.set(b, 19, 9, "#ef6a5a"); L.set(b, 8, 13, "#ef6a5a")
  L.outline(b, OL)
  return b
end
add("thorn0", thornClump(501), 14, 23); add("thorn1", thornClump(509), 14, 23)

-- ----------------------------------------------------------- 덩굴 앵커(룬 그루터기)
do
  local b = L.new(18, 16)
  L.shadeCyl(b, 3, 5, 12, 9, BARK, 0.02)
  L.shadeEllipse(b, 9, 5, 6, 2.4, { BARK[4], BARK[5], BARK[6] }, 0.0)
  L.ellipse(b, 9, 5, 2.6, 1.1, BARK[3]); L.set(b, 9, 5, BARK[2])
  for x = 2, 15 do L.set(b, x, 9 + ((x % 4 < 2) and 0 or 1), VIOLET[1]) end
  for x = 2, 15 do L.set(b, x, 12 - ((x % 4 < 2) and 0 or 1), VIOLET[1]) end
  L.line(b, 1, 14, 4, 12, BARK[3]); L.line(b, 16, 14, 13, 12, BARK[3])
  L.outline(b, OL)
  add("stump", b, 9, 14)
end

-- ----------------------------------------------------------- 달의 돌(받침 위 결정)
local function moonstone(active)
  local b = L.new(18, 24)
  local ramp = active and { "#4a6fa8", "#6f9fd8", "#a9d4ff", "#d8eeff", "#ffffff" } or { "#2c4064", "#3d5a88", "#5a82b4", "#86acd8", "#c2dcf7" }
  L.shadePoly(b, { { 2, 22 }, { 4, 18 }, { 14, 18 }, { 16, 22 } }, { STONE[2], STONE[3], STONE[4], STONE[5] }, 0.05)
  L.hline(b, 4, 13, 18, STONE[6])
  L.shadePoly(b, { { 9, 1 }, { 15, 9 }, { 13, 18 }, { 5, 18 }, { 3, 9 } }, ramp, 0.06)
  L.line(b, 9, 2, 9, 17, ramp[4]); L.line(b, 7, 5, 5, 11, ramp[5])
  L.set(b, 9, 1, ramp[5])
  L.outline(b, OL)
  return b
end
add("moonstone_idle", moonstone(false), 9, 22)
add("moonstone_active", moonstone(true), 9, 22)

-- ----------------------------------------------------------- 바깥에서 보이는 마을 문(돌 아치 + 나무 문)
do
  local b = L.new(26, 30)
  L.shadeCyl(b, 1, 6, 5, 23, STONE, 0.02); L.shadeCyl(b, 20, 6, 5, 23, STONE, -0.02)
  L.poly(b, { { 1, 8 }, { 4, 3 }, { 9, 0 }, { 16, 0 }, { 21, 3 }, { 25, 8 }, { 20, 8 }, { 16, 5 }, { 9, 5 }, { 6, 8 } }, function(x, y) return y < 2 and STONE[6] or STONE[4] end)
  L.rect(b, 6, 8, 14, 21, WOOD[3])
  for x = 6, 19, 3 do L.vline(b, x, 8, 28, WOOD[2]) end
  L.hline(b, 6, 19, 12, GOLD[2]); L.hline(b, 6, 19, 23, GOLD[2])
  L.set(b, 16, 18, GOLD[4]); L.set(b, 16, 19, GOLD[3])
  L.set(b, 12, 2, TEAL[3])
  L.outline(b, OL)
  add("door", b, 13, 29)
end

-- ----------------------------------------------------------- 바깥 자원 지점(통나무 / 광석 / 약초)
do
  local b = L.new(22, 14)
  local function log(x, y)
    L.shadeCyl(b, x, y, 14, 4, WOOD, 0.0); L.hline(b, x, x + 13, y, WOOD[4])
    L.shadeEllipse(b, x + 14, y + 2, 2, 2.2, { "#a8784a", "#c8975a", "#e0b880" }, 0.0); L.set(b, x + 14, y + 2, "#8a5f2f")
  end
  log(1, 8); log(6, 8); log(3, 3)
  L.outline(b, OL); add("node_wood", b, 11, 12)
  local o = L.new(22, 16)
  L.shadePoly(o, { { 1, 14 }, { 4, 6 }, { 10, 2 }, { 17, 5 }, { 21, 14 } }, STONE, 0.05)
  for _, p in ipairs({ { 12, 7 }, { 7, 10 }, { 15, 11 }, { 10, 12 } }) do L.set(o, p[1], p[2], GOLD[3]); L.set(o, p[1] + 1, p[2], GOLD[2]); L.set(o, p[1], p[2] - 1, GOLD[4]) end
  for x = 3, 18 do if L.get(o, x, 14) then L.set(o, x, 14, MOSS[3]) end end
  L.outline(o, OL); add("node_ore", o, 11, 14)
  local h = L.new(18, 16)
  for k = -3, 3 do L.line(h, 9 + k * 2, 15, 9 + k * 2.6, 6 + math.abs(k) * 1.5, k % 2 == 0 and "#3da35a" or "#2f8a4a") end
  L.set(h, 9, 3, "#9ff0d0"); L.set(h, 8, 4, "#9ff0d0"); L.set(h, 10, 4, "#c8fff0")
  L.set(h, 4, 6, "#c9a6ff"); L.set(h, 14, 6, "#c9a6ff")
  L.outline(h, OL); add("node_herb", h, 9, 15)
end

local sheet, placed = L.atlas(items, 256, 1)
L.saveAtlas(OUT .. "/world.aseprite", OUT .. "/world.png", sheet, placed)
local m = { items = {} }
for _, it in ipairs(placed) do m.items[it.name] = { it.x, it.y, it.buf.w, it.buf.h, it.ax, it.ay } end
L.writeFile(OUT .. "/world.json", L.json(m))
print("world: " .. #placed .. " items, sheet " .. sheet.w .. "x" .. sheet.h .. "; tiles: " .. #tiles)
