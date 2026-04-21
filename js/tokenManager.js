/**
 * ==========================================
 * SIDRAPULSE - TOKEN MANAGER (STABLE CORE)
 * ==========================================
 * - Load tokens.json
 * - Custom token support
 * - Dropdown engine ready
 * - FIX ICON SYSTEM (anti hilang)
 * ==========================================
 */

let DEFAULT_TOKENS = [];
let customTokens = JSON.parse(localStorage.getItem("customTokens") || "[]");

window.TOKENS = [];

// ======================================================
// 🔧 NORMALIZER (FIXED ICON CONSISTENT)
// ======================================================
function normalizeToken(t){

    return {
        symbol: t.symbol,
        name: t.name || t.symbol,

        // 🔥 SATUKAN
        address: t.address,

        // 🔥 FIX ICON (support lama + baru)
        logo: t.logo || ("img/" + (t.icon || "default.png")),

        decimals: t.decimals || 18,
        type: t.type || "erc20",

        // 🔥 FLAG BIAR BISA FILTER
        isNative: t.address === "native"
    };
}

// ======================================================
// 📦 LOAD TOKENS.JSON
// ======================================================
async function loadDefaultTokens(){

    try {
        const res = await fetch("./data/tokens.json");
        const raw = await res.json();

        DEFAULT_TOKENS = raw.map(normalizeToken);

        rebuildTokens();

    } catch (e) {
        console.error("Failed load tokens.json", e);
    }
}

// ======================================================
// 🔄 REBUILD GLOBAL TOKENS
// ======================================================
function rebuildTokens(){

    window.TOKENS = [
        ...DEFAULT_TOKENS,
        ...customTokens.map(normalizeToken)
    ];
}

// ======================================================
// 📦 GET ALL TOKENS
// ======================================================
function getAllTokens(){
    return window.TOKENS || [];
}

// ======================================================
// 🔥 FILTER TOKENS BY FEATURE
// ======================================================
function getHomeTokens(){
    return getAllTokens();
}

function getSendTokens(){
    return getAllTokens();
}

function getSwapTokens(){
    // ❗ WSDA SKIP ONLY HERE
    return getAllTokens().filter(t => t.symbol !== "WSDA");
}

// ======================================================
// 🖼️ SAFE ICON RESOLVER
// ======================================================
function getTokenIcon(t){
    return t?.icon || "img/default.png";
}



// ======================================================
// 🚀 INIT CORE
// ======================================================
document.addEventListener("DOMContentLoaded", async () => {

    await loadDefaultTokens();
    renderTokenList();
});


// ======================================================
// 🚀 INIT UI BINDING
// ======================================================
document.addEventListener("DOMContentLoaded", async () => {

    await loadDefaultTokens();

    renderTokenSelect?.();
    renderTokenTab?.();
    loadSendTokens?.();
});


// ======================================================
// 🧩 ENGINE COMPATIBILITY
// ======================================================
window.tokenmanager = {
    loadDefaultTokens,
    rebuildTokens,
    getAllTokens,
    getHomeTokens,
    getSendTokens,
    getSwapTokens,
    getTokenIcon
};

window.SIDRAPULSE = window.tokenmanager;