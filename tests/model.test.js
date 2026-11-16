// model.test.js: stress test for formula.js. Runs thousands of random schemes and checks
// rules that must always hold. Run: node tests/model.test.js
var S = require('../formula.js');

var seed = 12345;
function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
function pick(list) { return list[Math.floor(rnd() * list.length)]; }
function between(a, b) { return a + rnd() * (b - a); }

var failures = [], runs = 0, verdicts = {};
function check(ok, what, ctx) { if (!ok && failures.length < 15) failures.push(what + ' :: ' + JSON.stringify(ctx)); }
function finite(x) { return typeof x === 'number' && isFinite(x); }

var FREQS = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'lump'];
for (var i = 0; i < 4000; i++) {
  var freq = pick(FREQS);
  var input = {
    amount: Math.round(Math.pow(10, between(2, 8))),
    rate: freq === 'lump' ? between(0.05, 4) : freq === 'daily' ? between(0.0005, 0.08) : between(0.002, 0.6),
    freq: freq,
    lumpMonths: freq === 'lump' ? between(0.2, 40) : null,
    bankAnnual: 0.10,
    schemeAgeMonths: rnd() < 0.3 ? Math.floor(between(0, 80)) : null,
    monthsAgo: rnd() < 0.3 ? Math.floor(between(0, 40)) : null
  };
  var params = rnd() < 0.5 ? S.typeParams(pick(Object.keys(S.TYPES)))
    : { g: between(0.01, 1), M: between(2, 200000), k: between(0, 0.9), q: between(0, 0.95) };
  var ctx = { input: input, params: params }, r;
  try { r = S.analyse(input, params); } catch (e) { check(false, 'threw ' + e.message, ctx); continue; }
  runs++;
  verdicts[r.verdict] = (verdicts[r.verdict] || 0) + 1;
  check(['collapse', 'overdue', 'check-secp'].indexOf(r.verdict) >= 0, 'unknown verdict', ctx);

  if (r.sim) {
    var sim = r.sim;
    check(finite(sim.collapseMonth) && sim.collapseMonth >= 1, 'collapse month', ctx);
    check(sim.lossShare >= -1e-9 && sim.lossShare <= 1 + 1e-9, 'lossShare out of range', ctx);
    check(sim.behindShare >= sim.lossShare - 1e-9 && sim.behindShare <= 1 + 1e-9, 'behindShare out of range', ctx);
    check(sim.typicalJoinMonth >= 0 && sim.typicalJoinMonth <= sim.collapseMonth, 'typical join month', ctx);
    // Money in = cash paid out + operators' cut + pool left, to rounding.
    var gap = Math.abs(sim.raised - sim.paidOut - sim.operatorKeep);
    check(gap <= 1e-6 * Math.max(1, sim.raised), 'accounting gap ' + gap, ctx);
    check(sim.ledger.every(function (m) { return finite(m.pool) && finite(m.due) && m.newMoney >= 0 && m.due >= 0; }), 'ledger values', ctx);
  }
  if (r.verdict === 'collapse' && r.family) {
    var f = r.family;
    check(f.monthsLeft >= 1, 'family months left', ctx);
    check(finite(f.received) && f.received >= 0, 'family received', ctx);
    check(f.loss >= 0 && f.loss <= input.amount + 1e-6, 'family loss out of range', ctx);
  }
  if (r.invested) {
    var v = r.invested;
    check(v.joinMonth >= 0 && v.nowMonth >= v.joinMonth, 'invested months', ctx);
    check(finite(v.receivedSoFar) && v.receivedSoFar >= 0 && v.stillToCome >= 0, 'invested amounts', ctx);
    check((r.verdict === 'overdue') === (v.nowMonth >= r.sim.collapseMonth), 'overdue flag', ctx);
    check(r.verdict === 'overdue' || v.monthsLeft >= 1, 'invested months left', ctx);
  }
}

// A bigger promise can never make a scheme last longer (same settings, monthly payouts).
Object.keys(S.TYPES).forEach(function (type) {
  var prev = Infinity;
  [0.02, 0.03, 0.05, 0.08, 0.12, 0.2, 0.35, 0.6].forEach(function (rate) {
    var sim = S.simulate(S.toSchedule(rate, 'monthly'), S.typeParams(type));
    check(sim.collapsed && sim.collapseMonth <= prev, 'higher promise lasted longer', { type: type, rate: rate, months: sim.collapseMonth, prev: prev });
    prev = sim.collapseMonth;
  });
});

// The family's amount scales their result and never moves the date.
var a = S.analyse({ amount: 1000, rate: 0.1, freq: 'monthly', bankAnnual: 0.1 });
var b = S.analyse({ amount: 1000000, rate: 0.1, freq: 'monthly', bankAnnual: 0.1 });
check(a.sim.collapseMonth === b.sim.collapseMonth && Math.abs(b.family.loss / a.family.loss - 1000) < 1e-6, 'amount changed the date or did not scale', {});

// The planned reference numbers.
[[0.03, 56], [0.05, 44], [0.10, 35], [0.20, 26]].forEach(function (c) {
  var months = S.simulate(S.toSchedule(c[0], 'monthly')).collapseMonth;
  check(months === c[1], 'reference case changed', { rate: c[0], months: months, expected: c[1] });
});

console.log('random schemes run: ' + runs + '  verdicts: ' + JSON.stringify(verdicts));
if (failures.length) { console.log('FAILED (' + failures.length + ' shown):\n' + failures.join('\n')); process.exit(1); }
console.log('all checks passed');
