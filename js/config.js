// ==========================
// GLOBAL ETHERS CHECK
// ==========================
if (typeof ethers === "undefined") {
    console.error("❌ ethers belum load!");
}

// ==========================
// RPC PROVIDER
// ==========================
window.RPC = "https://node.sidrachain.com/";

window.provider =
    (typeof ethers !== "undefined")
        ? new ethers.providers.JsonRpcProvider(window.RPC)
        : null;
        
        // ==========================
// CREATE WALLET FROM PRIVATE KEY (FIX CORE)
// ==========================
window.createWallet = function(privateKey) {

    if (!window.provider) {
        throw new Error("Provider belum siap");
    }

    return new ethers.Wallet(privateKey, window.provider);
};