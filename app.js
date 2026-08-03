/* Restaurant BMS · interactions
   Splash intro, chop-reveal hero, scroll reveals, nav state,
   mobile action bar, magnetic CTAs, fal.ai hero video.
   All motion is gated behind prefers-reduced-motion. */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ── Lenis smooth scroll (the high-end scroll feel) ──────── */
  var lenis = null;
  if (!reduceMotion && typeof window.Lenis === 'function') {
    try {
      lenis = new window.Lenis({ autoRaf: true, anchors: true });
      window.bmsLenis = lenis; /* motion.js syncs ScrollTrigger to this */
    } catch (e) {}
  }

  /* ── Velocity skew: the marquee leans with your scroll ────
     Lenis reports velocity; we lerp a small skew onto the strip
     so fast scrolling makes the whole band feel physical. */
  var marquee = document.querySelector('.marquee');
  if (lenis && marquee) {
    var skewTarget = 0, skewCurrent = 0, skewRaf = null;
    var skewTick = function () {
      skewCurrent += (skewTarget - skewCurrent) * 0.12;
      marquee.style.setProperty('--skew', skewCurrent.toFixed(2) + 'deg');
      if (Math.abs(skewTarget - skewCurrent) > 0.02 || Math.abs(skewCurrent) > 0.02) {
        skewRaf = requestAnimationFrame(skewTick);
      } else {
        marquee.style.setProperty('--skew', '0deg');
        skewRaf = null;
      }
    };
    lenis.on('scroll', function (e) {
      var v = Math.max(-6, Math.min(6, (e.velocity || 0) * 0.35));
      skewTarget = v;
      if (!skewRaf) skewRaf = requestAnimationFrame(skewTick);
    });
  }

  /* ── Opening splash lifecycle ─────────────────────────────
     The overlay ships in the HTML and animates via CSS alone
     (Naseeb lesson: it must own the very first paint). Here we
     only mark it done, persist the once-per-session flag, allow
     tap-to-skip, and hard-remove it as a failsafe (Meggie lesson). */
  var splash = document.getElementById('splash');
  var splashActive = !!splash &&
    !document.documentElement.classList.contains('intro-skip') &&
    !reduceMotion;

  var splashDone = function () {
    if (!splash) return;
    splash.classList.add('done');
    var node = splash;
    splash = null;
    setTimeout(function () { node.remove(); }, 900);
  };

  var splashHold = location.hash === '#introhold'; /* freeze for design review */

  if (splash && !splashActive) {
    splash.remove();
    splash = null;
  }
  if (splashActive && splashHold) {
    splash.classList.add('hold');
  }
  if (splashActive && !splashHold) {
    try { sessionStorage.setItem('bmsIntro', '1'); } catch (e) {}
    setTimeout(splashDone, 2750);              /* aligned with CSS splash-leave delay */
    setTimeout(function () { if (splash) { splash.remove(); splash = null; } }, 5200); /* failsafe */
    splash.addEventListener('click', function () {
      if (!splash) return;
      splash.style.display = 'none';
      splashDone();
    });
  }

  /* ── Chop-reveal headline ─────────────────────────────────
     Split each word into three clipped strips that slide in
     from alternating sides: the headline is assembled the way
     kothu is made. Arming waits for the splash to lift. */
  var title = document.getElementById('chop');
  var armChop = function () {};
  if (title && !reduceMotion) {
    var walk = function (node, out) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'w';
            for (var i = 1; i <= 3; i++) {
              var s = document.createElement('span');
              s.className = 'slice s' + i;
              s.textContent = part;
              if (i > 1) s.setAttribute('aria-hidden', 'true');
              w.appendChild(s);
            }
            out.appendChild(w);
          });
        } else if (child.nodeType === 1) {
          var clone = child.cloneNode(false);
          out.appendChild(clone);
          walk(child, clone);
        }
      });
    };

    var host = document.createElement('span');
    walk(title, host);
    title.textContent = '';
    title.appendChild(host);
    title.classList.add('is-chopping');

    armChop = function () {
      var words = title.querySelectorAll('.w');
      words.forEach(function (w, i) {
        w.style.setProperty('--wd', (0.15 + i * 0.09).toFixed(2) + 's');
        w.classList.add('armed');
      });
      var total = 150 + (words.length - 1) * 90 + 80 + 420 + 120;
      setTimeout(function () {
        title.classList.remove('is-chopping');
        title.classList.add('chop-done');
      }, total);
    };
  }
  if (splashActive) {
    setTimeout(armChop, 2750);
  } else {
    armChop();
  }

  /* ── Page wipe transitions (internal pages only) ──────────
     Departure: ink panel rises, then the URL changes. Arrival
     is handled by the pre-paint head script + .wipe-out here. */
  if (!reduceMotion) {
    var wipeEl = document.createElement('div');
    wipeEl.className = 'wipe';
    wipeEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(wipeEl);

    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!/\.html(\?|#|$)/.test(href)) return;
      if (a.target === '_blank' || /^(https?:|tel:|mailto:|#)/.test(href)) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      try { sessionStorage.setItem('bmsWipe', '1'); } catch (e2) {}
      wipeEl.classList.add('act');
      setTimeout(function () { location.href = href; }, 480);
    });

    var rootEl = document.documentElement;
    if (rootEl.classList.contains('wipe-in')) {
      try { sessionStorage.removeItem('bmsWipe'); } catch (e3) {}
      /* Timeouts, not rAF: they still fire in background tabs, so
         the cover can never stick if the page opens unfocused. */
      setTimeout(function () { rootEl.classList.add('wipe-out'); }, 60);
      setTimeout(function () { rootEl.classList.remove('wipe-in', 'wipe-out'); }, 950);
    }
    window.addEventListener('pageshow', function (pv) {
      if (pv.persisted) {
        wipeEl.classList.remove('act');
        rootEl.classList.remove('wipe-in', 'wipe-out');
      }
    });
  }

  /* ── Scroll reveals (.reveal fades, .rm masked lines, .iw
        image wipes all share the one observer) ─────────────── */
  var revealables = document.querySelectorAll('.reveal, .rm, .iw');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── Reel cards: play only while on screen ────────────────── */
  var reels = document.querySelectorAll('.reel-card video');
  if (reels.length && 'IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting && !reduceMotion) {
          v.play().catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.35 });
    reels.forEach(function (v) { vio.observe(v); });
  }

  /* ── Nav + mobile action bar: react when the hero is left ── */
  var nav = document.getElementById('nav');
  var actionbar = document.getElementById('actionbar');
  var sentinel = document.getElementById('hero-sentinel');
  if (sentinel && 'IntersectionObserver' in window) {
    var navIo = new IntersectionObserver(function (entries) {
      var past = !entries[0].isIntersecting;
      if (nav) nav.classList.toggle('solid', past);
      if (actionbar) actionbar.classList.toggle('show', past);
    }, { rootMargin: '-72px 0px 0px 0px' });
    navIo.observe(sentinel);
  } else if (nav) {
    nav.classList.add('solid');
  }

  /* ── Mobile menu ─────────────────────────────────────────── */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobilemenu');
  if (burger && menu) {
    menu.hidden = true;
    var setOpen = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
  }

  /* ── Hero video: fal.ai cinemagraph over the still ────────
     Fades in only once it can actually play; the still stays
     as poster, first paint, and reduced-motion fallback. */
  var hero = document.getElementById('hero');
  var vid = document.getElementById('herovideo');
  if (vid && hero && !reduceMotion) {
    var startHeroVideo = function () {
      vid.addEventListener('error', function () { vid.hidden = true; }, true);
      vid.addEventListener('canplay', function () {
        hero.classList.add('video-on');
        vid.play().catch(function () {});
      }, { once: true });
      vid.hidden = false;
      vid.load();
    };
    /* Wait for the page to finish loading so the video never
       competes with the hero image, fonts, or LCP. */
    if (document.readyState === 'complete') {
      startHeroVideo();
    } else {
      window.addEventListener('load', startHeroVideo, { once: true });
    }
  }

  /* ── Hero pointer parallax (fine pointers only) ──────────── */
  if (hero && !reduceMotion && finePointer) {
    var raf = null;
    var mx = 0, my = 0;
    hero.addEventListener('pointermove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        hero.style.setProperty('--mx', mx.toFixed(3));
        hero.style.setProperty('--my', my.toFixed(3));
        raf = null;
      });
    });
  }

  /* ── Count-up stats (ported from Flocons) ─────────────────
     Numbers count up once, the first time they scroll into
     view. Reduced motion (and no-JS) keeps the final value
     that already ships in the HTML. */
  var counters = document.querySelectorAll('[data-counter]');
  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    var runCounter = function (el) {
      var to = parseFloat(el.getAttribute('data-counter'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var t0 = null;
      var dur = 1600;
      var step = function (ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3); /* ease-out cubic */
        el.textContent = (to * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ── Card tilt: cards lean toward the cursor, max ~3deg ──── */
  if (!reduceMotion && finePointer) {
    document.querySelectorAll('.card').forEach(function (card) {
      var tRaf = null;
      card.addEventListener('pointermove', function (e) {
        if (tRaf) return;
        tRaf = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--ry', (px * 5).toFixed(2) + 'deg');
          card.style.setProperty('--rx', (py * -5).toFixed(2) + 'deg');
          tRaf = null;
        });
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ── Magnetic CTAs (ported from Meggie Perle) ─────────────
     Buttons lean toward the cursor and spring back on exit.
     Direct transform writes, no state, pointer-only. */
  if (!reduceMotion && finePointer) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      var raf2 = null;
      btn.addEventListener('pointermove', function (e) {
        if (raf2) return;
        raf2 = requestAnimationFrame(function () {
          var r = btn.getBoundingClientRect();
          var x = (e.clientX - (r.left + r.width / 2)) * 0.22;
          var y = (e.clientY - (r.top + r.height / 2)) * 0.22;
          btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
          raf2 = null;
        });
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.transform = '';
      });
    });
  }
})();
