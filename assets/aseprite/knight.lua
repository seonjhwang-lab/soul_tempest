-- ==========================================================================
-- knight.lua — 달빛 숲의 방랑 기사(플레이어) + 분리된 검/팔 레이어
--   aseprite -b --script-param dir=<이 폴더> --script-param out=<assets/sprites> --script knight.lua
-- 결과: knight.aseprite(태그가 달린 원본 애니메이션), knight.png(20열 × 4행 시트), knight.json(프레임/앵커 메타데이터)
--       gear.aseprite / gear.png / gear.json (검 4단계 × 룬 흐름 4프레임, 검기 빛무리, 공격 팔)
-- 프레임 32×32, 발이 닿는 줄 = 30, 몸 가운데 열 = 16 (player.js 의 SPRITE_FOOT_ROW 와 같은 규약).
-- v84 갑주 외형: 같은 뼈대로 시트 6장 — knight(방랑자의 외투: 깃 세운 가죽 코트 + 사냥꾼 두건) · knight_moss(거목: 사슴 왕관뿔 투구 + 나무껍질 중갑 + 덩굴 망토) ·
--   knight_crystal(수정: 푸른 결정 볏의 성기사 바이저 + 은백 각진 갑주) · knight_thorn(홍련: 붉은 오니 뿔 가면 + 검은 가시 견갑 + 진홍 무사 갑옷) ·
--   knight_frost(설원: 흰 늑대 머리 가죽 두건 + 두꺼운 털가죽 어깨/망토) · knight_astral(아스트랄: 검은 고룡의 두 뿔 투구 + 흑금 비늘 갑옷 + 용 날개 망토)
-- ==========================================================================
local DIR = app.params.dir
local OUT = app.params.out
package.path = DIR .. "/?.lua;" .. package.path
local L = require("lib")

-- ----------------------------------------------------------- 팔레트
local OL = "#0b0b14"
local HOOD = { "#161d33", "#222d4c", "#2f4067", "#425a8a", "#6d8cc0" }   -- 한밤의 청색 두건/망토(마지막 = 달빛 가장자리)
local CAPE = { "#121729", "#1b233d", "#263354", "#33466f" }
local LINING = { "#3c1729", "#5e2440", "#83335a" }
local FACE0, FACE1 = "#05050a", "#10131f"
local EYE1, EYE2 = "#5fd8f0", "#e4fdff"
local STEEL = { "#2a3040", "#465065", "#6f7b94", "#a7b2c8", "#e2e9f5" }
local GOLD = { "#7a5420", "#b8862f", "#e8c46a", "#fff0b8" }
local LEATHER = { "#24160e", "#3e281a", "#5f402a", "#7d5a3c" }
local TROUSER = { "#16161f", "#232332", "#30304a" }
local CUR = nil   -- v84 지금 그리는 갑주(투구 · 견갑 · 망토 끝단 파츠)

local W, H = 32, 32

-- ----------------------------------------------------------- 부품
local function leg(b, hipX, hipY, footX, footY, ramp, boot)
  -- 엉덩이(hipX, hipY) → 발(footX, footY): 매 줄마다 가로 3칸, 아래 3줄은 장화
  local n = math.max(1, footY - hipY)
  for y = hipY, footY do
    local t = (y - hipY) / n
    local x = math.floor(hipX + (footX - hipX) * t + 0.5) - 1
    if footY - y <= 2 then
      L.set(b, x, y, boot[2]); L.set(b, x + 1, y, boot[3]); L.set(b, x + 2, y, boot[2])
      if footY - y == 2 then L.set(b, x, y, boot[3]); L.set(b, x + 1, y, boot[4]) end
      if y == footY then L.hline(b, x, x + 2, y, boot[1]) end
    else
      L.set(b, x, y, ramp[3]); L.set(b, x + 1, y, ramp[2]); L.set(b, x + 2, y, ramp[1])
    end
  end
end

local function sideLeg(b, hipX, hipY, footX, footY, ramp, boot, dir)
  leg(b, hipX, hipY, footX, footY, ramp, boot)
  L.set(b, math.floor(footX + 0.5) + 1 * dir + (dir > 0 and 1 or -1), footY, boot[1])   -- 발끝
  L.set(b, math.floor(footX + 0.5) + 1 * dir + (dir > 0 and 1 or -1), footY - 1, boot[2])
end

local function capeShape(b, top, bot, xl, xr, bl, br, wave)
  -- 망토: 어깨(xl..xr, top) → 아랫단(bl..br, bot). 아랫단은 물결치고 안감이 비친다.
  local pts = { { xl, top }, { xr + 1, top }, { br + 1, bot }, { bl, bot } }
  L.shadePoly(b, pts, CAPE, 0.02)
  for x = math.floor(bl), math.floor(br) do
    local w = ((x + wave) % 3 == 0) and 1 or 0
    L.set(b, x, bot, (x + wave) % 2 == 0 and LINING[2] or LINING[1])
    if w == 1 then L.set(b, x, bot + 1, CAPE[1]) end
  end
  if CUR and CUR.edge then CUR.edge(b, math.floor(bl), math.floor(br), bot, wave) end   -- v84 덩굴 잎 · 털 술 · 용 날개 끝
end

local function pauldron(b, cx, cy)
  if CUR and CUR.pauldron then return CUR.pauldron(b, cx, cy) end
  L.shadeEllipse(b, cx, cy, 2.7, 2.1, STEEL, 0.06)
  L.set(b, math.floor(cx) - 1, math.floor(cy) - 1, STEEL[5])
  for x = math.floor(cx - 2), math.floor(cx + 2) do L.set(b, x, math.floor(cy + 1.6), GOLD[2]) end
  L.set(b, math.floor(cx - 1), math.floor(cy + 1.6), GOLD[3])
end

local function gauntlet(b, x, y)
  L.set(b, x, y, STEEL[4]); L.set(b, x + 1, y, STEEL[3])
  L.set(b, x, y + 1, STEEL[3]); L.set(b, x + 1, y + 1, STEEL[2])
end

local function armDown(b, x, y0, len, lit)
  -- 내려뜨린 팔(정면/뒷면): 2칸 폭 소매 + 장갑
  for y = y0, y0 + len - 3 do
    L.set(b, x, y, lit and HOOD[3] or HOOD[2]); L.set(b, x + 1, y, lit and HOOD[2] or HOOD[1])
  end
  gauntlet(b, x, y0 + len - 2)
end

-- ----------------------------------------------------------- 정면(아래를 본다)
-- o = { u=윗몸 아래로 밀림, ox=윗몸 가로 밀림, legL={dx,lift}, legR={dx,lift}, sway=, armL=, armR=(nil 이면 안 그림), eye=, kneel= }
local function drawDown(o)
  local b = L.new(W, H)
  local u, ox = o.u or 0, o.ox or 0
  local cx = 16.5 + ox
  -- 망토(몸 뒤)
  capeShape(b, 15 + u, math.min(28, 27 + math.max(0, u)), 10 + ox, 22 + ox, 9 + ox + (o.sway or 0), 23 + ox + (o.sway2 or o.sway or 0), o.wave or 0)
  -- 다리
  if not o.noLegs then
    local hip = 25 + u
    leg(b, 15 + (o.legL and o.legL[1] or 0), hip, 15 + (o.legL and o.legL[1] or 0), 30 - (o.legL and o.legL[2] or 0), TROUSER, LEATHER)
    leg(b, 19 + (o.legR and o.legR[1] or 0), hip, 19 + (o.legR and o.legR[1] or 0), 30 - (o.legR and o.legR[2] or 0), TROUSER, LEATHER)
  end
  -- 팔(몸통 뒤쪽 가장자리)
  if o.armL ~= false then armDown(b, 10 + ox, 18 + u + (o.armL or 0), 6, true) end
  if o.armR ~= false then armDown(b, 21 + ox, 18 + u + (o.armR or 0), 6, false) end
  -- 몸통: 가슴판
  L.shadeCyl(b, 12 + ox, 16 + u, 9, 7, STEEL, 0.05)
  L.vline(b, 16 + ox, 17 + u, 21 + u, STEEL[4])
  L.set(b, 14 + ox, 17 + u, STEEL[5]); L.set(b, 14 + ox, 18 + u, STEEL[4])
  L.hline(b, 13 + ox, 19 + ox, 16 + u, GOLD[2])
  -- 가슴의 초승달 문장
  L.set(b, 15 + ox, 18 + u, GOLD[3]); L.set(b, 15 + ox, 19 + u, GOLD[3]); L.set(b, 16 + ox, 20 + u, GOLD[2]); L.set(b, 17 + ox, 19 + u, EYE1)
  -- 허리띠 + 버클
  L.hline(b, 12 + ox, 20 + ox, 22 + u, LEATHER[2]); L.hline(b, 12 + ox, 14 + ox, 22 + u, LEATHER[3])
  L.set(b, 16 + ox, 22 + u, GOLD[3]); L.set(b, 17 + ox, 22 + u, GOLD[2])
  -- 앞자락(천)과 허리 갑옷
  L.shadeCyl(b, 14 + ox, 23 + u, 5, 3, HOOD, 0.08)
  L.set(b, 12 + ox, 23 + u, STEEL[2]); L.set(b, 13 + ox, 23 + u, STEEL[3]); L.set(b, 19 + ox, 23 + u, STEEL[2]); L.set(b, 20 + ox, 23 + u, STEEL[1])
  L.set(b, 16 + ox, 25 + u, GOLD[2])
  -- 어깨 망토(두건이 어깨까지 덮는 부분)
  L.shadeEllipse(b, cx, 15.6 + u, 6.6, 2.5, HOOD, 0.04)
  -- 견갑
  pauldron(b, 11.2 + ox, 16.8 + u)
  pauldron(b, 21.8 + ox, 16.8 + u)
  -- 두건과 어두운 얼굴, 빛나는 눈
  L.shadeEllipse(b, cx, 11.2 + u, 5.3, 4.7, HOOD, 0.02)
  L.set(b, 16 + ox, 6 + u, HOOD[3]); L.set(b, 17 + ox, 6 + u, HOOD[2])
  L.ellipse(b, cx, 12.4 + u, 3.2, 2.5, FACE0)
  L.hline(b, 14 + ox, 18 + ox, 10 + u, HOOD[1])
  L.hline(b, 14 + ox, 18 + ox, 11 + u, FACE1)
  L.hline(b, 15 + ox, 17 + ox, 14 + u, STEEL[2])   -- 얼굴 가리개의 턱
  local e = o.eye or 2
  L.set(b, 14 + ox, 12 + u, e == 2 and EYE2 or EYE1); L.set(b, 18 + ox, 12 + u, e == 2 and EYE2 or EYE1)
  L.set(b, 14 + ox, 13 + u, EYE1); L.set(b, 18 + ox, 13 + u, EYE1)
  -- 달빛이 닿는 두건 가장자리
  L.set(b, 13 + ox, 8 + u, HOOD[5]); L.set(b, 14 + ox, 7 + u, HOOD[5]); L.set(b, 12 + ox, 9 + u, HOOD[4])
  if CUR and CUR.deco then CUR.deco(b, 'down', ox, u) end
  L.outline(b, OL)
  return b
end

-- ----------------------------------------------------------- 뒷모습(위를 본다)
local function drawUp(o)
  local b = L.new(W, H)
  local u, ox = o.u or 0, o.ox or 0
  local cx = 16.5 + ox
  if not o.noLegs then
    local hip = 25 + u
    leg(b, 15 + (o.legL and o.legL[1] or 0), hip, 15 + (o.legL and o.legL[1] or 0), 30 - (o.legL and o.legL[2] or 0), TROUSER, LEATHER)
    leg(b, 19 + (o.legR and o.legR[1] or 0), hip, 19 + (o.legR and o.legR[1] or 0), 30 - (o.legR and o.legR[2] or 0), TROUSER, LEATHER)
  end
  if o.armL ~= false then armDown(b, 9 + ox, 18 + u + (o.armL or 0), 6, true) end
  if o.armR ~= false then armDown(b, 22 + ox, 18 + u + (o.armR or 0), 6, false) end
  -- 망토가 등 전체를 덮는다(접힌 주름 두 줄)
  local s1, s2 = o.sway or 0, o.sway2 or o.sway or 0
  local pts = { { 10 + ox, 14 + u }, { 23 + ox, 14 + u }, { 24 + ox + s2, 28 }, { 9 + ox + s1, 28 } }
  L.shadePoly(b, pts, { CAPE[1], CAPE[2], CAPE[3], CAPE[3], CAPE[4] }, 0.0)
  for y = 17 + u, 27 do
    local t = (y - 17 - u) / 10
    L.set(b, math.floor(13 + ox + s1 * t * 0.5), y, CAPE[1])
    L.set(b, math.floor(19 + ox + s2 * t * 0.5), y, CAPE[1])
    L.set(b, math.floor(12 + ox + s1 * t * 0.5), y, CAPE[4])
  end
  for x = 9 + ox + s1, 24 + ox + s2 do L.set(b, x, 28, ((x + (o.wave or 0)) % 3 == 0) and LINING[2] or CAPE[1]) end
  -- 어깨 망토, 견갑
  L.shadeEllipse(b, cx, 15.2 + u, 6.6, 2.6, HOOD, 0.02)
  pauldron(b, 10.8 + ox, 16.6 + u)
  pauldron(b, 22.2 + ox, 16.6 + u)
  -- 두건 뒤통수
  L.shadeEllipse(b, cx, 11.0 + u, 5.3, 4.8, HOOD, 0.0)
  L.set(b, 16 + ox, 6 + u, HOOD[3]); L.set(b, 17 + ox, 6 + u, HOOD[2])
  L.vline(b, 16 + ox, 9 + u, 14 + u, HOOD[2])
  L.set(b, 13 + ox, 8 + u, HOOD[5]); L.set(b, 14 + ox, 7 + u, HOOD[5]); L.set(b, 12 + ox, 9 + u, HOOD[4])
  if CUR and CUR.deco then CUR.deco(b, 'up', ox, u) end
  L.outline(b, OL)
  return b
end

-- ----------------------------------------------------------- 옆모습(오른쪽을 본다; 왼쪽은 좌우 반전)
-- o = { u, ox, front={dx,lift}, back={dx,lift}, arm=손 가로 흔들림(nil=안 그림), sway }
local function drawSide(o)
  local b = L.new(W, H)
  local u, ox = o.u or 0, o.ox or 0
  local hip = 25 + u
  -- 먼 쪽 팔(몸 뒤, 어둡게)
  if o.armFar ~= false then
    local hx = 15 + ox - (o.arm or 0) * 0.6
    L.line(b, 15 + ox, 18 + u, hx, 22 + u, HOOD[1]); L.line(b, 16 + ox, 18 + u, hx + 1, 22 + u, HOOD[1])
    L.set(b, math.floor(hx), 23 + u, STEEL[2])
  end
  -- 망토(등 뒤로 흩날림)
  local s = o.sway or 0
  local pts = { { 12 + ox, 14 + u }, { 16 + ox, 14 + u }, { 15 + ox, 27 }, { 8 + ox - s, 27 + (s > 1 and -1 or 0) }, { 10 + ox - math.floor(s / 2), 20 + u } }
  L.shadePoly(b, pts, CAPE, 0.04)
  for y = 18 + u, 26 do L.set(b, math.floor(11 + ox - s * (y - 18 - u) / 10), y, CAPE[1]) end
  for x = 8 + ox - s, 14 + ox do L.set(b, x, 27 + ((s > 1 and x < 10 + ox) and -1 or 0), (x % 2 == 0) and LINING[2] or LINING[1]) end
  -- 다리(뒷다리 먼저, 어둡게)
  if not o.noLegs then
    local bk, fr = o.back or { 0, 0 }, o.front or { 0, 0 }
    sideLeg(b, 16 + ox, hip, 16 + ox + bk[1], 30 - bk[2], { TROUSER[1], TROUSER[1], TROUSER[2] }, { LEATHER[1], LEATHER[1], LEATHER[2], LEATHER[2] }, 1)
    sideLeg(b, 17 + ox, hip, 17 + ox + fr[1], 30 - fr[2], TROUSER, LEATHER, 1)
  end
  -- 몸통
  L.shadeCyl(b, 13 + ox, 16 + u, 7, 7, { STEEL[1], STEEL[2], STEEL[2], STEEL[3] }, -0.06)
  L.vline(b, 18 + ox, 17 + u, 21 + u, STEEL[3])
  L.set(b, 19 + ox, 18 + u, STEEL[4])
  L.vline(b, 13 + ox, 17 + u, 21 + u, HOOD[1])
  L.hline(b, 14 + ox, 19 + ox, 16 + u, GOLD[2])
  L.hline(b, 13 + ox, 19 + ox, 22 + u, LEATHER[2]); L.set(b, 19 + ox, 22 + u, GOLD[3])
  L.shadeCyl(b, 15 + ox, 23 + u, 5, 3, HOOD, 0.1)
  L.set(b, 13 + ox, 23 + u, STEEL[2]); L.set(b, 14 + ox, 23 + u, STEEL[3])
  -- 어깨 망토 + 두건
  L.shadeEllipse(b, 15.5 + ox, 15.4 + u, 4.8, 2.4, HOOD, 0.04)
  L.shadeEllipse(b, 15.8 + ox, 11.2 + u, 5.0, 4.7, HOOD, 0.04)
  L.set(b, 13 + ox, 6 + u, HOOD[3]); L.set(b, 12 + ox, 7 + u, HOOD[2])
  L.set(b, 10 + ox, 12 + u, HOOD[2]); L.set(b, 10 + ox, 13 + u, HOOD[1]); L.set(b, 9 + ox, 14 + u, HOOD[1])   -- 두건 꼬리
  -- 옆얼굴(앞쪽에 얼굴 구멍, 눈 하나)
  L.ellipse(b, 19.6 + ox, 12.5 + u, 2.3, 2.4, FACE0)
  L.set(b, 18 + ox, 10 + u, HOOD[1]); L.set(b, 19 + ox, 10 + u, HOOD[1]); L.set(b, 20 + ox, 10 + u, HOOD[2])
  L.set(b, 21 + ox, 12 + u, HOOD[2]); L.set(b, 21 + ox, 13 + u, HOOD[2]); L.set(b, 21 + ox, 11 + u, HOOD[3])
  L.set(b, 19 + ox, 14 + u, STEEL[2]); L.set(b, 20 + ox, 14 + u, STEEL[3])
  local e = o.eye or 2
  L.set(b, 20 + ox, 12 + u, e == 2 and EYE2 or EYE1); L.set(b, 20 + ox, 13 + u, EYE1)
  L.set(b, 13 + ox, 8 + u, HOOD[5]); L.set(b, 14 + ox, 7 + u, HOOD[5]); L.set(b, 12 + ox, 9 + u, HOOD[4])
  -- 견갑(가까운 어깨)
  pauldron(b, 16.4 + ox, 16.8 + u)
  -- 가까운 팔(앞뒤로 흔들림)
  if o.arm ~= nil then
    local hx = 16 + ox + o.arm
    for k = 0, 3 do
      local t = k / 4
      local x = math.floor(16 + ox + (hx - 16 - ox) * t + 0.5)
      L.set(b, x, 19 + u + k, HOOD[2]); L.set(b, x + 1, 19 + u + k, HOOD[1])
    end
    gauntlet(b, math.floor(hx + 0.5), 22 + u)
  end
  if CUR and CUR.deco then CUR.deco(b, 'side', ox, u) end
  L.outline(b, OL)
  return b
end

-- ----------------------------------------------------------- 쓰러짐
-- (v80: 구르기는 더 이상 몸을 만 공이 아니다 — 아래 프레임 정의의 "대시" 자세가 갑옷 · 망토 · 등의 무기를 그대로 그린다)
local function drawFallen()
  local b = L.new(W, H)
  L.shadeEllipse(b, 17.5, 27.5, 10.5, 2.8, CAPE, 0.04)          -- 땅에 퍼진 망토
  for x = 8, 27, 2 do L.set(b, x, 29, LINING[1]) end
  L.shadeCyl(b, 13, 24, 9, 4, STEEL, 0.05)                        -- 쓰러진 몸
  L.hline(b, 13, 21, 24, GOLD[2])
  L.shadeEllipse(b, 9.5, 25.5, 4.2, 3.4, HOOD, 0.04)              -- 두건(눈빛이 꺼졌다)
  L.set(b, 8, 26, FACE0); L.set(b, 9, 26, FACE0); L.set(b, 8, 25, FACE1)
  leg(b, 23, 26, 26, 27, TROUSER, LEATHER)
  L.outline(b, OL)
  return b
end

-- ----------------------------------------------------------- 프레임 정의
local frames, meta = {}, { fw = W, fh = H, cols = 20, foot = 30, views = { "down", "up", "right", "left" }, anims = {}, bob = {}, lean = {} }
local function anim(name, from, n) meta.anims[name] = { from = from, n = n } end
anim("idle", 0, 4); anim("walk", 4, 6); anim("atk", 10, 3); anim("hurt", 13, 1); anim("roll", 14, 2); anim("death", 16, 4)

-- 숨쉬기(4) / 걷기(6): 윗몸 높이, 다리, 팔, 망토
local IDLE = { { u = 0, sway = 0, eye = 2 }, { u = 0, sway = 1, eye = 1 }, { u = 1, sway = 1, eye = 1 }, { u = 1, sway = 0, eye = 2 } }
local WALK = {   -- 접지 → 내려앉음 → 지나감(한 발 들림) → 반대쪽
  { u = 0, l = { 0, 0 }, r = { 0, 2 }, a = { 1, -1 }, sway = 1, front = { 3, 0 }, back = { -3, 0 }, arm = -2 },
  { u = 1, l = { 0, 0 }, r = { 0, 1 }, a = { 1, -1 }, sway = 2, front = { 2, 0 }, back = { -2, 0 }, arm = -1 },
  { u = -1, l = { 0, 0 }, r = { 0, 0 }, a = { 0, 0 }, sway = 1, front = { 0, 0 }, back = { 0, 2 }, arm = 0 },
  { u = 0, l = { 0, 2 }, r = { 0, 0 }, a = { -1, 1 }, sway = 0, front = { -3, 0 }, back = { 3, 0 }, arm = 2 },
  { u = 1, l = { 0, 1 }, r = { 0, 0 }, a = { -1, 1 }, sway = 1, front = { -2, 0 }, back = { 2, 0 }, arm = 1 },
  { u = -1, l = { 0, 0 }, r = { 0, 0 }, a = { 0, 0 }, sway = 2, front = { 0, 2 }, back = { 0, 0 }, arm = 0 }
}
meta.bob.idle = {}; for i, f in ipairs(IDLE) do meta.bob.idle[i] = f.u end
meta.bob.walk = {}; for i, f in ipairs(WALK) do meta.bob.walk[i] = f.u end
meta.bob.roll = { 3, 2 }   -- v80 대시 자세: 등의 칼집도 몸과 함께 낮아진다
meta.dash = true
-- 공격 자세(검 팔은 그리지 않는다 — player.js 가 어깨 관절에서 팔+검을 돌려 그린다): 준비(뒤로) → 베기(앞으로) → 잔심
local ATK = { { lean = -1, u = 0 }, { lean = 1, u = 1 }, { lean = 1, u = 0 } }
meta.lean.atk = {}; for i, f in ipairs(ATK) do meta.lean.atk[i] = { f.lean, f.u } end

local function viewFrames(view)
  local out = {}
  local function add(buf, tag) out[#out + 1] = { buf = buf, tag = view .. "_" .. tag } end
  for _, f in ipairs(IDLE) do
    if view == "down" then add(drawDown({ u = f.u, sway = f.sway, sway2 = -f.sway, eye = f.eye }), "idle")
    elseif view == "up" then add(drawUp({ u = f.u, sway = -f.sway, sway2 = f.sway }), "idle")
    else add(drawSide({ u = f.u, sway = f.sway, arm = 0, eye = f.eye, front = { 1, 0 }, back = { -1, 0 } }), "idle") end
  end
  for i, f in ipairs(WALK) do
    if view == "down" then add(drawDown({ u = f.u, legL = f.l, legR = f.r, armL = f.a[1], armR = f.a[2], sway = f.sway - 1, sway2 = 1 - f.sway, wave = i }), "walk")
    elseif view == "up" then add(drawUp({ u = f.u, legL = f.l, legR = f.r, armL = f.a[2], armR = f.a[1], sway = 1 - f.sway, sway2 = f.sway - 1, wave = i }), "walk")
    else add(drawSide({ u = f.u, front = f.front, back = f.back, arm = f.arm, sway = f.sway + 1 }), "walk") end
  end
  for _, f in ipairs(ATK) do
    if view == "down" then add(drawDown({ u = f.u + (f.lean > 0 and 0 or 0), ox = 0, armL = false, sway = -f.lean, sway2 = f.lean, legL = { -1, 0 }, legR = { 1, 0 } }), "atk")
    elseif view == "up" then add(drawUp({ u = f.u, armR = false, sway = f.lean, sway2 = -f.lean, legL = { -1, 0 }, legR = { 1, 0 } }), "atk")
    else add(drawSide({ u = f.u, ox = f.lean, arm = nil, armFar = true, sway = 2 - f.lean, front = { 3, 0 }, back = { -3, 0 } }), "atk") end
  end
  -- 피격: 뒤로 젖혀지고 망토가 펄럭인다
  if view == "down" then add(drawDown({ u = -1, sway = 2, sway2 = -2, eye = 1, armL = -1, armR = -1, legL = { -1, 0 }, legR = { 1, 0 } }), "hurt")
  elseif view == "up" then add(drawUp({ u = -1, sway = -2, sway2 = 2, armL = -1, armR = -1 }), "hurt")
  else add(drawSide({ u = -1, ox = -1, arm = -2, sway = 3, eye = 1, front = { 2, 0 }, back = { -2, 0 } }), "hurt") end
  -- 구르기 = 기사 대시(v80): 몸을 낮추고 앞으로 기울여 돌진 — 망토가 뒤로 길게 휘날리고 다리는 크게 벌어진다(2장)
  if view == "down" then
    add(drawDown({ u = 3, legL = { -1, 2 }, legR = { 1, 0 }, armL = 2, armR = 2, sway = 3, sway2 = -3, wave = 1 }), "roll")
    add(drawDown({ u = 2, legL = { -1, 0 }, legR = { 1, 2 }, armL = 2, armR = 2, sway = 4, sway2 = -4, wave = 2 }), "roll")
  elseif view == "up" then
    add(drawUp({ u = 3, legL = { -1, 2 }, legR = { 1, 0 }, armL = 2, armR = 2, sway = -3, sway2 = 3, wave = 1 }), "roll")
    add(drawUp({ u = 2, legL = { -1, 0 }, legR = { 1, 2 }, armL = 2, armR = 2, sway = -4, sway2 = 4, wave = 2 }), "roll")
  else
    add(drawSide({ u = 3, ox = 2, arm = -3, sway = 5, eye = 2, front = { 5, 1 }, back = { -5, 0 } }), "roll")
    add(drawSide({ u = 2, ox = 2, arm = -2, sway = 4, eye = 2, front = { 4, 0 }, back = { -5, 2 } }), "roll")
  end
  -- 쓰러짐: 비틀 → 무릎 → 주저앉음 → 쓰러짐
  if view == "down" then
    add(drawDown({ u = -1, sway = 2, sway2 = -2, eye = 1 }), "death")
    add(drawDown({ u = 3, legL = { -1, 2 }, legR = { 1, 0 }, eye = 1, sway = 1, sway2 = 1 }), "death")
    add(drawDown({ u = 5, noLegs = true, eye = 1, armL = 1, armR = 1, sway = 2, sway2 = 2 }), "death")
  elseif view == "up" then
    add(drawUp({ u = -1, sway = -2, sway2 = 2 }), "death")
    add(drawUp({ u = 3, legL = { -1, 2 }, legR = { 1, 0 } }), "death")
    add(drawUp({ u = 5, noLegs = true, armL = 1, armR = 1 }), "death")
  else
    add(drawSide({ u = -1, ox = -1, arm = -2, sway = 3, eye = 1 }), "death")
    add(drawSide({ u = 3, arm = 1, sway = 1, eye = 1, front = { 2, 2 }, back = { -2, 0 } }), "death")
    add(drawSide({ u = 5, noLegs = true, arm = 2, sway = 0, eye = 1 }), "death")
  end
  add(drawFallen(), "death")
  return out
end

-- ----------------------------------------------------------- v84 갑주 외형 6종(팔레트 + 투구 · 견갑 · 망토 끝단 파츠)
local function S(b, x, y, c) L.set(b, math.floor(x + 0.5), math.floor(y + 0.5), c) end
local function MX(ox, x) return 33 + 2 * ox - x end          -- 정면/뒷면 좌우 대칭 x
local function pair(b, ox, x, y, c) S(b, x, y, c); S(b, MX(ox, x), y, c) end
local function pline(b, ox, x0, y0, x1, y1, c) L.line(b, x0, y0, x1, y1, c); L.line(b, MX(ox, x0), y0, MX(ox, x1), y1, c) end

local BONE = { "#5a4a32", "#8a7a5a", "#c8b890", "#efe4c8" }
local IVORY = { "#6a5a48", "#b0a088", "#e8dcc4", "#fffaf0" }
local DGOLD = { "#4a3410", "#8a6420", "#d0a038", "#ffe48a" }

OUTFITS = {
  -- 기본: 방랑자의 외투 — 깃 세운 가죽 코트 + 사냥꾼 두건(흙빛 가죽 · 호박색 눈)
  { id = "coat", sheet = "knight",
    hood = { "#17120e", "#271e16", "#3a2c20", "#54402c", "#86684a" }, cape = { "#120e0b", "#1e1712", "#2b2119", "#3a2d22" }, lining = { "#2a1a10", "#4a2e1a", "#6a4224" },
    steel = { "#1c1e24", "#30333b", "#4c5058", "#727680", "#a8acb4" }, gold = { "#4a3018", "#7a5228", "#a8783a", "#d8aa66" },
    leather = { "#1e130c", "#33221a", "#4c3424", "#6a4c34" }, trouser = { "#141218", "#211e26", "#2e2a34" }, eye1 = "#e8b860", eye2 = "#fff0c0",
    deco = function(b, v, ox, u)
      if v == "down" then pair(b, ox, 12 + ox, 14 + u, "#5a4430"); pair(b, ox, 12 + ox, 13 + u, "#3a2c20"); pair(b, ox, 11 + ox, 13 + u, "#2a2016")   -- 세운 깃
        L.vline(b, 14 + ox, 17 + u, 21 + u, "#2b2119"); L.vline(b, 19 + ox, 17 + u, 21 + u, "#2b2119")   -- 코트 앞섶
        L.line(b, 13 + ox, 17 + u, 19 + ox, 21 + u, "#4c3424")   -- 사냥꾼 가죽 끈
      elseif v == "up" then pair(b, ox, 12 + ox, 13 + u, "#3a2c20"); L.hline(b, 13 + ox, 20 + ox, 14 + u, "#2a2016")
      else S(b, 18 + ox, 14 + u, "#5a4430"); S(b, 18 + ox, 13 + u, "#3a2c20"); S(b, 17 + ox, 13 + u, "#2a2016") end
    end },
  -- ① 거목의 수호갑주 — 거대한 사슴 왕관뿔 숲지기 투구 + 나무껍질 중갑 + 녹색 덩굴 망토
  { id = "moss", sheet = "knight_moss",
    hood = { "#16100a", "#281c12", "#3c2a1a", "#563e26", "#7a5a38" }, cape = { "#0c180e", "#132816", "#1c3a1f", "#28502a" }, lining = { "#2a4a1c", "#3e6a24", "#5a8a30" },
    steel = { "#1c140c", "#33251a", "#4e3a26", "#6c5236", "#937048" }, gold = { "#1e3a16", "#2e5a20", "#4e8a32", "#8ac85a" },
    eye1 = "#8aff6a", eye2 = "#e0ffd0",
    deco = function(b, v, ox, u)
      local A = BONE
      if v ~= "side" then
        pline(b, ox, 13 + ox, 8 + u, 10 + ox, 3 + u, A[2]); pline(b, ox, 10 + ox, 3 + u, 8 + ox, 0 + u, A[3])     -- 큰 줄기
        pline(b, ox, 11 + ox, 5 + u, 13 + ox, 1 + u, A[3]); pline(b, ox, 10 + ox, 4 + u, 7 + ox, 4 + u, A[2])       -- 가지
        pair(b, ox, 8 + ox, 0 + u, A[4]); pair(b, ox, 13 + ox, 1 + u, A[4]); pair(b, ox, 7 + ox, 4 + u, A[3])
        if v == "down" then pair(b, ox, 13 + ox, 9 + u, "#4e8a32"); S(b, 16 + ox, 7 + u, "#8ac85a") end   -- 투구의 이끼
      else
        L.line(b, 14 + ox, 8 + u, 11 + ox, 3 + u, A[2]); L.line(b, 11 + ox, 3 + u, 9 + ox, 0 + u, A[3]); L.line(b, 12 + ox, 5 + u, 14 + ox, 1 + u, A[3]); S(b, 9 + ox, 0 + u, A[4])
        L.line(b, 17 + ox, 7 + u, 19 + ox, 3 + u, A[2]); S(b, 20 + ox, 2 + u, A[3]); S(b, 15 + ox, 7 + u, "#4e8a32")
      end
    end,
    pauldron = function(b, cx, cy) L.shadeEllipse(b, cx, cy, 2.9, 2.2, { "#1c140c", "#33251a", "#4e3a26", "#6c5236" }, 0.05); S(b, cx - 1, cy - 2, "#4e8a32"); S(b, cx, cy - 2, "#8ac85a"); S(b, cx + 1, cy - 1, "#2e5a20") end,
    edge = function(b, bl, br, bot, wave) for x = bl, br, 2 do L.set(b, x, bot + 1, ((x + wave) % 4 == 0) and "#8ac85a" or "#2e5a20") end end },
  -- ② 수정의 결계갑주 — 푸른 수정 볏의 성기사 바이저 투구 + 은백 각진 갑주
  { id = "crystal", sheet = "knight_crystal",
    hood = { "#262c3a", "#444e62", "#727e98", "#a8b4cc", "#e2eaf8" }, cape = { "#141e2e", "#1c2a40", "#263a58", "#345078" }, lining = { "#3a6a9a", "#5a9ad0", "#8ad0f0" },
    steel = { "#363e52", "#646e88", "#9aa6be", "#ccd6e6", "#f4f8ff" }, gold = { "#2a5a8a", "#3a8ac8", "#6ac0f0", "#c8f4ff" },
    eye1 = "#8ad8ff", eye2 = "#ffffff", face0 = "#2a3040",
    deco = function(b, v, ox, u)
      local C = { "#2a5a8a", "#3a8ac8", "#6ac0f0", "#c8f4ff" }
      if v == "down" then
        L.rect(b, 13 + ox, 11 + u, 7, 3, "#646e88"); L.hline(b, 13 + ox, 19 + ox, 12 + u, "#0a0e18"); S(b, 14 + ox, 12 + u, "#c8f4ff"); S(b, 18 + ox, 12 + u, "#c8f4ff")   -- 바이저
        L.vline(b, 16 + ox, 13 + u, 14 + u, "#9aa6be")
      elseif v == "side" then L.rect(b, 18 + ox, 11 + u, 4, 3, "#646e88"); L.hline(b, 18 + ox, 21 + ox, 12 + u, "#0a0e18"); S(b, 20 + ox, 12 + u, "#c8f4ff") end
      local x0 = v == "side" and 15 + ox or 16 + ox
      L.vline(b, x0, 2 + u, 7 + u, C[3]); L.vline(b, x0 + 1, 0 + u, 7 + u, C[4]); S(b, x0 + 1, 0 + u, "#ffffff")   -- 수정 볏
      L.vline(b, x0 - 2, 4 + u, 7 + u, C[2]); L.vline(b, x0 + 3, 4 + u, 7 + u, C[2]); S(b, x0 - 2, 4 + u, C[4]); S(b, x0 + 3, 4 + u, C[4])
    end,
    pauldron = function(b, cx, cy) L.rect(b, cx - 3, cy - 1, 6, 3, "#9aa6be"); L.hline(b, cx - 3, cx + 2, cy - 1, "#f4f8ff"); L.hline(b, cx - 3, cx + 2, cy + 1, "#646e88"); S(b, cx, cy - 2, "#6ac0f0"); S(b, cx, cy - 3, "#c8f4ff"); S(b, cx - 1, cy - 2, "#3a8ac8") end },
  -- ③ 홍련의 가시갑주 — 붉은 오니 뿔 가면 + 검은 가시 견갑 + 진홍 무사 갑옷
  { id = "thorn", sheet = "knight_thorn",
    hood = { "#0c090a", "#1a1214", "#2a1e22", "#3c2c30", "#584246" }, cape = { "#260608", "#40090e", "#5c0e16", "#7c1820" }, lining = { "#1a0a0a", "#2a1010", "#3e1616" },
    steel = { "#36090e", "#5a0f18", "#86182a", "#b42e3c", "#dc5c66" }, gold = { "#140e10", "#2a2024", "#c89a3a", "#f0d070" },
    eye1 = "#ffe066", eye2 = "#fff8c0",
    deco = function(b, v, ox, u)
      if v == "down" then
        L.ellipse(b, 16.5 + ox, 12.6 + u, 3.4, 2.7, "#b8202e"); L.hline(b, 14 + ox, 18 + ox, 11 + u, "#5a0a12")   -- 오니 가면 · 찡그린 눈썹
        S(b, 14 + ox, 12 + u, "#ffe066"); S(b, 18 + ox, 12 + u, "#ffe066"); S(b, 15 + ox, 14 + u, "#fffaf0"); S(b, 18 + ox, 14 + u, "#fffaf0"); L.hline(b, 16 + ox, 17 + ox, 14 + u, "#3a0408")
      elseif v == "side" then L.ellipse(b, 19.8 + ox, 12.6 + u, 2.4, 2.5, "#b8202e"); S(b, 20 + ox, 12 + u, "#ffe066"); S(b, 21 + ox, 14 + u, "#fffaf0"); S(b, 19 + ox, 11 + u, "#5a0a12") end
      if v ~= "side" then pline(b, ox, 13 + ox, 8 + u, 11 + ox, 3 + u, IVORY[2]); pline(b, ox, 12 + ox, 7 + u, 11 + ox, 4 + u, IVORY[3]); pair(b, ox, 11 + ox, 2 + u, IVORY[4])   -- 오니 뿔
      else L.line(b, 17 + ox, 8 + u, 19 + ox, 3 + u, IVORY[2]); S(b, 19 + ox, 2 + u, IVORY[4]); L.line(b, 14 + ox, 8 + u, 13 + ox, 4 + u, IVORY[1]) end
    end,
    pauldron = function(b, cx, cy) L.shadeEllipse(b, cx, cy, 2.8, 2.1, { "#0c090a", "#1a1214", "#2a1e22", "#3c2c30" }, 0.04); S(b, cx - 2, cy - 2, "#3c2c30"); S(b, cx, cy - 3, "#584246"); S(b, cx + 2, cy - 2, "#3c2c30"); S(b, cx, cy - 2, "#2a1e22"); L.hline(b, cx - 2, cx + 2, cy + 1.5, "#86182a") end,
    edge = function(b, bl, br, bot, wave) for x = bl, br, 3 do L.set(b, x, bot + 1, "#86182a") end end },
  -- ④ 설원의 빙랑갑주 — 흰 늑대 머리 가죽 두건 + 두꺼운 털가죽 어깨 · 망토
  { id = "frost", sheet = "knight_frost",
    hood = { "#5e6c7c", "#8c9cac", "#bcc8d4", "#dfe7ef", "#ffffff" }, cape = { "#56646f", "#84929f", "#b0bcc8", "#d6dee6" }, lining = { "#8aa0b8", "#a8bcd0", "#c8d8e8" },
    steel = { "#1c2836", "#324458", "#4e6882", "#7694ae", "#b2cade" }, gold = { "#3a6a8a", "#5aa0c8", "#8ad2ea", "#e4fdff" },
    eye1 = "#8ae8ff", eye2 = "#e4fdff",
    deco = function(b, v, ox, u)
      local F = { "#8c9cac", "#bcc8d4", "#dfe7ef", "#ffffff" }
      if v ~= "side" then
        L.poly(b, { { 11 + ox, 8 + u }, { 12 + ox, 3 + u }, { 14.5 + ox, 7 + u } }, F[3]); L.poly(b, { { MX(ox, 11 + ox), 8 + u }, { MX(ox, 12 + ox), 3 + u }, { MX(ox, 14.5 + ox), 7 + u } }, F[3])   -- 늑대 귀
        pair(b, ox, 12 + ox, 5 + u, "#b89aa0"); pair(b, ox, 12 + ox, 3 + u, F[4])
        if v == "down" then L.rect(b, 14 + ox, 7 + u, 5, 3, F[2]); L.hline(b, 14 + ox, 18 + ox, 7 + u, F[4]); S(b, 16 + ox, 10 + u, "#1a1a22"); S(b, 17 + ox, 10 + u, "#1a1a22"); pair(b, ox, 14 + ox, 8 + u, "#1a1a22") end   -- 이마 위의 늑대 주둥이 · 코 · 눈
      else
        L.poly(b, { { 13 + ox, 8 + u }, { 14 + ox, 3 + u }, { 16 + ox, 7 + u } }, F[3]); S(b, 14 + ox, 4 + u, F[4])
        L.rect(b, 18 + ox, 8 + u, 5, 2, F[2]); L.hline(b, 18 + ox, 22 + ox, 8 + u, F[4]); S(b, 23 + ox, 9 + u, "#1a1a22"); S(b, 19 + ox, 7 + u, "#1a1a22")   -- 앞으로 나온 주둥이
      end
    end,
    pauldron = function(b, cx, cy) L.shadeEllipse(b, cx, cy, 3.3, 2.5, { "#8c9cac", "#bcc8d4", "#dfe7ef", "#ffffff" }, 0.1); S(b, cx - 2, cy + 2, "#bcc8d4"); S(b, cx + 1, cy + 2, "#dfe7ef") end,
    edge = function(b, bl, br, bot, wave) for x = bl, br do if (x + wave) % 2 == 0 then L.set(b, x, bot + 1, "#dfe7ef") end end end },
  -- ⑤ 아스트랄 용린갑주 — 검은 고룡의 두 뿔 투구 + 흑금 비늘 갑옷 + 용 날개 망토
  { id = "astral", sheet = "knight_astral",
    hood = { "#06060c", "#10101c", "#1c1c2e", "#2c2c44", "#46466a" }, cape = { "#08060e", "#140e20", "#201634", "#2e2048" }, lining = { "#3a2a10", "#6a4a18", "#a07a28" },
    steel = { "#0c0c14", "#1a1a28", "#2a2a40", "#3e3e5a", "#5e5e86" }, gold = DGOLD,
    eye1 = "#ffd866", eye2 = "#fff6c0",
    deco = function(b, v, ox, u)
      if v ~= "side" then
        pline(b, ox, 13 + ox, 8 + u, 10 + ox, 5 + u, "#2c2c44"); pline(b, ox, 10 + ox, 5 + u, 8 + ox, 1 + u, "#46466a"); pair(b, ox, 8 + ox, 0 + u, DGOLD[3])   -- 고룡의 두 뿔
        pline(b, ox, 12 + ox, 8 + u, 9 + ox, 5 + u, DGOLD[2])
        if v == "down" then L.hline(b, 14 + ox, 18 + ox, 12 + u, DGOLD[3]); L.vline(b, 16 + ox, 6 + u, 9 + u, DGOLD[2]); S(b, 16 + ox, 13 + u, DGOLD[1]) end   -- 금빛 눈 틈 · 이마 볏
      else
        L.line(b, 14 + ox, 8 + u, 10 + ox, 5 + u, "#2c2c44"); L.line(b, 10 + ox, 5 + u, 8 + ox, 1 + u, "#46466a"); S(b, 8 + ox, 0 + u, DGOLD[3]); L.line(b, 16 + ox, 7 + u, 14 + ox, 3 + u, DGOLD[2])
        L.hline(b, 19 + ox, 21 + ox, 12 + u, DGOLD[3])
      end
    end,
    pauldron = function(b, cx, cy) L.shadeEllipse(b, cx, cy, 2.9, 2.2, { "#0c0c14", "#1a1a28", "#2a2a40", "#3e3e5a" }, 0.05); L.hline(b, cx - 2, cx + 2, cy + 1.6, DGOLD[3]); S(b, cx + 1, cy - 2, DGOLD[2]); S(b, cx + 2, cy - 3, DGOLD[3]) end,
    edge = function(b, bl, br, bot, wave) for x = bl, br, 3 do L.set(b, x, bot + 1, "#140e20"); L.set(b, x, bot + 2, "#08060e") end end }
}

local ARMS = {}
for _, OF in ipairs(OUTFITS) do
  CUR = OF; HOOD = OF.hood; CAPE = OF.cape; LINING = OF.lining; STEEL = OF.steel; GOLD = OF.gold; LEATHER = OF.leather or LEATHER; TROUSER = OF.trouser or TROUSER; EYE1 = OF.eye1; EYE2 = OF.eye2; FACE0 = OF.face0 or FACE0
  frames = {}
for _, view in ipairs({ "down", "up", "right" }) do
  for _, f in ipairs(viewFrames(view)) do frames[#frames + 1] = f end
end
-- 왼쪽 = 오른쪽 좌우 반전(태그만 바꾼다)
for i = 41, 60 do
  local f = frames[i]
  frames[#frames + 1] = { buf = L.mirror(f.buf), tag = f.tag:gsub("^right", "left") }
end

if OF.sheet == "knight" then L.saveAnimation(OUT .. "/knight.aseprite", W, H, frames, "knight", 110) end
L.savePNG(OUT .. "/" .. OF.sheet .. ".png", L.sheet(frames, W, H, 20))

-- 칼집에 꽂힌 검(등 뒤)과 공격 어깨의 위치 — 프레임 안 좌표(연속 좌표, 왼쪽 = 32 - x 로 반전)
meta.sheath = {   -- { 손잡이 축 x, y, 각도(도), 몸보다 먼저 그리나 }
  down = { 11.0, 12.5, 50, true },
  up = { 21.5, 13.5, 122, false },
  right = { 12.5, 15.0, 112, false },
  left = { 19.5, 15.0, 68, false }
}
meta.shoulder = { down = { 11.0, 17.5 }, up = { 22.0, 17.5 }, right = { 17.0, 17.5 }, left = { 15.0, 17.5 } }
  meta.outfit = OF.id
  L.writeFile(OUT .. "/" .. OF.sheet .. ".json", L.json(meta))
  ARMS[OF.id] = armSpriteNow and armSpriteNow() or nil
end
meta.outfit = nil
CUR = nil
do local O1 = OUTFITS[1]; HOOD = O1.hood; CAPE = O1.cape; LINING = O1.lining; STEEL = O1.steel; GOLD = O1.gold; LEATHER = O1.leather; TROUSER = O1.trouser; EYE1 = O1.eye1; EYE2 = O1.eye2 end


-- ==========================================================================
-- 검 / 검기 / 공격 팔
-- 검은 오른쪽을 가리키는 18×7 그림, 손잡이 축 = (3, 3). 단계 0 강철 → 1 청록 룬 → 2 룬 + 보랏빛 날 → 3 황금 코등이 + 금빛 룬.
-- ==========================================================================
local RUNE = { { "#2c7f8c", "#5fd8f0", "#c8fbff" }, { "#2c7f8c", "#5fd8f0", "#c8fbff" }, { "#5a3a9a", "#9f7bff", "#e6dcff" }, { "#a8761e", "#ffd36a", "#fff6d0" } }
local function sword(tier, k)
  local b = L.new(18, 7)
  local guard = tier >= 3 and { GOLD[2], GOLD[3], GOLD[4] } or { GOLD[1], GOLD[2], GOLD[3] }
  -- 칼날 x5..15 (3줄), 끝 x16..17
  for x = 5, 15 do
    L.set(b, x, 2, tier >= 2 and L.mix(STEEL[5], "#bff6ff", 0.35) or STEEL[5])
    L.set(b, x, 3, STEEL[3])
    L.set(b, x, 4, STEEL[2])
  end
  L.set(b, 16, 2, STEEL[4]); L.set(b, 16, 3, STEEL[3]); L.set(b, 17, 3, STEEL[4])
  -- 홈(fuller)에 흐르는 룬
  if tier >= 1 then
    local R = RUNE[tier + 1]
    for x = 6, 14 do
      local ph = (x + k) % 4
      L.set(b, x, 3, ph == 0 and R[3] or (ph == 1 and R[2] or (ph == 3 and R[1] or STEEL[3])))
    end
    if tier >= 2 then L.set(b, 6 + ((k * 3) % 9), 2, R[3]) end
    if tier >= 3 then L.set(b, 6 + ((k * 3 + 4) % 9), 4, RUNE[2][2]) end
  else
    L.hline(b, 6, 13, 3, STEEL[4])
  end
  -- 코등이, 손잡이, 칼끝 장식
  L.vline(b, 4, 0, 6, guard[2]); L.set(b, 4, 0, guard[3]); L.set(b, 4, 6, guard[1]); L.set(b, 4, 3, tier >= 1 and RUNE[tier + 1][2] or guard[3])
  L.hline(b, 1, 3, 3, LEATHER[3]); L.set(b, 2, 3, LEATHER[4])
  L.set(b, 0, 3, guard[3]); L.set(b, 0, 2, guard[2]); L.set(b, 0, 4, guard[1])
  L.outline(b, OL)
  return b
end
local function glow(tier)
  local b = L.new(26, 11)
  local col = ({ "#5fd8f0", "#9f7bff", "#ffd36a" })[tier]
  L.each(b, 0, 0, 25, 10, function(x, y)
    local dx, dy = (x + 0.5 - 15) / 11.5, (y + 0.5 - 5.5) / 4.6
    local d = dx * dx + dy * dy
    if d < 1 then return L.alpha(col, math.floor((1 - d) * (1 - d) * 150)) end
  end)
  return b
end
local function armSprite()
  -- 어깨(견갑)에서 손까지 오른쪽을 가리키는 팔 8×6, 축 = (2, 3)
  local b = L.new(8, 6)
  L.shadeEllipse(b, 2.5, 2.8, 2.4, 2.2, STEEL, 0.06)
  L.hline(b, 1, 3, 4, GOLD[2])
  L.hline(b, 4, 6, 2, HOOD[3]); L.hline(b, 4, 6, 3, HOOD[2])
  L.set(b, 6, 2, STEEL[4]); L.set(b, 6, 3, STEEL[3]); L.set(b, 7, 2, STEEL[3]); L.set(b, 7, 3, STEEL[2])
  L.outline(b, OL)
  return b
end

local items = {}
for tier = 0, 3 do for k = 0, 3 do items[#items + 1] = { name = "sword" .. tier .. "_" .. k, buf = sword(tier, k), ax = 3, ay = 3 } end end
for tier = 1, 3 do items[#items + 1] = { name = "glow" .. tier, buf = glow(tier), ax = 7, ay = 5 } end
items[#items + 1] = { name = "arm", buf = armSprite(), ax = 2, ay = 3 }
for _, OF in ipairs(OUTFITS) do HOOD = OF.hood; STEEL = OF.steel; GOLD = OF.gold; items[#items + 1] = { name = "arm_" .. OF.id, buf = armSprite(), ax = 2, ay = 3 } end   -- v84 갑주별 팔
local sheet, placed = L.atlas(items, 128, 1)
L.saveAtlas(OUT .. "/gear.aseprite", OUT .. "/gear.png", sheet, placed)
local gm = {}
for _, it in ipairs(placed) do gm[it.name] = { it.x, it.y, it.buf.w, it.buf.h, it.ax, it.ay } end
L.writeFile(OUT .. "/gear.json", L.json(gm))
print("knight: " .. #frames .. " frames x " .. #OUTFITS .. " outfits, gear: " .. #placed .. " items")
