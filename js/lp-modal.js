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


async function getTokenDecimals(token){

    try{

        // Native SDA / wrapped SDA
        if(
            token === "native" ||
            token === window.CONFIG.WSDA
        ){
            return 18;
        }

        const erc20 = new ethers.Contract(
            token,
            [
                "function decimals() view returns (uint8)"
            ],
            window.provider
        );

        return await erc20.decimals();

    }catch(err){

        console.warn(
            "getTokenDecimals fallback 18:",
            err
        );

        return 18;
    }
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

        if(!lpState.token1){
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
        // GET PRICE (UNIFIED ENGINE)
        // ==========================
        const price = await window.PRICE_ENGINE.getPrice(
            token0,
            token1
        );

        const isValidPrice =
            typeof price === "number" &&
            isFinite(price) &&
            price > 0;

        // ==========================
        // POOL NOT ACTIVE
        // ==========================
        if(!isValidPrice){

            lpState.priceMode = "manual";

            if(statusEl){
                statusEl.innerText =
                    "Pool belum aktif • set harga manual";
            }

            if(manualBox){
                manualBox.style.display = "block";
            }

            setLPPriceUI(0);
            updatePairUI();

            const inputB =
                document.getElementById("lpAmount1");

            if(inputB){
                inputB.value = "";
            }

            return;
        }

        // ==========================
        // POOL ACTIVE
        // ==========================
        lpState.priceMode = "auto";

        if(statusEl){
            statusEl.innerText =
                "Pool aktif • auto price";
        }

        if(manualBox){
            manualBox.style.display = "none";
        }

        updatePairUI();
        setLPPriceUI(price);

        const inputA =
            document.getElementById("lpAmount0");

        const inputB =
            document.getElementById("lpAmount1");

        

        // lanjut range logic di bawah sini...

        // ==========================
// RANGE LOGIC FIXED
// ==========================
const minEl = document.getElementById("lpMinPrice");
const maxEl = document.getElementById("lpMaxPrice");

if(rangeBox){
    rangeBox.style.display =
        lpState.fullRange
            ? "none"
            : "block";
}

// ==========================
// FULL RANGE MODE
// ==========================
if(lpState.fullRange){

    if(minEl && maxEl){

        minEl.value = "";
        maxEl.value = "";

        // reset manual edit state
        delete minEl.dataset.userEdited;
        delete maxEl.dataset.userEdited;
    }
}

// ==========================
// CUSTOM RANGE MODE
// ==========================
else{

    if(minEl && maxEl){

        const userEdited =
            minEl.dataset.userEdited === "1" ||
            maxEl.dataset.userEdited === "1";

        // auto fill only if user never edited manually
        if(!userEdited){

            const min = price * 0.95;
            const max = price * 1.05;

            minEl.value = min.toFixed(6);
            maxEl.value = max.toFixed(6);
        }
    }
}

}catch(err){
    console.warn(
        "syncPoolData error:",
        err
    );
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

        // TOKEN0 DYNAMIC
        const bal0Raw = await getTokenBalance(
            w.address,
            lpState.token0
        );

        const bal0 = parseFloat(bal0Raw || 0);

        const symbol0 = getLPToken(lpState.token0).symbol;

        if(el0){
            el0.innerHTML = `
                ${bal0.toFixed(4)} ${symbol0}
                <span class="max" id="lpMax0">MAX</span>
            `;
        }

        // MAX BUTTON
        const maxBtn = document.getElementById("lpMax0");
        if(maxBtn){

            const newBtn = maxBtn.cloneNode(true);
            maxBtn.replaceWith(newBtn);

            newBtn.addEventListener("click", async ()=>{

                const input = document.getElementById("lpAmount0");

                if(input){
                    input.value = bal0 > 0
                        ? bal0.toFixed(6)
                        : "";
                }

                if(lpState.token1){

                    let price = 0;

                    if(lpState.priceMode === "auto"){
                        const token0 =
                            lpState.token0 === "native"
                                ? window.CONFIG.WSDA
                                : lpState.token0;

                        price = await window.PRICE_ENGINE.getPrice(
                            token0,
                            lpState.token1
                        );
                    }else{
                        price = parseFloat(lpState.manualPrice || 0);
                    }

                    if(price > 0){
                        await syncAmountFromPrice(price);
                    }
                }

                await validateLPBalances();
            });
        }

        // TOKEN1
        if(!lpState.token1){

            if(el1) el1.innerText = "0.00";
            return;
        }

        const bal1Raw = await getTokenBalance(
            w.address,
            lpState.token1
        );

        const bal1 = parseFloat(bal1Raw || 0);

        if(el1){
            el1.innerText = bal1.toFixed(4);
        }

    }catch(err){
        console.error("LP Balance Error:", err);

        if(el0) el0.innerText = "0.00";
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
        
        let amount0Input = a0;
let amount1Input = a1;

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

        window.walletPK = pk;

        const token0 =
            lpState.token0 === "native"
            ? window.CONFIG.WSDA
            : lpState.token0;

        const token1 = lpState.token1;
        
        // SORT TOKEN + AMOUNT AGAR SESUAI URUTAN POOL
let finalToken0 = token0;
let finalToken1 = token1;

if (token0.toLowerCase() > token1.toLowerCase()) {
    [finalToken0, finalToken1] = [token1, token0];
    [amount0Input, amount1Input] = [amount1Input, amount0Input];
}

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

            const spacingMap = {
    500: 10,
    3000: 60,
    10000: 200
};

const spacing = spacingMap[lpState.fee] || 60;

const MIN_TICK = -887272;
const MAX_TICK = 887272;

tickLower = Math.ceil(MIN_TICK / spacing) * spacing;
tickUpper = Math.floor(MAX_TICK / spacing) * spacing;
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

            const spacingMap = {
    500: 10,
    3000: 60,
    10000: 200
};

const spacing = spacingMap[lpState.fee] || 60;

tickLower = Math.floor(tickFromPrice(minPrice) / spacing) * spacing;
tickUpper = Math.floor(tickFromPrice(maxPrice) / spacing) * spacing;
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
        window.walletPK = pk;

const dec0 = await getTokenDecimals(finalToken0);
const dec1 = await getTokenDecimals(finalToken1);

const lpTx = await LP_ENGINE.addLP({
    token0: finalToken0,
    token1: finalToken1,
    fee: lpState.fee,
    tickLower,
    tickUpper,
    amount0: ethers.utils.parseUnits(amount0Input, dec0),
    amount1: ethers.utils.parseUnits(amount1Input, dec1)
});

// ==========================
// FORCE SUCCESS IF TX EXISTS
// ==========================
if(lpTx?.hash){

    await saveLPToHistory(lpTx, {
        token0: finalToken0,
        token1: finalToken1,
        amount0: amount0Input,
        amount1: amount1Input
    });

    renderTxHistory?.();
    updateBellBadge?.();

    alert("LP Success");
    document.getElementById("lpAmount0").value = "";
document.getElementById("lpAmount1").value = "";
    closeLPModal();

}else{
    throw new Error("LP tx invalid");
}

    }catch(e){
        console.error(e);
        alert("LP Failed");
    }
}


// ==========================
// SAVE LP HISTORY
// ==========================
async function saveLPToHistory(tx, data){

    try{

        const history = getTxHistory();

        history.unshift({
            hash: tx.hash,
            type: "ADD_LP",

            token0: data.token0,
            token1: data.token1,

            inSymbol: getLPToken(data.token0).symbol,
            outSymbol: getLPToken(data.token1).symbol,

            inLogo: getLPToken(data.token0).logo,
            outLogo: getLPToken(data.token1).logo,

            amount0: parseFloat(data.amount0),
            amount1: parseFloat(data.amount1),

            timestamp: Math.floor(Date.now()/1000),
            read: false
        });

        saveTxHistory(history);

        console.log("✔ LP history saved");

    }catch(e){
        console.warn("LP history save failed:", e);
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
// BALANCE VALIDATION UI
// ==========================
async function validateLPBalances(){

    const w = getSelectedWallet?.();
    if(!w) return;

    const input0 = document.getElementById("lpAmount0");
    const input1 = document.getElementById("lpAmount1");

    const bal0El = document.getElementById("lpBalance0");
    const bal1El = document.getElementById("lpBalance1");

    if(!input0 || !input1) return;

    const amount0 = parseFloat(input0.value || 0);
    const amount1 = parseFloat(input1.value || 0);

    const bal0 = parseFloat(
        await getTokenBalance(
            w.address,
            lpState.token0
        ) || 0
    );

    const bal1 = lpState.token1
        ? parseFloat(
            await getTokenBalance(
                w.address,
                lpState.token1
            ) || 0
        )
        : 0;

    bal0El.style.color =
        amount0 > bal0 ? "#ff4d4f" : "";

    bal1El.style.color =
        amount1 > bal1 ? "#ff4d4f" : "";

    input0.style.borderColor =
        amount0 > bal0 ? "#ff4d4f" : "";

    input1.style.borderColor =
        amount1 > bal1 ? "#ff4d4f" : "";
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


document.getElementById("btnAddLP")
?.addEventListener("click", handleAddLP);

// ==========================
// RANGE SELECT
// ==========================
document.querySelectorAll(".range-item").forEach(item => {

    item.addEventListener("click", async () => {

        document.querySelectorAll(".range-item")
            .forEach(x => x.classList.remove("active"));

        item.classList.add("active");

        const mode = item.dataset.mode;

        lpState.fullRange =
            (mode === "full");

        const rangeBox =
            document.getElementById(
                "lpCustomRange"
            );

        if(rangeBox){
            rangeBox.style.display =
                lpState.fullRange
                    ? "none"
                    : "block";
        }

        // RESET AUTO-FILL LOCK
        if(!lpState.fullRange){

            const minEl =
                document.getElementById("lpMinPrice");

            const maxEl =
                document.getElementById("lpMaxPrice");

            if(minEl) delete minEl.dataset.userEdited;
            if(maxEl) delete maxEl.dataset.userEdited;
        }

        await syncPoolData();
    });

});

// ==========================
// AMOUNT0 -> AUTO AMOUNT1
// SINGLE LISTENER ONLY
// ==========================
document.getElementById("lpAmount0")
?.addEventListener("input", async ()=>{

    if(!lpState.token1) return;

    const token0 =
        lpState.token0 === "native"
            ? window.CONFIG.WSDA
            : lpState.token0;

    const price =
        await window.PRICE_ENGINE.getPrice(
            token0,
            lpState.token1
        );

    syncAmountFromPrice(price);
});

// ==========================
// MANUAL PRICE INPUT
// ==========================
document.getElementById("lpManualPrice")
?.addEventListener("input", ()=>{

    const price = parseFloat(
        document.getElementById(
            "lpManualPrice"
        )?.value || 0
    );

    lpState.manualPrice = price;

    syncAmountFromPrice(price);
    fillAutoRange(price);
});

// ==========================
// USER EDIT CUSTOM RANGE
// ==========================
document.getElementById("lpMinPrice")
?.addEventListener("input", (e)=>{
    e.target.dataset.userEdited = "1";
});

document.getElementById("lpMaxPrice")
?.addEventListener("input", (e)=>{
    e.target.dataset.userEdited = "1";
});

// ==========================
// AMOUNT1 -> AUTO AMOUNT0
// REVERSE SYNC
// ==========================
document.getElementById("lpAmount0")
?.addEventListener("input", validateLPBalances);

document.getElementById("lpAmount1")
?.addEventListener("input", validateLPBalances);

document.getElementById("lpAmount1")
?.addEventListener("input", async ()=>{

    if(!lpState.token1) return;

    const token0 =
        lpState.token0 === "native"
            ? window.CONFIG.WSDA
            : lpState.token0;

    let price = 0;

    if(lpState.priceMode === "auto"){
        price = await window.PRICE_ENGINE.getPrice(
            token0,
            lpState.token1
        );
    }else{
        price = parseFloat(lpState.manualPrice || 0);
    }

    if(!price || price <= 0) return;

    const valB = parseFloat(
        document.getElementById("lpAmount1").value || 0
    );

    const inputA =
        document.getElementById("lpAmount0");

    if(!valB || !isFinite(valB)){
        inputA.value = "";
        await validateLPBalances();
        return;
    }

    inputA.value = (valB / price).toFixed(6);

    await validateLPBalances();
});