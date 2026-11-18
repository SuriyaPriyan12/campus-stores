# Failure atlas

Found by playing the shift in a headless browser (`tests/shift.spec.mjs`) and by reading `app.js`. Sorted by severity. "Fixed" means fixed by the label-first check-in.

| # | Scenario | Steps | Consequence | Likelihood | Severity | My change |
|---|---|---|---|---|---|---|
| 1 | Slip closed for an object that never came back | Sat 9 am, Leela hands over her own unlabelled adapter. Loan register, click **Record return** on L-404. | AD-12 shows **On shelf** and is offered in the next issue form. The real unit is lost and the next club is promised a unit that isn't there. | High: the brief literally says "an adapter" | Critical | Fixed: an unlabelled or unknown item closes nothing |
| 2 | Wrong slip closed by a misclick | Two adjacent rows both say **Record return** (L-401 Tara's mic, L-404 adapter). Click the wrong one. | MI-09 shows On shelf while Tara still has it; it can be issued twice. Leela's slip stays open and gets chased later. No confirm, no undo. | Medium | Critical | Fixed: the row only opens the form; the label decides which slip closes |
| 3 | Wrong desk unit accepted | Leela brings AD-15 (same type, same bin C4). Click Record return on L-404. | Slip for AD-12 closes; AD-12 is still out. | Medium | High | Fixed: "AD-15 is not on loan... open slip is L-404 for AD-12" |
| 4 | Change of custody only in free text | Fri 7:30 pm Kabir says Leela has the adapter. Only option is a desk book note. | Slip still says Kabir Sen; nobody can tell from the register who holds it. | Certain | High | Partly: check-in records "Handed over by" and shows "collected by" in the status |
| 5 | Return leaves no trace | Close any slip, view **All slips**. | Only a "Returned" tag: no time, no person. Disputes can't be settled. | Certain | High | Fixed: "Returned Saturday · 9:00 am by Leela Das" |
| 6 | Partial kit leaves with no warning | Issue only PR-04 and SP-02, then **Move to return time**. | Kabir leaves without the adapter a USB-C laptop needs; the screening fails. | Medium | High | Out of scope |
| 7 | Collector not checked against request | Issue RQ-214 kit to Dev Menon. | Anyone in the people list can collect for any club. Kabir's authority exists only in a desk book note. | Medium | Medium | Out of scope |
| 8 | Return-by not tied to the request | Choose "Sat noon" for RQ-214 (due Fri 8 pm). | Slip carries a wrong due time; overdue chasing is wrong. | Medium | Medium | Out of scope |
| 9 | No overdue state | Advance to Sat 9 am. | L-404 (due Fri 8 pm) looks the same as an on-time slip. | Certain | Medium | Out of scope |
| 10 | Requests page shows no issue progress | Open RQ-214 after pickup. | No issued / returned / outstanding view per request. | Certain | Medium | Partly: check-in status line says what the request still has out |
| 11 | Inventory doesn't say who has a unit | Inventory after pickup. | "On loan" only; worker must cross-reference the register. | Certain | Medium | Out of scope |
| 12 | Issue-form errors are easy to miss | Issue AD-15 after AD-12 for RQ-214. | Error appears only in the status bar under the page and is overwritten by the next repaint. | High | Medium | Out of scope (my new check-in errors are inline, `role="alert"`) |
| 13 | Same-bin adapters can be mis-keyed at pickup | Pick AD-12 in the dropdown, hand over AD-15 from bin C4. | Register disagrees with reality from the start. | Medium | Medium | Surfaced: at return the label check flags the mismatch |
| 14 | Handover notes have no author and no link | Add a desk book note. | Shown as "Counter handover", not tied to any slip or request. | Certain | Low | Out of scope |
| 15 | Per-browser storage | Use a second desk computer or clear site data. | Each computer has its own register; records diverge or vanish. | Certain in a real deployment | High (real), N/A (prototype) | Out of scope: needs a backend |
| 16 | Restore validates loans loosely | Saved data with `back: "yes"` or unknown `who`. | Restored without complaint. Fixed for the new `by` field only. | Low | Low | Partly |
| 17 | Some HTML built without escaping | `requestPage()` and `head()` insert request fields raw. | Safe today (static data); unsafe if requests ever come from a form. | Low | Low | Out of scope |
