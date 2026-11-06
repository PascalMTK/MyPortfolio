(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  $('year').textContent = new Date().getFullYear();

  /* Nav: glass background after the top, mobile menu */
  var nav = $('nav');
  var toggle = $('navToggle');
  var links = $('navLinks');

  function setMenu(open) {
    links.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
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

  /* Highlight the section in view */
  var navAnchors = Array.prototype.slice.call(links.querySelectorAll('a'));
  if ('IntersectionObserver' in window) {
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

    /* Reveal once, with a small stagger between siblings */
    var reveals = document.querySelectorAll('.reveal');
    if (reduced) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var index = Array.prototype.indexOf.call(el.parentNode.children, el);
          el.style.transitionDelay = Math.min(index, 4) * 60 + 'ms';
          el.classList.add('is-in');
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (el) { io.observe(el); });
    }
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Hero scroll sequence: copy fades, camera pushes in, second line arrives */
  var stage = $('home');
  var portrait = $('portrait');
  var heroA = $('heroA');
  var heroB = $('heroB');
  var scrim = $('scrim');
  var strip = $('strip');

  var clamp = function (v) { return Math.min(1, Math.max(0, v)); };
  var range = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var smooth = function (t) { return t * t * (3 - 2 * t); };

  var ticking = false;

  function render() {
    ticking = false;
    var y = window.scrollY;
    nav.classList.toggle('is-stuck', y > 40 || links.classList.contains('is-open'));
    if (reduced) return;

    var travel = stage.offsetHeight - window.innerHeight;
    var p = travel > 0 ? clamp(y / travel) : 0;
    var phone = window.innerWidth <= 760;

    var push = smooth(range(p, 0.08, 0.72));
    var out = smooth(range(p, 0.02, 0.32));
    var inn = smooth(range(p, 0.34, 0.66));

    var scale = 1 + push * (phone ? 0.28 : 0.62);
    var shiftX = push * (phone ? 0 : 7);
    portrait.style.transform = 'translate3d(' + shiftX + 'vw,0,0) scale(' + scale.toFixed(4) + ')';

    heroA.style.opacity = (1 - out).toFixed(3);
    heroA.style.transform = 'translate3d(0,' + (-out * 34).toFixed(1) + 'px,0)';
    heroA.style.visibility = out >= 1 ? 'hidden' : 'visible';

    heroB.style.opacity = inn.toFixed(3);
    heroB.style.transform = 'translate3d(0,' + ((1 - inn) * 34).toFixed(1) + 'px,0)';
    heroB.style.visibility = inn <= 0 ? 'hidden' : 'visible';

    scrim.style.opacity = inn.toFixed(3);
    strip.style.opacity = phone ? '' : (1 - out).toFixed(3);
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(render);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  render();
})();
