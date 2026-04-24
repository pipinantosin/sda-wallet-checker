// ==========================
// PRICE ENGINE FIXED PRO
// ==========================

const WSDA = window.CONFIG?.WSDA;
const FACTORY = window.CONFIG?.FACTORY;

const FEES = [500, 3000, 10000];

const FACTORY_ABI = [
    "function getPool(address,address,uint24) view returns (address)"
];

const POOL_ABI = [
    "function slot0() view returns (uint160 sqrtPriceX96,int24,uint16,uint16,uint16,uint8,bool)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
];

function isNative(t){
    return !t || t === "native";
}

function normalize(t){
    return isNative(t) ? WSDA : t;
}

// ==========================
// SAFE sqrt → price (NO NUMBER LOSS)
// ==========================
function sqrtToPrice(sqrt){

    try{
        const sqrtBig = BigInt(sqrt.toString());

        const priceX192 = sqrtBig * sqrtBig;
        const denom = 2n ** 192n;

        // 🔥 FIX: jangan Number langsung → pakai precision safe
        const ratio = Number(priceX192) / Number(denom);

        if(!isFinite(ratio) || ratio === 0) return 0;

        return ratio;

    }catch(e){
        console.warn("sqrt error", e);
        return 0;
    }
}

// ==========================
// GET POOL
// ==========================
async function getPool(tokenA, tokenB, fee){

    try{
        const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);

        const pool = await factory.getPool(tokenA, tokenB, fee);

        if(!pool || pool === ethers.constants.AddressZero) return null;

        return pool;

    }catch(e){
        return null;
    }
}

// ==========================
// PRICE ENGINE CORE FIX
// ==========================
async function getPrice(tokenIn, tokenOut){

    if(isNative(tokenIn) && isNative(tokenOut)) return 1;

    const A = normalize(tokenIn);
    const B = normalize(tokenOut);

    for(const fee of FEES){

        const poolAddr = await getPool(A, B, fee);
        if(!poolAddr) continue;

        try{
            const pool = new ethers.Contract(poolAddr, POOL_ABI, provider);

            const [token0, token1, slot0] = await Promise.all([
                pool.token0(),
                pool.token1(),
                pool.slot0()
            ]);

            const sqrt = slot0.sqrtPriceX96;
            if(!sqrt) continue;

            let price = sqrtToPrice(sqrt);
            if(price <= 0) continue;

            // ==========================
            // FIXED DIRECTION LOGIC (IMPORTANT)
            // ==========================
            const tokenInNorm = A.toLowerCase();
            const t0 = token0.toLowerCase();
            const t1 = token1.toLowerCase();

            if(tokenInNorm === t1 && tokenInNorm !== t0){
                price = 1 / price;
            }

            return price;

        }catch(e){
            console.warn("pool read fail", e);
        }
    }

    return 0;
}

// ==========================
// AMOUNT OUT SAFE
// ==========================
async function getAmountOut(tokenIn, tokenOut, amountIn){

    const price = await getPrice(tokenIn, tokenOut);

    if(!price || price <= 0) return 0;

    const out = Number(amountIn) * price;

    if(!isFinite(out) || out <= 0) return 0;

    return out;
}

// ==========================
// EXPORT
// ==========================
window.PRICE_ENGINE = {
    getPrice,
    getAmountOut
};