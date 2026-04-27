// ==========================
// GLOBAL ETHERS CHECK
// ==========================
if (typeof ethers === "undefined") {
    console.error("❌ ethers belum load!");
}

// ==========================
// RPC BASE
// ==========================
window.RPC = window.RPC || "https://node.sidrachain.com/";

// ==========================
// GLOBAL CONFIG (SAFE MERGE MODE)
// ==========================
window.CONFIG = window.CONFIG || {};

// merge tanpa overwrite total
window.CONFIG = Object.assign(window.CONFIG, {

    // ==========================
    // NETWORK
    // ==========================
    RPC: window.RPC,
    CHAIN_ID: 97453,

    // ==========================
    // CORE DEX CONTRACTS
    // ==========================
    FACTORY: "0xCFE41fb5dA87916D84E7F22889087b4Ff7163cDE",

    ROUTER: "0x35cAC72Db00e8dAC0e4f7F8A0F53D339E0cC23fb", 
    // nanti diisi saat swap engine aktif

    MULTICALL: "0xcA11bde05977b3631167028862bE2a173976CA11",

    // ==========================
    // BASE ASSET (IMPORTANT)
    // ==========================
    WSDA: "0xE4095a910209D7BE03B55D02F40d4554B1666182",

    // ==========================
    // POOL SETTINGS
    // ==========================
    FEE: 3000,

    // ==========================
    // SYSTEM FLAGS
    // ==========================
    ENABLE_SWAP: true,
    ENABLE_FACTORY_SCAN: true,

    // ==========================
    // PERFORMANCE SETTINGS
    // ==========================
    CACHE_REFRESH_MS: 60000,
    MAX_RETRY: 4,
    RPC_TIMEOUT: 12000,
    RPC_COOLDOWN: 30000,

    // ==========================
    // UI SETTINGS
    // ==========================
    HIDE_WSDA_IN_UI: true,
    DEFAULT_NATIVE: "native",

    // ==========================
    // FUTURE ROUTER SETTINGS
    // ==========================
    SLIPPAGE_DEFAULT: 0.5,
    PRICE_IMPACT_LIMIT: 5
});

// ==========================
// PROVIDER INIT
// ==========================
window.provider =
    window.provider ||
    (typeof ethers !== "undefined"
        ? new ethers.providers.JsonRpcProvider(window.RPC)
        : null
    );

// ==========================
// CREATE WALLET FROM PRIVATE KEY
// ==========================
window.createWallet = function(privateKey) {

    if (!window.provider) {
        throw new Error("Provider belum siap");
    }

    return new ethers.Wallet(privateKey, window.provider);
};

// ==========================
// FEES ABI (ONLY FIX)
// ==========================
window.CONFIG.ABI_FEES = [
    "function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) payable returns (uint256 amount0,uint256 amount1)"
];

window.CONFIG.ABI = window.CONFIG.ABI || {};

window.CONFIG.ABI.POSITION_MANAGER = [
    "function positions(uint256 tokenId) view returns (uint96,address,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)",
    "function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) payable returns (uint256,uint256)",
    "function callStaticCollect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) view returns (uint256,uint256)"
];