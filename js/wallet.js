// ==========================
// ELEMENT SAFE INIT
// ==========================
const balanceEl = document.getElementById("balance");
const addressInput = document.getElementById("address");
const saveBtn = document.querySelector("button[onclick='saveWallet()']");
let blinkState = false;



// ==========================
// SAVE WALLET (FIXED + LANG + SYNC)
// ==========================
function saveWallet() {

    let addr = addressInput?.value?.trim().toLowerCase();
    const nameInput = document.getElementById("walletName");
    const name = nameInput?.value?.trim();

    // ==========================
    // VALIDATION
    // ==========================
    if (!addr) {
        return alert(LANG?.[CURRENT_LANG]?.enter_address || "Enter address");
    }

    if (!addr.startsWith("0x") || addr.length < 42) {
        return alert("Format address tidak valid");
    }

    const wallets = getWallets();

    const isExist = wallets.some(w =>
        w.address.toLowerCase() === addr
    );

    if (isExist) {
        return alert("Wallet sudah tersimpan");
    }

    // ==========================
    // SAVE
    // ==========================
    const newWallet = {
        address: addr,
        name: name || "Wallet"
    };

    wallets.push(newWallet);
    setWallets(wallets);

    // ==========================
    // RENDER + SELECT
    // ==========================
    renderWallets();

    // penting: pakai string biar aman
    const newIndex = String(wallets.length - 1);
    selectEl.value = newIndex;

    // ==========================
    // SYNC UI (INI YANG FIX BUG)
    // ==========================
    updateActiveWalletName();
    updateAddressUI?.(); // kalau ada function ini
    renderAssets();
    loadBalance();

    // ==========================
    // RESET INPUT
    // ==========================
    if (addressInput) addressInput.value = "";
    if (nameInput) nameInput.value = "";

    validateInput();

    alert("Wallet berhasil disimpan");

    setTimeout(() => {
        autoRefreshIfNeeded();
    }, 150);

    // stop blink
    addressInput?.classList.remove("blink");
    saveBtn?.classList.remove("blink");
}


// ==========================
// GET SELECTED WALLET (SAFE)
// ==========================
function getSelectedWallet() {

    const wallets = getWallets();

    if (!selectEl) return null;

    const index = parseInt(selectEl.value);

    // safety check
    if (isNaN(index) || !wallets[index]) return null;

    return wallets[index];
}

// ==========================
// RENAME WALLET
// ==========================
function renameWallet() {

    const wallets = getWallets();
    const index = selectEl?.value;

    if (!wallets[index]) return alert("Pilih wallet dulu");

    const newName = prompt("Nama baru:", wallets[index].name);
    if (!newName) return;

    wallets[index].name = newName;

    setWallets(wallets);
    renderWallets();

    updateActiveWalletName();

    alert("Nama wallet diubah");
}


// ==========================
// SAVE NAME EDIT
// ==========================
function saveWalletName() {

    const wallets = getWallets();
    const index = selectEl?.value;

    const newName = document
        .getElementById("editWalletName")
        ?.value?.trim();

    if (!wallets[index]) return alert("Pilih wallet dulu");
    if (!newName) return alert("Nama tidak boleh kosong");

    wallets[index].name = newName;

    setWallets(wallets);
    renderWallets();

    updateActiveWalletName();
    closeWalletSetting();

    alert("Nama disimpan");
}


// ==========================
// DELETE WALLET
// ==========================
function deleteWallet() {

    const wallets = getWallets();
    const index = parseInt(selectEl?.value);

    if (!wallets[index]) return alert("Pilih wallet dulu");

    if (!confirm("Hapus wallet ini?")) return;

    wallets.splice(index, 1);
    setWallets(wallets);
    renderWallets();

    if (wallets.length > 0) {
        selectEl.value = Math.max(0, index - 1);
        renderAssets();
        loadBalance();

        setTimeout(() => {
            autoRefreshIfNeeded();
        }, 150);

    } else {
        balanceEl.textContent = "0.00 SDA";
        document.getElementById("tab-assets").innerHTML =
            "<div style='text-align:center;color:#888;'>No wallet</div>";
    }

    alert("Wallet dihapus");
}


// ==========================
// ACTIVE NAME UI
// ==========================
function updateActiveWalletName(){

    const el = document.getElementById("activeWalletName");
    const wallet = getSelectedWallet();

    if(!el) return;

    if(wallet){
        el.textContent = wallet.name;
    }else{
        el.textContent =
            LANG?.[CURRENT_LANG]?.no_wallet || "No Wallet Selected";
    }
}

// ==========================
// WALLET MODAL
// ==========================
function openWalletSetting() {

    const wallet = getSelectedWallet();
    if (!wallet) return alert("Pilih wallet dulu");

    document.getElementById("editWalletName").value = wallet.name;
    document.getElementById("walletModal").style.display = "flex";
}

function closeWalletSetting() {
    document.getElementById("walletModal").style.display = "none";
}


// ==========================
// SHORT ADDRESS
// ==========================
function shortAddress(addr) {
    return addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "-";
}


// ==========================
// QR MODAL
// ==========================
function openQRModal() {

    const wallet = getSelectedWallet();
    if (!wallet) return alert("Pilih wallet dulu");

    document.getElementById("qrModal").style.display = "flex";

    document.getElementById("qrModalImg").src =
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
        wallet.address;

    document.getElementById("qrModalAddress").textContent =
        wallet.address;
}

function closeQRModal() {
    document.getElementById("qrModal").style.display = "none";
}


// ==========================
// COPY ADDRESS
// ==========================
function copyAddress() {

    const wallet = getSelectedWallet();
    if (!wallet) return alert("Pilih wallet dulu");

    navigator.clipboard.writeText(wallet.address)
        .then(() => alert("Copied"))
        .catch(() => alert("Gagal copy"));
}


// ==========================
// RECEIVE
// ==========================
function showReceive() {

    const wallet = getSelectedWallet();
    if (!wallet) return alert("Pilih wallet dulu");

    const modal = document.getElementById("receiveModal");
    modal.style.display = "flex";

    document.getElementById("receiveAddress").textContent = wallet.address;

    const amountInput = document.getElementById("receiveAmount");
    const qr = document.getElementById("receiveQR");
    const linkEl = document.getElementById("receiveLink");

    // reset
    amountInput.value = "";
    linkEl.value = "";
    document.getElementById("receiveResult").style.display = "none";

    // default QR (tanpa amount)
    const baseData = wallet.address;

    qr.src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" + baseData;

    // ==========================
    // AUTO UPDATE AMOUNT
    // ==========================
    amountInput.oninput = function () {

        const amount = amountInput.value.trim();

        // format link (pakai query param)
        const link = amount
            ? `${location.origin}?to=${wallet.address}&amount=${amount}`
            : `${location.origin}?to=${wallet.address}`;

        linkEl.value = link;

        document.getElementById("receiveResult").style.display = "block";

        // QR ikut berubah
        qr.src =
            "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data="
            + encodeURIComponent(link);
    };
}

function closeReceiveModal() {
    document.getElementById("receiveModal").style.display = "none";
}


// ==========================
// VALIDATION
// ==========================
function isValidAddress(addr) {
    return addr?.startsWith("0x") && addr.length >= 42;
}

function validateInput() {

    const addr = addressInput?.value?.trim();

    const valid = isValidAddress(addr);

    if (saveBtn) {
        saveBtn.disabled = !valid;

        // ==========================
        // BLINK CONTROL
        // ==========================
        if (valid) {

            // STOP BLINK INPUT
            addressInput?.classList.remove("blink");

            // START BLINK BUTTON
            saveBtn.classList.add("blink");

        } else {

            // RESET STATE
            saveBtn.classList.remove("blink");

            if (addressInput) {
                addressInput.classList.add("blink");
            }
        }
    }
}


// init validation
if (saveBtn) saveBtn.disabled = true;
if (addressInput) {
    addressInput.addEventListener("input", validateInput);
}


// ==========================
// GUIDE BLINK
// ==========================
function startGuide() {

    if (addressInput) {
        addressInput.classList.add("blink");
    }

    if (saveBtn) {
        saveBtn.classList.remove("blink");
    }
}


// ==========================
// TOAST
// ==========================
function showToast(msg) {

    const t = document.getElementById("toast");
    if (!t) return;

    t.textContent = msg;
    t.style.display = "block";

    setTimeout(() => {
        t.style.display = "none";
    }, 2000);
}