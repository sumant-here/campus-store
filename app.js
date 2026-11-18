(() => {
  const storageKey = "campus-stores.shift.v2";
  const root = document.getElementById("campus-stores");
  const q = (selector) => root.querySelector(selector);
  const qAll = (selector) => root.querySelectorAll(selector);

  const requests = [
    {
      id: "RQ-214",
      club: "Film Society",
      event: "Courtyard screening",
      owner: "Isha Rao",
      due: "Fri 8 pm",
      items: ["HDMI projector", "Portable speaker", "USB-C → HDMI adapter"],
      note: "Playback is from a USB-C-only laptop. The host will collect at 4 pm.",
    },
    {
      id: "RQ-209",
      club: "Debate Union",
      event: "Finals rehearsal",
      owner: "Tara Shah",
      due: "Sat 10 am",
      items: ["Wireless microphone"],
      note: "Rehearsal runs into the evening.",
    },
    {
      id: "RQ-217",
      club: "Photo Circle",
      event: "Street portrait walk",
      owner: "Dev Menon",
      due: "Sat noon",
      items: ["Digital camera"],
      note: "Collection on Saturday morning.",
    },
  ];

  const assets = [
    { id: "PR-04", type: "HDMI projector", model: "BenQ MH550", bin: "A2" },
    {
      id: "PR-06",
      type: "HDMI projector",
      model: "Epson EB-X49",
      bin: "Workshop",
      repair: true,
    },
    { id: "SP-02", type: "Portable speaker", model: "JBL Eon One", bin: "B1" },
    { id: "SP-05", type: "Portable speaker", model: "Bose S1", bin: "B2" },
    {
      id: "AD-12",
      type: "USB-C → HDMI adapter",
      model: "Belkin AVC002",
      bin: "C4",
    },
    {
      id: "AD-15",
      type: "USB-C → HDMI adapter",
      model: "Anker A8312",
      bin: "C4",
    },
    { id: "MI-09", type: "Wireless microphone", model: "Shure BLX", bin: "B3" },
    { id: "CA-03", type: "Digital camera", model: "Sony A6400", bin: "D2" },
  ];

  const people = [
    "Isha Rao",
    "Kabir Sen",
    "Leela Das",
    "Tara Shah",
    "Dev Menon",
  ];

  const shifts = [
    {
      time: "Friday · 3:45 pm",
      title: "Pickup at the counter",
      text: "Kabir is here for the Film Society screening. The film starts at four. Can he leave with everything he needs?",
      next: "Move to return time",
    },
    {
      time: "Friday · 7:30 pm",
      title: "The kit comes back in pieces",
      text: "Kabir has brought back the projector and speaker. “Leela still has the adapter. She’ll drop it off tomorrow at nine.” Take the return and hand over to the morning shift.",
      next: "Move to next morning",
    },
    {
      time: "Saturday · 9:00 am",
      title: "Morning shift",
      text: "You’ve just taken over. Leela walks in with an adapter. Work out what was outstanding from the screening and close the loan for the right item.",
    },
  ];

  const pages = [
    ["Requests", "clipboard-list"],
    ["Inventory", "package"],
    ["Loan register", "book-open"],
    ["Desk book", "messages-square"],
  ];

  const original = () => ({
    version: 2,
    tab: "Requests",
    phase: 0,
    selected: "",
    filter: "All items",
    loans: [
      {
        num: 401,
        req: "RQ-209",
        asset: "MI-09",
        who: "Tara Shah",
        due: "Sat 10 am",
        back: false,
        returnedAt: null,
        returnedBy: null,
        handover: null,
        originalWho: "Tara Shah",
        originalDue: "Sat 10 am",
      },
    ],
    notes: [],
    editing: false,
    activePanel: null, // null | { type: 'handover', slipNum: 404 } | { type: 'batch-return', reqId: 'RQ-214' } | { type: 'kit-issue', reqId: 'RQ-214' }
    registerFilter: "outstanding", // 'outstanding' | 'handovers' | 'all'
    searchQuery: "",
    notice: "Sample shift · All records are fictional.",
  });

  let s = original();

  const getAsset = (id) => assets.find((x) => x.id === id);
  const getReq = (id) => requests.find((x) => x.id === id);
  const out = (id) => s.loans.find((l) => l.asset === id && !l.back);
  const getLoansForReq = (reqId) => s.loans.filter((l) => l.req === reqId);

  const esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const opts = (list, selectedVal = "") =>
    list
      .map(
        ([v, t]) =>
          '<option value="' +
          esc(v) +
          '"' +
          (String(v) === String(selectedVal) ? " selected" : "") +
          ">" +
          esc(t) +
          "</option>",
      )
      .join("");

  const btn = (label, act, val = "", style = "") =>
    '<button type="button" data-action="' +
    act +
    '" data-val="' +
    esc(val) +
    '" class="' +
    style +
    '">' +
    esc(label) +
    "</button>";

  const head = (title, sub, control = "") =>
    '<div class="sectionhead"><div><h2>' +
    title +
    "</h2><small>" +
    sub +
    "</small></div>" +
    control +
    "</div>";

  const row = (label, sub, right) =>
    '<div class="row"><div><strong>' +
    label +
    "</strong><small>" +
    sub +
    "</small></div><div>" +
    right +
    "</div></div>";

  const badge = (t, type = "") => {
    let cls = "tag";
    if (type === "good") cls += " good";
    else if (type === "transferred") cls += " transferred";
    else if (type === "warn") cls += " warn";
    else if (type === "info") cls += " info";
    return '<span class="' + cls + '">' + esc(t) + "</span>";
  };

  // Helper to determine request fulfillment status
  function getRequestStatus(req) {
    const loans = getLoansForReq(req.id);
    if (!loans.length) {
      return { label: "Approved · Not issued", type: "info" };
    }
    const allBack = loans.length >= req.items.length && loans.every((l) => l.back);
    if (allBack) {
      return { label: "Completed · All returned", type: "good" };
    }
    const openLoans = loans.filter((l) => !l.back);
    const returnedLoans = loans.filter((l) => l.back);
    const hasHandover = openLoans.some((l) => l.handover);

    if (returnedLoans.length > 0) {
      if (hasHandover) {
        const holder = openLoans.find((l) => l.handover)?.who || "Custody transfer";
        return {
          label: `Partial return (${returnedLoans.length}/${req.items.length} back · with ${holder})`,
          type: "transferred",
        };
      }
      return {
        label: `Partial return (${returnedLoans.length}/${req.items.length} back)`,
        type: "warn",
      };
    }
    return {
      label: `Kit on loan (${loans.length}/${req.items.length} issued)`,
      type: "info",
    };
  }

  // Returns pending handover returns (e.g. Leela with AD-12 due Sat 9 am)
  function getPendingHandovers() {
    return s.loans.filter((l) => !l.back && l.handover);
  }

  function isOverdue(l) {
    if (l.back) return false;
    // Sat 9 am Phase is phase 2: if due was Fri 8 pm and not rescheduled, it's overdue
    if (s.phase >= 2 && l.due.startsWith("Fri")) return true;
    return false;
  }

  // ==================== SCREEN: REQUESTS ====================
  function requestPage() {
    let html = head(
      "Approved requests",
      "Student Activities Office · 3 approved forms",
    );

    if (s.selected) {
      const r = getReq(s.selected);
      const reqStatus = getRequestStatus(r);
      const reqLoans = getLoansForReq(r.id);

      html +=
        btn("Back to list", "close") +
        '<div class="record"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;"><small>' +
        esc(r.id) +
        " · Approved</small>" +
        badge(reqStatus.label, reqStatus.type) +
        "</div><h3>" +
        esc(r.event) +
        "</h3><p>" +
        esc(r.club) +
        " · Filed by " +
        esc(r.owner) +
        "</p><p><b>Return deadline:</b> " +
        esc(r.due) +
        "</p><p><b>Approved equipment breakdown</b></p>";

      // Detailed breakdown of each approved item
      html += '<div style="margin: 8px 0 14px;">';
      r.items.forEach((itemType) => {
        const matchedLoan = reqLoans.find(
          (l) => getAsset(l.asset)?.type === itemType,
        );
        let statusBadge = badge("Not issued", "");
        let assetDetail = "Unit pending allocation at desk";
        let actionBtn = "";

        if (matchedLoan) {
          const unit = getAsset(matchedLoan.asset);
          if (matchedLoan.back) {
            statusBadge = badge("Returned", "good");
            assetDetail = `${matchedLoan.asset} (${unit?.model} · Bin ${unit?.bin}) · Returned ${matchedLoan.returnedAt || "earlier"}`;
          } else if (matchedLoan.handover) {
            statusBadge = badge(`Handover to ${matchedLoan.who}`, "transferred");
            assetDetail = `${matchedLoan.asset} (${unit?.model} · Bin ${unit?.bin}) · Due ${matchedLoan.due} · Note: ${matchedLoan.handover.note}`;
            actionBtn = btn("View slip L-" + matchedLoan.num, "go-slip", String(matchedLoan.num), "btn-sm");
          } else {
            statusBadge = badge("On loan · " + matchedLoan.who, "info");
            assetDetail = `${matchedLoan.asset} (${unit?.model} · Bin ${unit?.bin}) · Due ${matchedLoan.due}`;
            actionBtn = btn("View slip L-" + matchedLoan.num, "go-slip", String(matchedLoan.num), "btn-sm");
          }
        }

        html += `
          <div class="request-item-card">
            <div>
              <strong>${esc(itemType)}</strong>
              <small>${esc(assetDetail)}</small>
            </div>
            <div class="btn-group">
              ${statusBadge}
              ${actionBtn}
            </div>
          </div>
        `;
      });
      html += "</div>";

      html += "<p><b>Special instructions:</b> " + esc(r.note) + "</p>";

      // Contextual action panels based on request state
      const unissuedItems = r.items.filter(
        (type) => !reqLoans.some((l) => getAsset(l.asset)?.type === type),
      );
      const activeLoans = reqLoans.filter((l) => !l.back);

      if (unissuedItems.length > 0) {
        // Quick Issue Kit panel
        html += renderKitIssuePanel(r, unissuedItems);
      } else if (activeLoans.length > 0) {
        // Active loans exist - quick action to return/handover
        html += `
          <div class="action-panel" style="margin-top:16px;">
            <div class="action-panel-header">
              <h3>Kit is on loan (${activeLoans.length} active unit${activeLoans.length > 1 ? "s" : ""})</h3>
              ${btn("Process Return & Handover", "open-batch-return", r.id, "primary")}
            </div>
            <small>Quickly check in returned equipment and record custody transfers for outstanding items.</small>
          </div>
        `;
      }

      html += "</div>";
    } else {
      // List view
      html += requests
        .map((r) => {
          const st = getRequestStatus(r);
          return row(
            r.event,
            r.id + " · " + r.club + " · Due " + r.due,
            '<div class="btn-group">' +
              badge(st.label, st.type) +
              btn("View form", "request", r.id) +
              "</div>",
          );
        })
        .join("");
    }
    return html;
  }

  // Panel to issue an entire request kit at once
  function renderKitIssuePanel(r, unissuedItems) {
    const availableAssetsFor = (type) =>
      assets.filter((a) => a.type === type && !a.repair && !out(a.id));

    let html = `
      <div class="action-panel">
        <div class="action-panel-header">
          <h3>Issue approved equipment kit (${unissuedItems.length} unit${unissuedItems.length > 1 ? "s" : ""} remaining)</h3>
        </div>
        <form data-quick-issue="${esc(r.id)}">
          <div style="display:grid;gap:8px;margin-bottom:12px;">
    `;

    unissuedItems.forEach((type, idx) => {
      const units = availableAssetsFor(type);
      html += `
        <div class="panel-item-row">
          <div>
            <strong>${esc(type)}</strong>
            <small>${units.length ? units.length + " unit(s) available in stock" : "No available units!"}</small>
          </div>
          <div>
            <select name="asset_${idx}" required>
              <option value="">Select unit…</option>
              ${opts(units.map((u) => [u.id, `${u.id} · ${u.model} (Bin ${u.bin})`]))}
            </select>
          </div>
        </div>
      `;
    });

    // Default collector to Kabir Sen for RQ-214 per deskbook note, or request owner
    const defaultCollector = r.id === "RQ-214" ? "Kabir Sen" : r.owner;

    html += `
          </div>
          <div class="form">
            <label>
              <span>Collected by</span>
              <select name="who" required>
                ${opts(people.map((p) => [p, p]), defaultCollector)}
              </select>
            </label>
            <label>
              <span>Return deadline</span>
              <select name="due" required>
                ${opts(
                  ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"].map((d) => [d, d]),
                  r.due,
                )}
              </select>
            </label>
          </div>
          <div class="btn-group" style="margin-top:8px;">
            <button type="submit" class="primary">Issue full kit to ${esc(defaultCollector)}</button>
            ${btn("Issue single slip instead", "tab", "Loan register")}
          </div>
        </form>
      </div>
    `;
    return html;
  }

  // ==================== SCREEN: INVENTORY ====================
  function inventory() {
    let html = head(
      "Inventory",
      "Physical units · home shelf and current availability",
    );
    html +=
      '<div class="buttons"><label>Show <select data-filter>' +
      opts(
        ["All items", "On shelf", "On loan", "Handover pending", "In repair"].map(
          (f) => [f, f],
        ),
        s.filter,
      ) +
      "</select></label></div>";

    for (const a of assets) {
      const loan = out(a.id);
      let status = "On shelf";
      let statusType = "good";
      let detail = a.model + " · Bin " + a.bin;

      if (a.repair) {
        status = "In repair";
        statusType = "";
        detail += " · In workshop";
      } else if (loan) {
        if (loan.handover) {
          status = "Handover pending";
          statusType = "transferred";
          detail += ` · With ${loan.who} (transferred from ${loan.originalWho}) · Due ${loan.due}`;
        } else {
          status = "On loan";
          statusType = "info";
          detail += ` · With ${loan.who} (${loan.req}) · Due ${loan.due}`;
        }
      }

      if (s.filter !== "All items" && s.filter !== status) continue;

      html += row(
        a.id + " · " + a.type,
        detail,
        badge(status, statusType),
      );
    }
    return html;
  }

  // ==================== SCREEN: LOAN REGISTER ====================
  function register() {
    let html = head(
      "Loan register",
      "One slip per physical unit · Shift handovers tracked",
      s.editing
        ? btn("Cancel", "cancel")
        : btn("New issue slip", "new", "", "primary"),
    );

    // 1. Pending Shift Handover Alert Card (Surfaced prominently)
    const pendingHandovers = getPendingHandovers();
    if (pendingHandovers.length > 0) {
      pendingHandovers.forEach((l) => {
        const unit = getAsset(l.asset);
        const req = getReq(l.req);
        const isCurrentDue = s.phase >= 2; // In morning shift (Phase 2), this is due NOW

        html += `
          <div class="handover-banner">
            <div class="handover-banner-head">
              <div class="handover-banner-title">
                <svg class="store-icon" aria-hidden="true"><use href="#icon-clock"></use></svg>
                <span>Pending Shift Handover Return</span>
              </div>
              <div class="btn-group">
                ${badge(isCurrentDue ? "Due Now · Sat 9:00 am" : "Scheduled · Sat 9:00 am", isCurrentDue ? "warn" : "transferred")}
                ${badge("Slip L-" + l.num, "")}
              </div>
            </div>
            <div class="handover-banner-body">
              <div>
                <strong>${esc(l.asset)} · ${esc(unit?.type)}</strong> (${esc(unit?.model)} · Home Bin ${esc(unit?.bin)})
                <br>
                <small>Club: <b>${esc(req?.club)}</b> (${esc(l.req)}) · Transferred from <b>${esc(l.originalWho)}</b> → Current holder: <b style="color:var(--tag-trans-txt);">${esc(l.who)}</b></small>
                ${
                  l.handover.note
                    ? `<div class="handover-quote">“${esc(l.handover.note)}”</div>`
                    : ""
                }
              </div>
              <div class="btn-group">
                <button type="button" class="primary" data-action="quick-receive" data-val="${l.num}">
                  Receive return from ${esc(l.who)}
                </button>
              </div>
            </div>
          </div>
        `;
      });
    }

    // 2. Active Inline Panel (Handover Transfer or Batch Return)
    if (s.activePanel) {
      if (s.activePanel.type === "handover") {
        html += renderHandoverPanel(s.activePanel.slipNum);
      } else if (s.activePanel.type === "batch-return") {
        html += renderBatchReturnPanel(s.activePanel.reqId);
      }
    }

    // 3. New Single Slip Issue Form
    if (s.editing) {
      const available = assets.filter((a) => !a.repair && !out(a.id));
      const select = (label, key, options) =>
        "<label><span>" +
        label +
        '</span><select name="' +
        key +
        '" required><option value="">Select…</option>' +
        opts(options) +
        "</select></label>";
      return (
        html +
        '<div class="action-panel"><div class="action-panel-header"><h3>Create single issue slip</h3>' +
        btn("Cancel", "cancel") +
        '</div><form data-issue><div class="form">' +
        select(
          "Approved request",
          "req",
          requests.map((r) => [r.id, r.id + " · " + r.club]),
        ) +
        select(
          "Unit leaving desk",
          "asset",
          available.map((a) => [a.id, a.id + " · " + a.type + " (Bin " + a.bin + ")"]),
        ) +
        select(
          "Collected by",
          "who",
          people.map((p) => [p, p]),
        ) +
        select(
          "Return deadline",
          "due",
          ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"].map((d) => [d, d]),
        ) +
        '</div><button type="submit" class="primary">Save issue slip</button></form></div>'
      );
    }

    // 4. Filter & Search Controls
    const totalOutstanding = s.loans.filter((l) => !l.back).length;
    const totalHandovers = pendingHandovers.length;
    const totalAll = s.loans.length;

    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin:12px 0 8px;">
        <div class="buttons" style="margin:0;">
          <button type="button" data-action="filter-register" data-val="outstanding" aria-pressed="${s.registerFilter === "outstanding"}">
            Outstanding (${totalOutstanding})
          </button>
          <button type="button" data-action="filter-register" data-val="handovers" aria-pressed="${s.registerFilter === "handovers"}">
            Pending Handover (${totalHandovers})
          </button>
          <button type="button" data-action="filter-register" data-val="all" aria-pressed="${s.registerFilter === "all"}">
            All slips (${totalAll})
          </button>
        </div>
        <div class="search-bar" style="margin:0;">
          <input type="search" placeholder="Search slip, asset, person…" value="${esc(s.searchQuery)}" data-action="search" aria-label="Search loan slips" />
        </div>
      </div>
    `;

    // Filter slips
    let shown = s.loans.slice().reverse();

    if (s.registerFilter === "outstanding") {
      shown = shown.filter((l) => !l.back);
    } else if (s.registerFilter === "handovers") {
      shown = shown.filter((l) => !l.back && l.handover);
    }

    if (s.searchQuery.trim()) {
      const qLower = s.searchQuery.trim().toLowerCase();
      shown = shown.filter((l) => {
        const u = getAsset(l.asset);
        const r = getReq(l.req);
        return (
          `l-${l.num}`.toLowerCase().includes(qLower) ||
          l.asset.toLowerCase().includes(qLower) ||
          l.who.toLowerCase().includes(qLower) ||
          (l.originalWho && l.originalWho.toLowerCase().includes(qLower)) ||
          l.req.toLowerCase().includes(qLower) ||
          (r && r.club.toLowerCase().includes(qLower)) ||
          (u && u.type.toLowerCase().includes(qLower))
        );
      });
    }

    if (!shown.length) {
      html += `<p style="padding:18px 0;color:var(--quiet);">No loan slips match the current filter.</p>`;
      return html;
    }

    for (const l of shown) {
      const u = getAsset(l.asset);
      const r = getReq(l.req);
      const overdue = isOverdue(l);

      let statusBadge = "";
      let rightButtons = "";

      if (l.back) {
        statusBadge = badge("Returned", "good");
      } else if (l.handover) {
        statusBadge = badge("Handover · " + l.due, "transferred");
        rightButtons = `
          <div class="btn-group">
            <button type="button" class="primary" data-action="quick-receive" data-val="${l.num}">Record return</button>
            ${btn("Update Handover", "open-handover", String(l.num))}
          </div>
        `;
      } else if (overdue) {
        statusBadge = badge("Overdue · " + l.due, "warn");
        rightButtons = `
          <div class="btn-group">
            <button type="button" class="primary" data-action="return" data-val="${l.num}">Record return</button>
            ${btn("Transfer / Handover", "open-handover", String(l.num))}
          </div>
        `;
      } else {
        statusBadge = badge("On loan", "info");
        rightButtons = `
          <div class="btn-group">
            <button type="button" class="primary" data-action="return" data-val="${l.num}">Record return</button>
            ${btn("Transfer / Handover", "open-handover", String(l.num))}
          </div>
        `;
      }

      // Subtitle information
      let subInfo = `${esc(l.req)} (${esc(r?.club)}) · `;
      if (l.back) {
        subInfo += `Returned by ${esc(l.returnedBy || l.who)} at ${esc(l.returnedAt || "earlier")} → Home Bin ${esc(u?.bin)}`;
      } else if (l.handover) {
        subInfo += `Held by: <b style="color:var(--tag-trans-txt);">${esc(l.who)}</b> (transferred from ${esc(l.originalWho)}) · Due: <b>${esc(l.due)}</b>`;
        if (l.handover.note) {
          subInfo += `<br><span class="handover-meta">💬 “${esc(l.handover.note)}”</span>`;
        }
      } else {
        subInfo += `Held by: <b>${esc(l.who)}</b> · Due: <b>${esc(l.due)}</b>`;
      }

      const title = `L-${l.num} · ${esc(l.asset)} (${esc(u?.type)})`;

      html += row(
        title,
        subInfo,
        '<div class="btn-group">' + statusBadge + rightButtons + "</div>",
      );
    }

    return html;
  }

  // Panel to transfer responsibility / record handover for a single slip
  function renderHandoverPanel(slipNum) {
    const l = s.loans.find((x) => x.num === Number(slipNum));
    if (!l) return "";
    const u = getAsset(l.asset);
    const r = getReq(l.req);

    // Default next person to Leela Das if Kabir is currently holding, or another person
    const defaultTo = l.who === "Kabir Sen" ? "Leela Das" : people.find((p) => p !== l.who);
    const defaultDue = s.phase === 1 ? "Sat 9 am" : "Sat 10 am";
    const defaultNote =
      l.asset === "AD-12" || u?.type.includes("adapter")
        ? "Leela still has the adapter. She’ll drop it off tomorrow at nine."
        : "";

    return `
      <div class="action-panel">
        <div class="action-panel-header">
          <h3>Shift Handover & Custody Transfer: Slip L-${l.num} (${esc(l.asset)} · ${esc(u?.type)})</h3>
          ${btn("Cancel", "cancel")}
        </div>
        <p style="margin-bottom:10px;"><small>Use this when equipment is retained overnight or responsibility passes to another team member.</small></p>
        <form data-submit-handover="${l.num}">
          <div class="form">
            <label>
              <span>Current custodian</span>
              <input type="text" value="${esc(l.who)}" disabled style="opacity:0.75;" />
            </label>
            <label>
              <span>Transfer custody to</span>
              <select name="who" required>
                ${opts(
                  people.map((p) => [p, p]),
                  defaultTo,
                )}
              </select>
            </label>
            <label>
              <span>Rescheduled return deadline</span>
              <select name="due" required>
                ${opts(
                  ["Sat 9 am", "Sat 10 am", "Sat noon", "Sun 10 am"].map((d) => [d, d]),
                  defaultDue,
                )}
              </select>
            </label>
            <label class="full">
              <span>Handover note for morning shift</span>
              <textarea name="note" rows="2" maxlength="300" required placeholder="Reason for delayed return, who has custody, and expected return time…">${esc(defaultNote)}</textarea>
            </label>
          </div>
          <div class="btn-group">
            <button type="submit" class="primary">Save Custody Transfer & Handover</button>
            ${btn("Cancel", "cancel")}
          </div>
        </form>
      </div>
    `;
  }

  // Panel to process partial returns and handover for a whole request kit
  function renderBatchReturnPanel(reqId) {
    const r = getReq(reqId);
    const activeLoans = getLoansForReq(reqId).filter((l) => !l.back);
    if (!activeLoans.length) return "";

    return `
      <div class="action-panel">
        <div class="action-panel-header">
          <h3>Process Return & Shift Handover: ${esc(r.club)} (${esc(r.id)})</h3>
          ${btn("Cancel", "cancel")}
        </div>
        <p><small>Check off items returned to the shelf now. For any items retained or delayed, specify who holds them for the next shift.</small></p>
        <form data-submit-batch-return="${esc(reqId)}">
          <div style="margin:12px 0;">
            ${activeLoans
              .map((l) => {
                const u = getAsset(l.asset);
                // For Film Society screening: Kabir brings projector & speaker; adapter is retained by Leela
                const isAdapter = u?.type.includes("adapter");
                const defaultReturnNow = !isAdapter;

                return `
                <div class="panel-item-row" style="margin-bottom:10px;">
                  <div>
                    <strong>${esc(l.asset)} · ${esc(u?.type)}</strong>
                    <small>${esc(u?.model)} · Home Bin: <b>${esc(u?.bin)}</b></small>
                    <div style="margin-top:4px;">
                      <label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                        <input type="checkbox" name="return_${l.num}" value="yes" ${defaultReturnNow ? "checked" : ""} data-action="toggle-handover-row" data-val="${l.num}" />
                        <span>Returning to shelf now (by ${esc(l.who)})</span>
                      </label>
                    </div>
                  </div>
                  <div data-handover-fields="${l.num}" style="${defaultReturnNow ? "display:none;" : ""}">
                    <label style="margin-bottom:4px;display:block;">
                      <span style="font-size:11px;">Handover Custody to</span>
                      <select name="handover_who_${l.num}">
                        ${opts(people.map((p) => [p, p]), "Leela Das")}
                      </select>
                    </label>
                    <label style="margin-bottom:4px;display:block;">
                      <span style="font-size:11px;">New Return Due</span>
                      <select name="handover_due_${l.num}">
                        ${opts(["Sat 9 am", "Sat 10 am", "Sat noon"].map((d) => [d, d]), "Sat 9 am")}
                      </select>
                    </label>
                    <input type="text" name="handover_note_${l.num}" placeholder="Handover note for morning shift…" value="${isAdapter ? "Leela still has the adapter. She’ll drop it off tomorrow at nine." : ""}" style="font-size:12px;" />
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
          <div class="btn-group">
            <button type="submit" class="primary">Confirm Return & Shift Handover</button>
            ${btn("Cancel", "cancel")}
          </div>
        </form>
      </div>
    `;
  }

  // ==================== SCREEN: DESK BOOK ====================
  function deskbook() {
    let html = head(
      "Desk book",
      "Messages from clubs and verified shift handover records",
    );

    const entries = [
      {
        time: "Friday · 3:20 pm",
        author: "Isha Rao · Film Society",
        body: "Kabir Sen is picking up our whole screening kit. Please issue it in his name. I’m setting up in the courtyard.",
        isHandover: false,
      },
      {
        time: "Friday · 3:30 pm",
        author: "Tara Shah · Debate Union",
        body: "Our microphone stays with me overnight. I’ll return it by 10 am Saturday.",
        isHandover: false,
      },
    ];

    if (s.phase >= 1) {
      entries.push({
        time: "Friday · 7:30 pm",
        author: "Kabir Sen · Film Society",
        body: "I brought the projector and speaker. Leela Das has our adapter. She’ll be at the counter at 9 am tomorrow.",
        isHandover: false,
      });
    }

    // Include dynamically recorded shift handover notes
    for (const n of s.notes) {
      entries.push({
        time: shifts[n.phase]?.time || "Shift log",
        author: n.author || "Counter handover",
        body: n.text,
        isHandover: Boolean(n.isHandover),
      });
    }

    for (const entry of entries.slice().reverse()) {
      html +=
        '<article class="record' +
        (entry.isHandover ? " handover-log" : "") +
        '"><small>' +
        esc(entry.time) +
        (entry.isHandover ? " · Official Shift Handover Record" : "") +
        "</small><h3>" +
        esc(entry.author) +
        "</h3><p>" +
        esc(entry.body) +
        "</p></article>";
    }

    return (
      html +
      '<form data-note><div class="form"><label class="full"><span>Note for the next shift</span><textarea name="note" rows="2" maxlength="400" required placeholder="Type a message or handover observation for the next desk team…"></textarea></label></div><button type="submit">Add handover note</button></form>'
    );
  }

  const screens = {
    Requests: requestPage,
    Inventory: inventory,
    "Loan register": register,
    "Desk book": deskbook,
  };

  // ==================== RENDER & STORAGE ====================
  function paint() {
    const phase = shifts[s.phase];
    q("[data-clock]").textContent = phase.time;
    q("[data-shift-title]").textContent = phase.title;
    q("[data-shift]").textContent = phase.text;

    const advance = q('[data-action="advance"]');
    advance.hidden = !phase.next;
    advance.textContent = phase.next || "";

    q("[data-nav]").innerHTML = pages
      .map(
        ([n, icon]) =>
          '<button type="button" data-action="tab" data-val="' +
          n +
          '" aria-pressed="' +
          (s.tab === n) +
          '"><svg aria-hidden="true" class="store-icon"><use href="#icon-' +
          icon +
          '"></use></svg>' +
          n +
          "</button>",
      )
      .join("");

    q("[data-page]").innerHTML = screens[s.tab]();
    if (q("[data-filter]")) q("[data-filter]").value = s.filter;
    q("[data-status]").textContent = s.notice;
  }

  function commit(msg) {
    if (msg) s.notice = msg;
    paint();
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch {
      q("[data-status]").textContent +=
        " Browser storage is unavailable. Progress lasts for this visit.";
    }
  }

  // ==================== EVENT LISTENERS ====================
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const v = b.dataset.val;

    switch (b.dataset.action) {
      case "restart":
        s = original();
        commit("Sample shift restarted. All fictional records reset.");
        break;

      case "advance":
        if (s.phase < 2) s.phase++;
        s.activePanel = null;
        s.editing = false;
        commit("Shift time updated to " + shifts[s.phase].time + ".");
        break;

      case "tab":
        s.tab = v;
        s.editing = false;
        s.activePanel = null;
        commit();
        break;

      case "close":
        s.selected = "";
        commit();
        break;

      case "request":
        s.selected = v;
        commit();
        break;

      case "go-slip":
        s.tab = "Loan register";
        s.registerFilter = "all";
        s.searchQuery = "L-" + v;
        commit();
        break;

      case "new":
        s.editing = true;
        s.activePanel = null;
        commit();
        break;

      case "cancel":
        s.editing = false;
        s.activePanel = null;
        commit();
        break;

      case "filter-register":
        s.registerFilter = v;
        commit();
        break;

      case "open-handover":
        s.activePanel = { type: "handover", slipNum: Number(v) };
        s.editing = false;
        commit();
        break;

      case "open-batch-return":
        s.tab = "Loan register";
        s.activePanel = { type: "batch-return", reqId: v };
        s.editing = false;
        commit();
        break;

      case "return": {
        const l = s.loans.find((l) => l.num === Number(v));
        if (!l || l.back) return;
        const u = getAsset(l.asset);
        l.back = true;
        l.returnedAt = shifts[s.phase].time;
        l.returnedBy = l.who;
        commit(
          `${l.asset} (${u?.type}) returned to home bin ${u?.bin}. Slip L-${l.num} closed.`,
        );
        break;
      }

      case "quick-receive": {
        const l = s.loans.find((l) => l.num === Number(v));
        if (!l || l.back) return;
        const u = getAsset(l.asset);
        const returningPerson = l.who;
        l.back = true;
        l.returnedAt = shifts[s.phase].time;
        l.returnedBy = returningPerson;

        // Auto-log to Desk book
        s.notes.push({
          phase: s.phase,
          author: "Counter Reception",
          text: `Received outstanding unit ${l.asset} (${u?.type}) from ${returningPerson}. Returned to home shelf Bin ${u?.bin}. Request ${l.req} kit is now fully closed.`,
          isHandover: true,
        });

        s.activePanel = null;
        commit(
          `Handover completed: ${l.asset} returned by ${returningPerson} to Bin ${u?.bin}. Loan L-${l.num} closed.`,
        );
        break;
      }
    }
  });

  root.addEventListener("input", (e) => {
    if (e.target.matches('[data-action="search"]')) {
      s.searchQuery = e.target.value;
      paint();
    }
  });

  root.addEventListener("change", (e) => {
    if (e.target.matches("[data-filter]")) {
      s.filter = e.target.value;
      commit();
    }

    // Toggle fields in batch return
    if (e.target.matches('[data-action="toggle-handover-row"]')) {
      const slipNum = e.target.dataset.val;
      const handoverBlock = q(`[data-handover-fields="${slipNum}"]`);
      if (handoverBlock) {
        handoverBlock.style.display = e.target.checked ? "none" : "block";
      }
    }
  });

  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const form = new FormData(f);

    // 1. Manual Desk book note
    if (f.matches("[data-note]")) {
      const text = String(form.get("note")).trim();
      if (!text) return;
      s.notes.push({
        phase: s.phase,
        author: "Counter Staff",
        text,
        isHandover: false,
      });
      commit("Handover note saved to Desk book.");
      return;
    }

    // 2. Single Issue Slip
    if (f.matches("[data-issue]")) {
      const [req, asset, who, due] = ["req", "asset", "who", "due"].map((k) =>
        form.get(k),
      );
      const unit = getAsset(asset),
        r = getReq(req);
      if (!r || !unit || unit.repair || out(asset) || !people.includes(who))
        return;
      if (!r.items.includes(unit.type)) {
        q("[data-status]").textContent =
          "This equipment type is outside the approved request. Choose an approved unit.";
        return;
      }
      if (
        s.loans.some(
          (l) => l.req === req && !l.back && getAsset(l.asset).type === unit.type,
        )
      ) {
        q("[data-status]").textContent =
          "The approved quantity of this equipment type is already on loan.";
        return;
      }
      const num = Math.max(...s.loans.map((l) => l.num), 400) + 1;
      s.loans.push({
        num,
        req,
        asset,
        who,
        due,
        back: false,
        returnedAt: null,
        returnedBy: null,
        handover: null,
        originalWho: who,
        originalDue: due,
      });
      s.editing = false;
      commit(`Issued ${asset} to ${who} on slip L-${num}.`);
      return;
    }

    // 3. Quick Issue Entire Kit (from Requests tab)
    if (f.hasAttribute("data-quick-issue")) {
      const reqId = f.getAttribute("data-quick-issue");
      const r = getReq(reqId);
      const who = form.get("who");
      const due = form.get("due");

      if (!r || !people.includes(who)) return;

      const unissuedItems = r.items.filter(
        (type) => !getLoansForReq(reqId).some((l) => getAsset(l.asset)?.type === type),
      );

      const newSlips = [];
      let nextNum = Math.max(...s.loans.map((l) => l.num), 400);

      for (let i = 0; i < unissuedItems.length; i++) {
        const assetId = form.get(`asset_${i}`);
        const unit = getAsset(assetId);
        if (!unit || unit.repair || out(assetId)) {
          q("[data-status]").textContent =
            "One or more chosen units are invalid or unavailable. Please review.";
          return;
        }
        nextNum++;
        newSlips.push({
          num: nextNum,
          req: reqId,
          asset: assetId,
          who,
          due,
          back: false,
          returnedAt: null,
          returnedBy: null,
          handover: null,
          originalWho: who,
          originalDue: due,
        });
      }

      s.loans.push(...newSlips);
      s.activePanel = null;
      commit(
        `Issued complete kit (${newSlips.map((l) => l.asset).join(", ")}) to ${who} for ${r.club}.`,
      );
      return;
    }

    // 4. Single Slip Custody Transfer / Handover
    if (f.hasAttribute("data-submit-handover")) {
      const slipNum = Number(f.getAttribute("data-submit-handover"));
      const l = s.loans.find((x) => x.num === slipNum);
      if (!l || l.back) return;

      const newWho = form.get("who");
      const newDue = form.get("due");
      const note = String(form.get("note") || "").trim();

      if (!people.includes(newWho) || !newDue) return;

      const oldWho = l.who;
      l.who = newWho;
      l.due = newDue;
      l.handover = {
        from: oldWho,
        to: newWho,
        due: newDue,
        note,
        at: shifts[s.phase].time,
      };

      // Auto-log handover record to Desk book
      s.notes.push({
        phase: s.phase,
        author: `Counter Handover · Slip L-${l.num}`,
        text: `Transferred custody of ${l.asset} (${getAsset(l.asset)?.type}) from ${oldWho} to ${newWho}. New expected return: ${newDue}. Handover note: “${note}”.`,
        isHandover: true,
      });

      s.activePanel = null;
      commit(
        `Custody for ${l.asset} transferred to ${newWho} (due ${newDue}). Handover record saved.`,
      );
      return;
    }

    // 5. Batch Return & Handover (from Loan Register or Requests)
    if (f.hasAttribute("data-submit-batch-return")) {
      const reqId = f.getAttribute("data-submit-batch-return");
      const r = getReq(reqId);
      const activeLoans = getLoansForReq(reqId).filter((l) => !l.back);

      const returnedAssets = [];
      const handoverAssets = [];

      activeLoans.forEach((l) => {
        const isReturning = form.get(`return_${l.num}`) === "yes";
        const unit = getAsset(l.asset);

        if (isReturning) {
          l.back = true;
          l.returnedAt = shifts[s.phase].time;
          l.returnedBy = l.who;
          returnedAssets.push(`${l.asset} (${unit?.type})`);
        } else {
          // Handover
          const newWho = form.get(`handover_who_${l.num}`);
          const newDue = form.get(`handover_due_${l.num}`);
          const note = String(form.get(`handover_note_${l.num}`) || "").trim();

          const oldWho = l.who;
          l.who = newWho;
          l.due = newDue;
          l.handover = {
            from: oldWho,
            to: newWho,
            due: newDue,
            note,
            at: shifts[s.phase].time,
          };
          handoverAssets.push(`${l.asset} to ${newWho} (due ${newDue})`);
        }
      });

      // Automated shift handover desk book record
      let logText = "";
      if (returnedAssets.length) {
        logText += `Returned to shelf: ${returnedAssets.join(", ")}. `;
      }
      if (handoverAssets.length) {
        logText += `Outstanding handover: ${handoverAssets.join(", ")}.`;
      }

      s.notes.push({
        phase: s.phase,
        author: `Shift Handover · ${r.club} (${r.id})`,
        text: logText,
        isHandover: true,
      });

      s.activePanel = null;
      commit(
        `Partial return & handover processed for ${r.club}. ${returnedAssets.length} returned, ${handoverAssets.length} outstanding.`,
      );
    }
  });

  // ==================== RESTORATION / MIGRATION ====================
  function restore(d) {
    if (!d) return;

    // Gracefully normalize loans array
    let normalizedLoans = original().loans;
    if (Array.isArray(d.loans) && d.loans.length) {
      normalizedLoans = d.loans.map((l) => ({
        num: Number(l.num),
        req: l.req,
        asset: l.asset,
        who: l.who,
        due: l.due,
        back: Boolean(l.back),
        returnedAt: l.returnedAt || null,
        returnedBy: l.returnedBy || null,
        handover: l.handover || null,
        originalWho: l.originalWho || l.who,
        originalDue: l.originalDue || l.due,
      }));
    }

    let normalizedNotes = [];
    if (Array.isArray(d.notes)) {
      normalizedNotes = d.notes.map((n) => ({
        phase: Number(n.phase) || 0,
        author: n.author || "Counter Staff",
        text: String(n.text || ""),
        isHandover: Boolean(n.isHandover),
      }));
    }

    s = {
      ...original(),
      ...d,
      version: 2,
      loans: normalizedLoans,
      notes: normalizedNotes,
      activePanel: null,
      editing: false,
    };
    paint();
  }

  paint();

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      restore(JSON.parse(saved));
    } else {
      // Also check if v1 data exists to migrate gracefully
      const oldSaved = localStorage.getItem("campus-stores.shift.v1");
      if (oldSaved) {
        restore(JSON.parse(oldSaved));
      }
    }
  } catch {
    // Keep fresh shift when storage is unavailable or malformed
  }
})();