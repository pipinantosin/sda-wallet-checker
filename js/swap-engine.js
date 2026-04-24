// ==========================
// SWAP ENGINE FINAL (SIDRA FIXED)
// ==========================

window.SWAP_ENGINE = (function () {

    const ROUTER_ADDR = window.CONFIG?.ROUTER;
    const WSDA_ADDR   = window.CONFIG?.WSDA;

    let isLoading = false;

    // ==========================
// ABI
// ==========================
const ROUTER_ABI = [
    "function multicall(bytes[] data) payable returns (bytes[] results)",

    // 🔥 FIX: tambahin nama field (WAJIB buat ethers)
    "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)"
];

const ERC20_ABI = [
    "function approve(address spender,uint256 amount) returns (bool)",
    "function allowance(address owner,address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

// 🔥 Optional tapi rapi (kalau mau dipakai langsung)
const WSDA_ABI = [
    "function deposit() payable",
    "function withdraw(uint256)"
];

// ==========================
// HELPERS
// ==========================
function isNative(token){
    return !token || token === "native";
}

function toWSDA(token){
    return isNative(token) ? WSDA_ADDR : token;
}

function getWallet(){
    return getPKWallet?.() || getSelectedWallet?.() || window.wallet || null;
}

function log(msg){
    console.log("[SWAP]", msg);
    const el = document.getElementById("swapRate");
    if(el) el.innerText = msg;
}

function setLoading(state){
    const btn = document.getElementById("btnReviewSwap");
    if(!btn) return;

    btn.disabled = state;
    btn.innerHTML = state ? `Swapping...` : `Review Swap`;
}

// ==========================
// DECIMALS
// ==========================
async function getDecimals(token){
    const addr = toWSDA(token);

    try{
        const c = new ethers.Contract(addr, ERC20_ABI, provider);
        return await c.decimals();
    }catch{
        return 18;
    }
}

async function parseAmount(token, amount){
    const dec = await getDecimals(token);
    return ethers.utils.parseUnits(amount.toString(), dec);
}

// ==========================
// APPROVE
// ==========================
async function approveIfNeeded(token, amount, wallet){

    if(isNative(token)) return;

    const contract = new ethers.Contract(token, ERC20_ABI, wallet);

    const allowance = await contract.allowance(wallet.address, ROUTER_ADDR);

    if(allowance.gte(amount)) return;

    log("Approving token...");

    const tx = await contract.approve(
        ROUTER_ADDR,
        ethers.constants.MaxUint256
    );

    await tx.wait();
}

// ==========================
// SLIPPAGE (ANTI FAIL)
// ==========================
function getSlippage(){
    const cfg = Number(window.CONFIG?.SLIPPAGE_DEFAULT);
    if (!cfg || cfg <= 0) return 2;
    return Math.min(Math.max(cfg, 1), 10);
}

// ==========================
// BUILD PARAMS (ACCURATE + ANTI FAIL)
// ==========================
async function buildParams(wallet, tokenIn, tokenOut, amountUI){

    const amountNum = parseFloat(amountUI);

    if(!amountNum || amountNum <= 0){
        throw new Error("Invalid amount");
    }

    const amountIn = await parseAmount(tokenIn, amountNum);

    // ==========================
    // ESTIMATE (PRICE ENGINE)
    // ==========================
    const estimated = await PRICE_ENGINE.getAmountOut(
        tokenIn,
        tokenOut,
        amountNum
    );

    if(!estimated || estimated <= 0){
        throw new Error("No liquidity pool");
    }

    // ==========================
    // 🔥 PRICE IMPACT SIMULATION
    // ==========================
    let impactFactor;

    if(amountNum < 0.00001){
        impactFactor = 0.98;   // hampir tanpa impact
    }else if(amountNum < 0.001){
        impactFactor = 0.95;
    }else if(amountNum < 0.01){
        impactFactor = 0.9;
    }else if(amountNum < 0.1){
        impactFactor = 0.85;
    }else{
        impactFactor = 0.8;    // besar → lebih konservatif
    }

    // ==========================
    // 🔥 SLIPPAGE USER
    // ==========================
    const slippage = getSlippage() / 100;

    // ==========================
    // 🔥 FINAL MIN OUT (ANTI FAIL)
    // ==========================
    let minOut = estimated * impactFactor * (1 - slippage);

    if(!isFinite(minOut) || minOut <= 0){
        throw new Error("Invalid output calculation");
    }

    // 🔥 safety floor (hindari 0 karena rounding)
    if(minOut < 0.0000000001){
        minOut = estimated * 0.5;
    }

    const amountOutMinimum = await parseAmount(
        tokenOut,
        minOut.toFixed(8) // 🔥 lebih presisi dari sebelumnya
    );

    return {
        tokenIn: toWSDA(tokenIn),
        tokenOut: toWSDA(tokenOut),
        fee: window.CONFIG?.FEE || 3000,
        recipient: wallet.address,
        deadline: Math.floor(Date.now()/1000) + 300,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0
    };
}

// ==========================
// MAIN SWAP (FINAL FIX)
// ==========================
async function swapExactInput(){

    if(isLoading) return;

    try{

        const wallet = getWallet();
        if(!wallet) throw new Error("Wallet not found");

        const tokenIn  = swapState.payToken;
        const tokenOut = swapState.receiveToken;

        const amountUI = document.getElementById("payAmount")?.value;

        if(!amountUI || Number(amountUI) <= 0){
            throw new Error("Invalid amount");
        }

        isLoading = true;
        setLoading(true);

        const isNativeIn = isNative(tokenIn);

        const router = new ethers.Contract(
            ROUTER_ADDR,
            ROUTER_ABI,
            wallet
        );

        const params = await buildParams(
            wallet,
            tokenIn,
            tokenOut,
            amountUI
        );

        // ==========================
        // EXECUTE SWAP (NO MULTICALL)
        // ==========================
        log("Executing swap...");

        let tx;

        if(isNativeIn){
            // 🔥 SDA langsung kirim ke router
            tx = await router.exactInputSingle(
                params,
                {
                    value: params.amountIn,
                    gasLimit: 1200000
                }
            );
        }else{
            await approveIfNeeded(params.tokenIn, params.amountIn, wallet);

            tx = await router.exactInputSingle(
                params,
                {
                    gasLimit: 1200000
                }
            );
        }

        log("TX: " + tx.hash);

        const receipt = await tx.wait();

        if(receipt.status !== 1){
            throw new Error("Swap failed");
        }

        // ==========================
        // TOKEN META
        // ==========================
        let meta = {
            symbol: "TOKEN",
            logo: "img/default.png"
        };

        try{
            const list = window.TOKEN_LIST || [];

            const found = list.find(t =>
                t.address?.toLowerCase() === params.tokenOut?.toLowerCase()
            );

            if(found){
                meta.symbol = found.symbol || "TOKEN";
                meta.logo = found.icon ? `img/${found.icon}` : "img/default.png";
            }
        }catch(e){
            console.warn("meta error", e);
        }

// ==========================
//  SAVE OBJECT (FIXED CLEAN VERSION)
// ==========================
try {

    const history = JSON.parse(localStorage.getItem("txHistory") || "[]");

    let amountIn = Number(amountUI) || 0;

    let amountOut = 0;
    const receiveEl = document.getElementById("receiveAmount");

    amountOut = Number(receiveEl?.value || 0);

    if (!amountOut || amountOut <= 0) {
        amountOut = amountIn;
    }

    const inSymbol =
        swapState?.payToken === "native"
            ? "SDA"
            : (getTokenData(swapState.payToken)?.symbol || "TOKEN");

    let outSymbol = meta?.symbol;

    if (!outSymbol || outSymbol === "TOKEN") {
        const found = getTokenData(params.tokenOut);
        outSymbol = found?.symbol || "UNKNOWN";
        meta.symbol = outSymbol;
    }

    // ==========================
    // FIX: ambil token DI LUAR object (WAJIB)
    // ==========================
    const inToken  = getTokenData(swapState.payToken);
    const outToken = getTokenData(params.tokenOut);

    history.unshift({
        hash: tx.hash,
        from: wallet.address,
        to: wallet.address,

        value: amountOut,

        symbol: outSymbol,
        logo: meta.logo,
        tokenAddress: params.tokenOut,

        type: "SWAP",

        amountIn,
        amountOut,

        inSymbol,
        outSymbol,

        inLogo: inToken?.icon ? `img/${inToken.icon}` : "img/default.png",
        outLogo: outToken?.icon ? `img/${outToken.icon}` : "img/default.png",

        timestamp: Date.now(),
        status: "success",
        read: false
    });

    if (history.length > 50) {
        history.pop();
    }

    localStorage.setItem("txHistory", JSON.stringify(history));

} catch (e) {
    console.warn("history save error", e);
}

// ==========================
// UPDATE UI
// ==========================
renderTxHistory?.();
updateBellBadge?.();

log("Swap success");
showToast?.("Swap success", "success");
loadBalance?.();

return receipt;

}catch(e){

    console.error(e);
    log("Swap failed");
    showToast?.(e.message || "Swap failed", "error");

}finally{

    isLoading = false;
    setLoading(false);
}
} // ✅ penutup swapExactInput()

// ==========================
// INIT
// ==========================
function init(){
    document.getElementById("btnReviewSwap")
        ?.addEventListener("click", swapExactInput);
}

document.addEventListener("DOMContentLoaded", init);

return {
    swapExactInput
};

})(); // ✅ PENUTUP IIFE