// ==========================
// GLOBAL TOKEN STATE FIX
// ==========================
window.selectedToken = window.selectedToken || "native";

function getCustomTokens() {
    return JSON.parse(localStorage.getItem("customTokens") || "[]");
}

function saveCustomTokens(tokens) {
    localStorage.setItem("customTokens", JSON.stringify(tokens));
}


// ==========================
// RENDER TOKEN SELECT
// ==========================
function renderTokenSelect() {

    const select = document.getElementById("tokenSelect");
    if (!select) return;

    select.innerHTML = "";

    // SDA default
    const nativeOpt = document.createElement("option");
    nativeOpt.value = "native";
    nativeOpt.textContent = "SDA";
    select.appendChild(nativeOpt);

    // TOKEN LIST
    (TOKENS || []).forEach((t) => {

        const opt = document.createElement("option");
        opt.value = t.address;
        opt.textContent = t.symbol;

        select.appendChild(opt);
    });

    select.value = window.selectedToken || "native";

    select.onchange = (e) => {

        const val = e.target.value;
        window.selectedToken = val;

        let logo = "img/sda.png";

        if (val !== "native") {
            const token = (TOKENS || []).find(t => t.address === val);
            if (token) logo = token.logo || "img/default.png";
        }

        if (window.tokenLogoBalance) {
            window.tokenLogoBalance.src = logo;
        }

        if (window.tokenLogoDropdown) {
            window.tokenLogoDropdown.src = logo;
        }

        refreshAll?.();
    };
}


// ==========================
// ADD TOKEN (LANG + SAFE)
// ==========================
async function addTokenFromList(token) {

    let customTokens = getCustomTokens();

    // ==========================
    // MAX LIMIT
    // ==========================
    if (customTokens.length >= 10) {
        return showToast(
            LANG?.[CURRENT_LANG]?.max_token || "Max 10 token",
            "error"
        );
    }

    // ==========================
    // DUPLICATE CHECK
    // ==========================
    const exist = customTokens.find(
        t => t.address.toLowerCase() === token.address.toLowerCase()
    );

    if (exist) {
        return showToast(
            LANG?.[CURRENT_LANG]?.token_exists || "Sudah ditambahkan",
            "error"
        );
    }

    // ==========================
    // ADD TOKEN
    // ==========================
    customTokens.push(token);
    saveCustomTokens(customTokens);

    TOKENS = [...DEFAULT_TOKENS, ...customTokens];

    showToast(
        LANG?.[CURRENT_LANG]?.token_added || "Token ditambahkan",
        "success"
    );

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

    // ==========================
    // REFRESH UI
    // ==========================
    renderAssets?.();
    renderTokenTab?.();
    renderTokenSelect?.();
}


// ==========================
// REMOVE TOKEN (ada di app.js)
// ==========================


// ==========================
// GET TOKEN DATA
// ==========================
function getTokenData(addr) {

    const token = (TOKENS || []).find(
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