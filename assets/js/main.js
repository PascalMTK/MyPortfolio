(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;

  /* Always open at the top, unless a link points to a section */
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  if (!window.location.hash) window.scrollTo(0, 0);

  var clamp = function (v) { return Math.min(1, Math.max(0, v)); };
  var range = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var smooth = function (t) { return t * t * t * (t * (t * 6 - 15) + 10); };

  $('year').textContent = new Date().getFullYear();

  /* ---------- Language: English lives in the HTML, French in i18n.js ---------- */
  var FR = window.PORTFOLIO_FR || {};
  var lang = 'en';
  var t = function (en) { return (lang === 'fr' && FR[en]) || en; };

  var headings = Array.prototype.map.call(document.querySelectorAll('h2'), function (h) {
    return { el: h, en: h.textContent.trim() };
  });

  /* Paragraphs that light up word by word as they are read */
  var reading = Array.prototype.map.call(document.querySelectorAll('.about__text p, .quote p'), function (p) {
    return { el: p, en: p.textContent.trim(), words: [], lit: 0 };
  });

  var textNodes = [];
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return node.parentNode.closest('h2, .about__text p, .quote p, script, style, svg')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
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
    if (el.id === 'navToggle' || el.tagName === 'H2') return;
    ['alt', 'aria-label'].forEach(function (name) {
      var value = el.getAttribute(name);
      if (value) attrs.push({ el: el, name: name, en: value });
    });
  });

  var metaDesc = document.querySelector('meta[name="description"]');
  var page = { title: document.title, desc: metaDesc.getAttribute('content') };
  var langButtons = document.querySelectorAll('[data-lang]');
  var repaint = true;

  /* Section headings rise word by word from behind a mask */
  function setHeading(item) {
    var text = t(item.en);
    var h = item.el;
    if (reduced) { h.textContent = text; return; }
    h.setAttribute('aria-label', text);
    h.textContent = '';
    text.split(/ +/).forEach(function (word, i) {
      var outer = document.createElement('span');
      var inner = document.createElement('span');
      outer.className = 'w';
      outer.setAttribute('aria-hidden', 'true');
      inner.style.setProperty('--i', i);
      inner.textContent = word;
      outer.appendChild(inner);
      h.appendChild(outer);
      h.appendChild(document.createTextNode(' '));
    });
    h.classList.add('split');
  }

  function setReading(item) {
    var text = t(item.en);
    if (reduced) { item.el.textContent = text; return; }
    item.el.textContent = '';
    item.lit = 0;
    item.words = text.split(/ +/).map(function (word) {
      var span = document.createElement('span');
      span.className = 'sw';
      span.textContent = word;
      item.el.appendChild(span);
      item.el.appendChild(document.createTextNode(' '));
      return span;
    });
  }

  function applyLang(next) {
    lang = next;
    root.lang = next;
    document.title = t(page.title);
    metaDesc.setAttribute('content', t(page.desc));
    textNodes.forEach(function (item) {
      item.node.nodeValue = item.before + t(item.en) + item.after;
    });
    attrs.forEach(function (item) { item.el.setAttribute(item.name, t(item.en)); });
    headings.forEach(setHeading);
    reading.forEach(setReading);
    langButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === next));
    });
    var menuToggle = $('navToggle');
    menuToggle.setAttribute('aria-label', t(menuToggle.getAttribute('aria-expanded') === 'true' ? 'Close menu' : 'Open menu'));
    repaint = true;
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
      if (reduced) { applyLang(next); return; }
      root.classList.add('is-switching');
      window.setTimeout(function () {
        applyLang(next);
        root.classList.remove('is-switching');
      }, 220);
    });
  });

  /* ---------- Load-in: curtain lifts, then the hero stages itself ---------- */
  var intro = $('intro');
  var under = $('introUnder');

  function countUp() {
    if (reduced) return;
    document.querySelectorAll('.stat dd').forEach(function (dd, i) {
      var node = dd.firstChild;
      var match = node.nodeValue.match(/(\d+)(.*)/);
      if (!match) return;
      var end = Number(match[1]);
      var suffix = match[2];
      var begin = null;
      var delay = 300 + i * 80;
      var duration = 1500;
      node.nodeValue = '0' + suffix;
      function step(now) {
        if (begin === null) begin = now + delay;
        var p = clamp((now - begin) / duration);
        var eased = 1 - Math.pow(1 - p, 4);
        node.nodeValue = Math.round(end * eased) + suffix;
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    });
  }

  function startIntro() {
    if (reduced) { intro.remove(); under.remove(); return; }

    var seen = false;
    try { seen = window.sessionStorage.getItem('intro') === '1'; } catch (e) { /* not essential */ }

    root.classList.add('is-loading');

    if (seen) {
      intro.remove();
      under.remove();
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          root.classList.remove('is-loading');
        });
      });
      return;
    }

    try { window.sessionStorage.setItem('intro', '1'); } catch (e) { /* not essential */ }

    var img = document.querySelector('#portrait img');
    var begun = Date.now();
    var fired = false;
    var lift = function () {
      if (fired) return;
      fired = true;
      window.setTimeout(function () {
        intro.classList.add('is-done');
        under.classList.add('is-done');
        window.setTimeout(function () {
          root.classList.remove('is-loading');
        }, 420);
        window.setTimeout(function () {
          intro.classList.add('is-gone');
          under.classList.add('is-gone');
        }, 1250);
      }, Math.max(0, 950 - (Date.now() - begun)));
    };
    if (img.complete) {
      lift();
    } else {
      img.addEventListener('load', lift, { once: true });
      img.addEventListener('error', lift, { once: true });
      window.setTimeout(lift, 2400); /* a slow connection never waits on the curtain */
    }
  }
  startIntro();

  /* ---------- Inertial scrolling for mouse wheels and trackpads ---------- */
  var lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link || !lenis) return;
    var id = link.getAttribute('href');
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(id === '#home' ? 0 : target, {
      offset: id === '#home' ? 0 : -24,
      duration: 1.6,
      easing: function (x) { return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2; }
    });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- Nav: glass background after the top, mobile menu ---------- */
  var nav = $('nav');
  var toggle = $('navToggle');
  var links = $('navLinks');

  function setMenu(open) {
    links.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', t(open ? 'Close menu' : 'Open menu'));
    nav.classList.toggle('is-stuck', open || window.scrollY > 40);
    if (open) nav.classList.remove('is-hidden');
  }
  toggle.addEventListener('click', function () {
    setMenu(!links.classList.contains('is-open'));
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && links.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  /* ---------- Highlight the section in view, and reveal content once ---------- */
  var reveals = document.querySelectorAll('.reveal, .split');
  var showAll = function () {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  };

  if ('IntersectionObserver' in window) {
    var navAnchors = Array.prototype.slice.call(links.querySelectorAll('a'));
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + entry.target.id;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navAnchors.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) spy.observe(target);
    });

    if (reduced) {
      showAll();
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          if (el.matches('.skill, .flow li')) {
            var index = Array.prototype.indexOf.call(el.parentNode.children, el);
            el.style.transitionDelay = index * 90 + 'ms';
          }
          el.classList.add('is-in');
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (el) { io.observe(el); });
    }
  } else {
    showAll();
  }

  /* ---------- Pointer details: spotlight and magnetic buttons ---------- */
  if (finePointer && !reduced) {
    document.querySelectorAll('.skill, .contact__card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    document.querySelectorAll('.pill-btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.2;
        var y = (e.clientY - r.top - r.height / 2) * 0.3;
        btn.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      });
      btn.addEventListener('pointerleave', function () { btn.style.translate = ''; });
    });
  }

  /* ---------- Scroll stage ---------- */
  var stage = $('home');
  var pin = $('pin');
  var portrait = $('portrait');
  var heroA = $('heroA');
  var heroB = $('heroB');
  var scrim = $('scrim');
  var strip = $('strip');
  var progress = $('progress');
  var stats = document.querySelector('.hero__stats');
  var copy = document.querySelector('.hero__copy');
  var shots = Array.prototype.map.call(document.querySelectorAll('.shot'), function (el) {
    return { el: el, img: el.querySelector('img') };
  });

  var cue = $('cue');
  var backdrop = document.querySelector('.stage__bg');

  var vh = window.innerHeight;
  var travel = 0;
  var maxScroll = 0;
  var phone = false;
  var centerShift = 0;

  function measure() {
    vh = window.innerHeight;
    travel = stage.offsetHeight - vh;
    maxScroll = root.scrollHeight - vh;
    phone = window.innerWidth <= 760;
    centerShift = window.innerWidth / 2 - (portrait.offsetLeft + portrait.offsetWidth / 2);
  }

  /* The photo opens alone. Scrolling brings the copy in, holds, then pushes in. */
  var waiting = true;
  var counted = false;
  heroA.classList.add('is-waiting');
  strip.classList.add('is-waiting');

  function setWaiting(next) {
    if (next === waiting) return;
    waiting = next;
    heroA.classList.toggle('is-waiting', next);
    strip.classList.toggle('is-waiting', next);
    if (!next && !counted) { counted = true; countUp(); }
  }

  function paintHero(p, handoff) {
    var slide = smooth(range(p, 0, 0.2));
    var push = smooth(range(p, 0.4, 0.86));
    var out = smooth(range(p, 0.42, 0.56));
    var inn = smooth(range(p, 0.54, 0.76));

    if (p > 0.05) setWaiting(false);
    else if (p < 0.02) setWaiting(true);

    var scale = (phone ? 1 + (1 - slide) * 0.3 : 1) * (1 + push * (phone ? 0.28 : 0.62));
    var shiftPx = phone ? 0 : centerShift * (1 - slide);
    var shiftVw = push * (phone ? 0 : 7);
    portrait.style.transform = 'translate3d(calc(' + shiftPx.toFixed(1) + 'px + ' + shiftVw.toFixed(3) + 'vw),0,0) scale(' + scale.toFixed(4) + ')';
    backdrop.style.transform = phone ? '' : 'translate3d(' + (-24 * (1 - slide)).toFixed(3) + 'vw,0,0)';
    pin.style.setProperty('--scrim', slide.toFixed(3));

    cue.style.opacity = (1 - range(p, 0, 0.03)).toFixed(3);

    heroA.style.opacity = (1 - out).toFixed(3);
    heroA.style.transform = 'translate3d(0,' + (-out * 44).toFixed(1) + 'px,0)';
    heroA.style.visibility = out >= 0.999 || (waiting && p < 0.02) ? 'hidden' : 'visible';

    heroB.style.opacity = inn.toFixed(3);
    heroB.style.transform = 'translate3d(0,' + ((1 - inn) * 44).toFixed(1) + 'px,0)';
    heroB.style.visibility = inn <= 0.001 ? 'hidden' : 'visible';

    scrim.style.opacity = inn.toFixed(3);
    strip.style.opacity = phone ? '' : (1 - out).toFixed(3);

    /* As the pin releases, the stage sinks back and dissolves into the page */
    var e = smooth(handoff);
    pin.style.transform = e ? 'translate3d(0,' + (e * 18).toFixed(2) + 'vh,0) scale(' + (1 - e * 0.06).toFixed(4) + ')' : '';
    pin.style.opacity = e ? (1 - e).toFixed(3) : '';
  }

  function paintReading() {
    reading.forEach(function (item) {
      if (!item.words.length) return;
      var r = item.el.getBoundingClientRect();
      var p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.33));
      var lit = Math.round(p * item.words.length);
      if (lit === item.lit) return;
      var from = Math.min(lit, item.lit);
      var to = Math.max(lit, item.lit);
      for (var i = from; i < to; i++) item.words[i].classList.toggle('on', i < lit);
      item.lit = lit;
    });
  }

  function paintShots() {
    shots.forEach(function (shot) {
      var r = shot.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      var c = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      shot.img.style.translate = '0 ' + (c * -4).toFixed(2) + '%';
    });
  }

  /* One loop drives everything, and does nothing while the page is still */
  var lastY = -1;
  var heroP = 0;
  var handoff = 0;
  var pointerX = 0;
  var pointerY = 0;
  var depthX = 0;
  var depthY = 0;

  if (finePointer && !reduced) {
    stage.addEventListener('pointermove', function (e) {
      pointerX = e.clientX / window.innerWidth - 0.5;
      pointerY = e.clientY / window.innerHeight - 0.5;
    });
    stage.addEventListener('pointerleave', function () { pointerX = 0; pointerY = 0; });
  }

  function frame(time) {
    if (lenis) lenis.raf(time);

    var y = window.scrollY;
    var delta = y - lastY;

    if (delta !== 0 || repaint) {
      nav.classList.toggle('is-stuck', y > 40 || links.classList.contains('is-open'));
      progress.style.transform = 'scaleX(' + (maxScroll > 0 ? clamp(y / maxScroll) : 0).toFixed(4) + ')';

      if (!links.classList.contains('is-open')) {
        if (y > travel && delta > 3) nav.classList.add('is-hidden');
        else if (delta < -3 || y <= travel) nav.classList.remove('is-hidden');
      }
      if (!reduced) {
        handoff = clamp((y - travel) / (vh * 0.85));
        paintReading();
        paintShots();
      }
      lastY = y;
    }

    if (!reduced) {
      var target = travel > 0 ? clamp(y / travel) : 0;
      var gap = target - heroP;
      if (Math.abs(gap) > 0.0005 || repaint) {
        heroP = Math.abs(gap) < 0.0005 ? target : heroP + gap * 0.14;
        paintHero(heroP, handoff);
      } else if (y >= travel) {
        paintHero(heroP, handoff);
      }

      /* Mouse depth: portrait and cards drift at different speeds */
      if (finePointer && !phone && y < travel) {
        depthX += (pointerX - depthX) * 0.07;
        depthY += (pointerY - depthY) * 0.07;
        portrait.style.translate = (depthX * -22).toFixed(2) + 'px ' + (depthY * -10).toFixed(2) + 'px';
        stats.style.translate = (depthX * 26).toFixed(2) + 'px ' + (depthY * 16).toFixed(2) + 'px';
        copy.style.translate = (depthX * 10).toFixed(2) + 'px ' + (depthY * 6).toFixed(2) + 'px';
      }
    }

    repaint = false;
    window.requestAnimationFrame(frame);
  }

  window.addEventListener('resize', function () { measure(); repaint = true; });
  window.addEventListener('load', function () { measure(); repaint = true; });
  measure();
  window.requestAnimationFrame(frame);
})();
