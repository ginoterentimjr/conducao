'use strict';
/* Radar de editais · Gino Terentim.
   Código público. Os dados ficam no repositório privado de dados (pasta radar-editais/), lidos e gravados
   pela API do GitHub com o mesmo token da página de condução, guardado só no localStorage deste navegador.
   radar.json é gravado apenas pela rotina de varredura; esta página grava apenas acompanhamento.json. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = s => esc(s).replace(/\n/g, '<br>');
const CFGK = 'conducao.cfg.v1';
const REPO_PADRAO = 'ginoterentimjr/conducao-dados';
const PASTA = 'radar-editais/';
const PREFK = 'radar.pref.v1';

const STATUS = [
  { n: 'Novo', cor: '#3F6E8C', g: 'aberto' },
  { n: 'Em análise', cor: '#B8912F', g: 'aberto' },
  { n: 'Em preparação', cor: '#E5662C', g: 'aberto' },
  { n: 'Proposta enviada', cor: '#B04A1C', g: 'aberto' },
  { n: 'Em julgamento', cor: '#7A4E6E', g: 'aberto' },
  { n: 'Ganho', cor: '#5E7D52', g: 'encerrado' },
  { n: 'Perdido', cor: '#8D8377', g: 'encerrado' },
  { n: 'Descartado', cor: '#A89C8E', g: 'encerrado' },
  { n: 'Encerrado sem resultado', cor: '#A89C8E', g: 'encerrado' },
  { n: 'Prazo encerrado', cor: '#C9BFB2', g: 'encerrado', derivado: true },
];
const COR = Object.fromEntries(STATUS.map(s => [s.n, s.cor]));
const ABERTOS = STATUS.filter(s => s.g === 'aberto').map(s => s.n);
const FONTES = ['PNCP', 'Carta-convite', 'SAP Ariba', 'Portal próprio do contratante', 'Convite direto', 'Outra'];

/* ---------- configuração ---------- */
function cfg() { try { return JSON.parse(localStorage.getItem(CFGK)) || {}; } catch (e) { return {}; } }
function setCfg(c) { localStorage.setItem(CFGK, JSON.stringify(c)); }
function repo() { return (cfg().repo || REPO_PADRAO).trim(); }
function pref() { try { return JSON.parse(localStorage.getItem(PREFK)) || {}; } catch (e) { return {}; } }
function setPref(p) { try { localStorage.setItem(PREFK, JSON.stringify({ ...pref(), ...p })); } catch (e) { } }

/* ---------- utilidades ---------- */
function b64enc(str) { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
function b64dec(b64) { const s = atob(b64.replace(/\s/g, '')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return new TextDecoder().decode(b); }
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brl = v => (v === null || v === undefined || v === '' || Number(v) <= 1) ? 'Não informado' : BRL.format(Number(v));
function dt(iso) { if (!iso) return null; const d = new Date(iso.length === 10 ? iso + 'T23:59' : iso); return isNaN(d) ? null : d; }
function dataBR(iso, comHora) { const d = dt(iso); if (!d) return 'Não informado'; const s = d.toLocaleDateString('pt-BR'); return comHora && iso.length > 10 ? `${s} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : s; }
function diasAte(iso) { const d = dt(iso); return d ? (d - new Date()) / 864e5 : null; }
function prazoTxt(iso) {
  const d = diasAte(iso); if (d === null) return '';
  if (d > 180) return 'inscrição aberta';
  if (d < 0) { const n = Math.ceil(-d); return n <= 1 ? 'encerrado' : `encerrado há ${n} dias`; }
  if (d < 1 && dt(iso).toDateString() === new Date().toDateString()) return 'hoje';
  const n = Math.ceil(d); return n <= 1 ? 'amanhã' : `em ${n} dias`;
}
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const agoraISO = () => { const d = new Date(); return `${hojeISO()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
function aviso(msg, erro) { const a = $('#aviso'); a.textContent = msg; a.className = 'aviso' + (erro ? ' erro' : ''); a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { a.hidden = true; }, erro ? 9000 : 3800); }
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const MINUSC = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'a', 'o', 'na', 'no', 'nas', 'nos', 'com', 'por']);
const SIGLAS = new Set(['TI', 'TIC', 'IA', 'SUS', 'TEA', 'CRAS', 'PAIF', 'ME', 'EPP', 'MEI', 'LGPD', 'ICMS', 'EAD', 'SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'GO', 'DF', 'PA', 'PI', 'CE', 'BA', 'RO', 'AL', 'PB', 'MT', 'MS', 'AGU', 'IMAP', 'CRC', 'CRA', 'FIMES', 'CIMAG', 'INPACTA', 'SOMA', 'DNIT', 'MEC', 'SAP', 'GMO', 'RFP', 'II', 'III']);
const ACENTOS = { ministerio: 'ministério', saude: 'saúde', fundacao: 'fundação', administracao: 'administração', publica: 'pública', publico: 'público', educacao: 'educação', municipio: 'município', consorcio: 'consórcio', avancados: 'avançados', parana: 'paraná', rondonia: 'rondônia', sao: 'são', uniao: 'união', multifinalitario: 'multifinalitário', camara: 'câmara', seguranca: 'segurança', justica: 'justiça', aeronautica: 'aeronáutica', agencia: 'agência', eletrica: 'elétrica', gestao: 'gestão', tecnica: 'técnica', tecnicos: 'técnicos', politica: 'política', ciencia: 'ciência', inovacao: 'inovação', regiao: 'região', previdencia: 'previdência', assistencia: 'assistência', logistica: 'logística', capacitacao: 'capacitação', formacao: 'formação', informacao: 'informação', comunicacao: 'comunicação', goias: 'goiás', piaui: 'piauí', ceara: 'ceará', amapa: 'amapá', maranhao: 'maranhão', espirito: 'espírito', para: 'para' };
const acento = w => { const k = w.toLowerCase(); const r = ACENTOS[k]; if (!r || r === k) return w; return w === w.toUpperCase() ? r.toUpperCase() : (w[0] === w[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r); };
const maiusc = t => { const l = String(t || '').replace(/[^A-Za-zÀ-ÿ]/g, ''); return l.length > 6 && l === l.toUpperCase(); };
function nomeBonito(t) {
  if (!maiusc(t)) return t || '';
  return String(t).toLowerCase().split(/(\s+|-|\/)/).map((w, i) => { const W = w.toUpperCase(); if (SIGLAS.has(W.replace(/[(),.;:]/g, ''))) return W; if (i > 0 && MINUSC.has(w)) return w; return acento(w.charAt(0).toUpperCase() + w.slice(1)); }).join('');
}
function textoBonito(t) {
  if (!maiusc(t)) return t || '';
  const s = String(t).toLowerCase().replace(/[a-zà-ÿ0-9]+/g, w => SIGLAS.has(w.toUpperCase()) && w.length <= 5 && !MINUSC.has(w) ? w.toUpperCase() : acento(w));
  return s.replace(/(^\s*|[.!?]\s+)([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
}

/* ---------- GitHub (repositório privado de dados) ---------- */
function ghErro(r, p) {
  const m = { 401: 'O token do GitHub não foi aceito (inválido ou expirado). Atualize em Conexões.', 403: 'O token não tem permissão para esse repositório. Confira, em Conexões, se ele dá leitura e gravação ao conteúdo de ' + repo() + '.', 404: 'Não encontrado no repositório de dados: ' + p, 409: 'O arquivo mudou em outro lugar desde que foi aberto.', 422: 'O GitHub recusou a gravação de ' + p + '.' }[r.status];
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
  async put(p, texto, sha, msg) {
    const body = { message: msg, content: b64enc(texto) }; if (sha) body.sha = sha;
    const r = await fetch(this.url(p), { method: 'PUT', headers: { ...this.hdr(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw ghErro(r, p);
    return (await r.json()).content.sha;
  },
  async testar() { const r = await fetch(`https://api.github.com/repos/${repo()}`, { headers: this.hdr(), cache: 'no-store' }); if (!r.ok) throw ghErro(r, repo()); return r.json(); },
};

/* ---------- estado ---------- */
const estado = { radar: null, acomp: {}, acompSha: null, carregado: false };
async function carregarAcomp() {
  try { const r = await GH.json(PASTA + 'acompanhamento.json'); estado.acomp = r.data || {}; estado.acompSha = r.sha; }
  catch (e) { if (e.status === 404) { estado.acomp = {}; estado.acompSha = null; } else throw e; }
}
async function carregar() {
  const r = await GH.json(PASTA + 'radar.json');
  estado.radar = r.data; await carregarAcomp(); estado.carregado = true;
}
async function salvarAcomp(id, entrada, msg) {
  for (let t = 0; t < 3; t++) {
    const novo = { ...estado.acomp }; if (entrada === null) delete novo[id]; else novo[id] = entrada;
    try { estado.acompSha = await GH.put(PASTA + 'acompanhamento.json', JSON.stringify(novo, null, 1) + '\n', estado.acompSha, msg); estado.acomp = novo; return; }
    catch (e) { if ((e.status === 409 || e.status === 422) && t < 2) { await carregarAcomp(); continue; } throw e; }
  }
}

/* ---------- dados combinados ---------- */
function todos() {
  const lista = (estado.radar?.editais || []).map(e => ({ ...e, orgao: nomeBonito(e.orgao), unidade: nomeBonito(e.unidade), municipio: nomeBonito(e.municipio), objeto: textoBonito(e.objeto), ac: estado.acomp[e.id] || {} }));
  for (const [id, a] of Object.entries(estado.acomp)) if (a && a.manual) lista.push({ ...a.manual, id, fonte: a.manual.fonte || 'Outra', manual: true, aderencia: a.manual.aderencia || { faixa: 'Manual' }, ac: a });
  return lista;
}
function st(e) { const s = e.ac.status || 'Novo'; if (s === 'Novo' && diasAte(e.prazo_proposta) !== null && diasAte(e.prazo_proposta) < 0) return 'Prazo encerrado'; return s; }
const faixa = e => e.aderencia?.faixa || (e.manual ? 'Manual' : 'Baixa');
const unidadeDe = e => { const u = (e.unidade || '').trim(); return u && !/^unidade [uú]nica$/i.test(u) && norm(u) !== norm(e.orgao) ? u : ''; };
const aderOrdem = { Manual: 0, Alta: 1, 'Média': 2, Baixa: 3 };

/* ---------- rotas ---------- */
function rota() {
  const h = location.hash.replace(/^#/, '') || '/';
  $$('.topo-nav a').forEach(a => a.classList.toggle('ativo', (a.dataset.nav === 'config') === (h === '/config') && a.dataset.nav !== 'conducao'));
  if (h === '/config' || !cfg().token) return vConfig(!cfg().token && h !== '/config');
  if (!estado.carregado) return vCarregar();
  vHome();
  const m = h.match(/^\/e\/(.+)$/); if (m) abrirDetalhe(decodeURIComponent(m[1]));
}
window.addEventListener('hashchange', rota);

async function vCarregar() {
  $('#app').innerHTML = '<div class="vazio">Carregando o radar…</div>';
  try { await carregar(); rota(); }
  catch (e) { $('#app').innerHTML = `<div class="vazio">${esc(e.message)}<br><br><a class="btn" href="#/config">Conexões</a> <button class="btn prim" onclick="estado.carregado=false;rota()">Tentar de novo</button></div>`; }
}

/* ---------- conexões ---------- */
function vConfig(primeira) {
  const c = cfg();
  $('#app').innerHTML = `
  <p class="sobr">Conexões</p><h1>Acesso aos <em>dados</em></h1>
  <p class="lede">${primeira ? 'Para abrir o radar neste navegador, informe o token do GitHub. ' : ''}A conexão é a mesma da página de condução: configurada uma vez num navegador, vale para as duas páginas.</p>
  <div class="form">
    <div class="campo"><label>Token do GitHub (fine-grained)</label><input id="c-token" type="password" value="${esc(c.token || '')}" autocomplete="off"><small>Permissão de leitura e gravação em Contents no repositório de dados. Fica só neste navegador.</small></div>
    <div class="campo"><label>Repositório de dados</label><input id="c-repo" value="${esc(c.repo || REPO_PADRAO)}"><small>Os arquivos do radar ficam na pasta ${PASTA} desse repositório.</small></div>
    <div class="barra"><button class="btn prim" id="c-salvar">Salvar e testar</button><button class="btn" id="c-sair">Remover as credenciais deste navegador</button></div>
  </div>`;
  $('#c-salvar').onclick = async () => {
    setCfg({ ...cfg(), token: $('#c-token').value.trim(), repo: $('#c-repo').value.trim() || REPO_PADRAO });
    try { await GH.testar(); estado.carregado = false; aviso('Conexão confirmada.'); location.hash = '#/'; rota(); } catch (e) { aviso(e.message, true); }
  };
  $('#c-sair').onclick = () => { localStorage.removeItem(CFGK); aviso('Credenciais removidas deste navegador.'); vConfig(true); };
}

/* ---------- painel ---------- */
function vHome() {
  const L = todos(); const r = estado.radar || {}; const uv = r.ultima_varredura || {};
  const agora = new Date(); const sete = 7 * 864e5;
  const aderentes = e => ['Alta', 'Média', 'Manual'].includes(faixa(e));
  const novos7 = L.filter(e => !e.manual && aderentes(e) && e.encontrado_em && agora - dt(e.encontrado_em) <= sete).length;
  const prazos7 = L.filter(e => ['Novo', 'Em análise', 'Em preparação'].includes(st(e)) && aderentes(e) && diasAte(e.prazo_proposta) !== null && diasAte(e.prazo_proposta) >= 0 && diasAte(e.prazo_proposta) <= 7).length;
  const prep = L.filter(e => st(e) === 'Em preparação').length;
  const aguard = L.filter(e => ['Proposta enviada', 'Em julgamento'].includes(st(e))).length;
  const ganhos = L.filter(e => st(e) === 'Ganho'), perdidos = L.filter(e => st(e) === 'Perdido');
  const taxa = ganhos.length + perdidos.length ? Math.round(100 * ganhos.length / (ganhos.length + perdidos.length)) + '%' : 'Sem base';
  const conquistado = ganhos.reduce((s, e) => s + (Number(e.ac.resultado?.valor_contratado) || Number(e.ac.proposta?.valor) || 0), 0);
  const emDisputa = L.filter(e => ['Em preparação', 'Proposta enviada', 'Em julgamento'].includes(st(e))).reduce((s, e) => s + (Number(e.ac.proposta?.valor) || Number(e.valor_estimado) || 0), 0);
  const p = pref();
  $('#app').innerHTML = `
  <p class="sobr">Inteligência comercial</p>
  <div class="cab-radar"><div><h1>Radar de <em>editais</em></h1>
    <p class="lede">Contratações públicas aderentes ao portfólio de Gino Terentim e o acompanhamento de cada proposta, do edital encontrado ao resultado.</p></div>
    <div class="acoes"><button class="btn" id="b-recarregar">Recarregar</button><button class="btn prim" id="b-incluir">Incluir oportunidade</button></div></div>
  <div class="varredura">${uv.data ? `<span>Última varredura: <b>${esc(dataBR(uv.data, true))}</b></span><span>${uv.consultas || 0} consultas ao PNCP</span><span>${uv.editais_distintos || 0} editais em aberto lidos</span><span>${uv.candidatos_para_triagem || 0} na fila de triagem</span>${uv.consultas_com_falha ? `<span class="alerta">${uv.consultas_com_falha} consultas sem resposta do PNCP (repetidas na próxima varredura)</span>` : ''}` : '<span>A primeira varredura ainda não foi registrada.</span>'}</div>
  <div class="kpis">
    ${kpi('Novos aderentes', novos7, 'nos últimos 7 dias', '#3F6E8C')}
    ${kpi('Prazos próximos', prazos7, 'propostas em até 7 dias', prazos7 ? '#B04A1C' : '#C9BFB2')}
    ${kpi('Em preparação', prep, 'propostas em elaboração', '#E5662C')}
    ${kpi('Aguardando resultado', aguard, 'enviadas ou em julgamento', '#7A4E6E')}
    ${kpi('Taxa de êxito', taxa, `${ganhos.length} ganhos e ${perdidos.length} perdidos`, '#5E7D52')}
    ${kpi('Valor em disputa', emDisputa ? BRL.format(emDisputa) : 'R$ 0', `conquistado: ${BRL.format(conquistado)}`, '#C99A57', true)}
  </div>
  <div class="dupla">
    <section class="bloco"><h2>Pendências</h2><div id="pend"></div></section>
    <section class="bloco"><h2>Funil</h2><div class="funil" id="funil"></div><div class="encerrados" id="encerrados"></div></section>
  </div>
  <h2 id="oport">Oportunidades</h2>
  <div class="filtros-r">
    <div class="chips" id="f-faixa">${['Alta e média', 'Alta', 'Média', 'Baixa', 'Todas'].map(f => `<button class="chip ${(p.faixa || 'Alta e média') === f ? 'ativo' : ''}" data-f="${f}">${f}</button>`).join('')}</div>
    <select id="f-status"><option value="abertos">Situação: em aberto</option>${STATUS.map(s => `<option value="${esc(s.n)}">${esc(s.n)}</option>`).join('')}<option value="todas">Todas as situações</option></select>
    <select id="f-uf"><option value="">Todas as UFs</option>${[...new Set(L.map(e => e.uf).filter(Boolean))].sort().map(u => `<option>${esc(u)}</option>`).join('')}</select>
    <select id="f-ordem"><option value="aderencia">Ordenar por aderência</option><option value="prazo">Ordenar por prazo</option><option value="valor">Ordenar por valor</option><option value="recentes">Mais recentes</option></select>
    <input id="f-busca" type="search" placeholder="Buscar órgão, objeto ou cidade">
  </div>
  <p class="contagem" id="contagem"></p>
  <div id="tabela"></div>
  <h2>Resultados e aprendizados</h2>
  <div id="resultados"></div>
  <div class="nota notas-radar"><b>Como o radar funciona.</b> A cada dia útil, a rotina consulta o PNCP com as palavras do portfólio (gestão da mudança, lideranças, agilidade, projetos e portfólio, estratégia, cultura, inovação e IA, escolas de governo e credenciamento de instrutores), aplica um pré-filtro e classifica a aderência de cada edital em alta, média ou baixa, com a justificativa. Os editais fora do escopo ficam registrados para não voltarem à fila. Situação, ações, proposta, resultado e retornos registrados aqui ficam no repositório privado; a rotina acompanha no PNCP o resultado das propostas enviadas. Oportunidades fora do PNCP (cartas-convite, SAP Ariba, portais próprios) entram pelo botão Incluir oportunidade.</div>`;
  $('#b-recarregar').onclick = async () => { estado.carregado = false; await vCarregar(); aviso('Dados atualizados.'); };
  $('#b-incluir').onclick = () => abrirInclusao();
  $('#f-status').value = p.status || 'abertos'; $('#f-ordem').value = p.ordem || 'aderencia'; $('#f-uf').value = p.uf || '';
  $$('#f-faixa .chip').forEach(b => b.onclick = () => { setPref({ faixa: b.dataset.f }); $$('#f-faixa .chip').forEach(x => x.classList.toggle('ativo', x === b)); desenhaTabela(); });
  ['f-status', 'f-ordem', 'f-uf'].forEach(id => $('#' + id).onchange = () => { setPref({ status: $('#f-status').value, ordem: $('#f-ordem').value, uf: $('#f-uf').value }); desenhaTabela(); });
  $('#f-busca').oninput = () => desenhaTabela();
  desenhaPendencias(L); desenhaFunil(L); desenhaTabela(); desenhaResultados(L);
}
function kpi(t, v, s, cor, escuro) { return `<div class="kpi${escuro ? ' escuro' : ''}" style="--cor:${cor}"><small>${esc(t)}</small><strong>${esc(v)}</strong><span>${esc(s)}</span></div>`; }

function desenhaPendencias(L) {
  const itens = []; const hoje = hojeISO();
  for (const e of L) {
    const s = st(e), d = diasAte(e.prazo_proposta), f = faixa(e);
    if (['Em análise', 'Em preparação'].includes(s) || (s === 'Novo' && ['Alta', 'Média', 'Manual'].includes(f))) {
      if (d !== null && d >= 0 && d <= 7) itens.push({ id: e.id, peso: d <= 2 ? 0 : 1, ord: d, ic: d < 1 ? 'Hoje' : Math.ceil(d) + '<br>dias', cls: d <= 2 ? 'u' : 'a', t: `Prazo de proposta ${prazoTxt(e.prazo_proposta)}`, s: `${e.orgao || ''} · ${s}` });
    }
    const pa = e.ac.proxima_acao || {};
    if (pa.texto && pa.data && pa.data <= hoje && ABERTOS.includes(s)) itens.push({ id: e.id, peso: 0, ord: -1, ic: 'Ação', cls: 'u', t: pa.texto, s: `${e.orgao || ''} · prevista para ${dataBR(pa.data)}` });
    if (e.pncp?.existe_resultado && ['Proposta enviada', 'Em julgamento'].includes(s)) itens.push({ id: e.id, peso: 1, ord: 0, ic: 'Res.', cls: 'v', t: 'Resultado publicado no PNCP', s: `${e.orgao || ''} · registrar o resultado` });
    if (s === 'Novo' && f === 'Alta' && e.encontrado_em && (new Date() - dt(e.encontrado_em)) > 2 * 864e5 && !(d !== null && d <= 7)) itens.push({ id: e.id, peso: 2, ord: d ?? 99, ic: 'Novo', cls: 'n', t: 'Aderência alta aguardando decisão', s: `${e.orgao || ''} · prazo ${prazoTxt(e.prazo_proposta) || 'não informado'}` });
  }
  itens.sort((a, b) => a.peso - b.peso || a.ord - b.ord);
  $('#pend').innerHTML = itens.length ? itens.slice(0, 9).map(i => `<div class="pend" data-id="${esc(i.id)}"><div class="pend-ic ${i.cls}">${i.ic}</div><div class="pend-t"><b>${esc(i.t)}</b>${esc(i.s)}</div></div>`).join('') + (itens.length > 9 ? `<p class="semvazio">Mais ${itens.length - 9} pendências na lista de oportunidades.</p>` : '')
    : '<p class="semvazio">Nenhuma pendência no momento: sem prazos de proposta nos próximos 7 dias, sem ações vencidas e sem resultados a registrar.</p>';
  $$('#pend .pend').forEach(el => el.onclick = () => { location.hash = '#/e/' + encodeURIComponent(el.dataset.id); });
}

function desenhaFunil(L) {
  $('#funil').innerHTML = ABERTOS.map(n => {
    let xs = L.filter(e => st(e) === n); if (n === 'Novo') xs = xs.filter(e => ['Alta', 'Média', 'Manual'].includes(faixa(e)));
    xs.sort((a, b) => (dt(a.prazo_proposta) || 9e15) - (dt(b.prazo_proposta) || 9e15));
    return `<div class="col" style="--cor:${COR[n]}"><h4>${esc(n === 'Novo' ? 'Novos aderentes' : n)}<i>${xs.length}</i></h4>${xs.slice(0, 5).map(e => `<div class="mini" data-id="${esc(e.id)}" style="--cor:${COR[n]}"><b>${esc((e.orgao || '').slice(0, 60))}</b><span>${esc(e.prazo_proposta ? 'Prazo ' + dataBR(e.prazo_proposta) : (e.uf || ''))}</span></div>`).join('')}${xs.length > 5 ? `<div class="mini-mais">e mais ${xs.length - 5}</div>` : ''}</div>`;
  }).join('');
  $('#encerrados').innerHTML = STATUS.filter(s => s.g === 'encerrado').map(s => `<button class="chip" data-s="${esc(s.n)}">${esc(s.n)}<span>${L.filter(e => st(e) === s.n).length}</span></button>`).join('');
  $$('#funil .mini').forEach(el => el.onclick = () => { location.hash = '#/e/' + encodeURIComponent(el.dataset.id); });
  $$('#encerrados .chip').forEach(b => b.onclick = () => { $('#f-status').value = b.dataset.s; setPref({ status: b.dataset.s }); $$('#f-faixa .chip').forEach(x => x.classList.toggle('ativo', x.dataset.f === 'Todas')); setPref({ faixa: 'Todas' }); desenhaTabela(); $('#oport').scrollIntoView({ behavior: 'smooth' }); });
}

function desenhaTabela() {
  const p = pref(); const fx = p.faixa || 'Alta e média'; const fs = $('#f-status').value; const uf = $('#f-uf').value; const q = norm($('#f-busca').value);
  let L = todos().filter(e => {
    const f = faixa(e), s = st(e);
    if (fx === 'Alta e média' && !['Alta', 'Média', 'Manual'].includes(f)) return false;
    if (!['Alta e média', 'Todas'].includes(fx) && f !== fx) return false;
    if (fs === 'abertos' && !ABERTOS.includes(s)) return false;
    if (!['abertos', 'todas'].includes(fs) && s !== fs) return false;
    if (uf && e.uf !== uf) return false;
    if (q && !norm([e.orgao, e.unidade, e.objeto, e.municipio, e.uf, e.modalidade].join(' ')).includes(q)) return false;
    return true;
  });
  const ord = $('#f-ordem').value;
  const kPrazo = e => { const d = dt(e.prazo_proposta); return d ? (d < new Date() ? 9e15 + (+d) : +d) : 9.5e15; };
  L.sort({ aderencia: (a, b) => (aderOrdem[faixa(a)] - aderOrdem[faixa(b)]) || ((b.aderencia?.nota || 0) - (a.aderencia?.nota || 0)) || (kPrazo(a) - kPrazo(b)),
    prazo: (a, b) => kPrazo(a) - kPrazo(b), valor: (a, b) => (Number(b.valor_estimado) || 0) - (Number(a.valor_estimado) || 0),
    recentes: (a, b) => String(b.encontrado_em || b.data_publicacao || '').localeCompare(String(a.encontrado_em || a.data_publicacao || '')) }[ord]);
  $('#contagem').textContent = `${L.length} ${L.length === 1 ? 'oportunidade' : 'oportunidades'} com os filtros atuais.`;
  if (!L.length) { $('#tabela').innerHTML = '<div class="vazio">Nenhuma oportunidade com estes filtros. A rotina consulta o PNCP a cada dia útil.</div>'; return; }
  $('#tabela').innerHTML = `<table class="lista-t tab-oport"><thead><tr><th>Aderência</th><th>Órgão e objeto</th><th>Modalidade</th><th>Valor estimado</th><th>Prazo da proposta</th><th>Situação</th></tr></thead><tbody>${L.map(e => {
    const f = faixa(e), s = st(e), d = diasAte(e.prazo_proposta);
    return `<tr data-id="${esc(e.id)}"><td><span class="ader ${esc(f)}"><b>${e.aderencia?.nota ?? ''}</b><small>${esc(f)}</small></span></td>
      <td class="t-obj"><b>${esc(e.orgao || '')}${e.uf ? ' · ' + esc(e.uf) : ''}</b>${unidadeDe(e) ? `<small class="t-un">${esc(unidadeDe(e))}</small>` : ''}<p>${esc(e.objeto || '')}</p></td>
      <td>${esc(e.modalidade || e.fonte || '')}</td><td class="valor">${esc(brl(e.valor_estimado))}</td>
      <td class="t-prazo">${esc(e.prazo_proposta ? (/credenciamento/i.test(e.modalidade || '') ? 'Até ' : '') + dataBR(e.prazo_proposta) : 'Não informado')}<small class="${d !== null && d >= 0 && d <= 3 ? 'u' : ''}">${esc(prazoTxt(e.prazo_proposta))}</small></td>
      <td><span class="st" style="--cor:${COR[s]}">${esc(s)}</span></td></tr>`;
  }).join('')}</tbody></table>`;
  $$('#tabela tbody tr').forEach(tr => tr.onclick = () => { location.hash = '#/e/' + encodeURIComponent(tr.dataset.id); });
}

function desenhaResultados(L) {
  const R = L.filter(e => ['Ganho', 'Perdido', 'Encerrado sem resultado', 'Descartado'].includes(st(e)));
  if (!R.length) { $('#resultados').innerHTML = '<div class="vazio">Os resultados aparecem aqui à medida que as oportunidades forem encerradas: ganhos, perdas com o vencedor e o valor, descartes com o motivo e o que aprendemos em cada uma.</div>'; return; }
  R.sort((a, b) => String(b.ac.resultado?.data || '').localeCompare(String(a.ac.resultado?.data || '')));
  $('#resultados').innerHTML = `<table class="lista-t"><thead><tr><th>Situação</th><th>Órgão e objeto</th><th>Nossa proposta</th><th>Vencedor</th><th>Motivo e aprendizado</th></tr></thead><tbody>${R.map(e => {
    const s = st(e), res = e.ac.resultado || {}, pr = e.ac.proposta || {};
    return `<tr data-id="${esc(e.id)}"><td><span class="st" style="--cor:${COR[s]}">${esc(s)}</span></td><td class="t-obj"><b>${esc(e.orgao || '')}</b><p>${esc(e.objeto || '')}</p></td>
      <td class="valor">${pr.valor ? esc(BRL.format(pr.valor)) : 'Não informado'}</td><td>${esc(res.vencedor || (s === 'Ganho' ? 'Gino Terentim' : 'Não informado'))}${res.valor_vencedor ? '<br><small>' + esc(BRL.format(res.valor_vencedor)) + '</small>' : ''}</td>
      <td>${nl2br(res.motivo || res.aprendizado || '')}</td></tr>`;
  }).join('')}</tbody></table>`;
  $$('#resultados tbody tr').forEach(tr => tr.onclick = () => { location.hash = '#/e/' + encodeURIComponent(tr.dataset.id); });
}

/* ---------- detalhe e acompanhamento ---------- */
function fecharModal() { $('#modal').hidden = true; if (location.hash.startsWith('#/e/')) history.replaceState(null, '', '#/'); }
$('#modal').addEventListener('click', ev => { if (ev.target.id === 'modal') fecharModal(); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('#modal').hidden) fecharModal(); });

function abrirDetalhe(id) {
  const e = todos().find(x => x.id === id); if (!e) { aviso('Oportunidade não encontrada.', true); return; }
  const a = e.ac, s = st(e), f = faixa(e), ad = e.aderencia || {}, pr = a.proposta || {}, res = a.resultado || {}, pa = a.proxima_acao || {};
  const tempo = [...(e.eventos || []).map(x => ({ ...x, por: 'Radar' })), ...(a.historico || [])].sort((x, y) => String(y.data).localeCompare(String(x.data)));
  const venc = e.pncp?.vencedores || [];
  const caixa = $('#modal .modal-caixa');
  caixa.innerHTML = `
  <div class="det-cab"><div><p class="sobr">${esc(e.fonte || 'PNCP')}${e.modalidade ? ' · ' + esc(e.modalidade) : ''}</p><h2>${esc(e.orgao || '')}</h2>
    <span class="st" style="--cor:${COR[s]}">${esc(s)}</span></div><button class="btn peq fechar" id="d-fechar">Fechar</button></div>
  <div class="det-obj">${nl2br(e.objeto || '')}</div>
  <div class="fatos">
    ${fato(/credenciamento/i.test(e.modalidade || '') ? 'Inscrições até' : 'Prazo da proposta', e.prazo_proposta ? dataBR(e.prazo_proposta, true) + (prazoTxt(e.prazo_proposta) ? ' (' + prazoTxt(e.prazo_proposta) + ')' : '') : 'Não informado')}
    ${fato('Valor estimado', brl(e.valor_estimado))}
    ${unidadeDe(e) ? fato('Unidade contratante', unidadeDe(e)) : ''}
    ${[e.municipio, e.uf].filter(Boolean).length ? fato('Local', [e.municipio, e.uf].filter(Boolean).join(' · ')) : ''}
    ${[e.esfera, e.poder].filter(Boolean).length ? fato('Esfera', [e.esfera, e.poder].filter(Boolean).join(' · ')) : ''}
    ${e.criterio ? fato('Critério de julgamento', e.criterio) : ''}
    ${e.data_publicacao ? fato('Publicado em', dataBR(e.data_publicacao)) : ''}
    ${e.pncp?.situacao ? fato('Situação no PNCP', e.pncp.situacao + (e.pncp.existe_resultado ? ' · com resultado' : '')) : ''}
  </div>
  ${f !== 'Manual' ? `<div class="ader-caixa"><span class="ader ${esc(f)}"><b>${ad.nota ?? ''}</b><small>${esc(f)}</small></span><div><p>${esc(ad.justificativa || '')}</p>${ad.frentes?.length ? `<small>Frentes do portfólio: ${esc(ad.frentes.join(', '))}</small>` : ''}${ad.exigencias ? `<small>Pontos a verificar no edital: ${esc(ad.exigencias)}</small>` : ''}</div></div>` : ''}
  ${venc.length ? `<div class="nota"><b>Resultado publicado no PNCP.</b><ul class="vencedores">${venc.map(v => `<li>Item ${esc(v.item)}: ${esc(v.fornecedor || '')}${v.valor ? ' · ' + esc(BRL.format(v.valor)) : ''}</li>`).join('')}</ul></div>` : ''}
  <div class="barra">${e.link_pncp ? `<a class="btn" href="${esc(e.link_pncp)}" target="_blank" rel="noopener">Abrir no PNCP</a>` : ''}${e.link_sistema ? `<a class="btn" href="${esc(e.link_sistema)}" target="_blank" rel="noopener">Abrir no sistema de compras</a>` : ''}</div>
  <div class="det-grade">
    <div>
      <p class="sec-t">Acompanhamento</p>
      <div class="form">
        <div class="grade2"><div class="campo"><label>Situação</label><select id="d-status">${STATUS.filter(x => !x.derivado).map(x => `<option ${x.n === (a.status || 'Novo') ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select></div>
          <div class="campo"><label>Responsável</label><input id="d-resp" list="d-resp-l" value="${esc(a.responsavel || '')}"><datalist id="d-resp-l"><option>Gino Terentim</option><option>Thais Massini</option></datalist></div></div>
        <div class="grade2"><div class="campo"><label>Próxima ação</label><input id="d-acao" value="${esc(pa.texto || '')}" placeholder="Ex.: pedir esclarecimento sobre o atestado"></div>
          <div class="campo"><label>Data da ação</label><input id="d-acao-d" type="date" value="${esc(pa.data || '')}"></div></div>
        <div class="grade2"><div class="campo"><label>Valor da nossa proposta (R$)</label><input id="d-pv" type="number" step="0.01" value="${esc(pr.valor ?? '')}"></div>
          <div class="campo"><label>Proposta enviada em</label><input id="d-pd" type="date" value="${esc(pr.enviada_em || '')}"></div></div>
        <div class="campo"><label>Resultado</label><div class="grade2"><input id="d-rv" placeholder="Vencedor" value="${esc(res.vencedor || '')}"><input id="d-rvv" type="number" step="0.01" placeholder="Valor vencedor (R$)" value="${esc(res.valor_vencedor ?? '')}"></div></div>
        <div class="campo"><label>Motivo e aprendizado</label><textarea id="d-rm" rows="2" placeholder="Ex.: perdemos no preço; o atestado exigido era de 200 horas">${esc(res.motivo || '')}</textarea></div>
        <div class="campo"><label>Notas</label><textarea id="d-notas" rows="3">${esc(a.notas || '')}</textarea></div>
      </div>
    </div>
    <div>
      <p class="sec-t">Retornos do contratante</p>
      <div id="d-retornos">${(a.retornos || []).slice().reverse().map(r => `<div class="retorno"><time>${esc(dataBR(r.data))}</time>${nl2br(r.texto)}</div>`).join('') || '<p class="semvazio">Nenhum retorno registrado.</p>'}</div>
      <div class="form novo-retorno"><div class="campo"><label>Registrar retorno</label><div class="grade2" style="grid-template-columns:160px 1fr"><input id="d-rt-d" type="date" value="${hojeISO()}"><input id="d-rt" placeholder="Esclarecimento, convocação, diligência, contato do gestor"></div></div></div>
      <p class="sec-t" style="margin-top:22px">Linha do tempo</p>
      <ul class="linha-tempo">${tempo.map(t => `<li><time>${esc(dataBR(t.data, true))} · ${esc(t.por || '')}</time>${esc(t.evento)}</li>`).join('') || '<li>Sem registros.</li>'}</ul>
    </div>
  </div>
  <div class="rodape-det">${e.manual ? '<button class="btn" id="d-excluir">Excluir oportunidade incluída</button>' : '<span></span>'}<div class="barra" style="margin:0"><button class="btn" id="d-cancelar">Cancelar</button><button class="btn prim" id="d-salvar">Salvar</button></div></div>`;
  $('#modal').hidden = false; caixa.scrollTop = 0;
  $('#d-fechar').onclick = fecharModal; $('#d-cancelar').onclick = fecharModal;
  $('#d-salvar').onclick = async () => {
    const b = $('#d-salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const novo = JSON.parse(JSON.stringify(a || {}));
    const ant = a.status || 'Novo', nv = $('#d-status').value;
    novo.status = nv; novo.responsavel = $('#d-resp').value.trim();
    novo.proxima_acao = { texto: $('#d-acao').value.trim(), data: $('#d-acao-d').value };
    novo.proposta = { ...(novo.proposta || {}), valor: $('#d-pv').value ? Number($('#d-pv').value) : null, enviada_em: $('#d-pd').value };
    novo.resultado = { ...(novo.resultado || {}), vencedor: $('#d-rv').value.trim(), valor_vencedor: $('#d-rvv').value ? Number($('#d-rvv').value) : null, motivo: $('#d-rm').value.trim() };
    if (['Ganho', 'Perdido', 'Encerrado sem resultado', 'Descartado'].includes(nv) && !novo.resultado.data) novo.resultado.data = hojeISO();
    novo.notas = $('#d-notas').value;
    novo.historico = novo.historico || [];
    if (nv !== ant) novo.historico.push({ data: agoraISO(), evento: `Situação: ${ant} para ${nv}.`, por: 'Página' });
    const rt = $('#d-rt').value.trim();
    if (rt) { novo.retornos = [...(novo.retornos || []), { data: $('#d-rt-d').value || hojeISO(), texto: rt }]; novo.historico.push({ data: agoraISO(), evento: 'Retorno registrado: ' + rt.slice(0, 120), por: 'Página' }); }
    novo.atualizado_em = agoraISO();
    try { await salvarAcomp(e.id, novo, `Radar: ${e.orgao || e.id} (edição no radar)`); aviso('Acompanhamento salvo.'); fecharModal(); vHome(); }
    catch (err) { aviso(err.message, true); b.disabled = false; b.textContent = 'Salvar'; }
  };
  if ($('#d-excluir')) $('#d-excluir').onclick = async () => {
    if ($('#d-excluir').dataset.conf !== '1') { $('#d-excluir').dataset.conf = '1'; $('#d-excluir').textContent = 'Confirmar a exclusão'; return; }
    try { await salvarAcomp(e.id, null, `Radar: exclusão de ${e.orgao || e.id} (edição no radar)`); aviso('Oportunidade excluída.'); fecharModal(); vHome(); } catch (err) { aviso(err.message, true); }
  };
}
function fato(t, v) { return `<div class="fato"><small>${esc(t)}</small><b>${esc(v)}</b></div>`; }

function abrirInclusao() {
  const caixa = $('#modal .modal-caixa');
  caixa.innerHTML = `<div class="det-cab"><div><p class="sobr">Nova oportunidade</p><h2>Incluir oportunidade fora do radar</h2><p class="lede">Para cartas-convite, concorrências no SAP Ariba, portais próprios ou convites diretos.</p></div><button class="btn peq fechar" id="i-fechar">Fechar</button></div>
  <div class="form" style="max-width:none">
    <div class="grade2"><div class="campo"><label>Órgão ou empresa contratante</label><input id="i-orgao"></div><div class="campo"><label>Fonte</label><select id="i-fonte">${FONTES.filter(x => x !== 'PNCP').map(x => `<option>${esc(x)}</option>`).join('')}</select></div></div>
    <div class="campo"><label>Objeto</label><textarea id="i-obj" rows="3"></textarea></div>
    <div class="grade3"><div class="campo"><label>Instrumento ou número</label><input id="i-mod" placeholder="Ex.: Carta-Convite SC nº 0428/2026"></div><div class="campo"><label>UF</label><input id="i-uf" maxlength="2"></div><div class="campo"><label>Situação</label><select id="i-status">${STATUS.filter(x => !x.derivado).map(x => `<option>${esc(x.n)}</option>`).join('')}</select></div></div>
    <div class="grade3"><div class="campo"><label>Prazo da proposta</label><input id="i-prazo" type="datetime-local"></div><div class="campo"><label>Valor estimado (R$)</label><input id="i-valor" type="number" step="0.01"></div><div class="campo"><label>Link</label><input id="i-link" placeholder="https://"></div></div>
    <div class="campo"><label>Notas</label><textarea id="i-notas" rows="2"></textarea></div>
    <div class="barra"><button class="btn" id="i-cancelar">Cancelar</button><button class="btn prim" id="i-salvar">Incluir</button></div>
  </div>`;
  $('#modal').hidden = false;
  $('#i-fechar').onclick = fecharModal; $('#i-cancelar').onclick = fecharModal;
  $('#i-salvar').onclick = async () => {
    const orgao = $('#i-orgao').value.trim(), obj = $('#i-obj').value.trim();
    if (!orgao || !obj) { aviso('Informe ao menos o contratante e o objeto.', true); return; }
    const id = 'm-' + Date.now().toString(36);
    const ent = { manual: { fonte: $('#i-fonte').value, orgao, objeto: obj, modalidade: $('#i-mod').value.trim(), uf: $('#i-uf').value.trim().toUpperCase(),
      prazo_proposta: $('#i-prazo').value, valor_estimado: $('#i-valor').value ? Number($('#i-valor').value) : null, link_sistema: $('#i-link').value.trim(), data_publicacao: hojeISO() },
      status: $('#i-status').value, notas: $('#i-notas').value, historico: [{ data: agoraISO(), evento: 'Oportunidade incluída na página.', por: 'Página' }], atualizado_em: agoraISO() };
    try { await salvarAcomp(id, ent, `Radar: inclusão de ${orgao} (edição no radar)`); aviso('Oportunidade incluída.'); fecharModal(); vHome(); } catch (err) { aviso(err.message, true); }
  };
}

rota();
