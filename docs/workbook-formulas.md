# TSPi workbook formulas

Extracted from `docs/TSPI_WORKBOOK20020301.xls` (sheet values with xlrd, cell formulas via
LibreOffice → openpyxl, VBA macros via olevba). Reproduce with `scripts/extract-workbook.py`.
These are the formulas implemented in `/lib/tsp`. Where the app deliberately differs, it says so.

Cell references are workbook rows/columns, kept so each formula can be traced.

## Reference tables

- **Phases** (sheet `Phases`): MGMT, STRAT, PLAN, REQ, STP, REQINSP, HLD, ITP, HLDINSP, DLD, DLDR, TD,
  DLDINSP, CODE, CR, COMPILE, CODEINSP, UT, IT, ST, DOC, PM, AT, PL. Time is logged for all except AT
  and PL; defects are injected/removed in all except MGMT, STRAT, DOC, PM. → `lib/tsp/phases.ts`
- **Defect types** (sheet `DefectTypes`): 10 Documentation, 20 Syntax, 30 Build/Package,
  40 Assignment, 50 Interface, 60 Checking, 70 Data, 80 Function, 90 System, 100 Environment.
- **Roles** (sheet `Roles`): Team Leader, Development Manager, Planning Manager,
  Quality/Process Manager, Support Manager.
- **Quality guidelines** (sheet `QualGuide`, SUMQ columns K–L): default plan phase yields
  (REQINSP, HLDINSP, DLDR, DLDINSP, CR, CODEINSP 70%; COMPILE 50%; UT 90%; IT, ST 80%; AT 65%) and
  default plan injection rates per hour (REQ 0.25, HLD 0.25, DLD 0.75, CODE 2.0, COMPILE 0.3, UT 0.067).

## LOGT — Time Recording Log

Fields: Assembly (component), Phase, Task, Date, Start, Int. (minutes), Stop, Delta, Comments.

- `Delta = Stop − Start − Int` (minutes); `Int ≤ Stop − Start`.
- Header `Hours = SUM(Delta) / 60`.
- LOGT rolls up to TASK (actual hours per task), SCHEDULE (actual hours per week) and SUMP (time in phase).

## LOGD — Defect Recording Log

Fields: Date, Num (sequence), Type, Assembly, Injected (phase), Removed (phase), Fix Time (minutes),
Fix Ref. (defect number), Description. Rolls up to SUMS, SUMP and SUMQ.

## TASK — Task Planning Template

Columns: Assembly, Phase, Task, plan hours by role (5 roles), Estimated Size, Size Measure, Rate,
Estimated Hours, Plan Hours, Plan Date, Plan Week, Actual Hours, Actual Date, Actual Week,
Earned Value, Cumulative EV, Cumulative Plan Hours, Cumulative Plan Value, Plan Value.

- `Estimated Hours = Size / Rate` (when both present).
- `Plan Hours = Σ plan hours by role` (or entered directly). *App: one assigned member + plan hours.*
- `Total Plan Hours (N2) = SUM(Plan Hours)`; `Total Actual Hours (U2) = SUM(Actual Hours)`.
- `Plan Value = Plan Hours / Total Plan Hours` (shown as %).
- `Cumulative Plan Hours`, `Cumulative Plan Value`: running totals in task order.
- `Plan Week` = first SCHEDULE week whose cumulative planned hours ≥ the task's cumulative plan hours;
  `Plan Date` = that week's Monday.
- `Actual Hours = Σ LOGT Delta for the task / 60`.
- `Actual Week` = project week of Actual Date (completion date).
- `Earned Value = Plan Value` once the task is 100% complete (Actual Date entered), else 0.

## SCHEDULE — Schedule Planning Template

Columns: Date (Monday), Week, Planned Hours, Cumulative Planned Hours, Actual Hours, Cumulative
Actual Hours, Planned Value, Cumulative PV, Earned Value, Cumulative EV, Predicted Hours,
Cumulative Predicted Hours, Predicted EV, Cumulative Predicted EV.

- `Total Task Plan Hours (I3) = SUM(Task!Plan Hours)`; `Total Schedule Plan Hours (I4) = SUM(Planned Hours)`;
  `Difference (I5) = I3 − I4`; warning "add schedule hours" when I3 > I4.
- `Actual Hours (week) = Σ LOGT Delta for dates within the week / 60`.
- `PV (week) = Σ Plan Value of tasks whose Plan Week = week`.
- `EV (week) = Σ Plan Value of tasks completed in that week`.
- `Predicted EV` = based on average weekly EV to date (projects the remaining weeks).
  *App: average over working weeks since the first planned week; break weeks are excluded and predict 0.*
- Consolidation (VBA): team plan = sum of member plans; member PV/EV are weighted by
  `member plan hours / team plan hours`.

## WEEK — Weekly Summary

- Schedule hours for this week / cycle to date (plan, actual); earned value this week / to date;
  to-date hours for tasks completed; `average hours per week = to-date hours / week`.
- `Plan/Actual` ratio column `= Plan / Actual`.
- Role table: plan hours, actual hours, PV, EV per role.
- Development tasks completed or due: task, phase, resource, plan hrs, actual hrs, EV/PV, planned week.
- *App adds (from the course brief): risks and issues, next week's plan.*

## SUMS — Size Summary

Per assembly/part: ID, name, (A)ssembly or (P)art, parent, owner, size measure, then plan and actual
Base, Deleted, Modified, Added, Reused (entered), and:

- `New and Changed = Modified + Added`
- `Total = N&C + Base − Deleted − Modified + Reused` (SUMP row 16), which simplifies to
  `Base − Deleted + Added + Reused` (modified lines are already in Base).
- Plus planned/actual defects injected and removed and planned/actual time, per phase (rolled up).

## SUMP — Plan Summary (per assembly or SYSTEM)

- Program size: requirements pages, HLD pages, DLD lines, B, D, M, A, R, `N = M + A` (row 15),
  `T = N + B − D − M + R = B − D + A + R` (row 16), total new reuse.
- Time in phase (hours): plan (from TASK by phase), actual (from LOGT), `Actual% = phase / total`.
- Defects injected and removed per phase: plan (from SUMQ plan rates and yields), actual (from LOGD),
  `Actual%`; totals `Σ` (rows 69, 90); Acceptance Test and Product Life rows.
- `LOC/Hour = N / total hours` (plan and actual).
- `CPI = total plan hours / total actual hours`.
- `%Reuse = R / T`; `%New Reuse = new reuse / N`.

## SUMQ — Quality Plan (per assembly or SYSTEM)

With `N` = new and changed LOC (SUMP row 15), all ratios 0 when the denominator is 0:

- **Percent defect free** (actual): over leaf parts measured in LOC,
  `PDF(phase) = 1 − (parts with any defect removed in phase / number of parts)` for COMPILE, UT, IT, ST, AT, PL.
- **Defects/page**: `REQINSP removed / requirements pages`, `HLDINSP removed / HLD pages`.
- **Defects/KLOC**: `removed in phase / N × 1000` for DLDR, DLDINSP, CR, COMPILE, CODEINSP, UT, IT, ST;
  total development, AT, PL; total = `(dev + AT + PL) / N × 1000`.
- **Defect ratios**: `DLDR removed / UT removed`; `CR removed / COMPILE removed`.
- **Development time ratios**: `REQINSP / REQ`, `HLDINSP / HLD`, `DLD / CODE`, `DLDR / DLD`, `CR / CODE`.
- **Inspection/review rates**: `REQ pages / REQINSP hours`, `HLD pages / HLDINSP hours`,
  `DLD lines (or N) / DLDR hours`, `DLD lines / DLDINSP hours`, `N / CR hours`, `N / CODEINSP hours`.
- **A/FR** (appraisal/failure ratio): `(DLDR + DLDINSP + CR + CODEINSP time) / (COMPILE + UT time)`.
- **Phase yield** (actual): `removed in phase / (injected in all phases up to and including it − removed before it)`.
- **Process yield**: `% before COMPILE, UT, IT, ST = removed before that phase / injected before that phase`;
  `% before AT = total development removed / total development injected`.
- **Defect injection rates** (actual): `injected in phase / hours in phase`.
- **Defect removal rates** (plan and actual): `removed in phase / hours in phase`.
- Plan inputs: planned defect injection rate and planned phase yield per phase.
- *App: planned defects injected = plan rate × plan hours; planned removed = plan yield × defects present
  (escaped from earlier phases + injected in the phase); AT removes its yield of what escapes ST, the rest is
  Product Life. Ratios with a zero denominator show "—" instead of 0.*

## PROJECT charts

Earned value (cumulative planned, earned, predicted per week), plan vs actual hours, defect removal
profile (defects/KLOC per removal phase), quality profile (five points, sheet `QProfParam`:
design/code time 1.0, code review time 0.5, compile defects/KLOC 10, unit test defects/KLOC 5,
design review time 0.5), percent defect free.
