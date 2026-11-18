# Campus Stores

Campus Stores is a Product Engineer work sample set at a fictional campus media equipment desk. Work through a club’s screening, from equipment pickup to a partial return and the next morning’s handover. Open **Candidate brief** in the app for the assignment. My response follows.

## TL;DR

The register closes a loan based on which row the worker clicks, but at a return the desk's real question is "which object is on my counter right now?". At the Saturday handover a new worker who is handed "an adapter" can close the adapter slip with one click, and the app will then offer a still-missing unit to the next club. I replaced the one-click return with a label-first check-in: the worker reads the ID off the item, the app finds the slip that unit left on, and anything not out on loan closes nothing.

## My shift

- **Fri 3:45 pm, pickup.** I issued PR-04, SP-02 and AD-12 to Kabir on RQ-214 as three separate slips. When I tried to add AD-15 as well, the app refused: "The approved quantity of this equipment type is already on loan."
- **Fri 7:30 pm, partial return.** I clicked **Record return** on the projector and speaker. Each closed in one click with no record of who returned it or when. The adapter slip still said Kabir Sen. The only place to record that Leela has it is a free-text desk book note.
- **Sat 9 am, handover.** As the new worker I saw two open slips with identical **Record return** buttons: Tara's mic (L-401) and the adapter (L-404). Leela handed me "an adapter". Nothing asked me which one. One click on L-404 closed it, and Inventory showed AD-12 **On shelf**, whatever she had actually brought.

## The insight

**The app records paperwork; the desk's job is knowing where physical objects are.** A return is the one moment the object and the record are both on the counter, and the app ignores the object. That one gap explains several entries in the [failure atlas](docs/FAILURE-ATLAS.md): a personal adapter can close a desk loan (#1), a misclick closes Tara's mic slip (#2), AD-15 can close AD-12's slip (#3), and a closed slip carries no time or person (#5).

## What works well

Issuing. The issue form only lists units that are on the shelf and not in repair, refuses a type that isn't on the approved request, and refuses a second unit of an approved type. In my shift it stopped me issuing AD-15 after AD-12, which is exactly the mistake two same-bin adapters invite. The app is careful about what leaves the desk.

## What I changed

**The moment:** Saturday 9 am, closing the adapter loan.

**How a careful worker still gets it wrong:** the new worker reads the desk book, sees Kabir's note that Leela has "our adapter", finds the only adapter slip, L-404, and clicks **Record return**. That is the right row. But Leela uses a USB-C laptop and brought her own adapter. The slip closes, AD-12 shows On shelf, and the next club is issued a unit that is not in bin C4. Nobody notices until a worker opens an empty bin in front of a student.

**Why this one:** it is the only failure where doing the obvious thing correctly still produces a false record. It applies to every return, not one edge case, and the damage spreads: lost equipment, a double booking, and blame landing on whoever touched the slip last. A partial kit at pickup (#6) can cost a screening, but the worker can see the gap at the counter. A false "On shelf" is invisible.

**The change** (`app.js`: `checkIn()`, the Loan register form, `restore()`):

- **Record return** no longer closes a slip. It, and a new **Check in a unit** button, open a short form: *Unit ID on the label* and *Handed over by*.
- The label decides which slip closes, not the row. `ad12`, `AD 12` and `AD-12` all match.
- An unknown label closes nothing and says the item may be personal property. A desk unit that isn't on loan closes nothing and names the open slip of that type: "AD-15 is not on loan. It should already be on shelf C4. The open USB-C → HDMI adapter slip is L-404 for AD-12 (RQ-214, Kabir Sen). Ask for the unit that left."
- On success the status says who handed it over, who collected it, and what that request still has out ("RQ-214 still out: AD-12 with Kabir Sen"). Closed slips show "Returned Saturday · 9:00 am by Leela Das".
- Errors appear inline in the form with `role="alert"`, and focus returns to the label field.
- Saved data moves to version 2. Version 1 saves still restore; the open form is never restored.

**Known tradeoff:** if a worker keyed AD-12 at pickup but physically handed over AD-15 (same bin), the check-in refuses AD-15 at return. I treat that as correct: the register was wrong from pickup and a supervisor should fix it, rather than letting the return quietly paper over it.

## Options I considered

Scores out of 5: impact on this moment, size and risk (5 = small and safe), fit with the product.

| Option | Impact | Size | Fit | Why not chosen |
|---|---|---|---|---|
| **Label-first check-in** (chosen) | 5 | 4 | 5 | |
| Confirm dialog on Record return | 2 | 5 | 4 | A tired worker confirms the dialog too. It never asks about the object. |
| Structured custody transfer (Kabir to Leela) | 3 | 3 | 4 | Records who holds it, but still lets the wrong item close the slip. Check-in captures "handed over by" anyway. |
| Request kit view (issued / returned / outstanding) | 3 | 3 | 5 | Helps reading the handover, not closing the loan. The status line gives the key fact. |
| Clock-aware overdue flags | 2 | 4 | 5 | Useful, but doesn't stop a false return. |
| Auto-generated handover summary | 3 | 3 | 3 | Summarises the register, so it repeats the register's errors. |
| Undo on return | 2 | 4 | 4 | Only helps if someone notices, and the false record is invisible. |

## The same shift with my change

| Step | Before | After |
|---|---|---|
| Sat 9 am, Leela hands over an unlabelled adapter | One click closes L-404. AD-12 shows On shelf and is offered for issue. | There is no ID to type, so nothing closes. |
| She hands over AD-15 | L-404 closes for AD-12 | "AD-15 is not on loan... The open slip is L-404 for AD-12. Ask for the unit that left." |
| She hands over AD-12, but the worker opened Tara's row by mistake | Tara's mic slip would close | L-404 closes because the label decides. L-401 stays open. |
| Look at the closed slip later | "Returned" | "Returned Saturday · 9:00 am by Leela Das" |

`tests/shift.spec.mjs --shots` writes before and after screenshots of these moments into `docs/`.

## What I kept

- Every issue guardrail, unchanged.
- One slip per physical unit. The check-in only works because of it.
- The **Record return** button where workers already look. It now opens the check-in instead of acting.
- The desk book as free text. Notes carry context; the register carries facts.
- No dependencies and no build step. The app still opens offline from `index.html`.

## How I'd know it worked

**What to watch:** at a real counter, for two weeks of returns, after each closed slip walk to the unit's home bin and check the labelled unit is there. Do the same for the two weeks before the change.
**Success:** zero closed slips whose unit is missing from its bin, against a non-zero count before.
**Roll back if:** workers type the ID from the screen or the paper slip instead of the item (watch where their eyes go when they type), or a return takes more than about 15 seconds longer. Either means the check is friction, not verification.

## What I'd do next

- Tie the collector and the return-by time to the request at issue (atlas #7 and #8).
- Show an overdue state and who holds a unit wherever it appears (#9 and #11).
- Move the register to a shared backend so two desk computers see one record (#15).

## Tests

Dev-only. The app itself has no dependencies.

```sh
cd tests
npm install
npx playwright install chromium
node shift.spec.mjs --original   # upstream code: the failures happen
node shift.spec.mjs              # changed code: they are blocked
node shift.spec.mjs --shots      # also writes screenshots into docs/
```

## Run the app

Open `index.html` in a modern browser. The app includes its scripts, styles, and icons and can run offline.

To serve it over local HTTP, run this from the repository folder and visit `http://localhost:8000`.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Each browser stores its own sample shift locally when browser storage is available. **Restart sample shift** restores the fictional starting records.

## Source

- `index.html` contains the desk layout, candidate brief, and bundled icons.
- `app.js` contains the sample records and interactions.
- `styles.css` defines the desktop and mobile layouts.
- `docs/FAILURE-ATLAS.md` lists every failure I found.
- `tests/` holds the dev-only scenario test.

Icon license notices are in [third-party/lucide-LICENSE.txt](third-party/lucide-LICENSE.txt).


## Submit your work

1. [Fork Campus Stores](https://github.com/virinchi-healthcare/campus-stores/fork) into your GitHub account. Complete the candidate brief and push your changes to your public fork. In your README, point reviewers to your work and explain the decision you made.
2. In your fork, open **Commits**, select the final commit you want reviewed, and copy the page URL. It should look like `https://github.com/YOUR-USERNAME/campus-stores/commit/COMMIT-SHA`.
3. [Submit your work through the Google Form](https://docs.google.com/forms/d/e/1FAIpQLScvzoh1R4WS-SkiwAVBQbMvniieJYSoOEfLMyVo5CyjOvYUgQ/viewform). Your **roll number**, **email ID**, and **final commit link from your public fork** are required. Enter your roll number and email ID in the form only.
