// ==========================
// SWAP EXTRA (FIX FINAL)
// ==========================
document.addEventListener("DOMContentLoaded", () => {

    const rateEl = document.getElementById("swapRate");
    const slipEl = document.getElementById("slippageVal");
    const payInput = document.getElementById("payAmount");
    const modal = document.getElementById("swapModal");

    if(!rateEl || !slipEl) return;

    // ==========================
    // SLIPPAGE
    // ==========================
    const SLIPPAGE_LIST = [0.1, 0.5, 1, 3];
    let slippageIndex = 1;

    function updateSlippageUI(){
        slipEl.innerText = SLIPPAGE_LIST[slippageIndex] + "%";
    }

    slipEl.addEventListener("click", () => {
        slippageIndex = (slippageIndex + 1) % SLIPPAGE_LIST.length;
        updateSlippageUI();
    });

    updateSlippageUI();

    // ==========================
    // GET SYMBOL
    // ==========================
    function getSymbol(addr){
        if(!addr || addr === "native") return "SDA";

        const t = (window.TOKENS || []).find(x => x.address === addr);
        if(!t) return "???";

        return t.symbol === "WSDA" ? "SDA" : t.symbol;
    }

    // ==========================
    // UPDATE RATE
    // ==========================
    async function updateRate(){

    if(!window.swapState) return;

    const tokenIn  = swapState.payToken;
    const tokenOut = swapState.receiveToken;

    const symIn  = getSymbol(tokenIn);
    const symOut = getSymbol(tokenOut);

    rateEl.innerText = `1 ${symIn} ≈ loading ${symOut}`;

    // 🔥 tunggu engine ready
    if(window.FACTORY_ENGINE?.init){
        await window.FACTORY_ENGINE.init();
    }

    try{
        function normalize(addr){
    if(!addr || addr === "native"){
        return window.CONFIG?.WSDA; // 🔥 convert ke WSDA
    }
    return addr;
}

const quote = window.FACTORY_ENGINE.getQuote(
    normalize(tokenIn),
    normalize(tokenOut),
    1
);

        if(quote && isFinite(quote)){
            rateEl.innerText =
                `1 ${symIn} ≈ ${Number(quote).toFixed(6)} ${symOut}`;
        }else{
            rateEl.innerText = `1 ${symIn} ≈ 0 ${symOut}`;
        }

    }catch(e){
        console.warn("Rate error:", e);
        rateEl.innerText = `1 ${symIn} ≈ 0 ${symOut}`;
        console.log("IN:", tokenIn);
console.log("OUT:", tokenOut);
console.log("PRICE IN:", window.FACTORY_ENGINE.getPrice(normalize(tokenIn)));
console.log("PRICE OUT:", window.FACTORY_ENGINE.getPrice(normalize(tokenOut)));
    }
}

    // ==========================
    // 🔥 TRIGGER FIX UTAMA
    // ==========================

    // 1. Saat modal dibuka
    const observer = new MutationObserver(() => {
        if(modal?.classList.contains("show")){
            setTimeout(updateRate, 200);
        }
    });

    if(modal){
        observer.observe(modal, { attributes: true });
    }

    // 2. Saat input berubah
    payInput?.addEventListener("input", updateRate);

    // 3. Hook ke swap existing
    const oldUpdateEstimate = window.updateReceiveEstimate;
    window.updateReceiveEstimate = async function(...args){
        if(oldUpdateEstimate){
            await oldUpdateEstimate.apply(this, args);
        }
        updateRate();
    };

    const oldUpdateTokenUI = window.updateTokenUI;
    window.updateTokenUI = function(...args){
        if(oldUpdateTokenUI){
            oldUpdateTokenUI.apply(this, args);
        }
        updateRate();
    };

    // 4. 🔥 FORCE RUN (biar ga kosong)
    setTimeout(updateRate, 500);
});