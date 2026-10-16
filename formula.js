/*
 * formula.js: Ponzi-scheme collapse ledger.
 *
 * Pure functions, no DOM, no network: the same file runs inside the offline
 * calculator page and in Node for checks (node check.js).
 *
 * Money inside the simulation is measured in units of the scheme's starting
 * money (seed = 1), so the collapse month does not depend on how big the
 * scheme really is. The family's rupee amount only scales their own outcome.
 */
(function (root) {
  'use strict';

  // Placeholder defaults. Calibrate against real collapsed schemes before release.
  var DEFAULTS = {
    g: 0.30,           // recruitment growth per month while the market is still empty
    M: 1000,           // market size: the most outside money the scheme can ever raise, in seed units
    k: 0.10,           // operators' cut of every new deposit
    q: 0,              // share of each payout members roll back in instead of taking cash
    secpMultiple: 1.5, // promised return at or below this multiple of the bank rate: no date, "check SECP"
    horizon: 600       // months to simulate before giving up (50 years)
  };

  // Scheme types. Each overrides the defaults above because recruitment differs by
  // type: an app spreads faster than a neighbourhood committee, and doubling schemes
  // run on people re-investing. preset = typical promise, used to fill the form.
  // Only `double` is anchored to a real case (Double Shah: doubling in ~70 days, ran
  // ~2 years); the others are placeholder judgements until calibrated.
  var TYPES = {
    other:     { params: {} },
    double:    { params: { g: 0.8, M: 100000, q: 0.5 }, preset: { freq: 'lump', rate: 1.0, period: 70, unit: 'days' } },
    committee: { params: { g: 0.4, M: 300, q: 0.3 }, preset: { freq: 'lump', rate: 1.0, period: 6, unit: 'months' } },
    crypto:    { params: { g: 0.7, M: 3000, k: 0.2, q: 0.6 }, preset: { freq: 'daily', rate: 0.02 } },
    forex:     { params: { g: 0.35, M: 3000, q: 0.3 }, preset: { freq: 'monthly', rate: 0.10 } },
    modaraba:  { params: { g: 0.25, M: 3000, q: 0.6 }, preset: { freq: 'monthly', rate: 0.05 } }
  };
  function typeParams(type) {
    var t = TYPES[type] || TYPES.other, p = {};
    for (var key in DEFAULTS) p[key] = key in t.params ? t.params[key] : DEFAULTS[key];
    return p;
  }

  var DAYS_PER_MONTH = 365 / 12;
  var WEEKS_PER_MONTH = 365 / 7 / 12;

  function withDefaults(params) {
    var p = {};
    for (var key in DEFAULTS) p[key] = DEFAULTS[key];
    if (params) for (key in params) if (params[key] != null) p[key] = params[key];
    return p;
  }

  // What the user typed -> a payout schedule the ledger understands.
  //   rate: promised return per period as a fraction (0.05 = 5%).
  //         For 'lump', the total gain at the end (1 = money doubles).
  //   freq: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'lump'
  //   lumpMonths: 'lump' only, months until the single payout.
  // A schedule pays `pay` x balance every `every` months; a lump schedule pays
  // once (principal included) and the deposit is finished.
  // Daily and weekly payouts are summed into one monthly payment because the
  // ledger steps a month at a time.
  function toSchedule(rate, freq, lumpMonths) {
    switch (freq) {
      case 'daily':     return { lump: false, every: 1,  pay: rate * DAYS_PER_MONTH };
      case 'weekly':    return { lump: false, every: 1,  pay: rate * WEEKS_PER_MONTH };
      case 'monthly':   return { lump: false, every: 1,  pay: rate };
      case 'quarterly': return { lump: false, every: 3,  pay: rate };
      case 'yearly':    return { lump: false, every: 12, pay: rate };
      // A payout after 70 days lands in month 3, so round up.
      case 'lump':      return { lump: true,  every: Math.max(1, Math.ceil(lumpMonths - 1e-9)), pay: 1 + rate };
    }
    throw new Error('Unknown payout frequency: ' + freq);
  }

  // Promised return as a monthly rate, for comparing with a bank.
  function monthlyRate(s) {
    return s.lump ? Math.pow(s.pay, 1 / s.every) - 1 : s.pay / s.every;
  }

  // What a balance that started (or last matured) in month `start` is owed in month t.
  function owed(s, balance, start, t) {
    var age = t - start;
    if (age <= 0 || age % s.every !== 0) return 0;
    if (s.lump && age !== s.every) return 0;
    return balance * s.pay;
  }

  // Run the scheme month by month until the cash pool cannot cover what is owed.
  // One record per depositor cohort (everyone who joined in the same month).
  function simulate(s, params) {
    var p = withDefaults(params);
    var start = [0];    // month the cohort's current balance started earning
    var balance = [1];  // money of theirs the scheme owes returns on
    var putIn = [1];    // outside money the cohort brought in
    var paid = [0];     // cash the cohort has been paid so far
    var raised = 1;     // cumulative outside money, E
    var pool = 1 - p.k; // cash on hand
    var ledger = [{ month: 0, newMoney: 1, raised: 1, due: 0, pool: pool }];
    var due, dueBy = [], fresh, i, t;

    for (t = 1; t <= p.horizon; t++) {
      // 1. Recruitment: logistic in money raised so far.
      fresh = p.g * raised * (1 - raised / p.M);
      if (fresh < 0) fresh = 0;
      raised += fresh;
      pool += (1 - p.k) * fresh;
      start.push(t); balance.push(fresh); putIn.push(fresh); paid.push(0);

      // 2. Dues: everything falling due this month, in cash.
      due = 0;
      for (i = 0; i < start.length; i++) {
        dueBy[i] = owed(s, balance[i], start[i], t);
        due += dueBy[i];
      }
      due *= 1 - p.q;
      ledger.push({ month: t, newMoney: fresh, raised: raised, due: due, pool: pool });

      // 3. Collapse test. Whatever is left in the pool is assumed gone with the operators.
      if (pool < due) return finish(true, t);

      // 4. Pay out; rolled-back money stays in the scheme and keeps earning.
      pool -= due;
      for (i = 0; i < start.length; i++) {
        if (!dueBy[i]) continue;
        paid[i] += (1 - p.q) * dueBy[i];
        if (s.lump) { start[i] = t; balance[i] = p.q * dueBy[i]; }
        else balance[i] += p.q * dueBy[i];
      }
    }
    return finish(false, p.horizon);

    function finish(collapsed, C) {
      var totalIn = 0, totalPaid = 0, lost = 0, behind = 0, half = raised / 2, J = 0;
      for (var j = 0; j < putIn.length; j++) {
        totalIn += putIn[j];
        totalPaid += paid[j];
        if (putIn[j] > paid[j]) { lost += putIn[j] - paid[j]; behind += putIn[j]; }
      }
      while (ledger[J].raised < half) J++;
      return {
        collapsed: collapsed,
        collapseMonth: C,            // months after the scheme started
        raised: raised,              // total outside money ever taken in, seed units
        paidOut: totalPaid,
        operatorKeep: p.k * raised + pool, // their cut plus the pool they walk away with
        lossShare: lost / totalIn,   // share of all money put in that never comes back
        behindShare: behind / totalIn, // share of all money whose owners end up with less than they put in
        typicalJoinMonth: J,         // month half of all the money had come in
        ledger: ledger
      };
    }
  }

  // One family's outcome: they put in `amount` in month `joinMonth` and take every payout as cash.
  function family(s, sim, amount, joinMonth, bankAnnual) {
    var C = sim.collapseMonth, received = 0;
    for (var t = joinMonth + s.every; t < C; t += s.every) {
      received += amount * s.pay;
      if (s.lump) break;
    }
    var monthsLeft = Math.max(0, C - joinMonth);
    return {
      joinMonth: joinMonth,
      monthsLeft: monthsLeft,
      received: received,
      loss: Math.max(0, amount - received),
      bankProfit: amount * bankAnnual * monthsLeft / 12
    };
  }

  // A family that is already in: they joined in `joinMonth` and it is now `nowMonth`.
  // Splits the promised payouts into those due by now and those still to come before collapse.
  function invested(s, sim, amount, joinMonth, nowMonth) {
    var C = sim.collapseMonth, soFar = 0, ahead = 0;
    for (var t = joinMonth + s.every; t < C; t += s.every) {
      if (t <= nowMonth) soFar += amount * s.pay; else ahead += amount * s.pay;
      if (s.lump) break;
    }
    return {
      joinMonth: joinMonth,
      nowMonth: nowMonth,
      monthsLeft: Math.max(0, C - nowMonth),
      receivedSoFar: soFar,
      stillToCome: ahead
    };
  }

  // Everything the calculator needs for its three lines.
  //   input: { amount, rate, freq, lumpMonths, bankAnnual,
  //            schemeAgeMonths (optional), monthsAgo (optional: already invested that long ago) }
  function analyse(input, params) {
    var p = withDefaults(params);
    var s = toSchedule(input.rate, input.freq, input.lumpMonths);
    if (monthlyRate(s) <= p.secpMultiple * input.bankAnnual / 12) {
      return { verdict: 'check-secp', schedule: s };
    }
    var sim = simulate(s, p);
    if (!sim.collapsed) return { verdict: 'check-secp', schedule: s, sim: sim };

    var known = input.schemeAgeMonths != null;
    if (input.monthsAgo != null) {
      // Already in: "now" is the scheme's age if known, else the typical joiner's month plus the time since.
      var now = known ? input.schemeAgeMonths : sim.typicalJoinMonth + input.monthsAgo;
      var held = invested(s, sim, input.amount, Math.max(0, now - input.monthsAgo), now);
      return { verdict: now >= sim.collapseMonth ? 'overdue' : 'collapse', schedule: s, sim: sim, ageKnown: known, invested: held };
    }
    var join = known ? input.schemeAgeMonths : sim.typicalJoinMonth;
    if (join >= sim.collapseMonth) return { verdict: 'overdue', schedule: s, sim: sim };

    return {
      verdict: 'collapse',
      schedule: s,
      sim: sim,
      ageKnown: known,
      family: family(s, sim, input.amount, join, input.bankAnnual)
    };
  }

  // Calendar month the money runs out, counted from `today`.
  function collapseDate(today, monthsLeft) {
    var d = new Date(today.getFullYear(), today.getMonth() + monthsLeft, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }

  var api = {
    DEFAULTS: DEFAULTS,
    TYPES: TYPES,
    typeParams: typeParams,
    invested: invested,
    toSchedule: toSchedule,
    monthlyRate: monthlyRate,
    simulate: simulate,
    family: family,
    analyse: analyse,
    collapseDate: collapseDate
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ScamModel = api;
})(this);
