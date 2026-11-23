# Condução · time sheet do facilitador

Página de trabalho de Gino Terentim para conduzir treinamentos: o time sheet de cada encontro, slide a slide, com horário, material, formação, Miro, chat, o que fazer e o que falar; modo condução com relógio; e análise da transcrição da gravação, etapa por etapa, com a API da Anthropic.

## Privacidade

- Este repositório é público e contém **apenas código**. Nenhum dado de cliente fica aqui.
- Os treinamentos ficam no repositório **privado** de dados (padrão: `ginoterentimjr/conducao-dados`). A página lê e grava esses arquivos pela API do GitHub com um token fine-grained que o próprio facilitador informa em **Conexões**.
- O token do GitHub e a chave da Anthropic ficam apenas no `localStorage` do navegador do facilitador. Nada é enviado a outro servidor além de `api.github.com` (dados) e `api.anthropic.com` (análise, quando acionada).
- As imagens dos slides ficam em cache no próprio navegador (Cache Storage). O botão "Remover as credenciais deste navegador" apaga token, chave e cache.

## Estrutura do repositório de dados

```
treinamentos.json                      índice: id, cliente, título, datas
<id>/treinamento.json                  dados do treinamento e dos encontros (agenda, Miro, sala)
<id>/<sessao>.json                     time sheet do encontro: etapas e linhas (uma por slide)
<id>/<sessao>.base.json                linha de base: cópia salva do time sheet, com o horário planejado
<id>/<sessao>.exec.json                execução: ordem, durações, atividades retiradas e incluídas durante o encontro
<id>/slides/<sessao>/sNN.jpg, tNN.jpg  slide em 1600 px e miniatura
<id>/analises/<sessao>-<data>.json     análises das transcrições
<id>/transcricoes/...                  cópia opcional do texto da transcrição
```

Cada linha do time sheet: `n, etapa, dur, desc, material {tipo: entregar|usar, pecas}, formacao (indiv|dupla|grupo), miro, chat, intervalo, momento, tempo[], fazer, usar[], falar, atencao, img, thumb`.

## Novo treinamento

A skill `/timesheet-facilitador` gera o Excel e publica o treinamento: monta o `treino.json` (fora deste repositório, junto do material do cliente), roda `tools/exportar.py treino.json <clone do repositório de dados>` e grava no repositório privado. Os eventos da agenda entram no `treino.json` pelo link de cada encontro.

## Linha de base, execução e comparação

- **Linha de base**: o time sheet planejado. Linhas arrastáveis (ou Alt e as setas na alça), duração e início editáveis, atividades retiradas e restauráveis. O botão Salvar a linha de base grava o time sheet e a cópia `<sessao>.base.json`, que não muda durante a execução. A linha de base pode ser reaberta, alterada e salva de novo.
- **Execução**: começa como cópia da linha de base (a página pede para salvar a linha de base antes, e também antes do modo condução). Durante o encontro, tudo é editável: ordem, início, durações, retirar e incluir atividades; os horários se recalculam, ao lado do horário planejado e do desvio. Grava `<sessao>.exec.json`.
- **Comparação**: planejado e executado por etapa e atividade a atividade, com as atividades movidas, retiradas, incluídas e com duração alterada.
- O modo condução segue a execução quando ela existe.

## Edição pela conversa

`tools/editar.py <clone dos dados> <id> <sessao> <base|exec> <operação>` aplica as mesmas operações da página (ver, inicio, duracao, mover, retirar, restaurar, incluir, iniciar). A exportação de uma nova versão do material (`exportar.py`) regrava só `<sessao>.json` e nunca toca `<sessao>.base.json` nem `<sessao>.exec.json`.

## Tela inicial

Filtro por cliente (treinamentos sem cliente aparecem como Gino Terentim) e exibição em cartões ou em lista; a escolha fica guardada no navegador.

## Radar de editais

A pasta `radar/` publica o painel do radar de editais (`ginoterentimjr.github.io/conducao/radar/`): oportunidades do PNCP aderentes ao portfólio, funil, pendências, resultados e retornos. Usa a mesma conexão desta página (token no navegador) e lê a pasta `radar-editais/` do repositório privado de dados; grava apenas `radar-editais/acompanhamento.json`.
