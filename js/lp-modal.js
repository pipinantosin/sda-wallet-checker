// ==========================
// GLOBAL STATE
// ==========================
window.lpState = {
    token0: "native",   // SDA
    token1: null,
    fee: 3000,
    slippage: 0.5,
    fullRange: true
};

lpState.priceMode = "auto"; // auto | manual
lpState.manualPrice = null;
// ==========================
// OPEN / CLOSE
// ==========================
function openLPModal(){
    const modal = document.getElementById("lpModal");
    if(!modal) return;

    modal.classList.add("show");
    initLP();
}

function closeLPModal(){
    document.getElementById("lpModal")?.classList.remove("show");
}

// ==========================
// INIT
// ==========================
function initLP(){

    lpState.token0 = "native";
    lpState.token1 = null;

    const symbolEl = document.getElementById("lpToken1Symbol");
    const iconBox  = document.getElementById("lpToken1IconBox");

    if (symbolEl) symbolEl.innerText = "Select token";

    if (iconBox) {
        iconBox.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i>`;
    }

    updateLPUI();
}


function updatePairUI(){
    const el = document.getElementById("lpPairInfo");
    if(!el) return;

    const a = getLPToken(lpState.token0).symbol;
    const b = getLPToken(lpState.token1).symbol;

    el.innerText = `${a} / ${b}`;
}
// ==========================
// TOKEN DATA
// ==========================
function getLPToken(addr){

    if(!addr || addr === "native"){
        return {
            symbol: "SDA",
            logo: "img/sda.png"
        };
    }

    const t = (window.TOKENS || []).find(x => x.address === addr);

    return {
        symbol: t?.symbol || "???",
        logo: t?.logo || "img/default.png"
    };
}

// ==========================
// UPDATE UI
// ==========================
async function updateLPUI(){

    // ==========================
    // TOKEN A (FIX)
    // ==========================
    const t0 = getLPToken(lpState.token0);

    const el0Symbol = document.querySelector("#lpToken0Select span");
    const el0Icon   = document.querySelector("#lpToken0Select img");

    if(el0Symbol) el0Symbol.innerText = t0.symbol;
    if(el0Icon)   el0Icon.src = t0.logo;


    // ==========================
    // TOKEN B
    // ==========================
    const symbolEl = document.getElementById("lpToken1Symbol");
    const iconBox  = document.getElementById("lpToken1IconBox");

    if(symbolEl && iconBox){

        if(!lpState.token1){
            symbolEl.innerText = "Select token";
            iconBox.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i>`;
        }else{
            const t = getLPToken(lpState.token1);

            symbolEl.innerText = t.symbol;
            iconBox.innerHTML = `<img src="${t.logo}">`;
        }
    }

    await updateLPBalance();
await updateLPPrice(); //  TAMBAH INI
}



async function syncPoolData(){

    try{

        if(!lpState.token1 || !window.LP_FACTORY){
            return;
        }

        const token0 =
            lpState.token0 === "native"
                ? window.CONFIG.WSDA
                : lpState.token0;

        const token1 = lpState.token1;

        const statusEl  = document.getElementById("lpPoolStatus");
        const manualBox = document.getElementById("lpManualPriceBox");
        const rangeBox  = document.getElementById("lpCustomRange");

        // ==========================
        // GET PRICE
        // ==========================
        const price = await LP_FACTORY.getCurrentPrice(
            token0,
            token1,
            lpState.fee
        );

        const isNumber = typeof price === "number" && isFinite(price) && price > 0;
        const isNotInit = price === "NOT_INITIALIZED";
        const isNoPool = price === null || price === undefined;

        // ==========================
        // POOL NOT ACTIVE
        // ==========================
        if(isNoPool || isNotInit || !isNumber){

            lpState.priceMode = "manual";

            if(statusEl){
                statusEl.innerText = "Pool belum aktif  set harga manual";
            }

            if(manualBox){
                manualBox.style.display = "block";
            }

            setLPPriceUI(0);
            updatePairUI();

            // clear auto amount
            const inputB = document.getElementById("lpAmount1");
            if(inputB) inputB.value = "";

            return;
        }

        // ==========================
        // POOL ACTIVE (AUTO MODE)
        // ==========================
        lpState.priceMode = "auto";

        if(statusEl){
            statusEl.innerText = "Pool aktif  auto price";
        }

        if(manualBox){
            manualBox.style.display = "none";
        }

        updatePairUI();
        setLPPriceUI(price);

        // ==========================
        // AMOUNT AUTO SYNC
        // ==========================
        const inputA = document.getElementById("lpAmount0");
        const inputB = document.getElementById("lpAmount1");

        if(inputA && inputB){

            inputA.oninput = () => {

                const val = parseFloat(inputA.value || 0);

                if(!val || !isFinite(val)){
                    inputB.value = "";
                    return;
                }

                inputB.value = (val * price).toFixed(6);
            };
        }

        // ==========================
        // RANGE LOGIC FIX (INI YANG KAMU MAU)
        // ==========================
        const minEl = document.getElementById("lpMinPrice");
        const maxEl = document.getElementById("lpMaxPrice");

        if(rangeBox){
            rangeBox.style.display = lpState.fullRange ? "none" : "block";
        }

        //  FULL RANGE = IGNORE CUSTOM
        if(lpState.fullRange){

            if(minEl && maxEl){
                minEl.value = "";
                maxEl.value = "";
            }

        } 
        //  CUSTOM RANGE = AUTO FILL FIRST TIME ONLY
        else {

            if(minEl && maxEl){

                const hasUserInput =
                    minEl.dataset.locked === "1" ||
                    maxEl.dataset.locked === "1";

                // hanya auto isi kalau belum pernah user edit
                if(!hasUserInput){

                    const min = price * 0.95;
                    const max = price * 1.05;

                    minEl.value = min.toFixed(6);
                    maxEl.value = max.toFixed(6);

                    // lock supaya tidak overwrite lagi
                    minEl.dataset.locked = "1";
                    maxEl.dataset.locked = "1";
                }
            }
        }

    }catch(err){
        console.warn("syncPoolData error:", err);
    }
}


function fillAutoRange(price){

    if(!price) return;

    const minEl = document.getElementById("lpMinPrice");
    const maxEl = document.getElementById("lpMaxPrice");

    if(!minEl || !maxEl) return;

    const min = price * 0.95;
    const max = price * 1.05;

    minEl.value = min.toFixed(6);
    maxEl.value = max.toFixed(6);
}


async function syncAmountFromPrice(price){

    const inputA = document.getElementById("lpAmount0");
    const inputB = document.getElementById("lpAmount1");

    if(!inputA || !inputB) return;

    const valA = parseFloat(inputA.value || 0);

    if(!valA || !price){
        inputB.value = "";
        return;
    }

    inputB.value = (valA * price).toFixed(6);
}
// ==========================
// BALANCE
// ==========================
async function updateLPBalance(){

    const w = getSelectedWallet?.();
    if(!w) return;

    const el0 = document.getElementById("lpBalance0");
    const el1 = document.getElementById("lpBalance1");

    try{

        // ==========================
        // TOKEN A (SDA)
        // ==========================
        const b0Raw = await getTokenBalance(w.address, "native");
        const b0 = parseFloat(b0Raw || 0);

        if(el0){
            el0.innerHTML = `
                ${b0.toFixed(4)} SDA 
                <span class="max" id="lpMax0">MAX</span>
            `;
        }

        // 🔥 FIX MAX BUTTON (NO DUPLICATE EVENT)
        const maxBtn = document.getElementById("lpMax0");
        if(maxBtn){

            // clone biar event lama kehapus (anti double click bug)
            const newBtn = maxBtn.cloneNode(true);
            maxBtn.replaceWith(newBtn);

            newBtn.addEventListener("click", ()=>{

                const input = document.getElementById("lpAmount0");
                if(input){
                    input.value = b0 > 0 ? b0.toFixed(6) : "";
                }
            });
        }


        // ==========================
        // TOKEN B
        // ==========================
        if(!lpState.token1){

            if(el1){
                el1.innerText = "0.00";
            }

            return;
        }

        const b1Raw = await getTokenBalance(w.address, lpState.token1);
        const b1 = parseFloat(b1Raw || 0);

        if(el1){
            el1.innerText = b1.toFixed(4);
        }

    }catch(err){
        console.error("LP Balance Error:", err);

        if(el0) el0.innerText = "0.00 SDA";
        if(el1) el1.innerText = "0.00";
    }
}

// ==========================
// TOKEN SELECTOR (FIX)
// ==========================
function openLPSelector(type){

    document.getElementById("tokenPopup")?.remove();

    const tokens = window.TOKENS || [];

    let html = `
        <div class="popup-bg"></div>
        <div class="popup">
            <div id="tokenList">
    `;

    // SDA hanya muncul kalau pilih token0
    if(type === "token0"){
        html += `
            <div class="token-item" data-address="native">
                <img src="img/sda.png">
                <span>SDA</span>
            </div>
        `;
    }

    tokens.forEach(t => {

        if(t.address === window.CONFIG.WSDA) return;

        html += `
            <div class="token-item" data-address="${t.address}">
                <img src="${t.logo || 'img/default.png'}">
                <span>${t.symbol}</span>
            </div>
        `;
    });

    html += `</div></div>`;

    const box = document.createElement("div");
    box.id = "tokenPopup";
    box.innerHTML = html;

    document.body.appendChild(box);

    box.addEventListener("click", async (e)=>{

    if(e.target.classList.contains("popup-bg")){
        box.remove();
        return;
    }

    const item = e.target.closest(".token-item");
    if(!item) return;

    const addr = item.dataset.address;

    if(type === "token0"){
    lpState.token0 = addr;
}else{
    lpState.token1 = addr;
}

box.remove();
updateLPUI();
await syncPoolData();

    // 🔥 TAMBAHAN WAJIB
    await syncPoolData();
});
}

// ==========================
// FEE DROPDOWN
// ==========================
function openFeeDropdown(e){

    const trigger = e.currentTarget;

    attachDropdown(trigger, `
        <div class="dropdown-item" data-fee="500">0.05% • Stable Pair</div>
        <div class="dropdown-item" data-fee="3000">0.3% • Standard</div>
        <div class="dropdown-item" data-fee="10000">1% • High Volatility</div>
    `, (item)=>{

        lpState.fee = parseInt(item.dataset.fee);

        document.getElementById("lpFeeLabel").innerText =
            item.innerText.split("•")[0].trim();

        document.getElementById("lpFeeDesc").innerText =
            item.innerText.split("•")[1].trim();
    });
}

// ==========================
// SLIPPAGE DROPDOWN
// ==========================
function openSlippageDropdown(e){

    const trigger = e.currentTarget;

    attachDropdown(trigger, `
        <div class="dropdown-item" data-slip="0.1">0.1% • Very Safe</div>
        <div class="dropdown-item" data-slip="0.5">0.5% • Recommended</div>
        <div class="dropdown-item" data-slip="1">1% • Fast Execution</div>
    `, (item)=>{

        lpState.slippage = parseFloat(item.dataset.slip);

        document.getElementById("lpSlippageLabel").innerText =
            item.dataset.slip + "%";
    });
}

// ==========================
// DROPDOWN CORE
// ==========================
function attachDropdown(triggerEl, contentHTML, onClick){

    removeDropdown();

    const rect = triggerEl.getBoundingClientRect();

    const box = document.createElement("div");
    box.className = "dropdown";
    box.style.position = "fixed";
    box.style.top = (rect.bottom + 6) + "px";
    box.style.left = rect.left + "px";
    box.style.width = rect.width + "px";
    box.style.zIndex = 9999;

    box.innerHTML = contentHTML;

    document.body.appendChild(box);

    box.addEventListener("click", (e)=>{
        const item = e.target.closest(".dropdown-item");
        if(!item) return;

        onClick(item);
        box.remove();
    });

    // close outside
    setTimeout(()=>{
        document.addEventListener("click", function handler(e){
            if(!box.contains(e.target)){
                box.remove();
                document.removeEventListener("click", handler);
            }
        });
    }, 10);
}

function removeDropdown(){
    document.querySelectorAll(".dropdown").forEach(x=>x.remove());
}

// ==========================
// ADD LP
// ==========================
async function handleAddLP(){

    try{

        const a0 = document.getElementById("lpAmount0").value;
        const a1 = document.getElementById("lpAmount1").value;

        if(!a0 || !a1){
            return alert("Isi amount dulu");
        }

        if(!lpState.token1){
            return alert("Pilih token pair dulu");
        }

        const pk = document.getElementById("walletPK")?.value;
        if(!pk){
            return alert("Private key diperlukan");
        }

        const wallet = createWallet(pk);

        const token0 =
            lpState.token0 === "native"
            ? window.CONFIG.WSDA
            : lpState.token0;

        const token1 = lpState.token1;

        // ==========================
        // CHECK POOL
        // ==========================
        const poolExist = await LP_FACTORY.isPoolExist(
            token0,
            token1,
            lpState.fee
        );

        let tickLower, tickUpper;

        // ==========================
        // FULL RANGE MODE
        // ==========================
        if(lpState.fullRange){

            tickLower = -887220;
            tickUpper =  887220;
        }

        // ==========================
        // CUSTOM RANGE MODE
        // ==========================
        else{

            const minPrice = parseFloat(
                document.getElementById("lpMinPrice")?.value || 0
            );

            const maxPrice = parseFloat(
                document.getElementById("lpMaxPrice")?.value || 0
            );

            if(!minPrice || !maxPrice){
                return alert("Isi range harga dulu");
            }

            // 🔥 CONVERT PRICE → TICK (SIMPLIFIED)
            const tickFromPrice = (price)=>{
                return Math.floor(Math.log(price) / Math.log(1.0001));
            };

            tickLower = tickFromPrice(minPrice);
            tickUpper = tickFromPrice(maxPrice);
        }

        // ==========================
        // POOL BELUM ADA (MANUAL MODE)
        // ==========================
        if(!poolExist){

            const startPrice = parseFloat(
                document.getElementById("lpStartPrice")?.value || 0
            );

            if(!startPrice){
                return alert("Isi harga awal pool");
            }

            console.log("🟡 Create pool with price:", startPrice);

            // 🔥 OPTIONAL: kalau kamu punya init pool function
            // await LP_ENGINE.createPool(token0, token1, fee, startPrice);
        }

        // ==========================
        // EXECUTE LP
        // ==========================
        await LP_ENGINE.addLP({
            token0,
            token1,
            fee: lpState.fee,
            tickLower,
            tickUpper,
            amount0: ethers.utils.parseUnits(a0, 18),
            amount1: ethers.utils.parseUnits(a1, 18),
            wallet
        });

        alert("LP Success");
        closeLPModal();

    }catch(e){
        console.error(e);
        alert("LP Failed");
    }
}

function adjustSingle(type, percent){

    const el = document.getElementById(
        type === "min" ? "lpMinPrice" : "lpMaxPrice"
    );

    if(!el) return;

    let val = parseFloat(el.value || 0);

    if(val === 0){
        val = 1; // default biar ga NaN
    }

    val = val * (1 + percent / 100);

    el.value = val.toFixed(6);
}


async function updateLPPrice(){

    try{

        if(!lpState.token1){
            setLPPriceUI(0);
            return;
        }

        const token0 =
            lpState.token0 === "native"
            ? window.CONFIG.WSDA
            : lpState.token0;

        const token1 = lpState.token1;

        //  pakai PRICE ENGINE (bukan factory)
        const price = await window.PRICE_ENGINE.getPrice(
            token0,
            token1
        );

        setLPPriceUI(price);

    }catch(e){
        console.warn("LP price error:", e);
        setLPPriceUI(0);
    }
}


function setLPPriceUI(price){

    const el = document.getElementById("lpPriceInfo");
    if(!el) return;

    if(!price || price === 0){
        el.innerText = "Price: -";
        return;
    }

    const symbol0 = getLPToken(lpState.token0).symbol;
    const symbol1 = getLPToken(lpState.token1).symbol;

    el.innerText =
        `Price: 1 ${symbol0} = ${price.toFixed(6)} ${symbol1}`;
}
// ==========================
// EVENTS (FINAL FIX)
// ==========================
document.addEventListener("DOMContentLoaded", ()=>{

    // OPEN
    document.getElementById("openLpBtn")
    ?.addEventListener("click", openLPModal);

    // CLOSE
    document.querySelector("#lpModal .close-btn")
    ?.addEventListener("click", closeLPModal);

    // OUTSIDE CLICK
    document.getElementById("lpModal")
    ?.addEventListener("click", (e)=>{
        if(e.target.id === "lpModal"){
            closeLPModal();
        }
    });

    // TOKEN A (SEKARANG HIDUP)
    document.getElementById("lpToken0Select")
    ?.addEventListener("click", (e)=>{
        e.stopPropagation();
        openLPSelector("token0");
    });

    // TOKEN B
    document.getElementById("lpToken1Select")
    ?.addEventListener("click", (e)=>{
        e.stopPropagation();
        openLPSelector("token1");
    });

    // FEE
    document.getElementById("lpFeeSelect")
    ?.addEventListener("click", (e)=>{
        e.stopPropagation();
        openFeeDropdown(e);
    });

    // SLIPPAGE
    document.getElementById("lpSlippageSelect")
    ?.addEventListener("click", (e)=>{
        e.stopPropagation();
        openSlippageDropdown(e);
    });

});



// ==========================
// RANGE SELECT (CHECK STYLE)
// ==========================
document.querySelectorAll(".range-item").forEach(item => {

    item.addEventListener("click", async () => {

        document.querySelectorAll(".range-item")
            .forEach(x => x.classList.remove("active"));

        item.classList.add("active");

        const mode = item.dataset.mode;
        lpState.fullRange = (mode === "full");

        const rangeBox = document.getElementById("lpCustomRange");

        if (rangeBox) {
            rangeBox.style.display = lpState.fullRange ? "none" : "block";
        }

        await syncPoolData(); //  aman sekarang
    });

});



document.getElementById("lpAmount0")
?.addEventListener("input", async ()=>{

    if(!lpState.token1) return;

    const token0 =
        lpState.token0 === "native"
        ? window.CONFIG.WSDA
        : lpState.token0;

    const price = await LP_FACTORY.getCurrentPrice(
        token0,
        lpState.token1,
        lpState.fee
    );

    syncAmountFromPrice(price);
});



document.getElementById("lpManualPrice")
?.addEventListener("input", ()=>{

    const price = parseFloat(
        document.getElementById("lpManualPrice").value || 0
    );

    lpState.manualPrice = price;

    syncAmountFromPrice(price);
    fillAutoRange(price);
});


document.getElementById("lpAmount0")
?.addEventListener("input", async ()=>{

    if(!lpState.token1) return;

    const token0 =
        lpState.token0 === "native"
        ? window.CONFIG.WSDA
        : lpState.token0;

    const price = await window.PRICE_ENGINE.getPrice(
        token0,
        lpState.token1
    );

    syncAmountFromPrice(price);
});



document.getElementById("lpMinPrice")
?.addEventListener("input", (e)=>{
    e.target.dataset.locked = "1";
});

document.getElementById("lpMaxPrice")
?.addEventListener("input", (e)=>{
    e.target.dataset.locked = "1";
});