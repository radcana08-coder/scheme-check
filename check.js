// check.js: prints the model's behaviour so it can be compared with the Sheet.
// Run: node check.js
var S = require('./formula.js');

var BANK = 0.10;      // placeholder annual bank rate until the bank table exists
var AMOUNT = 100000;  // Rs 1 lakh

function pct(x) { return (100 * x).toFixed(0) + '%'; }
function rs(x) { return 'Rs ' + Math.round(x).toLocaleString('en-PK'); }
function pad(x, n) { x = String(x); while (x.length < n) x += ' '; return x; }

// Fresh money stops covering dues once E/M passes this point (ignores the pool buffer).
function tippingPoint(s, p) {
  var tip = 1 - S.monthlyRate(s) / ((1 - p.k) * p.g);
  return tip > 0 ? tip : 0;
}

function row(label, rate, freq, lumpMonths, params) {
  var p = Object.assign({}, S.DEFAULTS, params);
  var r = S.analyse({ amount: AMOUNT, rate: rate, freq: freq, lumpMonths: lumpMonths, bankAnnual: BANK }, p);
  if (r.verdict !== 'collapse') {
    console.log(pad(label, 26) + r.verdict);
    return r;
  }
  var sim = r.sim, f = r.family;
  // Accounting identity: money in = paid out + operators' cut + pool left at collapse.
  var gap = Math.abs(sim.raised - sim.paidOut - sim.operatorKeep);
  console.log(
    pad(label, 26) +
    pad(sim.collapseMonth + ' mo', 8) +
    pad('join m' + f.joinMonth + ', ' + f.monthsLeft + ' left', 22) +
    pad('gets ' + rs(f.received), 18) +
    pad('loses ' + rs(f.loss), 19) +
    pad('bank +' + rs(f.bankProfit), 18) +
    pad(pct(sim.lossShare) + ' lost / ' + pct(sim.behindShare) + ' behind', 22) +
    (r.schedule.lump ? '' : 'tip at ' + pct(tippingPoint(r.schedule, p)) + ' of M') +
    (gap > 1e-6 ? '  ACCOUNTING GAP ' + gap : '')
  );
  return r;
}

console.log('\nDefaults: g=' + S.DEFAULTS.g + ', M=' + S.DEFAULTS.M + ', k=' + S.DEFAULTS.k +
  ', bank ' + pct(BANK) + '/yr, family puts in ' + rs(AMOUNT) + '\n');

console.log('--- Monthly payout schemes ---');
[0.03, 0.05, 0.10, 0.20].forEach(function (r) { row(pct(r) + ' a month', r, 'monthly'); });

console.log('\n--- Other payout schedules ---');
row('1% a day (crypto app)', 0.01, 'daily');
row('5% a week', 0.05, 'weekly');
row('15% a quarter', 0.15, 'quarterly');
row('double in 3 months', 1.0, 'lump', 3);
row('double in 70 days', 1.0, 'lump', 70 / (365 / 12));
row('+50% in 6 months', 0.5, 'lump', 6);

console.log('\n--- Close to the bank rate ---');
row('1% a month', 0.01, 'monthly');
row('1.2% a month', 0.012, 'monthly');
row('2% a month', 0.02, 'monthly');

console.log('\n--- Reinvestment (10% a month) ---');
[0, 0.25, 0.5, 0.75].forEach(function (q) { row('q = ' + q, 0.10, 'monthly', null, { q: q }); });

console.log('\n--- Sensitivity of collapse month at 10% a month (rows g, columns M) ---');
var Ms = [100, 300, 1000, 3000, 10000];
console.log(pad('g \\ M', 8) + Ms.map(function (m) { return pad(m, 8); }).join(''));
[0.15, 0.20, 0.30, 0.45, 0.60].forEach(function (g) {
  console.log(pad(g, 8) + Ms.map(function (m) {
    var sim = S.simulate(S.toSchedule(0.10, 'monthly'), { g: g, M: m });
    return pad(sim.collapsed ? sim.collapseMonth : 'none', 8);
  }).join(''));
});

console.log('\n--- Optional question: scheme age known (10% a month) ---');
var sched = S.toSchedule(0.10, 'monthly');
var sim = S.simulate(sched);
[0, 12, 24, 30, 40].forEach(function (age) {
  var r = S.analyse({ amount: AMOUNT, rate: 0.10, freq: 'monthly', bankAnnual: BANK, schemeAgeMonths: age });
  console.log(pad('running ' + age + ' months', 26) + (r.verdict === 'collapse'
    ? r.family.monthsLeft + ' months left, loses ' + rs(r.family.loss)
    : r.verdict + ' (model collapse month ' + sim.collapseMonth + ')'));
});

var d = S.collapseDate(new Date(2026, 9, 15), 9);
console.log('\nToday Oct 2026 + 9 months -> ' + d.month + '/' + d.year + '\n');

console.log('--- Probe: what makes "double in 70 days" last ~2 years like Double Shah? ---');
[0.3, 0.5, 0.8].forEach(function (g) {
  [0, 0.5, 0.8].forEach(function (q) {
    [1000, 100000].forEach(function (M) {
      var sim = S.simulate(S.toSchedule(1.0, 'lump', 70 / (365 / 12)), { g: g, q: q, M: M });
      console.log(pad('g=' + g + ' q=' + q + ' M=' + M, 26) + sim.collapseMonth + ' mo');
    });
  });
});
