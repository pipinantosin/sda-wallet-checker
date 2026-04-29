// =====================================
// FACTORY ENGINE â€” Advanced Price Engine
// Router-like Estimator
// =====================================

const WSDA     = window.CONFIG?.WSDA;
const FACTORY  = window.CONFIG?.FACTORY;
const FEES     = [500, 3000, 10000];

const FACTORY_ABI = [
    "function getPool(address,address,uint24) view returns (address)"
];

const POOL_ABI = [
    "function slot0() view returns (uint160 sqrtPriceX96,int24,uint16,uint16,uint16,uint8,bool)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function liquidity() view returns (uint128)"
];


// =====================================
// HELPERS
// =====================================
function isNative(t) {
    return !t || t === "native";
}

function normalize(t) {
    return isNative(t) ? WSDA : t;
}


// =====================================
// SQRT PRICE -> RATIO
// =====================================
function sqrtToPrice(sqrt) {
    try {
        const sqrtBig    = BigInt(sqrt.toString());
        const numerator  = sqrtBig * sqrtBig;
        const denominator = 2n ** 192n;
        const SCALE      = 10n ** 18n;
        const scaled     = (numerator * SCALE) / denominator;
        const ratio      = Number(scaled) / 1e18;

        return (!isFinite(ratio) || ratio <= 0) ? 0 : ratio;
    } catch (e) {
        console.warn("sqrtToPrice error", e);
        return 0;
    }
}


// =====================================
// GET POOL ADDRESS
// =====================================
async function getPool(tokenA, tokenB, fee) {
    try {
        const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);
        const pool    = await factory.getPool(tokenA, tokenB, fee);

        if (!pool || pool === ethers.constants.AddressZero) return null;
        return pool;
    } catch {
        return null;
    }
}


// =====================================
// GET BEST POOL (highest liquidity)
// =====================================
async function getBestPool(tokenA, tokenB) {
    let best = null;

    for (const fee of FEES) {
        const poolAddr = await getPool(tokenA, tokenB, fee);
        if (!poolAddr) continue;

        try {
            const pool = new ethers.Contract(poolAddr, POOL_ABI, provider);

            const [token0, token1, slot0, liquidity] = await Promise.all([
                pool.token0(),
                pool.token1(),
                pool.slot0(),
                pool.liquidity()
            ]);

            if (!liquidity || liquidity.eq(0)) continue;

            const liq = Number(liquidity.toString());

            if (!best || liq > best.liquidity) {
                best = { fee, poolAddr, token0, token1, slot0, liquidity: liq };
            }
        } catch {}
    }

    return best;
}


// =====================================
// DIRECT PRICE
// =====================================
async function getDirectPrice(tokenIn, tokenOut) {
    const A    = normalize(tokenIn);
    const B    = normalize(tokenOut);
    const best = await getBestPool(A, B);

    if (!best) return 0;

    let price = sqrtToPrice(best.slot0.sqrtPriceX96);
    if (price <= 0) return 0;

    if (A.toLowerCase() === best.token1.toLowerCase()) {
        price = 1 / price;
    }

    price *= (1 - best.fee / 1_000_000);
    return price;
}


// =====================================
// SMART PRICE â€” direct or multihop via WSDA
// =====================================
async function getPrice(tokenIn, tokenOut) {
    if (isNative(tokenIn) && isNative(tokenOut)) return 1;

    const direct = await getDirectPrice(tokenIn, tokenOut);
    if (direct > 0) return direct;

    // fallback multihop
    const [leg1, leg2] = await Promise.all([
        getDirectPrice(tokenIn, WSDA),
        getDirectPrice(WSDA, tokenOut)
    ]);

    if (leg1 > 0 && leg2 > 0) return leg1 * leg2;

    return 0;
}


// =====================================
// AMOUNT OUT
// =====================================
async function getAmountOut(tokenIn, tokenOut, amountIn) {
    const price = await getPrice(tokenIn, tokenOut);
    if (!price || price <= 0) return 0;

    const out = Number(amountIn) * price;
    return (!isFinite(out) || out <= 0) ? 0 : out;
}


// =====================================
// EXPORT
// =====================================
window.PRICE_ENGINE = {
    getPrice,
    getAmountOut
};