/* Scroll and WebGL effects for the landing page.
   Every rule these effects need sits under html.motion, and only this file sets that class,
   so the page reads the same when the file fails to load or the visitor prefers reduced motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Rise into view once. Elements that enter together are staggered.
  var REVEAL = '.services li, .sec h2, .sec .sub, .pick, .match-card, .filter, .group, .dev, .prod, .course, .steps li, .finder-panel .cta, .store-directory, .faq details, .contact .cta, .qr, .more, .naily-in > *';
  // Get --k: 0 when the top edge enters at the bottom of the viewport, 1 when the bottom edge leaves at the top.
  var SCRUB = '.group, .tile, .steps';
  // Count up from 0 the first time they come into view.
  var COUNT = '.count b, .fact .num';

  // Flowing silk behind a section, drawn by one fragment shader.
  var SILKS = [
    { host: '#hero', ground: [0.984, 0.965, 0.957], mix: 0.7, anchor: ['.arch', 0.5, 0.4], wide: 1.1, narrow: 0.55, pointer: true,
      flow: function () { return scrollY * 0.004; } },
    { host: '#contact', ground: [0.29, 0.184, 0.161], mix: 0.7, anchor: ['.qrs', 0.5, 0.5], wide: 0.9, narrow: 0.6 },
  ];

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform float uTime, uRad, uMix, uFlow;',
    'uniform vec2 uRes, uPtr, uAnchor;',
    'uniform vec3 uGround;',
    'varying vec2 vUv;',
    'vec3 pal(float t){',
    '  t = fract(t) * 4.;',
    '  vec3 a = vec3(.435,.765,.773), b = vec3(.925,.518,.596), c = vec3(.482,.42,.69), d = vec3(.957,.722,.486);',
    '  if (t < 1.) return mix(a, b, smoothstep(0., 1., t));',
    '  if (t < 2.) return mix(b, c, smoothstep(1., 2., t));',
    '  if (t < 3.) return mix(c, d, smoothstep(2., 3., t));',
    '  return mix(d, a, smoothstep(3., 4., t));',
    '}',
    'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);',
    '  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }',
    'float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * n(p); p = p * 2.02 + vec2(1.7, 9.2); a *= .5; } return s; }',
    'float field(vec2 p, float t){',
    '  vec2 q = vec2(fbm(p + vec2(0., t * .12)), fbm(p + vec2(5.2, 1.3) - t * .1));',
    '  return fbm(p + 1.8 * q + vec2(t * .05, -t * .03));',
    '}',
    'void main(){',
    '  float asp = uRes.x / uRes.y;',
    '  vec2 p = vec2(vUv.x * asp, vUv.y) * .95;',
    '  vec2 dm = p - vec2(uPtr.x * asp, uPtr.y) * .95;',
    '  p += dm * .08 * exp(-dot(dm, dm) * 1.5);',
    '  float t = uTime + uFlow;',
    '  float f = field(p, t), e = .004;',
    '  vec3 N = normalize(vec3(-(field(p + vec2(e, 0.), t) - f) / e * .22, -(field(p + vec2(0., e), t) - f) / e * .22, 1.));',
    '  vec3 L = normalize(vec3(-.4, .6, .8));',
    '  float diff = clamp(dot(N, L), 0., 1.);',
    '  float sheen = pow(clamp(dot(N, normalize(L + vec3(0., 0., 1.))), 0., 1.), 40.);',
    '  vec3 col = mix(pal(f * 1.1 + t * .02), uGround, .3);',
    '  vec3 silk = mix(col * .94, col * 1.05, diff) + sheen * .3;',
    '  float mask = smoothstep(uRad, .1, length(vec2((vUv.x - uAnchor.x) * asp, vUv.y - uAnchor.y)));',
    '  gl_FragColor = vec4(mix(uGround, silk, mask * uMix), 1.);',
    '}',
  ].join('\n');

  function silk(canvas, cfg, host) {
    var gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) return null;
    function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, 'attribute vec2 a; varying vec2 vUv; void main(){ vUv = a * .5 + .5; gl_Position = vec4(a, 0., 1.); }'));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'a');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var u = {};
    ['uTime', 'uRes', 'uPtr', 'uAnchor', 'uRad', 'uMix', 'uFlow', 'uGround'].forEach(function (k) { u[k] = gl.getUniformLocation(prog, k); });
    gl.uniform3fv(u.uGround, cfg.ground);
    gl.uniform1f(u.uMix, cfg.mix);
    var target = host.querySelector(cfg.anchor[0]);
    return {
      // The silk is soft, so half the CSS pixels is enough and keeps the shader cheap.
      resize: function () {
        var w = Math.max(1, Math.round(canvas.clientWidth / 2)), hgt = Math.max(1, Math.round(canvas.clientHeight / 2));
        canvas.width = w; canvas.height = hgt;
        gl.viewport(0, 0, w, hgt);
        gl.uniform2f(u.uRes, w, hgt);
        gl.uniform1f(u.uRad, innerWidth < 760 ? cfg.narrow : cfg.wide);
        var hr = host.getBoundingClientRect(), r = target.getBoundingClientRect();
        gl.uniform2f(u.uAnchor, (r.left - hr.left + r.width * cfg.anchor[1]) / hr.width, 1 - (r.top - hr.top + r.height * cfg.anchor[2]) / hr.height);
      },
      draw: function (t, flow, ptr) {
        gl.uniform1f(u.uTime, t);
        gl.uniform1f(u.uFlow, flow);
        gl.uniform2f(u.uPtr, ptr[0], ptr[1]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  }

  var live = [], frame = 0;
  SILKS.forEach(function (cfg) {
    var host = document.querySelector(cfg.host);
    var canvas = document.createElement('canvas');
    canvas.className = 'silk';
    canvas.setAttribute('aria-hidden', 'true');
    host.prepend(canvas);
    var gl = silk(canvas, cfg, host);
    if (!gl) { canvas.remove(); return; }
    var x = { cfg: cfg, host: host, canvas: canvas, gl: gl, visible: false, ptr: [-9, -9], to: null };
    live.push(x);
    new ResizeObserver(function () { gl.resize(); if (still) paint(x, 6); }).observe(host);
    if (cfg.pointer && !still) {
      addEventListener('pointermove', function (e) {
        var r = host.getBoundingClientRect();
        x.to = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
      }, { passive: true });
    }
  });

  function paint(x, t) {
    x.gl.draw(t, x.cfg.flow ? x.cfg.flow() : 0, x.ptr);
    x.canvas.classList.add('on');
  }

  if (still) return;
  root.classList.add('motion');

  function tick(now) {
    frame = 0;
    var running = false;
    live.forEach(function (x) {
      if (!x.visible) return;
      running = true;
      if (x.to) { x.ptr[0] += (x.to[0] - x.ptr[0]) * 0.05; x.ptr[1] += (x.to[1] - x.ptr[1]) * 0.05; }
      paint(x, now / 1000);
    });
    if (running) frame = requestAnimationFrame(tick);
  }
  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      live.forEach(function (x) { if (x.host === e.target) x.visible = e.isIntersecting; });
    });
    if (!frame) frame = requestAnimationFrame(tick);
  }, { rootMargin: '100px 0px' });
  live.forEach(function (x) { seen.observe(x.host); });

  var reveal = new IntersectionObserver(function (entries) {
    var i = 0;
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.style.setProperty('--rd', (i++ * 90) + 'ms');
      e.target.classList.add('in');
      reveal.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll(REVEAL).forEach(function (el) { el.classList.add('rv'); reveal.observe(el); });
  document.querySelectorAll(COUNT).forEach(function (el) {
    var n = parseInt(el.textContent, 10);
    if (isNaN(n)) return;
    el.style.setProperty('--to', n);
    el.classList.add('cu');
    reveal.observe(el);
  });

  var hero = document.getElementById('hero'), scrubs = document.querySelectorAll(SCRUB), near = new Set(), queued = false;
  var nearby = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) near.add(e.target); else near.delete(e.target); });
    update();
  }, { rootMargin: '25% 0px' });
  scrubs.forEach(function (el) { nearby.observe(el); });

  function update() {
    queued = false;
    var vh = innerHeight, y = scrollY;
    root.style.setProperty('--sp', (y / Math.max(1, root.scrollHeight - vh)).toFixed(4));
    hero.style.setProperty('--hp', Math.min(1, y / hero.offsetHeight).toFixed(4));
    near.forEach(function (el) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--k', Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))).toFixed(4));
    });
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();

  // With a mouse: photos tilt toward the pointer with a moving glare, and buttons lean toward it.
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  function follow(selector, set, props) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        set(el, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r);
      });
      el.addEventListener('pointerleave', function () { props.forEach(function (p) { el.style.removeProperty(p); }); });
    });
  }
  follow('.tile, .thumb', function (el, x, y) {
    el.style.setProperty('--tx', ((x - 0.5) * 12).toFixed(2) + 'deg');
    el.style.setProperty('--ty', ((0.5 - y) * 12).toFixed(2) + 'deg');
    el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    el.style.setProperty('--go', 1);
  }, ['--tx', '--ty', '--gx', '--gy', '--go']);
  follow('.btn', function (el, x, y, r) {
    el.style.setProperty('--mx', ((x - 0.5) * r.width * 0.18).toFixed(1) + 'px');
    el.style.setProperty('--my', ((y - 0.5) * r.height * 0.3).toFixed(1) + 'px');
  }, ['--mx', '--my']);
})();
