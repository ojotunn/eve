"""
O rosto de um filho, feito a partir da cara dos dois pais, sem API nenhuma.

POR QUE ISTO EXISTE: o desenho de cada recem-nascido vem do Gemini, mas a chave
pode estar sem cota (429) justamente no dia do lancamento. Quando isso acontece,
ninguem pode ficar sem rosto na arvore. Esta mistura e instantanea, de graca, e
conceitualmente e o que deveria ser: a cara do filho E a dos pais somada.

So funciona porque os retratos ja passaram por normalizar-retrato.py: como todos
tem o mesmo enquadramento e a mesma escala, a soma da uma pessoa plausivel em vez
de uma sobreposicao fantasma.

    python scripts/misturar-rostos.py <mae.png> <pai.png> <saida.png> [semente]
"""
import hashlib
import os
import random
import sys

from PIL import Image, ImageEnhance

LADO = 512


def carregar(caminho):
    im = Image.open(caminho).convert('RGB')
    if im.width != im.height:
        lado = min(im.size)
        im = im.crop(((im.width - lado) // 2, (im.height - lado) // 2,
                      (im.width + lado) // 2, (im.height + lado) // 2))
    return im.resize((LADO, LADO), Image.LANCZOS)


# NAO deslocar, NAO espelhar, NAO dar zoom: qualquer desalinhamento entre os dois
# rostos vira vulto duplo. A unica variacao que preserva a nitidez e o PESO —
# de quem o filho puxou mais — e um toque de contraste.


def misturar(mae, pai, saida, semente=None):
    s = semente or os.path.basename(saida)
    r = random.Random(int(hashlib.sha1(str(s).encode()).hexdigest()[:8], 16))

    a, b = carregar(mae), carregar(pai)
    peso = r.uniform(0.3, 0.7)            # de quem ele puxou mais
    filho = Image.blend(a, b, peso)

    # a mistura achata o contraste; o traco de gravura precisa dele de volta
    filho = ImageEnhance.Contrast(filho).enhance(r.uniform(1.15, 1.3))
    filho = ImageEnhance.Brightness(filho).enhance(r.uniform(0.99, 1.05))
    filho.save(saida, optimize=True)
    print('misturado: %s (peso %.2f)' % (os.path.basename(saida), peso))


if __name__ == '__main__':
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    misturar(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
