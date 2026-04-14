// ==========================
// SAFE GLOBAL ELEMENTS
// ==========================
const walletSelectEl = document.getElementById("walletSelect");
const tokenSelectEl  = document.getElementById("tokenSelect");

// ==========================
// WALLET SELECT EVENT
// ==========================
if (walletSelectEl) {
    walletSelectEl.addEventListener("change", () => {

        if (typeof updateActiveWalletName === "function") {
            updateActiveWalletName();
        }

        if (typeof renderAssets === "function") {
            renderAssets();
        }

        if (typeof loadBalance === "function") {
            loadBalance();
        }

        setTimeout(() => {
            if (typeof autoRefreshIfNeeded === "function") {
                autoRefreshIfNeeded();
            }
        }, 100);
    });
}


// ==========================
// INIT APP (SAFE BOOT)
// ==========================
window.onload = () => {

    // ======================
    // UI INIT (SAFE CALL)
    // ======================
    safeCall("renderWallets");
    safeCall("renderTokenSelect");
    safeCall("renderAssets");
    safeCall("renderTokenTab");
    safeCall("updateActiveWalletName");

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
    // GET WALLET
    // ======================
    const wallets = (typeof getWallets === "function") ? getWallets() : [];

    // default select
    if (walletSelectEl && wallets.length > 0) {
        walletSelectEl.value = 0;
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

function syncCustomTokens() {
    try {
        window.customTokens =
            JSON.parse(localStorage.getItem("customTokens")) || [];
    } catch {
        window.customTokens = [];
    }
}

window.removeToken = function(address) {

    // panggil fungsi asli kalau ada
    if (typeof window.__removeToken === "function") {
        window.__removeToken(address);
    } else {
        console.warn("removeToken asli tidak ditemukan, fallback jalan");

        // fallback manual sync localStorage
        let customTokens = JSON.parse(localStorage.getItem("customTokens") || "[]");

        customTokens = customTokens.filter(
            t => t.address.toLowerCase() !== address.toLowerCase()
        );

        localStorage.setItem("customTokens", JSON.stringify(customTokens));

        // refresh UI
        if (typeof renderAssets === "function") renderAssets();
        if (typeof renderTokenTab === "function") renderTokenTab();
        if (typeof renderTokenSelect === "function") renderTokenSelect();
    }
};


function syncTokenState() {
    window.customTokens =
        JSON.parse(localStorage.getItem("customTokens") || "[]");
}


function toggleMenu() {
    const el = document.getElementById("menuDropdown");
    if (!el) return;

    el.style.display = (el.style.display === "block") ? "none" : "block";
}

// close kalau klik luar
window.addEventListener("click", function (e) {
    const menu = document.getElementById("menuDropdown");

    if (!e.target.closest(".menu-wrapper")) {
        if (menu) menu.style.display = "none";
    }
});


const selectEl = document.getElementById("walletSelect");

if(selectEl){
    selectEl.addEventListener("change", () => {

        updateActiveWalletName();
        updateAddressUI?.();
        renderAssets();
        loadBalance();

    });
}