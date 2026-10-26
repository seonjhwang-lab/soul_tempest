-- ==========================================================================
-- lib.lua — MOONLIT GROVE 픽셀 아트 생성기의 공용 도구 (Aseprite Lua, `aseprite -b --script`)
-- 픽셀 버퍼(색 문자열 표)에 도형/음영/윤곽선을 그린 뒤 Aseprite Image 로 옮겨 .aseprite 원본과 PNG 시트를 저장한다.
-- 모든 생성기는 결정적이다(같은 입력 → 같은 픽셀). 색은 "#rrggbb" 또는 "#rrggbbaa".
-- ==========================================================================
local L = {}

-- ----------------------------------------------------------- 색
function L.rgba(hex)
  local r = tonumber(hex:sub(2, 3), 16)
  local g = tonumber(hex:sub(4, 5), 16)
  local b = tonumber(hex:sub(6, 7), 16)
  local a = #hex >= 9 and tonumber(hex:sub(8, 9), 16) or 255
  return r, g, b, a
end
local function hx(n) return string.format("%02x", math.max(0, math.min(255, math.floor(n + 0.5)))) end
function L.hex(r, g, b, a) return "#" .. hx(r) .. hx(g) .. hx(b) .. (a and a < 255 and hx(a) or "") end
function L.mix(c1, c2, t)
  local r1, g1, b1, a1 = L.rgba(c1); local r2, g2, b2, a2 = L.rgba(c2)
  return L.hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t, a1 + (a2 - a1) * t)
end
function L.alpha(c, a) local r, g, b = L.rgba(c); return L.hex(r, g, b, a) end
function L.darken(c, t) return L.mix(c, "#0a0a14", t) end

-- ----------------------------------------------------------- 결정적 난수
function L.rng(seed)
  local s = seed % 2147483647
  if s <= 0 then s = s + 2147483646 end
  return function()
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  end
end

-- ----------------------------------------------------------- 버퍼
function L.new(w, h) return { w = w, h = h, p = {} } end
function L.set(b, x, y, c)
  x = math.floor(x); y = math.floor(y)
  if c and x >= 0 and y >= 0 and x < b.w and y < b.h then b.p[y * b.w + x] = c end
end
function L.get(b, x, y)
  if x < 0 or y < 0 or x >= b.w or y >= b.h then return nil end
  return b.p[y * b.w + x]
end
function L.clear(b, x, y) if x >= 0 and y >= 0 and x < b.w and y < b.h then b.p[y * b.w + x] = nil end end
function L.copy(b) local o = L.new(b.w, b.h); for k, v in pairs(b.p) do o.p[k] = v end; return o end
function L.rect(b, x, y, w, h, c) for yy = y, y + h - 1 do for xx = x, x + w - 1 do L.set(b, xx, yy, c) end end end
function L.hline(b, x0, x1, y, c) for x = math.min(x0, x1), math.max(x0, x1) do L.set(b, x, y, c) end end
function L.vline(b, x, y0, y1, c) for y = math.min(y0, y1), math.max(y0, y1) do L.set(b, x, y, c) end end
function L.line(b, x0, y0, x1, y1, c)
  x0, y0, x1, y1 = math.floor(x0 + 0.5), math.floor(y0 + 0.5), math.floor(x1 + 0.5), math.floor(y1 + 0.5)
  local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0)
  local sx, sy = x0 < x1 and 1 or -1, y0 < y1 and 1 or -1
  local err = dx + dy
  while true do
    L.set(b, x0, y0, c)
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err
    if e2 >= dy then err = err + dy; x0 = x0 + sx end
    if e2 <= dx then err = err + dx; y0 = y0 + sy end
  end
end
-- 칠하기: fn(x, y) 가 색을 돌려주면 그 픽셀을 칠한다
function L.each(b, x0, y0, x1, y1, fn)
  for y = math.floor(y0), math.ceil(y1) do
    for x = math.floor(x0), math.ceil(x1) do
      local c = fn(x, y)
      if c then L.set(b, x, y, c) end
    end
  end
end
function L.ellipse(b, cx, cy, rx, ry, c)
  L.each(b, cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, function(x, y)
    local nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
    if nx * nx + ny * ny <= 1 then return c end
  end)
end
-- 다각형(짝-홀 규칙) 채우기
function L.inPoly(pts, x, y)
  local inside, j = false, #pts
  for i = 1, #pts do
    local xi, yi, xj, yj = pts[i][1], pts[i][2], pts[j][1], pts[j][2]
    if ((yi > y) ~= (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi) then inside = not inside end
    j = i
  end
  return inside
end
function L.poly(b, pts, c)
  local x0, y0, x1, y1 = 1e9, 1e9, -1e9, -1e9
  for _, p in ipairs(pts) do x0 = math.min(x0, p[1]); y0 = math.min(y0, p[2]); x1 = math.max(x1, p[1]); y1 = math.max(y1, p[2]) end
  L.each(b, x0 - 1, y0 - 1, x1 + 1, y1 + 1, function(x, y)
    if L.inPoly(pts, x + 0.5, y + 0.5) then return type(c) == "function" and c(x, y) or c end
  end)
end

-- ----------------------------------------------------------- 음영(달빛: 왼쪽 위에서)
local LX, LY, LZ = -0.55, -0.70, 0.45
do local n = math.sqrt(LX * LX + LY * LY + LZ * LZ); LX, LY, LZ = LX / n, LY / n, LZ / n end
function L.setLight(x, y, z) local n = math.sqrt(x * x + y * y + z * z); LX, LY, LZ = x / n, y / n, z / n end
-- ramp: 어두운 색 → 밝은 색 목록. bias 는 전체 밝기를 민다.
function L.pick(ramp, v)
  local i = math.floor(v * #ramp) + 1
  if i < 1 then i = 1 end
  if i > #ramp then i = #ramp end
  return ramp[i]
end
function L.shadeEllipse(b, cx, cy, rx, ry, ramp, bias, clip)
  bias = bias or 0
  L.each(b, cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, function(x, y)
    local nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
    local d = nx * nx + ny * ny
    if d > 1 then return nil end
    if clip and not clip(x, y) then return nil end
    local nz = math.sqrt(math.max(0, 1 - d))
    local v = (nx * LX + ny * LY + nz * LZ) * 0.5 + 0.5 + bias
    return L.pick(ramp, v)
  end)
end
-- 세로 원통 음영(몸통/기둥/나무줄기): 가로 위치로만 밝기가 정해진다
function L.shadeCyl(b, x, y, w, h, ramp, bias, clip)
  bias = bias or 0
  for yy = y, y + h - 1 do
    for xx = x, x + w - 1 do
      if not clip or clip(xx, yy) then
        local nx = ((xx + 0.5) - (x + w / 2)) / (w / 2)
        local nz = math.sqrt(math.max(0, 1 - nx * nx))
        local v = (nx * LX + nz * LZ) * 0.5 + 0.5 + bias - (yy - y) / math.max(1, h) * 0.12
        L.set(b, xx, yy, L.pick(ramp, v))
      end
    end
  end
end
-- 다각형 + 가로 음영
function L.shadePoly(b, pts, ramp, bias)
  local x0, x1 = 1e9, -1e9
  for _, p in ipairs(pts) do x0 = math.min(x0, p[1]); x1 = math.max(x1, p[1]) end
  local cx, hw = (x0 + x1) / 2, math.max(1, (x1 - x0) / 2)
  L.poly(b, pts, function(x, y)
    local nx = ((x + 0.5) - cx) / hw
    if nx > 1 then nx = 1 elseif nx < -1 then nx = -1 end
    local nz = math.sqrt(math.max(0, 1 - nx * nx))
    return L.pick(ramp, (nx * LX + nz * LZ) * 0.5 + 0.5 + (bias or 0))
  end)
end

-- ----------------------------------------------------------- 템플릿 찍기(ASCII)
-- rows: 문자열 목록, pal: 문자 → 색. '.' 과 ' ' 는 투명.
function L.stamp(b, rows, pal, ox, oy, mirror)
  for j, row in ipairs(rows) do
    local n = #row
    for i = 1, n do
      local ch = row:sub(i, i)
      local c = pal[ch]
      if c then
        local x = mirror and (ox + n - i) or (ox + i - 1)
        L.set(b, x, oy + j - 1, c)
      end
    end
  end
end

-- ----------------------------------------------------------- 후처리
-- 바깥 윤곽선: 불투명 픽셀에 4방향으로 닿은 투명 픽셀을 윤곽색으로. sel=true 면 이웃 색을 어둡게 한 색(selective outline)
function L.outline(b, c, sel, diag)
  local add = {}
  for y = 0, b.h - 1 do
    for x = 0, b.w - 1 do
      if not L.get(b, x, y) then
        local nb = L.get(b, x - 1, y) or L.get(b, x + 1, y) or L.get(b, x, y - 1) or L.get(b, x, y + 1)
        if not nb and diag then nb = L.get(b, x - 1, y - 1) or L.get(b, x + 1, y - 1) or L.get(b, x - 1, y + 1) or L.get(b, x + 1, y + 1) end
        if nb then
          local _, _, _, a = L.rgba(nb)
          if a > 160 then add[#add + 1] = { x, y, sel and L.darken(nb, 0.78) or c } end
        end
      end
    end
  end
  for _, q in ipairs(add) do L.set(b, q[1], q[2], q[3]) end
end
-- 안쪽 윤곽(실루엣 가장자리 픽셀을 어둡게) — 큰 물체의 형태를 또렷하게
function L.innerEdge(b, t, onlyBottom)
  local chg = {}
  for y = 0, b.h - 1 do
    for x = 0, b.w - 1 do
      local c = L.get(b, x, y)
      if c then
        local edge = (not L.get(b, x, y + 1)) or (not onlyBottom and (not L.get(b, x + 1, y)))
        if edge then chg[#chg + 1] = { x, y, L.darken(c, t) } end
      end
    end
  end
  for _, q in ipairs(chg) do L.set(b, q[1], q[2], q[3]) end
end
function L.mirror(b)
  local o = L.new(b.w, b.h)
  for k, v in pairs(b.p) do
    local y = math.floor(k / b.w); local x = k - y * b.w
    o.p[y * b.w + (b.w - 1 - x)] = v
  end
  return o
end
function L.shift(b, dx, dy)
  local o = L.new(b.w, b.h)
  for k, v in pairs(b.p) do
    local y = math.floor(k / b.w); local x = k - y * b.w
    L.set(o, x + dx, y + dy, v)
  end
  return o
end
function L.blit(dst, src, ox, oy)
  for k, v in pairs(src.p) do
    local y = math.floor(k / src.w); local x = k - y * src.w
    L.set(dst, ox + x, oy + y, v)
  end
end
-- 색 바꾸기(팔레트 스왑)
function L.recolor(b, map)
  local o = L.new(b.w, b.h)
  for k, v in pairs(b.p) do o.p[k] = map[v] or v end
  return o
end
-- 실루엣만 한 색으로
function L.silhouette(b, c)
  local o = L.new(b.w, b.h)
  for k, v in pairs(b.p) do local _, _, _, a = L.rgba(v); o.p[k] = L.alpha(c, a) end
  return o
end
function L.count(b) local n = 0; for _ in pairs(b.p) do n = n + 1 end; return n end

-- ----------------------------------------------------------- Aseprite 로 옮기기
function L.toImage(b)
  local img = Image(b.w, b.h, ColorMode.RGB)
  img:clear(0)
  local pc = app.pixelColor
  for k, v in pairs(b.p) do
    local y = math.floor(k / b.w); local x = k - y * b.w
    local r, g, bb, a = L.rgba(v)
    img:drawPixel(x, y, pc.rgba(r, g, bb, a))
  end
  return img
end

-- 애니메이션 원본: frames = { {buf=, tag=} ... }, layerName. tags 는 연속 프레임마다 묶인다.
function L.saveAnimation(path, w, h, frames, layerName, durMs)
  local spr = Sprite(w, h, ColorMode.RGB)
  spr.layers[1].name = layerName or "body"
  for i = 2, #frames do spr:newEmptyFrame() end
  local tags, cur = {}, nil
  for i, f in ipairs(frames) do
    spr:newCel(spr.layers[1], spr.frames[i], L.toImage(f.buf), Point(0, 0))
    spr.frames[i].duration = (f.dur or durMs or 100) / 1000
    if f.tag then
      if cur and cur.name == f.tag then cur.to = i
      else cur = { name = f.tag, from = i, to = i }; tags[#tags + 1] = cur end
    else cur = nil end
  end
  for _, t in ipairs(tags) do
    local tg = spr:newTag(t.from, t.to)
    tg.name = t.name
  end
  spr:saveAs(path)
  spr:close()
end

-- 격자 시트(PNG): 각 프레임을 cols 열로 배치한다
function L.sheet(frames, fw, fh, cols)
  local rows = math.ceil(#frames / cols)
  local s = L.new(fw * cols, fh * rows)
  for i, f in ipairs(frames) do
    local c = (i - 1) % cols; local r = math.floor((i - 1) / cols)
    L.blit(s, f.buf or f, c * fw, r * fh)
  end
  return s
end
function L.savePNG(path, buf)
  local spr = Sprite(buf.w, buf.h, ColorMode.RGB)
  spr:newCel(spr.layers[1], spr.frames[1], L.toImage(buf), Point(0, 0))
  spr:saveCopyAs(path)
  spr:close()
end
-- 아틀라스: items = { {name=, buf=, ax=, ay=} }. 선반 채우기로 묶어 PNG 하나 + 각 항목의 슬라이스를 단 .aseprite 를 만든다.
function L.atlas(items, maxW, pad)
  pad = pad or 1
  table.sort(items, function(a, b) if a.buf.h ~= b.buf.h then return a.buf.h > b.buf.h end; return a.name < b.name end)
  local x, y, rowH, W = pad, pad, 0, maxW
  for _, it in ipairs(items) do
    if x + it.buf.w + pad > W then x = pad; y = y + rowH + pad; rowH = 0 end
    it.x, it.y = x, y
    x = x + it.buf.w + pad
    rowH = math.max(rowH, it.buf.h)
  end
  local H = y + rowH + pad
  local s = L.new(W, H)
  for _, it in ipairs(items) do L.blit(s, it.buf, it.x, it.y) end
  return s, items
end
function L.saveAtlas(asePath, pngPath, sheet, items)
  local spr = Sprite(sheet.w, sheet.h, ColorMode.RGB)
  spr.layers[1].name = "atlas"
  spr:newCel(spr.layers[1], spr.frames[1], L.toImage(sheet), Point(0, 0))
  for _, it in ipairs(items) do
    local sl = spr:newSlice(Rectangle(it.x, it.y, it.buf.w, it.buf.h))
    sl.name = it.name
    sl.pivot = Point(it.ax or 0, it.ay or 0)
  end
  spr:saveAs(asePath)
  spr:saveCopyAs(pngPath)
  spr:close()
end

-- ----------------------------------------------------------- JSON(아주 작은 직렬화기)
local function enc(v)
  local t = type(v)
  if t == "number" then
    if v == math.floor(v) then return string.format("%d", v) end
    return string.format("%.3f", v)
  elseif t == "string" then return '"' .. v:gsub('"', '\\"') .. '"'
  elseif t == "boolean" then return v and "true" or "false"
  elseif t == "table" then
    if #v > 0 or next(v) == nil then
      local o = {}
      for _, x in ipairs(v) do o[#o + 1] = enc(x) end
      return "[" .. table.concat(o, ",") .. "]"
    end
    local keys = {}
    for k in pairs(v) do keys[#keys + 1] = k end
    table.sort(keys)
    local o = {}
    for _, k in ipairs(keys) do o[#o + 1] = enc(tostring(k)) .. ":" .. enc(v[k]) end
    return "{" .. table.concat(o, ",") .. "}"
  end
  return "null"
end
L.json = enc
function L.writeFile(path, s) local f = assert(io.open(path, "w")); f:write(s); f:close() end

return L
