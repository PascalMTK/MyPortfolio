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

  /* ---------- Book ----------
     Three layouts:
       spread  wide screens, two facing pages, leaves turn
       single  phones and tablets, one page at a time, each page turns away
       flat    very short screens (phones held sideways), pages simply stack
     With reduced motion the book still works, but pages swap instead of turning. */
  var sec = $('book');
  var book = $('bookEl');
  var leaves = Array.prototype.slice.call(book.querySelectorAll('.leaf'));
  var pages = Array.prototype.slice.call(book.querySelectorAll('.page'));
  var spreadQuery = window.matchMedia('(min-width: 901px) and (min-height: 600px)');
  var singleQuery = window.matchMedia('(max-width: 900px) and (min-height: 440px)');
  var mode = 'flat';
  var flipping = false;
  var N = 1;                             /* number of turns in the current layout */
  var UNIT = 0.8;                        /* viewport heights of scroll per turn */
  var secTop = 0, travel = 1, vh = window.innerHeight;
  var current = -1;                      /* current spread (spread mode) or page (single mode) */
  var prevBtn = $('prevPage'), nextBtn = $('nextPage'), pageNum = $('pageNum');
  var film = $('workflowFilm');
  var navAnchors = Array.prototype.slice.call(links.querySelectorAll('a'));
  var pageIndex = function (p) { return Number(p.getAttribute('data-page')); };

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

  /* Where a page sits: its spread in spread mode, its own index in single mode */
  function stepOf(el) {
    var pg = el.closest('.page');
    if (!pg) return 0;
    var i = pageIndex(pg);
    if (mode === 'single') return i;
    return i % 2 === 0 ? i / 2 : (i + 1) / 2;
  }

  function clearBook() {
    book.style.removeProperty('--shift');
    leaves.forEach(function (l) { l.style.removeProperty('--r'); l.style.zIndex = ''; l.classList.remove('is-turning'); });
    pages.forEach(function (p) {
      p.style.removeProperty('--r'); p.style.zIndex = ''; p.classList.remove('is-turning');
      p.inert = false; p.removeAttribute('aria-hidden'); p.classList.remove('is-shown');
    });
  }

  function measure() {
    vh = window.innerHeight;
    var next = spreadQuery.matches ? 'spread' : singleQuery.matches ? 'single' : 'flat';
    if (next !== mode) clearBook();
    mode = next;
    flipping = mode !== 'flat';
    root.classList.toggle('is-book', flipping);
    root.classList.toggle('is-single', mode === 'single');
    if (flipping) {
      N = mode === 'spread' ? leaves.length : pages.length - 1;
      UNIT = mode === 'spread' ? 0.8 : 0.6;
      travel = N * UNIT * vh;
      sec.style.height = (vh + travel) + 'px';
      secTop = sec.getBoundingClientRect().top + window.scrollY;
    } else {
      sec.style.height = '';
    }
  }

  function yForStep(s) { return secTop + (s / N) * travel; }

  function setCurrent(s) {
    if (s === current) return;
    current = s;
    var shownIdx = mode === 'spread' ? [2 * s - 1, 2 * s] : [s];
    pages.forEach(function (p) {
      var shown = shownIdx.indexOf(pageIndex(p)) !== -1;
      p.inert = !shown;
      p.classList.toggle('is-shown', shown);
      if (shown) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true');
    });
    pageNum.textContent = (s < 10 ? '0' : '') + s + ' / ' + N;
    if (shownIdx.indexOf(3) !== -1) countUp();
    prevBtn.disabled = s <= 0;
    nextBtn.disabled = s >= N;
    if (film && motionOK) {
      if (shownIdx.indexOf(19) !== -1) { film.playbackRate = 0.75; var pl = film.play(); if (pl) pl.catch(function () {}); }
      else film.pause();
    }
  }

  function turnState(el, r, i, count) {
    el.style.setProperty('--r', (r * 180).toFixed(2));
    el.style.zIndex = r > 0 && r < 1 ? count + 2 : r >= 1 ? i + 1 : count - i;
    el.classList.toggle('is-turning', r > 0 && r < 1);
    var lift = Math.sin(Math.min(1, r * (mode === 'single' ? 2 : 1)) * Math.PI / (mode === 'single' ? 2 : 1));
    el.querySelectorAll('.shade').forEach(function (sh) { sh.style.setProperty('--shade', (lift * 0.9).toFixed(3)); });
  }

  function paintBook() {
    var rawPos = clamp((window.scrollY - secTop) / travel) * N;
    var k = Math.min(N - 1, Math.floor(rawPos));
    /* With reduced motion the page swaps at the midpoint instead of turning */
    var turn = motionOK ? smooth(range(rawPos - k, 0.18, 0.82)) : (rawPos - k >= 0.5 ? 1 : 0);
    var items = mode === 'spread' ? leaves : pages;
    items.forEach(function (el, i) {
      turnState(el, i < k ? 1 : i === k ? turn : 0, i, items.length);
    });
    if (mode === 'spread') {
      var first = k > 0 ? 1 : turn;
      var last = k === N - 1 ? turn : 0;
      book.style.setProperty('--shift', (-0.5 * (1 - first) + 0.5 * last).toFixed(4));
    }
    book.style.setProperty('--enter', motionOK ? smooth(range(window.scrollY, secTop - vh * 0.95, secTop - vh * 0.05)).toFixed(4) : '1');
    setCurrent(Math.round(k + turn));
  }

  /* ---------- Scroll loop ---------- */
  var progress = $('progress');
  var ticking = false;
  var hero = $('home');
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      var max = root.scrollHeight - vh;
      progress.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max) : 0) + ')';
      if (flipping) paintBook();
      root.classList.toggle('past-hero', window.scrollY > hero.offsetHeight * 0.55);
      spy();
      nudgeLamp();
    });
  }

  /* Active nav item follows the chapter in view */
  function spy() {
    var active = -1;
    if (flipping) {
      navAnchors.forEach(function (a, i) {
        var el = document.querySelector(a.getAttribute('href'));
        if (el && current >= stepOf(el)) active = i;
      });
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

  /* Hash links: in book mode, turn to the right page */
  function goTo(hash, instant) {
    if (hash === '#home') { scrollToY(0, instant); return true; }
    var target = document.querySelector(hash);
    if (!target) return false;
    if (flipping && (book.contains(target) || target === sec)) {
      scrollToY(yForStep(target === sec ? 0 : stepOf(target)), instant);
    } else {
      scrollToY(target.getBoundingClientRect().top + window.scrollY - 84, instant);
    }
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var hash = a.getAttribute('href');
    if (a.hasAttribute('data-cover') && flipping) { e.preventDefault(); scrollToY(yForStep(0)); return; }
    if (goTo(hash)) {
      e.preventDefault();
      setMenu(false);
      if (window.history.replaceState) window.history.replaceState(null, '', hash);
    }
  });

  prevBtn.addEventListener('click', function () { scrollToY(yForStep(Math.max(0, current - 1))); });
  nextBtn.addEventListener('click', function () { scrollToY(yForStep(Math.min(N, current + 1))); });
  document.addEventListener('keydown', function (e) {
    if (!flipping || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    var inBook = window.scrollY >= secTop - vh * 0.2 && window.scrollY <= secTop + travel + vh * 0.2;
    if (!inBook) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevBtn.click(); }
  });

  /* Swipe left or right on the book to turn a page (touch screens) */
  var swipe = null;
  book.addEventListener('touchstart', function (e) {
    if (!flipping || e.touches.length !== 1) return;
    swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  book.addEventListener('touchend', function (e) {
    if (!swipe) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    (dx < 0 ? nextBtn : prevBtn).click();
  }, { passive: true });

  /* Flat layout: play the film only while it is on screen */
  if (film && motionOK && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (flipping) return;
      if (entries[0].isIntersecting) { film.playbackRate = 0.75; var pl = film.play(); if (pl) pl.catch(function () {}); }
      else film.pause();
    }, { threshold: 0.2 }).observe(film);
  }

  /* Phones resize the viewport when the address bar slides; ignore height-only nudges */
  var lastW = window.innerWidth, lastH = window.innerHeight;
  function relayout(force) {
    if (force !== true && window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 120) return;
    lastW = window.innerWidth; lastH = window.innerHeight;
    var before = flipping && travel ? clamp((window.scrollY - secTop) / travel) : null;
    var oldMode = mode;
    current = -1;
    measure();
    if (!flipping && inkIO) pages.forEach(function (p) { inkIO.unobserve(p); inkIO.observe(p); });
    if (flipping && oldMode === mode && before !== null && before > 0 && before < 1) scrollToY(secTop + before * travel, true);
    if (flipping) paintBook();
    onScroll();
  }
  measure();
  if (flipping) paintBook();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', relayout);
  [spreadQuery, singleQuery].forEach(function (q) { if (q.addEventListener) q.addEventListener('change', function () { relayout(true); }); });
  window.addEventListener('load', function () {
    relayout(true);
    if (window.location.hash) goTo(window.location.hash, true);
  });

  if (lenis) {
    var raf = function (time) { lenis.raf(time); window.requestAnimationFrame(raf); };
    window.requestAnimationFrame(raf);
  }
})();
