const WSDA_ADDR = "0xE4095a910209D7BE03B55D02F40d4554B1666182";

const SWAP_TOKEN_ALIAS = {
    WSDA: "SDA"
};

function getSwapDisplaySymbol(symbol){
    if(!symbol) return "???";
    return SWAP_TOKEN_ALIAS[symbol] || symbol;
}

// ==========================
// REALISTIC OUTPUT (MATCH OFFICIAL)
// ==========================
function getRealisticOut(amount, estimated){

    if(!estimated || estimated <= 0) return 0;

    let correction;

    if(amount < 0.00001){
        correction = 1.043;
    }else if(amount < 0.001){
        correction = 1.040;
    }else if(amount < 0.01){
        correction = 1.037;
    }else{
        correction = 1.033;
    }

    const result = estimated * correction;

    return (!isFinite(result) || result <= 0) ? 0 : result;
}
// ==========================
// GLOBAL STATE
// ==========================
window.swapState = {
    payToken: "native",
    receiveToken: null
};

let activeInput = "pay"; // "pay" | "receive"
// ==========================
// INIT
// ==========================
document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("swapModal");
    const openBtn = document.getElementById("openSwapBtn");
    const closeBtn = document.getElementById("closeSwapModal");

    const walletNameEl = document.getElementById("swapWalletName");
    const walletBalanceEl = document.getElementById("swapWalletBalance");

    const paySymbol = document.getElementById("payTokenSymbol");
    const receiveSymbol = document.getElementById("receiveTokenSymbol");

    const payIcon = document.getElementById("payTokenIcon");
    const receiveIcon = document.getElementById("receiveTokenIcon");

    const payBalanceEl = document.getElementById("payBalance");
    const receiveBalanceEl = document.getElementById("receiveBalance");

    const switchBtn = document.getElementById("switchSwap");
    const payInput = document.getElementById("payAmount");
    
    payInput.addEventListener("input", function(){

    activeInput = "pay";

    this.value = this.value
        .replace(/[^0-9.]/g, "")
        .replace(/(\..*)\./g, '$1');

    this.scrollLeft = this.scrollWidth;

    updateReceiveEstimate();
    updateRate();
});


const receiveInput = document.getElementById("receiveAmount");

receiveInput.addEventListener("input", function(){

    activeInput = "receive";

    this.value = this.value
        .replace(/[^0-9.]/g, "")
        .replace(/(\..*)\./g, '$1');

    this.scrollLeft = this.scrollWidth;

    updatePayEstimate();
    updateRate();
});

    // ==========================
    // INIT TOKEN
    // ==========================
    function initTokens(){
        const tokens = window.TOKENS || [];

        swapState.payToken = "native";

        const first = tokens.find(t => t.symbol !== "WSDA");
        swapState.receiveToken = first?.address || "native";

        updateUI();
    }

    // ==========================
    // TOKEN DATA
    // ==========================
    function getTokenData(addr){

        const isNative =
    !addr ||
    addr === "native";

        if(isNative){
            return {
                symbol: "SDA",
                logo: "img/sda.png"
            };
        }

        const t = (window.TOKENS || []).find(x => x.address === addr);

        return {
            symbol: getSwapDisplaySymbol(t?.symbol || "???"),
            logo: t?.logo || "img/default.png"
        };
    }

    // ==========================
    // UPDATE UI
    // ==========================
    async function updateUI(){

    const pay = getTokenData(swapState.payToken);
    const recv = getTokenData(swapState.receiveToken);

    paySymbol.innerText = pay.symbol;
    receiveSymbol.innerText = recv.symbol;

    payIcon.src = pay.logo;
    receiveIcon.src = recv.logo;

    await Promise.all([
    updatePayBalance(),
    updateReceiveBalance(),
    refreshWalletBalance(),
    updateRate()
]);

// 🔥 TAMBAH INI
setTimeout(updateReceiveEstimate, 50);
updateReceiveBalance()
}
    
    
 async function updateRate(){

    const rateEl = document.getElementById("swapRate");
    if(!rateEl) return;

    const payData  = getTokenData(swapState.payToken);
    const recvData = getTokenData(swapState.receiveToken);

    try{

        // 🔥 ambil langsung dari swap logic (bukan price)
        const out = await PRICE_ENGINE.getAmountOut(
            swapState.payToken,
            swapState.receiveToken,
            1 // 1 unit
        );

        if(!out || isNaN(out)){
            rateEl.innerText = `No pool`;
            return;
        }

        rateEl.innerText =
            `1 ${payData.symbol} ≈ ${Number(out).toFixed(6)} ${recvData.symbol}`;

    }catch(e){
        console.warn("rate error:", e);
        rateEl.innerText = `No pool`;
    }
}


let isUpdatingReceive = false;

async function updateReceiveEstimate(){

    if(activeInput !== "pay") return;

    const val = parseFloat(payInput.value);
    const outEl = document.getElementById("receiveAmount");

    if(!outEl) return;

    if(isNaN(val) || val <= 0){
        outEl.value = "0.0";
        return;
    }

    try{
        const estimated = await PRICE_ENGINE.getAmountOut(
            swapState.payToken,
            swapState.receiveToken,
            val
        );

        // 🔥 FIX: pakai realistic
        const realistic = getRealisticOut(val, estimated);

        console.log("EST:", estimated);
        console.log("REAL:", realistic);

        outEl.value = realistic > 0
            ? realistic.toFixed(6)
            : "0.0";

    }catch(e){
        console.warn("estimate error:", e);
        outEl.value = "0.0";
    }
}
    
    
    async function updatePayEstimate(){

    const val = parseFloat(receiveInput.value);

    if(!payInput) return;

    if(isNaN(val) || val <= 0){
        payInput.value = "";
        return;
    }

    try{

        const forwardPrice =
            await PRICE_ENGINE.getPrice(
                swapState.payToken,
                swapState.receiveToken
            );

        if(
            !forwardPrice ||
            forwardPrice <= 0
        ){
            payInput.value = "";
            return;
        }

        const estimatedPay =
            val / forwardPrice;

        const realistic =
            getRealisticOut(
                estimatedPay,
                estimatedPay
            );

        payInput.value =
            realistic > 0
                ? realistic.toFixed(6)
                : "";

    }catch(e){
        console.warn(
            "reverse estimate error:",
            e
        );

        payInput.value = "";
    }
}

    async function refreshWalletBalance(){
        const w = getSelectedWallet?.();
        if(!w) return;

        const bal = await getTokenBalance(w.address, "native");

        walletBalanceEl.innerText =
            `${parseFloat(bal).toFixed(4)} SDA`;
    }

    // ==========================
    // OPEN MODAL
    // ==========================
    openBtn?.addEventListener("click", async () => {

        modal.classList.add("show");

        const w = getSelectedWallet?.();

        if (w) {
            walletNameEl.innerText = w.name || "Wallet";

            const bal = await getTokenBalance(w.address, "native");

            walletBalanceEl.innerText =
                `${parseFloat(bal).toFixed(4)} SDA`;
        }

        await updateUI();

// 🔥 TAMBAH INI
setTimeout(() => {
    updateReceiveEstimate();
}, 300);
        
    });

    // ==========================
    // CLOSE
    // ==========================
    closeBtn?.addEventListener("click", () => modal.classList.remove("show"));

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("show");
    });

    // ==========================
    // SWITCH TOKEN (FIX HIDUP)
    // ==========================
    switchBtn?.addEventListener("click", () => {

    const oldPay = payInput.value;
    const oldReceive = receiveInput.value;

    [swapState.payToken, swapState.receiveToken] =
    [swapState.receiveToken, swapState.payToken];

    payInput.value = oldReceive || "";
    receiveInput.value = oldPay || "";

    activeInput = "pay"; // 🔥 WAJIB

    updateUI();

    setTimeout(updateReceiveEstimate, 100);
});

    // ==========================
    // MAX BUTTON
    // ==========================
    document.addEventListener("click", async (e) => {

        if(e.target.id === "btnMax"){

            const w = getSelectedWallet?.();
            if (!w) return;

            const bal = await getTokenBalance(w.address, swapState.payToken);

            payInput.value = parseFloat(bal).toFixed(6);
            updateReceiveEstimate();
        }
    });

    // ==========================
// PAY BALANCE
// ==========================
async function updatePayBalance(){

    try{
        const w = getSelectedWallet?.();
        if(!w) return;

        const bal =
            await getTokenBalance(
                w.address,
                swapState.payToken
            );

        const data =
            getTokenData(
                swapState.payToken
            );

        const safeBal =
            isFinite(parseFloat(bal))
                ? parseFloat(bal)
                : 0;

        payBalanceEl.innerHTML = `
            ${safeBal.toFixed(4)} ${data.symbol}
            <span class="max" id="btnMax">MAX</span>
        `;

        const btnMax =
            document.getElementById(
                "btnMax"
            );

        if(btnMax){
            btnMax.onclick = () => {
                payInput.value =
                    safeBal.toFixed(6);

                updateReceiveEstimate?.();
            };
        }

    }catch(e){
        console.warn(
            "updatePayBalance error:",
            e
        );

        payBalanceEl.innerHTML =
            `0.0000 <span class="max" id="btnMax">MAX</span>`;
    }
}

// ==========================
// RECEIVE BALANCE
// ==========================
async function updateReceiveBalance(){

    try{
        const w = getSelectedWallet?.();
        if(!w) return;

        const bal =
            await getTokenBalance(
                w.address,
                swapState.receiveToken
            );

        const data =
            getTokenData(
                swapState.receiveToken
            );

        const safeBal =
            isFinite(parseFloat(bal))
                ? parseFloat(bal)
                : 0;

        receiveBalanceEl.innerText =
            `${safeBal.toFixed(4)} ${data.symbol}`;

    }catch(e){
        console.warn(
            "updateReceiveBalance error:",
            e
        );

        receiveBalanceEl.innerText =
            "0.0000";
    }
}

    // ==========================
    // DROPDOWN
    // ==========================
    document.getElementById("payToken")?.addEventListener("click", () => {
        openSelector("pay");
    });

    document.getElementById("receiveToken")?.addEventListener("click", () => {
        openSelector("receive");
    });

    function openSelector(type){

        const tokens = window.TOKENS || [];
        let html = "";

        tokens.forEach(t => {

           if (t.symbol === "WSDA") return;
if (t.address === WSDA_ADDR) return;

            html += `
                <div class="token-item"
                     data-type="${type}"
                     data-address="${t.address}"
                     data-symbol="${t.symbol.toLowerCase()}">

                    <img src="${t.logo || 'img/default.png'}">
                    <span>${getSwapDisplaySymbol(t.symbol)}</span>
                </div>
            `;
        });

        const box = document.createElement("div");
        box.id = "tokenPopup";

        box.innerHTML = `
            <div class="popup-bg"></div>
            <div class="popup">
                <div class="token-search">
                    <input type="text" id="tokenSearchInput" placeholder="Search token...">
                </div>
                <div id="tokenList">${html}</div>
            </div>
        `;

        document.body.appendChild(box);

        const input = box.querySelector("#tokenSearchInput");
        const list  = box.querySelector("#tokenList");

        input.addEventListener("input", (e) => {
            const keyword = e.target.value.toLowerCase();
            list.querySelectorAll(".token-item").forEach(item => {
                item.style.display =
                    item.dataset.symbol.includes(keyword) ? "flex" : "none";
            });
        });

        box.addEventListener("click", (e) => {

            if(e.target.classList.contains("popup-bg")){
                box.remove();
                return;
            }

            const item = e.target.closest(".token-item");
            if(!item) return;

            let tokenAddress = item.dataset.address;
            const symbol = item.dataset.symbol;

            const isNative =
    symbol === "sda" ||
    tokenAddress === "native";

            if(isNative) tokenAddress = "native";

            if(type === "pay"){
                swapState.payToken = tokenAddress;
            } else {
                swapState.receiveToken = tokenAddress;
            }

            updateUI();
            box.remove();
        });
    }

    initTokens();
});




document.getElementById("swapButton")
?.addEventListener("click", () => {
    SWAP_ENGINE.swapExactInput();
});



// ==========================
// TOKEN BALANCE
// ==========================
async function getTokenBalance(address, tokenAddr){

    try {

        const isNative =
            !tokenAddr ||
            tokenAddr === "native" ||
            tokenAddr === WSDA_ADDR;

        if (isNative) {
            const bal = await provider.getBalance(address);
            return ethers.utils.formatEther(bal);
        }

        const abi = [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];

        const contract = new ethers.Contract(tokenAddr, abi, provider);

        const [bal, dec] = await Promise.all([
            contract.balanceOf(address),
            contract.decimals().catch(() => 18)
        ]);

        return ethers.utils.formatUnits(bal, dec);

    } catch (e) {
        console.warn("Balance error:", e);
        return "0";
    }
}



