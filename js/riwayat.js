// =============================
// TX DETAIL MODAL
// =============================
function showTxDetail(tx){

    const block = parseInt(tx.blockNumber || "0x0", 16) || 0;
    const confirmations = tx.latestBlock
        ? (tx.latestBlock - block)
        : 0;

    const symbol = tx.symbol || "SDA";

    showConfirm(`
Hash: ${tx.hash}

Value: ${tx.value} ${symbol}
Token: ${symbol}

From: ${tx.from}
To: ${tx.to}

Block: ${block}
Confirmations: ${confirmations}

Date: ${formatDate(tx.timestamp)}
    `);
}


// =============================
// BELL BADGE
// =============================
function updateBellBadge(){

    const badge = getEl("txBadge");
    if(!badge) return;

    const list = getTxHistory();
    const unread = list.filter(t => !t.read).length;

    if(unread > 0){
        badge.style.display = "inline-block";
        badge.innerText = unread;
    }else{
        badge.style.display = "none";
    }
}




function formatAddress(addr){
    if(!addr) return "-";
    return addr.slice(0,6) + "..." + addr.slice(-4);
}
// =============================
// TX HISTORY GETTER (SAFE)
// =============================
function getTxHistory(){
    try{
        return JSON.parse(localStorage.getItem("txHistory")) || [];
    }catch{
        return [];
    }
}




// =============================
// TX HISTORY RENDER (PRO VERSION)
// =============================
function renderTxHistory(){

    const list = getEl("txHistoryList");
    if(!list) return;

    const history = getTxHistory();
    const wallet = getSelectedWallet?.();
    const myAddr = wallet?.address?.toLowerCase();

    // =============================
    // EMPTY STATE
    // =============================
    if(history.length === 0){
        list.innerHTML = `
        <div style="text-align:center;color:#888;padding:30px;">
            <div style="font-size:14px;">No Transactions</div>
            <div style="font-size:11px;margin-top:6px;">Your activity will appear here</div>
        </div>`;
        return;
    }

    list.innerHTML = "";

    // =============================
    // RENDER LIST
    // =============================
    history.forEach(tx => {

        const symbol = tx.symbol || "SDA";
        const logo   = tx.logo || "img/sda.png";

        const from = tx.from?.toLowerCase();
        const to   = tx.to?.toLowerCase();

        // =============================
        // TYPE DETECTION
        // =============================
        let type = "SEND";
        let color = "#ff4d4f";
        let icon = "↑";

        if (myAddr && to === myAddr) {
            type = "RECEIVE";
            color = "#00d084";
            icon = "↓";
        }

        // =============================
        // FORMAT VALUE
        // =============================
        let value = Number(tx.value || 0);

        let valueFormatted;

        if (value === 0) {
            valueFormatted = "0";
        } else if (value < 0.000001) {
            valueFormatted = value.toExponential(2);
        } else {
            valueFormatted = value.toFixed(6).replace(/\.?0+$/, "");
        }

        // =============================
        // ADDRESS (SMART DISPLAY)
        // =============================
        let targetAddr = "-";

        if (type === "SEND") {
            targetAddr = tx.to || "-";
        } else {
            targetAddr = tx.from || "-";
        }

        const shortAddr = targetAddr
            ? targetAddr.slice(0,6) + "..." + targetAddr.slice(-4)
            : "-";

        // =============================
        // ELEMENT
        // =============================
        const el = document.createElement("div");
        el.className = "asset-item";

        el.innerHTML = `
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">

    <!-- LEFT -->
    <div style="display:flex;align-items:center;gap:10px;">

        <div style="position:relative;">
            <img src="${logo}" 
                 style="width:34px;height:34px;border-radius:50%;background:#111;padding:5px;" />

            <div style="
                position:absolute;
                bottom:-2px;
                right:-2px;
                width:16px;height:16px;
                font-size:10px;
                background:${color};
                color:#fff;
                border-radius:50%;
                display:flex;
                align-items:center;
                justify-content:center;
            ">
                ${icon}
            </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:3px;">

            <div style="font-size:13px;font-weight:600;">
                ${type}
            </div>

            <div style="font-size:11px;color:#888;">
                ${shortAddr}
            </div>

            <div style="font-size:10px;color:#666;">
                ${formatDate(tx.timestamp)}
            </div>
        </div>
    </div>

    <!-- RIGHT -->
    <div style="text-align:right;">

        <div style="font-size:13px;font-weight:600;color:${color};">
            ${type === "SEND" ? "-" : "+"}${valueFormatted}
        </div>

        <div style="font-size:11px;color:#aaa;margin-top:2px;">
            ${symbol}
        </div>

        <!-- 🔥 ACTION BUTTONS (INI YANG HILANG) -->
        <div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end;">

            <button class="copy-btn"
                data-copy="${tx.hash}"
                style="font-size:10px;padding:3px 6px;">
                Copy
            </button>

            <button class="open-tx"
                data-hash="${tx.hash}"
                style="font-size:10px;padding:3px 6px;">
                Ledger
            </button>

        </div>

    </div>
</div>
`;

        // =============================
        // CLICK DETAIL
        // =============================
        el.onclick = (e) => {
            if(e.target.classList.contains("copy-btn")) return;
            if(e.target.classList.contains("open-tx")) return;
            showTxDetail(tx);
        };

        list.appendChild(el);
    });
}

let activeModal = null;

// =============================
// OPEN HISTORY MODAL
// =============================
function openTxHistory(){

    const list = getTxHistory();

    list.forEach(t => t.read = true);
    saveTxHistory?.(list);

    renderTxHistory();
    updateBellBadge();

    const modal = getEl("txModal");
    if(!modal) return;

    modal.classList.add("show");
    modal.style.display = "flex";

    // =============================
    // set active modal (for back button)
    // =============================
    activeModal = modal;

    // =============================
    // push history state (BACK BUTTON SUPPORT)
    // =============================
    history.pushState({ modal: "txModal" }, "");
}


// =============================
// CLOSE HISTORY MODAL (SAFE)
// =============================
function closeTxModal(){

    const modal = getEl("txModal");
    if(!modal) return;

    modal.classList.remove("show");
    modal.style.display = "none";

    activeModal = null;
}


// =============================
// BACK BUTTON HANDLER (ANDROID + MOBILE)
// =============================
window.addEventListener("popstate", () => {

    // kalau ada modal aktif → tutup modal, STOP navigation
    if(activeModal){

        activeModal.classList.remove("show");
        activeModal.style.display = "none";

        activeModal = null;
    }
});


document.addEventListener("click", async (e) => {

    // =============================
    // COPY HASH (FIX REAL BUG)
    // =============================
    const copyBtn = e.target.closest(".copy-btn");

    if (copyBtn) {

        const val = copyBtn.dataset.copy;

        if (!val) {
            return showToast?.("Hash tidak tersedia", "error");
        }

        try {
            await navigator.clipboard.writeText(val);

            showToast?.("Hash copied", "success");

        } catch (err) {
            console.warn("Copy error:", err);
            showToast?.("Gagal copy", "error");
        }
    }

    // =============================
    // OPEN TX (LEDGER)
    // =============================
    const txBtn = e.target.closest(".open-tx");

    if (txBtn) {

        const hash = txBtn.dataset.hash;

        if (!hash) {
            return showToast?.("Hash tidak tersedia", "error");
        }

        const url = "https://ledger.sidrachain.com/tx/" + hash;

        window.open(url, "_blank");
    }
});