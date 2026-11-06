(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;

  $('year').textContent = new Date().getFullYear();

  /* Language: English lives in the HTML, French in i18n.js */
  var FR = window.PORTFOLIO_FR || {};
  var lang = 'en';
  var t = function (en) { return (lang === 'fr' && FR[en]) || en; };

  var headings = Array.prototype.map.call(document.querySelectorAll('h2'), function (h) {
    return { el: h, en: h.textContent.trim() };
  });

  var textNodes = [];
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return node.parentNode.closest('h2, script, style, svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
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
    langButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === next));
    });
    $('navToggle').setAttribute('aria-label', t($('navToggle').getAttribute('aria-expanded') === 'true' ? 'Close menu' : 'Open menu'));
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

  /* Load-in: curtain lifts, then the hero stages itself */
  var intro = $('intro');
  function startIntro() {
    if (reduced) { intro.remove(); return; }
    root.classList.add('is-loading');
    var img = document.querySelector('#portrait img');
    var begun = Date.now();
    var fired = false;
    var lift = function () {
      if (fired) return;
      fired = true;
      window.setTimeout(function () {
        intro.classList.add('is-done');
        window.setTimeout(function () { root.classList.remove('is-loading'); }, 320);
        window.setTimeout(function () { intro.classList.add('is-gone'); }, 1100);
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

  /* Nav: glass background after the top, mobile menu */
  var nav = $('nav');
  var toggle = $('navToggle');
  var links = $('navLinks');

  function setMenu(open) {
    links.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', t(open ? 'Close menu' : 'Open menu'));
    nav.classList.toggle('is-stuck', open || window.scrollY > 40);
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

  /* Highlight the section in view, and reveal content once */
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
            el.style.transitionDelay = index * 70 + 'ms';
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

  /* Hero scroll sequence: damped, so the camera eases to where you scrolled */
  var stage = $('home');
  var pin = $('pin');
  var portrait = $('portrait');
  var heroA = $('heroA');
  var heroB = $('heroB');
  var scrim = $('scrim');
  var strip = $('strip');
  var progress = $('progress');

  var clamp = function (v) { return Math.min(1, Math.max(0, v)); };
  var range = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var smooth = function (t) { return t * t * t * (t * (t * 6 - 15) + 10); };

  var current = 0;
  var running = false;

  function paint(p, handoff) {
    var phone = window.innerWidth <= 760;
    var push = smooth(range(p, 0.06, 0.74));
    var out = smooth(range(p, 0.02, 0.3));
    var inn = smooth(range(p, 0.34, 0.66));

    var scale = 1 + push * (phone ? 0.28 : 0.62);
    var shiftX = push * (phone ? 0 : 7);
    portrait.style.transform = 'translate3d(' + shiftX.toFixed(3) + 'vw,0,0) scale(' + scale.toFixed(4) + ')';

    heroA.style.opacity = (1 - out).toFixed(3);
    heroA.style.transform = 'translate3d(0,' + (-out * 44).toFixed(1) + 'px,0)';
    heroA.style.visibility = out >= 0.999 ? 'hidden' : 'visible';

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

  function measure() {
    var travel = stage.offsetHeight - window.innerHeight;
    return {
      p: travel > 0 ? clamp(window.scrollY / travel) : 0,
      handoff: clamp((window.scrollY - travel) / (window.innerHeight * 0.85))
    };
  }

  function tick() {
    var m = measure();
    current += (m.p - current) * 0.11;
    var settled = Math.abs(m.p - current) < 0.0006;
    if (settled) current = m.p;
    paint(current, m.handoff);
    if (settled) { running = false; return; }
    window.requestAnimationFrame(tick);
  }

  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle('is-stuck', y > 40 || links.classList.contains('is-open'));
    var max = root.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max) : 0).toFixed(4) + ')';
    if (reduced || running) return;
    running = true;
    window.requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
