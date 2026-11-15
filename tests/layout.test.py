import sys,os,threading,http.server,functools
from playwright.sync_api import sync_playwright
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h=functools.partial(http.server.SimpleHTTPRequestHandler,directory=root)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(*a):pass
srv=http.server.ThreadingHTTPServer(("127.0.0.1",0),lambda *a,**k:Q(*a,directory=root,**k))
threading.Thread(target=srv.serve_forever,daemon=True).start()
url=f"http://127.0.0.1:{srv.server_address[1]}/index.html"
fails=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,w,hh in [("mobile",360,740),("tablet",820,1100),("desktop",1366,800)]:
        pg=b.new_page(viewport={"width":w,"height":hh});errs=[];ext=[]
        pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.on("request",lambda r:ext.append(r.url) if not r.url.startswith("http://127.0.0.1") else None)
        pg.goto(url);pg.wait_for_selector("#statsMount .stat")
        sw=pg.evaluate("document.documentElement.scrollWidth")
        if sw>w:fails.append(f"{name} overflow {sw}>{w}")
        t=pg.inner_text("#statsMount")
        if "not connected" not in t.lower() or "N/A" not in t:fails.append(name+" stats text")
        if pg.evaluate("[...document.images].some(i=>!i.complete||i.naturalWidth==0)"):fails.append(name+" broken image")
        if errs:fails.append(f"{name} js errors {errs}")
        if ext:fails.append(f"{name} external requests {ext}")
        if "#get"!=pg.get_attribute("[data-app-cta]","href"):fails.append("cta")
        if w<860:
            pg.click("#navBtn");
            if not pg.is_visible("#nav a[href='#roles']"):fails.append("menu not opening")
        pg.screenshot(path=os.path.join(root,"tests",f"shot-{name}.png"),full_page=True)
        pg.close()
    b.close()
print("FAIL:"+str(fails) if fails else "layout tests passed");sys.exit(1 if fails else 0)
