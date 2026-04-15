let LANG = {};
let CURRENT_LANG = localStorage.getItem("lang") || "id";

// load json
async function loadLang(){
    const res = await fetch("data/lang.json");
    LANG = await res.json();
    applyLang();
}

// apply ke UI
function applyLang(){

    const langData = LANG[CURRENT_LANG];
    if(!langData) return;

    // ======================
    // TEXT
    // ======================
    document.querySelectorAll("[data-lang]").forEach(el => {

        //  skip dynamic element
        if (el.id === "activeWalletName") return;

        const key = el.getAttribute("data-lang");

        if(langData[key]){
            el.textContent = langData[key];
        }

    });

    // ======================
    // PLACEHOLDER
    // ======================
    document.querySelectorAll("[data-lang-placeholder]").forEach(el => {

        const key = el.getAttribute("data-lang-placeholder");

        if(langData[key]){
            el.placeholder = langData[key];
        }

    });

}

// ganti bahasa
function setLanguage(lang){

    CURRENT_LANG = lang;
    localStorage.setItem("lang", lang);

    // apply text static
    applyLang();

    // ==========================
    // FIX: RE-RENDER UI DINAMIS
    // ==========================
    renderAssets?.();
    renderTokenTab?.();
    renderLP?.();

    // update nama wallet biar ga ke overwrite
    updateActiveWalletName?.();

    // ==========================
    // UPDATE ACTIVE MENU
    // ==========================
    document.querySelectorAll(".lang-item").forEach(el => {
        el.classList.remove("active");
    });

    const activeItem = document.querySelector(`[data-lang-select="${lang}"]`);
    if(activeItem){
        activeItem.classList.add("active");
    }

    // ==========================
    // TOAST
    // ==========================
    showToast(
        lang === "id"
        ? "Bahasa diubah"
        : "Language changed"
    );

    // ==========================
    // TUTUP MENU
    // ==========================
    const menu = document.getElementById("menuDropdown");
    if(menu){
        menu.style.display = "none";
    }
}