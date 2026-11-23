/* Original local pixel grass. Spring bending and short trampling were informed by:
 * https://www.spritecook.ai/blog/interactive-tall-grass-top-down-pixel-art
 * Sheep remain complete PNGs; this module only draws the plants. */
(function (root) {
  'use strict';

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function randomSource(seed) {
    return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function makeTufts(width, height) {
    var random = randomSource(73129), patches = [[.27,.30],[.65,.31],[.45,.48],[.27,.69],[.69,.68]];
    var count = clamp(Math.round(width * height / 3300), 42, 108), tufts = [];
    for (var i = 0; i < count; i += 1) {
      var patch = patches[i % patches.length], angle = random() * Math.PI * 2, radius = Math.sqrt(random());
      var x = (patch[0] + Math.cos(angle) * radius * .105) * width;
      var y = (patch[1] + Math.sin(angle) * radius * .105) * height;
      // Keep the foot of the grass inside the paddock and leave both trough approaches clear.
      x = clamp(x, 55, width - 55); y = clamp(y, height * .19, height * .81);
      tufts.push({ x:x, y:y, variant:i % 4, flip:random() < .5, phase:random() * Math.PI * 2,
        lean:0, velocity:0, press:0, side:0, pusher:'', touch:-10, edge:radius > .86 });
    }
    return tufts;
  }
  function stepTuft(tuft, actors, dt, time, reduced) {
    var closest = null, best = Infinity;
    actors.forEach(function (actor) {
      var dx = tuft.x - actor.x, dy = tuft.y - actor.y;
      if (Math.abs(dx) > 29 || dy < -17 || dy > 17) return;
      var score = dx * dx + dy * dy * 1.5;
      if (actor.id === tuft.pusher) score *= .65;
      if (score < best) { best = score; closest = actor; }
    });
    var target = 0, trampled = false, touched = false;
    if (closest) {
      var dx = tuft.x - closest.x, dy = tuft.y - closest.y;
      if (tuft.pusher !== closest.id || !tuft.side) {
        tuft.side = dx === 0 ? (closest.direction < 0 ? -1 : 1) : dx < 0 ? -1 : 1;
        tuft.pusher = closest.id;
      }
      target = tuft.side * 4.5 * clamp((29 - Math.abs(dx)) / 15, 0, 1) * clamp((18 - Math.abs(dy)) / 10, 0, 1);
      trampled = !tuft.edge && Math.abs(dx) < 13 && dy > -13 && dy < 3;
      if (Math.abs(target) > 1.2 && time - tuft.touch > .8) { tuft.touch = time; touched = true; }
    } else { tuft.side = 0; tuft.pusher = ''; }
    tuft.press += clamp((trampled ? 1 : 0) - tuft.press, -dt / .7, dt / .12);
    if (reduced) { tuft.lean = target * .45; tuft.velocity = 0; return touched; }
    // Substeps keep the spring stable when rendering at 30 fps or returning from a slow frame.
    var remaining = Math.min(dt, .1), omega = 2 * Math.PI * 2.6;
    while (remaining > .00001) {
      var step = Math.min(1 / 60, remaining);
      var acceleration = omega * omega * (target - tuft.lean) - 2 * .28 * omega * tuft.velocity;
      tuft.velocity += acceleration * step;
      tuft.lean = clamp(tuft.lean + tuft.velocity * step, -6, 6);
      remaining -= step;
    }
    if (!closest && Math.abs(tuft.lean) < .015 && Math.abs(tuft.velocity) < .08) { tuft.lean = 0; tuft.velocity = 0; }
    return touched;
  }
  // Pure helpers allow movement/regrowth checks without a browser or a rendering engine.
  root.FarmGrassPhysics = { makeTufts:makeTufts, stepTuft:stepTuft };

  root.createFarmGrassField = function (options) {
    var field = options.field, scene = options.scene;
    var probe = document.createElement('canvas');
    if (!field || !scene || !probe.getContext || !probe.getContext('2d')) return null;
    var tufts = [], nodes = [], actors = {}, width = 0, height = 0, last = 0, frame = 0, enabled = true;
    var palettes = {}, lastNight = null, reduced = false, visibilityPaused = false, destroyed = false;
    try { reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (error) {}
    var canAnimate = typeof root.requestAnimationFrame === 'function';

    function art(variant, shade, night) {
      var key = variant + '-' + shade + '-' + night;
      if (palettes[key]) return palettes[key];
      var canvas = document.createElement('canvas'); canvas.width = 12; canvas.height = 14;
      var ctx = canvas.getContext('2d'), colors = night ? ['#35563b','#456d40','#5d8351','#7b9b61'] : ['#4f803c','#66983f','#85b34f','#a1c967'];
      function color(index) { return colors[Math.max(0, index - shade)]; }
      // Roots form one connected cluster; blades have four different, fixed silhouettes.
      ctx.fillStyle = color(0); ctx.fillRect(1,11,10,3); ctx.fillRect(2,10,8,2);
      var blades = [
        [[1,4,4],[4,0,6],[7,3,6],[10,5,7]],
        [[0,5,4],[3,2,5],[6,0,6],[9,3,7]],
        [[1,2,5],[4,5,5],[7,0,7],[10,4,7]],
        [[0,4,4],[3,0,5],[6,3,6],[9,1,7]]
      ][variant];
      blades.forEach(function (blade, i) {
        var x = blade[0], top = blade[1], base = blade[2];
        for (var y = top; y < 12; y += 1) {
          var t = (y - top) / Math.max(1, 12 - top), xx = Math.round(x + (base - x) * t);
          ctx.fillStyle = color(y < top + 3 ? 3 : i % 2 ? 2 : 1);
          ctx.fillRect(xx, y, y > 7 ? 2 : 1, 1);
        }
      });
      palettes[key] = canvas; return canvas;
    }
    function resize() {
      var bounds = field.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      var nextWidth = Math.round(bounds.width), nextHeight = Math.round(bounds.height);
      if (nextWidth === width && nextHeight === height && nodes.length) return;
      nodes.forEach(function (node) { if (node.parentNode) node.parentNode.removeChild(node); });
      width = nextWidth; height = nextHeight; actors = {};
      tufts = makeTufts(width, height);
      nodes = tufts.map(function (tuft) {
        var node = document.createElement('canvas'); node.width = 30; node.height = 26;
        node.className = 'interactive-grass-tuft'; node.setAttribute('aria-hidden','true');
        node.style.left = Math.round(tuft.x) + 'px'; node.style.top = Math.round(tuft.y) + 'px';
        node.style.zIndex = Math.round(tuft.y); node._grassContext = node.getContext('2d');
        return node;
      });
      field.setAttribute('data-grass-count', String(tufts.length));
    }
    function attach() {
      resize();
      nodes.forEach(function (node) { if (node.parentNode !== field) field.appendChild(node); });
      nodes.forEach(function (node) { node._grassKey = ''; });
      drawFrame(Date.now(), true);
    }
    function smoothActors(now) {
      var incoming = options.getActors(), result = [], seen = {};
      incoming.forEach(function (actor) {
        var id = actor.id, sample = actors[id], x = actor.x * width / 100, y = actor.y * height / 100 + actor.feet;
        if (!sample) sample = actors[id] = { fromX:x, fromY:y, x:x, y:y, at:now };
        var t = Math.min(1, (now - sample.at) / 260);
        var visibleX = sample.fromX + (sample.x - sample.fromX) * t, visibleY = sample.fromY + (sample.y - sample.fromY) * t;
        if (sample.x !== x || sample.y !== y) { sample.fromX = visibleX; sample.fromY = visibleY; sample.x = x; sample.y = y; sample.at = now; }
        result.push({ id:id, x:visibleX, y:visibleY, direction:actor.direction }); seen[id] = true;
      });
      Object.keys(actors).forEach(function (id) { if (!seen[id]) delete actors[id]; });
      return result;
    }
    function paint(tuft, node, time, night) {
      var press = tuft.press * tuft.press * (3 - 2 * tuft.press), h = Math.max(6, Math.round(14 * (1 - .57 * press)));
      var shade = tuft.press > .6 ? 2 : tuft.press > .3 ? 1 : 0;
      var age = time - tuft.touch, rustling = enabled && !reduced && age >= 0 && age < .35;
      var wind = reduced || !enabled ? 0 : Math.sin(time * 1.15 + tuft.phase) * .6 + Math.sin(time * .55 + tuft.x * .012) * .3;
      var shake = rustling ? Math.sin(age * 55 + tuft.phase) * (1 - age / .35) * 1.1 : 0;
      var amount = tuft.lean + wind + shake, offsets = [];
      for (var row = 0; row < h; row += 1) offsets.push(Math.round(amount * Math.pow(1 - row / Math.max(1,h - 1),1.6)));
      var key = night + '|' + shade + '|' + h + '|' + offsets.join(',') + (rustling ? '|' + Math.floor(age * 24) : '');
      if (node._grassKey === key) return;
      node._grassKey = key;
      var ctx = node._grassContext, source = art(tuft.variant, shade, night);
      ctx.clearRect(0,0,30,26); ctx.imageSmoothingEnabled = false;
      // Every source row moves by whole pixels; the base is fixed at row 24.
      ctx.save();
      if (tuft.flip) { ctx.translate(30,0); ctx.scale(-1,1); }
      for (var r = 0; r < h; r += 1) {
        var sy = Math.round(r * 13 / Math.max(1,h - 1));
        // Mirror the blade silhouette while keeping the bend in world-space direction.
        ctx.drawImage(source,0,sy,12,1,9 + (tuft.flip ? -offsets[r] : offsets[r]),24 - h + r,12,1);
      }
      ctx.restore();
      if (rustling) {
        ctx.fillStyle = night ? '#7b9b61' : '#b4d381';
        for (var i = 0; i < 3; i += 1) {
          var px = Math.round(14 + (i - 1) * 3 + tuft.side * age * 14), py = Math.round(22 - h - age * 17 + age * age * 35 + i * 2);
          ctx.fillRect(px,py,1,1);
        }
      }
      node.setAttribute('data-lean', String(Math.round(tuft.lean * 10) / 10));
      node.setAttribute('data-press', String(Math.round(tuft.press * 100) / 100));
    }
    function drawFrame(now, force) {
      var dt = last ? Math.min(.08, Math.max(0,(now - last) / 1000)) : 1 / 30;
      if (!force && now - last < 32) return;
      last = now;
      var near = enabled ? smoothActors(now) : [], night = scene.classList.contains('night-mode'), time = now / 1000, bent = 0;
      tufts.forEach(function (tuft,index) {
        stepTuft(tuft,near,dt,time,reduced);
        if (!enabled) { tuft.lean = 0; tuft.velocity = 0; tuft.press = 0; }
        if (Math.abs(tuft.lean) >= .5 || tuft.press > .1) bent += 1;
        paint(tuft,nodes[index],time,night);
      });
      if (lastNight !== night) { lastNight = night; field.setAttribute('data-grass-night',String(night)); }
      field.setAttribute('data-grass-bent',String(bent));
    }
    function loop() {
      frame = 0;
      if (visibilityPaused || destroyed) return;
      drawFrame(Date.now(),false);
      frame = root.requestAnimationFrame(loop);
    }
    function resume() {
      if (destroyed) return;
      visibilityPaused = false; last = 0;
      if (canAnimate && !frame) frame = root.requestAnimationFrame(loop);
    }
    function pause() {
      visibilityPaused = true;
      if (frame && root.cancelAnimationFrame) root.cancelAnimationFrame(frame);
      frame = 0;
    }
    root.addEventListener('resize',attach);
    root.addEventListener('pagehide',pause); root.addEventListener('pageshow',resume);
    function handleVisibility() { if (document.visibilityState === 'hidden') pause(); else resume(); }
    document.addEventListener('visibilitychange',handleVisibility);
    resize(); resume();
    return {
      attach:attach,
      refresh:function () { if (!canAnimate) drawFrame(Date.now(),true); },
      setEnabled:function (value) { enabled = !!value; },
      destroy:function () { destroyed = true; pause(); nodes.forEach(function (node) { if (node.parentNode) node.parentNode.removeChild(node); }); root.removeEventListener('resize',attach); root.removeEventListener('pagehide',pause); root.removeEventListener('pageshow',resume); document.removeEventListener('visibilitychange',handleVisibility); }
    };
  };
}(window));
