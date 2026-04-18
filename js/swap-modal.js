const WSDA_ADDRESS = "0xE4095a910209D7BE03B55D02F40d4554B1666182";


const SWAP_TOKEN_ALIAS = {
    WSDA: "SDA"
};

function getSwapDisplaySymbol(symbol){
    if(!symbol) return "???";
    return SWAP_TOKEN_ALIAS[symbol] || symbol;
}



// ==========================
// GLOBAL SWAP STATE
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

    const switchBtn = document.getElementById("switchSwap");
    const payInput = document.getElementById("payAmount");

    // ==========================
    // INIT TOKEN (SYNC TOKENS GLOBAL)
    // ==========================
    function initTokens(){

        const tokens = window.TOKENS || [];

        // default: SDA  token pertama
        swapState.payToken = "native";

        const first = tokens.find(t => t.symbol !== "WSDA");
        swapState.receiveToken = first?.address || "native";

        updateTokenUI();
        updateReceiveEstimate();
        ensureValidSwapState();
    }

    // ==========================
    // GET TOKEN DATA (UNIFIED)
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
// CONSTANT (WSDA BRIDGE)
// ==========================
function resolveTokenAddress(token){

    if(!token) return "native"; // 🔥 FIX AUTO SAFE

    if(token === "native"){
        return "native";
    }

    return token;
}


// ==========================
// UPDATE UI
// ==========================
window.updateTokenUI = async function(){

    const pay = getTokenData(swapState.payToken);
    const recv = getTokenData(swapState.receiveToken);

    paySymbol.innerText = pay.symbol;
    receiveSymbol.innerText = recv.symbol;

    payIcon.src = pay.logo;
    receiveIcon.src = recv.logo;

    //  jalanin bareng biar cepat
    await Promise.all([
        updatePayBalance(),
        updateReceiveBalance(),
        refreshSwapWalletBalance()
    ]);
}


async function refreshSwapWalletBalance(){

    const w = getSelectedWallet?.();
    if(!w) return;

    const bal = await getTokenBalance(w.address, "native"); // 🔥 FIX WAJIB SDA ONLY

    document.getElementById("swapWalletBalance").innerText =
        `${parseFloat(bal).toFixed(4)} SDA`;
}
// ==========================
// OPEN SWAP
// ==========================
openBtn?.addEventListener("click", async () => {

    try {

        modal.classList.add("show");

        const w = getSelectedWallet?.();

        if (w) {

            walletNameEl.innerText = w.name || "Wallet";

            const prov = window.provider || window.pkProvider;
            const bal = await prov.getBalance(w.address);

            walletBalanceEl.innerText =
                parseFloat(ethers.utils.formatEther(bal)).toFixed(4) + " SDA";
        }

        const recvEl = document.getElementById("receiveBalance");
if(recvEl) recvEl.innerText = "...";

await updateTokenUI();
updateReceiveEstimate();

//  trigger rate manual (WAJIB)
if(window.updateRate){
    setTimeout(window.updateRate, 200);
}


    } catch (err) {
        console.warn("Swap open error:", err);
    }
});


// ==========================
// CLOSE
// ==========================
closeBtn?.addEventListener("click", () => modal.classList.remove("show"));

modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("show");
});


// ==========================
// SWITCH TOKEN
// ==========================
switchBtn?.addEventListener("click", () => {

    [swapState.payToken, swapState.receiveToken] =
    [swapState.receiveToken, swapState.payToken];

    ensureValidSwapState();

    updateTokenUI();
    updatePayBalance();
    updateReceiveBalance(); // 🔥 FIX PENTING
    updateReceiveEstimate();
});


// ==========================
// MAX BUTTON (DELEGATION FIX)
// ==========================
document.addEventListener("click", async (e) => {

    if(e.target.id === "btnMax"){

        const w = getSelectedWallet?.();
        if (!w) return;

        const token = swapState.payToken; // 🔥 FIX INI

        const bal = await getTokenBalance(w.address, token);

        payInput.value = parseFloat(bal).toFixed(6);

        updateReceiveEstimate();
        updatePayBalance(); // optional biar sync UI
    }
});


// ==========================
// INPUT LISTENER (LIVE CALC)
// ==========================
payInput?.addEventListener("input", () => {
    updateReceiveEstimate();
});




async function updateReceiveEstimate(){

    const outInput = document.getElementById("receiveAmount");
    if(!outInput) return;

    const amount = parseFloat(payInput?.value || 0);

    if(!amount || amount <= 0){
        outInput.value = "";
        return;
    }

    // ==========================
    // 🔥 SAME TOKEN FIX (PALING ATAS)
    // ==========================
    const WSDA = window.CONFIG?.WSDA || WSDA_ADDRESS;

    const normalize = (x) => {
        if(!x || x === "native") return WSDA;
        return x;
    };

    const tokenIn  = normalize(swapState.payToken);
    const tokenOut = normalize(swapState.receiveToken);

    if(tokenIn === tokenOut){
        outInput.value = amount.toFixed(6);
        return;
    }

    // ==========================
    // 🔥 ENGINE QUOTE
    // ==========================
    try {

    if(window.FACTORY_ENGINE?.getQuote){

        // 🔥 WAJIB
        await window.FACTORY_ENGINE.init();

        const result = window.FACTORY_ENGINE.getQuote(
            tokenIn,
            tokenOut,
            amount
        );

            if(result && isFinite(result)){
                outInput.value = Number(result).toFixed(6);
                return;
            }
        }

        // fallback
        outInput.value = "0.0000";

    } catch (e) {
        console.warn("Estimate error:", e);
        outInput.value = "0.0000";
    }
}

    // ==========================
    // UPDATE PAY BALANCE
    // ==========================
    async function updatePayBalance(){

    const w = getSelectedWallet?.();
    if (!w) return;

    const token = swapState.payToken;

    const bal = await getTokenBalance(w.address, token);

    const data = getTokenData(token);

    payBalanceEl.innerHTML =
        `${parseFloat(bal).toFixed(4)} ${data.symbol}
         <span class="max" id="btnMax">MAX</span>`;
}

    // ==========================
    // DROPDOWN TOKEN CLICK ( FIX UTAMA)
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

            <!-- SEARCH -->
            <div class="token-search">
                <input type="text" id="tokenSearchInput" placeholder="Search token...">
            </div>

            <!-- LIST -->
            <div id="tokenList">
                ${html}
            </div>

        </div>
    `;

    document.body.appendChild(box);

    const input = box.querySelector("#tokenSearchInput");
    const list  = box.querySelector("#tokenList");

    // ==========================
    // SEARCH FILTER
    // ==========================
    input.addEventListener("input", (e) => {

        const keyword = e.target.value.toLowerCase();
        const items = list.querySelectorAll(".token-item");

        items.forEach(item => {

            const symbol = item.dataset.symbol;

            if(symbol.includes(keyword)){
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        });
    });

    // ==========================
    // CLICK SELECT TOKEN
    // ==========================
    box.addEventListener("click", (e) => {

        // klik background
        if(e.target.classList.contains("popup-bg")){
            box.remove();
            return;
        }

        const item = e.target.closest(".token-item");
if(!item) return;

const val = item.dataset.address;
const symbol = item.dataset.symbol;
const type = item.dataset.type;

// 🔥 NORMALIZE SDA
let tokenAddress = val;

// 🔥 NORMALIZE SDA
if(symbol === "sda" || val === WSDA_ADDRESS){
    tokenAddress = "native";
}

if(type === "pay"){
    swapState.payToken = tokenAddress;
} else {
    swapState.receiveToken = tokenAddress;
}

updateTokenUI();
updatePayBalance();
updateReceiveEstimate();
updateReceiveBalance();

box.remove();
    });
}

    // ==========================
    // INIT RUN
    // ==========================
    initTokens();

setTimeout(() => {
    window.FACTORY_ENGINE?.init();
}, 300);
});


// ==========================
// TOKEN BALANCE (SAFE GLOBAL)
// ==========================
async function getTokenBalance(address, tokenAddr){

    try {

        // 🔥 SDA / WSDA = native balance
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
        console.warn("Swap balance error:", e);
        return "0";
    }
}


function ensureValidSwapState(){

    const tokens = window.TOKENS || [];

    if(!swapState.payToken){
        swapState.payToken = "native";
    }

    if(!swapState.receiveToken){
        const first = tokens.find(t => t.symbol !== "WSDA");
        swapState.receiveToken = first?.address || "native";
    }
}

async function updateReceiveBalance(){

    const w = getSelectedWallet?.();
    if (!w) return;

    const token = swapState.receiveToken;

    const bal = await getTokenBalance(w.address, token);

    const data = getTokenData(token);
    const displaySymbol = data.symbol;

    document.getElementById("receiveBalance").innerText =
        `${parseFloat(bal).toFixed(4)} ${displaySymbol}`;
}

function resolveDisplay(symbol){
    if(!symbol) return "???";
    return getSwapDisplaySymbol(symbol);
}


function openTokenPopup(type){

    const popup = document.getElementById("tokenPopup");
    if(!popup) return;

    popup.style.display = "block";

    const list = popup.querySelector(".popup");
    list.innerHTML = "";

    (window.TOKENS || []).forEach(token => {

        const item = document.createElement("div");
        item.className = "token-item";

        item.innerHTML = `
            <img src="${token.logo || 'img/default.png'}">
            <span>${token.symbol}</span>
        `;

        item.onclick = () => {

            if(type === "pay"){
                swapState.payToken = token.address;
            } else {
                swapState.receiveToken = token.address;
            }

            updateTokenUI();
            updateReceiveEstimate();
            updatePayBalance();
            updateReceiveBalance();

            popup.style.display = "none";
        };

        list.appendChild(item);
    });

    // close background
    popup.onclick = (e) => {
        if(e.target.id === "tokenPopup"){
            popup.style.display = "none";
        }
    };
}
// ==========================
// AUTO UPDATE OUTPUT
// ==========================
const payInput = document.getElementById("payAmount");

payInput?.addEventListener("input", () => {
    updateReceiveEstimate();
    console.log("swap-modal loaded");
});


