window.__PK_RESTORING = false;

const PK_STORAGE_KEY = "sda_pk_wallet";

// =====================================
// PRIVATE KEY WALLET MODULE (CLEAN + FIXED)
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

        if (!pk || pk.length < 20) {
            window.pkWallet = null;
            return;
        }

        try {

            const wallet = new ethers.Wallet(pk, window.pkProvider);
            window.pkWallet = wallet;

            console.log("✔ PK Wallet aktif:", wallet.address);

            

            // ==========================
            // 🔥 CORE FIX: INSERT INTO WALLET LIST
            // ==========================
            if (!window.__PK_RESTORING) {
    syncPKToWalletList(pk, wallet.address);
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

        // =========================
        // NATIVE
        // =========================
        if (!tokenAddress) {

            const bal = await window.pkProvider.getBalance(wallet.address);
            return ethers.utils.formatEther(bal);
        }

        // =========================
        // TOKEN
        // =========================
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

function savePKWallet(pk, address) {
    localStorage.setItem(PK_STORAGE_KEY, JSON.stringify({
        pk: pk,
        address: address
    }));
}

function loadPKWallet() {
    try {
        window.__PK_RESTORING = true;

        const data = JSON.parse(localStorage.getItem(PK_STORAGE_KEY));
        if (!data || !data.pk) return;

        const wallet = new ethers.Wallet(data.pk, window.pkProvider);
        window.pkWallet = wallet;

        console.log("✔ PK AUTO RESTORE:", wallet.address);

        const select = document.getElementById("walletSelect");

        if (select) {
            const wallets = getWallets?.() || [];
            const index = wallets.findIndex(
                w => w.address?.toLowerCase() === wallet.address.toLowerCase()
            );

            if (index !== -1) {
                select.value = String(index);
            }
        }

        updateActiveWalletName?.();
        loadBalance?.();

    } catch (e) {
        console.warn("PK load failed", e);
    } finally {
        window.__PK_RESTORING = false;
    }
}


function syncPKToWalletList(pk, address) {

    if (window.__PK_RESTORING) return;

    let wallets = getWallets() || [];

    const exist = wallets.find(
        w => w.address.toLowerCase() === address.toLowerCase()
    );

    if (!exist) {

        // ==========================
        // CREATE NEW PK WALLET
        // ==========================
        wallets.push({
            address: address,
            name: "Main Wallet (PK)",
            type: "pk",
            privateKey: pk
        });

        console.log("✔ PK wallet added");

    } else {

        // ==========================
        // UPGRADE WATCH → PK
        // ==========================
        if (exist.type !== "pk") {
            exist.type = "pk";
            exist.privateKey = pk;

            console.log("✔ Wallet upgraded to PK");
        } else {
            console.log("✔ PK already exists");
        }
    }

    // ==========================
    // SAVE
    // ==========================
    setWallets(wallets);

    // ==========================
    // SET ACTIVE WALLET
    // ==========================
    const index = wallets.findIndex(
        w => w.address.toLowerCase() === address.toLowerCase()
    );

    const select = document.getElementById("walletSelect");

    if (select && index !== -1) {
        select.value = String(index);
    }

    // ==========================
    // UI REFRESH
    // ==========================
    renderWallets?.();
    renderSavedAddresses?.();
    updateActiveWalletName?.();
    loadBalance?.();
}
// ===============================
// AUTO INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {

    initPrivateKeyWallet();

    // 🔥 restore PK wallet kalau ada
    loadPKWallet();

    setTimeout(() => {
        if (typeof validateInput === "function") {
            validateInput();
        }
    }, 100);
});