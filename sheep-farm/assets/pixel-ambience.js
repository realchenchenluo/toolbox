/* Lightweight local pixel ambience inspired by procedural pixel experiments.
 * It draws only a few low-resolution particles, so the farm remains offline-first. */
(function () {
  'use strict';

  var scene = document.getElementById('pasture-scene');
  var canvas = document.getElementById('pixel-ambience');
  if (!scene || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d'), particles = [], logicalWidth = 160, logicalHeight = 90;
  var lastFrame = 0, frameHandle = 0, reduced = false;
  try { reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (error) {}

  function resize() {
    var rect = scene.getBoundingClientRect(), ratio = 4;
    logicalWidth = Math.max(80, Math.floor(rect.width / ratio));
    logicalHeight = Math.max(60, Math.floor(rect.height / ratio));
    canvas.width = logicalWidth;
    canvas.height = logicalHeight;
  }

  function seedParticles() {
    var seed = 17;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    for (var i = 0; i < 22; i += 1) {
      particles.push({
        x: random(), y: .16 + random() * .7, phase: random() * 6.28,
        drift: .3 + random() * .7, speed: .25 + random() * .55, size: random() < .72 ? 1 : 2
      });
    }
  }

  function draw(time) {
    frameHandle = window.requestAnimationFrame ? window.requestAnimationFrame(draw) : 0;
    if (time - lastFrame < 42) return;
    lastFrame = time;
    var night = scene.classList.contains('night-mode');
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    particles.forEach(function (particle, index) {
      particle.y -= particle.speed * .00035;
      if (particle.y < .12) particle.y = .87;
      var x = Math.floor((particle.x + Math.sin(time * .00025 * particle.drift + particle.phase) * .012) * logicalWidth);
      var y = Math.floor((particle.y + Math.cos(time * .0002 + particle.phase) * .01) * logicalHeight);
      var alpha = .2 + (Math.sin(time * .002 * particle.drift + particle.phase) + 1) * .18;
      if (night) {
        if (index % 3 !== 0) return;
        ctx.fillStyle = index % 2 ? 'rgba(247,218,126,' + alpha.toFixed(2) + ')' : 'rgba(157,197,224,' + alpha.toFixed(2) + ')';
      } else {
        if (index % 2 === 0) return;
        ctx.fillStyle = 'rgba(244,239,174,' + (alpha * .7).toFixed(2) + ')';
      }
      ctx.fillRect(x, y, particle.size, particle.size);
    });
  }

  function start() {
    resize(); seedParticles();
    if (!reduced && window.requestAnimationFrame) frameHandle = window.requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  start();
  window.addEventListener('pagehide', function () { if (frameHandle && window.cancelAnimationFrame) window.cancelAnimationFrame(frameHandle); });
}());
