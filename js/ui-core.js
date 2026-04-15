// ==========================
// UI CORE (GLOBAL ELEMENTS)
// ==========================
window.balanceEl = document.getElementById("balance");
window.selectEl = document.getElementById("walletSelect");

window.addressInput = document.getElementById("address");
window.saveBtn = document.querySelector("button[onclick='saveWallet()']");

window.tokenLogoBalance = document.getElementById("tokenLogoBalance");
window.tokenLogoDropdown = document.getElementById("tokenLogoDropdown");

window.selectedToken = "native"; // default SDA


// ==========================
// TOAST SYSTEM
// ==========================
function showToast(msg, type = "success") {

    const t = document.getElementById("toast");
    if (!t) return;

    t.textContent = msg;

    t.classList.remove("show", "error");

    if (type === "error") {
        t.classList.add("error");
    }

    t.style.display = "block";

    setTimeout(() => {
        t.classList.add("show");
    }, 10);

    setTimeout(() => {
        t.classList.remove("show");

        setTimeout(() => {
            t.style.display = "none";
        }, 300);

    }, 2000);
}


// expose global
window.showToast = showToast;


// ==========================
// CUSTOM CONFIRM SYSTEM (FIXED SAFE VERSION)
// ==========================
let confirmCallback = null;

function showConfirm(message, onYes) {

    const modal = document.getElementById("confirmModal");
    const msg = document.getElementById("confirmMessage");

    if (!modal || !msg) return;

    msg.textContent = message || "Confirm?";

    confirmCallback = typeof onYes === "function" ? onYes : null;

    modal.style.display = "flex";
}

function confirmYes() {

    try {
        if (typeof confirmCallback === "function") {
            confirmCallback();
        }
    } catch (e) {
        console.error("Confirm callback error:", e);
    }

    closeConfirmModal();
}

function closeConfirmModal() {

    const modal = document.getElementById("confirmModal");

    if (modal) {
        modal.style.display = "none";
    }

    confirmCallback = null;
}


// expose global (IMPORTANT FIX FOR tokens.js / wallet.js)
window.showConfirm = showConfirm;
window.confirmYes = confirmYes;
window.closeConfirmModal = closeConfirmModal;


// ==========================
// CUSTOM PROMPT (SAFE)
// ==========================
function showPrompt(message, defaultValue = "", callback) {

    const modal = document.getElementById("promptModal");
    if (!modal) return;

    const input = document.getElementById("promptInput");
    const msg = document.getElementById("promptMessage");
    const okBtn = document.getElementById("promptOk");
    const cancelBtn = document.getElementById("promptCancel");

    if (!input || !msg || !okBtn || !cancelBtn) return;

    msg.textContent = message || "";
    input.value = defaultValue || "";

    modal.style.display = "flex";

    okBtn.onclick = () => {
        modal.style.display = "none";
        if (typeof callback === "function") {
            callback(input.value);
        }
    };

    cancelBtn.onclick = () => {
        modal.style.display = "none";
    };
}


