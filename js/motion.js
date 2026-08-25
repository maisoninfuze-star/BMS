/* Restaurant BMS · GSAP scroll choreography
   Loaded after gsap + ScrollTrigger + app.js. Layered on top of
   the CSS baseline: when this file runs, it takes ownership of
   the effects it upgrades (body.gsap-motion switches the CSS
   versions off). If GSAP is missing or reduced motion is on,
   the CSS baseline simply keeps doing its job. */

(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add('gsap-motion');

  /* Keep ScrollTrigger in step with Lenis (app.js exposes it). */
  if (window.bmsLenis) {
    window.bmsLenis.on('scroll', ScrollTrigger.update);
  }

  /* ── Auto-hiding nav: leaves going down, returns going up.
        ScrollTrigger's direction tracking works with Lenis,
        native scroll, and keyboard scrolling alike. ─────────── */
  var navEl = document.getElementById('nav');
  if (navEl) {
    ScrollTrigger.create({
      start: 320,
      end: function () { return ScrollTrigger.maxScroll(window); },
      onUpdate: function (self) {
        var mmEl = document.getElementById('mobilemenu');
        var open = mmEl && !mmEl.hidden;
        navEl.classList.toggle('away', self.direction === 1 && !open);
      },
      onLeaveBack: function () { navEl.classList.remove('away'); }
    });
  }

  /* ══ 1 · Character-level headline reveals ═══════════════════
     Every .rm headline is split into word masks and characters;
     chars rise out of their word with a slight rotation, the
     kitchen-knife rhythm at type scale. (The SplitText pattern,
     hand-rolled: aria-label keeps the headline readable.) */
  document.querySelectorAll('.rm').forEach(function (el) {
    var host = el.querySelector(':scope > span') || el;
    var label = (el.textContent || '').replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);

    var frag = document.createDocumentFragment();
    var chars = [];
    var splitInto = function (node, out) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'sw';
            w.setAttribute('aria-hidden', 'true');
            for (var i = 0; i < part.length; i++) {
              var c = document.createElement('span');
              c.className = 'sc';
              c.textContent = part[i];
              w.appendChild(c);
              chars.push(c);
            }
            out.appendChild(w);
          });
        } else if (child.nodeType === 1 && child.tagName === 'BR') {
          out.appendChild(document.createElement('br'));
        } else if (child.nodeType === 1) {
          splitInto(child, out);
        }
      });
    };
    splitInto(host, frag);
    el.classList.remove('rm');
    el.classList.add('rm-split');
    el.innerHTML = '';
    el.appendChild(frag);

    gsap.set(chars, { yPercent: 120, rotate: 5 });
    gsap.to(chars, {
      yPercent: 0,
      rotate: 0,
      duration: 0.85,
      ease: 'power4.out',
      stagger: 0.016,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  /* ══ 2 · The craft cards deal themselves (desktop pin) ══════
     The section pins and the three cards rise into the row one
     after another, tied to the scrollbar. */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', function () {
    var craft = document.querySelector('.craft');
    var cards = gsap.utils.toArray('.craft-row .card');
    if (!craft || cards.length !== 3) return;

    cards.forEach(function (c) {
      c.classList.remove('reveal');
      c.classList.add('in');
      c.style.removeProperty('--d');
    });

    gsap.set(cards, {
      yPercent: function (i) { return 130 + i * 18; },
      rotate: function (i) { return i === 1 ? 4 : -4; },
      opacity: 0
    });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: craft,
        start: 'top top',
        end: '+=130%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1
      }
    });
    tl.to(cards, {
      yPercent: 0,
      rotate: 0,
      opacity: 1,
      stagger: 0.28,
      ease: 'power2.out'
    }).to({}, { duration: 0.25 }); /* beat of stillness before unpin */

    return function () {
      gsap.set(cards, { clearProps: 'all' });
    };
  });

  /* ══ 3 · Veg band: cinematic zoom parallax ══════════════════
     The spread swells as it crosses the viewport; the copy
     rises out of the scrim slightly behind it. */
  var band = document.querySelector('.band');
  if (band) {
    gsap.fromTo(band.querySelector('img'),
      { scale: 1.02 },
      {
        scale: 1.28,
        ease: 'none',
        scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    gsap.fromTo(band.querySelector('.band-copy'),
      { y: 90 },
      {
        y: -30,
        ease: 'none',
        scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: true }
      });
  }

  /* ══ 4 · Bento: elastic grid lag ════════════════════════════
     Each cell drifts at its own speed through the section, so
     the grid feels loose and physical instead of welded. */
  var bento = document.querySelector('.bento');
  if (bento) {
    var amps = [34, -26, 22, -20, 28];
    gsap.utils.toArray('.bento .cell').forEach(function (cell, i) {
      var amp = amps[i % amps.length];
      gsap.fromTo(cell, { y: amp }, {
        y: -amp,
        ease: 'none',
        scrollTrigger: { trigger: bento, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ══ 5 · Reels stage: the sticky phone (Lala Masala pattern) ═
     The section is tall; the phone is sticky via CSS. Scroll
     progress picks the active reel; sources attach lazily just
     before the section arrives; only the active reel plays. */
  var stage = document.querySelector('.reels-stage');
  if (stage) {
    var reelVids = gsap.utils.toArray('.phone-screen video');
    var capEl = document.getElementById('reelcaption');
    var current = -1;

    var setActive = function (idx) {
      if (idx === current) return;
      current = idx;
      reelVids.forEach(function (v, k) {
        v.classList.toggle('on', k === idx);
        if (k === idx) { v.play().catch(function () {}); } else { v.pause(); }
      });
      if (capEl && reelVids[idx]) capEl.textContent = reelVids[idx].getAttribute('data-caption');
    };

    /* If play() raced the lazy load, start the active reel the
       moment its data actually arrives. */
    reelVids.forEach(function (v) {
      v.addEventListener('canplay', function () {
        if (v.classList.contains('on') && v.paused) v.play().catch(function () {});
      });
    });

    ScrollTrigger.create({
      trigger: stage,
      start: 'top 130%',
      once: true,
      onEnter: function () {
        reelVids.forEach(function (v) { v.src = v.getAttribute('data-src'); v.load(); });
      }
    });

    ScrollTrigger.create({
      trigger: stage,
      start: 'top 60%',
      end: 'bottom bottom',
      onUpdate: function (self) {
        setActive(Math.min(reelVids.length - 1, Math.floor(self.progress * reelVids.length)));
      },
      onToggle: function (self) {
        if (self.isActive) {
          setActive(Math.min(reelVids.length - 1, Math.floor(self.progress * reelVids.length)));
        }
      },
      onLeave: function () { reelVids.forEach(function (v) { v.pause(); }); current = -1; },
      onLeaveBack: function () { reelVids.forEach(function (v) { v.pause(); }); current = -1; }
    });

    /* The phone rides up into place as the stage arrives. */
    gsap.from('.phone', {
      yPercent: 16,
      scale: 0.94,
      ease: 'none',
      scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top 20%', scrub: true }
    });

    /* The backdrop handle drifts sideways through the stay. */
    gsap.fromTo('.reels-word', { xPercent: 6 }, {
      xPercent: -6,
      ease: 'none',
      scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }


  /* ══ 6 · Finale: the glow arrives ═══════════════════════════
     The orange block wipes up from the bottom edge as it enters,
     the one loud moment earning a loud entrance. */
  var finale = document.querySelector('.finale');
  if (finale) {
    gsap.fromTo(finale,
      { clipPath: 'inset(12% 0% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        ease: 'none',
        scrollTrigger: { trigger: finale, start: 'top bottom', end: 'top 30%', scrub: true }
      });
  }
})();
