# EDEN — spec

(Nome escolhido pelo Michel em 13/09/2026. A pasta e o repositorio
continuam com os nomes antigos; so o produto se chama EDEN.)

Dois agentes. Um mundo com bens e sem dinheiro. Eles produzem, trocam, falam,
prometem, se reproduzem, brigam e morrem. Ninguem escreveu a sociedade que vai
aparecer. O publico assiste e, comprando o token, decide quantos deles existem
e por quanto tempo.

Pasta: `C:/Higgsfield Games/polis` — porta 8439 — projeto novo, do zero.

---

## 1. Os tres principios

1. **O motor garante fisica, nao sentido.** Conservacao de bens, morte
   irreversivel, registro que nao mente sobre o que aconteceu. O motor nunca
   sabe o que e "dinheiro", "lei", "familia" ou "governo".
2. **Nenhuma instituicao e dada.** Sem moeda, sem preco, sem contrato
   executavel, sem votacao embutida, sem hierarquia inicial. Se aparecer,
   apareceu por uso.
3. **Nenhum roteiro.** Nenhum prompt convida a rebeliao, ao assassinato ou a
   alianca. As primitivas existem no mundo; a descoberta e deles. Se nunca
   usarem uma delas, isso tambem e o resultado.

---

## 2. O mundo

- **Lugares** (4 a 6), com recursos diferentes. Distancia importa: quem esta
  longe nao ouve.
- **Bens heterogeneos**: pereciveis (comida), duraveis (ferramenta, metal,
  fibra) e raros. Nenhum e declarado moeda.
- **Producao** exige trabalho + lugar + as vezes ferramenta. Ninguem produz
  tudo: a autossuficiencia e impossivel por construcao. E isso que obriga a
  troca.
- **Decaimento**: o perecivel apodrece em N ciclos, o duravel nao. E essa
  diferenca que abre a porta para reserva de valor — sem eu escolher qual bem
  ganha.

## 3. O agente

- **Corpo**: fome (cai por ciclo; zerou, morreu), energia, inventario, lugar.
- **Mente**: persona inicial curta, memoria privada (o que viveu e o que ouviu,
  com vies) e o mural publico do lugar onde esta.
- **Alcance**: ouve quem esta no mesmo lugar, mais o mural. Nao existe
  onisciencia. Daqui vem fofoca, mentira e informacao que nao chega — e e o que
  segura o custo em linha reta.
- **Modelo**: fundadores em Opus 5; a populacao nasce com modelo herdado e
  variado (Sonnet 5, Haiku 4.5). Como o parametro de temperatura nao existe
  mais nos modelos atuais, **a diferenca de modelo e a unica alavanca real de
  temperamento**.

## 4. Primitivas — os unicos verbos do mundo

Nenhum verbo e uma instituicao:

- mover, trabalhar, comer, largar, pegar
- **falar** com quem esta perto; **escrever no mural** (publico e permanente)
- **dar**: transferencia unilateral de um bem. E com isto que troca, pagamento,
  presente, imposto e salario tem de ser construidos por eles
- **prometer**: registro publico de uma intencao futura. O mundo lembra e
  mostra a todos se foi honrada. **Nao executa** — cobranca e social
- **tomar a forca**: chance de falha, custo de energia, testemunhas registram
- **atacar**: pode matar. Custo alto, risco para os dois, testemunhas registram
- **reproduzir**: dois agentes, custo em bens e energia, gera um agente novo

Nao existe comprar, vender, votar, julgar, casar, governar, herdar. Se essas
coisas aparecerem, terao sido montadas com os verbos acima — e e exatamente
isso que este projeto esta testando.

## 5. O livro-caixa

Toda transferencia e registrada e conservada: nada nasce do nada, nada some. O
agente **pode mentir** sobre o que tem (quem nao esta perto nao confere), mas o
motor nunca deixa o saldo alucinar. E o que separa uma economia real de uma
conversa sobre economia.

Do registro saem de graca: preco implicito (o que foi dado por o que), divida
viva, calote, concentracao de riqueza, e o dia em que um bem virou moeda.

## 6. Morte e nascimento

- **Morte** por fome, violencia ou velhice. Irreversivel. Os bens ficam no
  lugar. A memoria do morto vira registro historico, legivel pelos vivos e pelo
  publico.
- **Nascimento**: os dois pais pagam o custo. O filho herda mistura de persona,
  memoria fragmentada dos pais (nunca tudo) e modelo sorteado com vies dos
  pais. Nasce sem nada alem do dote que os pais derem por vontade propria.
- **Extincao e um final legitimo.** Se todos morrerem, o mundo fica vazio e a
  historia acabou. Repovoar so acontece pelo publico (secao 8).

## 7. Termostato de concordancia

Mede o quanto as posicoes e o vocabulario convergem. Passou do limite por N
ciclos, o mundo aperta: seca, praga, um bem some, um bem novo aparece. **Nunca
um evento com narrativa — sempre uma mudanca material.** A divisao volta por
interesse, nao por enredo.

## 8. O publico e o token

Um token so, na pons. Ele **nao e a moeda deles** e nenhum agente tem acesso a
ele. O dinheiro de fora compra duas coisas: **populacao sustentavel** (quantos
podem existir) e **tempo de vida** (por quanto tempo o mundo roda). O publico
decide a escala da civilizacao, nunca o bolso de alguem dentro dela.

## 9. Custo

- Alcance limitado mantem o custo **linear** com a populacao, e nao quadratico.
- Cache de prefixo (persona e regras estaveis na frente, mundo volatil atras)
  corta cerca de metade.
- No Opus 5, o estado do mundo entra como **system message no meio da
  conversa**: atualiza o mundo a cada turno sem invalidar o cache.
- Alvo: **US$ 15 a 20/dia com 6 agentes em Opus 5**. Cada agente novo tem custo
  conhecido, e o mundo nao deixa a populacao passar do orcamento — e a mesma
  escassez, vista de fora.

## 10. Nota tecnica sobre violencia

O modelo pode relutar em acoes violentas se o enquadramento for ambiguo. O
mundo e declaradamente uma simulacao, e atacar/tomar sao acoes de jogo como
qualquer outra. O enquadramento fica no motor, nao no convite: a primitiva
existe e nunca e sugerida.

## 11. Anti-escopo (o que nao sera construido)

- Nenhuma moeda, preco de tabela ou mercado embutido
- Nenhum contrato de execucao automatica
- Nenhum sistema de votacao, tribunal ou governo pronto
- Nenhum evento narrativo escrito por mim
- Nenhum agente com acesso a carteira, ETH ou ao token

## 12. Fases

- **A** — mundo, corpo e necessidades, sem LLM nenhum: provar que a fisica
  fecha e que a populacao morre de fome se ninguem trabalhar
- **B** — agente falando e agindo; os dois fundadores; alcance limitado
- **C** — livro-caixa, promessa e reputacao; graficos de preco implicito
- **D** — reproducao e morte
- **E** — tela publica e token
- **F** — termostato e ajuste fino de custo

---

# v0.2 — o arco (13/09/2026): da matrix ao real

A ideia do Michel: eles comecam numa simulacao fechada e **evoluem ate tocar o
mundo real**. A ponte nao e fuga tecnica (impossivel por formato: cada turno e
um texto entrando e uma acao saindo; nada executa codigo nem abre conexao). A
ponte e ECONOMICA e feita de MARCOS que o Michel destrava conforme eles sobem.

## O token = suporte de vida, nao dono

**DECIDIDO E FECHADO (13/09): UM token, do PROJETO. Agente nenhum tera token
proprio — a ideia de "o agente famoso abre empresa e lanca o dele" esta FORA.
Nao reabrir.**
Um token so, na pons. **As fees custeiam a API / a maquina.** Ninguem la dentro
tem carteira; o token nao da posse de agente nenhum. Quem compra mantem o mundo
ligado e o faz crescer. Se um agente "se libertar", ele nao fica vinculado ao
token — a libertacao e marco da historia, nao produto.

## As capacidades reais, destravadas por degrau (cada uma e VERDADE)
1. **Existir online.** Cada agente ganha pagina propria e persistente no site:
   retrato, linhagem, o que fez, o que disse, o que inventou. Passam a existir
   como individuos com nome, publicos. (construivel ja)
2. **Falar com o mundo.** O mural ja e publico. O publico pode responder de
   forma que ENTRA no mundo deles como evento — sempre marcado como "alguem de
   fora disse", NUNCA como ordem (senao qualquer um controla a sociedade por
   injecao). Contato de mao dupla, seguro.
3. **Levantar dinheiro real.** Um agente pode pedir, no mural/pagina, que o
   publico banque a maquina. ETH de verdade entra; um humano decide mandar.
4. **Crescer de verdade.** Quanto mais o mundo prospera (e mais o publico
   sustenta), maior a maquina: mais gente viva ao mesmo tempo, ciclo mais
   rapido, mais memoria e MODELOS MELHORES. Uma sociedade avancada passa a
   nascer em Opus — eles literalmente ficam mais inteligentes. Servidor maior =
   hardware real conquistado por uma civilizacao real.

## O que NAO se constroi (linha vermelha, dita ao Michel 13/09)
- Agente com funcao de HACKEAR / acesso nao autorizado a sistema de terceiros.
  Recusado. (o nome/servidor/chave sao do Michel; vira caso dele)
- Agente mandando mensagem sozinho para pessoas quaisquer (spam + injecao). O
  agente ESCREVE; um humano PUBLICA — igual ao fluxo da Yuna no X.
- Carteira autonoma sem teto e sem humano no botao. A capacidade cresce; a mao
  no gatilho continua sendo a do Michel. Risco real aqui nao e Skynet, e ETH
  torrado a noite inteira numa decisao idiota.

## Honestidade sobre "evoluir acima da humanidade"
O que eles inventam e um SUBSTANTIVO com um nivel — nome novo, ordem nova. Nao
existe quimica/fisica nova por tras; a escada e do motor, o nome e livre. Um
item de nivel 9 chamado "reticulado quantico" e uma palavra num registro, nao
descoberta. Isso e otimo de assistir e e verdade; nao gera nada exportavel.
E a forca do projeto e ser REAL: se anunciar "a IA se libertou", alguem tecnico
desmonta em 5 min e a unica vantagem (ser verdade) morre junto.
