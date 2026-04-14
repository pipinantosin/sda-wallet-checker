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