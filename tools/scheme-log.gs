/**
 * @OnlyCurrentDoc  (the script can open only this Sheet, not your other files)
 *
 * Scheme Check response log (Google Apps Script, bound to your tracking Google Sheet).
 *
 * Every check on the website adds one anonymous row to the "Checks" tab. No name,
 * phone number or amount is ever sent. The "Summary" tab turns those rows, plus the
 * young savers you log by hand in the "Reach" tab, into the numbers for your write-up.
 *
 * Set-up, once:
 *   1. In a new Google Sheet: Extensions > Apps Script. Replace the code with this file. Save.
 *   2. Pick setup in the function list and press Run (allow the permissions it asks for).
 *   3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Deploy.
 *   4. Copy the Web app address (it ends in /exec) and add it to the website.
 */

var CHECKS = 'Checks', REACH = 'Reach', SUMMARY = 'Summary';

var CHECK_HEAD = ['Time', 'Device', 'Where', 'Language', 'Mode', 'Scheme type', 'How it reached them',
  'Scheme name', 'Pays', 'Promise per month (%)', 'Result', 'Months left', 'Warning shown', 'App version'];

// Only these values are accepted; anything else is ignored, so junk can't fill the Sheet.
var ALLOWED = {
  where: ['web', 'file', 'other'],
  lang: ['ur', 'en'],
  mode: ['think', 'already'],
  type: ['double', 'committee', 'crypto', 'forex', 'modaraba', 'other'],
  source: ['whatsapp', 'person', 'social', 'other', ''],
  freq: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'lump'],
  verdict: ['collapse', 'overdue', 'check-secp']
};

/** Creates the Checks, Reach and Summary tabs. Safe to run again: it never deletes rows. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var checks = ss.getSheetByName(CHECKS) || ss.insertSheet(CHECKS);
  checks.getRange(1, 1, 1, CHECK_HEAD.length).setValues([CHECK_HEAD]).setFontWeight('bold');
  checks.setFrozenRows(1);

  var reach = ss.getSheetByName(REACH) || ss.insertSheet(REACH);
  reach.getRange(1, 1, 1, 5).setValues([['Date', 'Activity', 'Place or group', 'Young savers reached', 'Notes']])
    .setFontWeight('bold');
  reach.setFrozenRows(1);
  reach.getRange('B2:B').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['First Account session', 'Cards shared in a WhatsApp group', 'Other'], true).build());

  var sum = ss.getSheetByName(SUMMARY) || ss.insertSheet(SUMMARY, 0);
  sum.clear();
  var rows = [
    ['Your numbers', ''],
    ['Schemes checked on the site (all)', '=COUNTA(Checks!A2:A)'],
    ['Forwarded schemes checked (came on WhatsApp)', '=COUNTIF(Checks!G2:G,"whatsapp")'],
    ['Different schemes named', '=IFERROR(COUNTUNIQUE(FILTER(LOWER(TRIM(Checks!H2:H)),Checks!H2:H<>"")),0)'],
    ['People who used the site (devices)', '=IFERROR(COUNTUNIQUE(FILTER(Checks!B2:B,Checks!B2:B<>"")),0)'],
    ['People alerted on the site (saw a warning)', '=IFERROR(COUNTUNIQUE(FILTER(Checks!B2:B,Checks!M2:M="yes")),0)'],
    ['Young savers reached at sessions and through cards (Reach tab)', '=SUM(Reach!D2:D)'],
    ['Alerted in total (site + sessions and cards)', '=B6+B7'],
    ['', ''],
    ['Line for your write-up', '="Checked "&TEXT(B3,"#,##0")&" forwarded schemes; alerted "&TEXT(B8,"#,##0")&"+ young savers"'],
    ['', ''],
    ['Notes', 'Each device counts once per scheme per day. The site does not ask age, so people alerted on the site ' +
      'are not age-checked; log First Account sessions and card shares in the Reach tab. To count every scheme ' +
      'checked rather than only forwarded ones, change B3 to B2 in the write-up line.']
  ];
  sum.getRange(1, 1, rows.length, 2).setValues(rows);
  sum.getRange('A1').setFontWeight('bold').setFontSize(14);
  sum.getRange('A2:A10').setFontWeight('bold');
  sum.getRange('B10').setFontWeight('bold');
  sum.getRange('B12').setWrap(true);
  sum.setColumnWidth(1, 430);
  sum.setColumnWidth(2, 520);

  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 3) ss.deleteSheet(blank);
}

/** Receives one check from the website and appends it to the Checks tab. */
function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents;
    if (!body || body.length > 2000) return done_();
    var d = JSON.parse(body);

    for (var key in ALLOWED) {
      if (ALLOWED[key].indexOf(String(d[key] == null ? '' : d[key])) === -1) return done_();
    }
    var device = String(d.device || '');
    if (!/^[a-z0-9]{8,32}$/.test(device)) return done_();
    var rate = Number(d.rate);
    if (!(rate >= 0 && rate <= 100000)) return done_();
    var months = d.months === '' || d.months == null ? '' : Number(d.months);
    if (months !== '' && !(months >= 0 && months <= 600)) return done_();

    var name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (/^[=+\-@]/.test(name)) name = "'" + name; // a name must never run as a formula
    var version = String(d.version || '').replace(/[^0-9.]/g, '').slice(0, 10);

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CHECKS).appendRow([
        new Date(), device, d.where, d.lang, d.mode, d.type, d.source, name, d.freq,
        Math.round(rate * 100) / 100, d.verdict, months, d.warning ? 'yes' : 'no', version
      ]);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    // Bad or partial data is ignored; the website never waits for an answer.
  }
  return done_();
}

/** Opening the /exec address in a browser shows this, so you can tell the log is running. */
function doGet() {
  return ContentService.createTextOutput('Scheme Check log is running.');
}

function done_() {
  return ContentService.createTextOutput('ok');
}
