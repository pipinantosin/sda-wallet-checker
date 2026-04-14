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

    const dict = LANG[CURRENT_LANG];
    if(!dict) return;

    // text
    document.querySelectorAll("[data-lang]").forEach(el=>{
        const key = el.getAttribute("data-lang");
        if(dict[key]) el.innerText = dict[key];
    });

    // placeholder
    document.querySelectorAll("[data-lang-placeholder]").forEach(el=>{
        const key = el.getAttribute("data-lang-placeholder");
        if(dict[key]) el.placeholder = dict[key];
    });
}

// ganti bahasa
function setLanguage(lang){

    CURRENT_LANG = lang;
    localStorage.setItem("lang", lang);

    applyLang();

    updateActiveWalletName?.();
    renderAssets?.();
    loadBalance?.();

    // 🔥 SET ACTIVE MENU
    document.querySelectorAll(".lang-item").forEach(el => {
        el.classList.remove("active");
    });

    const activeItem = document.querySelector(`.lang-item[onclick="setLanguage('${lang}')"]`);
    if(activeItem){
        activeItem.classList.add("active");
    }

    // tutup menu
    const menu = document.getElementById("menuDropdown");
    if(menu) menu.style.display = "none";

    showToast?.(
        lang === "id"
            ? "Bahasa diubah ke Indonesia"
            : "Language changed to English"
    );
}

// set active language saat load
const savedLang = localStorage.getItem("lang") || "id";

document.querySelectorAll(".lang-item").forEach(el => {
    el.classList.remove("active");
});

const activeItem = document.querySelector(`.lang-item[onclick="setLanguage('${savedLang}')"]`);
if(activeItem){
    activeItem.classList.add("active");
}