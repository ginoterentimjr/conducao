"""Edita, pela conversa, a linha de base ou a execução de um encontro no repositório privado de dados.

A página de condução recalcula todos os horários a partir do início e das durações; este script só
altera a ordem, as durações, o início e as atividades, do mesmo jeito que a página.

Uso:
    python3 editar.py <clone do repositório de dados> <id do treinamento> <sessão> <base|exec> <operação> [argumentos]

Operações (a atividade é indicada pelo número do slide, ou por x... para atividades incluídas):
    ver                                  lista a ordem, as durações e os horários
    inicio HH:MM                         novo horário de início
    duracao SLIDE MIN                    nova duração de uma atividade
    mover SLIDE depois SLIDE2            move para depois de outra atividade (ou: antes SLIDE2, inicio, fim)
    retirar SLIDE                        retira a atividade (fica em "retiradas", restaurável na página)
    restaurar SLIDE                      devolve uma atividade retirada à posição anterior
    incluir "DESCRIÇÃO" MIN depois SLIDE incluir uma atividade sem slide
    iniciar                              (só exec) cria a execução como cópia da linha de base salva

Na linha de base, grava o time sheet (<sessão>.json) e a cópia salva (<sessão>.base.json), como o botão
"Salvar a linha de base" da página. Na execução, grava só <sessão>.exec.json. A linha de base precisa
existir para iniciar a execução. O commit e o push ficam com quem chama o script.
"""
import copy, datetime, json, os, sys


def carregar(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def gravar(p, d):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)


def chave(l):
    return l.get("id") or f"s{l.get('n')}"


def ids(d):
    for l in d.get("linhas", []) + d.get("removidas", []):
        l.setdefault("id", f"s{l.get('n')}")
    return d


def mm(h):
    a, b = h.split(":"); return int(a) * 60 + int(b)


def hh(m):
    m %= 1440; return f"{m // 60:02d}:{m % 60:02d}"


def achar(d, ref):
    k = ref if str(ref).startswith("x") else f"s{int(ref)}"
    for i, l in enumerate(d["linhas"]):
        if chave(l) == k:
            return i
    raise SystemExit(f"Atividade {ref} não está na lista.")


def ver(d, base=None):
    t = mm(d["inicio"]); pl = {}
    if base:
        tb = mm(base["inicio"])
        for l in base["linhas"]:
            pl[chave(l)] = (tb, l.get("dur", 0)); tb += int(l.get("dur") or 0)
    for l in d["linhas"]:
        dur = int(l.get("dur") or 0)
        extra = ""
        if base:
            p = pl.get(chave(l))
            extra = f"   planejado {hh(p[0])} · {p[1]} min" if p else "   incluída"
        print(f"{str(l.get('n') or '+'):>3}  {hh(t)}–{hh(t + dur)}  {dur:>3} min  {l.get('etapa', '')[:28]:<28}  {l.get('desc', '')[:60]}{extra}")
        t += dur
    for l in d.get("removidas", []):
        print(f"  retirada: {l.get('n') or '+'} · {l.get('desc')}")
    print(f"Início {d['inicio']} · término {hh(t)} · total {t - mm(d['inicio'])} min")


def main():
    if len(sys.argv) < 6:
        raise SystemExit(__doc__)
    repo, tid, sid, alvo, op, *a = sys.argv[1:]
    p_ts = os.path.join(repo, tid, f"{sid}.json")
    p_b = os.path.join(repo, tid, f"{sid}.base.json")
    p_x = os.path.join(repo, tid, f"{sid}.exec.json")
    agora = datetime.datetime.now(datetime.timezone.utc).isoformat()
    ts = ids(carregar(p_ts))
    base = ids(carregar(p_b)) if os.path.exists(p_b) else None
    if alvo == "exec":
        if op == "iniciar":
            if not base:
                raise SystemExit("A linha de base ainda não foi salva: salve a linha de base antes de iniciar a execução.")
            x = {"iniciada_em": agora, "base_salva_em": base["salva_em"], "titulo": ts.get("titulo"), "data": ts.get("data"),
                 "versao_material": base.get("versao_material", ""), "inicio": base["inicio"], "linhas": copy.deepcopy(base["linhas"]), "removidas": []}
            gravar(p_x, x); ver(x, base); return
        if not os.path.exists(p_x):
            raise SystemExit("A execução ainda não foi iniciada. Use a operação iniciar.")
        d = ids(carregar(p_x))
    elif alvo == "base":
        d = ts
    else:
        raise SystemExit("Indique base ou exec.")
    if op == "ver":
        return ver(d, base if alvo == "exec" else None)
    if op == "inicio":
        d["inicio"] = a[0]
    elif op == "duracao":
        d["linhas"][achar(d, a[0])]["dur"] = int(a[1])
    elif op == "mover":
        i = achar(d, a[0]); l = d["linhas"].pop(i)
        if a[1] == "inicio":
            j = 0
        elif a[1] == "fim":
            j = len(d["linhas"])
        else:
            j = achar(d, a[2]) + (1 if a[1] == "depois" else 0)
        d["linhas"].insert(j, l)
    elif op == "retirar":
        i = achar(d, a[0]); l = d["linhas"].pop(i); l["pos"] = i
        d.setdefault("removidas", []).append(l)
    elif op == "restaurar":
        k = a[0] if str(a[0]).startswith("x") else f"s{int(a[0])}"
        rem = d.get("removidas", []); j = next((n for n, l in enumerate(rem) if chave(l) == k), None)
        if j is None:
            raise SystemExit(f"{a[0]} não está entre as retiradas.")
        l = rem.pop(j); pos = min(l.pop("pos", len(d["linhas"])), len(d["linhas"])); d["linhas"].insert(pos, l)
    elif op == "incluir":
        desc, dur = a[0], int(a[1])
        j = achar(d, a[3]) + 1 if len(a) > 3 and a[2] == "depois" else len(d["linhas"])
        ant = d["linhas"][j - 1] if j else d["linhas"][0]
        d["linhas"].insert(j, {"id": "x" + datetime.datetime.now().strftime("%y%m%d%H%M%S"), "n": None, "etapa": ant.get("etapa", ""), "dur": dur,
                               "desc": desc, "incluida": True, "fazer": "", "falar": "", "atencao": "", "tempo": [], "usar": []})
    else:
        raise SystemExit(f"Operação desconhecida: {op}")
    if alvo == "base":
        ts["atualizado_em"] = agora
        gravar(p_ts, ts)
        snap = {"salva_em": agora, "titulo": ts.get("titulo"), "data": ts.get("data"), "versao_material": ts.get("versao_material", ""),
                "inicio": ts["inicio"], "linhas": copy.deepcopy(ts["linhas"]), "removidas": copy.deepcopy(ts.get("removidas", []))}
        gravar(p_b, snap)
    else:
        d["atualizado_em"] = agora
        gravar(p_x, d)
    ver(d, base if alvo == "exec" else None)


if __name__ == "__main__":
    main()
