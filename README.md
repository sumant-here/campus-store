# Campus Stores · Product Engineer Work Sample

**Candidate:** Senior Product Engineer, UX Designer & Full-Stack Developer  
**Company:** Virinchi Healthcare  
**Work Sample:** Campus Media Equipment Desk Management & Shift Handover

---

## Executive Summary & Candidate Brief Responses

### Would you keep this product?
**Verdict:** **Yes, keep and evolve the product.**  
The core premise—a focused, offline-ready, single-page operational desk tool with strict physical unit tracking and request validation—is solid and well-aligned with high-turnover campus equipment desks. However, the original version suffered from a critical operational breakdown during **partial returns and cross-shift handovers**. Rather than discarding the application, we evolved the architecture to provide full lifecycle custody tracking, request-level visibility, and proactive shift handover alerts.

### 1. One moment the product handles well (Evidence from shift)
* **Moment:** Equipment issue validation against approved requests (*Friday · 3:45 pm*).
* **Evidence:** When issuing items for the Film Society screening (`RQ-214`), the application strictly enforces:
  1. The physical unit must be available and not in repair (e.g. `PR-06` in Workshop repair cannot be issued).
  2. The unit must match an approved equipment type listed on the request form.
  3. The quantity cannot exceed what was approved (preventing double-allocations).
* **Why this matters:** Counter staff during a 3:45 pm rush cannot accidentally issue damaged or unapproved units, protecting hardware integrity and departmental policy.

### 2. One moment to change (Evidence from shift)
* **Moment:** The partial return and morning handover breakdown (*Friday · 7:30 pm → Saturday · 9:00 am*).
* **Evidence:** At 7:30 pm, Kabir Sen returns the projector (`PR-04`) and speaker (`SP-02`), but notifies the counter that Leela Das has retained the adapter (`AD-12`) to drop off at 9:00 am Saturday.
  * In the original product:
    * Returns were only recorded as disconnected individual slip closures. There was no concept of a "Partial Return" for a multi-item kit.
    * The outstanding slip (`L-404`) continued to display **Kabir Sen** as the responsible person and **Due Fri 8 pm** as the deadline.
    * There was no structured way to update the slip with Leela Das's custody or the revised 9:00 am deadline.
    * At 9:00 am Saturday, the morning worker had zero indication in the Loan Register that Leela was expected. The slip appeared overdue under Kabir's name, risking confrontational confusion, incorrect disciplinary flags, and lost equipment.

### 3. Walkthrough of the same job using our prototype
* **Phase 0 (Friday · 3:45 pm — Pickup):**
  * Staff opens the approved request (`RQ-214`) and uses the new **"Issue Approved Equipment Kit"** panel.
  * The system pre-selects available in-stock units (`PR-04`, `SP-02`, `AD-12`), pre-fills Kabir Sen as collector, and issues all three units in a single transaction with full validation.
  * `RQ-214` updates to badge **"Kit on loan (3/3 issued)"**.
* **Phase 1 (Friday · 7:30 pm — Partial return):**
  * Kabir returns the projector and speaker. Staff opens **"Process Return & Shift Handover"** for `RQ-214`.
  * Staff checks in `PR-04` and `SP-02` to shelf. For `AD-12`, staff unchecks "returning now", selects **Leela Das** as new custodian, sets return deadline to **Sat 9 am**, and enters Kabir's note: *"Leela still has the adapter. She’ll drop it off tomorrow at nine."*
  * Submitting instantly:
    1. Closes slips for `PR-04` and `SP-02` (restoring them to shelf in Inventory).
    2. Updates slip `L-404` to badge **"Handover · Sat 9 am"**, explicitly attributing custody to **Leela Das (transferred from Kabir Sen)**.
    3. Automatically publishes an official **Shift Handover Record** in the Desk Book.
    4. Updates `RQ-214` status to **"Partial return (2/3 back · with Leela Das)"**.
* **Phase 2 (Saturday · 9:00 am — Morning shift):**
  * Morning staff opens the desk app and immediately sees a prominent **"Pending Shift Handover Return" Alert Banner** in the Loan Register:
    * Item: `AD-12 · USB-C → HDMI adapter (Belkin AVC002 · Bin C4)`
    * Current Holder: **Leela Das** (transferred from Kabir Sen)
    * Due: **Sat 9:00 am (Due now)**
    * Handover note: *“Leela still has the adapter. She’ll drop it off tomorrow at nine.”*
  * When Leela arrives, the staff clicks **"Receive return from Leela Das"** with a single click.
  * Slip `L-404` is closed, `AD-12` is returned to Bin C4, an automated receipt is logged in the Desk Book, and `RQ-214` reaches **"Completed · All returned"**.

### 4. Real Counter Observation
* **Observation:** The **handover resolution duration** and **student inquiry rate** at 9:00 am counter opening.
* **Metric:** Time taken for an incoming staff member to acknowledge Leela, identify the exact adapter unit, and close the slip without asking questions, opening external chat channels, or consulting previous shift logs.

---

## 1. Project Overview

Campus Stores is a lightweight, zero-dependency desk management interface for campus media and equipment counters. It models the operational reality of managing audiovisual equipment loans for student clubs and events, tracking physical units from initial booking to return and shift transitions.

The application operates entirely client-side with native HTML, CSS, and modern JavaScript, storing state persistently across browser sessions using `localStorage` and featuring a simulated desk clock and shift timeline.

---

## 2. Original Problem and User Context

Campus equipment desks operate under distinct operational pressures:
* **Rotational Student Workers:** Desk staff rotate across shifts throughout the day and week. Institutional knowledge rarely persists unless explicitly structured in the software.
* **Component-Based Kit Dispersion:** Student events (such as courtyard film screenings) require multiple items (projector, PA speaker, adapters, remotes). Kits are frequently split among different organizers during strike and cleanup.
* **Asynchronous Partial Returns:** One organizer often returns the heavy components at night while a second organizer retains a cable or adapter overnight.
* **High Morning Rush:** Morning shifts open with tight turnaround times for classes and morning rehearsals. Staff cannot spend 10 minutes digging through unlinked chat logs to identify who has what.

---

## 3. What Already Worked Well

1. **Physical Unit Isolation:** Assets have unique serial numbers (`PR-04`, `AD-12`) and designated home bins (`A2`, `C4`), preventing ambiguous inventory counts.
2. **Issue Scope Validation:** Prevents staff from issuing units undergoing repair (`PR-06` in Workshop) or assets exceeding approved quotas.
3. **Simulated Shift Mechanics:** Clean state model driving shift advancement, desk time progression, and shift notes.
4. **Lightweight Architecture:** Self-contained, zero-npm footprint that runs instantly offline in any modern browser.

---

## 4. What Needed Improvement

1. **No Concept of Request-Level Fulfillment:** The `Requests` register only showed approval forms; once items were loaned, the request page provided no feedback on whether items were outstanding, partially returned, or closed.
2. **Disconnected Single-Slip Returns:** Returns could only be checked in one slip at a time with no concept of a kit-level partial return.
3. **Stale Custody Attribution:** When Kabir returned 2 of 3 items, the remaining slip still showed Kabir as custodian and Friday 8 pm as the due time, even though Leela had custody until Saturday 9 am.
4. **No Cross-Shift Handover System:** Morning shift workers had no dashboard surfacing items due from previous shifts, requiring manual cross-referencing with unlinked Desk Book notes.
5. **Repetitive Kit Issuance:** Issuing a 3-item kit required submitting three separate forms manually.

---

## 5. The Problem Selected for Improvement

**The Partial Return & Next-Shift Handover Experience.**

When equipment returns are split across team members and shifts, equipment desks face their highest risk of inventory shrinkage, false delinquency accusations, and operational delays. Solving this problem directly addresses the core evaluation challenge in the Candidate Brief.

---

## 6. Our Proposed Solution

We implemented an **End-to-End Custody Transfer & Shift Handover Lifecycle**:

```
[Approved Request RQ-214]
         │
         ▼
[Quick Kit Issuance] ──► Slips L-402 (PR-04), L-403 (SP-02), L-404 (AD-12) to Kabir Sen
         │
         ▼ (Friday 7:30 pm - Partial Return)
[Batch Return & Handover Panel]
    ├── PR-04 & SP-02 ──► Returned to Home Bins (Kabir Sen)
    └── AD-12 ──────────► Custody Transferred to Leela Das (Due Sat 9 am)
                                │
                                ├──► Updates Slip L-404 metadata & badge
                                ├──► Logs Official Shift Handover in Desk Book
                                └──► Updates RQ-214 badge to "Partial return"
         │
         ▼ (Saturday 9:00 am - Morning Shift)
[Pending Handover Alert Card] ──► Surfaced prominently in Loan Register
         │
         ▼
[One-Click Receive from Leela] ─► L-404 closed, AD-12 back to Bin C4, RQ-214 Complete!
```

---

## 7. Key Features Implemented

1. **Quick Kit Issuance (Requests Page):**
   * Multi-item kit issue panel for approved requests.
   * Automatically selects available in-stock units for each required item type.
   * Issues all items in a single atomic transaction while maintaining individual slip IDs.

2. **Unified Partial Return & Handover Workflow:**
   * Available directly on the request detail view and loan register.
   * Allows checking in returning units while specifying custody transfer details for retained units (new holder, new return time, handover note).

3. **Individual Loan Slip Custody Transfer:**
   * Every active loan slip features a **"Transfer / Handover"** action allowing staff to transfer responsibility and update promised due dates at any time.

4. **Morning Shift Handover Alert Card:**
   * High-visibility alert card at the top of the Loan Register during morning shift.
   * Displays unit details, bin location, current holder (**Leela Das**), previous holder (**Kabir Sen**), and handover notes.
   * Features a 1-click **"Receive return from Leela Das"** button.

5. **Request-Level Fulfillment Status:**
   * Live status badges on both request list and details:
     * `Approved · Not issued`
     * `Kit on loan (3/3 issued)`
     * `Partial return (2/3 back · with Leela Das)`
     * `Completed · All returned`
   * Item-by-item breakdown showing assigned physical unit, return timestamp, and direct links to loan slips.

6. **Enhanced Loan Register with Filters & Live Search:**
   * Filter views: `Outstanding (N)`, `Pending Handover (N)`, and `All slips (N)`.
   * Real-time search bar filtering across slip ID, asset ID, asset type, student name, and request ID.
   * Rich badge indicators: `Returned`, `Handover · Sat 9 am`, `On loan`, and `Overdue`.

7. **Automated Official Handover Logging (Desk Book):**
   * System automatically posts formatted handover logs into the Desk Book whenever a custody transfer or handover reception occurs.
   * Preserves manual note authoring for general shift notes.

---

## 8. Important Product and Engineering Decisions

1. **Zero External Dependencies & Native Standards:**
   * Built entirely in vanilla JavaScript (ES2022+), CSS container queries, and native SVG icons.
   * Ensures instant loading, 100% offline functionality, and effortless portability.

2. **Event Delegation on Root Container:**
   * All click, submit, change, and input events are handled via event delegation on `#campus-stores`.
   * Eliminates memory leaks, listener detachment, or zombie handlers during DOM re-renders.

3. **Non-Destructive State Normalization & Schema Migration:**
   * State version bumped to `version: 2`.
   * The `restore()` method gracefully normalizes legacy `v1` storage structures, adding default handover fields without crashing or requiring a cache wipe.

4. **Accessible, Non-Intrusive UX:**
   * Instead of disruptive modal overlays that block counter operations, workflows render as clean, accessible inline panels (`.action-panel`) with clear cancel actions.
   * Fully responsive across mobile (<650px container query) and desktop, with 44px minimum touch targets for tablet/coarse pointers.

---

## 9. Product Validation Plan

To validate whether this improvement genuinely solves the operational problem at a real campus equipment counter, we would deploy the following validation plan:

### What We Would Observe
1. **Counter Transaction Friction:** Watch the physical interaction when a student returns a partial kit. Does the staff member struggle to explain why one item is missing, or do they smoothly record who holds the remaining item?
2. **Morning Handover Verification:** Observe the incoming morning worker at 9:00 am. Do they immediately know what equipment is arriving without calling the previous evening staff or searching through chat groups?
3. **Student Counter Interaction:** Observe the student delivering the remaining item. Is their name already recognized on the desk screen, creating a polite and efficient check-in experience?

### Measurable User Behaviour & Metrics
| Metric | Baseline (Original System) | Target (With Improvement) | How Measured |
| :--- | :--- | :--- | :--- |
| **Morning Handover Turnaround Time** | ~180 – 300 seconds (searching notes, querying slip) | **< 30 seconds** (1-click receive) | Timestamp from shift clock to slip closure |
| **Cross-Shift Staff Inquiries** | High (texts/calls to previous shift staff) | **0 calls/texts** | Weekly staff incident log |
| **False Overdue Alerts** | 100% of delayed partial returns flagged overdue | **0%** (properly rescheduled) | Register delinquency audit |
| **Kit Reconciliation Rate** | Unclear until full audit | **100% visible** on request form | Requests dashboard status audit |

### Success Criteria
The improvement is deemed successful if **100% of partial returns have an explicit next-shift custodian assigned**, and **morning handover items are received within 30 seconds of counter arrival with zero staff ambiguity**.

---

## 10. How to Run the Application Locally

### Direct Browser Opening
Simply double-click or open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).

### Local HTTP Server
Run a local HTTP server from the repository root:

```sh
# Using Python 3:
python3 -m http.server 8000 --bind 127.0.0.1

# Or on Windows using Python:
python -m http.server 8000 --bind 127.0.0.1
```
Then visit `http://localhost:8000` in your browser.

---

## 11. Testing Performed

An automated end-to-end test suite (`test.js`) was developed and executed using **real headless Google Chrome via Chrome DevTools Protocol (CDP)**.

### Test Matrix & Verification Results
| # | Test Scenario | Description | Result |
| :---: | :--- | :--- | :---: |
| **1** | **Initial Load & Sanity** | Desk clock reads `Friday · 3:45 pm`, initial slip `L-401` intact | **PASSED** |
| **2** | **Phase 0 Kit Issuance** | Issued `PR-04`, `SP-02`, `AD-12` to Kabir Sen; `RQ-214` marked on loan | **PASSED** |
| **3** | **Shift Advance (Phase 1)** | Advanced shift clock to `Friday · 7:30 pm`; shift narrative updated | **PASSED** |
| **4** | **Partial Return & Handover** | `PR-04` & `SP-02` returned; `AD-12` handed over to Leela Das (Sat 9 am) | **PASSED** |
| **5** | **Handover Audit Logging** | Official Shift Handover Record automatically published in Desk Book | **PASSED** |
| **6** | **Shift Advance (Phase 2)** | Advanced clock to `Saturday · 9:00 am`; morning shift loaded | **PASSED** |
| **7** | **Handover Alert Banner** | Morning alert displayed with Leela Das, Bin C4, and quick-receive button | **PASSED** |
| **8** | **Receive Handover Item** | 1-click receive closed `L-404`; `RQ-214` reached `Completed · All returned` | **PASSED** |
| **9** | **Inventory Restoration** | Verified all assets (`PR-04`, `SP-02`, `AD-12`) back `On shelf` in bins | **PASSED** |
| **10** | **Live Search & Filters** | Filtered `Pending Handover`, `Outstanding`, `All slips`; searched `Leela` | **PASSED** |
| **11** | **Persistence & Reset** | State persisted across page reload; `Restart sample shift` reset cleanly | **PASSED** |
| **12** | **Console Error Audit** | Monitored CDP `Runtime.exceptionThrown` and `Log.entryAdded` | **0 ERRORS** |

To run the automated test suite locally:
```sh
node test.js
```

---

## 12. Limitations and Future Improvements

1. **Multi-Counter Concurrency:** In a multi-campus environment, syncing state across counters via WebSockets or a lightweight serverless backend would enable real-time updates.
2. **Barcode & RFID Scanning:** Integrating hardware barcode or QR code scanners on physical asset tags would eliminate manual dropdown selection during kit issuance.
3. **Automated Reminders:** Triggering automated SMS/email reminders to custodians (e.g. reminding Leela Das at 8:30 am on Saturday) to ensure punctual morning returns.
4. **Asset Condition Inspection:** Adding a condition rating (e.g. "Clean", "Cable worn", "Damage reported") during return check-in to automatically flag units for workshop inspection.

---

## Submit Your Work

1. [Fork Campus Stores](https://github.com/virinchi-healthcare/campus-stores/fork) into your GitHub account. Complete the candidate brief and push your changes to your public fork. In your README, point reviewers to your work and explain the decision you made.
2. In your fork, open **Commits**, select the final commit you want reviewed, and copy the page URL. It should look like `https://github.com/YOUR-USERNAME/campus-stores/commit/COMMIT-SHA`.
3. [Submit your work through the Google Form](https://docs.google.com/forms/d/e/1FAIpQLScvzoh1R4WS-SkiwAVBQbMvniieJYSoOEfLMyVo5CyjOvYUgQ/viewform). Your **roll number**, **email ID**, and **final commit link from your public fork** are required. Enter your roll number and email ID in the form only.
