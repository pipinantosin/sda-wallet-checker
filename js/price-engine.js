// ==========================
// PRICE ENGINE (STABLE)
// ==========================

const WSDA = window.CONFIG?.WSDA;
const FACTORY = window.CONFIG?.FACTORY;

const FEES = [500, 3000, 10000];

// ==========================
// ABI
// ==========================
const FACTORY_ABI = [
    "function getPool(address,address,uint24) view returns (address)"
];

const POOL_ABI = [
    "function slot0() view returns (uint160 sqrtPriceX96,int24,uint16,uint16,uint16,uint8,bool)"
];

// ==========================
// HELPERS
// ==========================
function isNative(t){
    return !t || t === "native" || t === WSDA;
}

function normalize(t){
    return isNative(t) ? WSDA : t;
}

// ==========================
// SQRT PRICE  NORMAL PRICE (FIX PRESISI)
// ==========================
function sqrtToPrice(sqrt){

    try{
        // pakai BigInt biar ga jadi e-38
        const sqrtBig = BigInt(sqrt.toString());

        // price = (sqrt^2) / 2^192
        const numerator = sqrtBig * sqrtBig;
        const denominator = 2n ** 192n;

        const price = Number(numerator) / Number(denominator);

        if(!isFinite(price)) return 0;

        return price;

    }catch(e){
        console.warn("sqrt convert error:", e);
        return 0;
    }
}

// ==========================
// FACTORY GET POOL
// ==========================
async function getPool(tokenA, tokenB, fee){

    try{
        const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);

        const pool = await factory.getPool(tokenA, tokenB, fee);

        if(!pool || pool === ethers.constants.AddressZero){
            return null;
        }

        return pool;

    }catch(e){
        console.warn("getPool error", e);
        return null;
    }
}

// ==========================
// FETCH PRICE FROM POOL
// ==========================
async function fetchPrice(poolAddr){

    try{
        const pool = new ethers.Contract(poolAddr, POOL_ABI, provider);

        const slot0 = await pool.slot0();

        const sqrt = slot0.sqrtPriceX96 || slot0[0];

        if(!sqrt) return 0;

        return sqrtToPrice(sqrt);

    }catch(e){
        console.warn("slot0 fail:", poolAddr);
        return 0;
    }
}

// ==========================
// MAIN PRICE
// ==========================
async function getPrice(tokenIn, tokenOut){

    // native  native
    if(isNative(tokenIn) && isNative(tokenOut)){
        return 1;
    }

    const tA = normalize(tokenIn);
    const tB = normalize(tokenOut);

    for(const fee of FEES){

        const pool = await getPool(tA, tB, fee);

        if(!pool) continue;

        const price = await fetchPrice(pool);

        if(price > 0){
            return price;
        }
    }

    return 0;
}

// ==========================
// AMOUNT OUT
// ==========================
async function getAmountOut(tokenIn, tokenOut, amountIn){

    const price = await getPrice(tokenIn, tokenOut);

    if(!price || price === 0) return 0;

    const result = amountIn * price;

    if(!isFinite(result)) return 0;

    return result;
}

// ==========================
// GLOBAL EXPORT
// ==========================
window.PRICE_ENGINE = {
    getPrice,
    getAmountOut
};