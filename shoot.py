import sys, json
from playwright.sync_api import sync_playwright

W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1600, 900)
TAG = sys.argv[3] if len(sys.argv) > 3 else ''
OUT = '/home/claude/rr/_shots/'

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
                          args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
    errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.goto('http://localhost:8300/index.html')

    pg.wait_for_timeout(600)
    pg.screenshot(path=OUT + f'boot{TAG}.png')

    pg.wait_for_function("document.body.dataset.boot === 'done'", timeout=15000)
    pg.wait_for_timeout(1400)
    pg.screenshot(path=OUT + f'ch0{TAG}.png')

    for i in range(1, 7):
        pg.evaluate(f"document.querySelectorAll('.topnav a')[{i}].click()")
        pg.wait_for_timeout(1500)
        pg.screenshot(path=OUT + f'ch{i}{TAG}.png')

    # menu open, over the last chapter
    pg.evaluate("document.getElementById('menuBtn').click()")
    pg.wait_for_timeout(1000)
    pg.screenshot(path=OUT + f'menu{TAG}.png')
    pg.evaluate("document.getElementById('menuBtn').click()")
    pg.wait_for_timeout(700)

    # brochure reader
    pg.evaluate("document.querySelector('[data-brochure]').click()")
    pg.wait_for_timeout(1600)
    pg.screenshot(path=OUT + f'reader{TAG}.png')
    pg.evaluate("document.getElementById('readerClose').click()")
    pg.wait_for_timeout(500)

    # mid-transition frame, to check the veil
    pg.evaluate("document.querySelectorAll('.topnav a')[0].click()")
    pg.wait_for_timeout(1400)
    pg.evaluate("document.querySelectorAll('.topnav a')[1].click()")
    pg.wait_for_timeout(330)
    pg.screenshot(path=OUT + f'veil{TAG}.png')
    pg.wait_for_timeout(1200)

    diag = pg.evaluate("""() => {
      const d=document.documentElement, vids=[...document.querySelectorAll('video')];
      return {
        scrollW:d.scrollWidth, clientW:d.clientWidth,
        scrollH:d.scrollHeight, clientH:d.clientHeight,
        u:getComputedStyle(d).getPropertyValue('--u').trim(),
        chapter:document.body.dataset.chapter,
        videos:vids.map(v=>({k:v.dataset.key,rs:v.readyState,paused:v.paused,w:v.videoWidth}))
      };
    }""")
    print(json.dumps({'viewport': [W, H], 'diag': diag, 'console_errors': errs[:12]}, indent=1))
    b.close()
