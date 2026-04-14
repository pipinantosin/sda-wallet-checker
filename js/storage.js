// ==========================
// STORAGE CORE (FIXED)
// ==========================
const KEY = "sda_wallets";

// ==========================
// GET WALLET
// ==========================
function getWallets(){
    try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
        return [];
    }
}

// ==========================
// SAVE WALLET
// ==========================
function setWallets(data){
    localStorage.setItem(KEY, JSON.stringify(data));
}

// ==========================
// GET ACTIVE INDEX SAFE
// ==========================
function getActiveIndex(){
    const el = document.getElementById("walletSelect");
    if(!el) return 0;
    return parseInt(el.value || "0");
}

// ==========================
// GET SELECTED WALLET (FIX UTAMA)
// ==========================
function getSelectedWallet(){
    const wallets = getWallets();
    const i = getActiveIndex();
    return wallets[i] || null;
}

// ==========================
// RENDER WALLET DROPDOWN (FIXED TOTAL)
// ==========================
function renderWallets(){

    const select = document.getElementById("walletSelect");
    if(!select) return;

    const wallets = getWallets();

    // simpan index lama
    let currentIndex = parseInt(select.value);

    select.innerHTML = "";

    wallets.forEach((w, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = w.name || ("Wallet " + (i + 1));
        select.appendChild(opt);
    });

    // restore index (INI FIX UTAMA)
    if(wallets.length > 0){

        if(isNaN(currentIndex) || currentIndex >= wallets.length){
            currentIndex = wallets.length - 1;
        }

        select.value = String(currentIndex);

    }

    // sync UI
    if(typeof updateActiveWalletName === "function"){
        updateActiveWalletName();
    }
}