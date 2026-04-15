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

function showToast(msg, type = "success") {

    const t = document.getElementById("toast");
    if (!t) return;

    t.textContent = msg;

    // reset class
    t.classList.remove("show", "error");

    if(type === "error"){
        t.classList.add("error");
    }

    // tetap support sistem lama (display)
    t.style.display = "block";

    // trigger animasi
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

// ==========================
// CUSTOM CONFIRM SYSTEM
// ==========================
let confirmCallback = null;

function showConfirm(message, onYes) {

    const modal = document.getElementById("confirmModal");
    const msg = document.getElementById("confirmMessage");

    if (!modal || !msg) return;

    msg.textContent = message;

    confirmCallback = onYes;

    modal.style.display = "flex";
}

function confirmYes() {
    if (typeof confirmCallback === "function") {
        confirmCallback();
    }
    closeConfirmModal();
}

function closeConfirmModal() {
    document.getElementById("confirmModal").style.display = "none";
    confirmCallback = null;
}


// ==========================
// CUSTOM PROMPT (REPLACEMENT prompt())
// ==========================
function showPrompt(message, defaultValue = "", callback) {

    const modal = document.getElementById("promptModal");
    if (!modal) return;

    const input = document.getElementById("promptInput");
    const msg = document.getElementById("promptMessage");
    const okBtn = document.getElementById("promptOk");
    const cancelBtn = document.getElementById("promptCancel");

    msg.textContent = message;
    input.value = defaultValue;

    modal.style.display = "flex";

    okBtn.onclick = () => {
        modal.style.display = "none";
        callback(input.value);
    };

    cancelBtn.onclick = () => {
        modal.style.display = "none";
    };
}