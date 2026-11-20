'use strict';
/* Condução · página de time sheet do facilitador.
   Código público. Os dados dos treinamentos ficam num repositório privado, lido e gravado
   pela API do GitHub com o token que o próprio facilitador informa nesta página.
   Token e chave da Anthropic ficam só no localStorage deste navegador. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = s => esc(s).replace(/\n/g, '<br>');
const CFGK = 'conducao.cfg.v1';
const REPO_PADRAO = 'ginoterentimjr/conducao-dados';
const MODELOS = [['claude-opus-5-5', 'Claude Opus 5.5 (análise mais profunda)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (mais rápido)']];
const FORM = { indiv: 'Individual', dupla: 'Em dupla', grupo: 'Em grupo (salas)' };
const CORES = ['#E5662C', '#3F6E8C', '#5E7D52', '#B8912F', '#7A4E6E', '#B04A1C', '#5A5045'];
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SVG = {
  miro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.94 14.06 4 20"/><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/></svg>',
  compare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11"/><path d="M3 12h7"/><path d="M3 18h15"/><path d="M17 3v6"/><path d="M20 9v6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  grade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  lista: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
};

/* ---------- configuração ---------- */
function cfg() { try { return JSON.parse(localStorage.getItem(CFGK)) || {}; } catch (e) { return {}; } }
function setCfg(c) { localStorage.setItem(CFGK, JSON.stringify(c)); }
function repo() { return (cfg().repo || REPO_PADRAO).trim(); }
const PREFK = 'conducao.pref.v1';
function pref() { try { return JSON.parse(localStorage.getItem(PREFK)) || {}; } catch (e) { return {}; } }
function setPref(p) { try { localStorage.setItem(PREFK, JSON.stringify({ ...pref(), ...p })); } catch (e) { } }
const CLIENTE_PROPRIO = 'Gino Terentim';
const clienteDe = t => ((t && t.cliente) || '').trim() || CLIENTE_PROPRIO;

/* ---------- utilidades ---------- */
function b64enc(str) { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
function b64dec(b64) { const s = atob(b64.replace(/\s/g, '')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return new TextDecoder().decode(b); }
const min = hm => { const [h, m] = String(hm || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const hhmm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
function dataLonga(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${DIAS[dt.getDay()]}, ${d} de ${MESES[m - 1]} de ${y}`; }
function dataCurta(iso) { if (!iso) return ''; const [, m, d] = iso.split('-'); return `${d}/${m}`; }
function hojeISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function agoraMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; }
const baseEtapa = n => String(n || '').replace(/ \(continuação\)$/, '');
function aviso(msg, erro) { const a = $('#aviso'); a.textContent = msg; a.className = 'aviso' + (erro ? ' erro' : ''); a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { a.hidden = true; }, erro ? 9000 : 3800); }

/* ---------- GitHub (repositório privado de dados) ---------- */
function ghErro(r, p) {
  const m = { 401: 'O token do GitHub não foi aceito (inválido ou expirado). Atualize em Conexões.', 403: 'O token não tem permissão para esse repositório. Confira, em Conexões, se ele dá leitura e gravação ao conteúdo de ' + repo() + '.', 404: 'Não encontrado no repositório de dados: ' + p, 409: 'O arquivo mudou em outro lugar desde que foi aberto. Recarregue a página e repita a edição.', 422: 'O GitHub recusou a gravação de ' + p + '.' }[r.status];
  const e = new Error(m || `GitHub respondeu ${r.status} para ${p}.`); e.status = r.status; return e;
}
const GH = {
  url(p) { return `https://api.github.com/repos/${repo()}/contents/` + p.split('/').map(encodeURIComponent).join('/'); },
  hdr(acc) { return { Authorization: `Bearer ${cfg().token}`, Accept: acc || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; },
  async json(p) {
    const r = await fetch(this.url(p), { headers: this.hdr(), cache: 'no-store' });
    if (!r.ok) throw ghErro(r, p);
    const j = await r.json();
    let txt = j.content ? b64dec(j.content) : null;
    if (txt === null || (j.size > 0 && !txt)) {
      const r2 = await fetch(this.url(p), { headers: this.hdr('application/vnd.github.raw+json'), cache: 'no-store' });
      if (!r2.ok) throw ghErro(r2, p);
      txt = await r2.text();
    }
    return { data: JSON.parse(txt), sha: j.sha };
  },
  async blob(p) { const r = await fetch(this.url(p), { headers: this.hdr('application/vnd.github.raw+json') }); if (!r.ok) throw ghErro(r, p); return r.blob(); },
  async put(p, texto, sha, msg) {
    const body = { message: msg, content: b64enc(texto) }; if (sha) body.sha = sha;
    const r = await fetch(this.url(p), { method: 'PUT', headers: { ...this.hdr(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw ghErro(r, p);
    return (await r.json()).content.sha;
  },
  async putJSON(p, obj, sha, msg) { return this.put(p, JSON.stringify(obj, null, 1), sha, msg); },
  async testar() {
    const r = await fetch(`https://api.github.com/repos/${repo()}`, { headers: this.hdr(), cache: 'no-store' });
    if (!r.ok) throw ghErro(r, repo());
    const j = await r.json();
    return j;
  },
};

/* ---------- imagens (fila, cache do navegador) ---------- */
const IMG = new Map(); const fila = []; let ativos = 0;
function imgURL(path) {
  if (IMG.has(path)) return IMG.get(path);
  const pr = new Promise((res, rej) => { fila.push({ path, res, rej }); bomba(); });
  IMG.set(path, pr); return pr;
}
function bomba() {
  while (ativos < 6 && fila.length) {
    const it = fila.shift(); ativos++;
    carregaImg(it.path).then(it.res, e => { IMG.delete(it.path); it.rej(e); }).finally(() => { ativos--; bomba(); });
  }
}
async function carregaImg(path) {
  let cache = null; try { cache = await caches.open('conducao-img-v1'); } catch (e) { }
  const chave = `https://cache.conducao/${repo()}/${path}?v=${estado.versao || ''}`;
  if (cache) { try { const hit = await cache.match(chave); if (hit) return URL.createObjectURL(await hit.blob()); } catch (e) { } }
  const b = await GH.blob(path);
  if (cache) { try { await cache.put(chave, new Response(b)); } catch (e) { } }
  return URL.createObjectURL(b);
}
const obs = 'IntersectionObserver' in window ? new IntersectionObserver(ents => {
  for (const e of ents) if (e.isIntersecting) { const im = e.target; obs.unobserve(im); imgURL(im.dataset.src).then(u => { im.src = u; }).catch(() => { im.alt = 'imagem indisponível'; }); }
}, { rootMargin: '400px' }) : null;
function lazy(root) { $$('img[data-src]', root).forEach(im => { if (im.src) return; obs ? obs.observe(im) : imgURL(im.dataset.src).then(u => { im.src = u; }); }); }

/* ---------- estado e rotas ---------- */
const estado = { idx: null, treinos: {}, cur: null, sujo: false, versao: '', analise: null, ignorarHash: false, anterior: '' };
window.addEventListener('beforeunload', e => { if (estado.sujo) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('hashchange', () => {
  if (estado.ignorarHash) { estado.ignorarHash = false; return; }
  if (estado.sujo && !location.hash.startsWith(estado.anterior.split('/').slice(0, 4).join('/'))) {
    const destino = location.hash; estado.ignorarHash = true; location.hash = estado.anterior;
    perguntar('Há alterações não salvas nesta sessão.', [['Salvar e continuar', 'prim', async () => { if (await salvar()) location.hash = destino; }], ['Sair sem salvar', '', () => { estado.sujo = false; estado.cur = null; location.hash = destino; }], ['Ficar aqui', '', () => { }]]);
    return;
  }
  rota();
});
window.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && estado.cur) { e.preventDefault(); salvar(); } });

async function rota() {
  estado.anterior = location.hash || '#/';
  fecharModal(); fecharCond();
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  $$('[data-nav]').forEach(a => a.classList.toggle('ativo', a.dataset.nav === (p[0] === 'config' ? 'config' : 'home')));
  const app = $('#app');
  try {
    if (p[0] === 'config' || !cfg().token) return vConfig(!cfg().token);
    if (p[0] === 't' && p[1] && p[2]) return await vSessao(p[1], p[2], p[3]);
    if (p[0] === 't' && p[1]) return await vTreino(p[1]);
    return await vHome();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<p class="sobr">Não foi possível abrir</p><h1>Algo <em>impediu a leitura.</em></h1><p class="lede">${esc(e.message)}</p><a class="btn" href="#/config">Revisar as conexões</a>`;
  }
}

/* ---------- leitura de dados ---------- */
async function lerIndice() { estado.idx = await GH.json('treinamentos.json'); return estado.idx; }
async function lerTreino(tid) {
  const t = estado.treinos[tid] || await GH.json(`${tid}/treinamento.json`);
  t.data.id = t.data.id || tid; estado.treinos[tid] = t; return t;
}

/* ---------- tela: conexões ---------- */
function vConfig(primeira) {
  const c = cfg();
  $('#app').innerHTML = `
  <p class="sobr">Conexões deste navegador</p>
  <h1>Acesso aos dados <em>e à análise.</em></h1>
  <p class="lede">A página é pública e não contém dados de cliente. Os treinamentos ficam no repositório privado ${esc(repo())}, e esta página só os lê com o token que você informa aqui. O token e a chave da Anthropic ficam guardados apenas neste navegador.</p>
  ${primeira ? '<div class="nota"><b>Primeiro acesso.</b> Informe o token do GitHub para abrir os treinamentos. A chave da Anthropic é necessária só para a análise das transcrições.</div><br>' : ''}
  <div class="form">
    <div class="campo"><label for="c-token">Token do GitHub (fine-grained)</label><input id="c-token" type="password" autocomplete="off" value="${esc(c.token || '')}" placeholder="github_pat_..."><small>Permissão: Contents, leitura e gravação, apenas no repositório de dados.</small></div>
    <div class="campo"><label for="c-repo">Repositório de dados</label><input id="c-repo" type="text" value="${esc(c.repo || REPO_PADRAO)}"></div>
    <div class="campo"><label for="c-akey">Chave da API da Anthropic</label><input id="c-akey" type="password" autocomplete="off" value="${esc(c.akey || '')}" placeholder="sk-ant-..."></div>
    <div class="campo"><label for="c-modelo">Modelo para a análise</label><select id="c-modelo">${MODELOS.map(([v, r]) => `<option value="${v}" ${(c.modelo || MODELOS[0][0]) === v ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
    <div class="barra"><button class="btn prim" id="c-salvar">Salvar e testar</button><button class="btn" id="c-sair">Remover as credenciais deste navegador</button><span id="c-res" class="meta"></span></div>
  </div>
  <h2>Como criar o token do GitHub</h2>
  <ol class="lede">
    <li>Abra <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a> (Fine-grained tokens).</li>
    <li>Nome: <b>Condução · página</b>. Validade: a que preferir (até um ano).</li>
    <li>Resource owner: <b>ginoterentimjr</b>. Repository access: <b>Only select repositories</b> e escolha <b>conducao-dados</b>.</li>
    <li>Em Permissions, Repository permissions: <b>Contents</b> como <b>Read and write</b>. Metadata fica como leitura, automaticamente.</li>
    <li>Clique em Generate token, copie o código (o GitHub mostra uma única vez) e cole acima.</li>
  </ol>
  <h2>Como criar a chave da Anthropic</h2>
  <ol class="lede">
    <li>Abra <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com/settings/keys</a> (o endereço antigo, console.anthropic.com, redireciona para lá).</li>
    <li>Clique em Create key, dê o nome <b>Condução · página</b> e copie a chave.</li>
    <li>A conta precisa de créditos em Billing; cada análise consome créditos da sua conta.</li>
  </ol>`;
  $('#c-salvar').onclick = async () => {
    const n = { token: $('#c-token').value.trim(), repo: $('#c-repo').value.trim() || REPO_PADRAO, akey: $('#c-akey').value.trim(), modelo: $('#c-modelo').value };
    setCfg(n); estado.treinos = {}; estado.idx = null;
    const res = $('#c-res'); res.textContent = 'Testando...';
    try { const j = await GH.testar(); res.innerHTML = `<span class="pilula verde">Conectado</span> ${esc(j.full_name)} (${j.private ? 'privado' : 'ATENÇÃO: público'})`; if (!j.private) aviso('O repositório de dados está público. Torne-o privado antes de usar.', true); else setTimeout(() => { location.hash = '#/'; }, 900); }
    catch (e) { res.innerHTML = `<span class="pilula">Falhou</span> ${esc(e.message)}`; }
  };
  $('#c-sair').onclick = async () => { localStorage.removeItem(CFGK); try { await caches.delete('conducao-img-v1'); } catch (e) { } aviso('Credenciais e imagens removidas deste navegador.'); vConfig(true); };
}

/* ---------- tela: treinamentos ---------- */
async function vHome() {
  const app = $('#app');
  app.innerHTML = '<p class="sobr">Treinamentos</p><h1>Carregando...</h1>';
  const idx = (await lerIndice()).data;
  const lista = idx.treinamentos || [];
  const ts = await Promise.all(lista.map(t => lerTreino(t.id).catch(() => null)));
  const itens = lista.map((t, i) => ({ t, d: ts[i] && ts[i].data, cli: clienteDe(ts[i] && ts[i].data && ts[i].data.cliente ? ts[i].data : t) }));
  const clientes = [...new Set(itens.map(x => x.cli))].sort((a, b) => a === CLIENTE_PROPRIO ? 1 : b === CLIENTE_PROPRIO ? -1 : a.localeCompare(b, 'pt-BR'));
  const pr = pref(); let filtro = clientes.includes(pr.cliente) ? pr.cliente : ''; let vista = pr.vista === 'lista' ? 'lista' : 'cartoes';
  const hoje = hojeISO();
  const desenhar = () => {
    const sel = itens.filter(x => !filtro || x.cli === filtro);
    const prox = [];
    sel.forEach(({ d, cli }) => d && (d.sessoes || []).forEach(s => { if (s.data >= hoje) prox.push({ t: d, s, cli }); }));
    prox.sort((a, b) => (a.s.data + a.s.inicio).localeCompare(b.s.data + b.s.inicio));
    const linkS = (t, s) => `#/t/${encodeURIComponent(t.id)}/${encodeURIComponent(s.id)}`;
    const proxHTML = !prox.length ? '' : vista === 'lista'
      ? `<table class="lista-t"><thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Encontro</th><th>Treinamento</th></tr></thead><tbody>${prox.slice(0, 12).map(({ t, s, cli }) => `
          <tr data-href="${linkS(t, s)}"><td><b>${esc(dataCurta(s.data))}</b>${s.data === hoje ? ' <span class="pilula">hoje</span>' : ''}</td><td>${esc(s.inicio)} às ${esc(s.fim)}</td><td class="cli-c">${esc(cli)}</td><td><a href="${linkS(t, s)}">${esc(s.titulo)}</a></td><td>${esc(t.titulo)}</td></tr>`).join('')}</tbody></table>`
      : `<div class="cartoes">${prox.slice(0, 6).map(({ t, s, cli }) => `
          <a class="cartao" href="${linkS(t, s)}">
            <div class="cli">${esc(cli)}${s.data === hoje ? ' · <span class="pilula">hoje</span>' : ''}</div>
            <h3>${esc(s.titulo)}</h3>
            <div class="meta">${esc(dataLonga(s.data))}, das ${esc(s.inicio)} às ${esc(s.fim)}<br>${esc(t.titulo)}</div>
          </a>`).join('')}</div>`;
    const todosHTML = !sel.length ? '<div class="vazio">Nenhum treinamento publicado ainda. Os treinamentos entram pela skill /timesheet-facilitador.</div>' : vista === 'lista'
      ? `<table class="lista-t"><thead><tr><th>Cliente</th><th>Treinamento</th><th>Encontros</th><th>Formato</th></tr></thead><tbody>${sel.map(({ t, d, cli }) => `
          <tr data-href="#/t/${encodeURIComponent(t.id)}"><td class="cli-c">${esc(cli)}</td><td><a href="#/t/${encodeURIComponent(t.id)}"><b>${esc(t.titulo)}</b></a></td>
          <td>${d ? `<div class="sessoes" style="margin:0">${(d.sessoes || []).map(s => `<a class="sessao-chip" href="${linkS(d, s)}"><b>${esc(s.titulo.split(' · ')[0])}</b>${esc(dataCurta(s.data))} · ${esc(s.inicio)}</a>`).join('')}</div>` : esc((t.datas || []).map(dataCurta).join(', '))}</td>
          <td class="meta-p">${esc((d && d.formato) || '')}</td></tr>`).join('')}</tbody></table>`
      : `<div class="cartoes">${sel.map(({ t, d, cli }) => `
          <a class="cartao" href="#/t/${encodeURIComponent(t.id)}">
            <div class="cli">${esc(cli)}</div>
            <h3>${esc(t.titulo)}</h3>
            <div class="meta">${esc((t.datas || []).map(dataCurta).join(', '))}${d && d.formato ? ' · ' + esc(d.formato) : ''}</div>
            ${d ? `<div class="sessoes">${(d.sessoes || []).map(s => `<span class="sessao-chip"><b>${esc(s.titulo.split(' · ')[0])}</b>${esc(dataCurta(s.data))} · ${esc(s.inicio)}</span>`).join('')}</div>` : ''}
          </a>`).join('')}</div>`;
    app.innerHTML = `
    <p class="sobr">Time sheet de condução</p>
    <h1>Treinamentos <em>e encontros.</em></h1>
    <p class="lede">Cada treinamento traz o time sheet de cada encontro, com o slide, o horário, o material, o que fazer e o que falar. Tudo é editável e salvo no repositório privado.</p>
    <div class="filtros">
      <div class="chips" role="group" aria-label="Filtrar por cliente">
        <button class="chip ${!filtro ? 'ativo' : ''}" data-cli="">Todos <span>${itens.length}</span></button>
        ${clientes.map(cl => `<button class="chip ${filtro === cl ? 'ativo' : ''}" data-cli="${esc(cl)}">${esc(cl)} <span>${itens.filter(x => x.cli === cl).length}</span></button>`).join('')}
      </div>
      <div class="vista" role="group" aria-label="Forma de exibição">
        <button class="${vista === 'cartoes' ? 'ativo' : ''}" data-vista="cartoes" title="Cartões">${SVG.grade}<span>Cartões</span></button>
        <button class="${vista === 'lista' ? 'ativo' : ''}" data-vista="lista" title="Lista">${SVG.lista}<span>Lista</span></button>
      </div>
    </div>
    ${prox.length ? `<h2>Próximos encontros</h2>${proxHTML}` : ''}
    <h2>${filtro ? esc(filtro) + ': treinamentos' : 'Todos os treinamentos'}</h2>
    ${todosHTML}`;
    $$('[data-cli]', app).forEach(b => b.onclick = () => { filtro = b.dataset.cli; setPref({ cliente: filtro }); desenhar(); });
    $$('[data-vista]', app).forEach(b => b.onclick = () => { vista = b.dataset.vista; setPref({ vista }); desenhar(); });
    $$('tr[data-href]', app).forEach(tr => tr.onclick = e => { if (!e.target.closest('a')) location.hash = tr.dataset.href; });
  };
  desenhar();
}

/* ---------- tela: treinamento ---------- */
function linkAgenda(t, s) {
  const d = s.data.replace(/-/g, ''); const a = s.inicio.replace(':', '') + '00'; const b = (s.fim || hhmm(min(s.inicio) + (s.duracao_total || 180))).replace(':', '') + '00';
  const det = [t.titulo, t.link_sala ? 'Sala: ' + t.link_sala : '', 'Time sheet: ' + location.origin + location.pathname + `#/t/${t.id}/${s.id}`].filter(Boolean).join('\n');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(clienteDe(t) + ' · ' + s.titulo)}&dates=${d}T${a}/${d}T${b}&ctz=America/Sao_Paulo&details=${encodeURIComponent(det)}`;
}
async function vTreino(tid) {
  const app = $('#app'); app.innerHTML = '<p class="sobr">Treinamento</p><h1>Carregando...</h1>';
  const t = (await lerTreino(tid)).data;
  app.innerHTML = `
  <p class="sobr">${esc(clienteDe(t))}${t.area ? ' · ' + esc(t.area) : ''}</p>
  <h1>${esc(t.titulo)}</h1>
  <p class="lede">${[t.formato, t.participantes ? t.participantes + ' participantes' : '', t.carga, t.versao_material ? 'material na versão ' + t.versao_material : ''].filter(Boolean).map(esc).join(' · ')}</p>
  <div class="barra">
    ${t.link_sala ? `<a class="btn" href="${esc(t.link_sala)}" target="_blank" rel="noopener">${SVG.video} Sala on-line</a>` : ''}
    <button class="btn" id="t-editar">${SVG.pen} Editar dados do treinamento</button>
    ${t.pasta_dropbox ? `<span class="meta" style="font-size:13px;color:var(--cinza2)">Pasta: Dropbox / ${esc(t.pasta_dropbox)}</span>` : ''}
  </div>
  <div class="cartoes">${(t.sessoes || []).map(s => `
    <div class="cartao">
      <div class="cli">${esc(dataLonga(s.data))}</div>
      <h3>${esc(s.titulo)}</h3>
      <div class="meta">Das ${esc(s.inicio)} às ${esc(s.fim)}${s.slides ? ` · ${s.slides} slides` : ''}${s.duracao_total ? ` · ${s.duracao_total} min no roteiro` : ''}</div>
      <div class="barra">
        <a class="btn prim" href="#/t/${encodeURIComponent(t.id)}/${encodeURIComponent(s.id)}">Abrir o time sheet</a>
        ${s.agenda ? `<a class="btn" href="${esc(s.agenda)}" target="_blank" rel="noopener">${SVG.cal} Na agenda</a>` : `<a class="btn" href="${esc(linkAgenda(t, s))}" target="_blank" rel="noopener">${SVG.cal} Adicionar à agenda</a>`}
        ${s.miro ? `<a class="btn" href="${esc(s.miro)}" target="_blank" rel="noopener">${SVG.miro} Miro</a>` : ''}
      </div>
    </div>`).join('')}</div>`;
  $('#t-editar').onclick = () => editarTreino(tid);
}
function editarTreino(tid) {
  const T = estado.treinos[tid]; const t = T.data;
  const campos = [['cliente', 'Cliente'], ['area', 'Área do cliente'], ['titulo', 'Título do treinamento'], ['formato', 'Formato'], ['participantes', 'Participantes'], ['carga', 'Carga horária'], ['link_sala', 'Link da sala on-line'], ['pasta_dropbox', 'Pasta no Dropbox']];
  abrirModal(`<button class="btn peq fechar" data-fechar>Fechar</button><p class="sobr">Dados do treinamento</p><h2 style="margin-top:0">${esc(t.titulo)}</h2>
    <div class="form" style="max-width:none">
      <div class="grade2">${campos.map(([k, r]) => `<div class="campo"><label>${r}</label><input type="text" data-k="${k}" value="${esc(t[k] ?? '')}" ${k === 'cliente' ? `placeholder="Em branco: treinamento próprio (${CLIENTE_PROPRIO})"` : ''}></div>`).join('')}</div>
      <h3>Encontros</h3>
      ${(t.sessoes || []).map((s, i) => `<div class="grade3" data-s="${i}">
        <div class="campo"><label>Título</label><input type="text" data-sk="titulo" value="${esc(s.titulo)}"></div>
        <div class="campo"><label>Data</label><input type="date" data-sk="data" value="${esc(s.data)}"></div>
        <div class="campo"><label>Início e fim</label><div style="display:flex;gap:8px"><input type="time" data-sk="inicio" value="${esc(s.inicio)}"><input type="time" data-sk="fim" value="${esc(s.fim)}"></div></div>
        <div class="campo"><label>Evento na agenda (link)</label><input type="text" data-sk="agenda" value="${esc(s.agenda || '')}"></div>
        <div class="campo"><label>Quadro do Miro (link)</label><input type="text" data-sk="miro" value="${esc(s.miro || '')}"></div>
      </div>`).join('<hr style="border:0;border-top:1px solid var(--borda)">')}
      <div class="barra"><button class="btn prim" id="tr-salvar">${SVG.save} Salvar</button></div>
    </div>`);
  $('#tr-salvar').onclick = async () => {
    $$('[data-k]', $('#modal')).forEach(i => { t[i.dataset.k] = i.dataset.k === 'participantes' ? (Number(i.value) || i.value) : i.value; });
    $$('[data-s]', $('#modal')).forEach(div => { const s = t.sessoes[Number(div.dataset.s)]; $$('[data-sk]', div).forEach(i => { s[i.dataset.sk] = i.value; }); });
    try {
      T.sha = await GH.putJSON(`${tid}/treinamento.json`, t, T.sha, `Dados do treinamento: ${t.cliente} (edição na página)`);
      const I = await lerIndice(); const e = I.data.treinamentos.find(x => x.id === tid);
      if (e) { e.cliente = t.cliente; e.titulo = t.titulo; e.datas = t.sessoes.map(s => s.data); await GH.putJSON('treinamentos.json', I.data, I.sha, 'Índice dos treinamentos (edição na página)'); }
      fecharModal(); aviso('Dados do treinamento salvos.'); vTreino(tid);
    } catch (err) { aviso(err.message, true); }
  };
}

/* ---------- tela: sessão (time sheet) ---------- */
function horarios(d) { let t = min(d.inicio); return d.linhas.map(l => { const a = t; t += Number(l.dur) || 0; return [a, t]; }); }
function etapasDe(d) {
  const h = horarios(d); const out = [];
  d.linhas.forEach((l, i) => { const ult = out[out.length - 1]; if (ult && ult.nome === l.etapa) { ult.fim = h[i][1]; ult.dur += Number(l.dur) || 0; } else out.push({ nome: l.etapa, ini: h[i][0], fim: h[i][1], dur: Number(l.dur) || 0, i0: i }); });
  const cores = {}; let k = 0;
  out.forEach(e => { const b = baseEtapa(e.nome); if (b === 'Intervalo') e.cor = '#A89C8C'; else { if (!(b in cores)) cores[b] = CORES[k++ % CORES.length]; e.cor = cores[b]; } });
  return out;
}
function corEtapa(d, nome) { const e = etapasDe(d).find(x => x.nome === nome); return e ? e.cor : '#8D8377'; }
function icones(l) {
  let h = '';
  if (l.material && l.material.tipo) h += `<span class="ic" title="${l.material.tipo === 'entregar' ? 'Entregar' : 'Usar'}: ${esc((l.material.pecas || []).join(' · '))}"><img src="assets/${l.material.tipo === 'entregar' ? 'livro-ouro' : 'livro-prata'}.png" alt="${l.material.tipo === 'entregar' ? 'Livro dourado: entregar' : 'Livro prateado: usar'}"></span>`;
  if (l.formacao) h += `<span class="ic" title="${esc(FORM[l.formacao] || l.formacao)}"><img src="assets/form-${esc(l.formacao)}.png" alt="${esc(FORM[l.formacao] || '')}"></span>`;
  if (l.miro) h += `<span class="ic miro" title="Atividade no Miro">${SVG.miro}</span>`;
  if (l.chat) h += `<span class="ic chat" title="Chat: enviar ou ler respostas">${SVG.chat}</span>`;
  if (l.momento) h += `<span class="tag-c" title="${esc(l.momento)}">${esc(l.momento.split(' · ')[0])}</span>`;
  return h;
}
/* ---------- linha de base e execução ---------- */
const copia = o => JSON.parse(JSON.stringify(o));
const chaveL = l => l.id || ('s' + l.n);
function garantirIds(d) { [...(d.linhas || []), ...(d.removidas || [])].forEach(l => { if (!l.id) l.id = 's' + l.n; }); return d; }
async function lerOpcional(p) { try { return await GH.json(p); } catch (e) { if (e.status === 404) return null; throw e; } }
const arqBase = c => c.path.replace(/\.json$/, '.base.json');
const arqExec = c => c.path.replace(/\.json$/, '.exec.json');
function doc() { const c = estado.cur; return c.modo === 'exec' && c.exec ? c.exec.data : c.data; }
function docConducao() { const c = estado.cur; return c.exec ? c.exec.data : c.data; }
function assinatura(D) { return JSON.stringify([D.inicio, (D.linhas || []).map(l => [chaveL(l), Number(l.dur) || 0])]); }
function baseConfere() { const c = estado.cur; return !!c.base && assinatura(c.base.data) === assinatura(c.data); }
function quando(iso) { if (!iso) return ''; const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; }
const totalDe = D => D.linhas.reduce((a, l) => a + (Number(l.dur) || 0), 0);
const sinal = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(Math.round(n));

async function vSessao(tid, sid, modo) {
  const app = $('#app');
  if (!estado.cur || estado.cur.tid !== tid || estado.cur.sid !== sid) {
    app.innerHTML = '<p class="sobr">Time sheet</p><h1>Carregando...</h1>';
    const T = await lerTreino(tid);
    const meta = (T.data.sessoes || []).find(s => s.id === sid) || {};
    const path = meta.arquivo || `${tid}/${sid}.json`;
    const S = await GH.json(path);
    const c = { tid, sid, path, data: garantirIds(S.data), sha: S.sha, meta, treino: T.data, aberta: new Set(), modo: 'base', sujo: { base: false, exec: false }, base: null, exec: null };
    const [B, X] = await Promise.all([lerOpcional(arqBase(c)), lerOpcional(arqExec(c))]);
    if (B) c.base = { data: garantirIds(B.data), sha: B.sha };
    if (X) c.exec = { data: garantirIds(X.data), sha: X.sha };
    estado.cur = c;
    estado.versao = S.data.versao_material || '';
    estado.sujo = false; estado.analise = null;
    carregarUltimaAnalise();
  }
  const c = estado.cur;
  if (modo === 'execucao') c.modo = 'exec';
  else if (modo === 'comparacao') c.modo = 'comp';
  else if (!modo) c.modo = 'base';
  desenharSessao();
  if (modo === 'conducao') pedirBaseAntes(() => abrirCond(), () => { location.hash = hashSessao(); });
  if (modo === 'analise') abrirAnalise();
}
const hashSessao = (sufixo = '') => `#/t/${encodeURIComponent(estado.cur.tid)}/${encodeURIComponent(estado.cur.sid)}${sufixo}`;

/* antes de conduzir ou de iniciar a execução, a linha de base precisa estar salva */
function pedirBaseAntes(seguir, cancelar) {
  const c = estado.cur;
  if (c.base && !c.sujo.base && (baseConfere() || c.exec)) return seguir();
  const msg = !c.base ? 'A linha de base ainda não foi salva.' : (c.sujo.base ? 'A linha de base tem alterações que ainda não foram salvas.' : 'O time sheet mudou depois da linha de base salva em ' + quando(c.base.data.salva_em) + '.');
  perguntar(msg, [['Salvar a linha de base e continuar', 'prim', async () => { if (await salvar('base')) seguir(); else if (cancelar) cancelar(); }], ['Cancelar', '', () => { if (cancelar) cancelar(); }]],
    'A linha de base guarda o horário planejado de cada atividade. Ela fica como está durante a execução, para a comparação no fim.');
}

function abas() {
  const c = estado.cur; const m = c.modo;
  return `<div class="abas" role="tablist">
    <a href="${hashSessao()}" class="${m === 'base' ? 'ativa' : ''}" role="tab">${SVG.flag} Linha de base</a>
    <a href="${hashSessao('/execucao')}" class="${m === 'exec' ? 'ativa' : ''}" role="tab">${SVG.play} Execução${c.exec ? '' : ' <span class="pilula cinza">não iniciada</span>'}</a>
    <a href="${hashSessao('/comparacao')}" class="${m === 'comp' ? 'ativa' : ''}" role="tab">${SVG.compare} Comparação</a>
  </div>`;
}
function statusBase() {
  const c = estado.cur;
  if (!c.base) return '<span class="pilula">Linha de base não salva</span>';
  if (c.sujo.base) return `<span class="pilula">Alterações ainda fora da linha de base</span> <span class="meta-p">salva em ${esc(quando(c.base.data.salva_em))}</span>`;
  if (!baseConfere()) return `<span class="pilula">O time sheet mudou depois da linha de base</span> <span class="meta-p">salva em ${esc(quando(c.base.data.salva_em))}${c.base.data.versao_material && c.base.data.versao_material !== c.data.versao_material ? ` · material v${esc(c.base.data.versao_material)} → v${esc(c.data.versao_material)}` : ''}</span>`;
  return `<span class="pilula verde">Linha de base salva</span> <span class="meta-p">${esc(quando(c.base.data.salva_em))}</span>`;
}

function desenharSessao() {
  const c = estado.cur, t = c.treino, m = c.meta, P = c.data;
  if (c.modo === 'comp') return desenharComparacao();
  const exec = c.modo === 'exec';
  const sujo = c.sujo[exec ? 'exec' : 'base'];
  const cab = `
  <p class="sobr"><a href="#/t/${encodeURIComponent(c.tid)}" style="text-decoration:none">${esc(t.cliente || CLIENTE_PROPRIO)} · ${esc(t.titulo)}</a></p>
  <h1 class="h-sessao">${esc(P.titulo.split(' · ')[0])} <em>${esc(P.titulo.split(' · ').slice(1).join(' · '))}</em></h1>
  <div class="lede" style="margin:0 0 10px">${esc(dataLonga(P.data))} · ${P.linhas.length} slides${P.versao_material ? ' · material v' + esc(P.versao_material) : ''} <span class="sujo" id="sujo">${estado.sujo ? '· alterações não salvas' : ''}</span></div>
  ${abas()}`;
  if (exec && !c.exec) {
    $('#app').innerHTML = cab + `
    <div class="painel-exec">
      <h2 style="margin-top:0">A execução começa como cópia da <em>linha de base.</em></h2>
      <p class="lede">Durante o encontro, mova, apague ou inclua atividades e ajuste o horário de início e as durações: tudo se recalcula. A linha de base continua como foi salva, para a comparação no fim.</p>
      <p>${statusBase()}</p>
      <div class="barra"><button class="btn prim" id="x-iniciar">${SVG.play} Iniciar a execução</button></div>
    </div>`;
    $('#x-iniciar').onclick = iniciarExec;
    return;
  }
  const D = doc();
  const h = horarios(D); const total = totalDe(D);
  const reservado = m.fim ? min(m.fim) - min(m.inicio || P.inicio) : total;
  const B = exec && c.base ? c.base.data : null;
  const inicioB = B ? B.inicio : null; const fimB = B ? hhmm(min(B.inicio) + totalDe(B)) : null;
  $('#app').innerHTML = cab + `
  <div class="cab-sessao">
    <div class="status-linha">${exec ? `<span class="pilula verde">Execução</span> <span class="meta-p">iniciada em ${esc(quando(c.exec.data.iniciada_em))}${B ? ` · linha de base de ${esc(quando(B.salva_em))}` : ''}</span>` : statusBase()}</div>
    <div class="relogio-box">
      <div class="rb"><small>${exec ? 'Início executado' : 'Início planejado'}</small><input type="time" id="s-inicio" value="${esc(D.inicio)}"></div>
      <div class="rb"><small>Término</small><b id="s-fim">${hhmm(min(D.inicio) + total)}</b>${B ? `<span class="rb-pl">planejado ${esc(fimB)}</span>` : ''}</div>
      <div class="rb ${total !== reservado ? 'alerta' : ''}" id="s-tot-box"><small>Total</small><b id="s-tot">${total} min</b>${B ? `<span class="rb-pl">planejado ${totalDe(B)} min</span>` : ''}</div>
    </div>
  </div>
  <div class="barra">
    <button class="btn prim" id="s-salvar" ${sujo ? '' : (exec || baseConfere() ? 'disabled' : '')}>${SVG.save} ${exec ? 'Salvar a execução' : 'Salvar a linha de base'}</button>
    <a class="btn esc" href="${hashSessao('/conducao')}">${SVG.play} Modo condução</a>
    ${exec ? `<button class="btn" id="x-incluir">${SVG.plus} Incluir atividade</button><button class="btn" id="x-recomecar" title="Recomeçar a execução a partir da linha de base">Recomeçar da linha de base</button>` : `<a class="btn" href="${hashSessao('/analise')}" id="s-analise">${SVG.spark} Análise da transcrição${(P.analises || []).length ? ` (${P.analises.length})` : ''}</a>`}
    <span class="esp"></span>
    ${m.agenda ? `<a class="btn" href="${esc(m.agenda)}" target="_blank" rel="noopener">${SVG.cal} Na agenda</a>` : `<a class="btn" href="${esc(linkAgenda(t, m.id ? m : { ...m, id: c.sid, data: P.data, inicio: P.inicio, titulo: P.titulo }))}" target="_blank" rel="noopener">${SVG.cal} Adicionar à agenda</a>`}
    ${m.miro ? `<a class="btn" href="${esc(m.miro)}" target="_blank" rel="noopener">${SVG.miro} Miro</a>` : ''}
    ${t.link_sala ? `<a class="btn" href="${esc(t.link_sala)}" target="_blank" rel="noopener">${SVG.video} Sala</a>` : ''}
    <button class="btn" id="s-abrir">Abrir todas</button>
  </div>
  <div class="etapas" id="s-etapas">${barraEtapas(D)}</div>
  <div class="legenda">
    <span><span class="ic alca-leg">${SVG.grip}</span> Arraste para mudar a ordem</span>
    <span><span class="ic"><img src="assets/livro-ouro.png" alt=""></span> Entregar material</span>
    <span><span class="ic"><img src="assets/livro-prata.png" alt=""></span> Usar material já enviado</span>
    <span><span class="ic"><img src="assets/form-indiv.png" alt=""></span> Individual</span>
    <span><span class="ic"><img src="assets/form-dupla.png" alt=""></span> Dupla</span>
    <span><span class="ic"><img src="assets/form-grupo.png" alt=""></span> Grupo</span>
    <span><span class="ic miro">${SVG.miro}</span> Miro</span>
    <span><span class="ic chat">${SVG.chat}</span> Chat</span>
    <span><span class="tag-c">C1</span> Momento 4C</span>
  </div>
  <div class="linhas ${exec ? 'com-plano' : ''}" id="s-linhas">${D.linhas.map((l, i) => linhaHTML(l, i, h[i])).join('')}</div>
  ${(D.removidas || []).length ? `<h3 style="margin-top:22px">Atividades retiradas (${D.removidas.length})</h3><div class="retiradas">${D.removidas.map((l, k) => `<div class="ret"><span class="l-n">${l.n || '+'}</span><span>${esc(l.desc)} · ${Number(l.dur) || 0} min</span><button class="btn peq" data-rest="${k}">Restaurar</button></div>`).join('')}</div>` : ''}`;
  lazy($('#s-linhas'));
  $('#s-salvar').onclick = () => salvar(exec ? 'exec' : 'base');
  const an = $('#s-analise'); if (an) an.onclick = e => { if (location.hash.endsWith('/analise')) { e.preventDefault(); abrirAnalise(); } };
  $('#s-inicio').onchange = e => { D.inicio = e.target.value || D.inicio; marcarSujo(); atualizarHorarios(); };
  $('#s-abrir').onclick = e => { const abrir = e.target.textContent.includes('Abrir'); D.linhas.forEach((l, i) => alternar(i, abrir)); e.target.textContent = abrir ? 'Fechar todas' : 'Abrir todas'; };
  ligarEtapas();
  $$('#s-linhas .linha').forEach(el => ligarLinha(el));
  $$('[data-rest]').forEach(b => b.onclick = () => restaurar(Number(b.dataset.rest)));
  if (exec) { $('#x-incluir').onclick = incluirAtividade; $('#x-recomecar').onclick = recomecarExec; }
  D.linhas.forEach((l, i) => { if (c.aberta.has(chaveL(l))) alternar(i, true); });
}
function barraEtapas(D) { return etapasDe(D).map(e => `<div style="flex:${Math.max(e.dur, 1)};background:${e.cor}" data-i0="${e.i0}" title="${esc(e.nome)} · ${hhmm(e.ini)} a ${hhmm(e.fim)} · ${e.dur} min"><b>${esc(e.nome)}</b><span>${hhmm(e.ini)} · ${e.dur} min</span></div>`).join(''); }
function ligarEtapas() { $$('#s-etapas div').forEach(el => el.onclick = () => { const i = Number(el.dataset.i0); const r = $(`#l-${i}`); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); alternar(i, true); }); }

/* horário planejado da mesma atividade, na linha de base */
function planoDe(l) {
  const c = estado.cur; if (!c.base) return null;
  const B = c.base.data; const k = B.linhas.findIndex(x => chaveL(x) === chaveL(l)); if (k < 0) return null;
  const hb = horarios(B)[k]; return { ini: hb[0], fim: hb[1], dur: Number(B.linhas[k].dur) || 0 };
}
function planoHTML(l, h) {
  const p = planoDe(l);
  if (!p) return '<div class="l-pl"><span class="pilula cinza">incluída</span></div>';
  const atraso = h[0] - p.ini; const dd = (Number(l.dur) || 0) - p.dur;
  return `<div class="l-pl"><b>${hhmm(p.ini)}</b><span>planejado · ${p.dur} min</span>${Math.abs(atraso) >= 1 ? `<i class="${atraso > 0 ? 'atras' : 'adiant'}">${sinal(atraso)} min</i>` : ''}${dd ? `<i class="dur">${sinal(dd)} na duração</i>` : ''}</div>`;
}
function linhaHTML(l, i, h) {
  const exec = estado.cur.modo === 'exec';
  return `<div class="linha ${l.intervalo ? 'int' : ''} ${l.incluida ? 'incl' : ''}" id="l-${i}" data-i="${i}">
    <div class="l-res">
      <button class="l-alca" aria-label="Arrastar para mudar a ordem (ou Alt e as setas)" title="Arrastar para mudar a ordem">${SVG.grip}</button>
      <div class="l-n">${l.n || '+'}</div>
      ${l.thumb ? `<img class="l-th" data-src="${esc(estado.cur.tid + '/' + l.thumb)}" alt="Slide ${l.n}" data-zoom="${i}">` : '<div class="l-th sem">Atividade incluída</div>'}
      <div><div class="l-et"><i style="background:${corEtapa(doc(), l.etapa)}"></i>${esc(l.etapa)}</div><div class="l-desc">${esc(l.desc)}</div></div>
      <div class="l-hora"><b class="h-ini">${hhmm(h[0])}</b><span class="h-fim">até ${hhmm(h[1])}</span></div>
      ${exec ? planoHTML(l, h) : ''}
      <div class="l-dur"><input type="number" min="0" max="240" value="${Number(l.dur) || 0}" aria-label="Duração em minutos"> min</div>
      <div class="l-ics">${icones(l)}</div>
      <div class="l-acoes"><button class="l-del" title="Retirar esta atividade" aria-label="Retirar esta atividade">${SVG.trash}</button><button class="l-exp" aria-label="Abrir detalhes">▾</button></div>
    </div>
    <div class="l-det"></div>
  </div>`;
}
function ligarLinha(el) {
  const i = Number(el.dataset.i); const l = doc().linhas[i];
  $('.l-res', el).addEventListener('click', e => {
    if (e.target.closest('input,.l-alca,.l-del')) return;
    if (e.target.dataset.zoom !== undefined) { e.stopPropagation(); return abrirLightbox(i); }
    alternar(i);
  });
  $('.l-dur input', el).addEventListener('input', e => { l.dur = Math.max(0, Number(e.target.value) || 0); marcarSujo(); atualizarHorarios(); });
  $('.l-del', el).addEventListener('click', e => { e.stopPropagation(); retirar(i); });
  const alca = $('.l-alca', el);
  alca.addEventListener('pointerdown', e => iniciarArrasto(e, el));
  alca.addEventListener('keydown', e => {
    if (!e.altKey && !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); moverLinha(i, e.key === 'ArrowUp' ? i - 1 : i + 1, true); }
  });
}
function moverLinha(de, para, foco) {
  const D = doc(); if (para < 0 || para >= D.linhas.length || para === de) return;
  const [x] = D.linhas.splice(de, 1); D.linhas.splice(para, 0, x);
  marcarSujo(); desenharSessao();
  if (foco) { const a = $(`#l-${para} .l-alca`); if (a) a.focus(); }
}
function iniciarArrasto(ev, el) {
  if (ev.button !== undefined && ev.button !== 0) return;
  ev.preventDefault(); ev.stopPropagation();
  const cont = $('#s-linhas'); const linhas = $$('.linha', cont); const de = linhas.indexOf(el);
  const r0 = el.getBoundingClientRect(); const dy = ev.clientY - r0.top;
  const fant = el.cloneNode(true); fant.classList.add('fantasma'); fant.removeAttribute('id');
  Object.assign(fant.style, { width: r0.width + 'px', left: r0.left + 'px', top: r0.top + 'px' }); document.body.appendChild(fant);
  const marca = document.createElement('div'); marca.className = 'marca-drop'; cont.insertBefore(marca, el);
  el.classList.add('arrastando'); document.body.classList.add('arrastando-corpo');
  let para = de, rolar = 0, ultimoY = ev.clientY;
  const calcular = y => {
    const outras = linhas.filter(x => x !== el);
    let k = outras.findIndex(x => { const b = x.getBoundingClientRect(); return y < b.top + b.height / 2; });
    if (k < 0) k = outras.length;
    para = k; cont.insertBefore(marca, outras[k] || null);
  };
  const passo = () => { if (rolar) { window.scrollBy(0, rolar); calcular(ultimoY); } };
  const timer = setInterval(passo, 30);
  const mover = e => {
    ultimoY = e.clientY; fant.style.top = (e.clientY - dy) + 'px';
    rolar = e.clientY < 90 ? -14 : (e.clientY > innerHeight - 60 ? 14 : 0);
    calcular(e.clientY);
  };
  const soltar = () => {
    clearInterval(timer); document.removeEventListener('pointermove', mover); document.removeEventListener('pointerup', soltar); document.removeEventListener('pointercancel', soltar);
    fant.remove(); marca.remove(); el.classList.remove('arrastando'); document.body.classList.remove('arrastando-corpo');
    if (para !== de) { moverLinha(de, para); aviso('Ordem alterada. Os horários foram recalculados.'); }
  };
  document.addEventListener('pointermove', mover); document.addEventListener('pointerup', soltar); document.addEventListener('pointercancel', soltar);
}
function retirar(i) {
  const D = doc(); const [x] = D.linhas.splice(i, 1); x.pos = i;
  D.removidas = [...(D.removidas || []), x]; estado.cur.aberta.delete(chaveL(x));
  marcarSujo(); desenharSessao(); aviso(`Atividade retirada: ${x.desc}. Para desfazer, use Restaurar no fim da lista.`);
}
function restaurar(k) {
  const D = doc(); const [x] = D.removidas.splice(k, 1); const pos = Math.min(x.pos ?? D.linhas.length, D.linhas.length); delete x.pos;
  D.linhas.splice(pos, 0, x); marcarSujo(); desenharSessao(); aviso(`Atividade restaurada: ${x.desc}.`);
}
function incluirAtividade() {
  const D = doc(); const ult = D.linhas[D.linhas.length - 1] || {};
  const l = { id: 'x' + Date.now().toString(36), n: null, etapa: ult.etapa || 'Atividade incluída', dur: 5, desc: 'Atividade incluída', incluida: true, fazer: '', falar: '', atencao: '', tempo: [], usar: [] };
  D.linhas.push(l); estado.cur.aberta.add(l.id); marcarSujo(); desenharSessao();
  const el = $(`#l-${D.linhas.length - 1}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = $('.l-det input[data-f=desc]', el); if (inp) inp.select(); }
  aviso('Atividade incluída no fim. Arraste para a posição certa e ajuste a duração.');
}
async function iniciarExec() {
  pedirBaseAntes(async () => {
    const c = estado.cur; const B = c.base.data;
    const x = { iniciada_em: new Date().toISOString(), base_salva_em: B.salva_em, titulo: c.data.titulo, data: c.data.data, versao_material: B.versao_material || '', inicio: B.inicio, linhas: copia(B.linhas), removidas: [] };
    c.exec = { data: x, sha: null }; c.modo = 'exec'; c.sujo.exec = true;
    if (await salvar('exec')) { aviso('Execução iniciada a partir da linha de base.'); if (location.hash !== hashSessao('/execucao')) location.hash = hashSessao('/execucao'); else desenharSessao(); }
  });
}
function recomecarExec() {
  perguntar('Recomeçar a execução a partir da linha de base?', [['Recomeçar', 'prim', async () => {
    const c = estado.cur; const B = c.base.data;
    Object.assign(c.exec.data, { iniciada_em: new Date().toISOString(), base_salva_em: B.salva_em, inicio: B.inicio, linhas: copia(B.linhas), removidas: [] });
    c.sujo.exec = true; if (await salvar('exec')) desenharSessao();
  }], ['Cancelar', '', () => { }]], 'As mudanças feitas na execução serão substituídas pela linha de base salva em ' + quando(estado.cur.base && estado.cur.base.data.salva_em) + '.');
}

function alternar(i, forcar) {
  const el = $(`#l-${i}`); if (!el) return;
  const l = doc().linhas[i]; const k = chaveL(l);
  const abrir = forcar === undefined ? !el.classList.contains('aberta') : forcar;
  el.classList.toggle('aberta', abrir);
  abrir ? estado.cur.aberta.add(k) : estado.cur.aberta.delete(k);
  if (abrir && !$('.l-det', el).dataset.ok) montarDetalhe(el, i);
}
function montarDetalhe(el, i) {
  const l = doc().linhas[i]; const det = $('.l-det', el); det.dataset.ok = '1';
  const ta = (f, rot, cls = '', rows = 4) => `<div class="ed"><label>${rot}</label><textarea data-f="${f}" class="${cls}" rows="${rows}">${esc(Array.isArray(l[f]) ? l[f].join('\n') : (l[f] || ''))}</textarea></div>`;
  const mat = l.material || { tipo: '', pecas: [] };
  det.innerHTML = `
  <div class="col">
    ${l.img ? `<img class="grande" data-src="${esc(estado.cur.tid + '/' + l.img)}" alt="Slide ${l.n}" data-zoom="${i}">` : ''}
    <div class="ed"><label>Descrição da atividade</label><input type="text" data-f="desc" value="${esc(l.desc)}"></div>
    ${l.incluida ? `<div class="ed"><label>Etapa</label><input type="text" data-f="etapa" value="${esc(l.etapa)}"></div>` : ''}
    <div class="grade2">
      <div class="ed"><label>Material</label><select data-m="tipo"><option value="">Nenhum</option><option value="entregar" ${mat.tipo === 'entregar' ? 'selected' : ''}>Entregar (livro dourado)</option><option value="usar" ${mat.tipo === 'usar' ? 'selected' : ''}>Usar (livro prateado)</option></select></div>
      <div class="ed"><label>Formação</label><select data-f="formacao"><option value="">Sem formação definida</option>${Object.entries(FORM).map(([k, r]) => `<option value="${k}" ${l.formacao === k ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
    </div>
    <div class="ed"><label>Peças do material (uma por linha)</label><textarea data-m="pecas" rows="2">${esc((mat.pecas || []).join('\n'))}</textarea></div>
    <div class="ed"><label>Sinais</label><div class="opc"><label><input type="checkbox" data-b="miro" ${l.miro ? 'checked' : ''}> Miro</label><label><input type="checkbox" data-b="chat" ${l.chat ? 'checked' : ''}> Chat</label><label>Momento 4C <input type="text" data-f="momento" value="${esc(l.momento || '')}" style="width:190px;padding:4px 8px;border:1px solid var(--borda);border-radius:8px"></label></div></div>
    ${ta('tempo', 'Tempo interno do slide (uma linha por faixa)', '', 3)}
    ${ta('usar', 'Usar (uma peça por linha)', '', 2)}
    <div class="analise-slot"></div>
  </div>
  <div class="col">
    ${ta('fazer', 'O que fazer', '', 6)}
    ${ta('falar', 'O que falar', 'falar', 9)}
    ${ta('atencao', 'Atenção', '', 3)}
  </div>`;
  lazy(det);
  const g = $('.grande', det); if (g) g.onclick = () => abrirLightbox(i);
  $$('textarea,input[type=text],select', det).forEach(inp => inp.addEventListener('input', () => {
    const f = inp.dataset.f, mm = inp.dataset.m;
    if (f) { l[f] = (f === 'tempo' || f === 'usar') ? inp.value.split('\n').map(s => s.trim()).filter(Boolean) : (f === 'formacao' ? (inp.value || null) : inp.value); }
    if (mm) {
      const tipo = $('[data-m=tipo]', det).value; const pecas = $('[data-m=pecas]', det).value.split('\n').map(s => s.trim()).filter(Boolean);
      l.material = tipo ? { tipo, pecas } : null;
    }
    if (f === 'desc') $('.l-desc', el).textContent = inp.value;
    if (f === 'etapa') $('.l-et', el).lastChild.textContent = inp.value;
    $('.l-ics', el).innerHTML = icones(l);
    marcarSujo();
  }));
  $$('[data-b]', det).forEach(cb => cb.addEventListener('change', () => { l[cb.dataset.b] = cb.checked; $('.l-ics', el).innerHTML = icones(l); marcarSujo(); }));
  $$('textarea', det).forEach(autoAltura);
  if (estado.cur.modo === 'base') pintarAnaliseNaLinha(el, i);
}
function autoAltura(t) { const f = () => { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 4, 900) + 'px'; }; t.addEventListener('input', f); requestAnimationFrame(f); }
function atualizarHorarios() {
  const D = doc(); const h = horarios(D); const total = totalDe(D); const exec = estado.cur.modo === 'exec';
  D.linhas.forEach((l, i) => {
    const el = $(`#l-${i}`); if (!el) return;
    $('.h-ini', el).textContent = hhmm(h[i][0]); $('.h-fim', el).textContent = 'até ' + hhmm(h[i][1]);
    if (exec) { const pl = $('.l-pl', el); if (pl) pl.outerHTML = planoHTML(l, h[i]); }
  });
  $('#s-fim').textContent = hhmm(min(D.inicio) + total); $('#s-tot').textContent = total + ' min';
  const m = estado.cur.meta; const res = m.fim ? min(m.fim) - min(m.inicio || estado.cur.data.inicio) : total;
  $('#s-tot-box').classList.toggle('alerta', total !== res);
  $('#s-tot-box').title = total !== res ? `O horário reservado é de ${res} minutos.` : '';
  $('#s-etapas').innerHTML = barraEtapas(D); ligarEtapas();
}
function marcarSujo(qual) {
  const c = estado.cur; if (!c) return;
  qual = qual || (c.modo === 'exec' ? 'exec' : 'base');
  c.sujo[qual] = true; estado.sujo = true;
  const b = $('#s-salvar'); if (b && ((qual === 'exec') === (c.modo === 'exec'))) b.disabled = false;
  const s = $('#sujo'); if (s) s.textContent = '· alterações não salvas';
  const st = $('.status-linha'); if (st && qual === 'base' && c.modo === 'base') st.innerHTML = statusBase();
}
async function salvar(qual) {
  const c = estado.cur; if (!c) return false;
  const lista = qual ? [qual] : ['base', 'exec'].filter(q => c.sujo[q]);
  if (!lista.length) lista.push(c.modo === 'exec' ? 'exec' : 'base');
  const b = $('#s-salvar'); const rot = b ? b.innerHTML : '';
  if (b) { b.disabled = true; b.textContent = 'Salvando...'; }
  try {
    for (const q of lista) {
      const agora = new Date().toISOString();
      if (q === 'base') {
        c.data.atualizado_em = agora;
        c.sha = await GH.putJSON(c.path, c.data, c.sha, `Time sheet: ${c.treino.cliente} · ${c.data.titulo} (linha de base na página)`);
        const snap = { salva_em: agora, titulo: c.data.titulo, data: c.data.data, versao_material: c.data.versao_material || '', inicio: c.data.inicio, linhas: copia(c.data.linhas), removidas: copia(c.data.removidas || []) };
        const sha = await GH.putJSON(arqBase(c), snap, c.base && c.base.sha, `Linha de base: ${c.treino.cliente} · ${c.data.titulo}`);
        c.base = { data: snap, sha };
      } else if (c.exec) {
        c.exec.data.atualizado_em = agora;
        c.exec.sha = await GH.putJSON(arqExec(c), c.exec.data, c.exec.sha, `Execução: ${c.treino.cliente} · ${c.data.titulo}`);
      }
      c.sujo[q] = false;
    }
    estado.sujo = c.sujo.base || c.sujo.exec;
    aviso(lista.includes('base') && lista.includes('exec') ? 'Linha de base e execução salvas.' : lista[0] === 'base' ? 'Linha de base salva.' : 'Execução salva.');
    if (estado.cur === c && c.modo !== 'comp' && $('#s-linhas')) desenharSessao();
    return true;
  } catch (e) { aviso(e.message, true); if (b) { b.innerHTML = rot; b.disabled = false; } return false; }
}

/* ---------- comparação: linha de base x execução ---------- */
function desenharComparacao() {
  const c = estado.cur, t = c.treino, P = c.data;
  const cab = `<p class="sobr"><a href="#/t/${encodeURIComponent(c.tid)}" style="text-decoration:none">${esc(t.cliente || CLIENTE_PROPRIO)} · ${esc(t.titulo)}</a></p>
  <h1 class="h-sessao">${esc(P.titulo.split(' · ')[0])} <em>${esc(P.titulo.split(' · ').slice(1).join(' · '))}</em></h1>
  <div class="lede" style="margin:0 0 10px">${esc(dataLonga(P.data))}</div>${abas()}`;
  if (!c.base || !c.exec) {
    $('#app').innerHTML = cab + `<div class="vazio">${!c.base ? 'Salve a linha de base e inicie a execução para comparar.' : 'Inicie a execução para comparar com a linha de base.'}</div>`;
    return;
  }
  const B = c.base.data, X = c.exec.data; const hb = horarios(B), hx = horarios(X);
  const tB = totalDe(B), tX = totalDe(X); const fB = min(B.inicio) + tB, fX = min(X.inicio) + tX;
  const ib = new Map(B.linhas.map((l, i) => [chaveL(l), i])); const ix = new Map(X.linhas.map((l, i) => [chaveL(l), i]));
  const comunsB = B.linhas.map(chaveL).filter(k => ix.has(k)); const comunsX = X.linhas.map(chaveL).filter(k => ib.has(k));
  const posB = new Map(comunsB.map((k, j) => [k, j])); const posX = new Map(comunsX.map((k, j) => [k, j]));
  const linhas = [];
  X.linhas.forEach((l, i) => {
    const k = chaveL(l); const j = ib.get(k); const sit = [];
    if (j === undefined) sit.push('Incluída');
    else { if (posB.get(k) !== posX.get(k)) sit.push('Movida'); if ((Number(l.dur) || 0) !== (Number(B.linhas[j].dur) || 0)) sit.push('Duração'); }
    linhas.push({ l, b: j === undefined ? null : { h: hb[j], dur: Number(B.linhas[j].dur) || 0 }, x: { h: hx[i], dur: Number(l.dur) || 0 }, sit });
  });
  B.linhas.forEach((l, j) => { if (!ix.has(chaveL(l))) linhas.push({ l, b: { h: hb[j], dur: Number(l.dur) || 0 }, x: null, sit: ['Retirada'] }); });
  const etB = new Map(), etX = new Map(), ordem = [];
  const soma = (m, l) => { const e = baseEtapa(l.etapa); if (!ordem.includes(e)) ordem.push(e); m.set(e, (m.get(e) || 0) + (Number(l.dur) || 0)); };
  B.linhas.forEach(l => soma(etB, l)); X.linhas.forEach(l => soma(etX, l));
  const cont = s => linhas.filter(r => r.sit.includes(s)).length;
  const cel = v => v === null ? '<td class="vazio-c">—</td>' : `<td>${v}</td>`;
  const dlt = n => `<td class="d ${n > 0 ? 'pos' : n < 0 ? 'neg' : ''}">${n ? sinal(n) + ' min' : '0'}</td>`;
  $('#app').innerHTML = cab + `
  <div class="cmp-cartoes">
    <div class="rb"><small>Início</small><b>${esc(X.inicio)}</b><span class="rb-pl">planejado ${esc(B.inicio)}</span></div>
    <div class="rb ${fX > fB ? 'alerta' : ''}"><small>Término</small><b>${hhmm(fX)}</b><span class="rb-pl">planejado ${hhmm(fB)} · ${sinal(fX - fB)} min</span></div>
    <div class="rb"><small>Total</small><b>${tX} min</b><span class="rb-pl">planejado ${tB} min</span></div>
    <div class="rb"><small>Atividades</small><b>${X.linhas.length}</b><span class="rb-pl">${cont('Movida')} movidas · ${cont('Retirada')} retiradas · ${cont('Incluída')} incluídas · ${cont('Duração')} com duração alterada</span></div>
  </div>
  <p class="meta-p" style="margin:8px 0 0">Linha de base salva em ${esc(quando(B.salva_em))} · execução atualizada em ${esc(quando(X.atualizado_em || X.iniciada_em))}</p>
  <h2>Por etapa</h2>
  <table class="cmp"><thead><tr><th>Etapa</th><th>Planejado</th><th>Executado</th><th>Diferença</th></tr></thead><tbody>
    ${ordem.map(e => `<tr><td><i class="bol" style="background:${corEtapa(B, e) !== '#8D8377' ? corEtapa(B, e) : corEtapa(X, e)}"></i>${esc(e)}</td>${cel((etB.get(e) || 0) + ' min')}${cel((etX.get(e) || 0) + ' min')}${dlt((etX.get(e) || 0) - (etB.get(e) || 0))}</tr>`).join('')}
    <tr class="tot"><td>Total</td><td>${tB} min</td><td>${tX} min</td>${dlt(tX - tB)}</tr>
  </tbody></table>
  <h2>Atividade a atividade</h2>
  <table class="cmp"><thead><tr><th>Slide</th><th>Atividade</th><th>Planejado</th><th>Executado</th><th>Diferença</th><th>Situação</th></tr></thead><tbody>
    ${linhas.map(r => `<tr class="${r.x ? '' : 'ret-l'}"><td class="n">${r.l.n || '+'}</td><td>${esc(r.l.desc)}<small>${esc(r.l.etapa)}</small></td>
      ${cel(r.b ? `${hhmm(r.b.h[0])} · ${r.b.dur} min` : null)}${cel(r.x ? `${hhmm(r.x.h[0])} · ${r.x.dur} min` : null)}
      ${r.b && r.x ? dlt(r.x.dur - r.b.dur) : '<td class="vazio-c">—</td>'}
      <td>${r.sit.length ? r.sit.map(s => `<span class="pilula ${s === 'Retirada' ? 'cinza' : s === 'Incluída' ? 'verde' : ''}">${s}</span>`).join(' ') : '<span class="meta-p">Como planejado</span>'}</td></tr>`).join('')}
  </tbody></table>`;
}

/* ---------- lightbox ---------- */
let lbI = 0;
function abrirLightbox(i) {
  lbI = i; const lb = $('#lightbox'); lb.hidden = false; mostrarLb();
}
function mostrarLb() {
  const d = doc(); const l = d.linhas[lbI]; const h = horarios(d)[lbI];
  const im = $('#lightbox img'); im.removeAttribute('src');
  if (l.img) imgURL(estado.cur.tid + '/' + l.img).then(u => { if (d.linhas[lbI] === l) im.src = u; });
  $('#lightbox figcaption').textContent = `Slide ${l.n} · ${l.desc} · ${hhmm(h[0])} a ${hhmm(h[1])}`;
}
$('#lightbox .lb-fechar').onclick = () => { $('#lightbox').hidden = true; };
$('#lightbox .lb-ant').onclick = () => { lbI = Math.max(0, lbI - 1); mostrarLb(); };
$('#lightbox .lb-prox').onclick = () => { lbI = Math.min(doc().linhas.length - 1, lbI + 1); mostrarLb(); };
$('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') $('#lightbox').hidden = true; });
document.addEventListener('keydown', e => {
  if (!$('#lightbox').hidden) { if (e.key === 'Escape') $('#lightbox').hidden = true; if (e.key === 'ArrowRight') $('#lightbox .lb-prox').click(); if (e.key === 'ArrowLeft') $('#lightbox .lb-ant').click(); return; }
  if (!$('#modal').hidden && e.key === 'Escape') fecharModal();
});

/* ---------- modal ---------- */
function abrirModal(html) { const m = $('#modal'); $('.modal-caixa', m).innerHTML = html; m.hidden = false; $$('[data-fechar]', m).forEach(b => b.onclick = fecharModal); }
function fecharModal() { const m = $('#modal'); if (m) m.hidden = true; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharModal(); });
function perguntar(texto, botoes, detalhe) {
  abrirModal(`<h2 style="margin-top:0">${esc(texto)}</h2>${detalhe ? `<p class="lede">${esc(detalhe)}</p>` : ''}<div class="barra">${botoes.map((b, k) => `<button class="btn ${b[1]}" data-k="${k}">${esc(b[0])}</button>`).join('')}</div>`);
  $$('#modal [data-k]').forEach(btn => btn.onclick = () => { fecharModal(); botoes[Number(btn.dataset.k)][2](); });
}

/* ---------- modo condução ---------- */
let condTimer = null;
function indiceAgora() {
  const d = docConducao(); if (d.data !== hojeISO()) return null;
  const a = agoraMin(); const h = horarios(d);
  const k = h.findIndex(([x, y]) => a >= x && a < y); return k >= 0 ? k : null;
}
function abrirCond() {
  const c = estado.cur; const d = docConducao();
  let i = indiceAgora(); if (i === null) i = 0;
  let inicioSlide = Date.now();
  const div = document.createElement('div'); div.className = 'cond'; div.id = 'cond';
  document.body.appendChild(div); document.body.style.overflow = 'hidden';
  const desenhar = () => {
    const l = d.linhas[i]; const h = horarios(d)[i]; const prox = d.linhas[i + 1];
    div.innerHTML = `
    <header>
      <div><div style="font-size:11px;letter-spacing:.2em;color:#CDBFAE;text-transform:uppercase">${esc(l.etapa)}</div><div style="font-size:20px;font-weight:700">${l.n} · ${esc(l.desc)}</div></div>
      <div class="esp"></div>
      <div style="text-align:right"><div class="agora" id="cd-agora"></div><div style="font-size:12px;color:#CDBFAE">${c.exec ? 'Execução' : 'Linha de base'}: ${hhmm(h[0])} a ${hhmm(h[1])} · ${l.dur} min</div></div>
      <span class="desvio" id="cd-desvio"></span>
      <div class="l-ics">${icones(l)}</div>
      <button class="btn" id="cd-sair">Sair</button>
    </header>
    <div class="slide"><img id="cd-img" alt="Slide ${l.n}"></div>
    <div class="texto">
      ${l.tempo && l.tempo.length ? `<h4>Tempo</h4><p>${l.tempo.map(esc).join('<br>')}</p>` : ''}
      ${l.fazer ? `<h4>Fazer</h4><p>${esc(l.fazer)}</p>` : ''}
      ${l.material && l.material.tipo ? `<h4>${l.material.tipo === 'entregar' ? 'Entregar' : 'Usar'}</h4><p>${(l.material.pecas || []).map(esc).join('<br>')}</p>` : (l.usar && l.usar.length ? `<h4>Usar</h4><p>${l.usar.map(esc).join('<br>')}</p>` : '')}
      ${l.falar ? `<h4>Falar</h4><p class="falar">${esc(l.falar)}</p>` : ''}
      ${l.atencao ? `<h4>Atenção</h4><p>${esc(l.atencao)}</p>` : ''}
    </div>
    <footer>
      <button class="btn" id="cd-ant">‹ Anterior</button>
      <div class="prog" id="cd-prog"><div></div></div>
      <span id="cd-tempo" style="font-size:14px;min-width:120px;text-align:center"></span>
      ${prox ? `<div class="prox"><img id="cd-prox-img" alt=""><span>A seguir: ${prox.n} · ${esc(prox.desc)}</span></div>` : '<div class="prox">Último slide</div>'}
      <button class="btn prim" id="cd-prox">Próximo ›</button>
    </footer>`;
    if (l.img) imgURL(c.tid + '/' + l.img).then(u => { const im = $('#cd-img'); if (im) im.src = u; });
    if (prox && prox.thumb) imgURL(c.tid + '/' + prox.thumb).then(u => { const im = $('#cd-prox-img'); if (im) im.src = u; });
    if (d.linhas[i + 1] && d.linhas[i + 1].img) imgURL(c.tid + '/' + d.linhas[i + 1].img);
    $('#cd-sair').onclick = () => { location.hash = hashSessao(c.exec ? '/execucao' : ''); };
    $('#cd-ant').onclick = () => ir(-1); $('#cd-prox').onclick = () => ir(1);
    tique();
  };
  const ir = k => { const n = Math.min(d.linhas.length - 1, Math.max(0, i + k)); if (n !== i) { i = n; inicioSlide = Date.now(); desenhar(); } };
  const tique = () => {
    const ag = $('#cd-agora'); if (!ag) return;
    const now = new Date(); ag.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const l = d.linhas[i]; const h = horarios(d)[i];
    const dv = $('#cd-desvio');
    const ini0 = min(d.inicio), fimS = horarios(d).slice(-1)[0][1], am = agoraMin();
    if (d.data === hojeISO() && am < ini0) { const f = Math.ceil(ini0 - am); dv.className = 'desvio'; dv.textContent = `Começa em ${f >= 60 ? Math.floor(f / 60) + ' h ' : ''}${f % 60} min`; }
    else if (d.data === hojeISO() && am > fimS + 30) { dv.className = 'desvio'; dv.textContent = 'Encontro encerrado'; }
    else if (d.data === hojeISO()) { const delta = Math.round(am - h[0]); dv.className = 'desvio ' + (delta > 2 ? 'atras' : 'ok'); dv.textContent = delta > 2 ? `${delta} min de atraso` : (delta < -2 ? `${-delta} min adiantado` : 'No horário'); }
    else { dv.className = 'desvio'; dv.textContent = 'Fora do dia do encontro'; }
    const dec = (Date.now() - inicioSlide) / 1000; const plan = (Number(l.dur) || 0) * 60;
    const pr = $('#cd-prog'); pr.classList.toggle('estouro', plan > 0 && dec > plan); $('div', pr).style.width = Math.min(100, plan ? dec / plan * 100 : 100) + '%';
    const mm = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    $('#cd-tempo').textContent = `${mm(dec)} de ${l.dur}:00`;
  };
  const tecla = e => {
    if (!$('#cond')) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); ir(1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); ir(-1); }
    if (e.key === 'Escape') $('#cd-sair').click();
  };
  document.addEventListener('keydown', tecla); div._tecla = tecla;
  condTimer = setInterval(tique, 1000);
  desenhar();
}
function fecharCond() { const c = $('#cond'); if (c) { document.removeEventListener('keydown', c._tecla); c.remove(); } clearInterval(condTimer); document.body.style.overflow = ''; }

/* ---------- análise da transcrição ---------- */
const PROMPT_SISTEMA = `Você é um especialista sênior em facilitação de aprendizagem de adultos (Training from the Back of the Room, ciclo 4C de Sharon Bowman, neurociência da aprendizagem) e analisa a condução de um encontro de Gino Terentim a partir da transcrição da gravação e do roteiro planejado (o time sheet do facilitador).

Objetivo: para cada etapa do roteiro, dizer como ela aconteceu, com base em evidências da transcrição, e registrar: pontos fortes, melhorias para o facilitador, melhorias para o material e o que o facilitador fez melhor do que o roteiro, para incorporar ao material.

Regras:
1. Cada afirmação se apoia na transcrição, com uma evidência curta: um trecho literal de até 25 palavras ou a marca de tempo aproximada. Não invente o que não está na transcrição. Se uma etapa não aparece na transcrição (por exemplo, trabalho em salas simultâneas que não foi gravado), diga isso e avalie apenas o que foi gravado.
2. Tom gentil e respeitoso. Cada crítica vem acompanhada de reconhecimento sincero, apoiado em fatos. Sem bajulação e sem elogio genérico.
3. Português do Brasil, registro executivo, elegante e preciso, em frases afirmativas. Proibido: travessão; a construção "não é X, é Y" e variações; "X entrou, Y saiu"; as palavras levar, deu, puxar, virar, travar, rodar, dono, zona, cruzar, botar, fatiar, chato, ensaio, mindset; "sala" ou "mesa" como sujeito da frase.
4. Tempo: use as marcas de tempo da transcrição para estimar o início e a duração real de cada etapa e compare com o planejado. Se a transcrição não tiver marcas de tempo, estime pela sequência e diga que é estimativa.
5. Melhorias no material: aponte o número do slide e a mudança concreta (texto, exemplo, instrução, tempo).
6. Melhor que o roteiro: quando o que o facilitador disse ou fez supera o roteiro (exemplo mais claro, pergunta melhor, transição mais fluida, instrução mais simples), registre o trecho dito e proponha a nova redação completa para o campo do slide (falar, fazer ou atencao), pronta para substituir o texto atual, no estilo do roteiro: fala na primeira pessoa do facilitador, frases curtas e claras.
7. Perguntas da turma: registre as principais perguntas, a resposta dada e, quando couber, uma resposta mais completa.
8. Participantes: cite pelo nome apenas quando isso for necessário para entender a situação; não registre dados pessoais.
9. Avaliação de 1 a 5 por etapa: 5 excelente, 4 muito bom, 3 adequado, 2 precisa de ajustes, 1 não aconteceu como planejado.
Registre o resultado chamando a ferramenta registrar_analise.`;
function ferramentaAnalise(d) {
  const nomes = [...new Set(d.linhas.map(l => l.etapa))];
  const item = (props, req) => ({ type: 'object', properties: props, required: req });
  const s = { type: 'string' };
  return {
    name: 'registrar_analise',
    description: 'Registra a análise completa da condução do encontro, etapa por etapa.',
    input_schema: item({
      sintese: { type: 'string', description: 'Síntese do encontro em 3 a 5 frases.' },
      aderencia_tempo: { type: 'string', description: 'Como o encontro se comportou em relação ao horário planejado.' },
      pontos_fortes_gerais: { type: 'array', items: s },
      prioridades: { type: 'array', items: s, description: 'As três melhorias de maior impacto para o próximo encontro.' },
      etapas: {
        type: 'array', items: item({
          etapa: { type: 'string', enum: nomes },
          inicio_real: { type: ['string', 'null'], description: 'HH:MM estimado.' },
          duracao_real_min: { type: ['number', 'null'] },
          avaliacao: { type: 'integer', minimum: 1, maximum: 5 },
          o_que_aconteceu: { type: 'string' },
          pontos_fortes: { type: 'array', items: item({ texto: s, evidencia: s }, ['texto']) },
          melhorias_facilitador: { type: 'array', items: item({ texto: s, evidencia: s, sugestao: s }, ['texto']) },
          melhorias_material: { type: 'array', items: item({ texto: s, slide: { type: ['integer', 'null'] }, sugestao: s }, ['texto']) },
          melhor_que_roteiro: { type: 'array', items: item({ texto: s, slide: { type: 'integer' }, campo: { type: 'string', enum: ['falar', 'fazer', 'atencao'] }, trecho_dito: s, nova_redacao: s }, ['texto', 'slide', 'campo', 'nova_redacao']) },
        }, ['etapa', 'avaliacao', 'o_que_aconteceu', 'pontos_fortes', 'melhorias_facilitador', 'melhorias_material', 'melhor_que_roteiro']),
      },
      perguntas_da_turma: { type: 'array', items: item({ pergunta: s, resposta_dada: s, sugestao: s }, ['pergunta']) },
    }, ['sintese', 'aderencia_tempo', 'pontos_fortes_gerais', 'prioridades', 'etapas']),
  };
}
function roteiroTexto(d, t) {
  const h = horarios(d); const et = etapasDe(d);
  let s = `TREINAMENTO: ${t.cliente} · ${t.titulo}\nENCONTRO: ${d.titulo} · ${dataLonga(d.data)} · início planejado ${d.inicio}\n\nETAPAS PLANEJADAS\n`;
  et.forEach(e => { const p = (d.etapas || []).find(x => x.nome === e.nome); s += `- ${e.nome}: ${hhmm(e.ini)} a ${hhmm(e.fim)} (${e.dur} min)${p && p.produto ? '. Produto esperado: ' + p.produto : ''}\n`; });
  s += '\nSLIDES\n';
  d.linhas.forEach((l, i) => { s += `\n### Slide ${l.n} · ${hhmm(h[i][0])} a ${hhmm(h[i][1])} · ${l.dur} min · ${l.etapa}\n${l.desc}\nFAZER: ${l.fazer || ''}\nFALAR: ${l.falar || ''}\n`; });
  return s;
}
async function lerTranscricao(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith('.docx')) {
    const z = await JSZip.loadAsync(file); const xml = await z.file('word/document.xml').async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml'); const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    return [...doc.getElementsByTagNameNS(W, 'p')].map(p => [...p.getElementsByTagNameNS(W, 't')].map(x => x.textContent).join('')).filter(x => x.trim()).join('\n');
  }
  let t = await file.text();
  if (n.endsWith('.vtt') || n.endsWith('.srt')) {
    const out = []; let ts = '';
    for (const lin of t.split(/\r?\n/)) {
      const x = lin.trim(); if (!x || x === 'WEBVTT' || /^\d+$/.test(x) || /^NOTE\b/.test(x)) continue;
      if (/-->/.test(x)) { ts = x.split(/\s*-->/)[0].replace(/[.,]\d{3}$/, ''); continue; }
      const v = x.replace(/<v\s+([^>]+)>/, '$1: ').replace(/<[^>]+>/g, '');
      out.push((ts ? `[${ts}] ` : '') + v); ts = '';
    }
    t = out.join('\n');
  }
  return t;
}
async function chamarClaude(sistema, usuario, ferramenta, prog) {
  const c = cfg();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': c.akey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: c.modelo || MODELOS[0][0], max_tokens: 32000, stream: true, system: sistema, tools: [ferramenta], tool_choice: { type: 'tool', name: ferramenta.name }, messages: [{ role: 'user', content: usuario }] }),
  });
  if (!r.ok) { let m = ''; try { m = (await r.json()).error.message; } catch (e) { } throw new Error(`API da Anthropic (${r.status}): ${m || 'erro na chamada'}`); }
  const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = '', json = '', fim = '', uso = {};
  for (; ;) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let k;
    while ((k = buf.indexOf('\n\n')) >= 0) {
      const ev = buf.slice(0, k); buf = buf.slice(k + 2);
      const dl = ev.split('\n').find(x => x.startsWith('data:')); if (!dl) continue;
      let o; try { o = JSON.parse(dl.slice(5)); } catch (e) { continue; }
      if (o.type === 'message_start' && o.message && o.message.usage) uso = { ...o.message.usage };
      else if (o.type === 'content_block_delta' && o.delta && o.delta.type === 'input_json_delta') { json += o.delta.partial_json; prog(json.length); }
      else if (o.type === 'message_delta') { fim = o.delta && o.delta.stop_reason; if (o.usage) uso = { ...uso, ...o.usage }; }
      else if (o.type === 'error') throw new Error('API da Anthropic: ' + ((o.error && o.error.message) || 'erro durante a resposta'));
    }
  }
  if (fim === 'max_tokens') throw new Error('A resposta passou do limite de tamanho. Tente de novo com o modelo Sonnet ou com uma transcrição mais curta.');
  return { resultado: JSON.parse(json), uso };
}
async function carregarUltimaAnalise() {
  const c = estado.cur; const lst = c.data.analises || []; if (!lst.length) return;
  try { const a = await GH.json(lst[lst.length - 1].arquivo); if (estado.cur === c) { estado.analise = a.data; $$('#s-linhas .linha.aberta').forEach(el => pintarAnaliseNaLinha(el, Number(el.dataset.i))); } } catch (e) { }
}
function itensDoSlide(an, n) {
  const out = [];
  (an.resultado.etapas || []).forEach((e, ei) => {
    (e.melhorias_material || []).forEach(x => { if (x.slide === n) out.push({ tipo: 'mat', x }); });
    (e.melhor_que_roteiro || []).forEach((x, xi) => { if (x.slide === n) out.push({ tipo: 'melhor', x, ei, xi }); });
  });
  return out;
}
function pintarAnaliseNaLinha(el, i) {
  const slot = $('.analise-slot', el); if (!slot || !estado.analise) return;
  const l = doc().linhas[i]; if (!l || !l.n) { slot.innerHTML = ''; return; } const it = itensDoSlide(estado.analise, l.n); if (!it.length) { slot.innerHTML = ''; return; }
  slot.innerHTML = `<div class="analise-mini"><h4>Da última análise</h4>${it.map(o => o.tipo === 'mat' ? `<p><b class="h-mat">Material:</b> ${esc(o.x.texto)}${o.x.sugestao ? ` <span class="sug">${esc(o.x.sugestao)}</span>` : ''}</p>` : `<p><b class="h-melhor">Melhor que o roteiro (${esc(o.x.campo)}):</b> ${esc(o.x.texto)} <button class="btn peq" data-ap="${o.ei}:${o.xi}">Aplicar ao roteiro</button></p>`).join('')}</div>`;
  $$('[data-ap]', slot).forEach(b => b.onclick = () => { const [ei, xi] = b.dataset.ap.split(':').map(Number); aplicarSugestao(estado.analise.resultado.etapas[ei].melhor_que_roteiro[xi]); });
}
function aplicarSugestao(x) {
  const d = estado.cur.data; const i = d.linhas.findIndex(l => l.n === x.slide); if (i < 0) return aviso('Slide não encontrado no roteiro.', true);
  const l = d.linhas[i]; const campo = x.campo || 'falar';
  abrirModal(`<button class="btn peq fechar" data-fechar>Fechar</button><p class="sobr">Aplicar ao roteiro · slide ${l.n}</p><h2 style="margin-top:0">${esc(l.desc)}</h2>
    <div class="grade2"><div class="ed"><label>Texto atual (${esc(campo)})</label><textarea rows="12" readonly>${esc(l[campo] || '')}</textarea></div>
    <div class="ed"><label>Nova redação proposta (editável)</label><textarea id="ap-nova" rows="12">${esc(x.nova_redacao || '')}</textarea></div></div>
    ${x.trecho_dito ? `<p class="nota"><b>O que foi dito na sessão:</b> ${esc(x.trecho_dito)}</p>` : ''}
    <div class="barra"><button class="btn prim" id="ap-ok">Substituir no roteiro</button><button class="btn" data-fechar>Manter o texto atual</button></div>`);
  $$('#modal [data-fechar]').forEach(b => b.onclick = () => { fecharModal(); voltarAnalise(); });
  $('#ap-ok').onclick = () => {
    l[campo] = $('#ap-nova').value; x.aplicado = true; marcarSujo('base'); fecharModal();
    const el = estado.cur.modo === 'base' ? $(`#l-${i}`) : null; if (el) { const det = $('.l-det', el); delete det.dataset.ok; det.innerHTML = ''; alternar(i, true); }
    aviso(`Aplicado ao slide ${l.n}. Clique em Salvar a linha de base para gravar.`);
    voltarAnalise();
  };
}
function voltarAnalise() { if (location.hash.endsWith('/analise')) abrirAnalise(); }
function estrelas(n) { n = Math.max(0, Math.min(5, Number(n) || 0)); return '★'.repeat(n) + '☆'.repeat(5 - n); }
function analiseHTML(an) {
  const r = an.resultado; const d = estado.cur.data; const et = etapasDe(d);
  const lista = (arr, f) => arr && arr.length ? `<ul>${arr.map(f).join('')}</ul>` : '<p class="sug">Nada a registrar.</p>';
  return `
  <div class="an-geral">
    <p class="sobr">Visão geral · ${esc(new Date(an.criado_em).toLocaleString('pt-BR'))} · ${esc(an.modelo)}</p>
    <p>${esc(r.sintese)}</p>
    <p><b>Tempo:</b> ${esc(r.aderencia_tempo)}</p>
    <div class="grade2">
      <div class="an-bloco"><h4 class="h-forte">Pontos fortes do encontro</h4>${lista(r.pontos_fortes_gerais, x => `<li>${esc(x)}</li>`)}</div>
      <div class="an-bloco"><h4 class="h-fac">Prioridades para o próximo</h4>${lista(r.prioridades, x => `<li>${esc(x)}</li>`)}</div>
    </div>
  </div>
  ${(r.etapas || []).map((e, ei) => { const p = et.find(x => x.nome === e.etapa); return `
  <div class="an-et">
    <header><i style="width:12px;height:12px;border-radius:50%;background:${p ? p.cor : '#8D8377'}"></i><h3>${esc(e.etapa)}</h3><span class="estrelas" title="${e.avaliacao} de 5">${estrelas(e.avaliacao)}</span>
    <span class="pilula cinza">Planejado: ${p ? hhmm(p.ini) + ' · ' + p.dur + ' min' : 'sem correspondência'}</span>
    ${e.inicio_real || e.duracao_real_min ? `<span class="pilula">Real: ${esc(e.inicio_real || '?')}${e.duracao_real_min ? ' · ' + Math.round(e.duracao_real_min) + ' min' : ''}</span>` : ''}</header>
    <p>${esc(e.o_que_aconteceu)}</p>
    <div class="grade2">
      <div class="an-bloco"><h4 class="h-forte">Pontos fortes</h4>${lista(e.pontos_fortes, x => `<li>${esc(x.texto)}${x.evidencia ? `<span class="ev">“${esc(x.evidencia)}”</span>` : ''}</li>`)}</div>
      <div class="an-bloco"><h4 class="h-fac">Melhorias para o facilitador</h4>${lista(e.melhorias_facilitador, x => `<li>${esc(x.texto)}${x.evidencia ? `<span class="ev">“${esc(x.evidencia)}”</span>` : ''}${x.sugestao ? `<span class="sug">${esc(x.sugestao)}</span>` : ''}</li>`)}</div>
    </div>
    <div class="an-bloco"><h4 class="h-mat">Melhorias no material</h4>${lista(e.melhorias_material, x => `<li>${x.slide ? `<b>Slide ${x.slide}.</b> ` : ''}${esc(x.texto)}${x.sugestao ? `<span class="sug">${esc(x.sugestao)}</span>` : ''}</li>`)}</div>
    <div class="an-bloco"><h4 class="h-melhor">O que ficou melhor do que o roteiro</h4>${(e.melhor_que_roteiro || []).length ? e.melhor_que_roteiro.map((x, xi) => `
      <div class="melhor"><b>Slide ${esc(x.slide)} · ${esc(x.campo)}.</b> ${esc(x.texto)}
      ${x.trecho_dito ? `<div class="dito">Dito na sessão: “${esc(x.trecho_dito)}”</div>` : ''}
      <div class="nova"><b>Nova redação:</b> ${nl2br(x.nova_redacao)}</div>
      <button class="btn peq" data-ap="${ei}:${xi}">${x.aplicado ? 'Aplicado · revisar' : 'Aplicar ao roteiro'}</button></div>`).join('') : '<p class="sug">Nada a registrar.</p>'}</div>
  </div>`; }).join('')}
  ${(r.perguntas_da_turma || []).length ? `<div class="an-et"><header><h3>Perguntas da turma</h3></header><div class="an-bloco">${lista(r.perguntas_da_turma, x => `<li><b>${esc(x.pergunta)}</b>${x.resposta_dada ? `<span class="sug">Resposta dada: ${esc(x.resposta_dada)}</span>` : ''}${x.sugestao ? `<span class="sug">Para completar: ${esc(x.sugestao)}</span>` : ''}</li>`)}</div></div>` : ''}`;
}
function ligarAplicar(root, an) { $$('[data-ap]', root).forEach(b => b.onclick = () => { const [ei, xi] = b.dataset.ap.split(':').map(Number); estado.analise = an; aplicarSugestao(an.resultado.etapas[ei].melhor_que_roteiro[xi]); }); }
function abrirAnalise() {
  const c = estado.cur; const d = c.data; const lst = d.analises || [];
  const voltar = `#/t/${encodeURIComponent(c.tid)}/${encodeURIComponent(c.sid)}`;
  abrirModal(`<a class="btn peq fechar" href="${voltar}">Fechar</a>
    <p class="sobr">Análise da condução</p><h2 style="margin-top:0">${esc(d.titulo)} <em>pela transcrição.</em></h2>
    <p class="lede">Carregue a transcrição da gravação (.docx do Teams, .vtt, .srt ou .txt). A análise compara o que aconteceu com o roteiro, etapa por etapa, e propõe ajustes para você e para o material.</p>
    ${cfg().akey ? '' : '<div class="nota"><b>Falta a chave da Anthropic.</b> Informe a chave em <a href="#/config">Conexões</a> para usar a análise.</div>'}
    <div class="form" style="max-width:none">
      <div class="grade3">
        <div class="campo"><label>Transcrição</label><input type="file" id="an-arq" accept=".docx,.txt,.vtt,.srt,.md"></div>
        <div class="campo"><label>Hora real do início da gravação</label><input type="time" id="an-ini" value="${esc(d.inicio)}"></div>
        <div class="campo"><label>Modelo</label><select id="an-mod">${MODELOS.map(([v, r]) => `<option value="${v}" ${(cfg().modelo || MODELOS[0][0]) === v ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      </div>
      <div class="campo"><label>Contexto para a análise (opcional)</label><textarea id="an-obs" rows="2" placeholder="Ex.: a turma entrou com 10 minutos de atraso; as salas não foram gravadas."></textarea></div>
      <label style="font-size:13px"><input type="checkbox" id="an-guardar"> Guardar uma cópia do texto da transcrição no repositório privado</label>
      <div class="barra"><button class="btn prim" id="an-ir" ${cfg().akey ? '' : 'disabled'}>${SVG.spark} Analisar</button><span id="an-status" style="font-size:13px;color:var(--cinza2)"></span></div>
      <div id="an-prog" hidden class="prog-an"><div></div></div>
    </div>
    ${lst.length ? `<h3>Análises anteriores</h3><div class="barra">${lst.map((a, k) => `<button class="btn peq" data-ant="${k}">${esc(new Date(a.criado_em).toLocaleString('pt-BR'))} · ${esc(a.transcricao || '')}</button>`).join('')}</div>` : ''}
    <div id="an-res"></div>`);
  $('#modal .fechar').onclick = () => fecharModal();
  $$('[data-ant]').forEach(b => b.onclick = async () => {
    const a = lst[Number(b.dataset.ant)]; $('#an-res').innerHTML = '<p>Carregando...</p>';
    try { const j = await GH.json(a.arquivo); $('#an-res').innerHTML = analiseHTML(j.data); ligarAplicar($('#an-res'), j.data); } catch (e) { $('#an-res').innerHTML = `<p>${esc(e.message)}</p>`; }
  });
  if (estado.analise && lst.length) { $('#an-res').innerHTML = analiseHTML(estado.analise); ligarAplicar($('#an-res'), estado.analise); }
  $('#an-ir').onclick = async () => {
    const f = $('#an-arq').files[0]; if (!f) return aviso('Escolha o arquivo da transcrição.', true);
    const st = $('#an-status'); const pg = $('#an-prog'); const btn = $('#an-ir');
    btn.disabled = true; pg.hidden = false;
    try {
      st.textContent = 'Lendo a transcrição...';
      const texto = await lerTranscricao(f);
      if (texto.length < 500) throw new Error('A transcrição parece vazia ou curta demais.');
      const modelo = $('#an-mod').value; const c2 = cfg(); c2.modelo = modelo; setCfg(c2);
      const usuario = `${roteiroTexto(c.base ? { ...d, inicio: c.base.data.inicio, linhas: c.base.data.linhas } : d, c.treino)}\n\nINÍCIO REAL DA GRAVAÇÃO: ${$('#an-ini').value || d.inicio}\nCONTEXTO DO FACILITADOR: ${$('#an-obs').value || 'nenhum'}\n\nTRANSCRIÇÃO (${f.name})\n${texto}`;
      st.textContent = `Transcrição com ${Math.round(texto.length / 1000)} mil caracteres. Enviando para análise; costuma levar alguns minutos...`;
      const t0 = Date.now();
      const { resultado, uso } = await chamarClaude(PROMPT_SISTEMA, usuario, ferramentaAnalise(d), n => { st.textContent = `Recebendo a análise... ${Math.round(n / 1000)} mil caracteres · ${Math.round((Date.now() - t0) / 1000)} s`; });
      const carimbo = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
      const an = { sessao: c.sid, titulo: d.titulo, criado_em: new Date().toISOString(), modelo, transcricao: f.name, inicio_real: $('#an-ini').value, contexto: $('#an-obs').value, uso, resultado };
      st.textContent = 'Gravando a análise no repositório privado...';
      const arq = `${c.tid}/analises/${c.sid}-${carimbo}.json`;
      await GH.putJSON(arq, an, null, `Análise da condução: ${d.titulo}`);
      let arqTx = null;
      if ($('#an-guardar').checked) { arqTx = `${c.tid}/transcricoes/${c.sid}-${carimbo}.txt`; await GH.put(arqTx, texto, null, `Transcrição: ${d.titulo}`); }
      const fresco = await GH.json(c.path);
      const ref = { arquivo: arq, criado_em: an.criado_em, modelo, transcricao: f.name, copia: arqTx };
      fresco.data.analises = [...(fresco.data.analises || []), ref];
      c.sha = await GH.putJSON(c.path, fresco.data, fresco.sha, `Referência da análise: ${d.titulo}`);
      d.analises = fresco.data.analises;
      if (estado.sujo) aviso('Análise gravada. As suas edições locais continuam pendentes: salve antes de sair.');
      estado.analise = an; st.textContent = 'Análise concluída e gravada.'; pg.hidden = true;
      $('#an-res').innerHTML = analiseHTML(an); ligarAplicar($('#an-res'), an);
    } catch (e) { st.textContent = ''; pg.hidden = true; aviso(e.message, true); }
    finally { btn.disabled = false; }
  };
}

rota();
