/**
 * Votação dos Jogos — DS · backend em Google Apps Script
 * Cola este arquivo em: Planilha → Extensões → Apps Script.
 * Depois: Implantar → Nova implantação → App da Web
 *   Executar como: Eu  ·  Quem pode acessar: Qualquer pessoa
 * Copie a URL /exec e cole em CONFIG.API_URL no index.html.
 */

const FIM = new Date('2026-11-28T23:59:00-03:00');
const SITE = ''; // opcional: endereço do site no GitHub Pages (link "ver placar" no e-mail)
const JOGOS = [
  'ECO', 'Fuga da Escola', 'Snake Royale', 'Bolo Stack',
  'Pixel Valley', 'The Last Message', 'O Último Sobrevivente', 'Cidade do Caos'
];
const ABA = 'Votos';
const CAB = ['email', 'jogo', 'token', 'status', 'criado_em', 'confirmado_em'];

// ---------- Entrada ----------
function doPost(e) {
  let d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, msg: 'Pedido inválido.' }); }
  if (d.acao === 'votar') return json(registrar(d.email, d.jogo));
  return json({ ok: false, msg: 'Ação desconhecida.' });
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.confirmar) return confirmar(p.confirmar);
  if (p.acao === 'resultados') return json(resultados());
  return json({ ok: true, servico: 'votacao-jogos' });
}

// ---------- Votar: grava pendente e manda o link ----------
function registrar(emailBruto, jogo) {
  if (new Date() > FIM) return { ok: false, msg: 'A votação está encerrada.' };
  const email = String(emailBruto || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, msg: 'Digite um e-mail válido.' };
  if (JOGOS.indexOf(jogo) < 0) return { ok: false, msg: 'Jogo inválido.' };
  if (MailApp.getRemainingDailyQuota() < 1) return { ok: false, msg: 'Limite diário de e-mails atingido. Tente amanhã.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = aba();
    const dados = sh.getDataRange().getValues();
    let linhaPendente = -1, token = null;
    for (let i = 1; i < dados.length; i++) {
      if (dados[i][0] !== email) continue;
      if (dados[i][3] === 'confirmado') return { ok: false, msg: 'Este e-mail já votou. Só vale 1 voto por e-mail.' };
      linhaPendente = i + 1; token = dados[i][2];
      const criado = new Date(dados[i][4]);
      if (new Date() - criado < 2 * 60 * 1000) {
        return { ok: true, msg: 'Já enviamos o link há pouco. Confira a caixa de entrada e o spam.' };
      }
    }
    const agora = new Date();
    if (linhaPendente > 0) {
      sh.getRange(linhaPendente, 2).setValue(jogo);      // troca o jogo se mudou de ideia
      sh.getRange(linhaPendente, 5).setValue(agora);
    } else {
      token = Utilities.getUuid().replace(/-/g, '');
      sh.appendRow([email, jogo, token, 'pendente', agora, '']);
    }
    enviarEmail(email, jogo, token);
    return { ok: true, msg: 'Enviamos um link para ' + email + '. Abra o e-mail e clique para confirmar seu voto.' };
  } finally {
    lock.releaseLock();
  }
}

function enviarEmail(email, jogo, token) {
  const link = ScriptApp.getService().getUrl() + '?confirmar=' + token;
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:480px">' +
    '<h2 style="margin:0 0 12px">Confirme seu voto</h2>' +
    '<p>Você escolheu <b>' + esc(jogo) + '</b> na Votação dos Jogos de Desenvolvimento de Sistemas.</p>' +
    '<p><a href="' + link + '" style="display:inline-block;background:#ffd23f;color:#0b0d1a;padding:12px 20px;' +
    'border-radius:8px;text-decoration:none;font-weight:bold">CONFIRMAR MEU VOTO</a></p>' +
    '<p style="color:#666;font-size:13px">Se não foi você, ignore este e-mail. O voto só conta depois da confirmação.</p></div>';
  MailApp.sendEmail({
    to: email,
    subject: 'Confirme seu voto: ' + jogo,
    htmlBody: html,
    name: 'Votação dos Jogos — DS'
  });
}

// ---------- Confirmar (clique no link do e-mail) ----------
function confirmar(token) {
  if (new Date() > FIM) return pagina('Votação encerrada', 'O prazo para confirmar terminou.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = aba();
    const dados = sh.getDataRange().getValues();
    let linha = -1, email = '', jogo = '';
    for (let i = 1; i < dados.length; i++) {
      if (dados[i][2] === token) { linha = i + 1; email = dados[i][0]; jogo = dados[i][1]; break; }
    }
    if (linha < 0) return pagina('Link inválido', 'Este link de confirmação não existe ou já foi substituído.');
    for (let i = 1; i < dados.length; i++) {
      if (dados[i][0] === email && dados[i][3] === 'confirmado') {
        return pagina('Você já votou', 'Seu voto em <b>' + esc(dados[i][1]) + '</b> já estava confirmado. Vale 1 voto por e-mail.');
      }
    }
    sh.getRange(linha, 4, 1, 3).setValues([['confirmado', sh.getRange(linha, 5).getValue(), new Date()]]);
    return pagina('Voto confirmado!', 'Seu voto em <b>' + esc(jogo) + '</b> foi registrado. Obrigado!');
  } finally {
    lock.releaseLock();
  }
}

// ---------- Placar: só votos confirmados, 1 por e-mail ----------
function resultados() {
  const dados = aba().getDataRange().getValues();
  const votos = {}; JOGOS.forEach(j => votos[j] = 0);
  const vistos = {}; let total = 0;
  for (let i = 1; i < dados.length; i++) {
    const [email, jogo, , status, , confirmadoEm] = dados[i];
    if (status !== 'confirmado' || vistos[email]) continue;
    if (confirmadoEm && new Date(confirmadoEm) > FIM) continue;
    if (!(jogo in votos)) continue;
    vistos[email] = true; votos[jogo]++; total++;
  }
  return { ok: true, total: total, votos: votos, fim: FIM.toISOString(), encerrada: new Date() > FIM };
}

// ---------- Utilitários ----------
function aba() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA);
  if (!sh) { sh = ss.insertSheet(ABA); sh.appendRow(CAB); sh.setFrozenRows(1); }
  return sh;
}
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function pagina(titulo, texto) {
  const voltar = SITE ? '<p><a href="' + SITE + '#resultados" style="color:#ffd23f">Ver placar</a></p>' : '';
  return HtmlService.createHtmlOutput(
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<div style="font-family:Arial,sans-serif;background:#0b0d1a;color:#eef0ff;min-height:100vh;display:flex;' +
    'align-items:center;justify-content:center;padding:24px;text-align:center"><div>' +
    '<h1 style="color:#ffd23f">' + titulo + '</h1><p style="font-size:18px">' + texto + '</p>' + voltar + '</div></div>'
  ).setTitle(titulo).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Rode uma vez pelo editor para autorizar e criar a aba "Votos". */
function configurar() {
  aba();
  Logger.log('Pronto. E-mails restantes hoje: ' + MailApp.getRemainingDailyQuota());
}
