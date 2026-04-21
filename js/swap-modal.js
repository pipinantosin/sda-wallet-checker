const WSDA_ADDRESS = "0xE4095a910209D7BE03B55D02F40d4554B1666182";

const SWAP_TOKEN_ALIAS = {
    WSDA: "SDA"
};

function getSwapDisplaySymbol(symbol){
    if(!symbol) return "???";
    return SWAP_TOKEN_ALIAS[symbol] || symbol;
}

// ==========================
// GLOBAL STATE
// ==========================
window.swapState = {
    payToken: "native",
    receiveToken: null
};

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
    payInput.addEventListener("input", () => {
    updateReceiveEstimate();
    updateRate(); // 🔥 TAMBAH INI
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
            addr === "native" ||
            addr === WSDA_ADDRESS;

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

    const price = await PRICE_ENGINE.getPrice(
        swapState.payToken,
        swapState.receiveToken
    );

    if(!price || price === 0){
        rateEl.innerText = `No pool`;
        return;
    }

    rateEl.innerText =
        `1 ${payData.symbol} ≈ ${price.toFixed(6)} ${recvData.symbol}`;
}


let isUpdatingReceive = false;

async function updateReceiveEstimate(){

    if(isUpdatingReceive) return;
    isUpdatingReceive = true;

    const val = parseFloat(payInput.value);
    const outEl = document.getElementById("receiveAmount");

    if(!outEl){
        isUpdatingReceive = false;
        return;
    }

    if(isNaN(val) || val <= 0){
        outEl.value = "0";
        isUpdatingReceive = false;
        return;
    }

    try{
        const out = await PRICE_ENGINE.getAmountOut(
            swapState.payToken,
            swapState.receiveToken,
            val
        );

        console.log("OUT UI FINAL:", out);

        if(out === null || out === undefined || isNaN(out)){
            outEl.value = "0";
        }else{
            outEl.value = Number(out).toFixed(6);
        }

    }catch(e){
        console.warn("estimate error:", e);
        outEl.value = "0";
    }

    isUpdatingReceive = false;
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

    // 🔥 SIMPAN VALUE LAMA
    const oldPay = payInput.value;
    const receiveEl = document.getElementById("receiveAmount");
    const oldReceive = receiveEl?.value || "";

    // 🔥 TUKAR TOKEN
    [swapState.payToken, swapState.receiveToken] =
    [swapState.receiveToken, swapState.payToken];

    // 🔥 TUKAR ANGKA JUGA (INI YANG KURANG)
    payInput.value = oldReceive || "";
    if(receiveEl) receiveEl.value = oldPay || "";

    updateUI();

    // 🔥 PAKSA HITUNG ULANG
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

        const w = getSelectedWallet?.();
        if (!w) return;

        const bal = await getTokenBalance(w.address, swapState.payToken);
        const data = getTokenData(swapState.payToken);

        payBalanceEl.innerHTML =
            `${parseFloat(bal).toFixed(4)} ${data.symbol}
             <span class="max" id="btnMax">MAX</span>`;
    }

    // ==========================
    // RECEIVE BALANCE (DIHIDUPKAN LAGI)
    // ==========================
    async function updateReceiveBalance(){

        const w = getSelectedWallet?.();
        if (!w) return;

        const bal = await getTokenBalance(w.address, swapState.receiveToken);
        const data = getTokenData(swapState.receiveToken);

        receiveBalanceEl.innerText =
            `${parseFloat(bal).toFixed(4)} ${data.symbol}`;
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
                tokenAddress === WSDA_ADDRESS ||
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

// ==========================
// TOKEN BALANCE
// ==========================
async function getTokenBalance(address, tokenAddr){

    try {

        const isNative =
            !tokenAddr ||
            tokenAddr === "native" ||
            tokenAddr === WSDA_ADDRESS;

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




// ==========================
// GLOBAL STATE
// ==========================
window.swapState = {
    payToken: "native",
    receiveToken: null
};

document.addEventListener("DOMContentLoaded", () => {

    const payInput = document.getElementById("payAmount");
    const receiveEl = document.getElementById("receiveAmount");
    const switchBtn = document.getElementById("switchSwap");

    // ==========================
    // INPUT FILTER (ANGKA ONLY)
    // ==========================
    payInput.addEventListener("input", (e) => {

        e.target.value = e.target.value
            .replace(/[^0-9.]/g, "")
            .replace(/(\..*)\./g, '$1');

        updateReceiveEstimate();
    });

    // ==========================
    // UPDATE RECEIVE
    // ==========================
    async function updateReceiveEstimate(){

        const val = parseFloat(payInput.value);

        if(!receiveEl) return;

        if(isNaN(val) || val <= 0){
            receiveEl.innerText = "0.0";
            return;
        }

        try{
            const out = await PRICE_ENGINE.getAmountOut(
                swapState.payToken,
                swapState.receiveToken,
                val
            );

            console.log("OUT UI FINAL:", out);

            if(out === null || out === undefined || isNaN(out)){
                receiveEl.innerText = "0.0";
            }else{
                receiveEl.innerText = Number(out).toFixed(6);
            }

        }catch(e){
            console.warn("estimate error:", e);
            receiveEl.innerText = "0.0";
        }
    }

    // ==========================
    // UPDATE RATE
    // ==========================
    async function updateRate(){

        const rateEl = document.getElementById("swapRate");
        if(!rateEl) return;

        const price = await PRICE_ENGINE.getPrice(
            swapState.payToken,
            swapState.receiveToken
        );

        if(!price || price === 0){
            rateEl.innerText = "No pool";
            return;
        }

        rateEl.innerText = `1  ${price.toFixed(6)}`;
    }

    // ==========================
    // UPDATE UI
    // ==========================
    async function updateUI(){

        await updateRate();

        // delay supaya tidak ketimpa
        setTimeout(updateReceiveEstimate, 50);
    }

    // ==========================
    // SWITCH TOKEN + VALUE
    // ==========================
    switchBtn?.addEventListener("click", async () => {

        const oldPay = payInput.value;
        const oldReceive = receiveEl.innerText;

        // tukar token
        [swapState.payToken, swapState.receiveToken] =
        [swapState.receiveToken, swapState.payToken];

        // tukar value
        payInput.value = oldReceive;
        receiveEl.innerText = oldPay || "0.0";

        await updateUI();

        setTimeout(updateReceiveEstimate, 50);
    });

    // ==========================
    // INIT
    // ==========================
    function initTokens(){
        const tokens = window.TOKENS || [];

        swapState.payToken = "native";

        const first = tokens.find(t => t.symbol !== "WSDA");
        swapState.receiveToken = first?.address || "native";

        updateUI();
    }

    initTokens();
});