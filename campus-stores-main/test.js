const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.pending = new Map();
    this.events = [];
    this.errors = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        } else if (msg.method) {
          this.events.push(msg);
          if (msg.method === 'Runtime.exceptionThrown') {
            this.errors.push(msg.params.exceptionDetails);
          }
          if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
            this.errors.push(msg.params.entry.text);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      console.error('CDP Eval Exception:', JSON.stringify(res.exceptionDetails, null, 2));
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Eval error');
    }
    return res.result ? res.result.value : undefined;
  }
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-test-'));
  const port = 9222;

  const htmlFile = path.resolve(__dirname, 'index.html');
  const targetUrl = 'file:///' + htmlFile.replace(/\\/g, '/');

  console.log('Launching Chrome with URL:', targetUrl);
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpDir}`,
    '--no-first-run',
    '--disable-extensions',
    targetUrl
  ]);

  let client = null;

  try {
    // Wait for CDP to respond
    let connected = false;
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      try {
        const list = await fetchJson(`http://127.0.0.1:${port}/json/list`);
        if (list && list.length > 0) {
          const page = list.find(p => p.type === 'page');
          if (page && page.webSocketDebuggerUrl) {
            client = new CDPClient(page.webSocketDebuggerUrl);
            await client.connect();
            connected = true;
            break;
          }
        }
      } catch (e) {}
    }

    if (!connected) throw new Error('Could not connect to Chrome CDP');

    await client.send('Runtime.enable');
    await client.send('Log.enable');

    console.log('Connected to Chrome CDP successfully!');

    // ==========================================
    // TEST 1: Initial Load & Sanity
    // ==========================================
    console.log('\n--- Running Test 1: Initial Load ---');
    const clock = await client.eval('document.querySelector("[data-clock]").textContent');
    const title = await client.eval('document.querySelector("[data-shift-title]").textContent');
    console.log('Clock text:', clock);
    console.log('Shift title:', title);
    if (!clock.includes('Friday · 3:45 pm')) throw new Error('Incorrect initial clock');
    if (!title.includes('Pickup at the counter')) throw new Error('Incorrect initial title');

    // ==========================================
    // TEST 2: Issue Film Society Screening Kit (Phase 0)
    // ==========================================
    console.log('\n--- Running Test 2: Phase 0 Pickup Workflow ---');
    // Open Requests tab
    await client.eval('document.querySelector(\'[data-action="tab"][data-val="Requests"]\').click()');
    // Open RQ-214
    await client.eval('document.querySelector(\'[data-action="request"][data-val="RQ-214"]\').click()');
    
    // Check kit issue panel is present
    const hasKitPanel = await client.eval('Boolean(document.querySelector("[data-quick-issue=\'RQ-214\']"))');
    console.log('Kit issue panel present for RQ-214:', hasKitPanel);
    if (!hasKitPanel) throw new Error('Kit issue panel missing');

    // Fill form selects: asset_0 (PR-04), asset_1 (SP-02), asset_2 (AD-12)
    await client.eval(`(() => {
      const f = document.querySelector("[data-quick-issue='RQ-214']");
      f.querySelector('[name="asset_0"]').value = 'PR-04';
      f.querySelector('[name="asset_1"]').value = 'SP-02';
      f.querySelector('[name="asset_2"]').value = 'AD-12';
      f.querySelector('[name="who"]').value = 'Kabir Sen';
      f.querySelector('[name="due"]').value = 'Fri 8 pm';
      f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`);

    // Verify status notice
    const statusNotice1 = await client.eval('document.querySelector("[data-status]").textContent');
    console.log('Status notice after kit issue:', statusNotice1);
    if (!statusNotice1.includes('Issued complete kit')) throw new Error('Kit issue failed: ' + statusNotice1);

    // Verify RQ-214 status badge
    await client.eval('document.querySelector(\'[data-action="close"]\').click()');
    const reqStatusText = await client.eval(`(() => {
      const rows = Array.from(document.querySelectorAll('.row'));
      const r = rows.find(x => x.textContent.includes('Courtyard screening'));
      return r ? r.textContent : '';
    })()`);
    console.log('RQ-214 row status text:', reqStatusText);
    if (!reqStatusText.includes('Kit on loan (3/3 issued)')) {
      throw new Error('RQ-214 status not updated to Kit on loan');
    }

    // ==========================================
    // TEST 3: Advance to Phase 1 (Friday · 7:30 pm)
    // ==========================================
    console.log('\n--- Running Test 3: Advance to Phase 1 ---');
    await client.eval('document.querySelector(\'[data-action="advance"]\').click()');
    const clockPhase1 = await client.eval('document.querySelector("[data-clock]").textContent');
    console.log('Clock Phase 1:', clockPhase1);
    if (!clockPhase1.includes('Friday · 7:30 pm')) throw new Error('Shift did not advance to Phase 1');

    // ==========================================
    // TEST 4: Partial Return & Handover for Film Society
    // ==========================================
    console.log('\n--- Running Test 4: Partial Return & Handover ---');
    // Open Loan Register
    await client.eval('document.querySelector(\'[data-action="tab"][data-val="Loan register"]\').click()');
    // Open Batch return for RQ-214
    await client.eval('document.querySelector(\'[data-action="tab"][data-val="Requests"]\').click()');
    await client.eval('document.querySelector(\'[data-action="request"][data-val="RQ-214"]\').click()');
    await client.eval('document.querySelector(\'[data-action="open-batch-return"][data-val="RQ-214"]\').click()');

    // In batch return form: PR-04 & SP-02 return now, AD-12 uncheck and handover to Leela Das
    await client.eval(`(() => {
      const f = document.querySelector("[data-submit-batch-return='RQ-214']");
      // Find row for AD-12 (slip 404)
      const slip404Checkbox = f.querySelector('[data-action="toggle-handover-row"][data-val="404"]');
      if (slip404Checkbox) {
        slip404Checkbox.checked = false;
        slip404Checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        const fields = f.querySelector('[data-handover-fields="404"]');
        if (fields) {
          fields.querySelector('[name="handover_who_404"]').value = 'Leela Das';
          fields.querySelector('[name="handover_due_404"]').value = 'Sat 9 am';
          fields.querySelector('[name="handover_note_404"]').value = 'Leela still has the adapter. She’ll drop it off tomorrow at nine.';
        }
      }
      f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`);

    const statusNotice2 = await client.eval('document.querySelector("[data-status]").textContent');
    console.log('Status notice after partial return:', statusNotice2);
    if (!statusNotice2.includes('Partial return & handover processed')) {
      throw new Error('Partial return submit failed: ' + statusNotice2);
    }

    // Verify Loan Register display
    const registerText = await client.eval('document.querySelector("[data-page]").textContent');
    console.log('Has Leela Das in register:', registerText.includes('Leela Das'));
    console.log('Has Handover · Sat 9 am badge:', registerText.includes('Handover · Sat 9 am'));
    if (!registerText.includes('Leela Das') || !registerText.includes('Handover · Sat 9 am')) {
      throw new Error('Register does not show handover to Leela Das');
    }

    // Verify Desk Book has handover log
    await client.eval('document.querySelector(\'[data-action="tab"][data-val="Desk book"]\').click()');
    const deskbookText = await client.eval('document.querySelector("[data-page]").textContent');
    console.log('Deskbook contains official handover record:', deskbookText.includes('Official Shift Handover Record'));
    if (!deskbookText.includes('Official Shift Handover Record')) {
      throw new Error('Desk book missing official handover record');
    }

    // ==========================================
    // TEST 5: Advance to Phase 2 (Saturday · 9:00 am)
    // ==========================================
    console.log('\n--- Running Test 5: Advance to Phase 2 (Morning Shift) ---');
    await client.eval('document.querySelector(\'[data-action="advance"]\').click()');
    const clockPhase2 = await client.eval('document.querySelector("[data-clock]").textContent');
    console.log('Clock Phase 2:', clockPhase2);
    if (!clockPhase2.includes('Saturday · 9:00 am')) throw new Error('Shift did not advance to Phase 2');

    // Check Loan Register has Pending Shift Handover Banner
    await client.eval('document.querySelector(\'[data-action="tab"][data-val="Loan register"]\').click()');
    const hasHandoverBanner = await client.eval('Boolean(document.querySelector(".handover-banner"))');
    const handoverBtnText = await client.eval('document.querySelector(".handover-banner button.primary")?.textContent || ""');
    console.log('Handover banner visible:', hasHandoverBanner);
    console.log('Handover button text:', handoverBtnText);
    if (!hasHandoverBanner || !handoverBtnText.includes('Receive return from Leela Das')) {
      throw new Error('Handover banner missing or quick-receive button missing');
    }

    // ==========================================
    // TEST 6: Morning Staff receives adapter from Leela
    // ==========================================
    console.log('\n--- Running Test 6: Receive Adapter from Leela ---');
    await client.eval('document.querySelector(".handover-banner button.primary").click()');
    const statusNotice3 = await client.eval('document.querySelector("[data-status]").textContent');
    console.log('Status notice after morning return:', statusNotice3);
    if (!statusNotice3.includes('Handover completed')) {
      throw new Error('Handover completion failed: ' + statusNotice3);
    }

    // Verify RQ-214 is now completely closed
    await client.eval('document.querySelector(\'[data-action="tab"][data-val="Requests"]\').click()');
    const reqStatusTextCompleted = await client.eval(`(() => {
      const rec = document.querySelector('.record');
      if (rec) return rec.textContent;
      const rows = Array.from(document.querySelectorAll('.row'));
      const r = rows.find(x => x.textContent.includes('Courtyard screening'));
      return r ? r.textContent : '';
    })()`);
    console.log('RQ-214 final status text:', reqStatusTextCompleted);
    if (!reqStatusTextCompleted.includes('Completed · All returned')) {
      throw new Error('RQ-214 did not reach Completed · All returned');
    }

    // ==========================================
    // TEST 7: Inventory Status Check
    // ==========================================
    console.log('\n--- Running Test 7: Inventory Verification ---');
    await client.eval('document.querySelector(\'[data-action="tab"][data-val="Inventory"]\').click()');
    const invText = await client.eval('document.querySelector("[data-page]").textContent');
    console.log('PR-04 back on shelf:', invText.includes('PR-04 · HDMI projector') && invText.includes('On shelf'));
    console.log('AD-12 back on shelf:', invText.includes('AD-12 · USB-C → HDMI adapter') && invText.includes('On shelf'));

    // ==========================================
    // TEST 8: Search and Filters
    // ==========================================
    console.log('\n--- Running Test 8: Register Search and Filters ---');
    await client.eval('document.querySelector(\'[data-action="tab"][data-val="Loan register"]\').click()');
    await client.eval('document.querySelector(\'[data-action="filter-register"][data-val="all"]\').click()');
    
    // Type search "Leela"
    await client.eval(`(() => {
      const sInput = document.querySelector('[data-action="search"]');
      sInput.value = 'Leela';
      sInput.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    const searchResultLeela = await client.eval('document.querySelectorAll(".row").length');
    console.log('Search "Leela" returned rows:', searchResultLeela);
    if (searchResultLeela < 1) throw new Error('Search failed for "Leela"');

    // ==========================================
    // TEST 9: Persistence Test (Page Reload)
    // ==========================================
    console.log('\n--- Running Test 9: Persistence across Reload ---');
    await client.send('Page.reload');
    await sleep(500);
    const reloadedClock = await client.eval('document.querySelector("[data-clock]").textContent');
    console.log('Clock after reload:', reloadedClock);
    if (!reloadedClock.includes('Saturday · 9:00 am')) {
      throw new Error('Persistence failed: clock reverted after reload');
    }

    // ==========================================
    // TEST 10: Reset Shift
    // ==========================================
    console.log('\n--- Running Test 10: Reset Shift ---');
    await client.eval('document.querySelector(\'[data-action="restart"]\').click()');
    const resetClock = await client.eval('document.querySelector("[data-clock]").textContent');
    console.log('Clock after restart:', resetClock);
    if (!resetClock.includes('Friday · 3:45 pm')) {
      throw new Error('Reset failed: clock not reset to Friday 3:45 pm');
    }

    // ==========================================
    // TEST 11: Error Checks
    // ==========================================
    console.log('\n--- Running Test 11: Console Errors ---');
    console.log('Total console error events caught:', client.errors.length);
    if (client.errors.length > 0) {
      console.error('Console errors:', client.errors);
      throw new Error('Console errors encountered during testing!');
    }

    console.log('\n=============================================');
    console.log('🎉 ALL 11 TESTS PASSED WITH ZERO ERRORS! 🎉');
    console.log('=============================================\n');

  } finally {
    if (chrome) {
      chrome.kill();
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

run().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
