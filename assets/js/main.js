(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  var clamp = function (v) { return Math.min(1, Math.max(0, v)); };
  var range = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var smooth = function (t) { return t * t * (3 - 2 * t); };

  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  if (!window.location.hash) window.scrollTo(0, 0);

  $('year').textContent = new Date().getFullYear();

  /* ---------- Language: English lives in the HTML, French in i18n.js ---------- */
  var FR = window.PORTFOLIO_FR || {};
  var lang = 'en';
  var t = function (en) { return (lang === 'fr' && FR[en]) || en; };

  var textNodes = [];
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return node.parentNode.closest('script, style, svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) {
    var raw = walker.currentNode.nodeValue;
    textNodes.push({
      node: walker.currentNode,
      en: raw.trim(),
      before: raw.slice(0, raw.length - raw.trimStart().length),
      after: raw.slice(raw.trimEnd().length)
    });
  }
  var attrs = [];
  document.querySelectorAll('[alt], [aria-label]').forEach(function (el) {
    if (el.id === 'navToggle') return;
    ['alt', 'aria-label'].forEach(function (name) {
      var value = el.getAttribute(name);
      if (value) attrs.push({ el: el, name: name, en: value });
    });
  });
  var metaDesc = document.querySelector('meta[name="description"]');
  var pageMeta = { title: document.title, desc: metaDesc.getAttribute('content') };
  var langButtons = document.querySelectorAll('[data-lang]');

  function applyLang(next) {
    lang = next;
    root.lang = next;
    document.title = t(pageMeta.title);
    metaDesc.setAttribute('content', t(pageMeta.desc));
    textNodes.forEach(function (item) { item.node.nodeValue = item.before + t(item.en) + item.after; });
    attrs.forEach(function (item) { item.el.setAttribute(item.name, t(item.en)); });
    langButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === next)); });
    var menuToggle = $('navToggle');
    menuToggle.setAttribute('aria-label', t(menuToggle.getAttribute('aria-expanded') === 'true' ? 'Close menu' : 'Open menu'));
  }
  function readLang() {
    var param = new URLSearchParams(window.location.search).get('lang');
    if (param === 'fr' || param === 'en') return param;
    try {
      var saved = window.localStorage.getItem('lang');
      if (saved === 'fr' || saved === 'en') return saved;
    } catch (e) { /* storage can be blocked */ }
    return /^fr\b/i.test(navigator.language || '') ? 'fr' : 'en';
  }
  applyLang(readLang());
  langButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var next = b.getAttribute('data-lang');
      if (next === lang) return;
      try { window.localStorage.setItem('lang', next); } catch (e) { /* not essential */ }
      root.classList.add('is-switching');
      window.setTimeout(function () { applyLang(next); root.classList.remove('is-switching'); }, 200);
    });
  });

  /* ---------- Smooth scrolling ---------- */
  var motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lenis = motionOK && window.Lenis ? new window.Lenis({ lerp: 0.1, smoothWheel: true }) : null;
  function scrollToY(y, instant) {
    if (lenis) lenis.scrollTo(y, { duration: instant ? 0 : 1.2, immediate: !!instant });
    else window.scrollTo({ top: y, behavior: instant || !motionOK ? 'auto' : 'smooth' });
  }

  /* ---------- Theme, switched by pulling the lamp cord ---------- */
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function isDark() {
    var set = root.getAttribute('data-theme');
    if (set) return set === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function syncThemeColor() { themeMeta.setAttribute('content', isDark() ? '#0b0810' : '#f6f1e7'); }
  syncThemeColor();
  try { if (window.localStorage.getItem('lampUsed') === '1') root.classList.add('lamp-used'); } catch (e) { /* not essential */ }

  function setTheme(next) {
    root.setAttribute('data-theme', next);
    try { window.localStorage.setItem('theme', next); } catch (e) { /* not essential */ }
    syncThemeColor();
  }
  function switchTheme(x, y) {
    var next = isDark() ? 'light' : 'dark';
    root.classList.add('lamp-used');
    try { window.localStorage.setItem('lampUsed', '1'); } catch (e) { /* not essential */ }
    if (!document.startViewTransition || !motionOK) { setTheme(next); return; }
    root.classList.add('theme-switching');
    var done = function () { root.classList.remove('theme-switching'); };
    var vt = document.startViewTransition(function () { setTheme(next); });
    vt.ready.then(function () {
      var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 800, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(done);
    vt.finished.then(done, done);
  }

  var lampHang = $('lampHang');
  var cord = $('lampString');
  var bead = $('lampBead');
  var grab = $('lampGrab');
  var pull = 0, pullVel = 0, springing = false, drag = null;

  function setPull(v) {
    pull = v;
    cord.setAttribute('y2', (140 + v).toFixed(2));
    bead.setAttribute('cy', (146 + v).toFixed(2));
  }
  function springBack() {
    if (springing) return;
    springing = true;
    (function step() {
      if (drag) { springing = false; return; }
      pullVel += -pull * 0.22;
      pullVel *= 0.74;
      setPull(pull + pullVel);
      if (Math.abs(pull) < 0.15 && Math.abs(pullVel) < 0.15) { setPull(0); pullVel = 0; springing = false; return; }
      window.requestAnimationFrame(step);
    })();
  }
  function swingLamp() {
    if (!motionOK) return;
    lampHang.classList.remove('is-swinging');
    void lampHang.offsetWidth;
    lampHang.classList.add('is-swinging');
  }
  function fireLamp() {
    var r = bead.getBoundingClientRect();
    switchTheme(r.left + r.width / 2, r.top + r.height / 2);
    swingLamp();
  }

  grab.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    drag = { y: e.clientY, max: 0 };
    pullVel = 0;
    try { grab.setPointerCapture(e.pointerId); } catch (err) { /* not essential */ }
  });
  grab.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dy = Math.max(0, e.clientY - drag.y);
    drag.max = Math.max(drag.max, dy);
    setPull(70 * (1 - Math.exp(-dy / 60)));
  });
  function release() {
    if (!drag) return;
    var d = drag;
    drag = null;
    if (d.max < 5 || pull > 24) fireLamp();
    springBack();
  }
  grab.addEventListener('pointerup', release);
  grab.addEventListener('pointercancel', release);

  /* The round button above the lamp gives the cord a short tug */
  $('themeToggle').addEventListener('click', function () {
    if (!motionOK) { switchTheme(window.innerWidth - 60, 40); return; }
    var t0 = null;
    (function tug(now) {
      if (t0 === null) t0 = now;
      var k = Math.min(1, (now - t0) / 170);
      setPull(36 * smooth(k));
      if (k < 1) window.requestAnimationFrame(tug);
      else { fireLamp(); springBack(); }
    })(performance.now());
  });

  /* The lamp sways a little as the page scrolls */
  var sway = 0, swayVel = 0, swaying = false, lastY = window.scrollY;
  function nudgeLamp() {
    var dy = window.scrollY - lastY;
    lastY = window.scrollY;
    if (!motionOK || !dy) return;
    swayVel += Math.max(-0.8, Math.min(0.8, dy * 0.012));
    if (swaying) return;
    swaying = true;
    (function step() {
      swayVel += -sway * 0.045;
      swayVel *= 0.93;
      sway = Math.max(-12, Math.min(12, sway + swayVel));
      lampHang.style.rotate = sway.toFixed(2) + 'deg';
      if (Math.abs(sway) < 0.05 && Math.abs(swayVel) < 0.05) { sway = 0; lampHang.style.rotate = ''; swaying = false; return; }
      window.requestAnimationFrame(step);
    })();
  }

  /* Portrait tilts toward the pointer */
  var photo = document.querySelector('.photo');
  if (photo && finePointer && motionOK) {
    var hero = $('home');
    hero.addEventListener('pointermove', function (e) {
      var r = photo.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      photo.style.transform = 'perspective(900px) rotateY(' + (x * 10).toFixed(2) + 'deg) rotateX(' + (y * -8).toFixed(2) + 'deg)';
    });
    hero.addEventListener('pointerleave', function () { photo.style.transform = ''; });
  }

  /* ---------- Nav menu ---------- */
  var nav = $('nav');
  var toggle = $('navToggle');
  var links = $('navLinks');
  function setMenu(open) {
    links.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', t(open ? 'Close menu' : 'Open menu'));
  }
  toggle.addEventListener('click', function () { setMenu(!links.classList.contains('is-open')); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && links.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });

  /* ---------- Book ---------- */
  var sec = $('book');
  var book = $('bookEl');
  var leaves = Array.prototype.slice.call(book.querySelectorAll('.leaf'));
  var pages = Array.prototype.slice.call(book.querySelectorAll('.page'));
  var N = leaves.length;                 /* leaves; spreads run 0..N */
  var UNIT = 0.8;                        /* viewport heights of scroll per page turn */
  var bookQuery = window.matchMedia('(min-width: 901px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)');
  var flipping = false;
  var secTop = 0, travel = 1, vh = window.innerHeight;
  var currentSpread = -1;
  var prevBtn = $('prevPage'), nextBtn = $('nextPage'), pageNum = $('pageNum');
  var film = $('workflowFilm');
  var navAnchors = Array.prototype.slice.call(links.querySelectorAll('a'));

  pages.forEach(function (p) {
    Array.prototype.forEach.call(p.children, function (c, i) { c.style.setProperty('--d', i); });
    var s = document.createElement('i');
    s.className = 'shade';
    s.setAttribute('aria-hidden', 'true');
    p.appendChild(s);
  });

  /* Stats count up the first time they are seen */
  var counted = false;
  function countUp() {
    if (counted) return;
    counted = true;
    if (!motionOK) return;
    document.querySelectorAll('.stat dd').forEach(function (dd, i) {
      var node = dd.firstChild;
      var match = node.nodeValue.match(/(\d+)(.*)/);
      if (!match) return;
      var end = Number(match[1]), suffix = match[2], begin = null;
      node.nodeValue = '0' + suffix;
      (function step(now) {
        if (begin === null) begin = now + 250 + i * 90;
        var k = clamp((now - begin) / 1400);
        node.nodeValue = Math.round(end * (1 - Math.pow(1 - k, 4))) + suffix;
        if (k < 1) window.requestAnimationFrame(step);
      })(performance.now());
    });
  }

  /* Stacked layout: pages ink in as they scroll into view */
  if ('IntersectionObserver' in window) {
    var inkIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || flipping) return;
        entry.target.classList.add('is-in');
        if (entry.target.getAttribute('data-page') === '3') countUp();
        inkIO.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    pages.forEach(function (p) { inkIO.observe(p); });
  } else {
    pages.forEach(function (p) { p.classList.add('is-in'); });
  }

  /* A page's spread: fronts (even) sit on the right of spread k, backs on the left of spread k+1 */
  function spreadOf(el) {
    var pg = el.closest('.page');
    if (!pg) return 0;
    var i = Number(pg.getAttribute('data-page'));
    return i % 2 === 0 ? i / 2 : (i + 1) / 2;
  }

  function measure() {
    vh = window.innerHeight;
    flipping = bookQuery.matches;
    root.classList.toggle('is-book', flipping);
    if (flipping) {
      sec.style.height = (vh + N * UNIT * vh) + 'px';
      secTop = sec.getBoundingClientRect().top + window.scrollY;
      travel = N * UNIT * vh;
    } else {
      sec.style.height = '';
      book.style.removeProperty('--shift');
      leaves.forEach(function (l) { l.style.removeProperty('--r'); l.style.zIndex = ''; });
      pages.forEach(function (p) { p.inert = false; p.removeAttribute('aria-hidden'); p.classList.remove('is-shown'); });
    }
  }

  function yForSpread(s) { return secTop + (s / N) * travel; }

  function setSpread(s) {
    if (s === currentSpread) return;
    currentSpread = s;
    pages.forEach(function (p) {
      var i = Number(p.getAttribute('data-page'));
      var shown = i === 2 * s || i === 2 * s - 1;
      p.inert = !shown;
      p.classList.toggle('is-shown', shown);
      if (shown) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true');
    });
    pageNum.textContent = (s < 10 ? '0' : '') + s + ' / ' + N;
    if (s === 2) countUp();
    prevBtn.disabled = s <= 0;
    nextBtn.disabled = s >= N;
    if (film && motionOK) {
      if (s === 10) { film.playbackRate = 0.75; var pl = film.play(); if (pl) pl.catch(function () {}); }
      else film.pause();
    }
  }

  function paintBook() {
    var p = clamp((window.scrollY - secTop) / travel);
    var rawPos = p * N;
    var k = Math.min(N - 1, Math.floor(rawPos));
    var frac = rawPos - k;
    var turn = smooth(range(frac, 0.18, 0.82));
    leaves.forEach(function (leaf, i) {
      var r = i < k ? 1 : i === k ? turn : 0;
      leaf.style.setProperty('--r', (r * 180).toFixed(2));
      leaf.style.zIndex = r > 0 && r < 1 ? N + 2 : r >= 1 ? i + 1 : N - i;
      leaf.classList.toggle('is-turning', r > 0 && r < 1);
      var lift = Math.sin(r * Math.PI);
      leaf.querySelectorAll('.shade').forEach(function (sh) { sh.style.setProperty('--shade', (lift * 0.9).toFixed(3)); });
    });
    var first = leaves.length ? (k > 0 ? 1 : turn) : 0;
    var last = k === N - 1 ? turn : 0;
    book.style.setProperty('--shift', (-0.5 * (1 - first) + 0.5 * last).toFixed(4));
    book.style.setProperty('--enter', smooth(range(window.scrollY, secTop - vh * 0.95, secTop - vh * 0.05)).toFixed(4));
    setSpread(Math.round(k + turn));
  }

  /* ---------- Scroll loop ---------- */
  var progress = $('progress');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      var max = root.scrollHeight - vh;
      progress.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max) : 0) + ')';
      if (flipping) paintBook();
      spy();
      nudgeLamp();
    });
  }

  /* Active nav item follows the chapter in view */
  var chapterSpreads = navAnchors.map(function (a) {
    var el = document.querySelector(a.getAttribute('href'));
    return el ? spreadOf(el) : 0;
  });
  function spy() {
    var active = -1;
    if (flipping) {
      chapterSpreads.forEach(function (s, i) { if (currentSpread >= s) active = i; });
      if (window.scrollY < secTop - vh * 0.3) active = -1;
    } else {
      navAnchors.forEach(function (a, i) {
        var el = document.querySelector(a.getAttribute('href'));
        if (el && el.getBoundingClientRect().top < vh * 0.45) active = i;
      });
    }
    navAnchors.forEach(function (a, i) {
      a.classList.toggle('is-active', i === active);
      if (i === active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  /* Hash links: in book mode, turn to the right spread */
  function goTo(hash, instant) {
    var target = hash === '#home' ? null : document.querySelector(hash);
    if (hash === '#home') { scrollToY(0, instant); return true; }
    if (!target) return false;
    if (flipping && book.contains(target) || flipping && target === sec) {
      var s = target === sec ? 0 : spreadOf(target);
      if (target.hasAttribute && target.hasAttribute('data-cover')) s = 0;
      scrollToY(yForSpread(s), instant);
    } else {
      scrollToY(target.getBoundingClientRect().top + window.scrollY - 84, instant);
    }
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var hash = a.getAttribute('href');
    if (a.hasAttribute('data-cover') && flipping) { e.preventDefault(); scrollToY(yForSpread(0)); return; }
    if (goTo(hash)) {
      e.preventDefault();
      setMenu(false);
      if (window.history.replaceState) window.history.replaceState(null, '', hash);
    }
  });

  prevBtn.addEventListener('click', function () { scrollToY(yForSpread(Math.max(0, currentSpread - 1))); });
  nextBtn.addEventListener('click', function () { scrollToY(yForSpread(Math.min(N, currentSpread + 1))); });
  document.addEventListener('keydown', function (e) {
    if (!flipping || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    var inBook = window.scrollY >= secTop - vh * 0.2 && window.scrollY <= secTop + travel + vh * 0.2;
    if (!inBook) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevBtn.click(); }
  });

  /* Flat layout: play the film only while it is on screen */
  if (film && motionOK && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (flipping) return;
      if (entries[0].isIntersecting) { film.playbackRate = 0.75; var pl = film.play(); if (pl) pl.catch(function () {}); }
      else film.pause();
    }, { threshold: 0.2 }).observe(film);
  }

  function relayout() {
    currentSpread = -1;
    measure();
    if (!flipping && inkIO) pages.forEach(function (p) { inkIO.unobserve(p); inkIO.observe(p); });
    if (flipping) paintBook();
    onScroll();
  }
  measure();
  if (flipping) paintBook();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', relayout);
  if (bookQuery.addEventListener) bookQuery.addEventListener('change', relayout);
  window.addEventListener('load', function () {
    relayout();
    if (window.location.hash) goTo(window.location.hash, true);
  });

  if (lenis) {
    var raf = function (time) { lenis.raf(time); window.requestAnimationFrame(raf); };
    window.requestAnimationFrame(raf);
  }
})();
