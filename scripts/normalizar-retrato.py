"""
Padroniza um retrato para o avatar da arvore. UM padrao para todos, agora e para
cada agente que nascer.

Dois problemas do gerador, e o conserto de cada um:

  1. ESCALA. As vezes ele desenha a figura pequena, as vezes tao grande que os
     ombros encostam na borda. Dentro do avatar redondo a grande parece cortada.
     Conserto: medir a mancha de tinta e reescalar a IMAGEM INTEIRA ate a figura
     ocupar sempre a mesma fracao. Escalar a imagem inteira (e nao um recorte
     colado num fundo chapado) e o que evita a marca de retangulo — o papel em
     volta da figura continua sendo o papel original.

  2. CORTE RETO NA BASE. Ele termina o busto numa linha reta.
     Conserto: desvanecer a base ate a cor do papel, e o busto acaba em nada.

O que sobra de fundo depois de reescalar e preenchido esticando a propria borda
do desenho, entao a emenda cai longe do rosto e fica fora do circulo.

    python scripts/normalizar-retrato.py <arquivo.png> [outro.png ...]

O original fica em portraits/raw/, entao da para reprocessar tudo a vontade.
"""
import os
import sys

from PIL import Image

LARGURA_WEB = 512      # o site mostra circulos de 96px: 2048 e desperdicio de banda
ALTURA_FIGURA = 0.72   # quanto da altura a figura deve ocupar, sempre
MARGEM_TOPO = 0.12     # papel acima da cabeca
FADE_INICIO = 0.70     # onde o desenho comeca a sumir
FADE_FIM = 0.97        # onde ja e so papel


def cor_do_papel(im):
    """Mediana da faixa de cima: e papel limpo em todo retrato deste padrao."""
    faixa = im.crop((0, 0, im.width, max(4, im.height // 40)))
    pixels = sorted(faixa.getdata(), key=lambda p: p[0] + p[1] + p[2])
    return pixels[len(pixels) // 2]


def caixa_da_tinta(im, papel):
    limite = sum(papel) / 3 - 30
    mascara = im.convert('L').point(lambda v: 255 if v < limite else 0)
    return mascara.getbbox()


def estender_bordas(canvas, ox, oy, w, h):
    """Preenche o que sobrou esticando a borda do proprio desenho."""
    lado = canvas.width
    if ox > 0:
        canvas.paste(canvas.crop((ox, oy, ox + 1, oy + h)).resize((ox, h)), (0, oy))
    if ox + w < lado:
        faixa = canvas.crop((ox + w - 1, oy, ox + w, oy + h)).resize((lado - ox - w, h))
        canvas.paste(faixa, (ox + w, oy))
    if oy > 0:
        canvas.paste(canvas.crop((0, oy, lado, oy + 1)).resize((lado, oy)), (0, 0))
    if oy + h < lado:
        faixa = canvas.crop((0, oy + h - 1, lado, oy + h)).resize((lado, lado - oy - h))
        canvas.paste(faixa, (0, oy + h))


def normalizar(caminho):
    bruto = os.path.join(os.path.dirname(caminho), 'raw', os.path.basename(caminho))
    fonte = bruto if os.path.exists(bruto) else caminho
    im = Image.open(fonte).convert('RGB')
    lado = min(im.size)
    papel = cor_do_papel(im)
    caixa = caixa_da_tinta(im, papel)
    if not caixa:
        print('sem desenho para normalizar:', os.path.basename(caminho))
        return

    # 1) escala: a figura passa a ocupar sempre a mesma fracao da altura
    alvo = lado * ALTURA_FIGURA
    escala = alvo / (caixa[3] - caixa[1])
    escala = max(0.45, min(1.6, escala))
    novo = (max(1, round(im.width * escala)), max(1, round(im.height * escala)))
    escalado = im.resize(novo, Image.LANCZOS)

    # onde a figura caiu depois de escalar, e para onde ela deve ir
    cx = (caixa[0] + caixa[2]) / 2 * escala
    topo = caixa[1] * escala
    ox = round(lado / 2 - cx)
    oy = round(lado * MARGEM_TOPO - topo)

    canvas = Image.new('RGB', (lado, lado), papel)
    canvas.paste(escalado, (ox, oy))
    estender_bordas(canvas, max(0, ox), max(0, oy),
                    min(novo[0], lado - max(0, ox)), min(novo[1], lado - max(0, oy)))

    # 2) a base some no papel: sem linha de corte dentro do circulo
    veu = Image.new('RGB', (lado, lado), papel)
    faixa = Image.new('L', (1, lado))
    px = faixa.load()
    inicio, fim = int(lado * FADE_INICIO), int(lado * FADE_FIM)
    for y in range(lado):
        if y <= inicio:
            px[0, y] = 0
        elif y >= fim:
            px[0, y] = 255
        else:
            t = (y - inicio) / (fim - inicio)
            px[0, y] = int(255 * t * t * (3 - 2 * t))
    pronto = Image.composite(veu, canvas, faixa.resize((lado, lado)))

    if not os.path.exists(bruto):
        os.makedirs(os.path.dirname(bruto), exist_ok=True)
        im.save(bruto)
    if pronto.width > LARGURA_WEB:
        pronto = pronto.resize((LARGURA_WEB, LARGURA_WEB), Image.LANCZOS)
    pronto.save(caminho, optimize=True)
    kb = os.path.getsize(caminho) // 1024
    print('padronizado: %s (escala %.2f, %d KB)' % (os.path.basename(caminho), escala, kb))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    for arq in sys.argv[1:]:
        normalizar(arq)
