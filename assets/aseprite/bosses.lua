-- ==========================================================================
-- bosses.lua — v80 『SOUL TEMPEST』 보스 5종의 본체 공격 애니메이션 + 신규 구역 짐승 4종 (시트 'bs')
--   aseprite -b --script-param dir=<이 폴더> --script-param out=<assets/sprites> --script bosses.lua
-- 결과: bs.aseprite(슬라이스 = 이름), bs.png, bs.json { items: { 이름: [x, y, w, h, ax, ay] } } — 기준점 = 발 가운데(바닥)
-- 보스 그림 이름: <b1~b5>_<자세>[_x]   자세 = idle0 · idle1 · wind(예비 동작) · strike(타격) · wind2 · alt(두 번째 공격) · (b5) wind3 · alt2
--                                       _x = 부위 파괴 뒤(왕관뿔 · 수정외피 · 가시핵 · 서리 송곳니 · 태초의 용옥이 부서진 모습)
--   b1 고대 거목 수호자   : 양팔을 머리 위로(wind) → 내려찍기(strike) · 팔을 뒤로 젖힘(wind2) → 휩쓸기(alt)
--   b2 수정 갑주 골렘     : 두 팔을 합쳐 머리 위 해머(wind) → 내려찍기(strike) · 팔 벌림(wind2) → 회전(alt)
--   b3 심연의 가시 군주   : 촉수 셋을 치켜듦(wind) → 내려찍기(strike) · 가시핵이 열림(wind2) → 가시 탄막(alt)
--   b4 빙하의 서리 송곳니 : 앞발을 치켜든 채 일어섬(wind) → 도약 할퀴기(strike) · 고개를 젖혀 숨 들이킴(wind2) → 냉기 브레스(alt)
--   b5 폭풍의 고룡 아스트랄: 날개를 높이 펼침(wind) → 내리쳐 칼바람(strike) · 몸을 감음(wind2) → 꼬리 휩쓸기(alt) · 고개를 듦(wind3) → 번개 브레스(alt2)
-- 짐승: wolf(설원 늑대) · wisp(얼음 정령) · lgolem(용암 골렘) · lizard(화산 도마뱀) — <이름>_0 · _1(걷기/숨) · _wind · _atk, 오른쪽을 본다
-- ==========================================================================
local DIR = app.params.dir
local OUT = app.params.out
package.path = DIR .. "/?.lua;" .. package.path
local L = require("lib")

local OL = "#0a0a12"
local BARK = { "#1f1510", "#33241a", "#4a3624", "#664c33", "#866848", "#a8885e" }
local MOSS = { "#14301c", "#1d4427", "#285c33", "#367a40", "#4f9a4c", "#7cc062" }
local STONE = { "#1f242c", "#323a45", "#4a5462", "#66727f", "#8995a2", "#b4bfcb" }
local CRY = { "#22123e", "#3a2070", "#5c38a8", "#8a64e0", "#c4a8ff", "#efe4ff" }
local TEAL = { "#0c3442", "#145a6e", "#1f8aa0", "#3fc0d8", "#8ae8f8", "#e4fdff" }
local THORN = { "#1a2414", "#26361f", "#34502a", "#4a6e36", "#679048" }
local CRIM = { "#3a0814", "#6a1024", "#a01c34", "#d8364e", "#ff7a8a", "#ffc0c8" }
local FUR = { "#5a6a80", "#8a9ab0", "#b8c8d8", "#dce6f0", "#f4f8ff", "#ffffff" }
local ICE = { "#1a4a6a", "#2f6e94", "#5aa0c8", "#8ad2ea", "#c8f0ff", "#ffffff" }
local DRAG = { "#040408", "#0a0c16", "#141828", "#20283e", "#30405e", "#4a5e8a" }
local STORM = { "#14284a", "#2a5a9a", "#4a9ae0", "#9ad8ff", "#eef6ff", "#ffffff" }
local LAVA = { "#5a0e06", "#a82a10", "#e8581c", "#ff9a3c", "#ffd070", "#fff4c0" }
local OBS = { "#08060c", "#141018", "#221a2a", "#3a3048", "#5a4a70", "#8a7aa8" }
local SCALE = { "#3a1410", "#5a2418", "#7a3420", "#9a4a28", "#c87038" }

local items = {}
local function add(name, buf, ax, ay) items[#items + 1] = { name = name, buf = buf, ax = ax, ay = ay } end

-- 굵은 팔다리: (x0,y0) → (x1,y1) 를 반지름 r0 → r1 의 원으로 쭉 찍는다(빛은 왼쪽 위)
local function limb(b, x0, y0, x1, y1, r0, r1, ramp, bias)
  local n = math.max(2, math.floor(math.sqrt((x1 - x0) ^ 2 + (y1 - y0) ^ 2)))
  for k = 0, n do local t = k / n; L.shadeEllipse(b, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, r0 + (r1 - r0) * t, ramp, bias or 0) end
end
local function glowDot(b, x, y, c1, c2) L.set(b, x, y, c1); if c2 then L.set(b, x + 1, y, c2); L.set(b, x - 1, y, c2); L.set(b, x, y - 1, c2); L.set(b, x, y + 1, c2) end end
local function sparkles(b, seed, n, x0, y0, x1, y1, c) local r = L.rng(seed); for _ = 1, n do local x, y = math.floor(x0 + r() * (x1 - x0)), math.floor(y0 + r() * (y1 - y0)); if L.get(b, x, y) then L.set(b, x, y, c) end end end

-- ==========================================================================
-- 1 고대 거목 수호자(74×84, 발 = 37, 82)
-- ==========================================================================
local function treant(pose, broken)
  local b = L.new(74, 84)
  local cx, base = 37, 82
  local lean = (pose == "strike") and 3 or (pose == "alt" and 2 or 0)
  local bob = (pose == "idle1") and 1 or 0
  local tw = (pose == "wind2") and -3 or (pose == "alt" and 3 or 0)   -- 몸통 비틀림
  -- 뿌리 다리
  limb(b, cx - 9, base - 22, cx - 13, base - 3, 6, 5, BARK, 0.02); limb(b, cx + 9, base - 22, cx + 13, base - 3, 6, 5, BARK, 0.0)
  for _, rt in ipairs({ { -19, 0 }, { -11, 1 }, { 9, 1 }, { 18, 0 } }) do L.line(b, cx + rt[1] * 0.7, base - 3, cx + rt[1], base, BARK[2]); L.hline(b, cx + rt[1] - 2, cx + rt[1] + 2, base, BARK[3]) end
  -- 몸통(나무 줄기 통)
  local ty = base - 44 + bob + lean
  L.shadeEllipse(b, cx + tw, ty + 6, 17, 22, BARK, 0.04)
  for y = ty - 10, ty + 24, 4 do L.hline(b, cx + tw - 12 + (y % 3), cx + tw + 11 - (y % 5), y, BARK[2]) end
  -- 이끼 어깨 망토
  L.shadeEllipse(b, cx + tw - 13, ty - 9, 9, 6, MOSS, 0.05); L.shadeEllipse(b, cx + tw + 13, ty - 9, 9, 6, MOSS, 0.0); L.shadeEllipse(b, cx + tw, ty - 12, 13, 6, MOSS, 0.04)
  sparkles(b, 11, 18, cx - 24, ty - 18, cx + 24, ty - 4, MOSS[6])
  -- 머리(줄기 위 옹이 얼굴): 눈은 청록 빛
  local hy = ty - 18 + (pose == "strike" and 3 or 0)
  L.shadeEllipse(b, cx + tw, hy, 9, 8, BARK, 0.06)
  L.ellipse(b, cx + tw, hy + 1, 6, 4, "#0e0804")
  glowDot(b, cx + tw - 3, hy, TEAL[6], TEAL[4]); glowDot(b, cx + tw + 3, hy, TEAL[6], TEAL[4])
  L.hline(b, cx + tw - 3, cx + tw + 3, hy + 4, BARK[1])
  -- 왕관뿔(부위): 갈라지는 사슴뿔 — 파괴되면 부러진 그루터기만
  local top = hy - 8
  local function antler(d)
    local x0 = cx + tw + d * 5
    if broken then L.line(b, x0, top + 2, x0 + d * 2, top - 2, BARK[3]); L.set(b, x0 + d * 2, top - 3, BARK[6]); L.set(b, x0 + d * 3, top - 2, "#c8b890"); return end
    L.line(b, x0, top + 2, x0 + d * 8, top - 12, BARK[5]); L.line(b, x0 + d, top + 2, x0 + d * 9, top - 12, BARK[4])
    L.line(b, x0 + d * 4, top - 5, x0 + d * 1, top - 14, BARK[5]); L.line(b, x0 + d * 8, top - 12, x0 + d * 14, top - 15, BARK[5]); L.line(b, x0 + d * 6, top - 9, x0 + d * 12, top - 6, BARK[4])
    L.set(b, x0 + d * 1, top - 15, MOSS[6]); L.set(b, x0 + d * 14, top - 16, MOSS[6]); L.set(b, x0 + d * 15, top - 15, "#fff6c0"); L.set(b, x0 + d * 12, top - 7, MOSS[5])
  end
  antler(-1); antler(1)
  -- 팔(통나무 팔 + 잔가지 손가락): 자세마다
  local sL, sR = { cx + tw - 17, ty - 6 }, { cx + tw + 17, ty - 6 }
  local hL, hR
  if pose == "wind" then hL, hR = { cx - 8, ty - 46 }, { cx + 8, ty - 46 }
  elseif pose == "strike" then hL, hR = { cx - 10, base - 6 }, { cx + 10, base - 6 }
  elseif pose == "wind2" then hL, hR = { cx - 30, ty + 8 }, { cx + 34, ty - 18 }
  elseif pose == "alt" then hL, hR = { cx - 30, ty + 10 }, { cx - 34, ty + 4 }
  else hL, hR = { cx - 24, ty + 20 + bob }, { cx + 24, ty + 20 + bob } end
  local function arm(s, h, d)
    limb(b, s[1], s[2], h[1], h[2], 6, 4.2, BARK, d < 0 and 0.06 or -0.02)
    for k = -1, 1 do L.line(b, h[1], h[2], h[1] + k * 4 + d * 2, h[2] + (h[2] < s[2] and -6 or 6), BARK[4]) end
    L.set(b, h[1] + d, h[2] - 1, MOSS[5])
  end
  arm(sL, hL, -1); arm(sR, hR, 1)
  if pose == "strike" then for k = 0, 6 do L.set(b, cx - 18 + k * 6, base - 1, "#a08a6a") end end
  if pose == "alt" then for k = 0, 4 do L.line(b, cx + 22 - k * 6, ty - 14 + k * 5, cx + 30 - k * 6, ty - 12 + k * 5, "#d8c8a0") end end   -- 휩쓴 자리
  L.outline(b, OL)
  return b
end

-- ==========================================================================
-- 2 수정 갑주 골렘(82×80, 발 = 41, 78)
-- ==========================================================================
local function golem(pose, broken)
  local b = L.new(82, 80)
  local cx, base = 41, 78
  local bob = (pose == "idle1") and 1 or 0
  local crouch = pose == "strike" and 4 or 0
  -- 다리(돌기둥)
  limb(b, cx - 10, base - 22, cx - 12, base - 4, 7, 6, STONE, 0.02); limb(b, cx + 10, base - 22, cx + 12, base - 4, 7, 6, STONE, -0.02)
  L.hline(b, cx - 19, cx - 5, base, STONE[2]); L.hline(b, cx + 5, cx + 19, base, STONE[2])
  -- 몸통(큰 돌 덩이)
  local ty = base - 40 + bob + crouch
  L.shadeEllipse(b, cx, ty, 21, 18, STONE, 0.04)
  L.line(b, cx - 12, ty - 6, cx - 4, ty + 6, STONE[2]); L.line(b, cx + 8, ty - 10, cx + 14, ty + 2, STONE[2])
  -- 수정외피(부위): 어깨와 등의 수정 군락 — 파괴되면 깨진 파편과 드러난 비전핵
  local function crystal(x, y, h, w)
    L.shadePoly(b, { { x - w, y }, { x - 1, y - h }, { x + 1, y - h }, { x + w, y } }, CRY, 0.12); L.vline(b, x - 1, y - h + 2, y - 1, CRY[6])
  end
  if not broken then
    crystal(cx - 16, ty - 12, 14, 4); crystal(cx - 7, ty - 16, 18, 5); crystal(cx + 4, ty - 17, 20, 5); crystal(cx + 15, ty - 13, 14, 4); crystal(cx - 22, ty - 4, 8, 3); crystal(cx + 21, ty - 4, 9, 3)
  else
    for _, c in ipairs({ { -16, -12 }, { -7, -16 }, { 4, -17 }, { 15, -13 } }) do L.poly(b, { { cx + c[1] - 3, ty + c[2] }, { cx + c[1], ty + c[2] - 5 }, { cx + c[1] + 3, ty + c[2] } }, CRY[2]); L.set(b, cx + c[1], ty + c[2] - 4, CRY[4]) end
    L.line(b, cx - 14, ty - 8, cx - 2, ty + 2, "#0b1016"); L.line(b, cx + 3, ty - 12, cx + 12, ty, "#0b1016")
    L.shadeEllipse(b, cx, ty + 2, 5, 5, TEAL, 0.25); glowDot(b, cx, ty + 1, TEAL[6], TEAL[5])
  end
  -- 머리(작은 돌 투구) + 눈빛
  local hy = ty - 18 + crouch
  L.shadeEllipse(b, cx, hy, 8, 6, STONE, 0.05); L.hline(b, cx - 5, cx + 5, hy, "#0b1016"); glowDot(b, cx - 3, hy, CRY[6]); glowDot(b, cx + 3, hy, CRY[6])
  -- 팔(돌 팔 + 수정 주먹)
  local sL, sR = { cx - 20, ty - 6 }, { cx + 20, ty - 6 }
  local hL, hR
  if pose == "wind" then hL, hR = { cx - 3, ty - 44 }, { cx + 3, ty - 44 }
  elseif pose == "strike" then hL, hR = { cx - 3, base - 8 }, { cx + 3, base - 8 }
  elseif pose == "wind2" then hL, hR = { cx - 38, ty - 8 }, { cx + 38, ty - 8 }
  elseif pose == "alt" then hL, hR = { cx - 38, ty + 2 }, { cx + 38, ty - 16 }
  else hL, hR = { cx - 28, ty + 18 + bob }, { cx + 28, ty + 18 + bob } end
  limb(b, sL[1], sL[2], hL[1], hL[2], 6, 5, STONE, 0.05); limb(b, sR[1], sR[2], hR[1], hR[2], 6, 5, STONE, -0.03)
  local joined = pose == "wind" or pose == "strike"
  if joined then   -- 두 주먹을 합친 거대한 수정 해머
    local hx, hy2 = (hL[1] + hR[1]) / 2, (hL[2] + hR[2]) / 2
    L.shadePoly(b, { { hx - 12, hy2 - 7 }, { hx + 12, hy2 - 7 }, { hx + 14, hy2 + 6 }, { hx - 14, hy2 + 6 } }, CRY, 0.15)
    L.hline(b, math.floor(hx - 11), math.floor(hx + 11), math.floor(hy2 - 6), CRY[6]); L.vline(b, math.floor(hx), math.floor(hy2 - 6), math.floor(hy2 + 5), CRY[2])
  else
    L.shadeEllipse(b, hL[1], hL[2], 6, 5, CRY, 0.15); L.shadeEllipse(b, hR[1], hR[2], 6, 5, CRY, 0.1)
  end
  if pose == "alt" then for k = 0, 8 do local t = k / 9 * math.pi * 2; L.set(b, math.floor(cx + math.cos(t) * 39), math.floor(ty - 4 + math.sin(t) * 10), CRY[5]) end end   -- 회전 궤적
  if pose == "strike" then for k = 0, 8 do L.set(b, cx - 24 + k * 6, base - 1, CRY[5]) end end
  L.outline(b, OL)
  return b
end

-- ==========================================================================
-- 3 심연의 가시 군주(80×80, 발 = 40, 78)
-- ==========================================================================
local function thornlord(pose, broken)
  local b = L.new(80, 80)
  local cx, base = 40, 78
  local bob = (pose == "idle1") and 1 or 0
  -- 뒤틀린 뿌리 발
  for _, x in ipairs({ 14, 24, 56, 66 }) do local d = x < cx and -1 or 1; L.line(b, cx + d * 8, base - 10, x, base, BARK[3]); L.line(b, cx + d * 8, base - 9, x + d, base, BARK[2]) end
  -- 덤불 몸(여러 겹)
  local ty = base - 30 + bob
  for _, l in ipairs({ { -13, 4, 13, 11 }, { 13, 4, 12, 11 }, { 0, -2, 17, 15 }, { -7, -14, 10, 8 }, { 8, -13, 10, 8 } }) do L.shadeEllipse(b, cx + l[1], ty + l[2], l[3], l[4], THORN, 0.03) end
  sparkles(b, 31, 40, cx - 26, ty - 22, cx + 26, ty + 14, THORN[5])
  sparkles(b, 32, 14, cx - 26, ty - 22, cx + 26, ty + 14, CRIM[4])
  -- 가시핵(부위): 가슴 한가운데 붉은 심장 — 열리면 빛나고, 파괴되면 금 간 채 꺼진다
  local open = pose == "wind2" or pose == "alt"
  local hy = ty - 2
  if broken then L.ellipse(b, cx, hy, 6, 5, "#14080a"); L.line(b, cx - 5, hy - 3, cx + 4, hy + 3, CRIM[2]); L.line(b, cx + 3, hy - 4, cx - 2, hy + 4, CRIM[2]); L.set(b, cx, hy, CRIM[3])
  elseif open then L.ellipse(b, cx, hy, 8, 7, "#14080a"); L.shadeEllipse(b, cx, hy, 5.5, 5, CRIM, 0.25); glowDot(b, cx, hy - 1, CRIM[6], CRIM[5]); for a = 0, 9 do local t = a / 10 * math.pi * 2; L.line(b, cx + math.cos(t) * 8, hy + math.sin(t) * 7, cx + math.cos(t) * 12, hy + math.sin(t) * 11, "#e8c8a0") end
  else L.shadeEllipse(b, cx, hy, 5, 4.5, CRIM, 0.15); L.line(b, cx - 7, hy - 4, cx + 7, hy + 4, BARK[3]); L.line(b, cx - 7, hy + 4, cx + 7, hy - 4, BARK[3]); L.set(b, cx, hy, CRIM[5]) end
  -- 눈(가시 왕관 아래 붉은 눈 넷)
  local ey = ty - 16
  for _, x in ipairs({ -7, -3, 3, 7 }) do glowDot(b, cx + x, ey + (math.abs(x) > 4 and 1 or 0), CRIM[6]) end
  -- 가시 왕관
  for k = -3, 3 do L.line(b, cx + k * 4, ey - 4, cx + k * 6, ey - 12 - (3 - math.abs(k)) * 2, "#e8c8a0") end
  -- 촉수 덩굴 셋(자세마다)
  local tips
  if pose == "wind" then tips = { { -22, -54 }, { 0, -60 }, { 22, -54 } }
  elseif pose == "strike" then tips = { { -26, 2 }, { 0, 4 }, { 26, 2 } }
  elseif pose == "alt" or pose == "wind2" then tips = { { -36, -20 }, { 0, -40 }, { 36, -20 } }
  else tips = { { -32, 8 + bob }, { -2, -38 }, { 32, 8 - bob } } end
  for i, tp in ipairs(tips) do
    local sx, sy = cx + (i - 2) * 12, ty - 8
    local mx, my = (sx + cx + tp[1]) / 2 + (i - 2) * 6, (sy + base - 30 + tp[2]) / 2 - 6
    limb(b, sx, sy, mx, my, 3.5, 3, { CRIM[1], CRIM[2], THORN[3], THORN[4] }, 0.0)
    limb(b, mx, my, cx + tp[1], base - 30 + tp[2], 3, 1.6, { CRIM[1], CRIM[2], THORN[3], THORN[4] }, 0.0)
    L.set(b, cx + tp[1], base - 30 + tp[2], "#e8c8a0")
  end
  if pose == "strike" then for k = 0, 8 do L.set(b, cx - 28 + k * 7, base - 1, CRIM[4]) end end
  L.outline(b, OL)
  return b
end

-- ==========================================================================
-- 4 빙하의 서리 송곳니 — 거대한 백호 설원 마수(옆모습, 오른쪽을 본다) 92×68, 발 = 46, 66
-- ==========================================================================
local function behemoth(pose, broken)
  local b = L.new(92, 68)
  local base = 66
  local rear = pose == "wind"          -- 앞발을 치켜들고 일어선다
  local pounce = pose == "strike"      -- 몸을 낮추고 앞으로 쭉 뻗어 할퀸다
  local inhale = pose == "wind2"
  local breath = pose == "alt"
  local bob = (pose == "idle1") and 1 or 0
  -- 몸통 축: 엉덩이(hx, hy) · 어깨(sx, sy)
  local hx, hy, sx, sy = 30, base - 22 + bob, 58, base - 26 + bob
  if rear then sx, sy = 54, base - 40 end
  if pounce then hx, hy, sx, sy = 26, base - 18, 64, base - 16 end
  if inhale then sy = sy - 3 end
  -- 꼬리(굵고 줄무늬)
  limb(b, hx - 10, hy - 2, hx - 22, hy - 14 + (pounce and 8 or 0), 4, 2.5, FUR, 0.05)
  for k = 0, 2 do L.set(b, hx - 13 - k * 3, hy - 5 - k * 3 + (pounce and k * 2 or 0), FUR[1]) end
  -- 뒷다리
  limb(b, hx - 4, hy + 4, hx - 8, base - 2, 5.5, 3.5, FUR, 0.02); limb(b, hx + 6, hy + 5, hx + 4, base - 2, 5, 3.5, FUR, 0.0)
  -- 몸통(어깨 쪽이 크다)
  local n = 16
  for k = 0, n do local t = k / n; L.shadeEllipse(b, hx + (sx - hx) * t, hy + (sy - hy) * t, 11 + t * 4, 10 + t * 3, FUR, 0.06) end
  -- 줄무늬(청회색)
  for k = 0, 4 do local t = 0.15 + k * 0.17; local x, y = hx + (sx - hx) * t, hy + (sy - hy) * t; L.line(b, x - 1, y - 10 - t * 3, x + 2, y - 4, FUR[1]); L.line(b, x + 1, y + 3, x - 1, y + 8, FUR[2]) end
  -- 등의 얼음 가시
  for k = 0, 5 do local t = 0.1 + k * 0.15; local x, y = hx + (sx - hx) * t, hy + (sy - hy) * t - 11 - t * 3; L.shadePoly(b, { { x - 2, y + 2 }, { x + 1, y - 6 - (k % 2) * 3 }, { x + 3, y + 2 } }, ICE, 0.2) end
  -- 앞다리 + 발톱
  local fL, fR
  if rear then fL, fR = { sx + 12, sy - 18 }, { sx + 18, sy - 10 }
  elseif pounce then fL, fR = { sx + 22, base - 3 }, { sx + 18, base - 2 }
  else fL, fR = { sx + 2, base - 2 }, { sx + 10, base - 2 } end
  limb(b, sx - 2, sy + 6, fL[1], fL[2], 6, 4, FUR, 0.04); limb(b, sx + 4, sy + 6, fR[1], fR[2], 5.5, 4, FUR, 0.0)
  for _, f in ipairs({ fL, fR }) do for k = -1, 1 do L.line(b, f[1] + 2, f[2] + k, f[1] + 5, f[2] + k + (rear and -2 or 1), "#f4f8ff") end end
  -- 머리
  local hdx, hdy = sx + 14, sy - 8
  if rear then hdx, hdy = sx + 8, sy - 18 end
  if pounce then hdx, hdy = sx + 16, sy - 4 end
  if inhale then hdx, hdy = sx + 8, sy - 14 end
  if breath then hdx, hdy = sx + 18, sy - 6 end
  L.shadeEllipse(b, hdx, hdy, 10, 8.5, FUR, 0.08)
  L.shadeEllipse(b, hdx + 8, hdy + 3, 6, 4.5, FUR, 0.1)   -- 주둥이
  L.poly(b, { { hdx - 6, hdy - 6 }, { hdx - 4, hdy - 13 }, { hdx - 1, hdy - 7 } }, FUR[3]); L.poly(b, { { hdx + 1, hdy - 7 }, { hdx + 3, hdy - 14 }, { hdx + 5, hdy - 7 } }, FUR[4])   -- 귀
  L.line(b, hdx - 6, hdy - 2, hdx + 2, hdy - 3, FUR[1]); L.line(b, hdx - 5, hdy + 2, hdx + 1, hdy + 1, FUR[1])
  glowDot(b, hdx + 3, hdy - 2, ICE[6], ICE[4])
  local mouthOpen = breath or pounce
  if mouthOpen then L.rect(b, hdx + 6, hdy + 4, 9, 4, "#1a0a14"); L.hline(b, hdx + 6, hdx + 14, hdy + 4, "#f4f8ff") end
  -- 서리 송곳니(부위): 입 밖으로 뻗은 거대한 얼음 송곳니 — 파괴되면 부러진 그루터기
  local fx, fy = hdx + 10, hdy + 6
  if broken then L.rect(b, fx, fy, 2, 2, "#c8d8e8"); L.rect(b, fx + 4, fy, 2, 2, "#c8d8e8")
  else L.poly(b, { { fx, fy }, { fx + 2, fy }, { fx + 3, fy + 9 } }, ICE[6]); L.poly(b, { { fx + 4, fy }, { fx + 6, fy }, { fx + 7, fy + 8 } }, ICE[5]); L.set(b, fx + 1, fy + 2, ICE[4]) end
  if breath then for k = 0, 10 do L.set(b, hdx + 16 + k * 2, hdy + 5 + ((k * 7) % 5) - 2, k % 2 == 0 and ICE[6] or ICE[4]) end end
  if inhale then for k = 0, 4 do L.set(b, hdx + 18 + k * 2, hdy + 6 - k, ICE[5]) end end
  L.outline(b, OL)
  return b
end

-- ==========================================================================
-- 5 폭풍의 고룡 아스트랄 — 흑룡(정면에 가까운 3/4) 112×92, 발 = 56, 90
-- ==========================================================================
local function dragon(pose, broken)
  local b = L.new(112, 92)
  local cx, base = 56, 90
  local bob = (pose == "idle1") and 1 or 0
  -- 날개 각도: up = 높이 펼침, down = 내리침, fold = 접음
  local wing = (pose == "wind") and "up" or (pose == "strike" and "down" or ((pose == "wind2" or pose == "alt") and "fold" or "half"))
  local ty = base - 36 + bob
  local function wingShape(d)
    local sx, sy = cx + d * 12, ty - 14
    local tip, mid
    if wing == "up" then tip, mid = { sx + d * 40, sy - 44 }, { sx + d * 30, sy - 20 }
    elseif wing == "down" then tip, mid = { sx + d * 46, sy + 26 }, { sx + d * 34, sy + 6 }
    elseif wing == "fold" then tip, mid = { sx + d * 18, sy - 18 }, { sx + d * 16, sy + 4 }
    else tip, mid = { sx + d * 44, sy - 22 }, { sx + d * 32, sy - 4 } end
    -- 날개막(어두운 청흑 + 푸른 핏줄)
    L.shadePoly(b, { { sx, sy }, { tip[1], tip[2] }, { mid[1] + d * 6, mid[2] + 18 }, { sx + d * 14, sy + 24 }, { sx + d * 4, sy + 16 } }, DRAG, d < 0 and 0.06 or -0.02)
    L.line(b, sx, sy, tip[1], tip[2], DRAG[6]); L.line(b, sx, sy + 1, tip[1], tip[2] + 1, DRAG[4])
    L.line(b, mid[1], mid[2], mid[1] + d * 6, mid[2] + 18, STORM[2]); L.line(b, (sx + tip[1]) / 2, (sy + tip[2]) / 2, sx + d * 14, sy + 22, STORM[2])
    L.set(b, tip[1], tip[2], STORM[5])
  end
  wingShape(-1); wingShape(1)
  -- 꼬리(감음 · 휩쓸기)
  if pose == "alt" then limb(b, cx + 6, ty + 18, cx + 46, base - 4, 6, 2.5, DRAG, 0.04); limb(b, cx - 6, ty + 18, cx - 44, base - 6, 5, 2.5, DRAG, 0.04); for k = 0, 9 do L.set(b, cx - 50 + k * 11, base - 2, STORM[4]) end
  elseif pose == "wind2" then limb(b, cx + 8, ty + 18, cx + 30, ty - 4, 6, 2.5, DRAG, 0.04)
  else limb(b, cx + 8, ty + 20, cx + 34, base - 3, 6, 2.5, DRAG, 0.04) end
  -- 다리
  limb(b, cx - 12, ty + 14, cx - 16, base - 3, 7, 5, DRAG, 0.05); limb(b, cx + 12, ty + 14, cx + 16, base - 3, 7, 5, DRAG, 0.0)
  for _, x in ipairs({ -20, -16, -12, 12, 16, 20 }) do L.line(b, cx + x, base - 3, cx + x + (x < 0 and -1 or 1), base, STORM[5]) end
  -- 몸통(비늘 갑피 + 푸른 배 비늘)
  L.shadeEllipse(b, cx, ty + 4, 20, 22, DRAG, -0.1)
  L.shadeEllipse(b, cx, ty + 8, 10, 16, { "#1a2a48", "#2a4270", "#3a5a98", "#5a7ac0" }, 0.1)
  for y = ty - 4, ty + 20, 4 do L.hline(b, cx - 7, cx + 7, y, "#1a2a48") end
  sparkles(b, 55, 26, cx - 20, ty - 14, cx + 20, ty + 24, DRAG[5])
  -- 목 + 머리(뿔 넷)
  local hx, hy = cx, ty - 28
  if pose == "wind3" then hy = ty - 38 end
  if pose == "alt2" then hy = ty - 24 end
  if pose == "wind2" or pose == "alt" then hx = cx - 4 end
  limb(b, cx, ty - 10, hx, hy + 6, 7, 6, DRAG, 0.05)
  L.shadeEllipse(b, hx, hy, 11, 9, DRAG, -0.05)
  L.shadeEllipse(b, hx, hy + 7, 7, 5, DRAG, 0.1)   -- 턱
  for _, h in ipairs({ { -8, -3, -18, -16 }, { -4, -6, -9, -20 }, { 4, -6, 9, -20 }, { 8, -3, 18, -16 } }) do L.line(b, hx + h[1], hy + h[2], hx + h[3], hy + h[4], "#cfd8e8"); L.line(b, hx + h[1] + 1, hy + h[2], hx + h[3] + 1, hy + h[4] + 1, "#6a7aa8") end
  glowDot(b, hx - 5, hy, STORM[6], STORM[4]); glowDot(b, hx + 5, hy, STORM[6], STORM[4])
  -- 태초의 용옥(부위): 이마의 푸른 구슬 — 파괴되면 빈 홈과 금
  local gy = hy - 5
  if broken then L.ellipse(b, hx, gy, 3, 3, "#05060c"); L.line(b, hx - 4, gy - 3, hx + 3, gy + 3, "#3a3448"); L.set(b, hx + 2, gy - 2, "#3a3448")
  else L.shadeEllipse(b, hx, gy, 3.5, 3.5, STORM, 0.3); L.set(b, hx - 1, gy - 1, "#ffffff") end
  -- 입과 브레스
  if pose == "wind3" then L.rect(b, hx - 4, hy + 8, 9, 3, STORM[5]); L.set(b, hx, hy + 9, "#ffffff"); for k = 0, 5 do L.set(b, hx - 10 + k * 4, hy - 24 - (k % 2) * 3, STORM[5]) end end
  if pose == "alt2" then L.rect(b, hx - 5, hy + 7, 11, 6, "#0a1428"); L.rect(b, hx - 3, hy + 8, 7, 4, STORM[5]); L.vline(b, hx, hy + 12, hy + 22, STORM[6]); L.vline(b, hx - 1, hy + 14, hy + 22, STORM[4]); L.vline(b, hx + 1, hy + 14, hy + 21, STORM[4]) end
  if pose == "strike" then for k = 0, 7 do local x = cx - 44 + k * 13; L.line(b, x, base - 10 - (k % 3) * 4, x + 6, base - 12 - (k % 3) * 4, STORM[5]) end end   -- 칼바람
  L.outline(b, OL)
  return b
end

-- ==========================================================================
-- 신규 구역 짐승 4종(오른쪽을 본다)
-- ==========================================================================
local function wolf(f)
  local b = L.new(30, 20)
  local base = 18
  local crouch, lunge = f == "wind", f == "atk"
  local by = base - 9 + (crouch and 2 or 0)
  local leg = f == "1" and 2 or (f == "0" and -2 or 0)
  -- 다리
  limb(b, 9, by + 3, 8 - leg + (lunge and -4 or 0), base, 1.6, 1.2, FUR, 0); limb(b, 20, by + 3, 21 + leg + (lunge and 5 or 0), base, 1.6, 1.2, FUR, 0)
  -- 몸
  for k = 0, 8 do local t = k / 8; L.shadeEllipse(b, 8 + t * (lunge and 15 or 12), by - t * (crouch and 0 or 1), 4.5, 4, FUR, 0.08) end
  L.line(b, 3, by - 2, -1 + 3, by - 6 + (crouch and 2 or 0), FUR[3]); L.set(b, 1, by - 7, FUR[5])   -- 꼬리
  -- 머리
  local hx, hy = (lunge and 26 or 23), by - (crouch and 1 or 4)
  L.shadeEllipse(b, hx, hy, 4, 3.5, FUR, 0.1); L.shadeEllipse(b, hx + 3, hy + 1, 2.5, 2, FUR, 0.1)
  L.poly(b, { { hx - 3, hy - 2 }, { hx - 2, hy - 6 }, { hx, hy - 2 } }, FUR[3])
  glowDot(b, hx + 1, hy - 1, ICE[5])
  if lunge then L.hline(b, hx + 2, hx + 5, hy + 2, "#1a0a14"); L.set(b, hx + 4, hy + 3, "#ffffff") end
  L.line(b, 10, by - 3, 16, by - 4, FUR[2])   -- 등줄
  L.outline(b, OL)
  return b
end
local function wisp(f)
  local b = L.new(20, 26)
  local glow = f == "wind" or f == "atk"
  local y0 = f == "1" and 1 or 0
  -- 빛무리 꼬리
  for k = 0, 5 do L.set(b, 10 + ((k % 2) * 2 - 1), 22 - k + y0, ICE[3 + (k % 2)]) end
  -- 몸(떠 있는 얼음 결정 + 영혼 불꽃)
  L.shadeEllipse(b, 10, 12 + y0, glow and 6 or 5, glow and 7 or 6, ICE, 0.2)
  L.shadePoly(b, { { 10, 1 + y0 }, { 13, 7 + y0 }, { 10, 18 + y0 }, { 7, 7 + y0 } }, { ICE[3], ICE[4], ICE[5], ICE[6] }, 0.25)
  glowDot(b, 9, 10 + y0, "#ffffff"); glowDot(b, 12, 10 + y0, "#ffffff")
  if glow then for a = 0, 7 do local t = a / 8 * math.pi * 2; L.set(b, math.floor(10 + math.cos(t) * 9), math.floor(12 + y0 + math.sin(t) * 9), ICE[6]) end end
  L.outline(b, OL)
  return b
end
local function lgolem(f)
  local b = L.new(32, 32)
  local base = 30
  local up, slam = f == "wind", f == "atk"
  local bob = f == "1" and 1 or 0
  limb(b, 11, base - 8, 10, base - 1, 3.5, 3, OBS, 0); limb(b, 21, base - 8, 22, base - 1, 3.5, 3, OBS, 0)
  local ty = base - 16 + bob + (slam and 2 or 0)
  L.shadeEllipse(b, 16, ty, 9, 8, OBS, 0.06)
  L.line(b, 11, ty - 3, 15, ty + 3, LAVA[3]); L.line(b, 15, ty + 3, 20, ty - 1, LAVA[4]); L.set(b, 15, ty + 3, LAVA[6])   -- 몸의 용암 균열
  L.shadeEllipse(b, 16, ty - 9, 4.5, 3.5, OBS, 0.08); glowDot(b, 14, ty - 9, LAVA[6]); glowDot(b, 18, ty - 9, LAVA[6])
  local hL, hR
  if up then hL, hR = { 10, ty - 18 }, { 22, ty - 18 } elseif slam then hL, hR = { 12, base - 2 }, { 20, base - 2 } else hL, hR = { 5, ty + 8 + bob }, { 27, ty + 8 + bob } end
  limb(b, 8, ty - 3, hL[1], hL[2], 3.5, 3.5, OBS, 0.05); limb(b, 24, ty - 3, hR[1], hR[2], 3.5, 3.5, OBS, -0.02)
  L.shadeEllipse(b, hL[1], hL[2], 3.5, 3, LAVA, 0.2); L.shadeEllipse(b, hR[1], hR[2], 3.5, 3, LAVA, 0.2)
  L.outline(b, OL)
  return b
end
local function lizard(f)
  local b = L.new(30, 16)
  local base = 14
  local crouch, lunge = f == "wind", f == "atk"
  local by = base - 5 + (crouch and 1 or 0)
  local leg = f == "1" and 2 or (f == "0" and -2 or 0)
  limb(b, 4, by, -1 + 2, by - 4, 2, 1, SCALE, 0)   -- 꼬리 끝
  for k = 0, 10 do local t = k / 10; L.shadeEllipse(b, 4 + t * (lunge and 20 or 16), by - math.sin(t * 3) * 1, 2.4 + t * 1.3, 2.2 + t, SCALE, 0.1) end
  for _, x in ipairs({ 9, 18 }) do limb(b, x, by + 1, x + leg * (x == 9 and -1 or 1), base, 1.2, 1, SCALE, 0) end
  local hx, hy = (lunge and 27 or 23), by - 2
  L.shadeEllipse(b, hx, hy, 3.5, 2.5, SCALE, 0.15)
  glowDot(b, hx, hy - 1, LAVA[6])
  for x = 8, 20, 3 do L.set(b, x, by - 3, LAVA[4]) end   -- 등의 불티 비늘
  if lunge or crouch then L.hline(b, hx + 1, hx + 4, hy + 1, LAVA[5]) end
  L.outline(b, OL)
  return b
end

-- ----------------------------------------------------------- 시트에 넣기
local BOSS = {
  { id = "b1", fn = treant, w = 74, h = 84, ax = 37, ay = 82, poses = { "idle0", "idle1", "wind", "strike", "wind2", "alt" } },
  { id = "b2", fn = golem, w = 82, h = 80, ax = 41, ay = 78, poses = { "idle0", "idle1", "wind", "strike", "wind2", "alt" } },
  { id = "b3", fn = thornlord, w = 80, h = 80, ax = 40, ay = 78, poses = { "idle0", "idle1", "wind", "strike", "wind2", "alt" } },
  { id = "b4", fn = behemoth, w = 92, h = 68, ax = 46, ay = 66, poses = { "idle0", "idle1", "wind", "strike", "wind2", "alt" } },
  { id = "b5", fn = dragon, w = 112, h = 92, ax = 56, ay = 90, poses = { "idle0", "idle1", "wind", "strike", "wind2", "alt", "wind3", "alt2" } }
}
-- ==========================================================================
-- v83 히든 진 보스 「심연의 기사왕 카인」(인간형 검사 · 100×90, 발 = 44, 88) — 흑염 대검 · 찢어진 심연 망토 · 흑관(부위)
--   idle0/1 대검을 땅에 꽂고 선다 · wind 머리 위로 치켜듦 → strike 내려벰 · wind2 낮게 웅크려 칼을 뒤로 → alt 대시 가로베기 ·
--   wind3 하늘로 도약하며 칼을 세움 → alt2 공중 회전 찍기 · _x 흑관이 부서진 모습
-- v83 붉은 폭풍의 밤 난입 괴수 「광포한 파멸수 라가르」(100×84, 발 = 50, 82) — 검붉은 털 · 뒤틀린 흰 뿔 · 붉은 번개 핏줄
-- ==========================================================================
local KN = { "#040308", "#0a0812", "#141022", "#221c34", "#3a3250", "#5e5480" }
local CAPE = { "#0a0412", "#1a0a28", "#2e1446", "#4a2470" }
local KFL = { "#2a0a10", "#7a1a2a", "#c8344a", "#ff6a3a", "#ffb070", "#fff0d0" }
local KVI = { "#22123e", "#5c38a8", "#b090f0", "#efe4ff" }

local function blackBlade(b, hx, hy, ang, len)
  local ca, sa = math.cos(ang), math.sin(ang)
  local px, py = -sa, ca
  for t = 0, len do
    local x, y = hx + ca * t, hy + sa * t
    local w = (t < 4) and 1.5 or (t > len - 6 and math.max(0, (len - t) / 2) or 3.4)
    for o = -w, w, 0.5 do
      local c = math.abs(o) > w - 0.8 and ((t % 3 == 0) and KFL[4] or KFL[3]) or (math.abs(o) < 0.6 and KVI[2] or KN[1])
      L.set(b, math.floor(x + px * o + 0.5), math.floor(y + py * o + 0.5), c)
    end
    if t % 5 == 2 and t > 6 then L.set(b, math.floor(x + px * (w + 1.5)), math.floor(y + py * (w + 1.5)), KFL[5]) end   -- 혀처럼 날리는 흑염
  end
  -- 코등이 · 손잡이
  for o = -4, 4 do L.set(b, math.floor(hx + ca * 3 + px * o + 0.5), math.floor(hy + sa * 3 + py * o + 0.5), KVI[2]) end
  for t = -5, 2 do L.set(b, math.floor(hx + ca * t + 0.5), math.floor(hy + sa * t + 0.5), KN[1]) end
  L.set(b, math.floor(hx - ca * 6 + 0.5), math.floor(hy - sa * 6 + 0.5), KVI[3])
end

local function kingKnight(pose, broken)
  local b = L.new(100, 90)
  local cx, base = 44, 88
  local bob = (pose == "idle1") and 1 or 0
  local crouch = (pose == "wind2" or pose == "strike") and 5 or 0
  local lift = (pose == "wind3") and -10 or ((pose == "alt2") and -4 or 0)
  local ty = 42 + bob + crouch + lift       -- 몸통 위
  local fy = base + lift                     -- 발
  -- 찢어진 심연 망토(뒤)
  local spread = (pose == "alt2" or pose == "wind3") and 12 or ((pose == "alt" or pose == "wind2") and 7 or 2)
  L.poly(b, { { cx - 8, ty + 1 }, { cx + 6, ty + 1 }, { cx - 2 - spread * 0.3, fy - 4 }, { cx - 7, fy - 9 }, { cx - 11 - spread, fy - 3 }, { cx - 15 - spread, fy - 12 }, { cx - 13 - spread * 0.6, ty + 12 } }, CAPE[2])
  L.poly(b, { { cx - 6, ty + 3 }, { cx + 2, ty + 3 }, { cx - 5, fy - 10 }, { cx - 12 - spread * 0.7, fy - 8 } }, CAPE[3])
  for k = 0, 5 do L.clear(b, math.floor(cx - 14 - spread + k * 3), fy - 4 - (k % 2) * 3) end   -- 해진 자락
  L.set(b, cx - 9, ty + 18, CAPE[4]); L.set(b, cx - 12, ty + 26, CAPE[4])
  -- 다리(판금 각반)
  local st = (pose == "alt" or pose == "wind2") and 7 or 4
  L.shadeCyl(b, cx - st - 4, ty + 22, 6, fy - ty - 22, KN, -0.1); L.shadeCyl(b, cx + st - 2, ty + 22, 6, fy - ty - 22, KN, -0.1)
  L.hline(b, cx - st - 5, cx - st + 2, fy - 1, KN[1]); L.hline(b, cx + st - 3, cx + st + 4, fy - 1, KN[1])
  L.set(b, cx - st - 2, ty + 30, KN[5]); L.set(b, cx + st, ty + 30, KN[5])
  -- 몸통(흉갑) + 허리 천
  L.shadePoly(b, { { cx - 10, ty }, { cx + 10, ty }, { cx + 8, ty + 20 }, { cx - 8, ty + 20 } }, KN, -0.05)
  L.hline(b, cx - 8, cx + 8, ty + 1, KN[6]); L.vline(b, cx, ty + 3, ty + 18, KN[2])
  L.poly(b, { { cx - 7, ty + 19 }, { cx + 7, ty + 19 }, { cx + 5, ty + 27 }, { cx - 6, ty + 28 } }, CAPE[3])
  L.set(b, cx - 3, ty + 8, KVI[3]); L.set(b, cx + 3, ty + 8, KVI[3])   -- 가슴의 심연 문장
  -- 어깨 갑주
  L.shadeEllipse(b, cx - 11, ty + 3, 5.5, 4.5, KN, 0.0); L.shadeEllipse(b, cx + 11, ty + 3, 5.5, 4.5, KN, 0.0); L.set(b, cx - 13, ty + 1, KVI[2]); L.set(b, cx + 13, ty + 1, KVI[2])
  -- 투구 + 붉은 눈 + 흑관(부위)
  local hx, hy = cx + ((pose == "alt" or pose == "strike") and 2 or 0), ty - 8
  L.shadeEllipse(b, hx, hy, 6, 7, KN, 0.0); L.hline(b, hx - 4, hx + 4, hy, KN[1]); L.set(b, hx - 2, hy, "#ff3a2a"); L.set(b, hx + 2, hy, "#ff3a2a"); L.set(b, hx + 3, hy, KFL[4])
  if not broken then
    for k = -2, 2 do L.vline(b, hx + k * 2, hy - 9 - (k == 0 and 3 or (math.abs(k) == 1 and 1 or 0)), hy - 6, KN[2]) end
    L.hline(b, hx - 5, hx + 5, hy - 6, KN[3]); L.set(b, hx, hy - 8, KVI[3]); L.set(b, hx, hy - 9, KVI[4])
  else
    L.hline(b, hx - 5, hx - 1, hy - 6, KN[3]); L.set(b, hx - 3, hy - 8, KN[2]); L.set(b, hx + 3, hy - 5, KVI[2]); L.line(b, hx, hy - 6, hx + 4, hy - 3, KFL[3])
  end
  -- 팔 + 흑염 대검(자세마다)
  local P = {
    idle0 = { cx + 10, ty + 16, 1.38, 40 }, idle1 = { cx + 10, ty + 17, 1.38, 40 },
    wind = { cx + 1, ty - 6, -2.25, 44 }, strike = { cx + 12, ty + 12, 0.5, 46 },
    wind2 = { cx - 9, ty + 16, 2.75, 42 }, alt = { cx + 13, ty + 10, 0.02, 48 },
    wind3 = { cx + 2, ty - 8, -1.57, 44 }, alt2 = { cx + 11, ty + 8, 0.42, 46 }
  }
  local p = P[pose]
  local shx, shy = cx + 8, ty + 4
  L.line(b, shx, shy, p[1], p[2], KN[3]); L.line(b, shx + 1, shy, p[1] + 1, p[2], KN[4]); L.line(b, cx - 8, ty + 4, p[1] - 1, p[2] + 1, KN[2])
  blackBlade(b, p[1], p[2], p[3], p[4])
  L.set(b, p[1], p[2], KN[5])
  if pose == "alt" then for k = 0, 9 do L.set(b, cx + 18 + k * 4, ty + 12 + math.floor(math.sin(k) * 2), KFL[4]) end end   -- 가로베기 궤적
  if pose == "alt2" then for k = 0, 23 do local t = k / 24 * math.pi * 2; L.set(b, math.floor(cx + math.cos(t) * 30), math.floor(ty + 14 + math.sin(t) * 9), k % 2 == 0 and KVI[3] or KFL[3]) end end   -- 회전 궤적
  if pose == "strike" then for k = 0, 8 do L.set(b, cx + 22 + k * 5, fy - 1 - (k % 2), KFL[3]) end end
  L.outline(b, "#05040a")
  return b
end

local RAG = { "#0c0406", "#1e080a", "#3a0e10", "#5e1a16", "#8a2a1e", "#b8442a" }
local BONE = { "#5a4a3a", "#a89880", "#e0d8c8", "#fff8ec" }
local MANE = { "#2a1004", "#6a3008", "#c87018", "#ffc040" }
local function ragar(pose, broken)
  local b = L.new(100, 84)
  local cx, base = 50, 82
  local bob = (pose == "idle1") and 1 or 0
  local crouch = (pose == "wind2") and 7 or ((pose == "strike") and 4 or 0)
  local lean = (pose == "alt") and 10 or ((pose == "strike") and 5 or 0)
  local rage = pose == "wind3" or pose == "alt2" or pose == "wind"
  local ty = 30 + bob + crouch
  -- 짧고 굵은 다리
  limb(b, cx - 8, ty + 30, cx - 12, base - 2, 7, 5, RAG, -0.1); limb(b, cx + 8, ty + 30, cx + 10 + lean * 0.4, base - 2, 7, 5, RAG, -0.1)
  L.hline(b, cx - 17, cx - 7, base - 1, RAG[1]); L.hline(b, cx + 5, cx + 16 + lean * 0.4, base - 1, RAG[1])
  -- 커다란 몸통(앞으로 굽은 등) + 갈기
  L.shadeEllipse(b, cx + lean * 0.5, ty + 20, 17, 19, RAG, -0.08)
  L.shadeEllipse(b, cx - 2 + lean * 0.6, ty + 4, 19, 11, rage and MANE or RAG, rage and 0.05 or -0.05)   -- 어깨 갈기(분노하면 금빛)
  for k = 0, 8 do L.set(b, cx - 18 + k * 4 + lean * 0.6, ty - 3 + (k % 2) * 2, rage and MANE[4] or RAG[5]) end
  -- 팔(자세마다): 주먹 위치
  local A = { idle0 = { -26, 46, 26, 46 }, idle1 = { -26, 47, 26, 47 }, wind = { -16, -22, 16, -22 }, strike = { -14, 50, 30, 50 }, wind2 = { -28, 40, 28, 40 }, alt = { -20, 40, 44, 14 }, wind3 = { -26, 38, 26, 38 }, alt2 = { -24, 40, 30, 30 } }
  local a = A[pose]
  limb(b, cx - 14 + lean * 0.5, ty + 6, cx + a[1] + lean * 0.3, ty + a[2], 7, 5, RAG, -0.02); limb(b, cx + 14 + lean * 0.5, ty + 6, cx + a[3] + lean * 0.3, ty + a[4], 7, 5, RAG, 0.0)
  L.shadeEllipse(b, cx + a[1] + lean * 0.3, ty + a[2], 6, 5, RAG, 0.1); L.shadeEllipse(b, cx + a[3] + lean * 0.3, ty + a[4], 6, 5, RAG, 0.15)
  -- 머리 · 뿔(부위) · 눈 · 입
  local hx, hy = cx + 6 + lean, ty - 4 - (pose == "wind3" and 5 or 0)
  L.shadeEllipse(b, hx, hy, 9, 8, RAG, 0.0)
  L.rect(b, hx + 1, hy + 3, 9, 4, "#140406"); for k = 0, 3 do L.set(b, hx + 2 + k * 2, hy + 3, BONE[3]); L.set(b, hx + 3 + k * 2, hy + 6, BONE[3]) end
  L.set(b, hx + 2, hy - 2, "#ffe066"); L.set(b, hx + 6, hy - 2, "#ffe066"); L.set(b, hx + 3, hy - 2, "#ff3a2a")
  if not broken then
    L.line(b, hx - 4, hy - 5, hx - 12, hy - 15, BONE[2]); L.line(b, hx - 3, hy - 6, hx - 10, hy - 17, BONE[3]); L.set(b, hx - 11, hy - 18, BONE[4])
    L.line(b, hx + 5, hy - 6, hx + 11, hy - 17, BONE[2]); L.line(b, hx + 6, hy - 6, hx + 13, hy - 16, BONE[3]); L.set(b, hx + 13, hy - 17, BONE[4])
  else
    L.line(b, hx - 4, hy - 5, hx - 7, hy - 9, BONE[2]); L.set(b, hx - 7, hy - 10, "#ff3a2a"); L.line(b, hx + 5, hy - 6, hx + 7, hy - 9, BONE[2])
  end
  -- 붉은 번개 핏줄
  local vc = rage and "#ffe066" or "#ff3a2a"
  L.line(b, cx - 10, ty + 10, cx - 3, ty + 20, vc); L.line(b, cx - 3, ty + 20, cx - 8, ty + 28, vc); L.line(b, cx + 6, ty + 14, cx + 12, ty + 24, vc)
  if pose == "wind3" then for k = 0, 5 do L.set(b, hx + 9 + k, hy + 4 - (k % 2), "#ffe066") end end
  if pose == "alt2" then for k = 0, 12 do L.set(b, hx + 11 + k * 3, hy + 5 + math.floor(math.sin(k * 1.3) * 2), k % 2 == 0 and "#ffffff" or "#ff5a3a") end end
  if pose == "strike" then for k = 0, 9 do L.set(b, cx + 4 + k * 5, base - 1, "#ff5a3a") end end
  if pose == "alt" then for k = 0, 6 do L.set(b, cx - 30 + k * 3, ty + 30 + (k % 2), "#ff7a5a") end end
  L.outline(b, "#05040a")
  return b
end
table.insert(BOSS, { id = "k1", fn = kingKnight, w = 100, h = 90, ax = 44, ay = 88, poses = { "idle0", "idle1", "wind", "strike", "wind2", "alt", "wind3", "alt2" } })
table.insert(BOSS, { id = "rg", fn = ragar, w = 100, h = 84, ax = 50, ay = 82, poses = { "idle0", "idle1", "wind", "strike", "wind2", "alt", "wind3", "alt2" } })

for _, B in ipairs(BOSS) do
  for _, p in ipairs(B.poses) do
    add(B.id .. "_" .. p, B.fn(p, false), B.ax, B.ay)
    add(B.id .. "_" .. p .. "_x", B.fn(p, true), B.ax, B.ay)
  end
end
-- ==========================================================================
-- v84 아종(Subspecies) 보스: 색 필터 금지 — 원본 도트를 재조색한 뒤 실제 픽셀 디테일을 더 그린다
--   b1 맹독의 고대 거목: 독기 서린 보랏빛 껍질 · 한쪽에만 솟은 거대한 뒤틀린 뿔 · 부풀어 오른 독 고름 · 떨어지는 독액
--   b2 홍련 수정 골렘: 진홍 결정 · 한쪽 어깨에 비대칭 결정 군락 · 몸통을 가르는 용암 균열
--   b3 창염의 가시 군주: 푸른 몸 · 등 위로 타오르는 창염(푸른 불꽃) · 이마의 뒤틀린 뿔 한 쌍
--   b4 옥염의 서리 송곳니: 비취빛 털 · 등줄기를 따라 타오르는 옥빛 화염 갈기 · 얼굴을 가로지른 흉터
--   b5 심연의 폭풍룡 아스트랄: 칠흑 보랏빛 비늘 · 한쪽에만 솟은 거대한 심연의 뿔 · 몸에서 새어 나오는 보랏빛 균열
-- v84 몬스터: 수정 슬라임(cslime) · 가시 임프(imp)도 이끼 슬라임의 색 회전이 아니라 고유한 도트로
-- ==========================================================================
local function hx2(c) local r, g, b2, a = L.rgba(c); return r, g, b2, a end
local function hsv(r, g, b2) local mx, mn = math.max(r, g, b2), math.min(r, g, b2); local d = mx - mn; local h = 0; if d > 0 then if mx == r then h = ((g - b2) / d) % 6 elseif mx == g then h = (b2 - r) / d + 2 else h = (r - g) / d + 4 end end; return h * 60, mx == 0 and 0 or d / mx, mx / 255 end
local function rgb(h, sat, v) local c = v * sat; local x = c * (1 - math.abs((h / 60) % 2 - 1)); local m = v - c; local r, g, b2 = 0, 0, 0; local k = math.floor(h / 60) % 6; if k == 0 then r, g, b2 = c, x, 0 elseif k == 1 then r, g, b2 = x, c, 0 elseif k == 2 then r, g, b2 = 0, c, x elseif k == 3 then r, g, b2 = 0, x, c elseif k == 4 then r, g, b2 = x, 0, c else r, g, b2 = c, 0, x end; return (r + m) * 255, (g + m) * 255, (b2 + m) * 255 end
local function shiftBuf(src, dh, ds, dv)
  local o = L.copy(src); local cache = {}
  for k, v in pairs(o.p) do
    if not cache[v] then local r, g, b2, a = hx2(v); local h, s2, vv = hsv(r, g, b2); local nr, ng, nb = rgb((h + dh) % 360, math.min(1, s2 * ds), math.min(1, vv * dv)); cache[v] = L.hex(nr, ng, nb, a) end
    o.p[k] = cache[v]
  end
  return o
end
local function bbox(b) local x0, y0, x1, y1 = 1e9, 1e9, -1, -1; for k in pairs(b.p) do local y = math.floor(k / b.w); local x = k - y * b.w; x0 = math.min(x0, x); x1 = math.max(x1, x); y0 = math.min(y0, y); y1 = math.max(y1, y) end; return x0, y0, x1, y1 end
local function topAt(b, x) for y = 0, b.h - 1 do if b.p[y * b.w + x] then return y end end; return nil end
local function filled(b, x, y) return b.p[math.floor(y) * b.w + math.floor(x)] ~= nil end
-- 디테일 붓
local function horn(b, x, y, dir, len, ramp)   -- 한쪽에만 솟은 거대한 뒤틀린 뿔(dir = -1 왼쪽 · 1 오른쪽)
  for t = 0, len do local q = t / len; local px = x + dir * (q * len * 0.55 + math.sin(q * 2.6) * 3); local py = y - q * len; local w = (1 - q) * 3 + 0.6
    for o = -w, w, 0.5 do L.set(b, px + o, py, o < -w * 0.4 and ramp[1] or (o > w * 0.5 and ramp[3] or ramp[2])) end end
  L.set(b, x + dir * len * 0.55, y - len - 1, ramp[4])
end
local function flames(b, x0, x1, step, h, cols, seed)   -- 등 · 머리 윗선을 따라 타오르는 불꽃 혀
  local r = L.rng(seed)
  for x = x0, x1, step do local ty = topAt(b, x); if ty then local hh = math.floor(h * (0.5 + r() * 0.8)); for k = 1, hh do local c = k > hh * 0.6 and cols[3] or (k > hh * 0.3 and cols[2] or cols[1]); L.set(b, x + math.floor(math.sin(k * 0.9 + x) * 0.6), ty - k, c) end; L.set(b, x, ty - hh - 1, cols[4]) end end
end
local function cracks(b, n, cols, seed)   -- 몸에서 빛이 새는 균열(불투명한 픽셀 위에만)
  local r = L.rng(seed); local x0, y0, x1, y1 = bbox(b)
  for i = 1, n do local x, y = x0 + r() * (x1 - x0), y0 + (y1 - y0) * (0.3 + r() * 0.6)
    for k = 0, 7 do if filled(b, x, y) then L.set(b, x, y, k % 3 == 0 and cols[2] or cols[1]) end; x = x + (r() - 0.5) * 3; y = y + 1 + r() * 0.5 end end
end
local function blobs(b, n, cols, seed)   -- 부풀어 오른 고름 · 결정 덩어리
  local r = L.rng(seed); local x0, y0, x1, y1 = bbox(b)
  for i = 1, n do local x, y = x0 + 4 + r() * (x1 - x0 - 8), y0 + (y1 - y0) * (0.25 + r() * 0.55); if filled(b, x, y) then L.shadeEllipse(b, x, y, 2 + r() * 1.5, 1.8 + r(), cols, 0.15); L.set(b, x - 1, y - 1, cols[#cols]) end end
end
local function cluster(b, x, y, dir, cols)   -- 비대칭 결정 군락
  for k = 0, 4 do local h = 10 + k * 3 - (k % 2) * 4; local bx = x + dir * k * 3
    L.shadePoly(b, { { bx - 2, y }, { bx + 2, y }, { bx + dir * 2, y - h }, { bx + dir * 1, y - h - 2 } }, cols, 0.1); L.set(b, bx + dir * 1, y - h - 1, cols[#cols]) end
end
local function drips(b, n, col, seed) local r = L.rng(seed); local x0, y0, x1, y1 = bbox(b); for i = 1, n do local x = math.floor(x0 + 4 + r() * (x1 - x0 - 8)); local yb; for y = y1, y0, -1 do if b.p[y * b.w + x] then yb = y; break end end; if yb then for k = 1, 2 + math.floor(r() * 3) do L.set(b, x, yb + k, col) end end end end

local VAR = {
  b1 = function(src, pose) local b = shiftBuf(src, 165, 1.25, 0.9); local x0, y0, x1, y1 = bbox(b); local hx = x0 + math.floor((x1 - x0) * 0.35)
    horn(b, hx, (topAt(b, hx) or y0) + 3, -1, 20, { "#2a1030", "#5a2a70", "#9a5ac0", "#e8c8ff" }); blobs(b, 7, { "#2a0a30", "#6a1a7a", "#a83ac8", "#e88aff" }, 11); drips(b, 6, "#9aff5a", 12); return b end,
  b2 = function(src, pose) local b = shiftBuf(src, 110, 1.4, 1.0); local x0, y0, x1, y1 = bbox(b)
    cluster(b, x1 - 12, y0 + math.floor((y1 - y0) * 0.35), 1, { "#3a0608", "#8a1418", "#d8343a", "#ff8a7a", "#fff0e0" }); cracks(b, 6, { "#ff6a2a", "#ffd070" }, 21); return b end,
  b3 = function(src, pose) local b = shiftBuf(src, 190, 1.2, 1.0); local x0, y0, x1, y1 = bbox(b)
    flames(b, x0 + 6, x1 - 6, 3, 9, { "#1a3a9a", "#3a7aff", "#8ad8ff", "#ffffff" }, 31); local cx = math.floor((x0 + x1) / 2); local ty = topAt(b, cx) or y0
    horn(b, cx - 6, ty + 6, -1, 12, { "#0a1430", "#2a4a8a", "#6a9ae0", "#e0f0ff" }); horn(b, cx + 6, ty + 6, 1, 9, { "#0a1430", "#2a4a8a", "#6a9ae0", "#e0f0ff" }); return b end,
  b4 = function(src, pose) local b = shiftBuf(src, -70, 1.6, 0.95); local x0, y0, x1, y1 = bbox(b)
    flames(b, x0 + 8, x1 - 14, 2, 8, { "#0a4a2a", "#1aa060", "#7affc0", "#e8fff4" }, 41); cracks(b, 3, { "#5a0a1a", "#d8304a" }, 42); return b end,
  b5 = function(src, pose) local b = shiftBuf(src, 70, 1.3, 0.8); local x0, y0, x1, y1 = bbox(b); local cx = math.floor((x0 + x1) / 2); local ty = topAt(b, cx) or y0
    horn(b, cx + 9, ty + 16, 1, 34, { "#14081e", "#3a1a5a", "#8a4ad0", "#efe4ff" }); horn(b, cx + 4, ty + 18, 1, 16, { "#14081e", "#3a1a5a", "#8a4ad0", "#efe4ff" }); cracks(b, 10, { "#8a3aff", "#efd8ff" }, 51); return b end
}
local vitems = {}
for _, B in ipairs(BOSS) do
  local fn = VAR[B.id]
  if fn then for _, p in ipairs(B.poses) do
    for _, br in ipairs({ false, true }) do
      local vb = fn(B.fn(p, br), p); L.outline(vb, "#05040a")
      vitems[#vitems + 1] = { B.id .. "_v_" .. p .. (br and "_x" or ""), vb, B.ax, B.ay }
    end
  end end
end
for _, v in ipairs(vitems) do add(v[1], v[2], v[3], v[4]) end

-- 수정 슬라임(22×18): 보랏빛 젤리 몸 + 등에 솟은 결정 · 숨쉬기 2 · 예비 동작 · 돌진
local function cslime(f)
  local b = L.new(22, 18); local sq = (f == "1") and 1 or 0; local wind = f == "wind"; local atk = f == "atk"
  local w, h = 8 + sq + (atk and 2 or 0), 6 - sq + (wind and -1 or 0)
  L.shadeEllipse(b, 11 + (atk and 2 or 0), 16 - h, w, h, { "#22123e", "#3a2070", "#5c38a8", "#8a64e0", "#c4a8ff" }, 0.1)
  L.set(b, 8, 16 - h - 1, "#efe4ff"); L.set(b, 9, 16 - h, "#efe4ff")
  for k = 0, 2 do local x = 7 + k * 4 + (atk and 2 or 0); local tt = 16 - h * 2 + 1; L.shadePoly(b, { { x - 1, tt + 2 }, { x + 1, tt + 2 }, { x + 0.5, tt - 3 - k % 2 * 2 } }, { "#145a6e", "#3fc0d8", "#8ae8f8", "#e4fdff" }, 0.2) end
  L.set(b, 9 + (atk and 3 or 0), 13, "#0a0a14"); L.set(b, 13 + (atk and 3 or 0), 13, "#0a0a14")
  if wind then L.set(b, 9, 13, "#ff4a4a"); L.set(b, 13, 13, "#ff4a4a") end
  L.hline(b, 3, 19, 17, "#22123e")
  return b
end
-- 가시 임프(20×22): 붉은 꼬마 악마 — 뿔 · 박쥐 날개 · 가시 꼬리 · 발톱
local function imp(f)
  local b = L.new(20, 22); local up = (f == "1") and 1 or 0; local wind = f == "wind"; local atk = f == "atk"
  local wy = wind and -2 or 0
  L.poly(b, { { 6, 9 + up }, { 0, 4 + up + wy }, { 2, 10 + up }, { 5, 12 } }, "#5e2a2a"); L.poly(b, { { 13, 9 + up }, { 19, 4 + up + wy }, { 17, 10 + up }, { 14, 12 } }, "#5e2a2a")   -- 날개
  L.shadeEllipse(b, 10 + (atk and 2 or 0), 13, 4.5, 5, { "#3a0a0a", "#6a1416", "#a02420", "#d84a34" }, 0.1)
  L.shadeEllipse(b, 10 + (atk and 3 or 0), 7, 3.6, 3.2, { "#3a0a0a", "#6a1416", "#a02420", "#d84a34" }, 0.15)
  L.line(b, 8 + (atk and 3 or 0), 5, 7 + (atk and 3 or 0), 1, "#e8c8a0"); L.line(b, 12 + (atk and 3 or 0), 5, 13 + (atk and 3 or 0), 1, "#e8c8a0")   -- 뿔
  L.set(b, 9 + (atk and 3 or 0), 7, "#ffe066"); L.set(b, 11 + (atk and 3 or 0), 7, "#ffe066")
  L.line(b, 6, 16, 2, 19, "#6a1416"); L.set(b, 1, 20, "#e8c8a0")   -- 가시 꼬리
  L.rect(b, 8, 18, 2, 3, "#6a1416"); L.rect(b, 11, 18, 2, 3, "#6a1416"); L.hline(b, 7, 9, 21, "#3a0a0a"); L.hline(b, 11, 13, 21, "#3a0a0a")
  if atk then L.line(b, 14, 12, 18, 10, "#e8c8a0"); L.set(b, 19, 9, "#ffffff") else L.set(b, 14, 13, "#e8c8a0") end
  return b
end
for _, f in ipairs({ "0", "1", "wind", "atk" }) do local c = cslime(f); L.outline(c, "#05040a"); add("cslime_" .. f, c, 11, 17); local im = imp(f); L.outline(im, "#05040a"); add("imp_" .. f, im, 10, 21) end

for _, f in ipairs({ "0", "1", "wind", "atk" }) do
  add("wolf_" .. f, wolf(f), 15, 18)
  add("wisp_" .. f, wisp(f), 10, 25)
  add("lgolem_" .. f, lgolem(f), 16, 30)
  add("lizard_" .. f, lizard(f), 15, 14)
end

local sheet = L.atlas(items, 1024, 1)
L.saveAtlas(OUT .. "/bs.aseprite", OUT .. "/bs.png", sheet, items)
local meta = { items = {} }
for _, it in ipairs(items) do meta.items[it.name] = { it.x, it.y, it.buf.w, it.buf.h, it.ax, it.ay } end
meta.w, meta.h = sheet.w, sheet.h
L.writeFile(OUT .. "/bs.json", L.json(meta))
print("bosses: " .. #items .. " sprites, sheet " .. sheet.w .. "x" .. sheet.h)
