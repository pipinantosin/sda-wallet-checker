// =====================================
// PRIVATE KEY WALLET MODULE (CLEAN)
// =====================================

window.pkWallet = null;
window.pkProvider = window.pkProvider || new ethers.providers.JsonRpcProvider(
    "https://node.sidrachain.com"
);

// ===============================
// INIT PRIVATE KEY INPUT
// ===============================
function initPrivateKeyWallet() {

    const input = document.getElementById("walletPK");
    if (!input) return;

    input.addEventListener("input", (e) => {

        const pk = e.target.value.trim();

        // reset kalau kosong
        if (!pk || pk.length < 20) {
            window.pkWallet = null;
            console.log("PK Wallet cleared");
            return;
        }

        try {
            const wallet = new ethers.Wallet(pk, window.pkProvider);

            window.pkWallet = wallet;

            console.log("✔ PK Wallet aktif:", wallet.address);

            // OPTIONAL: auto fill address input
            const addrInput = document.getElementById("address");
            if (addrInput) addrInput.value = wallet.address;

            // trigger balance kalau ada function lama
            if (typeof loadBalance === "function") {
                loadBalance();
            }

        } catch (err) {
            console.warn("❌ Private Key invalid");
            window.pkWallet = null;
        }
    });
}

// ===============================
// GET ACTIVE WALLET (SAFE)
// ===============================
function getPKWallet() {
    return window.pkWallet;
}

// ===============================
// SEND TRANSACTION (PK ONLY)
// ===============================
async function sendWithPrivateKey(to, amount, tokenAddress = null) {

    const wallet = getPKWallet();

    if (!wallet) {
        alert("Private key belum diinput");
        return;
    }

    try {

        // =========================
        // NATIVE TOKEN
        // =========================
        if (!tokenAddress) {

            const tx = await wallet.sendTransaction({
                to,
                value: ethers.utils.parseEther(amount)
            });

            alert("TX SENT:\n" + tx.hash);
            return tx;
        }

        // =========================
        // ERC20 TOKEN
        // =========================
        const abi = [
            "function transfer(address to,uint amount) returns (bool)"
        ];

        const contract = new ethers.Contract(
            tokenAddress,
            abi,
            wallet
        );

        const tx = await contract.transfer(
            to,
            ethers.utils.parseUnits(amount, 18)
        );

        alert("TX SENT:\n" + tx.hash);
        return tx;

    } catch (err) {
        console.error(err);
        alert("Send gagal");
    }
}

// ===============================
// BALANCE CHECK (PK ONLY)
// ===============================
async function getPKBalance(tokenAddress = null) {

    const wallet = getPKWallet();
    if (!wallet) return null;

    try {

        // NATIVE
        if (!tokenAddress) {
            const bal = await window.pkProvider.getBalance(wallet.address);
            return ethers.utils.formatEther(bal);
        }

        // TOKEN
        const abi = [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];

        const contract = new ethers.Contract(
            tokenAddress,
            abi,
            window.pkProvider
        );

        const [bal, dec] = await Promise.all([
            contract.balanceOf(wallet.address),
            contract.decimals().catch(() => 18)
        ]);

        return ethers.utils.formatUnits(bal, dec);

    } catch (err) {
        console.warn("Balance error", err);
        return null;
    }
}

// ===============================
// AUTO INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    initPrivateKeyWallet();
});