/*
 * banks.js: profit rates for line 3 (the bank comparison).
 *
 * Rates are % per year, before tax, for individuals with balances up to Rs 10 million.
 * savings = conventional savings account, islamic = Islamic savings account (declared
 * pool rate, changes monthly), fixed = 1-year term deposit or certificate.
 * A missing entry means no reliable current figure was found; the calculator hides it.
 * mark = short letters shown on the bank's tile until an official logo is added in logos/<id>.png or .svg.
 *
 * To update: change the numbers and `checked`, then run `node build.js`.
 */
(function (root) {
  'use strict';

  var BANKS = {
    checked: '2026-10-07',
    policyRate: 11.5, // SBP policy rate, held 14 Sep 2026
    reference: 10.0,  // savings rate banks must show small savers; used for the "check SECP" test
    // Withholding tax on profit, % (section 151). Sources disagree; these follow FBR's rate
    // card and most 2026 guides. Verify against the current Finance Act before release.
    tax: { bank: { filer: 20, nonfiler: 40 }, cdns: { filer: 15, nonfiler: 30 } },
    sources: [
      'Bank rate sheets as compiled by pakera.pk (savings and fixed deposit roundups, checked 6-7 Oct 2026)',
      'Islamic savings declarations as compiled by halalwallet.pk (June 2026)',
      'CDNS rate summary w.e.f. 1 Oct 2026, as compiled by pakera.pk'
    ],
    list: [
      { id: 'cdns', mark: 'NS', taxGroup: 'cdns', ur: 'قومی بچت (نیشنل سیونگز)', en: 'National Savings (CDNS)',
        savings: { rate: 10.00, product: 'Savings Account', asOf: '2026-10' },
        islamic: { rate: 11.33, product: 'Sarwa Islamic Savings Account', asOf: '2026-10' },
        fixed:   { rate: 11.31, product: 'Short Term Savings Certificate, 12 months', asOf: '2026-10' } },
      { id: 'hbl', mark: 'HBL', ur: 'ایچ بی ایل', en: 'HBL',
        savings: { rate: 10.00, product: 'PLS Savings', asOf: '2026-10' },
        islamic: { rate: 7.23, product: 'HBL Islamic savings (declared)', asOf: '2026-06' },
        fixed:   { rate: 10.60, product: 'HBL Advantage, 1 year', asOf: '2026-10' } },
      { id: 'meezan', mark: 'MBL', ur: 'میزان بینک', en: 'Meezan Bank',
        islamic: { rate: 6.63, product: 'Savings (declared)', asOf: '2026-09' },
        fixed:   { rate: 9.56, product: 'Certificate of Islamic Investment, 1 year', asOf: '2026-09' } },
      { id: 'ubl', mark: 'UBL', ur: 'یو بی ایل', en: 'UBL',
        savings: { rate: 10.00, product: 'Savings Account', asOf: '2026-10' } },
      { id: 'mcb', mark: 'MCB', ur: 'ایم سی بی', en: 'MCB',
        savings: { rate: 10.00, product: 'Savings', asOf: '2026-08' },
        fixed:   { rate: 7.12, product: 'Term Deposit, 1 year', asOf: '2026-08' } },
      { id: 'abl', mark: 'ABL', ur: 'الائیڈ بینک', en: 'Allied Bank',
        savings: { rate: 10.00, product: 'PLS Savings', asOf: '2026-10' },
        fixed:   { rate: 10.50, product: 'Behtar Munafa, 1 year', asOf: '2026-10' } },
      { id: 'alfalah', mark: 'BAF', ur: 'بینک الفلاح', en: 'Bank Alfalah',
        savings: { rate: 10.00, product: 'PLS Savings', asOf: '2026-08' },
        islamic: { rate: 6.51, product: 'Alfalah Islamic savings, base (declared)', asOf: '2026-06' },
        fixed:   { rate: 10.20, product: 'Term Deposit below Rs 1m, 1 year', asOf: '2026-08' } },
      { id: 'bahl', mark: 'BAH', ur: 'بینک الحبیب', en: 'Bank AL Habib',
        savings: { rate: 10.00, product: 'Savings', asOf: '2026-10' },
        islamic: { rate: 8.00, product: 'Islamic savings (declared)', asOf: '2026-06' },
        fixed:   { rate: 10.00, product: 'Fixed Term, 1 year', asOf: '2026-08' } },
      { id: 'js', mark: 'JS', ur: 'جے ایس بینک', en: 'JS Bank',
        savings: { rate: 10.00, product: 'Savings', asOf: '2026-10' },
        fixed:   { rate: 10.90, product: 'Term Deposit, 1 year', asOf: '2026-10' } },
      { id: 'bankislami', mark: 'BI', ur: 'بینک اسلامی', en: 'BankIslami',
        islamic: { rate: 6.78, product: 'Savings (declared)', asOf: '2026-08' } },
      { id: 'habibmetro', mark: 'HMB', ur: 'حبیب میٹرو (صراط)', en: 'HabibMetro Sirat',
        islamic: { rate: 8.48, product: 'Sirat savings (declared)', asOf: '2026-06' } }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = BANKS;
  else root.BANKS = BANKS;
})(this);
