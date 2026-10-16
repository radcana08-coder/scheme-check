# Collapse model: core formula

Working spec for `formula.js`. This is the base for the methods note; it is not a paper yet.

## 1. Inputs

| Symbol | Meaning | Source |
|---|---|---|
| A | Amount the family puts in (Rs) | User |
| r, freq | Promised return and how often it pays | User |
| n | Months until payout (lump-sum schemes only) | User |
| b | Annual bank rate (chosen bank and account type) | Bank table |
| a | How long the scheme has been running, in months (optional, v1.1) | User |
| g | Recruitment growth per month while the market is empty | Calibrated |
| M | Market size: the most outside money the scheme can ever raise, in seed units | Calibrated |
| k | Operators' cut of every new deposit | Calibrated |
| q | Share of each payout members roll back in (0 = everyone takes cash) | Calibrated, default 0 |

## 2. Payout schedule

Each deposit has a **balance** B and a **start month** s. The ledger moves one month at a time, so the user's input is converted to "pay p × B every e months":

| User says | e (months) | p |
|---|---|---|
| r per day | 1 | r × 365/12 |
| r per week | 1 | r × 365/7/12 |
| r per month | 1 | r |
| r per quarter | 3 | r |
| r per year | 12 | r |
| gain r after n months (lump) | ⌈n⌉ | 1 + r, paid once |

Owed in month t by a deposit started in month s:

- periodic: p·B when (t − s) is a positive multiple of e, otherwise 0
- lump: p·B when t − s = e exactly, otherwise 0. The deposit is then finished.

## 3. Monthly ledger

Seed: E₀ = 1, P₀ = (1 − k), and one deposit B = 1 started in month 0.

For t = 1, 2, 3, …

1. **New money:** Dₜ = g · Eₜ₋₁ · (1 − Eₜ₋₁ / M)
2. **Money raised so far:** Eₜ = Eₜ₋₁ + Dₜ
3. **Pool in:** Pₜ' = Pₜ₋₁ + (1 − k) · Dₜ, and a new deposit B = Dₜ starts in month t
4. **Cash due:** Oₜ = (1 − q) · Σ owed(t) over all deposits
5. **Collapse test:** if Pₜ' < Oₜ, **the collapse month is C = t**. The pool left over is assumed to leave with the operators.
6. Otherwise Pₜ = Pₜ' − Oₜ. Rolled-back money q · owed is added to the deposit's balance (for a lump deposit it restarts as a new deposit in month t).

Accounting check, which holds at collapse: E_C = cash paid out + k·E_C + pool left. `check.js` verifies this every run.

## 4. Why it must collapse (tipping point)

With an empty pool, fresh cash covers dues only while (1 − k) · g · (1 − E/M) ≥ r_monthly. That gives a tipping point:

  **E\*/M = 1 − r_monthly / ((1 − k) · g)**

After E\*, every month's dues are bigger than the new cash coming in, and the scheme lives only on the pool it saved earlier. If r_monthly ≥ (1 − k)·g, the tipping point is 0: the scheme is underwater from the first month and survives only on its starting buffer. The model has no real business income, which is why returns close to the bank rate get the SECP line rather than a date (see §6).

## 5. Where the family stands

- **Joining month J:** if the scheme's age a is known, J = a. Otherwise J is the first month where Eₜ ≥ E_C / 2, which is where the typical rupee enters.
- **Months left:** C − J. In calendar terms that is today + (C − J) months, which is line 1.
- **Received:** the sum of A·p at months J+e, J+2e, … strictly before C. For a lump schedule this is A·(1+r) if J+e < C, otherwise 0.
- **Loss:** max(0, A − received), which is line 2.
- **Bank profit:** A · b · (C − J) / 12, simple profit, before tax. This is line 3.

Scheme-wide figures (for cards and the methods note):

- **Money lost:** Σ max(0, put in − paid) / Σ put in
- **Money behind:** the share of all money whose owners end up with less than they put in

## 6. Verdicts

| Condition | Output |
|---|---|
| r_monthly ≤ 1.5 × b/12 | "Check with SECP": no date, because the model can't tell a scam from a business at this level |
| No collapse within 600 months | "Check with SECP" |
| Known age a ≥ C | "Overdue": by the model, it should already have run out |
| Otherwise | The three lines |

## 7. Results with placeholder defaults (g = 0.30, M = 1000, k = 0.10, q = 0, bank 10%, A = Rs 1 lakh)

| Scheme | Lasts | Typical joiner: months left | Gets back | Loses | Money lost / behind |
|---|---|---|---|---|---|
| 3% a month | 56 | 30 | 87,000 | 13,000 | 15% / 79% |
| 5% a month | 44 | 18 | 85,000 | 15,000 | 20% / 69% |
| 10% a month | 35 | 9 | 80,000 | 20,000 | 29% / 60% |
| 20% a month | 26 | 3 | 40,000 | 60,000 | 49% / 68% |
| 1% a day | 9 | 2 | 30,417 | 69,583 | 55% / 73% |
| Double in 70 days | 3 | 2 | 0 | 100,000 | 100% / 100% |

At 10% a month, varying g over 0.15–0.6 and M over 100–10,000 moves the collapse from 19 to 66 months.

## 8. Known problems to settle in calibration

1. **High-return lump schemes die far too fast at g = 0.30.** Double Shah promised to double money in about 70 days and ran for about two years. The model only reaches that with faster recruitment (g ≈ 0.5–0.8), a large M, or heavy reinvestment (q ≈ 0.5–0.8). So g, and maybe q, probably need to depend on the type of scheme rather than being one global number.
2. **Reinvestment pushes the date later**, so a date computed with q = 0 is not a true "at the latest" date. Either calibrate q or word line 1 as an estimate.
3. **The typical joiner's loss is small at low returns** (13% at 3% a month) even though 79% of the money ends up behind. Line 2 may work better as "X of every 10 rupees put in end up behind" or as the loss compared with the bank.
4. **No principal withdrawals and no bank runs.** Both would make collapse earlier.
5. **Bank profit is simple profit before withholding tax.** Add the tax once the bank table exists.
