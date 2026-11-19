"""Exporta um treinamento para o repositório privado de dados da página de condução.

Uso:
    python3 exportar.py treino.json <pasta do repositório de dados>

treino.json (fica fora deste repositório público, junto do material do cliente):
{
  "id": "cliente-2026-tema",
  "cliente": "...", "area": "...", "titulo": "...", "formato": "...",
  "participantes": 30, "carga": "...", "versao_material": "29",
  "pasta_dropbox": "...", "link_sala": "...",
  "sessoes": [
    {"id": "aula1", "titulo": "Aula 1 · ...", "data": "2026-11-17", "inicio": "15:00", "fim": "18:00",
     "agenda": "<link do evento>", "miro": "<link do quadro>",
     "pptx": "deck.pptx", "pdf": "deck.pdf", "timesheet": "time-sheet.xlsx",
     "extras": "extras.json"}   # opcional: {"9": {"formacao": "grupo", "miro": true, "chat": true}}
  ]
}

Lê as notas do deck (FAZER, TEMPO, USAR, momento 4C, FALAR, ATENÇÃO), o time sheet em Excel
gerado pela skill timesheet-facilitador (etapa, duração, descrição, material) e o PDF do deck
(imagens dos slides). Grava <id>/treinamento.json, <id>/<sessao>.json, <id>/slides/<sessao>/
e atualiza treinamentos.json.
"""
import sys, os, re, json, glob, shutil, subprocess, datetime
from pptx import Presentation
from openpyxl import load_workbook
from PIL import Image

CHAT_RE = re.compile(r"(enviar|envie|colar|cole|escrevam|escrever|escreva|respondam|responder|responda|pergunta)[^.]{0,50}\bchat\b", re.I)


def notas(txt):
    cima, _, baixo = txt.partition("─" * 44)
    cima = cima.replace("FAZER\n", "", 1)
    tempo, usar, fazer, momento, modo = [], [], [], "", None
    for l in cima.split("\n"):
        s = l.strip()
        if s.startswith("TEMPO ·"): modo = "tempo"; continue
        if s == "USAR": modo = "usar"; continue
        if re.match(r"^C[1-4] · ", s): momento = s; modo = None; continue
        if modo == "tempo" and s.startswith("• "): tempo.append(s[2:]); continue
        if modo == "usar" and s.startswith("• "): usar.append(s[2:]); continue
        if s == "": modo = None if modo == "tempo" else modo; fazer.append(""); continue
        modo = None; fazer.append(l)
    falar, _, atencao = baixo.partition("\nATENÇÃO\n")
    falar = falar.replace("\nFALAR\n", "", 1).replace("FALAR\n", "", 1).strip()
    return dict(tempo=tempo, usar=usar, fazer=re.sub(r"\n{3,}", "\n\n", "\n".join(fazer)).strip(),
                momento=momento, falar=falar, atencao=atencao.strip())


def formacao(desc, fazer):
    """Formação pela descrição do slide e pela instrução de abrir salas; o extras.json corrige o que faltar."""
    d, f = desc.lower(), fazer.lower()
    if "individual" in d: return "indiv"
    if "dupla" in d: return "dupla"
    if re.search(r"\b(salas?|grupos?)\b", d) or "abrir as salas" in f: return "grupo"
    return None


def ler_timesheet(xlsx):
    ws = load_workbook(xlsx, data_only=True)["Time sheet"]
    linhas = []
    for r in ws.iter_rows(min_row=8):
        if not isinstance(r[0].value, int): break
        mat = None
        g = (r[6].value or "").strip()
        if g:
            partes = [p for p in g.split("\n") if p.strip()]
            mat = {"tipo": partes[0].strip().lower(), "pecas": [p.strip() for p in partes[1:]]}
        linhas.append({"n": r[0].value, "etapa": r[2].value or "", "dur": int(r[4].value or 0), "desc": r[7].value or "", "material": mat})
    produtos = {}
    if "Etapas" in load_workbook(xlsx, data_only=True).sheetnames:
        e = load_workbook(xlsx, data_only=True)["Etapas"]
        for r in e.iter_rows(min_row=2):
            if r[0].value and r[0].value != "Total": produtos[r[0].value] = r[4].value or ""
    return linhas, produtos


def exportar(treino_json, saida):
    T = json.load(open(treino_json)); base_cfg = os.path.dirname(os.path.abspath(treino_json))
    rel = lambda p: p if os.path.isabs(p) else os.path.join(base_cfg, p)
    tid = T["id"]; base = os.path.join(saida, tid)
    for sess in T["sessoes"]:
        a = sess["id"]
        p = Presentation(rel(sess["pptx"]))
        ts, produtos = ler_timesheet(rel(sess["timesheet"]))
        assert len(ts) == len(p.slides), (a, len(ts), len(p.slides))
        extras = json.load(open(rel(sess["extras"]))) if sess.get("extras") else {}
        dsl = os.path.join(base, "slides", a); os.makedirs(dsl, exist_ok=True)
        tmp = f"/tmp/exportar_{a}"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
        subprocess.run(["pdftoppm", "-r", "120", "-png", rel(sess["pdf"]), tmp + "/p"], check=True)
        pngs = sorted(glob.glob(tmp + "/p-*.png")); assert len(pngs) == len(ts)
        linhas, etapas = [], []
        for i, (t, s, png) in enumerate(zip(ts, p.slides, pngs), 1):
            im = Image.open(png).convert("RGB")
            im.resize((1600, int(1600 * im.height / im.width))).save(f"{dsl}/s{i:02d}.jpg", quality=84, optimize=True)
            im.resize((360, int(360 * im.height / im.width))).save(f"{dsl}/t{i:02d}.jpg", quality=78, optimize=True)
            nt = notas(s.notes_slide.notes_text_frame.text)
            if not etapas or etapas[-1]["nome"] != t["etapa"]:
                etapas.append({"nome": t["etapa"], "produto": produtos.get(t["etapa"], "")})
            pecas = " ".join((t["material"] or {}).get("pecas", []) + nt["usar"])
            x = {"n": i, "etapa": t["etapa"], "dur": t["dur"], "desc": t["desc"], "titulo": "", "tipo": "",
                 "material": t["material"], "formacao": formacao(t["desc"], nt["fazer"]),
                 "miro": "Miro" in pecas, "chat": bool(CHAT_RE.search(nt["fazer"])),
                 "intervalo": t["etapa"].startswith("Intervalo"), **{k: nt[k] for k in ("momento", "tempo", "fazer", "usar", "falar", "atencao")},
                 "img": f"slides/{a}/s{i:02d}.jpg", "thumb": f"slides/{a}/t{i:02d}.jpg"}
            x.update(extras.get(str(i), {}))
            linhas.append(x)
        total = sum(x["dur"] for x in linhas)
        doc = {"treinamento": tid, "sessao": a, "titulo": sess["titulo"], "data": sess["data"], "inicio": sess["inicio"],
               "duracao_total": total, "versao_material": T.get("versao_material", ""), "etapas": etapas, "linhas": linhas,
               "atualizado_em": datetime.datetime.now().isoformat(timespec="seconds")}
        alvo = os.path.join(base, f"{a}.json")
        if os.path.exists(alvo):
            doc["analises"] = json.load(open(alvo)).get("analises", [])
        json.dump(doc, open(alvo, "w"), ensure_ascii=False, indent=1)
        for k in ("pptx", "pdf", "timesheet", "extras"): sess.pop(k, None)
        sess.update(slides=len(linhas), duracao_total=total, arquivo=f"{tid}/{a}.json")
        print(a, len(linhas), "slides", total, "min")
    json.dump(T, open(os.path.join(base, "treinamento.json"), "w"), ensure_ascii=False, indent=1)
    f = os.path.join(saida, "treinamentos.json")
    idx = json.load(open(f)) if os.path.exists(f) else {"treinamentos": []}
    idx["treinamentos"] = [t for t in idx["treinamentos"] if t["id"] != tid]
    idx["treinamentos"].append({"id": tid, "cliente": T["cliente"], "titulo": T["titulo"], "datas": [s["data"] for s in T["sessoes"]], "arquivo": f"{tid}/treinamento.json"})
    idx["treinamentos"].sort(key=lambda t: t["datas"][0], reverse=True)
    json.dump(idx, open(f, "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    exportar(sys.argv[1], sys.argv[2])
