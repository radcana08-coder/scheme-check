# اسکیم چیک | Scheme Check

An offline Urdu calculator. It tells a family when a high-return scheme is likely to run out of money, how much they would lose, and what the same money would earn in a bank.

**Status: demo v0.3.** The model parameters are placeholders and have not been calibrated against real collapsed schemes. Don't present the results as findings yet.

**Live:** https://radcana08-coder.github.io/scheme-check/ (formula PDF: https://radcana08-coder.github.io/scheme-check/Collapse-Model-Formula.pdf)

## The shareable file

`dist/scheme-check.html` is the whole app in one file (about 285 KB with logos). It needs no internet and no install.

- **To share:** send the file on WhatsApp, or use the in-app button "یہ کیلکولیٹر کسی کو بھیجیں". On phones that support it, the button opens the share sheet; otherwise it saves the file.
- **To open:** tap the file and open it with Chrome. It runs from the phone's own storage, and the last inputs are remembered on that device.
- **Inputs:** amount, payout frequency, promised return, and optionally how long the scheme has been running. After the result, the page asks which bank (logo tiles) and account type, then shows line 3.
- **Outputs:** three lines in Urdu or English (switch at the top), a "کیوں؟" (why) explanation, and a WhatsApp share of the result.

## Files

| File | What it is |
|---|---|
| `formula.js` | The collapse model: a pure monthly ledger simulation, shared by the app and the scripts |
| `banks.js` | Bank and National Savings profit rates (checked 7 Oct 2026) |
| `src/index.html` | Calculator source (Urdu and English, RTL, mobile-first) |
| `docs/` | The public website GitHub Pages serves: `index.html` (same as the offline file) and the PDF. Written by `build.js` and `make-pdf.js`; don't edit by hand |
| `logos/` | Bank logos embedded in the bank tiles |
| `tools/make-qr.py`, `site.json`, `assets/qr.svg` | The public address and its QR code, shown in the "pass it on" card |
| `build.js` | Inlines the engine and rates into `dist/scheme-check.html` |
| `make-pdf.js`, `pdf/formula.template.html` | Generate `dist/Collapse-Model-Formula.pdf` from the live engine |
| `check.js` | Prints model behaviour for test cases and checks that the money adds up |
| `MODEL.md` | Short version of the formula spec |
| `serve.js` | Tiny local server for previewing `dist/` |

## Commands

```
node check.js       # model test cases
node build.js       # rebuild dist/ and the website in docs/
node make-pdf.js    # rebuild the formula PDF (needs Microsoft Edge)
```

## Updating bank rates

Edit the numbers and the `checked` date in `banks.js`, then run `node build.js` and `node make-pdf.js`. The app footer and the PDF both show the date the rates were checked.

## Known limits

The model is uncalibrated. Lump-sum doubling schemes collapse too fast with the default recruitment rate, and reinvestment pushes dates later. The tax rates on bank profit still need checking against the current Finance Act. See section 14 of the PDF.

## Bank logos

`logos/<bank id>.png|svg` holds each bank's logo, taken from the bank's own website on 15 Oct 2026 (header logo; UBL's is cropped from its site's image sprite, HabibMetro's extracted from its header SVG). `node build.js` embeds whatever is in the folder; a bank with no file shows its short letters. The logos are the banks' trademarks, used only to identify them; check whether you need the banks' permission before wide public use.

## Public website (GitHub Pages)

GitHub Pages serves the `docs/` folder of the `main` branch at https://radcana08-coder.github.io/scheme-check/. To update the website, run `node build.js` (and `node make-pdf.js` if the formula changed), then commit and push; the site refreshes within a minute or two.

If the address ever changes, run `py tools/make-qr.py <new address>` and rebuild, so the QR code and the WhatsApp link point to the right place.

## Features (v0.2)

- Scheme type tiles (money doubling, committee, crypto/app, forex, Modaraba, other). Each fills a typical promise and uses its own model settings (`TYPES` in `formula.js`).
- Promise in percent or rupees (rupees are converted using the amount).
- "Already invested" mode: received so far, money at risk, what a bank would have paid since.
- Money-tank chart of the scheme's cash from start to collapse.
- Listen button (phone's text-to-speech; Urdu needs an Urdu voice installed).
- Warning-sign checklist (6 yes/no questions → none / warning / high risk).
- Tax switch on the bank line: non-filer, filer, before tax (`tax` in `banks.js`, to be verified).

## Design (v0.3)

Navy and gold, always light: a navy header band with a faint gold eight-point star pattern and a shield logo, a trust strip (free, works offline, no sign-up, not linked to any company, rates date), white cards with a soft shadow, an About and sources section (what it is, how the maths works with a link to the PDF, where the numbers come from, limits, open code) and a navy footer band. Colours are the tokens at the top of the `<style>` block in `src/index.html`.

## Response log (Google Sheet)

Each check on the public website (and on offline copies, once they're back online) adds one anonymous row to a Google Sheet: device id (random, not linked to a person), where it ran, language, mode, scheme type, how the scheme reached them and its name (both optional), payout frequency, promise per month, result, months left, whether a warning was shown, and app version. Never a name, phone number or amount. The same scheme counts once per device per day.

`tools/scheme-log.gs` is the Google Apps Script that receives the rows and builds three tabs:

- **Checks**: one row per check.
- **Reach**: young savers you reach yourself (First Account sessions, cards in WhatsApp groups) — fill in by hand.
- **Summary**: the totals and a ready line: "Checked X forwarded schemes; alerted X+ young savers".

Set-up, once: in a new Google Sheet open Extensions → Apps Script, replace the code with `tools/scheme-log.gs`, save, run `setup`, then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone). Put the `/exec` address in `site.json` as `"log"`, run `node build.js`, commit and push. Until then the site counts nothing.

To test locally without touching the Sheet: set `"log": "http://localhost:4173/__log"`, build, run `node serve.js` and open `http://localhost:4173/scheme-check.html?logtest`.
