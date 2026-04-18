// =====================================================
// SIDRAPULSE FACTORY ENGINE
// PRICE CACHE LAYER (SWAP + SCANNER CORE)
// =====================================================

window.FACTORY_ENGINE = (function () {

    // ==========================
    // SAFETY CHECK
    // ==========================
    if (!window.CONFIG) {
        console.error("❌ CONFIG belum tersedia");
    }

    const CONFIG = window.CONFIG || {};

    const cache = new Map();
    let initialized = false;
    let lastUpdate = 0;

    const REFRESH_MS = CONFIG.CACHE_REFRESH_MS || 60000;

    // ==========================
    // LOAD TOKENS
    // ==========================
    async function loadTokens() {
        const res = await fetch("./data/tokens.json");
        return await res.json();
    }

    // ==========================
    // FETCH POOL DATA (via SIDRAPULSE ONLY)
    // ==========================
    async function fetchPool(tokenAddr) {

        if (!window.SIDRAPULSE) {
            throw new Error("SIDRAPULSE belum ready");
        }

        return await window.SIDRAPULSE.fetchPoolDataByToken(tokenAddr);
    }

    // ==========================
    // INIT / REFRESH CACHE
    // ==========================
    async function init(force = false) {

        const now = Date.now();

        if (initialized && !force && (now - lastUpdate < REFRESH_MS)) {
            return;
        }

        initialized = true;
        lastUpdate = now;

        const tokens = await loadTokens();

        console.log("📡 FACTORY ENGINE scanning:", tokens.length);

        const tasks = tokens.map(async (t) => {

            try {

                const data = await fetchPool(t.address);

                cache.set(t.address, {
                    symbol: t.symbol,
                    address: t.address,
                    price: data?.price || 0,
                    liquidity: data?.liquidity || 0,
                    updated: Date.now()
                });

            } catch (e) {

                cache.set(t.address, {
                    symbol: t.symbol,
                    address: t.address,
                    price: 0,
                    liquidity: 0,
                    error: true
                });
            }
        });

        await Promise.all(tasks);

        console.log("✅ FACTORY ENGINE READY");
    }

    // ==========================
    // GETTERS (FAST CACHE ONLY)
    // ==========================
    function getPrice(addr) {
        return cache.get(addr)?.price || 0;
    }

    function getLiquidity(addr) {
        return cache.get(addr)?.liquidity || 0;
    }

    function getToken(addr) {
        return cache.get(addr) || null;
    }

    function getAll() {
        return Array.from(cache.values());
    }

    // ==========================
    // SWAP QUOTE ENGINE
    // ==========================
    function getQuote(tokenIn, tokenOut, amountIn) {

        const pIn = getPrice(tokenIn);
        const pOut = getPrice(tokenOut);

        if (!pIn || !pOut || !amountIn) return 0;

        return (amountIn * pIn) / pOut;
    }

    // ==========================
    // REFRESH FORCE
    // ==========================
    async function refresh() {
        return await init(true);
    }

    // ==========================
    // DEBUG
    // ==========================
    function debug() {
        console.table(getAll());
    }

    // ==========================
    // AUTO REFRESH LOOP
    // ==========================
    setInterval(() => {
        init(true);
    }, REFRESH_MS);

    // ==========================
    // EXPORT API
    // ==========================
    return {

        init,
        refresh,

        getPrice,
        getLiquidity,
        getToken,
        getAll,

        getQuote,
        debug,

        cache
    };

})();