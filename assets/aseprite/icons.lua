-- ==========================================================================
-- icons.lua — 16×16 다크 판타지 도트 아이콘(HUD / 목표 배너 / 컨텍스트 카드) + 도트 프레임(버튼/카드 9-slice)
--   aseprite -b --script-param dir=<이 폴더> --script-param out=<assets/sprites> --script icons.lua
-- 결과: icons.aseprite(슬라이스 = 아이콘 이름), icons.png(16×16 격자, 8열), icons.json { items: { 이름: [x, y, 16, 16, 0, 0] }, frame: {...} }
-- ==========================================================================
local DIR = app.params.dir
local OUT = app.params.out
package.path = DIR .. "/?.lua;" .. package.path
local L = require("lib")

local OL = "#0b0a10"
local WOOD = { "#2a170c", "#4a2a14", "#6e4220", "#965e30", "#c08a4e", "#e0b880" }
local STEEL = { "#262c38", "#424c5e", "#6a768c", "#a2aec4", "#e2e9f5" }
local GOLD = { "#6e4c18", "#a8792a", "#d8ad55", "#f6dc8e" }
local MEAT = { "#4a1414", "#7e2626", "#b04238", "#d87058", "#f0a888" }
local BONE = { "#a8a08a", "#e8e0c8", "#fffaea" }
local LEAF = { "#123a1c", "#1f5a2c", "#2f7f3c", "#4fa854", "#8ad070" }
local TEAL = { "#14485a", "#21788c", "#3fb8d0", "#8ae8f8", "#e4fdff" }
local VIOLET = { "#2c1a4a", "#4a2c80", "#7a52c0", "#b090f0", "#e8dcff" }
local FIRE = { "#7a1a0a", "#c8401a", "#f08028", "#ffc040", "#fff0a0" }
local STONE = { "#22262e", "#363c48", "#525a68", "#747e8c", "#a0aab6" }
local RED = { "#4a0e18", "#8a1c2c", "#c8344a", "#f0708a" }
local LEATHER_DK, LEATHER_LT = "#4e2616", "#9a6040"

local items = {}
local function icon(name, fn)
  local b = L.new(16, 16)
  fn(b)
  L.outline(b, OL)
  items[#items + 1] = { name = name, buf = b }
end

-- ----------------------------------------------------------- 재료
icon("wood", function(b)   -- 통나무(옆으로 누운 원통 + 나이테)
  L.shadeCyl(b, 2, 6, 10, 6, WOOD, 0.0)
  for x = 2, 11 do if x % 3 == 0 then L.set(b, x, 8, WOOD[2]) end end
  L.hline(b, 3, 10, 6, WOOD[5])
  L.shadeEllipse(b, 12.5, 9, 2.4, 3.1, { "#8a5a2a", "#c8975a", "#ecc890" }, 0.1)
  L.set(b, 12, 9, "#8a5f2f"); L.set(b, 13, 8, "#a87a44")
  L.set(b, 4, 5, LEAF[4]); L.set(b, 5, 4, LEAF[3])   -- 새순
end)
icon("plank", function(b)   -- 판자 두 장
  for k = 0, 1 do
    local y = 5 + k * 4
    L.rect(b, 1 + k, y, 13, 3, WOOD[4]); L.hline(b, 1 + k, 13 + k, y, WOOD[6]); L.hline(b, 1 + k, 13 + k, y + 2, WOOD[3])
    L.set(b, 4 + k * 3, y + 1, WOOD[2]); L.set(b, 10 - k * 2, y + 1, WOOD[2])
  end
end)
icon("meat", function(b)   -- 뼈 달린 고기
  L.shadeEllipse(b, 7, 7, 5, 4.3, MEAT, 0.05)
  L.set(b, 5, 5, MEAT[5]); L.set(b, 6, 4, MEAT[5])
  L.line(b, 10, 10, 13, 13, BONE[2]); L.line(b, 11, 10, 13, 12, BONE[1])
  L.set(b, 13, 14, BONE[3]); L.set(b, 14, 13, BONE[3]); L.set(b, 14, 14, BONE[2])
end)
icon("jerky", function(b)   -- 말린 육포 띠
  L.poly(b, { { 2, 10 }, { 6, 4 }, { 14, 6 }, { 10, 12 } }, function(x, y) return ((x + y) % 4 == 0) and MEAT[2] or MEAT[3] end)
  L.line(b, 5, 7, 11, 8, MEAT[4]); L.set(b, 8, 9, "#e8d0b0"); L.set(b, 11, 7, "#e8d0b0")
end)
icon("ore", function(b)   -- 녹빛 철광석
  L.shadePoly(b, { { 2, 13 }, { 4, 6 }, { 8, 3 }, { 13, 5 }, { 14, 13 } }, STONE, 0.05)
  for _, p in ipairs({ { 6, 7 }, { 10, 6 }, { 9, 10 }, { 5, 11 } }) do L.set(b, p[1], p[2], "#c87a3a"); L.set(b, p[1] + 1, p[2], "#e8a050") end
  L.set(b, 8, 4, STONE[5])
end)
icon("ingot", function(b)   -- 반짝이는 철괴
  L.poly(b, { { 2, 12 }, { 4, 7 }, { 12, 7 }, { 14, 12 } }, function(x, y) return y <= 8 and STEEL[5] or (y <= 10 and STEEL[4] or STEEL[3]) end)
  L.hline(b, 2, 14, 12, STEEL[2]); L.set(b, 6, 8, "#ffffff")
  L.poly(b, { { 4, 7 }, { 5, 4 }, { 11, 4 }, { 12, 7 } }, function(x, y) return y <= 5 and STEEL[4] or STEEL[3] end)
  L.set(b, 13, 5, "#ffffff"); L.set(b, 13, 4, STEEL[4])
end)
icon("herb", function(b)   -- 달빛 약초
  L.line(b, 8, 14, 8, 6, LEAF[2])
  for k, s in ipairs({ { -1, 9 }, { 1, 7 }, { -1, 5 } }) do
    local d, y = s[1], s[2]
    L.poly(b, { { 8, y + 1 }, { 8 + d * 5, y - 2 }, { 8 + d * 6, y }, { 8 + d * 2, y + 2 } }, LEAF[3 + (k % 2)])
  end
  L.set(b, 8, 4, TEAL[4]); L.set(b, 7, 3, TEAL[5]); L.set(b, 9, 3, TEAL[3])
end)
icon("potion", function(b)   -- 붉은 회복 물약
  L.shadeEllipse(b, 8, 10, 5, 4.5, { "#2a3040", "#3c4658", "#566278" }, 0.0)
  L.ellipse(b, 8, 10.5, 4, 3.4, RED[3]); L.hline(b, 5, 11, 9, RED[4]); L.set(b, 6, 11, RED[2]); L.set(b, 10, 12, RED[2])
  L.rect(b, 7, 3, 3, 3, "#c8d8e8"); L.rect(b, 6, 2, 5, 2, WOOD[4]); L.hline(b, 6, 10, 2, WOOD[5])
  L.set(b, 6, 8, "#ffffff")
end)
icon("core", function(b)   -- 유물 핵(청록 결정 구)
  L.shadeEllipse(b, 8, 8, 5.4, 5.4, TEAL, 0.1)
  L.line(b, 5, 8, 8, 5, TEAL[5]); L.set(b, 8, 8, "#ffffff")
  for a = 0, 3 do local t = a * math.pi / 2 + 0.4; L.set(b, math.floor(8 + math.cos(t) * 7), math.floor(8 + math.sin(t) * 7), TEAL[4]) end
end)

-- ----------------------------------------------------------- 검 / 마법 / 마을
icon("sword", function(b)   -- 룬 장검(대각선)
  for k = 0, 9 do L.set(b, 4 + k, 11 - k, STEEL[5]); L.set(b, 5 + k, 11 - k, STEEL[3]) end
  L.set(b, 14, 1, "#ffffff")
  for k = 2, 8, 3 do L.set(b, 5 + k, 10 - k, TEAL[3]) end
  L.line(b, 2, 9, 7, 14, GOLD[3]); L.set(b, 2, 9, GOLD[4])   -- 코등이
  L.line(b, 3, 13, 1, 15, WOOD[3]); L.set(b, 0, 15, GOLD[3])
end)
icon("magic", function(b)   -- 푸른 비전 마법진 + 별
  L.each(b, 0, 0, 15, 15, function(x, y)
    local d = math.sqrt((x + 0.5 - 8) ^ 2 + (y + 0.5 - 8) ^ 2)
    if d > 5.6 and d < 7.0 then return (math.floor(math.atan(y - 8, x - 8) * 4) % 2 == 0) and TEAL[3] or TEAL[2] end
  end)
  L.poly(b, { { 8, 3 }, { 9, 7 }, { 13, 8 }, { 9, 9 }, { 8, 13 }, { 7, 9 }, { 3, 8 }, { 7, 7 } }, function(x, y) return (math.abs(x - 8) + math.abs(y - 8) < 3) and VIOLET[5] or VIOLET[4] end)
  L.set(b, 8, 8, "#ffffff")
end)
icon("fire", function(b)   -- 화력 불꽃
  L.poly(b, { { 3, 14 }, { 2, 9 }, { 5, 4 }, { 6, 8 }, { 8, 1 }, { 11, 6 }, { 12, 4 }, { 14, 9 }, { 13, 14 } }, function(x, y) return y < 6 and FIRE[3] or (y < 10 and FIRE[2] or FIRE[2]) end)
  L.poly(b, { { 5, 14 }, { 5, 10 }, { 8, 5 }, { 11, 10 }, { 11, 14 } }, FIRE[4])
  L.poly(b, { { 7, 14 }, { 7, 11 }, { 8, 9 }, { 9, 11 }, { 9, 14 } }, FIRE[5])
end)
icon("worker", function(b)   -- 생존자 일꾼(머리띠 + 망치)
  L.shadeEllipse(b, 7, 6, 3.6, 3.6, { "#9a6a4a", "#c9946a", "#e8b98a" }, 0.05)
  L.hline(b, 3, 11, 4, "#b0505a"); L.hline(b, 4, 10, 3, "#4a3220")
  L.set(b, 6, 6, "#1a1210"); L.set(b, 8, 6, "#1a1210")
  L.rect(b, 3, 10, 9, 5, "#4f7fb0"); L.rect(b, 5, 11, 5, 4, "#c8b896")
  L.line(b, 12, 14, 14, 8, WOOD[4]); L.rect(b, 12, 6, 4, 3, STEEL[4])
end)
icon("town", function(b)   -- 마을(집 + 깃발)
  L.rect(b, 3, 8, 10, 6, "#c8b896"); L.vline(b, 3, 8, 13, WOOD[2]); L.vline(b, 12, 8, 13, WOOD[2])
  L.poly(b, { { 1, 9 }, { 8, 2 }, { 15, 9 } }, function(x, y) return y < 5 and "#c86a70" or "#8e3a40" end)
  L.rect(b, 7, 10, 3, 4, WOOD[2]); L.set(b, 5, 10, GOLD[4]); L.set(b, 11, 10, GOLD[4])
  L.vline(b, 13, 0, 4, WOOD[2]); L.rect(b, 14, 0, 2, 2, GOLD[3])
end)
icon("hall", function(b)   -- 마을 회관(기둥 + 박공)
  L.poly(b, { { 1, 6 }, { 8, 1 }, { 15, 6 } }, function(x, y) return y < 4 and GOLD[3] or GOLD[2] end)
  L.rect(b, 2, 6, 12, 2, STONE[4])
  for x = 3, 12, 3 do L.rect(b, x, 8, 2, 5, STONE[5]) end
  L.rect(b, 1, 13, 14, 2, STONE[3])
end)

-- ----------------------------------------------------------- 행동
icon("hammer", function(b)   -- 망치질(현장 가속)
  L.line(b, 3, 14, 10, 7, WOOD[4]); L.line(b, 4, 14, 11, 7, WOOD[3])
  L.poly(b, { { 7, 2 }, { 12, 1 }, { 15, 6 }, { 10, 8 } }, function(x, y) return y < 4 and STEEL[5] or STEEL[3] end)
  L.set(b, 2, 4, FIRE[4]); L.set(b, 1, 6, FIRE[3]); L.set(b, 4, 2, FIRE[5])   -- 불똥
end)
icon("box", function(b)   -- 완성품 상자(수거)
  L.rect(b, 2, 5, 12, 9, WOOD[4]); L.hline(b, 2, 13, 5, WOOD[6]); L.hline(b, 2, 13, 13, WOOD[2])
  L.line(b, 2, 5, 13, 13, WOOD[3]); L.vline(b, 2, 5, 13, WOOD[3]); L.vline(b, 13, 5, 13, WOOD[2])
  L.rect(b, 4, 2, 8, 3, GOLD[3]); L.set(b, 7, 1, GOLD[4]); L.set(b, 8, 1, GOLD[4])
end)
icon("build", function(b)   -- 건설(벽돌 + 흙손)
  for y = 8, 13, 3 do for x = 1 + ((y / 3) % 2) * 2, 12, 5 do L.rect(b, x, y, 4, 2, "#b0604a"); L.set(b, x, y, "#d88a6a") end end
  L.line(b, 9, 7, 14, 2, WOOD[4]); L.poly(b, { { 6, 7 }, { 10, 5 }, { 11, 8 } }, STEEL[4])
end)
icon("upgrade", function(b)   -- 증축(금빛 위 화살표)
  L.poly(b, { { 8, 1 }, { 14, 8 }, { 10, 8 }, { 10, 14 }, { 6, 14 }, { 6, 8 }, { 2, 8 } }, function(x, y) return y < 6 and GOLD[4] or GOLD[3] end)
  L.vline(b, 7, 6, 13, GOLD[4])
end)
icon("deliver", function(b)   -- 납품(두루마리)
  L.rect(b, 3, 3, 10, 10, "#e8dcc0"); L.vline(b, 3, 3, 12, "#b8a888")
  L.rect(b, 2, 2, 12, 2, WOOD[4]); L.rect(b, 2, 12, 12, 2, WOOD[4])
  for y = 6, 10, 2 do L.hline(b, 5, 11, y, "#8a7a60") end
  L.set(b, 10, 10, RED[3]); L.set(b, 11, 11, RED[3])
end)
icon("target", function(b)   -- 목표(금빛 과녁)
  L.each(b, 0, 0, 15, 15, function(x, y)
    local d = math.sqrt((x + 0.5 - 8) ^ 2 + (y + 0.5 - 8) ^ 2)
    if d < 2 then return RED[3] elseif d < 3.5 then return GOLD[4] elseif d < 5 then return RED[2] elseif d < 6.6 then return GOLD[3] end
  end)
  L.line(b, 9, 7, 15, 1, WOOD[5]); L.set(b, 15, 0, STEEL[5])
end)
icon("gate", function(b)   -- 원정(성문)
  L.rect(b, 1, 5, 3, 10, STONE[4]); L.rect(b, 12, 5, 3, 10, STONE[3])
  L.each(b, 1, 1, 14, 7, function(x, y) local d = ((x + 0.5 - 8) / 7) ^ 2 + ((y + 0.5 - 7) / 5.5) ^ 2; if d <= 1 and d > 0.45 then return STONE[5] end end)
  L.rect(b, 4, 6, 8, 9, "#10161c"); L.vline(b, 8, 6, 14, "#1c2630")
  L.set(b, 8, 2, TEAL[4])
end)
icon("gear", function(b)   -- 원정 진척(톱니)
  L.ellipse(b, 8, 8, 5.5, 5.5, STEEL[3])
  for a = 0, 7 do local t = a * math.pi / 4; L.rect(b, math.floor(8 + math.cos(t) * 6) - 1, math.floor(8 + math.sin(t) * 6) - 1, 2, 2, STEEL[4]) end
  L.ellipse(b, 8, 8, 2.2, 2.2, STEEL[1])
end)
icon("relic", function(b)   -- 유물(소용돌이)
  for k = 0, 40 do local t = k * 0.3; local r = 1 + t * 0.55; L.set(b, math.floor(8 + math.cos(t) * r), math.floor(8 + math.sin(t) * r), k < 20 and TEAL[4] or TEAL[3]) end
  L.set(b, 8, 8, "#ffffff")
end)
icon("heart", function(b)
  L.poly(b, { { 8, 14 }, { 1, 7 }, { 1, 4 }, { 4, 2 }, { 8, 5 }, { 12, 2 }, { 15, 4 }, { 15, 7 } }, function(x, y) return (y < 6 and x < 8) and RED[4] or RED[3] end)
  L.set(b, 4, 4, "#ffffff")
end)

-- ----------------------------------------------------------- 공방 기호(카드 제목)
icon("saw", function(b)   -- 목공소
  L.poly(b, { { 2, 11 }, { 12, 4 }, { 14, 6 }, { 4, 13 } }, STEEL[4])
  for k = 0, 4 do L.set(b, 4 + k * 2, 12 - k * 1.4, STEEL[2]) end
  L.rect(b, 11, 2, 4, 4, WOOD[4]); L.set(b, 12, 3, WOOD[2])
end)
icon("cleaver", function(b)   -- 푸줏간
  L.rect(b, 3, 3, 8, 7, STEEL[4]); L.hline(b, 3, 10, 3, STEEL[5]); L.vline(b, 3, 3, 9, STEEL[5]); L.set(b, 9, 5, STEEL[2])
  L.line(b, 11, 8, 14, 13, WOOD[4]); L.line(b, 11, 9, 13, 13, WOOD[3])
  L.set(b, 5, 11, MEAT[3]); L.set(b, 6, 12, MEAT[3])
end)
icon("anvil", function(b)   -- 제련소
  L.poly(b, { { 1, 5 }, { 14, 5 }, { 12, 8 }, { 4, 8 } }, function(x, y) return y < 6 and STEEL[4] or STEEL[3] end)
  L.rect(b, 6, 8, 5, 4, STEEL[2]); L.rect(b, 3, 12, 11, 2, STEEL[3])
  L.set(b, 3, 2, FIRE[4]); L.set(b, 6, 1, FIRE[3]); L.set(b, 10, 2, FIRE[5])
end)
icon("flask", function(b)   -- 물약 공방(초록 비약)
  L.poly(b, { { 6, 2 }, { 10, 2 }, { 10, 6 }, { 14, 13 }, { 2, 13 }, { 6, 6 } }, "#2c3a48")
  L.poly(b, { { 4, 10 }, { 12, 10 }, { 14, 13 }, { 2, 13 } }, "#4fd8a8"); L.hline(b, 4, 12, 10, "#a8ffd8")
  L.set(b, 7, 11, "#ffffff"); L.hline(b, 5, 11, 1, WOOD[4])
end)
icon("ration", function(b)   -- 전투식량(그릇)
  L.poly(b, { { 1, 8 }, { 15, 8 }, { 12, 14 }, { 4, 14 } }, function(x, y) return y < 10 and WOOD[5] or WOOD[4] end)
  L.ellipse(b, 8, 7, 6, 2.4, MEAT[3]); L.set(b, 6, 6, LEAF[4]); L.set(b, 10, 7, "#e8d26a")
  for x = 5, 11, 3 do L.set(b, x, 3, "#c8c8c8"); L.set(b, x + 1, 2, "#a0a0a0") end
end)
icon("tool", function(b)   -- 작업 도구(렌치 + 망치)
  L.line(b, 2, 14, 11, 5, STEEL[4]); L.line(b, 3, 14, 12, 5, STEEL[3]); L.ellipse(b, 12, 4, 2.5, 2.5, STEEL[4]); L.set(b, 13, 3, "#00000000")
  L.line(b, 13, 14, 5, 6, WOOD[4]); L.rect(b, 2, 3, 4, 4, STEEL[5])
end)

-- ----------------------------------------------------------- v72: 골드 / 왕관 / 보호막 / 마법 각인
icon('gold', function(b)   -- 금화 더미
  for _, c in ipairs({ { 4.5, 11 }, { 11.5, 11 }, { 8, 5.5 } }) do
    L.ellipse(b, c[1], c[2], 4.2, 3.8, GOLD[1])
    L.ellipse(b, c[1], c[2] - 0.4, 3.3, 2.9, GOLD[3])
    L.ellipse(b, c[1] - 0.6, c[2] - 0.9, 1.6, 1.3, GOLD[4])
    L.vline(b, math.floor(c[1]), math.floor(c[2]) - 1, math.floor(c[2]) + 1, GOLD[2]); L.set(b, math.floor(c[1] - 2), math.floor(c[2] - 2), '#ffffff')
  end
end)
icon('crown', function(b)
  L.poly(b, { { 1, 13 }, { 1, 5 }, { 5, 9 }, { 8, 3 }, { 11, 9 }, { 15, 5 }, { 15, 13 } }, function(x, y) return y < 9 and GOLD[4] or GOLD[3] end)
  L.hline(b, 1, 15, 12, GOLD[2]); L.set(b, 8, 9, RED[3]); L.set(b, 4, 11, TEAL[3]); L.set(b, 12, 11, TEAL[3])
end)
icon('shield', function(b)
  L.poly(b, { { 2, 2 }, { 14, 2 }, { 14, 8 }, { 8, 15 }, { 2, 8 } }, function(x, y) return x < 8 and TEAL[3] or TEAL[2] end)
  L.poly(b, { { 5, 4 }, { 11, 4 }, { 11, 8 }, { 8, 12 }, { 5, 8 } }, TEAL[4]); L.set(b, 6, 5, '#ffffff')
end)
icon('rune_thunder', function(b)   -- 벼락 낙뢰 검
  L.poly(b, { { 9, 0 }, { 3, 9 }, { 7, 9 }, { 5, 15 }, { 13, 5 }, { 9, 5 }, { 11, 0 } }, function(x, y) return x < 8 and '#fff6a0' or '#ffd040' end)
end)
icon('rune_flame', function(b)   -- 화염 궤적 구르기
  L.poly(b, { { 2, 14 }, { 4, 6 }, { 7, 9 }, { 9, 2 }, { 12, 8 }, { 14, 14 } }, FIRE[2]); L.poly(b, { { 5, 14 }, { 7, 9 }, { 9, 6 }, { 11, 14 } }, FIRE[4])
  L.hline(b, 1, 15, 15, FIRE[1])
end)
icon('rune_vamp', function(b)   -- 흡혈의 검
  L.poly(b, { { 8, 1 }, { 13, 9 }, { 11, 13 }, { 8, 15 }, { 5, 13 }, { 3, 9 } }, function(x, y) return x < 8 and RED[4] or RED[3] end)
  L.set(b, 6, 7, '#ffffff'); L.set(b, 6, 8, '#ffd0d8')
end)
icon('rune_twin', function(b)   -- 2연발(초승달 검기 둘)
  for k = 0, 1 do
    L.each(b, 0, 0, 15, 15, function(x, y) local d = math.sqrt((x + 0.5 - (5 + k * 5)) ^ 2 + (y + 0.5 - 8) ^ 2); if d > 4.5 and d < 6.4 and x >= 5 + k * 5 then return k == 0 and TEAL[3] or TEAL[4] end end)
  end
end)

-- ----------------------------------------------------------- v73 몬스터 소재 / 희귀 채집물 / 대장간 도구
icon('fang', function(b)   -- 날카로운 송곳니(모슬링)
  L.poly(b, { { 4, 2 }, { 10, 2 }, { 12, 6 }, { 8, 15 }, { 5, 8 } }, function(x, y) return x < 7 and BONE[3] or (y > 9 and BONE[1] or BONE[2]) end)
  L.hline(b, 4, 10, 2, '#8a5a3a'); L.hline(b, 4, 10, 3, '#b07a50')
end)
icon('moss_core', function(b)   -- 이끼 괴수핵(초록 빛 구슬 + 이끼 덩굴)
  L.shadeEllipse(b, 8, 8.5, 5.4, 5.4, { '#0e3a1c', '#1f6a34', '#3fa858', '#8ae890', '#e0ffe0' }, 0.05)
  L.set(b, 6, 6, '#ffffff'); L.line(b, 2, 12, 5, 9, LEAF[3]); L.line(b, 14, 4, 11, 7, LEAF[3]); L.set(b, 2, 13, LEAF[4])
end)
icon('antler', function(b)   -- 거목의 가지뿔(첫 보스)
  L.line(b, 3, 14, 8, 5, '#a88458'); L.line(b, 4, 14, 9, 5, '#d8b880')
  L.line(b, 8, 5, 6, 1, '#d8b880'); L.line(b, 8, 6, 13, 2, '#d8b880'); L.line(b, 6, 9, 2, 6, '#a88458'); L.line(b, 9, 8, 14, 8, '#a88458')
  L.set(b, 13, 2, LEAF[4]); L.set(b, 14, 8, LEAF[4]); L.set(b, 2, 6, LEAF[4])
end)
icon('golem_heart', function(b)   -- 골렘의 마력석(둘째 보스)
  L.shadePoly(b, { { 8, 1 }, { 14, 6 }, { 12, 14 }, { 4, 14 }, { 2, 6 } }, STONE, 0.05)
  L.poly(b, { { 8, 4 }, { 11, 7 }, { 8, 12 }, { 5, 7 } }, function(x, y) return x < 8 and TEAL[4] or TEAL[3] end)
  L.set(b, 7, 6, TEAL[5]); L.set(b, 8, 5, '#ffffff')
end)
icon('thorn_heart', function(b)   -- 심연의 가시핵(셋째 보스)
  L.shadeEllipse(b, 8, 9, 4.6, 4.6, { RED[1], RED[2], RED[3], RED[4] }, 0.05)
  for _, p in ipairs({ { 8, 1 }, { 2, 6 }, { 14, 6 }, { 3, 14 }, { 13, 14 } }) do L.line(b, 8, 9, p[1], p[2], '#34502a') end
  L.shadeEllipse(b, 8, 9, 3.4, 3.4, { RED[2], RED[3], RED[4], '#ffd0d8' }, 0.1); L.set(b, 7, 8, '#ffffff')
end)
icon('mithril', function(b)   -- 미스릴 광석(황금 바위)
  L.shadePoly(b, { { 2, 13 }, { 4, 6 }, { 8, 3 }, { 13, 5 }, { 14, 13 } }, { '#2a3a4a', '#4a6a7a', '#8ab8c8', '#c8f0f8', '#ffffff' }, 0.1)
  L.set(b, 6, 7, '#ffffff'); L.set(b, 10, 9, '#ffffff'); L.set(b, 8, 11, TEAL[5])
end)
icon('world_branch', function(b)   -- 세계수 가지(황금 나무)
  L.line(b, 2, 14, 13, 3, GOLD[2]); L.line(b, 3, 14, 14, 3, GOLD[3])
  for _, p in ipairs({ { 6, 9 }, { 9, 6 }, { 12, 4 } }) do L.shadeEllipse(b, p[1] - 1, p[2] - 2, 2.2, 1.6, { LEAF[3], LEAF[4], LEAF[5], '#fff6a0' }, 0.1) end
  L.set(b, 14, 2, '#fff6d0')
end)
icon('moonherb', function(b)   -- 달빛 영초(황금 약초)
  for k = -2, 2 do L.line(b, 8 + k * 2, 15, 8 + k * 2.6, 7 + math.abs(k) * 1.5, k % 2 == 0 and '#5fd8a0' or '#2f8a6a') end
  L.shadeEllipse(b, 8, 4, 3, 3, { '#8a8ad0', '#c8c8ff', '#f0f0ff', '#ffffff' }, 0.1); L.set(b, 9, 3, '#fff6a0')
end)
icon('axe', function(b)   -- 채집 도끼
  L.line(b, 3, 14, 11, 4, WOOD[4]); L.line(b, 4, 14, 12, 4, WOOD[3])
  L.poly(b, { { 9, 1 }, { 15, 3 }, { 14, 9 }, { 11, 7 }, { 9, 5 } }, function(x, y) return x > 12 and STEEL[5] or STEEL[3] end)
end)
icon('sickle', function(b)   -- 약초 낫
  L.line(b, 3, 14, 7, 10, WOOD[4]); L.line(b, 4, 14, 8, 10, WOOD[3])
  L.each(b, 0, 0, 15, 15, function(x, y) local d = math.sqrt((x + 0.5 - 9) ^ 2 + (y + 0.5 - 7) ^ 2); if d > 3.6 and d < 6 and not (x < 8 and y > 7) then return d < 4.6 and STEEL[5] or STEEL[3] end end)
end)
icon('bellows', function(b)   -- 서양식 가죽 풀무
  L.poly(b, { { 1, 4 }, { 10, 6 }, { 10, 10 }, { 1, 12 } }, function(x, y) return ((x + y) % 3 == 0) and LEATHER_DK or LEATHER_LT end)
  L.line(b, 0, 3, 11, 6, WOOD[5]); L.line(b, 0, 13, 11, 10, WOOD[4])
  L.rect(b, 11, 7, 4, 2, STEEL[4]); L.set(b, 15, 7, STEEL[5])
end)
icon('codex', function(b)   -- 무기 도감
  L.rect(b, 2, 2, 12, 12, '#5a1a1e'); L.rect(b, 3, 3, 10, 10, '#8e2a30'); L.vline(b, 8, 2, 13, '#3a0e12')
  L.rect(b, 4, 5, 3, 1, GOLD[4]); L.rect(b, 10, 5, 2, 1, GOLD[4]); L.set(b, 5, 9, GOLD[3]); L.set(b, 11, 9, GOLD[3])
  L.line(b, 4, 11, 6, 7, STEEL[5])
end)
icon('thermo', function(b)   -- 온도(불 게이지)
  L.rect(b, 6, 1, 4, 10, '#e8e0d0'); L.rect(b, 7, 4, 2, 8, FIRE[2]); L.shadeEllipse(b, 8, 12.5, 3, 3, FIRE, 0.1)
  L.set(b, 11, 3, GOLD[3]); L.set(b, 11, 6, GOLD[3])
end)
icon('star', function(b)   -- ★ 전설 등급
  L.poly(b, { { 8, 0 }, { 10, 6 }, { 15, 6 }, { 11, 9 }, { 13, 15 }, { 8, 11 }, { 3, 15 }, { 5, 9 }, { 1, 6 }, { 6, 6 } }, function(x, y) return x < 8 and GOLD[4] or GOLD[3] end)
  L.set(b, 7, 5, '#ffffff')
end)
icon('basket', function(b)   -- 오늘의 전리품 바구니
  L.poly(b, { { 2, 7 }, { 14, 7 }, { 12, 14 }, { 4, 14 } }, function(x, y) return ((x + y) % 2 == 0) and WOOD[4] or WOOD[5] end)
  L.each(b, 0, 0, 15, 8, function(x, y) local d = math.sqrt((x + 0.5 - 8) ^ 2 + (y + 0.5 - 8) ^ 2); if d > 4.6 and d < 5.8 and y < 7 then return WOOD[3] end end)
  L.set(b, 6, 6, '#c87a3a'); L.set(b, 9, 5, LEAF[4]); L.set(b, 10, 6, MEAT[3])
end)
icon('quench', function(b)   -- 치익— 담금질(물 + 김)
  L.rect(b, 2, 9, 12, 6, WOOD[3]); L.hline(b, 2, 13, 9, '#3a8cae'); L.hline(b, 3, 12, 10, '#226482')
  for _, p in ipairs({ { 5, 6 }, { 8, 3 }, { 11, 5 } }) do L.shadeEllipse(b, p[1], p[2], 2, 2, { '#a8b8c0', '#d8e8f0', '#ffffff' }, 0.1) end
end)
icon('dagger', function(b)   -- 단검류
  L.line(b, 4, 12, 12, 4, STEEL[5]); L.line(b, 5, 12, 12, 5, STEEL[3]); L.line(b, 2, 10, 6, 14, GOLD[3]); L.line(b, 1, 15, 3, 13, LEATHER_LT)
end)
icon('greatsword', function(b)   -- 대검류
  L.poly(b, { { 4, 10 }, { 13, 1 }, { 15, 3 }, { 6, 12 } }, function(x, y) return x + y < 15 and STEEL[5] or STEEL[3] end)
  L.line(b, 2, 9, 7, 14, GOLD[3]); L.line(b, 1, 15, 4, 12, LEATHER_LT)
end)
icon('arcane', function(b)   -- 마검/비전류
  L.line(b, 4, 12, 13, 3, VIOLET[4]); L.line(b, 5, 12, 13, 4, VIOLET[3]); L.line(b, 2, 10, 6, 14, TEAL[3]); L.set(b, 13, 2, TEAL[5])
  L.set(b, 9, 6, '#ffffff'); L.set(b, 11, 2, TEAL[4]); L.set(b, 14, 6, TEAL[4])
end)

-- ----------------------------------------------------------- v74 도트 키캡(16×16): 황금 테두리 + 어두운 금속 윗면 + 아래 두께(입체) + 미색 글자
local GLYPH = {   -- 3×5 픽셀 글꼴
  E = { "###", "#..", "##.", "#..", "###" }, F = { "###", "#..", "##.", "#..", "#.." }, Q = { ".#.", "#.#", "#.#", "#.#", ".##" },
  I = { "###", ".#.", ".#.", ".#.", "###" }, H = { "#.#", "#.#", "###", "#.#", "#.#" }, T = { "###", ".#.", ".#.", ".#.", ".#." },
  A = { ".#.", "#.#", "###", "#.#", "#.#" }, B = { "##.", "#.#", "##.", "#.#", "##." }, C = { ".##", "#..", "#..", "#..", ".##" },
  X = { "#.#", "#.#", ".#.", "#.#", "#.#" }
}
local function keycap(name, text, accent)
  icon(name, function(b)
    -- 아래 두께(그림자 면) → 테두리 → 윗면
    L.rect(b, 1, 3, 14, 12, "#0e0a06")
    L.rect(b, 1, 1, 14, 12, accent[2]); L.hline(b, 2, 13, 1, accent[4]); L.vline(b, 1, 2, 12, accent[3]); L.vline(b, 14, 2, 12, accent[1])
    L.rect(b, 2, 2, 12, 10, "#1c2230"); L.hline(b, 2, 13, 2, "#2c3446"); L.hline(b, 2, 13, 11, "#141822")
    L.hline(b, 2, 13, 13, accent[1]); L.hline(b, 2, 13, 14, "#2a1a08")
    for _, p in ipairs({ { 1, 1 }, { 14, 1 }, { 1, 12 }, { 14, 12 } }) do L.clear(b, p[1], p[2]) end
    local w = #text * 4 - 1
    local x0 = math.floor((16 - w) / 2)
    for i = 1, #text do
      local g = GLYPH[text:sub(i, i)]
      for row = 1, 5 do for col = 1, 3 do if g[row]:sub(col, col) == "#" then
        L.set(b, x0 + (i - 1) * 4 + col - 1, 3 + row, "#fff0c8"); L.set(b, x0 + (i - 1) * 4 + col - 1, 4 + row, "#0a0806")
        L.set(b, x0 + (i - 1) * 4 + col - 1, 3 + row, "#fff0c8")
      end end end
    end
  end)
end
keycap("key_e", "E", GOLD)
keycap("key_f", "F", TEAL)
keycap("key_q", "Q", { "#1f6a34", "#2fbf5a", "#6fe08a", "#c8ffd8" })
keycap("key_tab", "TAB", GOLD)
keycap("key_i", "I", GOLD)
keycap("key_h", "H", { "#1f6a34", "#2fbf5a", "#6fe08a", "#c8ffd8" })
keycap("key_esc", "X", STONE)
icon('scroll', function(b)   -- 📜 상태·도감 버튼(두루마리 + 룬)
  L.rect(b, 3, 3, 10, 10, '#e8d8b0'); L.hline(b, 3, 12, 3, '#fff6dc'); L.vline(b, 12, 3, 12, '#c8b088')
  L.shadeCyl(b, 1, 2, 3, 12, { '#6e4220', '#a8792a', '#d8ad55' }, 0.0); L.shadeCyl(b, 12, 2, 3, 12, { '#6e4220', '#a8792a', '#d8ad55' }, 0.0)
  for y = 5, 11, 2 do L.hline(b, 5, 10, y, y == 7 and TEAL[3] or '#8a7050') end
  L.set(b, 7, 9, '#c8344a'); L.set(b, 8, 9, '#c8344a')
end)

-- ----------------------------------------------------------- 도트 프레임(9-slice 24×24, 테두리 7px) — 버튼/카드
local function frame(name, edge, fill, glint)
  local b = L.new(24, 24)
  L.rect(b, 1, 1, 22, 22, edge[1])
  L.rect(b, 2, 2, 20, 20, edge[2])
  L.rect(b, 3, 3, 18, 18, edge[3])
  L.hline(b, 3, 20, 3, edge[4]); L.vline(b, 3, 3, 20, edge[4])
  L.rect(b, 5, 5, 14, 14, fill[1])
  L.hline(b, 5, 18, 5, fill[2]); L.hline(b, 5, 18, 6, fill[2])
  for _, p in ipairs({ { 2, 2 }, { 21, 2 }, { 2, 21 }, { 21, 21 } }) do L.rect(b, p[1] - 1, p[2] - 1, 3, 3, glint[1]); L.set(b, p[1], p[2], glint[2]) end
  L.outline(b, OL)
  items[#items + 1] = { name = name, buf = b, w24 = true }
end
frame("frame_gold", { GOLD[1], GOLD[2], GOLD[3], GOLD[4] }, { "#141820", "#1c2230" }, { TEAL[3], TEAL[5] })
frame("frame_teal", { TEAL[1], TEAL[2], TEAL[3], TEAL[4] }, { "#0e1620", "#14202c" }, { GOLD[3], GOLD[4] })
frame("frame_stone", { STONE[1], STONE[2], STONE[3], STONE[5] }, { "#121418", "#1a1e26" }, { GOLD[2], GOLD[3] })
-- v74 슬림 필(9-slice, 테두리 4px): 얇은 황금 테두리 + 안쪽 청록 실선 + 모서리 룬 점
do
  local b = L.new(24, 24)
  L.rect(b, 0, 0, 24, 24, "#2a1a08")
  L.rect(b, 1, 1, 22, 22, GOLD[3]); L.hline(b, 1, 22, 1, GOLD[4]); L.hline(b, 1, 22, 22, GOLD[1])
  L.rect(b, 2, 2, 20, 20, "#0c0a10")
  L.rect(b, 3, 3, 18, 18, "#161a26"); L.hline(b, 3, 20, 3, TEAL[2])
  for _, p in ipairs({ { 0, 0 }, { 23, 0 }, { 0, 23 }, { 23, 23 } }) do L.clear(b, p[1], p[2]) end
  for _, p in ipairs({ { 1, 1 }, { 22, 1 }, { 1, 22 }, { 22, 22 } }) do L.set(b, p[1], p[2], TEAL[4]) end
  items[#items + 1] = { name = "frame_pill", buf = b, w24 = true }
end

-- ----------------------------------------------------------- v76 액션 버튼 큰 아이콘(32×32): 공격 = 룬 가드 대검 + 빛나는 초승달 참격, 구르기 = 날개 달린 대시 부츠 + 속도 궤적
local big = {}
local function icon32(name, fn)
  local b = L.new(32, 32)
  fn(b)
  L.outline(b, OL)
  big[#big + 1] = { name = name, buf = b, w32 = true }
end
icon32("btn_attack", function(b)
  -- 초승달 참격(뒤): 칼날 오른쪽 아래로 휘두른 자리에 남는 빛나는 초승달 궤적 — 칼날과 겹치지 않고, 가운데가 두껍고 양 끝이 가늘다
  for y = 0, 31 do for x = 0, 31 do
    local dx, dy = x + 0.5 - 9, y + 0.5 - 7
    local d = math.sqrt(dx * dx + dy * dy)
    local ex, ey = x + 0.5 - 6.5, y + 0.5 - 4.5
    local e = math.sqrt(ex * ex + ey * ey)
    if d <= 23 and e > 22.2 and dx > -1 and dy > -1 and x + y > 36 then
      L.set(b, x, y, (d > 22) and TEAL[3] or ((e < 23.4) and TEAL[5] or TEAL[4]))
    end
  end end
  -- 칼날(대각선, 아래 왼쪽 손잡이 → 위 오른쪽 끝): 가운데 능선이 가장 밝다
  for i = 0, 15 do
    local x, y = 12 + i, 19 - i
    L.set(b, x, y, STEEL[5]); L.set(b, x - 1, y, STEEL[4]); L.set(b, x, y + 1, STEEL[3]); L.set(b, x - 1, y - 1, STEEL[4]); L.set(b, x + 1, y + 1, STEEL[2])
  end
  L.set(b, 28, 3, STEEL[5]); L.set(b, 29, 2, STEEL[4])
  for _, k in ipairs({ 3, 7, 11 }) do L.set(b, 12 + k, 19 - k, TEAL[4]) end   -- 칼날 위 룬 점
  -- 룬 가드(십자 막이): 칼날에 수직, 금 + 가운데 청록 보석
  for i = -5, 5 do local x, y = 11 + i, 20 + i; L.set(b, x, y, GOLD[3]); L.set(b, x + 1, y, GOLD[2]); if i == -5 or i == 5 then L.set(b, x, y + 1, GOLD[4]) end end
  L.rect(b, 10, 19, 3, 3, TEAL[3]); L.set(b, 11, 20, TEAL[5]); L.set(b, 10, 19, TEAL[4])
  -- 손잡이(가죽) + 폼멜(금)
  for i = 1, 5 do local x, y = 11 - i, 21 + i; L.set(b, x, y, (i % 2 == 0) and LEATHER_DK or LEATHER_LT); L.set(b, x + 1, y, LEATHER_DK) end
  L.rect(b, 4, 26, 3, 3, GOLD[3]); L.set(b, 4, 26, GOLD[4]); L.set(b, 6, 28, GOLD[1])
end)
icon32("btn_dash", function(b)
  -- 속도 궤적(왼쪽 아래로 뻗는 가는 줄 셋)
  L.hline(b, 1, 9, 19, TEAL[3]); L.hline(b, 4, 9, 19, TEAL[4])
  L.hline(b, 0, 8, 23, TEAL[2]); L.hline(b, 3, 8, 23, TEAL[4])
  L.hline(b, 3, 10, 27, TEAL[3]); L.hline(b, 6, 10, 27, TEAL[5])
  -- 부츠(오른쪽을 보는 옆모습): 청록 강철 정강이 + 금 테두리 + 뾰족한 앞코
  L.shadePoly(b, { { 14, 6 }, { 21, 6 }, { 21, 15 }, { 25, 17 }, { 29, 20 }, { 30, 23 }, { 30, 25 }, { 13, 25 }, { 14, 16 } }, TEAL, -0.05)
  L.hline(b, 14, 21, 6, GOLD[4]); L.hline(b, 14, 21, 7, GOLD[3]); L.hline(b, 14, 21, 8, GOLD[1])
  L.hline(b, 13, 30, 25, GOLD[2]); L.hline(b, 13, 30, 26, GOLD[1]); L.hline(b, 14, 29, 24, GOLD[3])
  L.line(b, 21, 15, 28, 20, TEAL[5]); L.line(b, 15, 18, 21, 19, TEAL[2]); L.set(b, 17, 11, TEAL[5]); L.set(b, 18, 13, TEAL[5])
  -- 뒤꿈치 날개: 깃 셋을 어두운 금빛 틈으로 가른다
  L.poly(b, { { 14, 9 }, { 7, 2 }, { 2, 4 }, { 4, 9 }, { 1, 12 }, { 5, 16 }, { 14, 15 } }, GOLD[4])
  L.line(b, 13, 11, 4, 8, GOLD[1]); L.line(b, 13, 13, 3, 12, GOLD[1])
  L.line(b, 13, 10, 7, 4, BONE[3]); L.line(b, 12, 12, 5, 10, BONE[2]); L.line(b, 12, 14, 5, 14, BONE[2])
  L.set(b, 7, 2, BONE[3]); L.set(b, 2, 4, GOLD[3]); L.set(b, 1, 12, GOLD[3])
end)

-- ----------------------------------------------------------- v80 신규 구역 · 신규 보스 소재
local ICE = { '#1a4a6a', '#3a8ab8', '#8ad2ea', '#d8f4ff', '#ffffff' }
local LAVA = { '#1a1218', '#3a2430', '#c8401a', '#f08028', '#ffd070' }
icon('mt_frost', function(b)   -- 만년빙 결정(육각 얼음 기둥 셋)
  L.shadePoly(b, { { 7, 1 }, { 10, 4 }, { 10, 13 }, { 7, 15 }, { 4, 13 }, { 4, 4 } }, ICE, 0.1)
  L.shadePoly(b, { { 2, 7 }, { 4, 6 }, { 5, 13 }, { 3, 15 }, { 1, 13 } }, ICE, 0.05)
  L.shadePoly(b, { { 11, 6 }, { 13, 5 }, { 15, 7 }, { 15, 13 }, { 12, 15 } }, ICE, 0.05)
  L.vline(b, 6, 4, 12, ICE[5]); L.set(b, 7, 2, ICE[5]); L.set(b, 13, 7, ICE[4])
end)
icon('mt_lava', function(b)   -- 용암석(검은 돌 + 붉은 균열)
  L.shadePoly(b, { { 2, 12 }, { 3, 6 }, { 7, 2 }, { 12, 3 }, { 14, 8 }, { 13, 13 }, { 7, 14 } }, LAVA, 0.05)
  L.line(b, 4, 10, 8, 7, LAVA[4]); L.line(b, 8, 7, 12, 8, LAVA[3]); L.line(b, 8, 7, 7, 4, LAVA[4]); L.set(b, 8, 7, LAVA[5]); L.set(b, 5, 9, LAVA[5])
end)
icon('mt_ffang', function(b)   -- 서리 송곳니(휘어진 흰 송곳니 + 서리)
  L.poly(b, { { 3, 2 }, { 8, 1 }, { 11, 4 }, { 13, 9 }, { 13, 14 }, { 10, 10 }, { 6, 6 } }, function(x, y) return (x + y) < 12 and '#fffaea' or (x > 10 and '#a8b8c8' or '#e8e0d0') end)
  L.line(b, 5, 3, 10, 7, '#ffffff'); L.set(b, 12, 12, ICE[3]); L.set(b, 3, 3, ICE[4]); L.set(b, 2, 6, ICE[3]); L.set(b, 14, 5, ICE[4])
end)
icon('mt_dgem', function(b)   -- 태초의 용옥(푸른 빛을 품은 구슬 + 용의 발톱 받침)
  L.shadeEllipse(b, 8, 7, 5.5, 5.5, { '#14284a', '#2a5a9a', '#4a9ae0', '#9ad8ff', '#eef6ff' }, 0.2)
  L.set(b, 6, 5, '#ffffff'); L.set(b, 7, 4, '#ffffff'); L.line(b, 8, 9, 10, 7, '#4deeea')
  L.line(b, 3, 13, 5, 10, '#5a4a60'); L.line(b, 13, 13, 11, 10, '#5a4a60'); L.hline(b, 5, 11, 14, '#3a2a40'); L.set(b, 8, 13, '#5a4a60')
end)
icon('mt_abyss', function(b)   -- 심연의 정수(보랏빛 소용돌이 불꽃)
  L.shadeEllipse(b, 8, 9, 5, 5.5, { '#12061e', '#2a0a40', '#5a3a90', '#b090f0', '#efe4ff' }, 0.1)
  for a = 0, 9 do local t = a / 10 * math.pi * 2.2; L.set(b, math.floor(8 + math.cos(t) * (1 + a * 0.4)), math.floor(9 + math.sin(t) * (1 + a * 0.4)), a % 2 == 0 and '#efe4ff' or '#4deeea') end
  L.set(b, 8, 2, '#b090f0'); L.set(b, 9, 3, '#5a3a90'); L.set(b, 7, 3, '#efe4ff')
end)

-- 배치: 아이콘은 16×16 격자 8열, 프레임은 그 아래 24×24 줄
local icons16, frames = {}, {}
for _, it in ipairs(items) do if it.w24 then frames[#frames + 1] = it else icons16[#icons16 + 1] = it end end
local cols = 8
local rows16 = math.ceil(#icons16 / cols)
local sheetW = math.max(cols * 16, #frames * 24, #big * 32)
local sheet = L.new(sheetW, rows16 * 16 + 24 + 32)   -- v76: 맨 아래 줄 = 32×32 버튼 아이콘
local meta = { items = {} }
for i, it in ipairs(icons16) do
  local x, y = ((i - 1) % cols) * 16, math.floor((i - 1) / cols) * 16
  L.blit(sheet, it.buf, x, y); it.x, it.y = x, y
  meta.items[it.name] = { x, y, 16, 16, 0, 0 }
end
for i, it in ipairs(frames) do
  local x, y = (i - 1) * 24, rows16 * 16
  L.blit(sheet, it.buf, x, y); it.x, it.y = x, y
  meta.items[it.name] = { x, y, 24, 24, 7, 7 }   -- ax/ay = 9-slice 테두리 두께
end
for i, it in ipairs(big) do
  local x, y = (i - 1) * 32, rows16 * 16 + 24
  L.blit(sheet, it.buf, x, y); it.x, it.y = x, y
  meta.items[it.name] = { x, y, 32, 32, 0, 0 }
end
local all = {}
for _, it in ipairs(icons16) do all[#all + 1] = it end
for _, it in ipairs(frames) do all[#all + 1] = it end
for _, it in ipairs(big) do all[#all + 1] = it end
L.saveAtlas(OUT .. "/icons.aseprite", OUT .. "/icons.png", sheet, all)
meta.w, meta.h = sheet.w, sheet.h
L.writeFile(OUT .. "/icons.json", L.json(meta))
print("icons: " .. #icons16 .. " icons + " .. #frames .. " frames, sheet " .. sheet.w .. "x" .. sheet.h)
