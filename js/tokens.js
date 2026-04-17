// ==========================
// GLOBAL TOKEN STATE
// ==========================
window.selectedToken = localStorage.getItem("selectedToken") || "native";

// ==========================
// STORAGE HELPERS
// ==========================
function getCustomTokens() {
    return JSON.parse(localStorage.getItem("customTokens") || "[]");
}

function saveCustomTokens(tokens) {
    localStorage.setItem("customTokens", JSON.stringify(tokens));
}

// ==========================
// GLOBAL TOKEN CONTROLLER (🔥 WAJIB ADA)
// ==========================
function setGlobalToken(val){

    window.selectedToken = val || "native";
    localStorage.setItem("selectedToken", window.selectedToken);

    let logo = "img/sda.png";

    if (val === "native") {

        window.selectedTokenData = {
            symbol: "SDA",
            type: "native",
            decimals: 18,
            logo: logo
        };

    } else {

        const token = (window.TOKENS || []).find(t => t.address === val);

        if (token) {
            logo = token.logo || "img/default.png";

            window.selectedTokenData = {
                ...token,
                type: "erc20",
                decimals: token.decimals || 18
            };
        }
    }

    // ==========================
    // SYNC DROPDOWN
    // ==========================
    const mainSelect = document.getElementById("tokenSelect");
    const sendSelect = document.getElementById("sendTokenSelect");

    if (mainSelect) mainSelect.value = val;
    if (sendSelect) sendSelect.value = val;

    // ==========================
    // SYNC ICON
    // ==========================
    if (window.tokenLogoBalance) {
        window.tokenLogoBalance.src = logo;
    }

    if (window.tokenLogoDropdown) {
        window.tokenLogoDropdown.src = logo;
    }

    // ==========================
    // SYNC SEND MODAL
    // ==========================
    if (typeof syncSendTokenUI === "function") syncSendTokenUI();
    if (typeof applySendTokenState === "function") applySendTokenState();

    // ==========================
    // SYNC BALANCE
    // ==========================
    if (typeof loadBalance === "function") loadBalance();
    if (typeof updateSendBalance === "function") updateSendBalance();

    // ==========================
    // SYNC UI LAIN
    // ==========================
    if (typeof renderAssets === "function") renderAssets();
}

// ==========================
// RENDER TOKEN SELECT (HOME)
// ==========================
function renderTokenSelect() {

    const select = document.getElementById("tokenSelect");
    if (!select) return;

    select.innerHTML = "";

    // ==========================
    // NATIVE TOKEN
    // ==========================
    const nativeOpt = document.createElement("option");
    nativeOpt.value = "native";
    nativeOpt.textContent = "SDA";
    select.appendChild(nativeOpt);

    // ==========================
    // TOKEN LIST
    // ==========================
    (window.TOKENS || []).forEach((t) => {

        const opt = document.createElement("option");
        opt.value = t.address;
        opt.textContent = t.symbol;

        select.appendChild(opt);
    });

    // ==========================
    // SET VALUE
    // ==========================
    select.value = window.selectedToken || "native";

    // ==========================
    // EVENT (🔥 SINGLE SOURCE)
    // ==========================
    select.onchange = (e) => {
        setGlobalToken(e.target.value);
    };
}

// ==========================
// ADD TOKEN (SAFE)
// ==========================
async function addTokenFromList(token) {

    let customTokens = getCustomTokens();

    // MAX LIMIT
    if (customTokens.length >= 10) {
        return showToast("Max 10 token", "error");
    }

    // DUPLICATE CHECK
    const exist = customTokens.find(
        t => t.address.toLowerCase() === token.address.toLowerCase()
    );

    if (exist) {
        return showToast("Sudah ditambahkan", "error");
    }

    // ADD
    customTokens.push(token);
    saveCustomTokens(customTokens);

    window.TOKENS = [...DEFAULT_TOKENS, ...customTokens];

    showToast("Token ditambahkan", "success");

    const wallet = getSelectedWallet?.();

    switchTab?.("assets");

    // ==========================
    // FETCH BALANCE
    // ==========================
    if (wallet) {

        try {

            const abi = [
                "function balanceOf(address) view returns (uint256)",
                "function decimals() view returns (uint8)"
            ];

            const contract = new ethers.Contract(
                token.address,
                abi,
                provider
            );

            const bal = await contract.balanceOf(wallet.address);

            let decimals = 18;
            try {
                decimals = await contract.decimals();
            } catch {}

            const value = parseFloat(
                ethers.utils.formatUnits(bal, decimals)
            ).toFixed(4);

            const final = value + " " + token.symbol;

            const cacheKey = wallet.address + "_" + token.address;
            localStorage.setItem(cacheKey, final);

        } catch (e) {

            const cacheKey = wallet.address + "_" + token.address;

            if (!localStorage.getItem(cacheKey)) {
                localStorage.setItem(cacheKey, "0.00 " + token.symbol);
            }
        }
    }

    // REFRESH UI
    renderAssets?.();
    renderTokenTab?.();
    renderTokenSelect?.();
}

// ==========================
// GET TOKEN DATA
// ==========================
function getTokenData(addr) {

    const token = (window.TOKENS || []).find(
        t => t.address.toLowerCase() === addr.toLowerCase()
    );

    if (token) {
        return {
            symbol: token.symbol,
            logo: token.logo || "img/default.png"
        };
    }

    return {
        symbol: addr.slice(0, 6) + "...",
        logo: "img/default.png"
    };
}