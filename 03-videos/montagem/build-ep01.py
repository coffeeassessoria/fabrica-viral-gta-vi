#!/usr/bin/env python3
"""Monta o ep01: quadros-chave + movimento de camera + legenda grande + audio."""
import subprocess, sys, wave, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

D = sys.argv[1]            # pasta com k*.png, narr.mp3, music.mp3
OUT = sys.argv[2]
PREVIEW = len(sys.argv) > 3  # modo rapido: so frames de conferencia
W, H, FPS = 1080, 1920, 30
END = 77.3
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
YEL = (255, 222, 33)

# (inicio, imagem, (cx,cy,zoom) inicial, (cx,cy,zoom) final, flash)
SHOTS = [
    (0.00, "k01", (.50, .50, 1.00), (.55, .46, 1.25), 0),
    (1.30, "k01", (.74, .50, 2.10), (.74, .47, 2.45), 1),
    (2.62, "k19", (.50, .50, 1.00), (.50, .46, 1.18), 0),
    (4.62, "k03", (.50, .40, 1.50), (.50, .38, 1.75), 1),
    (5.58, "k01", (.28, .58, 2.30), (.36, .60, 2.30), 0),
    (7.80, "k01", (.14, .76, 2.90), (.20, .75, 2.60), 0),
    (9.90, "k02", (.50, .50, 1.00), (.50, .45, 1.15), 1),
    (11.40, "k02", (.50, .40, 2.00), (.50, .42, 2.25), 0),
    (12.87, "k02", (.50, .52, 1.35), (.50, .50, 1.55), 0),
    (14.60, "k04", (.50, .50, 1.00), (.50, .44, 1.20), 0),
    (18.61, "k03", (.50, .45, 1.10), (.50, .40, 1.40), 1),
    (21.04, "k13", (.50, .50, 1.20), (.50, .50, 1.00), 0),
    (23.54, "k06", (.50, .45, 1.00), (.50, .60, 1.30), 0),
    (27.53, "k07", (.50, .50, 1.00), (.50, .48, 1.25), 0),
    (29.04, "k08", (.50, .45, 1.00), (.50, .42, 1.30), 1),
    (31.28, "k09", (.50, .50, 1.00), (.50, .45, 1.18), 0),
    (34.20, "k10", (.50, .50, 1.20), (.50, .45, 1.00), 0),
    (36.90, "k11", (.50, .50, 1.00), (.50, .48, 1.15), 0),
    (39.33, "k11", (.50, .36, 1.70), (.50, .34, 1.95), 0),
    (42.45, "k12", (.50, .45, 1.00), (.50, .40, 1.30), 1),
    (45.69, "k13", (.50, .40, 1.50), (.50, .45, 1.15), 0),
    (47.60, "k10", (.50, .40, 1.50), (.50, .38, 1.75), 0),
    (49.37, "k14", (.50, .50, 1.00), (.50, .50, 1.20), 0),
    (51.13, "k14", (.50, .50, 1.50), (.50, .50, 1.35), 1),
    (53.00, "k15", (.50, .50, 1.00), (.50, .46, 1.18), 1),
    (56.20, "k15", (.50, .42, 1.50), (.50, .40, 1.70), 0),
    (59.34, "k16", (.50, .50, 1.00), (.50, .46, 1.18), 1),
    (62.80, "k16", (.50, .42, 1.45), (.50, .40, 1.65), 0),
    (66.39, "SPLIT", None, None, 1),
    (71.36, "k17", (.50, .50, 1.00), (.50, .48, 1.30), 1),
    (74.30, "k18", (.50, .42, 1.25), (.50, .40, 1.60), 0),
]

# (inicio, fim, texto) alinhado pelas pausas da narracao; * = destaque amarelo
SEGS = [
    (0.00, 2.48, "MEU CARRO|*TÁ DE NOIVO!"),
    (2.76, 4.35, "SÉRIO.|EMPRESTEI|PRO NANDO|COMPRAR PÃO."),
    (4.76, 5.29, "*PÃO!"),
    (5.58, 9.70, "VOLTOU COM|*FITA BRANCA,|LAÇO NO CAPÔ|E LATA|AMARRADA ATRÁS."),
    (9.98, 11.16, "AÍ O NANDO|APARECE."),
    (11.40, 12.65, "DE GRAVATA|*TORTA."),
    (12.87, 14.28, "E LUVA DE|*MOTORISTA."),
    (14.60, 18.24, "\"CALMA, LIA.|EU SÓ SOU|O MOTORISTA.|*O NOIVO|TÁ LÁ DENTRO.\""),
    (18.61, 19.53, "MOTORISTA."),
    (19.79, 20.81, "*DO MEU CARRO."),
    (21.04, 23.23, "NUM CASAMENTO|QUE EU NEM FUI|*CONVIDADA."),
    (23.54, 27.18, "ABRI A PORTA|PRA ARRANCAR|AQUILO TUDO.|E ACHEI|*O CONVITE|NO BANCO."),
    (27.53, 28.70, "OLHEI O NOME|DA NOIVA."),
    (29.04, 29.67, "*GELEI."),
    (30.00, 31.05, "*É A MINHA EX."),
    (31.28, 36.56, "A MESMA|QUE DIZIA|QUE MEU CARRO|ERA *VELHO DEMAIS|PRA ELA.|AGORA ELA|VAI CASAR|*DENTRO DELE."),
    (36.90, 39.01, "O NANDO|FECHOU A PORTA|DEVAGARINHO."),
    (39.33, 40.17, "\"ENTÃO...\""),
    (40.48, 42.05, "\"ELA PERGUNTOU|*SE VOCÊ VINHA.\""),
    (42.45, 43.10, "PERGUNTOU."),
    (43.44, 44.37, "SE *EU* VINHA."),
    (44.82, 45.43, "*MANO."),
    (45.69, 49.14, "FALTAM|*DEZ MINUTOS|PRO CASAMENTO.|A NOIVA|TÁ ESPERANDO."),
    (49.37, 50.91, "*A CHAVE|TÁ NA MINHA MÃO."),
    (51.13, 52.73, "E EU TENHO|*DUAS OPÇÕES."),
    (53.00, 53.29, "*UM:"),
    (53.56, 58.96, "EU MESMA|*DIRIJO.|LEVO MINHA EX|ATÉ O ALTAR.|E VEJO|A CARA DELA|QUANDO ABRIR|A PORTA."),
    (59.34, 59.98, "*DOIS:"),
    (60.22, 66.07, "*ENTREGO A CHAVE|PRO NANDO.|VIRO AS COSTAS.|E NUNCA|DESCUBRO|POR QUE ELA|ESCOLHEU LOGO|O MEU CARRO."),
    (66.39, 66.98, "E AGORA?"),
    (67.26, 71.14, "*COMENTA|*1 OU 2.|AMANHÃ|EU CONTINUO|COM A OPÇÃO|*MAIS VOTADA."),
    (71.36, 72.59, "SÓ QUE TEM|*UM DETALHE."),
    (72.83, 75.58, "QUANDO VIREI|O CONVITE,|TINHA|*UM RECADO|ATRÁS."),
    (75.89, 77.20, "*PRA MIM."),
]

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
        fr.paste(view("k15", .5, .42, z * punch, W, H // 2), (0, 0))
        fr.paste(view("k16", .5, .42, z * punch, W, H // 2), (0, H // 2))
        d = ImageDraw.Draw(fr)
        d.rectangle((0, H // 2 - 8, W, H // 2 + 8), fill=(0, 0, 0))
        badge(d, "1", 170, 430); badge(d, "2", 170, H // 2 + 430)
    else:
        p = ease(min(lt / (t1 - t0), 1))
        cx, cy, z = (a[n] + (b[n] - a[n]) * p for n in range(3))
        fr = view(k, cx, cy, z * punch)
        d = ImageDraw.Draw(fr)
        if k == "k15": badge(d, "1", 170, 430)
        if k == "k16": badge(d, "2", 170, 430)
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
    if t >= 75.89:
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
for t in (0.0, 29.04, 30.0, 51.13, 71.36, 75.89): add(t, boom())
for t, f in ((53.0, 1320), (59.34, 1568), (67.26, 1760)): add(t, ding(f))
with wave.open(os.path.join(D, "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(sfx, -1, 1) * 32767).astype(np.int16).tobytes())

# ---------- render ----------
mus = ("volume='if(between(t,28.95,31.2),0.03,if(lt(t,2.6),0.30,0.16))':eval=frame,"
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
