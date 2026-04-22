// ==========================
// SWAP ENGINE FINAL FIXED
// ==========================

window.SWAP_ENGINE = (function () {

    // ==========================
    // SAFE CONFIG
    // ==========================
    const ROUTER_ADDR = window.CONFIG?.ROUTER;
    const SDA_NATIVE  = "native";
const WSDA_ADDR   = window.CONFIG?.WSDA; // wrapped

    let isLoading = false;

    // ==========================
    // ABI (MATCH SOLIDITY)
    // ==========================
    const ROUTER_ABI = [
        "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)"
    ];

    const ERC20_ABI = [
        "function approve(address spender,uint256 amount) returns (bool)",
        "function allowance(address owner,address spender) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];

    // ==========================
    // LOCAL HELPERS (NO CONFLICT)
    // ==========================
    function _isNative(token){
    return !token || token === "native";
}

    function _toAddress(token){

    // SDA (native) -> WSDA (wrapped for router)
    if (!token || token === "native") {
        return WSDA_ADDR;
    }

    // ERC20 tetap
    return token;
}

    function getWallet(){
        return getPKWallet?.() || getSelectedWallet?.() || wallet || null;
    }

    function setButtonLoading(state){
        const btn = document.getElementById("btnReviewSwap");
        if(!btn) return;

        if(state){
            btn.disabled = true;
            btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Swapping...`;
        }else{
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-right-left"></i> Review Swap`;
        }
    }

    function log(msg){
        console.log("[SWAP]", msg);

        const el = document.getElementById("swapRate");
        if(el) el.innerText = msg;
    }

    // ==========================
    // DECIMALS
    // ==========================
    async function getDecimals(token){
        if(_isNative(token)) return 18;

        try{
            const c = new ethers.Contract(token, ERC20_ABI, provider);
            return await c.decimals();
        }catch{
            return 18;
        }
    }

    // ==========================
    // PARSE
    // ==========================
    async function parseAmount(token, amount){
        const dec = await getDecimals(token);
        return ethers.utils.parseUnits(amount.toString(), dec);
    }

    // ==========================
    // APPROVE
    // ==========================
    async function approveIfNeeded(token, amount, wallet){

        if(_isNative(token)) return;

        const contract = new ethers.Contract(token, ERC20_ABI, wallet);

        const allowance = await contract.allowance(wallet.address, ROUTER_ADDR);

        if(allowance.gte(amount)) return;

        log("Approving...");

        const tx = await contract.approve(
            ROUTER_ADDR,
            ethers.constants.MaxUint256
        );

        await tx.wait();

        log("Approved");
    }

    // ==========================
    // BUILD PARAMS (MATCH SOLIDITY)
    // ==========================
    async function buildParams(wallet, tokenIn, tokenOut, amountUI){

        const amountIn = await parseAmount(tokenIn, amountUI);

        const estimated = await PRICE_ENGINE.getAmountOut(
            tokenIn,
            tokenOut,
            parseFloat(amountUI)
        );

        if(!estimated || estimated <= 0){
            throw new Error("No liquidity pool");
        }

        const slippage = window.CONFIG?.SLIPPAGE_DEFAULT || 0.5;

        const minOut = estimated * (1 - slippage / 100);

        const amountOutMin = await parseAmount(
            tokenOut,
            minOut.toFixed(6)
        );

        return {
            tokenIn: _toAddress(tokenIn),
            tokenOut: _toAddress(tokenOut),
            fee: window.CONFIG?.FEE || 3000,
            recipient: wallet.address,
            deadline: Math.floor(Date.now()/1000) + 300,
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        };
    }

    // ==========================
    // MAIN SWAP
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
            setButtonLoading(true);

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

            await approveIfNeeded(
                _toAddress(tokenIn),
                params.amountIn,
                wallet
            );

            log("Swapping...");

            const tx = await router.exactInputSingle(params, {
                gasLimit: 500000
            });

            log("TX: " + tx.hash);

            const receipt = await tx.wait();

            log("Swap success");

            showToast?.("Swap success", "success");

            if(typeof loadBalance === "function"){
                loadBalance();
            }

            return receipt;

        }catch(e){

            console.error(e);
            log("Swap failed");

            showToast?.(e.message || "Swap failed", "error");

        }finally{

            isLoading = false;
            setButtonLoading(false);
        }
    }

    // ==========================
    // INIT BUTTON
    // ==========================
    function init(){

        const btn = document.getElementById("btnReviewSwap");

        if(btn){
            btn.addEventListener("click", swapExactInput);
        }
    }

    document.addEventListener("DOMContentLoaded", init);

    return {
        swapExactInput
    };

})();