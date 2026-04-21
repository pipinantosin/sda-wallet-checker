// ==========================
// ELEMENT SAFE INIT
// ==========================
const balanceEl = document.getElementById("balance");
const addressInput = document.getElementById("address");
const saveBtn = document.querySelector("button[onclick='saveWallet()']");
let blinkState = false;



// ==========================
// SAVE WALLET (FINAL FIX - PK UPGRADE + SAFE UI)
// ==========================
function saveWallet() {

    const isPKWallet = !!window.pkWallet;

    let addr = addressInput?.value?.trim().toLowerCase();
    const nameInput = document.getElementById("walletName");
    const name = nameInput?.value?.trim();

    // ==========================
    // VALIDATION
    // ==========================
    if (!addr) {
        return showToast(
            LANG?.[CURRENT_LANG]?.enter_address || "Enter address"
        );
    }

    if (!addr.startsWith("0x") || addr.length < 42) {
        return showToast(
            LANG?.[CURRENT_LANG]?.invalid_address || "Format address tidak valid",
            "error"
        );
    }

    const wallets = getWallets();

    const exist = wallets.find(
        w => w.address.toLowerCase() === addr
    );

    // ==========================
    // 🔥 RULE HANDLING (FIX UTAMA)
    // ==========================
    if (exist) {

        // ❌ PK sudah ada → block
        if (exist.type === "pk" && isPKWallet) {
            return showToast(
                LANG?.[CURRENT_LANG]?.wallet_exists || "Wallet PK sudah ada",
                "error"
            );
        }

        // 🔥 UPGRADE WATCH → PK
        if (exist.type === "watch" && isPKWallet) {

            exist.type = "pk";
            exist.privateKey = window.pkWallet.privateKey;

            if (name) {
                exist.name = name;
            }

            setWallets(wallets);

            renderWallets();

            const index = wallets.findIndex(
                w => w.address.toLowerCase() === addr
            );

            if (selectEl && index !== -1) {
                selectEl.value = String(index);
            }

            updateActiveWalletName();
            updateAddressUI?.();
            renderAssets();
            loadBalance();

            // reset input (tidak ganggu tombol logic)
            if (addressInput) addressInput.value = "";
            if (nameInput) nameInput.value = "";

            validateInput();

            showToast("Wallet di-upgrade ke PK", "success");

            return;
        }

        // ❌ watch + watch → block
        if (!isPKWallet) {
            return showToast(
                LANG?.[CURRENT_LANG]?.wallet_exists || "Wallet sudah tersimpan",
                "error"
            );
        }
    }

    // ==========================
    // ✅ CREATE NEW WALLET
    // ==========================
    const newWallet = {
        address: addr,
        name: name || "Wallet",
        type: isPKWallet ? "pk" : "watch",
        ...(isPKWallet && { privateKey: window.pkWallet.privateKey })
    };

    wallets.push(newWallet);
    setWallets(wallets);

    // ==========================
    // RENDER + SELECT
    // ==========================
    renderWallets();

    const newIndex = String(wallets.length - 1);
    if (selectEl) {
        selectEl.value = newIndex;
    }

    // ==========================
    // SYNC UI
    // ==========================
    updateActiveWalletName();
    updateAddressUI?.();
    renderAssets();
    loadBalance();

    // ==========================
    // RESET INPUT (TIDAK MERUSAK VALIDATION)
    // ==========================
    if (addressInput) addressInput.value = "";
    if (nameInput) nameInput.value = "";

    validateInput();

    showToast(
        LANG?.[CURRENT_LANG]?.wallet_saved || "Wallet berhasil disimpan",
        "success"
    );

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
// RENAME WALLET (LANG SUPPORT + TOAST)
// ==========================
function renameWallet() {

    const wallets = getWallets();
    const index = selectEl?.value;

    // ==========================
    // NO WALLET SELECTED
    // ==========================
    if (!wallets[index]) {
        return showToast(
            LANG?.[CURRENT_LANG]?.select_wallet_error || "Pilih wallet dulu",
            "error"
        );
    }

    // ==========================
    // INPUT NEW NAME (still prompt browser)
    // ==========================
    showPrompt(
    LANG?.[CURRENT_LANG]?.enter_new_name || "Nama baru:",
    wallets[index].name,
    function (newName) {

        if (!newName || !newName.trim()) return;

        wallets[index].name = newName.trim();

        setWallets(wallets);
        renderWallets();

        updateActiveWalletName?.();

        showToast(
            LANG?.[CURRENT_LANG]?.wallet_renamed || "Nama wallet diubah",
            "success"
        );
    }
);

    if (!newName || !newName.trim()) return;

    wallets[index].name = newName.trim();

    setWallets(wallets);
    renderWallets();

    updateActiveWalletName?.();

    showToast(
        LANG?.[CURRENT_LANG]?.wallet_renamed || "Nama wallet diubah",
        "success"
    );
}


// ==========================
// SAVE NAME EDIT (LANG + TOAST)
// ==========================
function saveWalletName() {

    const wallets = getWallets();
    const index = selectEl?.value;

    const newName = document
        .getElementById("editWalletName")
        ?.value?.trim();

    // ==========================
    // NO WALLET SELECTED
    // ==========================
    if (!wallets[index]) {
        return showToast(
            LANG?.[CURRENT_LANG]?.select_wallet_error || "Pilih wallet dulu",
            "error"
        );
    }

    // ==========================
    // EMPTY NAME
    // ==========================
    if (!newName) {
        return showToast(
            LANG?.[CURRENT_LANG]?.wallet_name_empty || "Nama tidak boleh kosong",
            "error"
        );
    }

    // ==========================
    // SAVE
    // ==========================
    wallets[index].name = newName;

    setWallets(wallets);
    renderWallets();

    updateActiveWalletName?.();
    closeWalletSetting?.();

    showToast(
        LANG?.[CURRENT_LANG]?.wallet_saved_name || "Nama disimpan",
        "success"
    );
}
// ==========================
// DELETE WALLET (CUSTOM MODAL CONFIRM + FULL SAFE)
// ==========================
function deleteWallet() {

    const wallets = getWallets();
    const index = parseInt(selectEl?.value);

    // ==========================
    // NO WALLET SELECTED
    // ==========================
    if (!wallets[index]) {
        showToast(
            LANG?.[CURRENT_LANG]?.select_wallet_error || "Pilih wallet dulu",
            "error"
        );
        return;
    }

    // ==========================
    // CUSTOM CONFIRM MODAL (NO BROWSER CONFIRM)
    // ==========================
    showConfirm(
        LANG?.[CURRENT_LANG]?.delete_wallet_confirm || "Hapus wallet ini?",
        function () {

            // ==========================
            // REMOVE WALLET
            // ==========================
            wallets.splice(index, 1);
            setWallets(wallets);
            renderWallets();

            // ==========================
            // CLOSE ALL RELATED MODALS
            // ==========================
            closeWalletSetting?.();
            closeQRModal?.();
            closeReceiveModal?.();

            // ==========================
            // IF STILL HAS WALLET
            // ==========================
            if (wallets.length > 0) {

                const newIndex = Math.max(0, index - 1);
                selectEl.value = String(newIndex);

                updateActiveWalletName?.();
                updateAddressUI?.();
                renderAssets();
                loadBalance();

                setTimeout(() => {
                    autoRefreshIfNeeded?.();
                }, 150);

            } else {

                // ==========================
                // RESET UI FULL STATE
                // ==========================
                if (balanceEl) balanceEl.textContent = "0.00 SDA";

                const tabAssets = document.getElementById("tab-assets");
                if (tabAssets) {
                    tabAssets.innerHTML =
                        "<div style='text-align:center;color:#888;'>No wallet</div>";
                }

                const activeName = document.getElementById("activeWalletName");
                if (activeName) {
                    activeName.textContent =
                        LANG?.[CURRENT_LANG]?.no_wallet || "No Wallet Selected";
                }

                // restart guide
                startGuide?.();
            }

            // ==========================
            // SUCCESS TOAST
            // ==========================
            showToast(
                LANG?.[CURRENT_LANG]?.wallet_deleted || "Wallet dihapus",
                "success"
            );
        }
    );
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
    if (!wallet) return showToast("Pilih wallet dulu");

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
    if (!wallet) return showToast("Pilih wallet dulu");

    const modal = document.getElementById("qrModal");

    // pakai class system (WAJIB)
    modal.classList.add("show");

    document.getElementById("qrModalImg").src =
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
        encodeURIComponent(wallet.address);

    document.getElementById("qrModalAddress").textContent =
        wallet.address;
}

function closeQRModal() {
    const modal = document.getElementById("qrModal");
    if (!modal) return;

    modal.classList.remove("show");
}


// ==========================
// COPY ADDRESS
// ==========================
function copyAddress() {

    const wallet = getSelectedWallet();
    if (!wallet) return showToast("Pilih wallet dulu");

    navigator.clipboard.writeText(wallet.address)
        .then(() => showToast("Copied"))
        .catch(() => showToast("Gagal copy"));
}


// ==========================
// RECEIVE
// ==========================
function showReceive() {

    const wallet = getSelectedWallet();
    if (!wallet) return showToast("Pilih wallet dulu");

    const modal = document.getElementById("receiveModal");
    modal.style.display = "flex";

    document.getElementById("receiveAddress").textContent = wallet.address;

    const amountInput = document.getElementById("receiveAmountQR");
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


function setSelectedWallet(address){

    const wallets = getWallets?.() || [];

    const index = wallets.findIndex(
        w => w.address.toLowerCase() === address.toLowerCase()
    );

    if(index !== -1){
        localStorage.setItem("selectedWalletIndex", index);

        const select = document.getElementById("walletSelect");
        if(select){
            select.value = index;
        }
    }
}

function renderSavedAddresses(){

    const sel = document.getElementById("savedAddressSelect");
    if (!sel) return;

    const wallets = getWallets?.() || [];
    const active = getSelectedWallet?.();

    if (wallets.length === 0) {
        sel.innerHTML = `<option value="">No saved address</option>`;
        return;
    }

    sel.innerHTML = `<option value="">Pilih address</option>`;

    wallets.forEach((w, i) => {

        const opt = document.createElement("option");

        // icon type wallet
        const icon = w.type === "pk" ? "🔑" : "👁";

        // short address
        const short = w.address.slice(0,6) + "..." + w.address.slice(-4);

        // active mark
        const isActive =
            active?.address?.toLowerCase() === w.address.toLowerCase();

        const activeMark = isActive ? " (Active)" : "";

        opt.value = w.address;

        opt.textContent =
            `${icon} ${w.name || ("Wallet " + (i + 1))} • ${short}${activeMark}`;

        if (isActive) opt.selected = true;

        sel.appendChild(opt);
    });

    sel.onchange = () => {

    const input = document.getElementById("toSend");

    if (input && sel.value) {
        input.value = sel.value;
    }

    // 🔥 FIX: refresh balance + UI send modal
    if (typeof loadBalance === "function") {
        loadBalance();
    }

    if (typeof updateSendBalance === "function") {
        updateSendBalance(sel.value);
    }

    if (typeof renderAssets === "function") {
        renderAssets();
    }
};
}