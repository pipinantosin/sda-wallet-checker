// ==========================
// PROVIDER CHECK
// ==========================
if (!window.provider) {
    console.warn("Provider belum siap");
}

// =============================
// GLOBAL WALLET FROM PK
// =============================
window.wallet = null;


// =============================
// TX HISTORY STORAGE (GLOBAL FIX)
// =============================
window.getTxHistory = function(){
    try{
        return JSON.parse(localStorage.getItem("txHistory")) || [];
    }catch{
        return [];
    }
};

window.saveTxHistory = function(data){
    localStorage.setItem("txHistory", JSON.stringify(data));
};


// =============================
// AUTO DETECT PRIVATE KEY
// =============================
document.addEventListener("DOMContentLoaded", () => {

    const pkInput = document.getElementById("pkSend") 
        || document.getElementById("walletPK");

    if (!pkInput) return;

    pkInput.addEventListener("input", (e) => {

        const pk = e.target.value.trim();

        if (pk.length < 20) {
            window.wallet = null;
            updateSendBalance?.();
            return;
        }

        try {
            window.wallet = new ethers.Wallet(pk, window.provider);

            console.log("✔ Wallet aktif:", window.wallet.address);

            updateSendBalance?.();

        } catch (err) {
            window.wallet = null;
            console.warn("PK invalid");
        }
    });
});


// =============================
// SEND TOKEN MODULE
// =============================
let SEND_TOKENS = [];
let sendCurrentToken = null;


// =============================
// LOAD TOKEN SELECT
// =============================
function loadSendTokens() {

    const sel = document.getElementById("sendTokenSelect");
    if (!sel) return;

    SEND_TOKENS = Array.isArray(TOKENS) ? TOKENS : [];

    sel.innerHTML = "";

    // NATIVE
    const nativeOpt = document.createElement("option");
    nativeOpt.value = "native";
    nativeOpt.textContent = "SDA";
    nativeOpt.dataset.icon = "img/sda.png";
    sel.appendChild(nativeOpt);

    // ERC20
    SEND_TOKENS.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.address;
        opt.textContent = t.symbol;
        opt.dataset.icon = t.logo || "img/sda.png";
        sel.appendChild(opt);
    });

    sel.value = window.selectedToken || "native";

    applySendTokenState();

    sel.onchange = function () {

    const val = sel.value;

    // 🔥 PAKAI GLOBAL HANDLER (INI KUNCI)
    setGlobalToken(val);

    // update UI send modal
    applySendTokenState();
};
}


// =============================
// APPLY TOKEN UI
// =============================
function applySendTokenState() {

    const sel = document.getElementById("sendTokenSelect");
    if (!sel) return;

    const val = sel.value || "native";

    let logo = "img/sda.png";
    let symbol = "SDA";

    if (val !== "native") {

        const token = SEND_TOKENS.find(t => t.address === val);

        if (token) {
            logo = token.logo || "img/sda.png";
            symbol = token.symbol;
            sendCurrentToken = token;
        }

    } else {
        sendCurrentToken = { symbol: "SDA", address: null };
    }

    const iconEl = document.getElementById("sendTokenIcon");
    const symbolEl = document.getElementById("sendTokenSymbol");

    if (iconEl) iconEl.src = logo;
    if (symbolEl) symbolEl.innerText = symbol;
}


// =============================
// UPDATE BALANCE
// =============================
async function updateSendBalance() {

    const el = document.getElementById("sendBalance");
    if (!el || !sendCurrentToken) return;

    const addr = window.wallet?.address 
        || getSelectedWallet?.()?.address;

    if (!addr) {
        el.innerText = "0.00";
        return;
    }

    try {

        if (!sendCurrentToken.address) {

            const b = await provider.getBalance(addr);

            el.innerText =
                parseFloat(
                    ethers.utils.formatEther(b)
                ).toFixed(4) + " SDA";

            return;
        }

        const abi = [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];

        const contract = new ethers.Contract(
            sendCurrentToken.address,
            abi,
            provider
        );

        const [bal, dec] = await Promise.all([
            contract.balanceOf(addr),
            contract.decimals().catch(() => 18)
        ]);

        const value =
            parseFloat(
                ethers.utils.formatUnits(bal, dec)
            ).toFixed(4);

        el.innerText = value + " " + sendCurrentToken.symbol;

    } catch (e) {
        console.warn("Balance error:", e);
    }
}


// =============================
// SEND TRANSACTION (FIX FINAL)
// =============================
async function sendTx() {

    const to = document.getElementById("toSend")?.value?.trim();
    const amount = document.getElementById("amountSend")?.value?.trim();

    const activeWallet =
        window.wallet ||
        (getSelectedWallet?.()?.privateKey
            ? new ethers.Wallet(getSelectedWallet().privateKey, provider)
            : null);

    if (!activeWallet) {
        return alert("Private key belum diisi / tidak tersedia");
    }

    if (!to || !amount) {
        return alert("Input belum lengkap");
    }

    const token = window.selectedTokenData;

    if (!token) {
        return alert("Token tidak valid");
    }

    let tx;

    try {
console.log("TOKEN TERPILIH:", window.selectedTokenData);


        // =============================
        // NATIVE (SDA)
        // =============================
        if (token.type === "native") {

            tx = await activeWallet.sendTransaction({
                to: to,
                value: ethers.utils.parseEther(amount)
            });

        // =============================
        // ERC20 TOKEN
        // =============================
        } else {

            const abi = [
                "function transfer(address to,uint amount) returns (bool)",
                "function decimals() view returns (uint8)"
            ];

            const contract = new ethers.Contract(
                token.address,
                abi,
                activeWallet
            );

            // ambil decimals (dynamic)
            let decimals = token.decimals || 18;

            try {
                decimals = await contract.decimals();
            } catch {}

            const value = ethers.utils.parseUnits(amount, decimals);

            tx = await contract.transfer(to, value);
        }

    } catch (e) {
        console.error("TX ERROR:", e);
        return alert("Send gagal (TX error)");
    }

    // =====================
    // SUCCESS HANDLER
    // =====================
    try {

        if (!tx || !tx.hash) {
            throw new Error("TX invalid");
        }

        console.log("✔ TX HASH:", tx.hash);

        showToast?.("Transaksi berhasil", "success");

        await saveTxToHistory(tx.hash, amount, token);

        closeSendModal?.();

        // refresh balance biar langsung update
        if (typeof refreshAll === "function") {
            setTimeout(() => refreshAll(), 500);
        }

    } catch (uiErr) {
        console.warn("UI error:", uiErr);
        alert("TX berhasil:\n" + (tx?.hash || "-"));
    }
}

// =============================
// SAVE TX HISTORY (NO CONFIG DEPENDENCY)
// =============================
async function saveTxToHistory(hash, amount, token){

    try{

        let to = "-";
        let from = "-";

        try{
            const txData = await provider.getTransaction(hash);

            if(txData){
                to = txData.to || "-";
                from = txData.from || "-";
            }
        }catch(e){
            console.warn("Ambil tx gagal:", e);
        }

        const history = getTxHistory();

        history.unshift({
            hash: hash,
            value: parseFloat(amount),

            // ==========================
            // TOKEN DATA (FIX UTAMA)
            // ==========================
            symbol: token?.symbol || "SDA",
            logo: token?.logo || "img/sda.png",
            tokenAddress: token?.address || "native",

            to: to,
            from: from,
            timestamp: Math.floor(Date.now()/1000),
            blockNumber: "0x0",
            read: false
        });

        saveTxHistory(history);

        renderTxHistory?.();
        updateBellBadge?.();

        console.log("✔ History saved:", {hash, token: token?.symbol});

    }catch(e){
        console.warn("History error:", e);
    }
}



// =============================
// INIT
// =============================
document.addEventListener("DOMContentLoaded", () => {

    setTimeout(() => {
        loadSendTokens();
        updateSendBalance();

        renderTxHistory?.();
        updateBellBadge?.();

    }, 300);

});


window.closeSendModal = function () {
    const modal = document.getElementById("sendModal");
    if (modal) {
        modal.style.display = "none";
    }
};
