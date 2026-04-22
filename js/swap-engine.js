// ==========================
// SWAP ENGINE FINAL PRO (MULTICALL + HISTORY)
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
        "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)"
    ];

    const ERC20_ABI = [
        "function approve(address spender,uint256 amount) returns (bool)",
        "function allowance(address owner,address spender) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];

    // ==========================
    // HELPERS
    // ==========================
    function isNative(token){
        return !token || token === "native";
    }

    function toRouterAddress(token){
        return isNative(token) ? WSDA_ADDR : token;
    }

    function getWallet(){
        return getPKWallet?.() || getSelectedWallet?.() || window.wallet || null;
    }

    function setLoading(state){
        const btn = document.getElementById("btnReviewSwap");
        if(!btn) return;

        btn.disabled = state;
        btn.innerHTML = state
            ? `<i class="fa fa-spinner fa-spin"></i> Swapping...`
            : `<i class="fa-solid fa-right-left"></i> Review Swap`;
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
        if(isNative(token)) return 18;

        try{
            const c = new ethers.Contract(token, ERC20_ABI, provider);
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
    // APPROVE (OUTSIDE MULTICALL - SAFE)
    // ==========================
    async function approveIfNeeded(token, amount, wallet){

        if(isNative(token)) return;

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
    // BUILD PARAMS
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
            tokenIn: toRouterAddress(tokenIn),
            tokenOut: toRouterAddress(tokenOut),
            fee: window.CONFIG?.FEE || 3000,
            recipient: wallet.address,
            deadline: Math.floor(Date.now()/1000) + 300,
            amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        };
    }

    // ==========================
    // MAIN SWAP (MULTICALL ENGINE)
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
            // APPROVE FIRST (SAFE STANDARD)
            // ==========================
            await approveIfNeeded(
                tokenIn === "native" ? WSDA_ADDR : tokenIn,
                params.amountIn,
                wallet
            );

            // ==========================
            // MULTICALL BUILD
            // ==========================
            const iface = new ethers.utils.Interface(ROUTER_ABI);

            const calls = [];

            const swapData = iface.encodeFunctionData(
                "exactInputSingle",
                [params]
            );

            calls.push(swapData);

            log("Executing multicall...");

            const tx = await router.multicall(calls, {
                gasLimit: 900000
            });

            log("TX: " + tx.hash);

            const receipt = await tx.wait();

            if(receipt.status !== 1){
                throw new Error("Swap failed on-chain");
            }

            log("Swap success");

            showToast?.("Swap success", "success");

            // ==========================
            // HISTORY (FIXED GUARANTEED)
            // ==========================
            try{

                const history = JSON.parse(localStorage.getItem("txHistory") || "[]");

                history.unshift({
                    hash: tx.hash,
                    value: amountUI,
                    symbol: tokenOut === "native" ? "SDA" : (swapState?.receiveSymbol || "TOKEN"),
                    tokenAddress: tokenOut,
                    timestamp: Date.now()
                });

                localStorage.setItem("txHistory", JSON.stringify(history));

                renderTxHistory?.();
                updateBellBadge?.();

            }catch(e){
                console.warn("history fail", e);
            }

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
    }

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

})();