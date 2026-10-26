-- ==========================================================================
-- title.lua — 『SOUL TEMPEST : LEGEND OF THE HUNTER』 타이틀 아트(v79 — 엘든 링풍 황금 고리를 버리고 고유 문장으로)
--   엠블럼  「영혼의 폭풍과 흑철 대검(The Soul Tempest Crest)」 176×176: 휘몰아치는 청록/은백 칼바람 소용돌이 · 영혼의 날개(칼깃) ·
--           그 한가운데를 가르는 사냥꾼의 흑철 룬 대검
--   로고    SOUL TEMPEST — 손으로 짠 세리프 대문자, 차가운 강철의 백은색(#eef6ff → #8aa4c8 → #2a3650) 금속 그라데이션 + 균열
--   부제    LEGEND OF THE HUNTER — 작은 세리프 대문자(은백)
--   장식선  가운데 청록 영혼빛 → 양끝 은백 다이아몬드
--   팔레트  백은(Platinum Silver #eef6ff ~ #8aa4c8) · 영혼의 청록(Soul Cyan #4deeea) · 심연의 남색(#060913)
--   aseprite -b --script-param dir=<이 폴더> --script-param out=<assets/sprites> --script title.lua
-- 시트: 엠블럼(위) / 로고 / 부제 / 장식선 을 세로로 쌓는다 — 어느 조각도 오른쪽에 이웃이 없어 잘라 쓸 때 옆 그림이 비칠 수 없다.
-- ==========================================================================
local DIR = app.params.dir
local OUT = app.params.out
package.path = DIR .. "/?.lua;" .. package.path
local L = require("lib")

local OL = "#060913"
local rnd = L.rng(7801)

-- ==========================================================================
-- 1) 엠블럼 176×176 — 「영혼의 폭풍과 흑철 대검 (The Soul Tempest Crest)」
--    휘몰아치는 청록/은백 칼바람 소용돌이(끝이 칼날처럼 가늘어지는 나선 팔) · 좌우로 펼친 영혼의 날개(칼깃) ·
--    그 한가운데를 위에서 아래로 가르는 사냥꾼의 흑철 룬 대검(청록 룬이 빛난다)
-- ==========================================================================
local EW, EH = 176, 176
local cx, cy = 88, 86
local SILVER = { "#2a3650", "#3a4a66", "#5a6e90", "#8aa4c8", "#a8bcd8", "#c8d6ea", "#eef6ff", "#ffffff" }
local CYAN = { "#0a2a36", "#0e4a5a", "#168a96", "#2cc6cc", "#4deeea", "#b8fffb" }
local IRON = { "#0a0e18", "#141b2a", "#1e2840", "#2c3a58", "#44567c", "#6a80a8", "#9ab0d0" }
-- 은은한 청록 후광(맨 아래 층)
local glow = L.new(EW, EH)
L.each(glow, 0, 0, EW - 1, EH - 1, function(x, y)
  local d = math.sqrt((x + 0.5 - cx) ^ 2 + (y + 0.5 - cy) ^ 2)
  if d < 86 then local a = math.floor(52 * (1 - d / 86) ^ 1.7); if a > 2 then return L.alpha("#2cc6cc", a) end end
  return nil
end)
-- 칼바람 소용돌이: 다섯 갈래 나선 팔. 안쪽은 굵은 청록, 바깥으로 갈수록 은백의 가는 칼날 끝
local vortex = L.new(EW, EH)
local ARMS = 5
L.each(vortex, 0, 0, EW - 1, EH - 1, function(x, y)
  local dx, dy = x + 0.5 - cx, (y + 0.5 - cy) * 1.06
  local r = math.sqrt(dx * dx + dy * dy)
  if r < 16 or r > 84 then return nil end
  local a = math.atan(dy, dx)
  local ph = (a / (math.pi * 2) * ARMS + r * 0.034) % 1          -- 나선 위상
  local t = (r - 16) / 68                                         -- 0 안쪽 → 1 바깥
  local w = 0.30 * (1 - t) ^ 1.25 + 0.025                          -- 바깥으로 갈수록 가늘어지는 칼날
  if ph < w then
    local edge = ph < 0.035 or ph > w - 0.03
    if t > 0.72 then return edge and SILVER[8] or SILVER[6] end
    if t > 0.45 then return edge and SILVER[7] or (ph < w * 0.5 and CYAN[5] or SILVER[5]) end
    return edge and CYAN[6] or (ph < w * 0.5 and CYAN[4] or CYAN[3])
  end
  -- 팔 사이의 옅은 바람결(반투명)
  if ph < w + 0.06 and t < 0.8 then return L.alpha(CYAN[4], math.floor(90 * (1 - t))) end
  return nil
end)
-- 바깥으로 튀어 나가는 칼바람 조각(초승달 칼날 6개)
for k = 0, 5 do
  local a0 = k / 6 * math.pi * 2 + 0.3
  for s = 0, 26 do
    local tt = s / 26
    local a = a0 + tt * 0.55
    local r = 70 + tt * 14
    local th = math.max(0, 2.2 * (1 - tt))
    for q = 0, math.floor(th) do
      local x, y = math.floor(cx + math.cos(a) * (r - q)), math.floor(cy + math.sin(a) * (r - q) / 1.06)
      if x >= 0 and y >= 0 and x < EW and y < EH then L.set(vortex, x, y, q == 0 and SILVER[8] or SILVER[6]) end
    end
  end
end
-- 영혼의 날개: 대검 양옆으로 칼깃 다섯 장씩(뿌리는 검 옆, 끝은 위·바깥으로 날카롭게)
local wings = L.new(EW, EH)
for side = -1, 1, 2 do
  for f = 0, 5 do
    local ang0 = math.rad(4 - f * 15)                           -- 깃마다 위로 젖혀진다(아래 깃은 수평 가까이)
    local len = 74 - f * 7
    local rootX, rootY = cx + side * 10, cy - 2 - f * 3
    for s = 0, len do
      local tt = s / len
      local bend = -math.sin(tt * math.pi * 0.5) * 0.30            -- 끝이 위로 휘어 오르는 칼깃
      local a = ang0 - bend
      local px = rootX + side * math.cos(a) * s
      local py = rootY + math.sin(a) * s
      local th = math.floor(2.8 * (1 - tt) ^ 0.7 + 0.5)          -- 끝으로 갈수록 가늘다
      for q = -th, th do
        local x, y = math.floor(px + 0.5), math.floor(py + q * 0.9 + 0.5)
        if x >= 0 and y >= 0 and x < EW and y < EH then
          local c = q <= -th + 0 and SILVER[8] or (q < 0 and SILVER[6] or (q < th and SILVER[4] or SILVER[2]))
          if tt > 0.8 then c = q <= 0 and CYAN[6] or CYAN[4] end   -- 깃 끝은 영혼빛
          L.set(wings, x, y, c)
        end
      end
    end
  end
end
L.outline(wings, "#060913")
-- 사냥꾼의 흑철 룬 대검(수직): 폼멜 y6 · 손잡이 y11~29 · 가드 y30~37 · 검신 y38~170(끝은 뾰족)
local sword = L.new(EW, EH)
local function half(y) local t = (y - 38) / (170 - 38); if t > 0.9 then return 7.6 * (1 - t) / 0.1 * 0.82 + 0.4 end; return 7.6 - t * 1.4 end
for y = 38, 170 do
  local hw = half(y)
  for x = math.floor(cx - hw), math.ceil(cx + hw) - 1 do
    local nx = (x + 0.5 - cx) / math.max(0.5, hw)
    local c
    if nx < -0.72 then c = IRON[7]          -- 왼쪽 날(빛)
    elseif nx < -0.3 then c = IRON[5]
    elseif nx < 0.3 then c = IRON[2]        -- 가운데 홈(룬이 새겨진 흑철)
    elseif nx < 0.72 then c = IRON[4]
    else c = IRON[3] end
    L.set(sword, x, y, c)
  end
end
-- 홈을 따라 빛나는 청록 룬(작은 획들)
for y = 46, 150, 9 do
  L.set(sword, cx - 1, y, CYAN[5]); L.set(sword, cx, y + 1, CYAN[6]); L.set(sword, cx - 1, y + 2, CYAN[4])
  if y % 18 == 10 then L.set(sword, cx, y + 3, CYAN[5]); L.set(sword, cx - 1, y + 4, CYAN[3]) end
end
-- 가드: 각진 은백 날개꼴 + 가운데 청록 영혼석
for i = 0, 22 do
  local w = i < 18 and 3 or 2
  local yy = 33 - math.floor(i / 6)
  L.rect(sword, cx - 4 - i, yy, 1, w + 1, i % 5 == 0 and SILVER[7] or SILVER[5])
  L.rect(sword, cx + 3 + i, yy, 1, w + 1, i % 5 == 0 and SILVER[6] or SILVER[4])
end
L.rect(sword, cx - 4, 30, 8, 8, SILVER[3]); L.rect(sword, cx - 3, 31, 6, 6, CYAN[3]); L.rect(sword, cx - 2, 32, 3, 3, CYAN[5]); L.set(sword, cx - 2, 32, CYAN[6])
-- 손잡이 + 폼멜(청록 보석)
for y = 11, 29 do L.rect(sword, cx - 2, y, 4, 1, (y % 3 == 0) and IRON[3] or IRON[2]) end
L.vline(sword, cx - 2, 11, 29, IRON[5])
L.ellipse(sword, cx, 7, 4, 4, SILVER[4]); L.ellipse(sword, cx, 7, 2, 2, CYAN[4]); L.set(sword, cx - 1, 6, CYAN[6])
L.outline(sword, "#060913")
-- 영혼 입자(청록 · 은백)
local motes = L.new(EW, EH)
for i = 1, 60 do
  local a, r = rnd() * math.pi * 2, 14 + rnd() * 70
  local x, y = math.floor(cx + math.cos(a) * r), math.floor(cy + math.sin(a) * r)
  L.set(motes, x, y, rnd() < 0.6 and CYAN[5 + math.floor(rnd() * 2)] or SILVER[7])
end
local emblem = L.new(EW, EH)
L.blit(emblem, glow, 0, 0); L.blit(emblem, vortex, 0, 0); L.blit(emblem, motes, 0, 0); L.blit(emblem, wings, 0, 0); L.blit(emblem, sword, 0, 0)
local ring, wisp = vortex, wings   -- 저장 층 이름 호환

-- ==========================================================================
-- 2) 로고 SOUL TEMPEST — 세리프 대문자(높이 26, 세로획 4 · 가로획 2)
-- ==========================================================================
local GH = 32   -- 글자 칸 높이(위 2, 아래 4 여백)
local TOP, BOT = 2, 27
local function glyph(w, fn)
  local m = {}
  local function put(x, y) if x >= 0 and x < w and y >= 0 and y < GH then m[y * w + x] = true end end
  local P = {
    rect = function(x, y, rw, rh) for yy = y, y + rh - 1 do for xx = x, x + rw - 1 do put(xx, yy) end end end,
    ring = function(ecx, ecy, ax, ay, tx, ty, keep)
      for yy = 0, GH - 1 do for xx = 0, w - 1 do
        local px, py = xx + 0.5 - ecx, yy + 0.5 - ecy
        local o = (px / ax) ^ 2 + (py / ay) ^ 2
        local i = (px / math.max(0.5, ax - tx)) ^ 2 + (py / math.max(0.5, ay - ty)) ^ 2
        if o <= 1 and i > 1 and (not keep or keep(xx + 0.5, yy + 0.5)) then put(xx, yy) end
      end end
    end,
    line = function(x0, y0, x1, y1, th)
      local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0))
      for k = 0, n do local t = n == 0 and 0 or k / n; local x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t; for d = 0, th - 1 do put(math.floor(x + d), math.floor(y)) end end
    end
  }
  fn(P)
  return { w = w, m = m }
end
local G = {}
G.S = glyph(17, function(P)
  P.ring(8.5, 8.6, 7.6, 6.6, 3.6, 2.1, function(x, y) return y < 8.6 or x < 8.5 end)
  P.ring(8.5, 20.4, 8.0, 6.6, 3.6, 2.1, function(x, y) return y > 20.4 or x > 8.5 end)
  P.rect(14, 4, 2, 6)   -- 위 오른쪽 끝 삐침
  P.rect(1, 19, 2, 6)   -- 아래 왼쪽 끝 삐침
end)
G.O = glyph(19, function(P) P.ring(9.5, 14.5, 9.0, 12.6, 4.0, 2.1) end)
G.U = glyph(19, function(P)
  P.rect(1, TOP, 4, 16); P.rect(15, TOP, 2, 16)
  P.ring(9.0, 16.0, 8.0, 11.0, 4.0, 2.1, function(x, y) return y > 16 end)
  P.rect(0, TOP, 7, 2); P.rect(13, TOP, 6, 2)
end)
G.L = glyph(15, function(P)
  P.rect(2, TOP, 4, 26); P.rect(2, 25, 12, 3); P.rect(0, TOP, 8, 2); P.rect(0, 26, 3, 2); P.rect(13, 20, 2, 8)
end)
G.T = glyph(19, function(P)
  P.rect(0, TOP, 19, 3); P.rect(0, TOP, 2, 6); P.rect(17, TOP, 2, 6); P.rect(8, TOP, 4, 26); P.rect(5, 26, 10, 2)
end)
G.E = glyph(16, function(P)
  P.rect(2, TOP, 4, 26); P.rect(2, TOP, 13, 3); P.rect(14, TOP, 2, 6)
  P.rect(2, 13, 10, 2); P.rect(11, 11, 2, 6)
  P.rect(2, 25, 14, 3); P.rect(14, 20, 2, 8)
  P.rect(0, TOP, 3, 2); P.rect(0, 26, 3, 2)
end)
G.M = glyph(25, function(P)
  P.rect(2, TOP, 2, 26); P.rect(19, TOP, 4, 26)
  P.line(2, TOP, 11, 26, 4); P.line(12, 26, 20, TOP, 2)
  P.rect(0, 26, 6, 2); P.rect(17, 26, 8, 2); P.rect(0, TOP, 4, 2); P.rect(21, TOP, 4, 2)
end)
G.P = glyph(17, function(P)
  P.rect(2, TOP, 4, 26)
  P.ring(8.0, 9.0, 8.4, 7.0, 4.0, 2.1, function(x, y) return x > 5 end)
  P.rect(0, 26, 9, 2); P.rect(0, TOP, 3, 2)
end)

local WORD = "SOUL TEMPEST"
local GAP, SPACE = 3, 10
local LW = 4
for i = 1, #WORD do local ch = WORD:sub(i, i); if ch == " " then LW = LW + SPACE else LW = LW + G[ch].w + (i < #WORD and GAP or 0) end end
LW = LW + 4
local LH = GH + 2
local mask = L.new(LW, LH)
local x0 = 2
for i = 1, #WORD do
  local ch = WORD:sub(i, i)
  if ch == " " then x0 = x0 + SPACE
  else
    local g = G[ch]
    for k in pairs(g.m) do local gx, gy = k % g.w, math.floor(k / g.w); L.set(mask, x0 + gx, gy + 1, "#ffffff") end
    x0 = x0 + g.w + GAP
  end
end
-- 금속 그라데이션(위 백은 → 아래 강철 남색) + 윗면 광택 / 아랫면 그늘
local GRAD = { { 0.0, "#ffffff" }, { 0.14, "#eef6ff" }, { 0.34, "#c8d6ea" }, { 0.52, "#a8bcd8" }, { 0.70, "#8aa4c8" }, { 0.86, "#5a6e90" }, { 1.0, "#2a3650" } }   -- 차가운 강철의 백은색
local function gradAt(t)
  for i = 1, #GRAD - 1 do if t <= GRAD[i + 1][1] then local a, b = GRAD[i], GRAD[i + 1]; return L.mix(a[2], b[2], (t - a[1]) / (b[1] - a[1])) end end
  return GRAD[#GRAD][2]
end
local logo = L.new(LW, LH)
for y = 0, LH - 1 do for x = 0, LW - 1 do
  if L.get(mask, x, y) then
    local t = math.max(0, math.min(1, (y - 1 - TOP) / (BOT - TOP)))
    local c = gradAt(t)
    if not L.get(mask, x, y - 1) then c = "#b8fffb" end                -- 윗면 광택
    if not L.get(mask, x, y + 1) then c = "#141b2a" end                -- 아랫면 그늘
    if L.get(mask, x - 1, y) == nil and t > 0.3 then c = L.mix(c, "#141b2a", 0.35) end   -- 왼쪽 그늘(입체)
    L.set(logo, x, y, c)
  end
end end
-- 세월의 균열: 글자 안쪽에만 짧은 실금
for i = 1, 22 do
  local x, y = math.floor(4 + rnd() * (LW - 8)), math.floor(6 + rnd() * 20)
  local dx, dy = (rnd() < 0.5) and 1 or -1, 1
  for k = 0, 2 + math.floor(rnd() * 3) do
    local px, py = x + dx * math.floor(k / 2), y + dy * k
    if L.get(mask, px, py) and L.get(mask, px - 1, py) and L.get(mask, px + 1, py) then L.set(logo, px, py, "#1e2840") end
  end
end
-- 바깥 윤곽 + 아래 오른쪽 그림자
local shadow = L.new(LW, LH)
for y = 0, LH - 1 do for x = 0, LW - 1 do if L.get(mask, x, y) then L.set(shadow, x + 1, y + 2, "#000000") end end end
L.outline(logo, OL)
local logoFull = L.new(LW, LH)
L.blit(logoFull, shadow, 0, 0); L.blit(logoFull, logo, 0, 0)

-- ==========================================================================
-- 3) 부제 LEGEND OF THE HUNTER — 5×7 작은 세리프 대문자
-- ==========================================================================
local SMALL = {
  L = { "11100", "01000", "01000", "01000", "01000", "01001", "11111" },
  E = { "11111", "01001", "01010", "01110", "01010", "01001", "11111" },
  G = { "01110", "10001", "10000", "10011", "10001", "10001", "01111" },
  N = { "10001", "11001", "10101", "10101", "10011", "10001", "10001" },
  D = { "11110", "01001", "01001", "01001", "01001", "01001", "11110" },
  O = { "01110", "10001", "10001", "10001", "10001", "10001", "01110" },
  F = { "11111", "01001", "01010", "01110", "01010", "01000", "11100" },
  T = { "11111", "10101", "00100", "00100", "00100", "00100", "01110" },
  H = { "11011", "01010", "01010", "01110", "01010", "01010", "11011" },
  U = { "11011", "10001", "10001", "10001", "10001", "10001", "01110" },
  R = { "11110", "01001", "01001", "01110", "01010", "01001", "11001" }
}
local SUB = "LEGEND OF THE HUNTER"
local SW = 2
for i = 1, #SUB do local ch = SUB:sub(i, i); SW = SW + (ch == " " and 5 or (#SMALL[ch][1] + 2)) end
SW = SW + 1
local SH = 10
local sub = L.new(SW, SH)
local sx = 1
for i = 1, #SUB do
  local ch = SUB:sub(i, i)
  if ch == " " then sx = sx + 5 else
    local rows = SMALL[ch]
    for ry, row in ipairs(rows) do for rx = 1, #row do if row:sub(rx, rx) == "1" then L.set(sub, sx + rx - 1, ry, ry <= 2 and "#eef6ff" or (ry <= 5 and "#a8bcd8" or "#6a80a8")) end end end
    sx = sx + #rows[1] + 2
  end
end
L.outline(sub, OL)

-- ==========================================================================
-- 4) 장식선: 가운데 청록 영혼빛이 양끝 은백으로 가늘어지며, 끝과 가운데에 다이아몬드
-- ==========================================================================
local DW, DH = 232, 9
local div = L.new(DW, DH)
local my = 4
for x = 6, DW - 7 do
  local t = math.abs(x - DW / 2) / (DW / 2 - 6)
  local c = t < 0.3 and "#4deeea" or (t < 0.7 and "#a8bcd8" or "#5a6e90")
  L.set(div, x, my, c)
  if t < 0.55 then L.set(div, x, my + 1, L.alpha("#0e4a5a", math.floor(200 * (1 - t)))) end
end
local function diamond(x, s, c1, c2) for k = -s, s do local h = s - math.abs(k); for j = -h, h do L.set(div, x + k, my + j, (j == 0 or math.abs(k) == s - math.abs(j)) and c1 or c2) end end end
diamond(3, 3, "#eef6ff", "#5a6e90"); diamond(DW - 4, 3, "#eef6ff", "#5a6e90"); diamond(math.floor(DW / 2), 4, "#b8fffb", "#2cc6cc")
L.set(div, math.floor(DW / 2), my, "#ffffff")

-- ==========================================================================
-- 저장: 세로로 쌓는다(엠블럼 / 로고 / 부제 / 장식선)
-- ==========================================================================
local W = math.max(EW, LW, SW, DW)
local yL = EH + 8
local yS = yL + LH + 6
local yD = yS + SH + 6
local H = yD + DH
local sheet = L.new(W, H)
L.blit(sheet, emblem, 0, 0); L.blit(sheet, logoFull, 0, yL); L.blit(sheet, sub, 0, yS); L.blit(sheet, div, 0, yD)
do
  local spr = Sprite(W, H, ColorMode.RGB)
  local function layer(name, buf, ox, oy, first)
    local lay = first and spr.layers[1] or spr:newLayer(); lay.name = name
    local full = L.new(W, H); L.blit(full, buf, ox, oy); spr:newCel(lay, spr.frames[1], L.toImage(full), Point(0, 0))
  end
  layer("soul-glow", glow, 0, 0, true); layer("wind-vortex", vortex, 0, 0); layer("soul-motes", motes, 0, 0); layer("soul-wings", wings, 0, 0); layer("hunter-rune-greatsword", sword, 0, 0)
  layer("logo", logoFull, 0, yL); layer("subtitle", sub, 0, yS); layer("divider", div, 0, yD)
  local function slice(n, x, y, w, h) local s = spr:newSlice(Rectangle(x, y, w, h)); s.name = n end
  slice("emblem", 0, 0, EW, EH); slice("logo", 0, yL, LW, LH); slice("subtitle", 0, yS, SW, SH); slice("divider", 0, yD, DW, DH)
  spr:saveAs(OUT .. "/title.aseprite")
  spr:close()
end
L.savePNG(OUT .. "/title.png", sheet)
L.writeFile(OUT .. "/title.json", L.json({ items = {
  emblem = { 0, 0, EW, EH, EW / 2, cy }, logo = { 0, yL, LW, LH, math.floor(LW / 2), math.floor(LH / 2) },
  subtitle = { 0, yS, SW, SH, math.floor(SW / 2), 5 }, divider = { 0, yD, DW, DH, DW / 2, 4 } }, w = W, h = H }))
print("title: emblem " .. EW .. "x" .. EH .. ", logo " .. LW .. "x" .. LH .. ", subtitle " .. SW .. "x" .. SH .. ", divider " .. DW .. "x" .. DH)
