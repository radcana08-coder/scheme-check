// make-pdf.js: writes pdf/formula.html from the live engine and prints it to
// dist/Collapse-Model-Formula.pdf with Edge (headless). Run: node make-pdf.js
var fs = require('fs');
var path = require('path');
var url = require('url');
var cp = require('child_process');
var S = require('./formula.js');
var BANKS = require('./banks.js');

var D = S.DEFAULTS;
var BANK = 0.10;
var AMOUNT = 100000;

function rs(x) { return Math.round(x).toLocaleString('en-IN'); }
function pct(x, d) { return (100 * x).toFixed(d == null ? 0 : d) + '%'; }
function num(x) { return x >= 100 ? Math.round(x).toLocaleString('en-IN') : x >= 10 ? x.toFixed(1) : x.toFixed(3); }

// ---- Worked example: 10% a month ----
var ex = S.analyse({ amount: AMOUNT, rate: 0.10, freq: 'monthly', bankAnnual: BANK });
var exSim = ex.sim;
var C = exSim.collapseMonth;
var tipMonth = 0;
exSim.ledger.some(function (m) {
  if (m.month > 0 && (1 - D.k) * m.newMoney < m.due) { tipMonth = m.month; return true; }
});
var shown = [0, 1, 2, 3, 4, 5, tipMonth - 1, tipMonth, tipMonth + 1, C - 3, C - 2, C - 1, C];
var ledgerRows = '', last = -1;
shown.forEach(function (t) {
  if (t <= last) return;
  if (t > last + 1 && last >= 0) ledgerRows += '<tr class="gap"><td colspan="7">&#8942;</td></tr>';
  last = t;
  var m = exSim.ledger[t];
  var collapse = t === C;
  ledgerRows += '<tr' + (collapse ? ' class="bad"' : t === tipMonth ? ' class="warn"' : '') + '>' +
    '<td>' + t + '</td><td>' + num(m.newMoney) + '</td><td>' + num(m.raised) + '</td>' +
    '<td>' + num((1 - D.k) * m.newMoney) + '</td><td>' + num(m.due) + '</td><td>' + num(m.pool) + '</td>' +
    '<td>' + (collapse ? 'COLLAPSE: pool &lt; due' : num(m.pool - m.due)) + '</td></tr>';
});

// ---- Results across scheme types ----
var cases = [
  ['3% a month', 0.03, 'monthly'], ['5% a month', 0.05, 'monthly'], ['10% a month', 0.10, 'monthly'],
  ['20% a month', 0.20, 'monthly'], ['1% a day', 0.01, 'daily'], ['5% a week', 0.05, 'weekly'],
  ['15% a quarter', 0.15, 'quarterly'], ['Double in 70 days', 1.0, 'lump', 70 / (365 / 12)],
  ['+50% in 6 months', 0.5, 'lump', 6], ['2% a month', 0.02, 'monthly'], ['1% a month', 0.01, 'monthly']
];
var caseRows = cases.map(function (c) {
  var r = S.analyse({ amount: AMOUNT, rate: c[1], freq: c[2], lumpMonths: c[3], bankAnnual: BANK });
  if (r.verdict !== 'collapse') {
    return '<tr><td>' + c[0] + '</td><td colspan="7" class="muted">Verdict: ' + r.verdict +
      ' (no date shown; at or below ' + D.secpMultiple + ' &times; bank rate)</td></tr>';
  }
  var f = r.family, s = r.sim;
  return '<tr><td>' + c[0] + '</td><td>' + s.collapseMonth + '</td><td>' + f.joinMonth + '</td><td>' + f.monthsLeft +
    '</td><td>' + rs(f.received) + '</td><td>' + rs(f.loss) + '</td><td>' + rs(f.bankProfit) +
    '</td><td>' + pct(s.lossShare) + ' / ' + pct(s.behindShare) + '</td></tr>';
}).join('');

// ---- Sensitivity grid ----
var Ms = [100, 300, 1000, 3000, 10000], gs = [0.15, 0.20, 0.30, 0.45, 0.60];
var sens = '<tr><th>g \\ M</th>' + Ms.map(function (m) { return '<th>' + m.toLocaleString('en-IN') + '</th>'; }).join('') + '</tr>' +
  gs.map(function (g) {
    return '<tr><th>' + g.toFixed(2) + '</th>' + Ms.map(function (m) {
      var sim = S.simulate(S.toSchedule(0.10, 'monthly'), { g: g, M: m });
      var isDefault = g === D.g && m === D.M;
      return '<td' + (isDefault ? ' class="hl"' : '') + '>' + sim.collapseMonth + '</td>';
    }).join('') + '</tr>';
  }).join('');

// ---- Lump-sum calibration probe ----
var probe = '';
[0.3, 0.5, 0.8].forEach(function (g) {
  probe += '<tr><th>' + g.toFixed(1) + '</th>';
  [0, 0.5, 0.8].forEach(function (q) {
    [1000, 100000].forEach(function (M) {
      probe += '<td>' + S.simulate(S.toSchedule(1.0, 'lump', 70 / (365 / 12)), { g: g, q: q, M: M }).collapseMonth + '</td>';
    });
  });
  probe += '</tr>';
});

// ---- Bank table ----
function cell(x) { return x ? x.rate.toFixed(2) + '%<div class="small">' + x.product + ', ' + x.asOf + '</div>' : '<span class="muted">n/a</span>'; }
var bankRows = BANKS.list.map(function (b) {
  return '<tr><td>' + b.en + '<div class="small ur">' + b.ur + '</div></td><td>' + cell(b.savings) + '</td><td>' + cell(b.islamic) + '</td><td>' + cell(b.fixed) + '</td></tr>';
}).join('');

var tip10 = 1 - 0.10 / ((1 - D.k) * D.g);

// ---- Scheme types ----
var TYPE_NAMES = { other: 'Something else (defaults)', double: 'Money doubling', committee: 'Committee doubling', crypto: 'Crypto or app', forex: 'Forex trading', modaraba: 'Modaraba or business' };
var typeRows = Object.keys(S.TYPES).map(function (type) {
  var t = S.TYPES[type], p = S.typeParams(type), pre = t.preset, promise = '&mdash;', lasts = '&mdash;';
  if (pre) {
    var lump = pre.freq === 'lump' ? (pre.unit === 'days' ? pre.period / (365 / 12) : pre.period) : null;
    promise = pre.freq === 'lump' ? '+' + Math.round(pre.rate * 100) + '% after ' + pre.period + ' ' + pre.unit : Math.round(pre.rate * 1000) / 10 + '% ' + pre.freq;
    var sim = S.simulate(S.toSchedule(pre.rate, pre.freq, lump), p);
    lasts = sim.collapsed ? sim.collapseMonth : 'none';
  }
  return '<tr><td>' + TYPE_NAMES[type] + '</td><td>' + promise + '</td><td>' + p.g + '</td><td>' + p.M.toLocaleString('en-IN') + '</td><td>' + p.k + '</td><td>' + p.q + '</td><td>' + lasts + '</td></tr>';
}).join('');

var html = fs.readFileSync(path.join(__dirname, 'pdf', 'formula.template.html'), 'utf8')
  .replace(/\{\{(\w+)\}\}/g, function (_, key) {
    var v = {
      g: D.g, M: D.M.toLocaleString('en-IN'), k: D.k, q: D.q, h: D.horizon, sigma: D.secpMultiple,
      ledgerRows: ledgerRows, caseRows: caseRows, sens: sens, probe: probe, bankRows: bankRows,
      C: C, tipMonth: tipMonth, tip10: pct(tip10), J: ex.family.joinMonth, left: ex.family.monthsLeft,
      received: rs(ex.family.received), loss: rs(ex.family.loss), bankProfit: rs(ex.family.bankProfit),
      raised: num(exSim.raised), lossShare: pct(exSim.lossShare), behindShare: pct(exSim.behindShare),
      paidOut: num(exSim.paidOut), opKeep: num(exSim.operatorKeep),
      checked: BANKS.checked, policy: BANKS.policyRate.toFixed(1), ref: BANKS.reference.toFixed(0),
      typeRows: typeRows,
      taxBank: BANKS.tax.bank.filer + '% / ' + BANKS.tax.bank.nonfiler + '%',
      taxNs: BANKS.tax.cdns.filer + '% / ' + BANKS.tax.cdns.nonfiler + '%',
      sources: BANKS.sources.map(function (s) { return '<li>' + s + '</li>'; }).join('')
    }[key];
    if (v == null) throw new Error('Template key missing: ' + key);
    return v;
  });

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
var htmlPath = path.join(__dirname, 'pdf', 'formula.html');
var pdfPath = path.join(__dirname, 'dist', 'Collapse-Model-Formula.pdf');
fs.writeFileSync(htmlPath, html);

var edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
var profile = path.join(require('os').tmpdir(), 'edge-pdf-profile');
if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
cp.execFileSync(edge, [
  '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--user-data-dir=' + profile,
  '--print-to-pdf=' + pdfPath, url.pathToFileURL(htmlPath).href
], { stdio: 'inherit', timeout: 60000 });
// Edge's launcher can exit before the PDF is written; wait for it.
var sleeper = new Int32Array(new SharedArrayBuffer(4));
for (var waited = 0; !fs.existsSync(pdfPath) && waited < 30000; waited += 250) Atomics.wait(sleeper, 0, 0, 250);
if (!fs.existsSync(pdfPath)) throw new Error('Edge did not write ' + pdfPath);
Atomics.wait(sleeper, 0, 0, 500);
console.log('Wrote ' + pdfPath + ' (' + Math.round(fs.statSync(pdfPath).size / 1024) + ' KB)');
// The website (docs/) carries a copy for download.
fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
fs.copyFileSync(pdfPath, path.join(__dirname, 'docs', 'Collapse-Model-Formula.pdf'));
