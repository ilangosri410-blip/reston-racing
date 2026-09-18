"""Full-experience verification: every chapter at every common desktop size,
asserting the hard requirements rather than eyeballing them."""
import json
from playwright.sync_api import sync_playwright

SIZES = [(1280, 800), (1366, 768), (1600, 900), (1920, 1080), (2560, 1440)]
FAILS, NOTES = [], []

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
                          args=['--autoplay-policy=no-user-gesture-required'])
    for W, H in SIZES:
        pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text)
              if m.type == 'error' and 'favicon' not in m.text else None)
        pg.goto('http://localhost:8300/index.html')
        pg.wait_for_function("document.body.dataset.boot === 'done'", timeout=20000)
        pg.wait_for_timeout(900)

        for i in range(7):
            pg.evaluate(f"document.querySelectorAll('#menuList button')[{i}].click()"
                        if i else "document.getElementById('homeCtl').click()")
            pg.wait_for_timeout(1250)
            r = pg.evaluate("""() => {
              const d=document.documentElement, cur=document.querySelector('.ch.is-current');
              const out=[];
              // any visible element pushing past the viewport edge?
              cur.querySelectorAll('*').forEach(el=>{
                const cs=getComputedStyle(el);
                if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0) return;
                const b=el.getBoundingClientRect();
                if(b.width<2||b.height<2) return;
                if(b.right>d.clientWidth+1.5||b.left<-1.5||b.bottom>d.clientHeight+1.5||b.top<-1.5)
                  out.push((el.className&&el.className.baseVal===undefined?el.className:el.tagName)+
                           ' ['+Math.round(b.left)+','+Math.round(b.top)+','+
                           Math.round(b.right)+','+Math.round(b.bottom)+']');
              });
              return {ch:document.body.dataset.chapter,
                      hScroll:d.scrollWidth>d.clientWidth, vScroll:d.scrollHeight>d.clientHeight,
                      overflow:out.slice(0,4)};
            }""")
            tag = f'{W}x{H} ch{r["ch"]}'
            if r['hScroll']: FAILS.append(tag + ' HORIZONTAL SCROLL')
            if r['vScroll']: FAILS.append(tag + ' VERTICAL SCROLL')
            if r['overflow']: NOTES.append(tag + ' offscreen: ' + '; '.join(r['overflow']))

        vids = pg.evaluate("[...document.querySelectorAll('video')].map(v=>v.readyState)")
        if any(v < 3 for v in vids): FAILS.append(f'{W}x{H} video not buffered: {vids}')
        if errs: FAILS.append(f'{W}x{H} console: {errs[:3]}')
        print(f'  {W}x{H}  checked 7 chapters  videos={vids}')
        pg.close()
    b.close()

print('\n=== FAILURES ===')
print('\n'.join(FAILS) if FAILS else 'none')
print('\n=== OFFSCREEN NOTES ===')
print('\n'.join(NOTES[:14]) if NOTES else 'none')
