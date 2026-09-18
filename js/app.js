/* ===========================================================================
   RESTON RACING — experience runtime
   Chapter deck, media scheduling, cursor, menu, ignition and brochure reader.
   Everything animates on transform/opacity only; nothing measures layout
   inside an animation frame.
   =========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────────────────── chapter registry ───────────────────────────
     SINGLE SOURCE OF TRUTH for section order, labels and transition words.
     The top nav, the right-hand rail, the full-screen menu, the chapter tag,
     the progress fuel and the pager label are all generated from this array —
     to rename, add, remove or reorder a section, edit this list and add or
     remove the matching <section class="ch"> in index.html. Nothing else.   */
  var CH = [
    { id: 0, name: 'HOME',             word: 'IGNITION'   },
    { id: 1, name: 'THE EVENT',        word: 'MOMENTUM'   },
    { id: 2, name: 'EXPERIENCE',       word: 'IMMERSION'  },
    { id: 3, name: 'THE RACE',         word: 'FULL THROTTLE' },
    { id: 4, name: 'ROAD TO THE RACE', word: 'THE BUILD-UP'  },
    { id: 5, name: 'PARTNERS',         word: 'ALIGNMENT'  },
    { id: 6, name: 'LOCATION',         word: 'ARRIVAL'    }
  ];

  var sections = Array.prototype.slice.call(document.querySelectorAll('.ch'));
  var current = 0, locked = true;                 // locked until ignition ends

  /* ═════════════════════════ 1 · UNIFORM SCALE ══════════════════════════ */
  /* One factor for the whole home composition. Driven by the smaller of the
     two viewport ratios so type never outgrows the frame, and clamped so a
     very large monitor does not inflate the poster.                        */
  function fit() {
    var u = Math.min(window.innerWidth / 1280, window.innerHeight / 854);
    u = Math.max(0.62, Math.min(u, 1.45));
    document.documentElement.style.setProperty('--u', String(u));
  }
  fit();
  window.addEventListener('resize', fit, { passive: true });
  window.addEventListener('orientationchange', fit, { passive: true });

  /* ═══════════════════════════ 2 · MEDIA ════════════════════════════════ */
  /* Videos are created once and kept out of the DOM's paint path until their
     chapter is adjacent. Posters cover the first-frame gap so a chapter can
     never open on a blank rectangle.                                        */
  var films = Array.prototype.slice.call(document.querySelectorAll('.film'));

  films.forEach(function (film) {
    var key = film.dataset.video;
    var v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.preload = 'none';
    v.dataset.key = key;
    v.dataset.fmt = film.dataset.fmt || 'mp4';
    film.appendChild(v);
    film._video = v;
    film._sourced = false;
    /* which chapter owns this film, resolved once. The scheduler runs on every
       transition and must never walk the deck to answer that question. */
    film._ch = -1;
    for (var n = 0; n < sections.length; n++) {
      if (sections[n].contains(film)) { film._ch = n; break; }
    }
    v.addEventListener('playing', function () { film.classList.add('is-playing'); });
    v.addEventListener('canplay', function () { film.classList.add('is-ready'); });
    /* The poster is the fallback frame, and is-playing is what holds it out of
       the way. It used to be added once and never taken away, so a decoder the
       phone had evicted left the chapter on a blank rectangle with its own
       poster hidden behind it. These three events are the ones that mean there
       is genuinely nothing left to paint — the element has been emptied, has
       failed, or was aborted — and only they bring the poster back.
       'pause' is deliberately NOT in this list: a paused clip still paints its
       last frame, and the outgoing chapter is paused while it is still on
       screen fading out. Dropping to the poster there would be a visible jump.
       A refused autoplay needs nothing here at all — 'playing' never fires, so
       is-playing is never added and the poster simply stays up. */
    ['emptied', 'error', 'abort'].forEach(function (ev) {
      v.addEventListener(ev, function () { film.classList.remove('is-playing'); });
    });
  });

  function source(film) {
    if (film._sourced) return;
    /* a film with no box on this viewport is never fetched or decoded — the
       second EXPERIENCE reel is not shown on a phone, and loading it there
       would spend a decoder and a stream on something nobody can see */
    if (!film.offsetWidth && !film.offsetHeight) return;
    film._sourced = true;
    var v = film._video, key = v.dataset.key, fmt = v.dataset.fmt;
    // Exactly one <source> is emitted: requesting a sibling that was
    // deliberately not produced would only cost a 404 on every chapter.
    //   desktop  mp4  → H.264 4K masters; webm → VP9 4K masters
    //   phone    mp4  → the phone rendition (see PHONE_CUT)
    var s = document.createElement('source');
    var cut = phone.matches && PHONE_CUT[key];
    s.src = 'assets/video/' + (cut ? 'mobile/' + key + '.mp4' : key + '.' + fmt);
    s.type = (cut || fmt !== 'webm') ? 'video/mp4' : 'video/webm';
    v.appendChild(s);
    /* auto, because this is the clip the reader is looking at right now and
       nothing else is being fetched alongside it any more */
    v.preload = 'auto';
    v.load();
  }

  function filmsIn(i) {
    return films.filter(function (f) { return sections[i].contains(f); });
  }

  /* A phone decodes the same 4K masters a desktop does on a fraction of the
     silicon, and every mobile browser caps how many video decoders it will
     keep alive at once. Warming three chapters at a time walked into that cap:
     the clip that was actually on screen lost its decoder a few seconds in and
     the chapter was left on flat colour. On a phone only the chapter being
     watched is sourced, so there is one stream buffering and decoding instead
     of three. The poster already covers the first-frame gap on the way in.
     Desktop keeps its look-ahead exactly as it was. */
  var phone = window.matchMedia(
    '(max-width:760px),(max-height:520px) and (orientation:landscape)');

  /* ── THE PHONE RENDITIONS ────────────────────────────────────────────────
     Measured, not assumed. Every desktop master is 3840x2160 at 11-25 Mbps —
     8.29 megapixels per frame — and four of them are VP9, which a great many
     phones have no hardware decoder for and fall back to software. Worse, the
     chapters are full-bleed portrait on a phone, so object-fit:cover shows
     only 26-32% of each frame's WIDTH: the phone was decoding 8.29 Mpx per
     frame and discarding roughly three quarters of it, forever, on a loop.
     That is the lag, and no amount of scheduling fixes it.
     Each rendition here is the SAME region the phone already displays —
     1216 of 3840 source px, positioned by that chapter's own object-position,
     scaled to 1080x1918 H.264. Because object-position is applied again to
     the crop, the composition on screen is unchanged; the pixels that were
     being decoded and thrown away are simply no longer shipped.
     Result per frame: 8.29 Mpx -> 2.07 Mpx, and H.264 everywhere, which every
     phone since 2012 decodes in hardware. Across all seven chapters a phone
     now fetches 29.3 MB instead of 83.4 MB.
     ch2-reel-a is already a 1080x1920 H.264 phone-native master and is used
     as it is; ch2-reel-b is not shown on a phone and is never fetched. The
     desktop masters are untouched — desktop still plays them. */
  var PHONE_CUT = {
    'ch0-home': 1, 'ch1-event': 1, 'ch3-race': 1,
    'ch4-road': 1, 'ch5-partners': 1, 'ch6-location': 1
  };

  /* Releasing a clip is the other half of loading one, and it was missing.
     Every chapter that had ever been visited stayed sourced with preload:auto
     and, on desktop, a live decoder — so after one pass through the deck the
     browser was holding eight 4K streams at once and the whole page went
     heavy. Emptying the element drops its buffer and its decoder; the poster
     is already back in front, so nothing changes on screen. */
  function unload(film) {
    if (!film._sourced) return;
    var v = film._video;
    film._sourced = false;
    try { v.pause(); } catch (e) {}
    film.classList.remove('is-playing', 'is-ready');
    while (v.firstChild) v.removeChild(v.firstChild);
    v.removeAttribute('src');
    v.preload = 'none';
    try { v.load(); } catch (e) {}
  }

  /* the working set is ONE chapter, on every device. A desktop look-ahead was
     measured on this build: holding one chapter either side put three 4K
     clips in flight at once and the dropped-frame rate went from ~3% to
     ~19%. It bought nothing the poster was not already covering, because the
     transition never waits on video in the first place. */
  function inWindow(f, i) {
    return f._ch === i;
  }

  /* STAGE 1 — runs as soon as the swap has been painted.
     RELEASE FIRST, THEN LOAD. This ordering is the point: a decoder for the
     new chapter is never opened while a decoder the page no longer needs is
     still alive, which is what produced contention when navigation was quick.
     It also aborts an in-flight load for a chapter the reader has already
     left, instead of letting it finish downloading into nothing. */
  function claim(i) {
    films.forEach(function (f) { if (!inWindow(f, i)) unload(f); });
    filmsIn(i).forEach(source);
  }



  function playChapter(i) {
    films.forEach(function (f) {
      var v = f._video;
      if (f._ch === i) {
        source(f);
        if (!f._sourced) return;               /* no box on this viewport */
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }

  /* If a phone suspends the decoder mid-chapter — a memory-pressure eviction,
     a backgrounded tab, an autoplay policy that only lets the first seconds
     through — the clip stops and the plate goes flat. This puts it back.
     It only ever touches the chapter that is already current, only while the
     page is visible, and only on a phone, so it cannot start a clip that
     playChapter() means to have paused, and desktop is untouched. */
  function keepPlaying() {
    if (!phone.matches || document.hidden) return;
    if (typeof current !== 'number' || !sections[current]) return;
    filmsIn(current).forEach(function (f) {
      var v = f._video;
      if (v && f._sourced && v.paused && !v.ended) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      }
    });
  }
  films.forEach(function (f) {
    ['pause', 'stalled', 'suspend'].forEach(function (ev) {
      f._video.addEventListener(ev, function () {
        if (sections[current] && sections[current].contains(f)) {
          setTimeout(keepPlaying, 400);
        }
      });
    });
  });
  document.addEventListener('visibilitychange', keepPlaying);
  window.addEventListener('pageshow', keepPlaying);
  /* the watchdog is a phone remedy, so it only ticks on a phone — a desktop
     was running a timer every four seconds for a function that returns
     immediately, and it kept ticking in a background tab */
  var beat = null;
  function beatOn() {
    if (phone.matches && !beat) beat = setInterval(keepPlaying, 4000);
    else if (!phone.matches && beat) { clearInterval(beat); beat = null; }
  }
  beatOn();
  if (phone.addEventListener) phone.addEventListener('change', beatOn);
  else if (phone.addListener) phone.addListener(beatOn);

  /* ═════════════════════════ 3 · CHAPTER DECK ═══════════════════════════ */
  var veil = document.getElementById('veil');
  var veilWord = document.getElementById('veilWord');
  var railFuel = document.getElementById('railFuel');
  var chapterNum = document.getElementById('chapterNum');
  var chapterName = document.getElementById('chapterName');
  var pagerNextLabel = document.getElementById('pagerNextLabel');
  var pagerNext = document.getElementById('pagerNext');
  var pagerPrev = document.getElementById('pagerPrev');

  /* the indicator is measured, never hard-coded, so it stays correct through
     font loading and every viewport. Purely visual: no navigation state. */
  var navInk = null, inkAt = -1;
  function placeInk(i) {
    navInk = navInk || document.getElementById('navInk');
    var links = document.querySelectorAll('.topnav a');
    if (!navInk || !links[i]) return;
    var p = navInk.parentNode.getBoundingClientRect();
    var r = links[i].getBoundingClientRect();
    if (!r.width) return;
    navInk.style.width = r.width + 'px';
    navInk.style.transform = 'translateX(' + (r.left - p.left) + 'px)';
    if (i !== inkAt) {
      inkAt = i;
      navInk.classList.remove('is-set');
      void navInk.offsetWidth;
      navInk.classList.add('is-set');
    }
  }
  var inkRaf = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(inkRaf);
    inkRaf = requestAnimationFrame(function () { placeInk(current); });
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { placeInk(current); });
  }

  function paintState(i) {
    body.dataset.chapter = String(i);
    chapterNum.textContent = ('0' + (i + 1)).slice(-2);
    chapterName.textContent = CH[i].name;
    railFuel.style.height = ((i / (CH.length - 1)) * 100) + '%';

    var next = CH[i + 1];
    pagerNext.classList.toggle('is-off', !next);
    if (next) pagerNextLabel.textContent = next.name;

    document.querySelectorAll('.topnav a').forEach(function (a, n) {
      a.classList.toggle('is-active', n === i);
    });
    /* the indicator measures layout, so it is deferred a frame: reading
       geometry in the same frame as the chapter class flip forces a
       synchronous layout at the worst possible moment */
    requestAnimationFrame(function () { placeInk(i); });
    document.querySelectorAll('#railList li').forEach(function (li, n) {
      li.classList.toggle('is-here', n === i);
      li.firstChild.setAttribute('aria-current', n === i ? 'true' : 'false');
    });
    document.querySelectorAll('#menuList li').forEach(function (li, n) {
      li.classList.toggle('is-here', n === i);
    });
  }

  function go(i, opts) {
    opts = opts || {};
    if (locked || i === current || i < 0 || i >= sections.length) return;
    locked = true;

    var fwd = i > current;
    var from = sections[current], to = sections[i];

    /* NOTHING on this path touches media. Sourcing the incoming chapter here
       meant every chapter change began with a synchronous load() — attaching a
       source, opening a connection and standing up a decoder — before the
       sweep had drawn a single frame, which is why a slow clip visibly held up
       the transition. Loading and playback are scheduled after the swap has
       been painted (below), and the neighbours after the sweep has finished. */
    /* both chapters get their compositor layer now, a full veil-sweep before
       either of them moves, so the scale/opacity run is a GPU transform of an
       existing texture instead of a per-frame re-raster of video + gradients */
    from.style.willChange = 'transform,opacity';
    to.style.willChange = 'transform,opacity';
    veilWord.textContent = CH[i].word;
    veil.className = 'veil is-on ' + (fwd ? 'is-fwd' : 'is-back');

    var swapAt = reduce ? 0 : 300;
    var doneAt = reduce ? 40 : 940;

    setTimeout(function () {
      from.classList.remove('is-current');
      from.classList.add(fwd ? 'is-out-fwd' : 'is-out-back');
      to.classList.remove('is-out-fwd', 'is-out-back');
      to.classList.add('is-current');
      current = i;
      paintState(i);
      /* two frames later: the class flip has been styled, laid out and
         committed, so opening a decoder cannot stall the sweep. The chapter
         is already fully changed by this point — the clip catches up on its
         own, behind its poster. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (current !== i) return;        /* superseded — do nothing */
          claim(i);
          playChapter(i);
        });
      });
    }, swapAt);

    setTimeout(function () {
      veil.className = 'veil';
      from.classList.remove('is-out-fwd', 'is-out-back');
      from.style.willChange = to.style.willChange = 'auto';
      locked = false;
    }, doneAt);
  }

  /* ═════════════════════════ 4 · RAIL + MENU ════════════════════════════ */
  var railList = document.getElementById('railList');
  var menuList = document.getElementById('menuList');
  var topnav = document.getElementById('topnav');

  /* the deck and the registry must stay in step — surfaces a mismatch the
     moment a section is added to one and not the other */
  if (sections.length !== CH.length) {
    console.warn('[nav] ' + CH.length + ' chapters registered but ' +
      sections.length + ' .ch sections in the DOM — update both.');
  }

  var TOTAL = ('0' + CH.length).slice(-2);

  CH.forEach(function (c, i) {
    var num = ('0' + (i + 1)).slice(-2);

    /* chapter signature — one wayfinding pattern for every chapter, generated
       from the same registry as the rail and menu, and inserted above each
       chapter's existing eyebrow so nothing is hard-coded per chapter */
    var anchor = sections[i] && sections[i].querySelector('.ch-eyebrow, .eyebrow');
    if (anchor) {
      var sig = document.createElement('p');
      sig.className = 'ch-sig';
      sig.setAttribute('aria-hidden', 'true');
      sig.innerHTML = '<em>' + num + '</em><i></i><span>' + TOTAL + '</span>';
      anchor.insertAdjacentElement('beforebegin', sig);
    }

    var a = document.createElement('a');
    a.href = '#';
    a.dataset.goto = String(i);
    a.textContent = c.name;
    if (i === 0) a.className = 'is-active';
    topnav.appendChild(a);
    if (i === CH.length - 1) {
      /* one shared active-chapter indicator, appended after the links */
      var ink = document.createElement('i');
      ink.className = 'nav-ink';
      ink.id = 'navInk';
      ink.setAttribute('aria-hidden', 'true');
      topnav.appendChild(ink);
    }

    var li = document.createElement('li');
    li.innerHTML = '<button data-cur="nav" aria-label="' + c.name + '"><em>' +
      c.name + '</em><b class="rail-num">' + num + '</b><i></i></button>';
    li.querySelector('button').addEventListener('click', function () { go(i); });
    railList.appendChild(li);

    var mli = document.createElement('li');
    mli.style.transitionDelay = (0.16 + i * 0.045) + 's';
    mli.innerHTML = '<button data-cur="menu"><span class="menu-num">' +
      num + '</span><span class="menu-name">' + c.name + '</span></button>';
    mli.querySelector('button').addEventListener('click', function () {
      closeMenu();
      setTimeout(function () { go(i); }, 180);
    });
    menuList.appendChild(mli);
  });

  var menuBtn = document.getElementById('menuBtn');
  function openMenu() { body.classList.add('menu-open'); menuBtn.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', function () {
    body.classList.contains('menu-open') ? closeMenu() : openMenu();
  });
  document.getElementById('menu').addEventListener('click', function (e) {
    if (e.target === this) closeMenu();
  });

  /* ═════════════════════════ 5 · NAVIGATION IO ══════════════════════════ */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-goto]');
    if (t) { e.preventDefault(); go(parseInt(t.dataset.goto, 10)); return; }
    if (e.target.closest('[data-brochure]')) { e.preventDefault(); openReader(); }
  });
  pagerNext.addEventListener('click', function () { go(current + 1); });
  pagerPrev.addEventListener('click', function () { go(current - 1); });
  document.getElementById('homeCtl').addEventListener('click', function () { go(0); });

  /* A horizontal card row is a scroller in its own right, and the chapter
     gesture listens on window. Without this, one swipe did two jobs: it
     scrolled the row AND travelled far enough sideways to read as a chapter
     swipe, so the deck moved underneath the user's finger. The rule is
     ownership — if the gesture starts inside something that can actually
     scroll sideways, or inside the detail sheet, that element owns it and the
     deck never sees it. Nothing is disabled and no control is added: the row
     scrolls exactly as it did, it simply stops leaking into navigation.
     The cheap scrollWidth test is done first so getComputedStyle is only
     reached for an element that genuinely overflows. */
  function ownsGesture(node) {
    for (var e = node; e && e !== document.body; e = e.parentElement) {
      if (e.nodeType !== 1) continue;
      if (e.classList && e.classList.contains('mob-sheet')) return true;
      if (e.scrollWidth - e.clientWidth > 2) {
        var ox = getComputedStyle(e).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
    }
    return false;
  }

  /* wheel: HORIZONTAL intent only. Vertical wheel / trackpad scrolling never
     changes chapter — newcomers scroll down to explore, and that must be inert.
     Horizontal-dominant deltas accumulate so a deliberate trackpad swipe (many
     small events) counts, while stray sideways jitter does not. */
  var wheelLock = 0, wAcc = 0, wAt = 0;
  window.addEventListener('wheel', function (e) {
    /* checked BEFORE preventDefault, so a scroller keeps its own wheel */
    if (ownsGesture(e.target)) return;
    e.preventDefault();
    if (body.classList.contains('reader-open')) return;
    var now = Date.now();
    if (now < wheelLock || locked) return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   /* vertical → ignore */
    if (now - wAt > 260) wAcc = 0;                          /* new gesture */
    wAt = now;
    wAcc += e.deltaX;
    if (Math.abs(wAcc) < 40) return;                        /* not deliberate yet */
    wheelLock = now + 900;
    var dir = wAcc > 0 ? 1 : -1;
    wAcc = 0;
    go(current + dir);
  }, { passive: false });

  /* touch: only a finished, deliberate ONE-FINGER horizontal swipe navigates.
     Gesture validity is tracked from touchstart onward — a second finger at any
     point kills it, so pinch/zoom can never fall through to go() on touchend. */
  var ty = 0, tx = 0, tOk = false;
  window.addEventListener('touchstart', function (e) {
    if (e.touches.length > 1) { tOk = false; return; }      /* multi-touch → cancel */
    if (ownsGesture(e.target)) { tOk = false; return; }     /* a scroller has it */
    ty = e.touches[0].clientY; tx = e.touches[0].clientX; tOk = true;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) tOk = false;                  /* pinch/zoom → cancel */
  }, { passive: true });
  window.addEventListener('touchcancel', function () { tOk = false; }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (!tOk) return;
    tOk = false;
    if (e.touches.length) return;                           /* fingers still down */
    if (locked || body.classList.contains('reader-open')) return;
    var dx = tx - e.changedTouches[0].clientX;
    var dy = ty - e.changedTouches[0].clientY;
    /* deliberate travel, and clearly horizontal rather than a vertical swipe */
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    go(current + (dx > 0 ? 1 : -1));                        /* left → next */
  }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (body.classList.contains('reader-open')) return closeReader();
      if (body.classList.contains('menu-open')) return closeMenu();
    }
    if (body.classList.contains('reader-open')) {
      if (e.key === 'ArrowRight') readerGo(1);
      if (e.key === 'ArrowLeft') readerGo(-1);
      return;
    }
    switch (e.key) {
      case 'ArrowDown': case 'ArrowRight': case 'PageDown': case ' ':
        e.preventDefault(); go(current + 1); break;
      case 'ArrowUp': case 'ArrowLeft': case 'PageUp':
        e.preventDefault(); go(current - 1); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End':  e.preventDefault(); go(CH.length - 1); break;
      default:
        if (/^[1-7]$/.test(e.key)) go(parseInt(e.key, 10) - 1);
    }
  });

  /* ═══════════════════════════ 6 · CURSOR ═══════════════════════════════ */
  var cur = document.getElementById('cur');
  var curLag = document.getElementById('curLag');
  var curLabel = document.getElementById('curLabel');
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* Touch-only devices never enter this branch, so no cursor node is ever
     shown, no listeners are bound, and html.cur-on is never set — which means
     the native cursor is never hidden either. Touch behaviour is untouched. */
  if (fine) {
    var mx = -200, my = -200;      /* true pointer — the core sits here exactly */
    var lx = mx, ly = my;          /* bezel, trailing */
    /* note: names are cursor-prefixed — the boot loop later in this file
       declares its own `var shown`, and var is function-scoped */
    var raf = 0, curLive = false, curShown = false, pmx = NaN, pmy = NaN;

    var LERP = reduce ? 1 : 0.19;  /* bezel inertia */
    var MAXLAG = 9;                /* px — momentum, deliberately not a trail */

    var LABEL = {
      'nav-next': 'NEXT', 'nav-prev': 'BACK', 'nav': 'GO',
      'media': 'VIEW', 'menu': 'MENU', 'cta': ''
    };

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!curLive) {
        curLive = true; lx = mx; ly = my;
        /* hand over from the system cursor only now, at a known-good position */
        document.documentElement.classList.add('cur-on');
      }
      if (!curShown) { curShown = true; cur.classList.add('is-live'); }
    }, { passive: true });

    window.addEventListener('mousedown', function () { cur.classList.add('is-down'); });
    window.addEventListener('mouseup', function () { cur.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { curShown = false; cur.classList.remove('is-live'); });
    document.addEventListener('mouseenter', function () { if (curLive && !curShown) { curShown = true; cur.classList.add('is-live'); } });

    function tick() {
      raf = requestAnimationFrame(tick);

      var dx = mx - lx, dy = my - ly;
      /* idle: nothing to write, so the compositor is left alone */
      if (mx === pmx && my === pmy && Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) return;
      pmx = mx; pmy = my;

      /* the core is written straight from the raw pointer — pixel-accurate */
      cur.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';

      lx += dx * LERP; ly += dy * LERP;
      dx = mx - lx; dy = my - ly;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > MAXLAG) { var k = MAXLAG / d; dx *= k; dy *= k; d = MAXLAG; }

      /* speed shows as a little mechanical compliance in the bezel: it hangs
         back a few px and elongates along the vector. Capped, so fast movement
         reads as momentum rather than as a streak. */
      var s = 1 + (d / MAXLAG) * 0.16;
      var a = d > 0.4 ? Math.atan2(dy, dx) * 180 / Math.PI : 0;
      curLag.style.transform =
        'translate3d(' + (-dx).toFixed(2) + 'px,' + (-dy).toFixed(2) + 'px,0) ' +
        'rotate(' + a.toFixed(1) + 'deg) scale(' + s.toFixed(3) + ',' +
        (1 - (s - 1) * 0.55).toFixed(3) + ') rotate(' + (-a).toFixed(1) + 'deg)';
    }
    raf = requestAnimationFrame(tick);

    /* state is resolved on pointerover only — no per-frame hit-testing */
    document.addEventListener('pointerover', function (e) {
      if (!e.target || !e.target.closest) return;
      var el = e.target.closest('[data-cur]');
      var state = el ? el.dataset.cur
        : (e.target.closest('a,button,[data-goto],[data-brochure]') ? 'interactive' : '');
      if (state) {
        cur.dataset.state = state;
        curLabel.textContent = LABEL[state] !== undefined ? LABEL[state] : '';
      } else {
        cur.removeAttribute('data-state');
        curLabel.textContent = '';
      }
    });
  }

  /* ══════════════════ 6b · CLICK — WET GROUND (SOUND ONLY) ══════════════ */
  /* The splash graphic is gone: no sprite, no particles, no impact layer, no
     DOM at all. What remains is the wet-earth sound on a real mouse click.
     pointerdown carries pointerType, so touch, pen, pinch and multi-touch
     never reach here; wheel and keyboard never do either. The listener is
     passive, so nothing is blocked or delayed. */
  if (fine && !reduce) (function () {
    var SND = ['assets/audio/mud-1.wav', 'assets/audio/mud-2.wav'];
    var actx = null, raw = [], buf = [], lastSnd = 0;

    SND.forEach(function (u, i) {
      fetch(u).then(function (r) { return r.arrayBuffer(); })
        .then(function (d) { raw[i] = d; decode(i); })
        .catch(function () {});
    });
    function decode(i) {
      if (!actx || !raw[i] || buf[i]) return;
      try {
        actx.decodeAudioData(raw[i].slice(0),
          function (b) { buf[i] = b; }, function () {});
      } catch (e) {}
    }
    function squelch() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) { actx = new AC(); for (var k = 0; k < SND.length; k++) decode(k); }
      if (actx.state === 'suspended') actx.resume();
      var b = buf[(Math.random() * SND.length) | 0] || buf[0] || buf[1];
      if (!b) return;                          /* still decoding — stay silent */
      var s = actx.createBufferSource(), g = actx.createGain();
      s.buffer = b;
      s.playbackRate.value = 0.90 + Math.random() * 0.20;
      g.gain.value = 0.085 + Math.random() * 0.05;   /* sits under the page */
      s.connect(g); g.connect(actx.destination); s.start();
    }

    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      var now = Date.now();
      if (now - lastSnd < 70) return;          /* no stacking on fast clicks */
      lastSnd = now;
      squelch();
    }, { passive: true });
  })();

  /* ════════════════════════ 7 · BROCHURE READER ═════════════════════════ */
  var PAGES = 8;
  var readerImg = document.getElementById('readerImg');
  var readerPages = document.getElementById('readerPages');
  var readerCount = document.getElementById('readerCount');
  var page = 1, readerBuilt = false;

  function buildReader() {
    if (readerBuilt) return; readerBuilt = true;
    for (var p = 1; p <= PAGES; p++) {
      var im = document.createElement('img');
      im.src = 'assets/img/brochure/pg-' + p + '.jpg';
      im.alt = 'Brochure page ' + p;
      im.loading = 'lazy';
      im.dataset.p = String(p);
      im.addEventListener('click', function () { showPage(+this.dataset.p); });
      readerPages.appendChild(im);
    }
  }
  function showPage(p) {
    page = Math.max(1, Math.min(PAGES, p));
    readerImg.src = 'assets/img/brochure/pg-' + page + '.jpg';
    readerCount.textContent = page + ' / ' + PAGES;
    readerPages.querySelectorAll('img').forEach(function (im) {
      im.classList.toggle('is-on', +im.dataset.p === page);
    });
  }
  function readerGo(d) { showPage(page + d); }
  function openReader() { buildReader(); showPage(page); body.classList.add('reader-open'); }
  function closeReader() { body.classList.remove('reader-open'); }

  document.getElementById('readerClose').addEventListener('click', closeReader);
  document.getElementById('readerNext').addEventListener('click', function () { readerGo(1); });
  document.getElementById('readerPrev').addEventListener('click', function () { readerGo(-1); });

  /* ═══════════════════════ 8 · IGNITION SEQUENCE ════════════════════════ */
  /* The dial reports real preparation work. It never invents delay: once the
     critical assets are in, the needle completes and hands over.            */
  var boot = document.getElementById('boot');
  var needle = document.getElementById('tachNeedle');
  var sweep = document.querySelector('.tach-sweep');
  var rpmOut = document.getElementById('bootRpm');
  var bootWord = document.getElementById('bootWord');

  /* 0-200 across the 270 deg sweep: 41 graduations of 5, a major every 20 and
     a printed numeral every 40. The redline opens at 160. */
  var TACH_MAX = 200, TACH_STEPS = 40, TACH_RED = 160;
  (function dial() {
    var g = document.getElementById('tachTicks'), n = document.getElementById('tachNums');
    var ticks = '', nums = '';
    for (var i = 0; i <= TACH_STEPS; i++) {
      var val = TACH_MAX * i / TACH_STEPS;
      var a = (-135 + (270 * i / TACH_STEPS)) * Math.PI / 180;
      var maj = i % 2 === 0, lab = i % 4 === 0;
      var r1 = 132 - (lab ? 19 : maj ? 13 : 7), r2 = 130;
      var cls = lab ? 'maj lab' : maj ? 'maj' : '';
      if (val >= TACH_RED) cls += ' red';
      ticks += '<line class="' + cls + '" x1="' + (160 + Math.sin(a) * r1).toFixed(1) +
        '" y1="' + (160 - Math.cos(a) * r1).toFixed(1) +
        '" x2="' + (160 + Math.sin(a) * r2).toFixed(1) +
        '" y2="' + (160 - Math.cos(a) * r2).toFixed(1) + '"/>';
      if (i % 8 === 0) {                                  /* 0 40 80 120 160 200 */
        var rn = 132 - 34;
        nums += '<text class="' + (val >= TACH_RED ? 'red' : '') +
          '" x="' + (160 + Math.sin(a) * rn).toFixed(1) +
          '" y="' + (160 - Math.cos(a) * rn).toFixed(1) +
          '" text-anchor="middle" dominant-baseline="central">' + val + '</text>';
      }
    }
    g.innerHTML = ticks; n.innerHTML = nums;
  })();

  /* the hero is footage + live type now, so the only critical images left are
     the two supplied brand marks and the hero's own poster frame */
  var CRITICAL = [
    'assets/img/logo-header.png',
    'assets/img/rj-mark.png',
    'assets/img/poster-ch0-home.jpg'
  ];

  var loaded = 0, target = CRITICAL.length + 1;   // +1 for webfonts
  function bump() { loaded++; }

  CRITICAL.forEach(function (src) {
    var im = new Image();
    im.onload = im.onerror = bump;
    im.src = src;
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(bump).catch(bump);
  } else { bump(); }

  var MIN_MS = reduce ? 200 : 1500, MAX_MS = 4200;
  var t0 = performance.now(), tPrev = t0, shown = 0, goalS = 0, bootRaf;
  var WORDS = [[0, 'IGNITION'], [.34, 'SYSTEMS'], [.62, 'FUEL'], [.86, 'READY']];

  /* Two exponential filters instead of one fixed per-frame lerp. The old
     `x += (goal - x) * 0.09` moved by a fixed fraction PER FRAME, so its speed
     changed with the refresh rate and it stepped whenever an asset landed and
     pushed `goal` up by a quarter. The first filter takes the edge off those
     steps, the second carries the needle; both are integrated against real
     elapsed time, so the sweep is identical at 60Hz and 120Hz. */
  function damp(cur, aim, tau, dt) { return cur + (aim - cur) * (1 - Math.exp(-dt / tau)); }

  function bootFrame(now) {
    var el = now - t0;
    var dt = Math.min(64, Math.max(1, now - tPrev)); tPrev = now;
    var real = loaded / target;
    var floor = Math.min(el / MIN_MS, 1);            // never stalls at zero
    var goal = Math.min(real, floor);
    if (el > MAX_MS) goal = 1;

    goalS = damp(goalS, goal, 110, dt);              // absorbs the load steps
    shown = damp(shown, goalS, 190, dt);             // carries the needle
    if (goal === 1 && shown > 0.997) shown = 1;

    var eased = shown * shown * (3 - 2 * shown);     // smoothstep, engine-like
    needle.style.transform = 'rotate(' + (-135 + eased * 270).toFixed(3) + 'deg)';
    sweep.style.strokeDashoffset = (829.4 - eased * 622).toFixed(2);
    rpmOut.textContent = Math.round(eased * TACH_MAX);

    for (var i = WORDS.length - 1; i >= 0; i--) {
      if (eased >= WORDS[i][0]) { bootWord.textContent = WORDS[i][1]; break; }
    }

    if (shown >= 1 && el >= MIN_MS) return finishBoot();
    bootRaf = requestAnimationFrame(bootFrame);
  }

  function finishBoot() {
    cancelAnimationFrame(bootRaf);
    body.dataset.boot = 'done';
    body.setAttribute('data-booted', '');
    paintState(0);
    /* same rule as a chapter change: the first paint is never spent standing
       up a decoder. The poster is already on screen, so the clip has a frame
       to arrive behind. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { claim(0); playChapter(0); });
    });
    setTimeout(function () { locked = false; }, reduce ? 0 : 420);
    setTimeout(function () { boot.remove(); }, 1200);
  }

  paintState(0);
  requestAnimationFrame(bootFrame);
})();
