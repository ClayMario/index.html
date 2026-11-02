/* The Beach Theory print: one repeat tile, used everywhere a design is drawn.
   - Motifs sit on an even triangular (half-drop) grid: every other row shifts
     half a step, so each motif is the same distance from its six neighbours.
   - The repeat tile is 4 x 4 grid points. Each of its 16 positions has its own
     fixed nudge, tilt, size and facing, so the print looks hand-scattered but
     repeats exactly, like a printed fabric roll. Tiles butt seamlessly and are
     simply cut at the garment's edge.
   - Icons are assigned so neighbours never match and every icon is used equally:
     3+ icons: index = (q + k * row) mod n on axial grid coordinates (k per n);
     2 icons: a diamond grid where rows alternate, so the nearest neighbours
     are always the other icon.
   - Spacing: motifs sit 1.3x the caller's step apart and are drawn at 72% of
     the caller's size, leaving open background.
   - Even visual weight: image icons are trimmed to their visible outline first,
     and sized by area (capped for long shapes), so a slim whale carries the
     same visual weight as a round duck.
   BTCPattern.slots(width, height, step, originX, originY, n) -> [{x, y, rot, scale, flip, idx}]
   BTCPattern.draw(ctx, width, height, step, originX, originY, icons, size) */
(function (root) {
  // the 16 positions of the repeat tile: [nudge x, nudge y] (fraction of the step), tilt (deg), size, mirrored
  var TILE = [
    [ 0.06, -0.04, -14, 1.04, 0], [-0.05,  0.06,   9, 0.96, 1], [ 0.03,  0.02,  -4, 1.00, 0], [-0.07, -0.05,  16, 1.06, 0],
    [-0.04,  0.05,   5, 0.98, 0], [ 0.07, -0.03, -18, 1.02, 0], [-0.02, -0.07,  12, 0.94, 1], [ 0.05,  0.04,  -8, 1.00, 0],
    [ 0.02, -0.06,  17, 1.00, 1], [-0.06,  0.03,  -3, 1.05, 0], [ 0.05,  0.07, -12, 0.97, 0], [-0.03, -0.02,   7, 1.01, 0],
    [-0.05,  0.02, -10, 0.99, 0], [ 0.04, -0.05,  14, 1.03, 0], [-0.01,  0.06,  -1, 0.95, 0], [ 0.06,  0.01, -16, 1.02, 1]
  ];
  var K = { 1: 0, 2: 0, 3: 2, 4: 2, 5: 4, 6: 2 };
  function mod(a, m) { return ((a % m) + m) % m; }
  var SPACING = 1.3;   // gap between motifs, relative to the step a caller passes
  var MOTIF = 0.72;    // motif size, relative to the size a caller passes
  function slots(W, H, step, ox, oy, n) {
    step *= SPACING;
    // 2 icons: a diamond grid (rows half a step apart, alternating icons by row), so
    // every nearest neighbour is the other icon. 1 or 3+ icons: an even triangular grid.
    var two = n === 2;
    if (two) step *= 1.3;
    var dy = two ? step / 2 : step * 0.866, out = [], k = K[n] || 2;
    var r0 = Math.floor(-oy / dy) - 1, r1 = Math.ceil((H - oy) / dy) + 1;
    for (var R = r0; R <= r1; R++) {
      var shift = mod(R, 2) ? step / 2 : 0;
      var c0 = Math.floor((-ox - shift) / step) - 1, c1 = Math.ceil((W - ox - shift) / step) + 1;
      for (var C = c0; C <= c1; C++) {
        var t = TILE[mod(R, 4) * 4 + mod(C, 4)];
        var q = C - (R - mod(R, 2)) / 2;
        out.push({
          x: ox + C * step + shift + t[0] * step,
          y: oy + R * dy + t[1] * step,
          rot: t[2] * Math.PI / 180, scale: t[3], flip: !!t[4],
          idx: two ? mod(R, 2) : n > 1 ? mod(q + k * R, n) : 0
        });
      }
    }
    return out;
  }
  // crop an image icon to its visible pixels (cached on the image)
  function trim(img) {
    if (!img || typeof img === 'string') return img;
    if (img.__btcTrim) return img.__btcTrim;
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, out = img;
    try {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d'); g.drawImage(img, 0, 0);
      var d = g.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 >= x0) { out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1; out.getContext('2d').drawImage(img, -x0, -y0); }
    } catch (e) { out = img; }
    img.__btcTrim = out; return out;
  }
  // draw the print. icons[i] is an Image or an emoji string; size = motif size in px
  function draw(ctx, W, H, step, ox, oy, icons, size) {
    var n = icons.length; if (!n) return;
    icons = icons.map(trim); size *= MOTIF;
    slots(W, H, step, ox, oy, n).forEach(function (s) {
      var v = icons[s.idx], z = size * s.scale;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); if (s.flip) ctx.scale(-1, 1);
      if (typeof v === 'string') { ctx.font = Math.round(z * 0.82) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(v, 0, z * 0.04); }
      else if (v) { var iw = v.naturalWidth || v.width, ih = v.naturalHeight || v.height, f = Math.min(z * 0.86 / Math.sqrt(iw * ih), z * 1.45 / Math.max(iw, ih)); ctx.drawImage(v, -iw * f / 2, -ih * f / 2, iw * f, ih * f); }
      ctx.restore();
    });
  }
  root.BTCPattern = { slots: slots, draw: draw, trim: trim };
})(typeof window !== 'undefined' ? window : globalThis);
