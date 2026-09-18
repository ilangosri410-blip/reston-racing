/* ===========================================================================
   THEME SWITCH — review affordance for comparing the two visual options.
   ---------------------------------------------------------------------------
   Self-contained. app.js is not touched and knows nothing about this: the only
   thing that changes is data-theme on <html>, which css/theme-light.css keys
   off. Remove this file and the link tag and the site is the dark design.

   LIGHT is the default. DARK is OPTION 1, preserved exactly as approved and
   reachable three ways, so it can be viewed from this same project:
     · the LIGHT / DARK control at the foot of the chapter menu
     · ?theme=dark  or  ?theme=light  in the URL
     · the T key
   The choice is remembered per browser so a walkthrough survives a reload.
   =========================================================================== */
(function () {
  'use strict';

  var KEY = 'rr-theme';
  var root = document.documentElement;

  /* the pre-paint script in index.html has already resolved the default, so
     theme.js only ever reads what is on <html> — the two cannot disagree */
  function current() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function apply(mode, remember) {
    if (mode === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    if (remember) { try { localStorage.setItem(KEY, mode); } catch (e) {} }
    paint(mode);
  }

  var sw = null;
  function paint(mode) {
    if (!sw) return;
    var b = sw.querySelectorAll('b');
    b[0].classList.toggle('on', mode === 'light');
    b[1].classList.toggle('on', mode === 'dark');
    sw.setAttribute('aria-label', 'Theme: ' + mode);
  }

  /* ---- build the control into the menu foot ----------------------------- */
  function build() {
    var foot = document.querySelector('.menu-foot');
    if (!foot) return;
    sw = document.createElement('button');
    sw.className = 'theme-sw';
    sw.type = 'button';
    sw.innerHTML = '<i>THEME</i><b>LIGHT</b><b>DARK</b>';
    sw.addEventListener('click', function () {
      apply(current() === 'light' ? 'dark' : 'light', true);
    });
    foot.appendChild(sw);
    paint(current());
  }

  /* ---- T toggles, anywhere except while typing -------------------------- */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === 't' || e.key === 'T') apply(current() === 'light' ? 'dark' : 'light', true);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
