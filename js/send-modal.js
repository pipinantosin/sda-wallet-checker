// =============================
// SEND MODAL CONTROLLER CLEAN
// =============================

// =============================
// SAFE ELEMENT GETTER
// =============================
function getEl(id){
    return document.getElementById(id);
}

// =============================
// INIT MODAL (AFTER DOM READY)
// =============================
document.addEventListener("DOMContentLoaded", () => {

    const sendModal   = getEl("sendModal");
    const openSendBtn = getEl("openSendBtn");
    const closeSendBtn= getEl("closeSendModal");

    // =============================
    // OPEN MODAL
    // =============================
    if (openSendBtn && sendModal) {
        openSendBtn.addEventListener("click", () => {
            sendModal.style.display = "flex";
            syncSendTokenUI?.();
        });
    }

    // =============================
    // CLOSE MODAL
    // =============================
    if (closeSendBtn && sendModal) {
        closeSendBtn.addEventListener("click", () => {
            sendModal.style.display = "none";
        });
    }

    // =============================
    // CLICK OUTSIDE CLOSE
    // =============================
    if (sendModal) {
        sendModal.addEventListener("click", (e) => {
            if (e.target === sendModal) {
                sendModal.style.display = "none";
            }
        });
    }

});


// ==========================
// SYNC TOKEN KE SEND MODAL
// ==========================
function syncSendTokenUI(){

    const select = getEl("tokenSelect");
    if (!select) return;

    const val = select.value;
    window.selectedToken = val;

    let logo = "img/sda.png";
    let symbol = "SDA";

    if (val !== "native") {

        const token = (TOKENS || []).find(
            t => t.address === val
        );

        if (token) {
            logo = token.logo || "img/default.png";
            symbol = token.symbol;
        }
    }

    const iconEl = getEl("sendTokenIcon");
    const symbolEl = getEl("sendTokenSymbol");

    if (iconEl) iconEl.src = logo;
    if (symbolEl) symbolEl.innerText = symbol;
}


// ==========================
// TOKEN SELECTOR FIX
// ==========================
function openTokenSelector(){
    const select = getEl("tokenSelect");
    if (!select) return;

    select.focus();
    select.click?.();
}


// =============================
// TX HISTORY RENDER
// =============================
function renderTxHistory(){

    const list = getEl("txHistoryList");
    if(!list) return;

    const history = getTxHistory();

    // =============================
    // EMPTY STATE
    // =============================
    if(history.length === 0){
        list.innerHTML = `
        <div style="text-align:center;color:#888;padding:20px;">
            No Transaction
        </div>`;
        return;
    }

    list.innerHTML = "";

    // =============================
    // RENDER LIST
    // =============================
    history.forEach(tx => {

        const block = parseInt(tx.blockNumber || "0x0", 16) || 0;

        // FORMAT VALUE (ANTI 0)
        let valueText = "0 SDA";

        if(tx.value !== undefined && tx.value !== null){
            const val = Number(tx.value);

            if(val === 0){
                valueText = "0 SDA";
            }else if(val < 0.0001){
                valueText = val + " SDA";
            }else{
                valueText = val.toFixed(4) + " SDA";
            }
        }

        // ADDRESS TARGET (fallback ke hash kalau belum ada)
        const address = tx.to || tx.from || "-";

        const el = document.createElement("div");
        el.className = "asset-item";

        el.innerHTML = `
            <div style="font-size:12px;display:flex;flex-direction:column;gap:4px;">
                
                <div style="display:flex;align-items:center;gap:6px;">
                    <b>${truncateHash(tx.hash)}</b>

                    <!-- COPY HASH -->
                    <i class="fa-regular fa-copy copy-btn" 
                       data-copy="${tx.hash}"
                       title="Copy Hash"></i>

                    <!-- OPEN LEDGER -->
                   <i class="fa-solid fa-arrow-up-right-from-square open-tx"
   data-hash="${tx.hash}"
   title="View TX"></i>
                </div>

                <div style="color:#888;font-size:11px;">
                    ${formatDate(tx.timestamp)}
                </div>
            </div>

            <div style="text-align:right;font-size:12px;">
                <div>
                    ${tx.pending ? "⏳ Pending..." : valueText}
                </div>
                <div style="color:#ff7a00;">
                    Block ${block}
                </div>
            </div>
        `;

        // =============================
        // CLICK DETAIL
        // =============================
        el.onclick = (e) => {
            if(e.target.classList.contains("copy-btn")) return;
            if(e.target.classList.contains("open-ledger")) return;
            showTxDetail(tx);
        };

        list.appendChild(el);
    });
}

// =============================
// TX DETAIL MODAL
// =============================
function showTxDetail(tx){

    const block = parseInt(tx.blockNumber || "0x0", 16) || 0;
    const confirmations = tx.latestBlock
        ? (tx.latestBlock - block)
        : 0;

    showConfirm(`
Hash: ${tx.hash}

Value: ${tx.value} SDA
Fee: ${tx.txFee}

Gas Used: ${tx.gasUsed}
Gas Limit: ${tx.gasLimit}
Gas Price: ${tx.gasPrice}

Block: ${block}
Nonce: ${tx.nonce}

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
    if(modal) modal.style.display = "flex";
}


// =============================
// CLOSE HISTORY MODAL
// =============================
function closeTxModal(){
    const modal = getEl("txModal");
    if(modal) modal.style.display = "none";
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

document.addEventListener("click", (e) => {

    // =============================
    // COPY HASH
    // =============================
    if(e.target.classList.contains("copy-btn")){
        const val = e.target.dataset.copy;

        if(!val){
            return showToast?.("Hash tidak tersedia", "error");
        }

        navigator.clipboard.writeText(val);
        showToast?.("Hash copied", "success");
    }

    // =============================
    // OPEN TX (LEDGER)
    // =============================
    if(e.target.classList.contains("open-tx")){

        const hash = e.target.dataset.hash;

        if(!hash){
            return showToast?.("Hash tidak tersedia", "error");
        }

        const url = "https://ledger.sidrachain.com/tx/" + hash;

        window.open(url, "_blank");
    }

});