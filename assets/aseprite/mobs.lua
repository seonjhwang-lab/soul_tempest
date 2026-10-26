-- ==========================================================================
-- mobs.lua — 모슬링 / 보스 1·2·3 / 생존자 일꾼
--   aseprite -b --script-param dir=<이 폴더> --script-param out=<assets/sprites> --script mobs.lua
-- 결과: mobs.aseprite(슬라이스마다 기준점 = 발 가운데), mobs.png, mobs.json { items: { 이름: [x, y, w, h, ax, ay] } }
-- 눈빛/핵/가시처럼 상태에 따라 깜빡이는 부분은 게임 코드가 그 위에 그린다(그래서 눈 자리는 어둡게 비워 둔다).
-- ==========================================================================
local DIR = app.params.dir
local OUT = app.params.out
package.path = DIR .. "/?.lua;" .. package.path
local L = require("lib")

local OL = "#0a120c"
local MOSS = { "#14301c", "#1d4427", "#285c33", "#367a40", "#4f9a4c", "#7cc062" }
local BARK = { "#1f1510", "#33241a", "#4a3624", "#664c33", "#866848" }
local STONE = { "#1f242c", "#323a45", "#4a5462", "#66727f", "#8995a2", "#b4bfcb" }
local THORN = { "#1a2414", "#26361f", "#34502a", "#4a6e36", "#679048" }
local RED = { "#5a1e1c", "#8e2f2a", "#c9524a", "#ef8a70" }
local TEAL = { "#1d5a66", "#2f8fa0", "#5fd8f0", "#c8fbff" }
local SHROOM = { "#6a2a2a", "#a8443a", "#d8735a", "#f2c9a0" }

local items = {}
local function add(name, buf, ax, ay) items[#items + 1] = { name = name, buf = buf, ax = ax, ay = ay } end

-- ----------------------------------------------------------- 모슬링(작은 이끼 덩이) 24×20, 발 = (12, 18)
local function mossling(sx, sy, lean, crouch)
  local b = L.new(24, 20)
  local cx, base = 12 + (lean or 0), 18
  local rx, ry = 6.2 * sx, 5.4 * sy
  local cy = base - ry
  -- 그루터기 발 두 개
  L.rect(b, 8, base - 1, 3, 2, BARK[3]); L.rect(b, 13, base - 1, 3, 2, BARK[2])
  L.set(b, 8, base - 1, BARK[4])
  -- 몸통(이끼 덩이) + 아랫배 그늘
  L.shadeEllipse(b, cx, cy, rx, ry, MOSS, 0.04)
  L.shadeEllipse(b, cx + 0.5, cy + ry * 0.55, rx * 0.8, ry * 0.4, { MOSS[1], MOSS[2], MOSS[2] }, -0.1)
  -- 이끼 결(잔털) — 가장자리 위쪽에 밝은 점
  for a = 0, 6 do
    local t = math.pi * (1.05 + a * 0.13)
    L.set(b, math.floor(cx + math.cos(t) * (rx - 0.6)), math.floor(cy + math.sin(t) * (ry - 0.6)), MOSS[6])
  end
  -- 얼굴 띠(눈 자리를 어둡게 — 게임이 그 위에 빛나는 눈을 그린다)
  local ey = base - 6
  L.hline(b, math.floor(cx - 3), math.floor(cx + 3), ey, MOSS[1])
  L.hline(b, math.floor(cx - 2), math.floor(cx + 2), ey + 1, MOSS[2])
  -- 잔가지 뿔 두 개와 새싹 잎
  local top = math.floor(cy - ry)
  L.line(b, cx - 3, top + 2, cx - 5, top - 2, BARK[3]); L.set(b, cx - 6, top - 3, BARK[4]); L.set(b, cx - 5, top - 3, BARK[2])
  L.line(b, cx + 3, top + 2, cx + 5, top - 1, BARK[3]); L.set(b, cx + 6, top - 2, BARK[4])
  L.set(b, cx, top, MOSS[5]); L.set(b, cx - 1, top - 1, MOSS[6]); L.set(b, cx + 1, top - 1, MOSS[4]); L.set(b, cx + 1, top - 2, MOSS[6])
  -- 작은 버섯
  L.set(b, cx + 4, cy + 1, SHROOM[2]); L.set(b, cx + 5, cy + 1, SHROOM[3]); L.set(b, cx + 4, cy + 2, SHROOM[4])
  if crouch then L.set(b, cx - 5, base - 2, MOSS[1]) end
  L.outline(b, OL)
  return b
end
add("moss_idle0", mossling(1, 1, 0), 12, 18)
add("moss_idle1", mossling(1.04, 0.95, 0), 12, 18)
add("moss_hop0", mossling(1.08, 0.9, 0), 12, 18)
add("moss_hop1", mossling(0.94, 1.1, 0), 12, 18)
add("moss_hop2", mossling(0.96, 1.06, 0), 12, 18)
add("moss_hop3", mossling(1.06, 0.92, 0), 12, 18)
add("moss_windup", mossling(1.12, 0.82, 0, true), 12, 18)
add("moss_lunge", mossling(0.9, 1.12, 0), 12, 18)

-- ----------------------------------------------------------- 보스 1: 늙은 모슬링(나무껍질 갑피 + 가지 뿔) 56×50, 발 = (28, 47)
local function elder(sy)
  local b = L.new(56, 50)
  local base, cx = 47, 28
  local ry = 15 * sy
  local cy = base - ry
  -- 굵은 뿌리발
  for _, x in ipairs({ 16, 24, 31, 38 }) do L.rect(b, x, base - 3, 4, 4, BARK[3]); L.set(b, x, base - 3, BARK[4]); L.hline(b, x - 1, x + 4, base, BARK[1]) end
  -- 몸통 덩이(세 덩이)
  L.shadeEllipse(b, cx - 9, cy + 4, 11, 10 * sy, MOSS, 0.0)
  L.shadeEllipse(b, cx + 9, cy + 5, 10.5, 9.5 * sy, MOSS, -0.04)
  L.shadeEllipse(b, cx, cy - 1, 14, 13 * sy, MOSS, 0.04)
  -- 나무껍질 갑피(등판) — 판 세 장과 이음매
  local plates = { { cx - 8, cy - 6, 6, 5 }, { cx + 1, cy - 9, 6.5, 5 }, { cx + 9, cy - 3, 5, 4.5 } }
  for _, p in ipairs(plates) do
    L.shadeEllipse(b, p[1], p[2], p[3], p[4], BARK, 0.08)
    L.hline(b, math.floor(p[1] - p[3] + 2), math.floor(p[1] + p[3] - 2), math.floor(p[2]), BARK[2])
    L.set(b, math.floor(p[1] - p[3] / 2), math.floor(p[2] - p[4] / 2), BARK[5])
  end
  -- 이끼 결
  local r = L.rng(7)
  for _ = 1, 40 do
    local a, d = r() * math.pi * 2, 0.55 + r() * 0.4
    local x, y = math.floor(cx + math.cos(a) * 13 * d), math.floor(cy + math.sin(a) * 12 * d * sy)
    if L.get(b, x, y) then L.set(b, x, y, r() < 0.5 and MOSS[5] or MOSS[2]) end
  end
  -- 얼굴: 눈 자리 둘(게임이 눈빛을 그린다)과 그늘진 입
  local ey = base - 19
  L.rect(b, cx - 8, ey - 1, 6, 4, MOSS[1]); L.rect(b, cx + 2, ey - 1, 6, 4, MOSS[1])
  L.hline(b, cx - 5, cx + 5, ey + 7, BARK[1]); L.hline(b, cx - 4, cx + 4, ey + 8, MOSS[1])
  for x = cx - 4, cx + 4, 2 do L.set(b, x, ey + 7, "#d8d0b0") end   -- 이빨처럼 박힌 돌
  -- 가지 뿔(사슴뿔처럼 갈라진다)
  local top = math.floor(cy - 13 * sy)
  local function antler(dir)
    local x0, y0 = cx + dir * 6, top + 3
    L.line(b, x0, y0, x0 + dir * 7, y0 - 9, BARK[4]); L.line(b, x0 + dir, y0, x0 + dir * 8, y0 - 9, BARK[3])
    L.line(b, x0 + dir * 4, y0 - 5, x0 + dir * 1, y0 - 10, BARK[4])
    L.line(b, x0 + dir * 7, y0 - 9, x0 + dir * 11, y0 - 11, BARK[4])
    L.set(b, x0 + dir * 1, y0 - 11, MOSS[5]); L.set(b, x0 + dir * 11, y0 - 12, MOSS[5]); L.set(b, x0 + dir * 12, y0 - 12, MOSS[6])
  end
  antler(-1); antler(1)
  -- 버섯 군락과 빛나는 룬 이끼
  for _, m in ipairs({ { cx + 11, cy + 5 }, { cx + 13, cy + 3 }, { cx - 13, cy + 7 } }) do
    L.hline(b, m[1] - 1, m[1] + 1, m[2], SHROOM[3]); L.set(b, m[1] - 1, m[2], SHROOM[4]); L.set(b, m[1], m[2] + 1, "#e8dcc0")
  end
  L.set(b, cx - 11, cy - 1, TEAL[3]); L.set(b, cx - 10, cy, TEAL[2]); L.set(b, cx + 12, cy - 5, TEAL[3])
  L.outline(b, OL)
  return b
end
add("boss1_0", elder(1), 28, 47)
add("boss1_1", elder(0.96), 28, 47)

-- ----------------------------------------------------------- 보스 2: 돌 껍질 거북 골렘 60×48, 발 = (30, 45)
local function golem(cracked, breath)
  local b = L.new(60, 48)
  local base, cx = 45, 30
  local up = breath or 0
  -- 짧고 굵은 돌 다리 넷
  for _, x in ipairs({ 13, 21, 35, 43 }) do
    L.shadeCyl(b, x, base - 5, 5, 6, STONE, -0.05)
    L.hline(b, x, x + 4, base, STONE[1]); L.set(b, x + 1, base - 1, MOSS[4])
  end
  -- 아래 몸(어두운 돌)
  L.shadeEllipse(b, cx, base - 11 - up, 22, 10, { STONE[1], STONE[2], STONE[2], STONE[3] }, -0.05)
  -- 등딱지(육각 판) — 큰 돔
  local shCy = base - 21 - up
  L.shadeEllipse(b, cx, shCy, 19, 15, STONE, -0.06)
  -- 판 이음매(육각 격자)
  local seams = { { -9, -6 }, { 0, -10 }, { 9, -6 }, { -12, 3 }, { 0, 0 }, { 12, 3 }, { -6, 9 }, { 6, 9 } }
  for _, s in ipairs(seams) do
    local x, y = cx + s[1], shCy + s[2]
    for a = 0, 5 do
      local t0, t1 = a * math.pi / 3, (a + 1) * math.pi / 3
      L.line(b, x + math.cos(t0) * 4.5, y + math.sin(t0) * 3.6, x + math.cos(t1) * 4.5, y + math.sin(t1) * 3.6, STONE[2])
    end
    L.set(b, x - 1, y - 1, STONE[5])
  end
  -- 이끼 덮개와 수정 돌기
  for x = cx - 16, cx + 16 do
    local y = shCy - math.floor(math.sqrt(math.max(0, 1 - ((x - cx) / 19) ^ 2)) * 15) + 1
    if (x * 7) % 5 < 3 then L.set(b, x, y, MOSS[4]); L.set(b, x, y + 1, MOSS[3]) end
  end
  local function crystal(x, y, h)
    L.poly(b, { { x - 2, y }, { x, y - h }, { x + 2, y } }, TEAL[2]); L.vline(b, x - 1, y - h + 2, y - 1, TEAL[3]); L.set(b, x, y - h, TEAL[4])
  end
  crystal(cx - 7, shCy - 11, 6); crystal(cx + 5, shCy - 13, 8); crystal(cx + 12, shCy - 8, 5)
  -- 앞머리(얼굴 판) — 눈 자리 둘
  local ey = base - 17 - up
  L.shadeEllipse(b, cx, ey + 1, 8, 4.5, STONE, 0.0)
  L.rect(b, cx - 6, ey - 1, 4, 3, STONE[1]); L.rect(b, cx + 2, ey - 1, 4, 3, STONE[1])
  if cracked then
    -- 갈라진 껍질: 금과 떨어져 나간 판(빈 자리는 게임이 핵의 빛으로 채운다)
    L.ellipse(b, cx, shCy - 1, 7, 6, "#0b1016")
    L.line(b, cx - 9, shCy - 12, cx - 3, shCy - 5, "#0b1016"); L.line(b, cx + 4, shCy - 10, cx + 10, shCy - 2, "#0b1016")
    L.line(b, cx - 14, shCy + 2, cx - 6, shCy + 1, "#0b1016")
    for k = 0, 5 do L.set(b, cx - 18 + k * 7, shCy + 12 + (k % 2), STONE[4]) end   -- 떨어진 파편
  end
  L.outline(b, OL)
  return b
end
add("boss2_0", golem(false, 0), 30, 45)
add("boss2_1", golem(false, 1), 30, 45)
add("boss2_crack", golem(true, 0), 30, 45)

-- ----------------------------------------------------------- 보스 3: 가시 심장 덤불 58×46, 발 = (29, 43)
local function bramble(open, k)
  local b = L.new(58, 46)
  local base, cx = 43, 29
  -- 뒤틀린 뿌리
  for i, x in ipairs({ 12, 20, 37, 45 }) do
    local d = (x < cx) and -1 or 1
    L.line(b, cx + d * 6, base - 6, x, base, BARK[3]); L.line(b, cx + d * 6, base - 5, x + d, base, BARK[2])
    L.set(b, x + d * 2, base, BARK[2])
  end
  -- 덤불 덩이(여러 겹)
  local lobes = { { -11, -10, 11, 9 }, { 11, -10, 10.5, 9 }, { 0, -15, 14, 12 }, { -5, -23, 8.5, 7 }, { 7, -22, 8, 7 } }
  for _, l in ipairs(lobes) do L.shadeEllipse(b, cx + l[1], base + l[2], l[3], l[4], open and { THORN[1], THORN[2], THORN[2], THORN[3], THORN[4] } or THORN, 0.02) end
  -- 엉킨 덩굴 줄기
  local r = L.rng(31 + k)
  for _ = 1, 9 do
    local x0, y0 = cx + (r() - 0.5) * 34, base - 6 - r() * 26
    local x1, y1 = x0 + (r() - 0.5) * 14, y0 + (r() - 0.5) * 8
    if L.get(b, math.floor(x0), math.floor(y0)) and L.get(b, math.floor(x1), math.floor(y1)) then L.line(b, x0, y0, x1, y1, BARK[3]) end
  end
  -- 잎 하이라이트 + 붉은 열매/가시 끝
  for _ = 1, 30 do
    local x, y = math.floor(cx + (r() - 0.5) * 40), math.floor(base - 4 - r() * 32)
    if L.get(b, x, y) then L.set(b, x, y, r() < 0.7 and THORN[5] or (open and RED[1] or RED[3])) end
  end
  -- 심장 자리(가운데) — 닫혀 있을 땐 덩굴로 감겨 있고, 열리면 어두운 구멍(게임이 청록 핵을 그린다)
  local hy = base - 18
  if open then
    L.ellipse(b, cx, hy, 7, 6, "#090e0b")
    for a = 0, 7 do local t = a / 8 * math.pi * 2; L.set(b, math.floor(cx + math.cos(t) * 7.5), math.floor(hy + math.sin(t) * 6.5), BARK[4]) end
  else
    L.ellipse(b, cx, hy, 5, 4, RED[1])
    L.line(b, cx - 6, hy - 3, cx + 6, hy + 3, BARK[3]); L.line(b, cx - 6, hy + 3, cx + 6, hy - 3, BARK[3])
    L.set(b, cx, hy, RED[3])
  end
  -- 눈 자리(게임이 눈빛을 그린다)
  local ey = base - 23
  L.rect(b, cx - 7, ey, 5, 3, THORN[1]); L.rect(b, cx + 3, ey, 5, 3, THORN[1])
  L.outline(b, OL)
  return b
end
add("boss3_0", bramble(false, 0), 29, 43)
add("boss3_1", bramble(false, 1), 29, 43)
add("boss3_open", bramble(true, 0), 29, 43)

-- ----------------------------------------------------------- 생존자 일꾼 16×24, 발 = (8, 22). 옷 색 4가지 × (서기, 걷기 4, 일하기 2)
local TUNICS = { { "#5e2328", "#8e3a40", "#b8565c" }, { "#22405e", "#356592", "#5a8cc0" }, { "#344a20", "#557a34", "#7fa04e" }, { "#5e4418", "#93702c", "#c49a48" } }
local SKIN = { "#9a6a4a", "#c9946a", "#e8b98a" }
local HAIR = { "#2a1a10", "#4a3220" }
local function worker(tun, legA, legB, armY, bob, work)
  local b = L.new(16, 24)
  local u = bob or 0
  -- 다리/신발
  local function wleg(x, lift)
    L.vline(b, x, 18 + u, 21 - lift, "#2d2420"); L.vline(b, x + 1, 18 + u, 21 - lift, "#3a2e28")
    L.set(b, x, 22 - lift, "#1a1210"); L.set(b, x + 1, 22 - lift, "#2a1c16")
  end
  wleg(5, legA); wleg(9, legB)
  -- 몸통(튜닉) + 앞치마 + 허리끈
  L.shadeCyl(b, 4, 11 + u, 8, 8, { tun[1], tun[2], tun[3] }, 0.04)
  L.rect(b, 6, 14 + u, 4, 5, "#c8b896"); L.vline(b, 6, 14 + u, 18 + u, "#a8987a")
  L.hline(b, 4, 11, 14 + u, "#4a3220")
  -- 팔
  L.vline(b, 3, 12 + u + (armY or 0), 15 + u + (armY or 0), tun[2]); L.set(b, 3, 16 + u + (armY or 0), SKIN[2])
  if work then
    L.line(b, 12, 12 + u, 14, 9 + u + (work == 2 and 3 or 0), tun[2]); L.set(b, 14, 8 + u + (work == 2 and 3 or 0), SKIN[3])
  else
    L.vline(b, 12, 12 + u - (armY or 0), 15 + u - (armY or 0), tun[1]); L.set(b, 12, 16 + u - (armY or 0), SKIN[1])
  end
  -- 머리(얼굴 + 머리카락/두건)
  L.shadeEllipse(b, 8, 7.5 + u, 3.6, 3.6, SKIN, 0.05)
  L.shadeEllipse(b, 8, 5.8 + u, 3.9, 2.4, HAIR, 0.0)
  L.set(b, 4, 7 + u, HAIR[1]); L.set(b, 11, 7 + u, HAIR[1])
  L.set(b, 7, 8 + u, "#1a1210"); L.set(b, 9, 8 + u, "#1a1210")
  L.set(b, 8, 10 + u, SKIN[1])
  L.outline(b, "#120c0a")
  return b
end
for i, tun in ipairs(TUNICS) do
  local n = "worker" .. (i - 1)
  add(n .. "_idle", worker(tun, 0, 0, 0, 0), 8, 22)
  add(n .. "_walk0", worker(tun, 0, 2, 1, 0), 8, 22)
  add(n .. "_walk1", worker(tun, 0, 0, 0, -1), 8, 22)
  add(n .. "_walk2", worker(tun, 2, 0, -1, 0), 8, 22)
  add(n .. "_walk3", worker(tun, 0, 0, 0, -1), 8, 22)
  add(n .. "_work0", worker(tun, 0, 0, 0, 0, 1), 8, 22)
  add(n .. "_work1", worker(tun, 0, 0, 0, 1, 2), 8, 22)
end

-- ----------------------------------------------------------- v72: 납품처 NPC(대장장이 / 마법사), 운반 상자, 가판
local function smith(up)
  local b = L.new(26, 30)
  local u = up and 0 or 1
  -- 다리/장화
  L.rect(b, 9, 24, 3, 4, '#2a1c14'); L.rect(b, 14, 24, 3, 4, '#2a1c14'); L.hline(b, 8, 12, 28, '#140c08'); L.hline(b, 13, 17, 28, '#140c08')
  -- 몸통(땀 흘리는 넓은 어깨) + 가죽 앞치마
  L.shadeEllipse(b, 13, 18 + u * 0.3, 7.5, 7, { '#5a3a2a', '#7a5038', '#9a6848', '#b88460' }, 0.04)
  L.rect(b, 9, 17, 9, 9, '#4a2e1a'); L.hline(b, 9, 17, 17, '#6a4428'); L.vline(b, 9, 17, 25, '#3a2414')
  L.set(b, 13, 21, '#c9973e')
  -- 머리: 대머리 + 덥수룩한 수염
  L.shadeEllipse(b, 13, 9, 4.6, 4.6, { '#9a6a4a', '#c9946a', '#e8b98a' }, 0.05)
  L.set(b, 11, 9, '#1a1210'); L.set(b, 15, 9, '#1a1210'); L.hline(b, 11, 15, 7, '#7a4a2a')
  L.poly(b, { { 8, 10 }, { 18, 10 }, { 16, 16 }, { 13, 18 }, { 10, 16 } }, function(x, y) return y < 13 and '#c0602a' or '#a04a20' end)
  L.set(b, 12, 12, '#e8b98a'); L.set(b, 14, 12, '#e8b98a')
  -- 망치 팔(들었다 / 내렸다)
  if up then L.line(b, 19, 15, 22, 6, '#9a6848'); L.rect(b, 20, 2, 6, 4, '#a2aec4'); L.hline(b, 20, 25, 2, '#e2e9f5'); L.line(b, 22, 6, 22, 10, '#5e381e')
  else L.line(b, 19, 15, 23, 19, '#9a6848'); L.rect(b, 21, 19, 5, 4, '#a2aec4'); L.hline(b, 21, 25, 19, '#e2e9f5') end
  L.line(b, 7, 15, 5, 21, '#9a6848'); L.set(b, 5, 22, '#c9946a')
  L.outline(b, '#0e0806')
  return b
end
add('smith_0', smith(true), 13, 28); add('smith_1', smith(false), 13, 28)
local function mage(k)
  local b = L.new(24, 32)
  local u = k
  -- 긴 로브(보라) + 청록 띠
  L.poly(b, { { 7, 12 + u }, { 16, 12 + u }, { 19, 30 }, { 4, 30 } }, function(x, y) return (x < 10) and '#5c38a8' or (x < 14 and '#4a2c88' or '#36206a') end)
  L.hline(b, 4, 19, 30, '#22124a'); L.vline(b, 11, 14 + u, 29, '#3fc0d8'); L.vline(b, 12, 14 + u, 29, '#21788c')
  for y = 18, 28, 4 do L.set(b, 11, y, '#e4fdff') end
  -- 뾰족 두건과 어두운 얼굴, 빛나는 눈
  L.poly(b, { { 6, 14 + u }, { 17, 14 + u }, { 13, 1 + u }, { 11, 0 + u } }, function(x, y) return x < 11 and '#7a52c0' or '#5c38a8' end)
  L.ellipse(b, 11.5, 10 + u, 2.6, 2.2, '#0a0814'); L.set(b, 10, 10 + u, '#8ae8f8'); L.set(b, 13, 10 + u, '#8ae8f8')
  L.set(b, 12, 0 + u, '#c4a8ff')
  -- 지팡이와 빛구슬
  L.vline(b, 19, 6, 30, '#5e381e'); L.vline(b, 20, 6, 30, '#3e2414')
  L.ellipse(b, 19.5, 4, 2.6, 2.6, k == 0 and '#8ae8f8' or '#3fc0d8'); L.set(b, 19, 3, '#ffffff')
  L.line(b, 16, 16 + u, 19, 18, '#7a52c0'); L.set(b, 18, 18, '#e8b98a')
  L.outline(b, '#080612')
  return b
end
add('mage_0', mage(0), 12, 30); add('mage_1', mage(1), 12, 30)
do
  local b = L.new(11, 10)
  L.rect(b, 1, 2, 9, 7, '#965e30'); L.hline(b, 1, 9, 2, '#c08a4e'); L.hline(b, 1, 9, 8, '#4a2a14')
  L.line(b, 1, 2, 9, 8, '#6e4220'); L.vline(b, 1, 2, 8, '#6e4220'); L.vline(b, 9, 2, 8, '#4a2a14')
  L.hline(b, 3, 7, 1, '#d8ad55')
  L.outline(b, '#0e0806')
  add('crate', b, 5, 9)
end
do
  local b = L.new(26, 16)
  L.shadeCyl(b, 7, 8, 12, 7, { '#3e2414', '#5e381e', '#7e5230' }, 0.0)
  L.poly(b, { { 2, 4 }, { 24, 4 }, { 20, 8 }, { 6, 8 } }, function(x, y) return y < 6 and '#a2aec4' or '#6a768c' end)
  L.hline(b, 2, 24, 4, '#e2e9f5'); L.set(b, 12, 2, '#ffb238'); L.set(b, 15, 1, '#ffe890')
  L.outline(b, '#0e0806')
  add('anvil', b, 13, 15)
  local c = L.new(30, 14)
  L.each(c, 0, 0, 29, 13, function(x, y) local d = ((x + 0.5 - 15) / 14) ^ 2 + ((y + 0.5 - 7) / 6.4) ^ 2; if d <= 1 and d > 0.7 then return '#3fc0d8' elseif d <= 0.7 and d > 0.6 then return '#7a52c0' end end)
  for a = 0, 5 do local t = a * math.pi / 3; L.set(c, math.floor(15 + math.cos(t) * 10), math.floor(7 + math.sin(t) * 4.4), '#e4fdff') end
  add('runering', c, 15, 7)
end

-- ----------------------------------------------------------- v72: 모험가/용병 손님 4종(걷기 2프레임, 옆모습은 게임이 반전)
local LOOKS = {
  { cloak = { '#5a1a1e', '#8e2a30', '#c04048' }, head = 'helm', gear = 'sword' },     -- 붉은 망토 검사
  { cloak = { '#1e3a1e', '#2f5a2c', '#4a8044' }, head = 'hood', gear = 'bow' },       -- 초록 두건 궁수
  { cloak = { '#1e2a5a', '#2c3e8a', '#4a62c0' }, head = 'hat', gear = 'staff' },      -- 푸른 모자 마법사
  { cloak = { '#4a3018', '#6e4a24', '#966a38' }, head = 'beard', gear = 'axe' }       -- 갈색 수염 도끼 용병
}
local function adventurer(lk, step)
  local b = L.new(18, 26)
  local legA, legB = step == 1 and 2 or 0, step == 1 and 0 or 2
  L.vline(b, 6, 19, 24 - legA, '#2a2220'); L.vline(b, 7, 19, 24 - legA, '#3a302a'); L.set(b, 6, 25 - legA, '#140c08'); L.set(b, 7, 25 - legA, '#140c08')
  L.vline(b, 10, 19, 24 - legB, '#2a2220'); L.vline(b, 11, 19, 24 - legB, '#3a302a'); L.set(b, 10, 25 - legB, '#140c08'); L.set(b, 11, 25 - legB, '#140c08')
  L.shadeCyl(b, 4, 11, 10, 9, { lk.cloak[1], lk.cloak[2], lk.cloak[3] }, 0.04)
  L.hline(b, 4, 13, 15, '#4a3220'); L.set(b, 9, 15, '#d8ad55')
  L.rect(b, 13, 7, 3, 7, '#6a4428')   -- 등짐
  L.shadeEllipse(b, 9, 7.5, 3.6, 3.6, { '#9a6a4a', '#c9946a', '#e8b98a' }, 0.05)
  L.set(b, 8, 8, '#1a1210'); L.set(b, 10, 8, '#1a1210')
  if lk.head == 'helm' then L.shadeEllipse(b, 9, 5.6, 4, 2.6, { '#465065', '#6f7b94', '#a7b2c8' }, 0.1); L.vline(b, 9, 2, 3, '#c04048')
  elseif lk.head == 'hood' then L.poly(b, { { 5, 8 }, { 9, 1 }, { 13, 8 } }, lk.cloak[2]); L.ellipse(b, 9, 8, 2.2, 1.6, '#c9946a'); L.set(b, 8, 8, '#1a1210'); L.set(b, 10, 8, '#1a1210')
  elseif lk.head == 'hat' then L.poly(b, { { 3, 6 }, { 15, 6 }, { 10, 0 } }, lk.cloak[2]); L.hline(b, 3, 15, 6, lk.cloak[1]); L.set(b, 10, 0, '#ffd86a')
  else L.poly(b, { { 6, 9 }, { 12, 9 }, { 11, 13 }, { 9, 14 }, { 7, 13 } }, '#c0602a'); L.hline(b, 6, 12, 4, '#4a3220') end
  if lk.gear == 'sword' then L.line(b, 2, 18, 4, 10, '#a7b2c8'); L.set(b, 3, 16, '#d8ad55')
  elseif lk.gear == 'bow' then L.line(b, 2, 9, 2, 19, '#8a5a2a'); L.line(b, 3, 9, 3, 19, '#c8c8b0')
  elseif lk.gear == 'staff' then L.vline(b, 2, 4, 22, '#6e4a24'); L.set(b, 2, 3, '#5fd8f0'); L.set(b, 1, 3, '#c8fbff')
  else L.line(b, 2, 20, 3, 11, '#6e4a24'); L.rect(b, 1, 10, 3, 3, '#a7b2c8') end
  L.outline(b, '#0e0806')
  return b
end
for i, lk in ipairs(LOOKS) do
  add('adv' .. (i - 1) .. '_0', adventurer(lk, 0), 9, 25)
  add('adv' .. (i - 1) .. '_1', adventurer(lk, 1), 9, 25)
end

local sheet, placed = L.atlas(items, 256, 1)
L.saveAtlas(OUT .. "/mobs.aseprite", OUT .. "/mobs.png", sheet, placed)
local m = { items = {} }
for _, it in ipairs(placed) do m.items[it.name] = { it.x, it.y, it.buf.w, it.buf.h, it.ax, it.ay } end
L.writeFile(OUT .. "/mobs.json", L.json(m))
print("mobs: " .. #placed .. " items, sheet " .. sheet.w .. "x" .. sheet.h)
