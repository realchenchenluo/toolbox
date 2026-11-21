(function (root) {
'use strict';
function inside(p, poly) {
  var hit = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    var a = poly[i], b = poly[j];
    if ((a[1] > p.y) !== (b[1] > p.y) && p.x < (b[0] - a[0]) * (p.y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}
function distance(p, a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1];
  var f = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a[0] - f * dx, p.y - a[1] - f * dy);
}
function contains(item, p, tolerance) {
  var b = item.bounds;
  if (!b || p.x < b[0] - tolerance || p.x > b[2] + tolerance || p.y < b[1] - tolerance || p.y > b[3] + tolerance) return false;
  return item.polygons.some(function(poly) {
    if (inside(p, poly)) return true;
    for (var i = 0; i < poly.length; i++) if (distance(p, poly[i], poly[(i + 1) % poly.length]) <= tolerance) return true;
    return false;
  });
}
function sample(points) {
  if (!points.length) return [];
  var samples = [points[0]];
  for (var i = 1; i < points.length; i++) {
    var a = points[i - 1], b = points[i], n = Math.min(160,Math.max(1,Math.ceil(Math.hypot(b.x - a.x,b.y - a.y) / 3)));
    for (var j = 1; j <= n; j++) samples.push({x:a.x + (b.x - a.x) * j / n,y:a.y + (b.y - a.y) * j / n});
  }
  if (samples.length > 700) {
    var step = samples.length / 700;
    return Array.from({length:700},function(_,k) { return samples[Math.floor(k * step)]; });
  }
  return samples;
}
function match(items, points, tolerance) {
  var samples = sample(points), best = -1, score = 0;
  if (!samples.length) return -1;
  items.forEach(function(item,index) {
    var hits = 0;
    samples.forEach(function(p) { if (contains(item,p,tolerance)) hits++; });
    var ratio = hits / samples.length;
    // Crossing strokes cannot collect all objects along their path.
    if (ratio < .65 || ratio <= score) return;
    best = index; score = ratio;
  });
  return best;
}
var api = {inside:inside,contains:contains,match:match};
root.HiddenRecognition = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
