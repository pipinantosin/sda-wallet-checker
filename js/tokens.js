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

    // ==========================
    // FLAG: SEDANG RENDER
    // ==========================
    window.__RENDERING_TOKEN__ = true;

    const list = Array.isArray(TOKENS) ? TOKENS : [];

    const prevValue = window.selectedToken || "native";

    // ==========================
    // RESET SELECT
    // ==========================
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
    list.forEach(t => {
        if (!t || !t.address) return;

        const opt = document.createElement("option");
        opt.value = t.address;
        opt.textContent = t.symbol || "TOKEN";
        select.appendChild(opt);
    });

    // ==========================
    // RESTORE VALUE (ANTI RESET)
    // ==========================
    const exist = [...select.options].some(o => o.value === prevValue);

    if (exist) {
        select.value = prevValue;
    } else {
        select.value = "native";
        window.selectedToken = "native";
    }

    // ==========================
    // UPDATE UI ONLY (NO RPC)
    // ==========================
    function updateUIOnly() {

        const val = select.value;
        window.selectedToken = val;

        let logo = "img/sda.png";

        if (val !== "native") {
            const token = list.find(t => t.address === val);
            if (token) {
                logo = token.logo || "img/default.png";
            }
        }

        const balImg = document.getElementById("tokenLogoBalance");
        const dropImg = document.getElementById("tokenLogoDropdown");

        if (balImg) balImg.src = logo;
        if (dropImg) dropImg.src = logo;

        syncSendTokenUI?.();
    }

    // ==========================
    // UPDATE FULL (SAFE)
    // ==========================
    let loading = false;
    let lastToken = null;

    async function updateFull() {

        const current = select.value;

        // ❌ cegah loop & spam
        if (loading || current === lastToken) return;

        loading = true;
        lastToken = current;

        updateUIOnly();

        // ==========================
        // LOAD BALANCE
        // ==========================
        try {
            if (typeof loadBalance === "function") {
                await loadBalance();
            }
        } catch (e) {
            console.warn("loadBalance error:", e);
        }

        // ==========================
        // REFRESH (ANTI LOOP)
        // ==========================
        try {
            if (
                typeof refreshAll === "function" &&
                !window.__RENDERING_TOKEN__ &&
                !window.__REFRESH_LOCK__
            ) {

                window.__REFRESH_LOCK__ = true;

                setTimeout(() => {
                    try {
                        refreshAll();
                    } catch (err) {
                        console.warn("refreshAll crash:", err);
                    } finally {
                        window.__REFRESH_LOCK__ = false;
                    }
                }, 150);
            }
        } catch (e) {
            console.warn("refreshAll error:", e);
        }

        loading = false;
    }

    // ==========================
    // EVENT (ANTI DOUBLE)
    // ==========================
    select.onchange = null;
    select.onchange = updateFull;

    // ==========================
    // INIT (JANGAN LANGSUNG RPC)
    // ==========================
    updateUIOnly();

    setTimeout(() => {
        updateFull();
    }, 200);

    // ==========================
    // SELESAI RENDER
    // ==========================
    window.__RENDERING_TOKEN__ = false;
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