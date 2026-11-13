#!/usr/bin/env python3
"""Monta o ep01: quadros-chave + movimento de camera + legenda grande + audio."""
import subprocess, sys, wave, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

D = sys.argv[1]            # pasta com k*.png, narr.mp3, music.mp3
OUT = sys.argv[2]
PREVIEW = len(sys.argv) > 3  # modo rapido: so frames de conferencia
W, H, FPS = 1080, 1920, 30
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
YEL = (255, 222, 33)

import runpy
CFG = runpy.run_path(os.path.join(D, 'config.py'))
SHOTS, SEGS, END = CFG['SHOTS'], CFG['SEGS'], CFG['END']
BADGE = CFG.get('BADGE', {})
SPLIT = CFG.get('SPLIT')
BOOMS, DINGS, DUCK = CFG.get('BOOMS', []), CFG.get('DINGS', []), CFG.get('DUCK', (0, 0))
FINAL_T = CFG.get('FINAL_T', END)

def chunks():
    out = []
    for a, b, txt in SEGS:
        parts = txt.split("|")
        tot = sum(len(p) + 3 for p in parts)
        t = a
        for i, p in enumerate(parts):
            d = (b - a) * (len(p) + 3) / tot
            hi = p.startswith("*")
            out.append((t, t + d if i < len(parts) - 1 else b + 0.12, p.replace("*", ""), hi))
            t += d
    return out
CH = chunks()

imgs = {}
def img(k):
    if k not in imgs:
        im = Image.open(os.path.join(D, k + ".png")).convert("RGB")
        w, h = im.size  # garante 9:16 por corte central
        if w * 16 > h * 9:
            nw = h * 9 // 16; im = im.crop(((w - nw) // 2, 0, (w + nw) // 2, h))
        else:
            nh = w * 16 // 9; im = im.crop((0, (h - nh) // 2, w, (h + nh) // 2))
        imgs[k] = im
    return imgs[k]

clipc = {}
def clip(k):
    if k not in clipc:
        clipc.clear()
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(D, k + ".mp4"), "-vf", "fps=30,scale=720:1280",
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE).stdout
        clipc[k] = np.frombuffer(raw, np.uint8).reshape(-1, 1280, 720, 3)
    return clipc[k]

def clipview(k, lt, dur, cx, cy, z, w=W, h=H):
    name, _, off = k.partition("@")
    fr = clip(name); n = len(fr); off = float(off or 0)
    rate = min(1.0, max(0.6, (n / 30 - off) / dur))
    im = Image.fromarray(fr[min(n - 1, int((off + lt * rate) * 30))])
    vw, vh = 720 / z, 720 / z * h / w
    if vh > 1280: vh = 1280; vw = 1280 * w / h
    x0 = min(max(cx * 720 - vw / 2, 0), 720 - vw); y0 = min(max(cy * 1280 - vh / 2, 0), 1280 - vh)
    return im.resize((w, h), Image.BICUBIC, box=(x0, y0, x0 + vw, y0 + vh))

def anyview(k, lt, dur, cx, cy, z, w=W, h=H):
    return clipview(k, lt, dur, cx, cy, z, w, h) if k.startswith("c") else view(k, cx, cy, z, w, h)

def ease(x): return 1 - (1 - x) ** 2

def view(k, cx, cy, z, w=W, h=H):
    im = img(k); iw, ih = im.size
    vw, vh = iw / z, iw / z * h / w
    if vh > ih: vh = ih; vw = ih * w / h
    x0 = min(max(cx * iw - vw / 2, 0), iw - vw)
    y0 = min(max(cy * ih - vh / 2, 0), ih - vh)
    return im.resize((w, h), Image.BICUBIC, box=(x0, y0, x0 + vw, y0 + vh))

_f = {}
def font(s):
    if s not in _f: _f[s] = ImageFont.truetype(FONT, s)
    return _f[s]

def text(d, s, cy, size, fill=(255, 255, 255), stroke=12, maxw=980):
    while size > 40 and d.textlength(s, font=font(size)) > maxw: size -= 4
    f = font(size)
    d.text((W / 2, cy), s, font=f, fill=fill, anchor="mm", stroke_width=stroke, stroke_fill=(0, 0, 0))

def badge(d, s, cx, cy, r=120):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=YEL, outline=(0, 0, 0), width=10)
    d.text((cx, cy), s, font=font(int(r * 1.5)), fill=(0, 0, 0), anchor="mm")

def frame(t):
    i = max(j for j, s in enumerate(SHOTS) if s[0] <= t)
    t0, k, a, b, fl = SHOTS[i]
    t1 = SHOTS[i + 1][0] if i + 1 < len(SHOTS) else END
    lt = t - t0
    punch = 1 + 0.07 * max(0, 1 - lt / 0.15)
    if k == "SPLIT":
        z = 1.25 + 0.10 * lt / (t1 - t0)
        fr = Image.new("RGB", (W, H))
        fr.paste(anyview(SPLIT[0], lt, t1 - t0, .5, .42, z * punch, W, H // 2), (0, 0))
        fr.paste(anyview(SPLIT[1], lt, t1 - t0, .5, .42, z * punch, W, H // 2), (0, H // 2))
        d = ImageDraw.Draw(fr)
        d.rectangle((0, H // 2 - 8, W, H // 2 + 8), fill=(0, 0, 0))
        badge(d, "1", 170, 430); badge(d, "2", 170, H // 2 + 430)
    else:
        p = ease(min(lt / (t1 - t0), 1))
        cx, cy, z = (a[n] + (b[n] - a[n]) * p for n in range(3))
        fr = anyview(k, lt, t1 - t0, cx, cy, z * punch)
        d = ImageDraw.Draw(fr)
        if k.partition("@")[0] in BADGE: badge(d, BADGE[k.partition("@")[0]], 170, 430)
    if fl and lt < 0.10:
        fr = Image.blend(fr, Image.new("RGB", (W, H), (255, 255, 255)), 0.55 * (1 - lt / 0.10))
        d = ImageDraw.Draw(fr)
    # selo de transparencia
    d.text((W / 2, 150), "FICÇÃO ORIGINAL • IMAGENS GERADAS POR IA", font=font(30), fill=(255, 255, 255),
           anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
    # legenda grande
    for a_, b_, s, hi in CH:
        if a_ <= t < b_:
            pop = 1 + 0.18 * max(0, 1 - (t - a_) / 0.08)
            text(d, s, 1290, int((128 if hi else 112) * pop), YEL if hi else (255, 255, 255))
            break
    if t >= FINAL_T:
        text(d, "CONTINUA AMANHÃ", 1500, 70, (255, 255, 255), 8)
    # barra de progresso
    d.rectangle((0, H - 14, int(W * t / END), H), fill=YEL)
    return fr

if PREVIEW:
    for t in [float(x) for x in sys.argv[3].split(",")]:
        frame(t).resize((360, 640)).save(os.path.join(D, f"pv_{t:05.1f}.jpg"), quality=80)
    sys.exit()

# ---------- efeitos sonoros sintetizados ----------
SR = 44100
sfx = np.zeros(int(END * SR) + SR, dtype=np.float32)
rng = np.random.default_rng(7)
def add(t, x):
    i = int(t * SR); sfx[i:i + len(x)] += x[:len(sfx) - i]
def whoosh(dur=0.28):
    n = int(dur * SR); x = rng.standard_normal(n).astype(np.float32)
    x = np.convolve(x, np.ones(24) / 24, "same"); env = np.sin(np.linspace(0, np.pi, n)) ** 2
    return x * env * 0.5
def boom(dur=0.9, f=55):
    tt = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * f * tt * (1 - 0.3 * tt)) * np.exp(-4 * tt) * 0.9).astype(np.float32)
def ding(f=1320, dur=0.6):
    tt = np.arange(int(dur * SR)) / SR
    return ((np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2 * tt)) * np.exp(-7 * tt) * 0.35).astype(np.float32)
for s in SHOTS[1:]:
    add(s[0] - 0.10, whoosh())
for t in BOOMS: add(t, boom())
for t, f in DINGS: add(t, ding(f))
with wave.open(os.path.join(D, "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(sfx, -1, 1) * 32767).astype(np.int16).tobytes())

# ---------- render ----------
mus = (f"volume='if(between(t,{DUCK[0]},{DUCK[1]}),0.03,if(lt(t,2.6),0.30,0.16))':eval=frame,"
       f"afade=t=out:st={END - 1.2}:d=1.2")
cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
       "-i", os.path.join(D, "narr.mp3"), "-i", os.path.join(D, "music.mp3"), "-i", os.path.join(D, "sfx.wav"),
       "-filter_complex", f"[1:a]volume=1.6[n];[2:a]{mus}[m];[3:a]volume=0.5[s];"
       "[n][m][s]amix=inputs=3:normalize=0,alimiter=limit=0.95[a]",
       "-map", "0:v", "-map", "[a]", "-t", str(END), "-c:v", "libx264", "-preset", "medium", "-crf", "19",
       "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", OUT]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for n in range(int(END * FPS)):
    p.stdin.write(frame(n / FPS).tobytes())
p.stdin.close(); sys.exit(p.wait())
