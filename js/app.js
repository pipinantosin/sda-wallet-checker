// ==========================
// SAFE GLOBAL ELEMENTS
// ==========================
const walletSelectEl = document.getElementById("walletSelect");
const tokenSelectEl  = document.getElementById("tokenSelect");


// ==========================
// WALLET SELECT EVENT (SATU SAJA - FIX DUPLIKAT)
// ==========================
if (walletSelectEl) {
    walletSelectEl.addEventListener("change", () => {

        updateActiveWalletName?.();
        updateAddressUI?.();
        renderAssets?.();
        loadBalance?.();

        setTimeout(() => {
            autoRefreshIfNeeded?.();
        }, 100);
    });
}


// ==========================
// INIT APP (URUTAN PENTING)
// ==========================
window.onload = () => {

    // ======================
    // LOAD LANGUAGE DULU (PENTING)
    // ======================
    const savedLang = localStorage.getItem("lang") || "id";
    window.CURRENT_LANG = savedLang;

    if (typeof applyLang === "function") {
        applyLang();
    }

    // ======================
    // LOAD WALLET
    // ======================
    const wallets = getWallets?.() || [];

    // render dropdown dulu
    safeCall("renderWallets");

    // set selected index
    if (walletSelectEl && wallets.length > 0) {
        walletSelectEl.value = 0;
    }

    // ======================
    // UPDATE UI WALLET (SETELAH SELECT ADA)
    // ======================
    safeCall("updateActiveWalletName");

    // ======================
    // UI LAIN
    // ======================
    safeCall("renderTokenSelect");
    safeCall("renderAssets");
    safeCall("renderTokenTab");

    // ======================
    // ICON DEFAULT
    // ======================
    setImg("tokenLogoBalance", "img/sda.png");
    setImg("tokenLogoDropdown", "img/sda.png");

    // ======================
    // TOKEN SELECT EVENT
    // ======================
    if (tokenSelectEl && typeof loadBalance === "function") {
        tokenSelectEl.addEventListener("change", loadBalance);
    }

    // ======================
    // INIT DATA
    // ======================
    if (wallets.length > 0) {

        safeCall("loadBalance");
        safeCall("refreshAll");

        setTimeout(() => {
            safeCall("loadBalance");
            safeCall("renderAssets");
        }, 300);

    } else {
        safeCall("startGuide");
    }

    // ======================
    // SET ACTIVE LANG MENU
    // ======================
    document.querySelectorAll(".lang-item").forEach(el => {
        el.classList.remove("active");
    });

    const activeItem = document.querySelector(`[data-lang-select="${savedLang}"]`);
    if (activeItem) {
        activeItem.classList.add("active");
    }

    // ======================
    // SPLASH SCREEN
    // ======================
    setTimeout(() => {

        const splash = document.getElementById("splash");
        if (!splash) return;

        splash.style.opacity = "0";
        splash.style.transition = "0.5s";

        setTimeout(() => {
            splash.style.display = "none";
        }, 500);

    }, 1500);
};


// ==========================
// GLOBAL MODAL CLOSE
// ==========================
window.onclick = function (e) {
    document.querySelectorAll(".modal").forEach(modal => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
};


// ==========================
// SAFE HELPERS
// ==========================
function safeCall(fnName) {
    if (typeof window[fnName] === "function") {
        window[fnName]();
    }
}

function setImg(id, src) {
    const el = document.getElementById(id);
    if (el) el.src = src;
}


// ==========================
// TOKEN SYNC
// ==========================
function syncCustomTokens() {
    try {
        window.customTokens =
            JSON.parse(localStorage.getItem("customTokens")) || [];
    } catch {
        window.customTokens = [];
    }
}

function syncTokenState() {
    window.customTokens =
        JSON.parse(localStorage.getItem("customTokens") || "[]");
}


// ==========================
// REMOVE TOKEN (SAFE FALLBACK)
// ==========================
window.removeToken = function(address) {

    if (typeof window.__removeToken === "function") {
        window.__removeToken(address);
        return;
    }

    let customTokens = JSON.parse(localStorage.getItem("customTokens") || "[]");

    customTokens = customTokens.filter(
        t => t.address.toLowerCase() !== address.toLowerCase()
    );

    localStorage.setItem("customTokens", JSON.stringify(customTokens));

    renderAssets?.();
    renderTokenTab?.();
    renderTokenSelect?.();
};


// ==========================
// MENU LANGUAGE
// ==========================
function toggleMenu() {
    const el = document.getElementById("menuDropdown");
    if (!el) return;

    el.style.display =
        (el.style.display === "block") ? "none" : "block";
}

// klik luar tutup menu
window.addEventListener("click", function (e) {
    const menu = document.getElementById("menuDropdown");

    if (!e.target.closest(".menu-wrapper")) {
        if (menu) menu.style.display = "none";
    }
});