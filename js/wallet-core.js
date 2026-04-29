// =====================================
// SDA WALLET CORE â€” PK GLOBAL SYSTEM
// Version: clean-fix-v3 + FA icons
// =====================================

window.WALLET_SESSION = window.WALLET_SESSION || {
    pkWallet:      null,
    mode:          "watch",
    activeAddress: null,
    pkLocked:      false,
    pinHash:       null,
    pinCreated:    false
};

window.PK_STORAGE_KEY = window.PK_STORAGE_KEY || "sda_pk_wallet";
window.__PK_RESTORING = window.__PK_RESTORING || false;

window.pkProvider = window.pkProvider || new ethers.providers.JsonRpcProvider(
    "https://node.sidrachain.com"
);

// =====================================
// INIT
// =====================================
document.addEventListener("DOMContentLoaded", () => {
    restorePK();
    setTimeout(updatePINUI, 50);
    updatePKUI();
});


// =====================================
// UNLOCK â€” import private key dari input
// =====================================
function unlockPK() {

    const pk = document.getElementById("globalPKInput")?.value?.trim();
    if (!pk) return showToast?.("Private key kosong", "error");

    try {
        const wallet = new ethers.Wallet(pk, window.pkProvider);

        window.WALLET_SESSION.pkWallet      = wallet;
        window.WALLET_SESSION.activeAddress = wallet.address;
        window.WALLET_SESSION.mode          = "pk";

        localStorage.removeItem("PK_DELETED");

        if (!window.__PK_RESTORING) {
            syncPKToWalletSystem(pk, wallet.address);
        }

        savePKSession();
        updatePKUI();
        showToast?.("PK Imported", "success");

    } catch (err) {
        showToast?.("Private Key invalid", "error");
    }
}


// =====================================
// PIN â€” set (async karena SHA-256)
// =====================================
async function setPKPin() {

    const pin = document.getElementById("pkPinSetInput")?.value?.trim();
    if (!pin || pin.length < 4) return showToast("PIN minimal 4 digit", "error");

    window.WALLET_SESSION.pinHash    = await hashPIN(pin);
    window.WALLET_SESSION.pinCreated = true;

    savePKSession();
    updatePINUI();
    showToast("PIN saved", "success");
}


// =====================================
// PIN â€” unlock (async karena SHA-256)
// =====================================
async function unlockWithPIN() {

    const pin = document.getElementById("pkPinUnlockInput")?.value?.trim();
    if (!pin) return showToast("Masukkan PIN", "error");

    const hash = await hashPIN(pin);
    if (hash !== window.WALLET_SESSION.pinHash) return showToast("PIN salah", "error");

    window.WALLET_SESSION.pkLocked = false;
    savePKSession();
    updatePKUI();
    showToast("Wallet unlocked", "success");
}


// =====================================
// PIN â€” SHA-256 hash helper
// =====================================
async function hashPIN(pin) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}


// =====================================
// PIN UI sync
// =====================================
function updatePINUI() {
    const setBox    = document.getElementById("pinSetBox");
    const unlockBox = document.getElementById("pinUnlockBox");
    if (!setBox || !unlockBox) return;

    const created = window.WALLET_SESSION.pinCreated;
    setBox.style.display    = created ? "none"  : "block";
    unlockBox.style.display = created ? "block" : "none";
}


// =====================================
// SESSION â€” save / load
// =====================================
function savePKSession() {
    localStorage.setItem("PK_SESSION", JSON.stringify({
        pk:         window.WALLET_SESSION.pkWallet?.privateKey || null,
        address:    window.WALLET_SESSION.activeAddress,
        locked:     window.WALLET_SESSION.pkLocked,
        pinHash:    window.WALLET_SESSION.pinHash,
        pinCreated: window.WALLET_SESSION.pinCreated
    }));
}

function loadPKSession() {
    try   { return JSON.parse(localStorage.getItem("PK_SESSION")); }
    catch { return null; }
}


// =====================================
// RESTORE â€” otomatis saat load
// =====================================
function restorePK() {

    if (localStorage.getItem("PK_DELETED") === "1") return;

    const data = loadPKSession();
    if (!data?.pk) return;

    try {
        const wallet = new ethers.Wallet(data.pk, window.pkProvider);

        window.WALLET_SESSION.pkWallet      = wallet;
        window.WALLET_SESSION.activeAddress = wallet.address;
        window.WALLET_SESSION.pkLocked      = data.locked     === true;
        window.WALLET_SESSION.pinCreated    = data.pinCreated || false;
        window.WALLET_SESSION.pinHash       = data.pinHash    || null;

        window.__PK_RESTORING = true;
        syncPKToWalletSystem(data.pk, wallet.address);
        window.__PK_RESTORING = false;

        updatePKUI();

    } catch {
        console.warn("PK restore failed");
    }
}


// =====================================
// LOCK
// =====================================
function lockPK() {
    if (!window.WALLET_SESSION.pkWallet) return;

    window.WALLET_SESSION.pkLocked = true;
    savePKSession();
    updatePKUI();
    showToast("Wallet locked", "success");
}


// =====================================
// DELETE
// =====================================
function deletePKWallet() {

    if (!confirm("Hapus wallet PK ini?")) return;

    resetPKState();
    localStorage.setItem("PK_DELETED", "1");

    renderWallets?.();
    renderSavedAddresses?.();
    updateActiveWalletName?.();
    loadBalance?.();
    showToast("PK wallet deleted", "success");
}


// =====================================
// RESET STATE + STORAGE
// =====================================
function resetPKState() {
    window.WALLET_SESSION.pkWallet      = null;
    window.WALLET_SESSION.pkLocked      = false;
    window.WALLET_SESSION.pinHash       = null;
    window.WALLET_SESSION.pinCreated    = false;
    window.WALLET_SESSION.activeAddress = null;
    window.WALLET_SESSION.mode          = "watch";

    localStorage.removeItem("PK_SESSION");
    localStorage.removeItem(window.PK_STORAGE_KEY);

    updatePKUI?.();
}


// =====================================
// SET PK STATE (helper terpusat)
// =====================================
function setPKState(wallet, pk) {
    window.WALLET_SESSION.pkWallet      = wallet;
    window.WALLET_SESSION.mode          = "pk";
    window.WALLET_SESSION.activeAddress = wallet.address;
    localStorage.setItem(window.PK_STORAGE_KEY, pk);
}


// =====================================
// GET ACTIVE WALLET
// =====================================
function getActiveWallet() {
    return window.WALLET_SESSION.pkWallet;
}


// =====================================
// REQUIRE PK â€” guard sebelum transaksi
// =====================================
function requirePK() {
    const s = window.WALLET_SESSION;

    if (!s.pkWallet) {
        openPKModal();
        throw new Error("PK required");
    }
    if (s.pkLocked) {
        openPKModal();
        throw new Error("PK locked");
    }
    return s.pkWallet;
}


// =====================================
// SEND TX
// =====================================
async function sendWithPK(to, amount, tokenAddress = null) {

    const wallet = requirePK();

    try {
        if (!tokenAddress) {
            const tx = await wallet.sendTransaction({
                to,
                value: ethers.utils.parseEther(amount)
            });
            showToast("TX sent: " + tx.hash, "success");
            return tx;
        }

        const abi      = ["function transfer(address to, uint256 amount) returns (bool)"];
        const contract = new ethers.Contract(tokenAddress, abi, wallet);

        const tx = await contract.transfer(
            to,
            ethers.utils.parseUnits(amount, 18)
        );
        showToast("TX sent: " + tx.hash, "success");
        return tx;

    } catch (err) {
        console.error(err);
        showToast("Transaction failed", "error");
    }
}


// =====================================
// GET BALANCE â€” FIX: ABI wajib ada sebagai arg ke-2
// =====================================
async function getPKBalance(tokenAddress = null) {

    const wallet = getActiveWallet();
    if (!wallet) return null;

    try {
        if (!tokenAddress) {
            const bal = await window.pkProvider.getBalance(wallet.address);
            return ethers.utils.formatEther(bal);
        }

        const abi = [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];
        const contract = new ethers.Contract(tokenAddress, abi, window.pkProvider);

        const [bal, dec] = await Promise.all([
            contract.balanceOf(wallet.address),
            contract.decimals().catch(() => 18)
        ]);

        return ethers.utils.formatUnits(bal, dec);

    } catch (err) {
        console.warn("getPKBalance error:", err);
        return null;
    }
}


// =====================================
// SYNC PK â†’ WALLET SYSTEM
// =====================================
function syncPKToWalletSystem(pk, address) {

    let wallets = getWallets?.() || [];
    const addr  = address.toLowerCase();
    const idx   = wallets.findIndex(w => w.address?.toLowerCase() === addr);

    if (idx === -1) {
        wallets.push({ address, name: "Main Wallet (PK)", type: "pk", privateKey: pk });
    } else {
        wallets[idx] = { ...wallets[idx], type: "pk", privateKey: pk };
    }

    setWallets(wallets);

    window.WALLET_SESSION.activeAddress = address;

    const newIndex = wallets.findIndex(w => w.address.toLowerCase() === addr);
    const select   = document.getElementById("walletSelect");

    if (select && newIndex !== -1) {
        select.value = String(newIndex);
        select.dispatchEvent(new Event("change"));
    }

    renderWallets?.();
    renderSavedAddresses?.();
    updateActiveWalletName?.();
    loadBalance?.();
}


// =====================================
// MODE SWITCH (PK / Passphrase)
// =====================================
function setPKMode(mode) {
    const pkBox     = document.getElementById("pkModePK");
    const phraseBox = document.getElementById("pkModePhrase");
    const label     = document.getElementById("pkModeLabel");
    const isPK      = mode === "pk";

    if (pkBox)     pkBox.style.display     = isPK ? "block" : "none";
    if (phraseBox) phraseBox.style.display = isPK ? "none"  : "block";
    if (label)     label.innerHTML         = isPK
        ? '<i class="fa-solid fa-key" style="margin-right:5px;"></i>MODE: PRIVATE KEY'
        : '<i class="fa-solid fa-shield-halved" style="margin-right:5px;"></i>MODE: PASSPHRASE';
}


// =====================================
// UI STATE UPDATE â€” status bar ikon FA
// =====================================
function updatePKUI() {

    const bar = document.getElementById("pkStatusBar");
    if (!bar) return;

    const s    = window.WALLET_SESSION;
    const text = bar.querySelector(".pk-text");
    const dot  = bar.querySelector(".pk-dot");

    if (!s.pkWallet) {
        bar.style.display = "none";
        return;
    }

    bar.style.display = "flex";

    if (s.pkLocked) {
        // fa-lock = gembok tertutup (terkunci)
        if (text) text.innerHTML =
            '<i class="fa-solid fa-lock" style="margin-right:5px;"></i>Locked - Tap to Unlock';
        if (dot)  dot.style.background = "#ff3b3b";
        bar.style.background           = "#3a1a1a";
        bar.onclick = openPKUnlockModal;
        return;
    }

    // fa-lock-open = gembok terbuka (aktif)
    if (text) text.innerHTML =
        '<i class="fa-solid fa-lock-open" style="margin-right:5px;"></i>Active - Tap to Lock';
    if (dot)  dot.style.background = "#00ff88";
    bar.style.background           = "#1a1a1a";
    bar.onclick = lockPK;
}


// =====================================
// MODAL CONTROL
// =====================================
function openPKModal() {
    const modal = document.getElementById("pkGlobalModal");
    if (modal) modal.style.display = "flex";
}

function closePKModal() {
    const modal = document.getElementById("pkGlobalModal");
    if (modal) modal.style.display = "none";
}

function openPKUnlockModal() {
    const modal = document.getElementById("pkGlobalModal");
    if (!modal) return;

    modal.style.display = "flex";
    setPKMode("phrase");

    // fa-lock merah di status mini
    const status = document.getElementById("pkStatusMini");
    if (status) status.innerHTML =
        '<i class="fa-solid fa-lock" style="margin-right:5px;color:#ff3b3b;"></i>' +
        'Wallet locked - masukkan PIN untuk unlock';

    const setBox    = document.getElementById("pinSetBox");
    const unlockBox = document.getElementById("pinUnlockBox");
    if (setBox)    setBox.style.display    = "none";
    if (unlockBox) unlockBox.style.display = "block";
}