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
<id>/slides/<sessao>/sNN.jpg, tNN.jpg  slide em 1600 px e miniatura
<id>/analises/<sessao>-<data>.json     análises das transcrições
<id>/transcricoes/...                  cópia opcional do texto da transcrição
```

Cada linha do time sheet: `n, etapa, dur, desc, material {tipo: entregar|usar, pecas}, formacao (indiv|dupla|grupo), miro, chat, intervalo, momento, tempo[], fazer, usar[], falar, atencao, img, thumb`.

## Novo treinamento

A skill `/timesheet-facilitador` gera o Excel e publica o treinamento: monta o `treino.json` (fora deste repositório, junto do material do cliente), roda `tools/exportar.py treino.json <clone do repositório de dados>` e grava no repositório privado. Os eventos da agenda entram no `treino.json` pelo link de cada encontro.
