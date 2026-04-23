// ==========================
// HELPER LANG
// ==========================
function t(key){
    try{
        return LANG?.[CURRENT_LANG]?.[key] || key;
    }catch{
        return key;
    }
}


// ==========================
// ASSET RENDER
// ==========================
function renderAssets() {

    syncCustomTokens?.();

    const container = document.getElementById("tab-assets");
    if (!container) return;

    const wallet = getSelectedWallet?.();

    if (!wallet) {
        container.innerHTML =
            `<div style="color:#888;text-align:center;">${t("no_wallet_text")}</div>`;
        return;
    }

    let html = "";

    // ==========================
    // SDA (NATIVE)
    // ==========================
    const sdaCache =
        localStorage.getItem(wallet.address + "_native") ||
        "0.00 SDA";

    html += `
        <div class="asset-item">

            <div style="display:flex;align-items:center;gap:10px;">
                <img src="img/sda.png"
                     style="width:32px;height:32px;border-radius:50%;">

                <div>
                    <b>Sidra Digital Asset</b><br>
                    <small style="color:#888;">Native Token</small>
                </div>
            </div>

            <div>
                ${sdaCache.replace(" SDA", "")}
                <span style="color:#888;">SDA</span>
            </div>

        </div>
    `;

    // ==========================
    // ERC20 TOKENS
    // ==========================
    const tokens = Array.isArray(window.customTokens)
        ? window.customTokens
        : [];

    tokens.forEach(token => {

    const cacheKey = wallet.address + "_" + token.address;

    const cached =
        localStorage.getItem(cacheKey) ||
        ("0.00 " + token.symbol);

    const isWSDA = token.symbol === "WSDA";

    html += `
        <div class="asset-item">

            <div style="display:flex;align-items:center;gap:10px;">
                <img src="${token.icon || token.logo || 'img/default.png'}"
                     style="width:32px;height:32px;border-radius:50%;">

                <div>
                    <b>${token.name || token.symbol}</b><br>
                    <small style="color:#888;">ERC-20 Token</small>
                </div>
            </div>

            <div style="display:flex;align-items:center;gap:6px;">

                <div>
                    ${cached.replace(" " + token.symbol, "")}
                    <span style="color:#888;">${token.symbol}</span>
                </div>

                <!-- ==========================
                     UNWRAP BUTTON (ONLY WSDA)
                ========================== -->
                ${isWSDA ? `
                    <button onclick="UNWRAP_ENGINE.unwrapAll()"
                        style="
                            margin-left:8px;
                            padding:4px 8px;
                            font-size:12px;
                            background:#ffb020;
                            border:none;
                            border-radius:6px;
                        ">
                        Unwrap
                    </button>
                ` : ``}

                <button onclick="removeToken('${token.address}')"
                        class="remove-token-btn">
                    -
                </button>

            </div>

        </div>
    `;
});

    container.innerHTML = html;
}

// ==========================
// TOKEN TAB
// ==========================
function renderTokenTab() {

    syncTokenState();

    const container = document.getElementById("tab-tokens");
    if (!container) return;

    let html = `
        <input type="text" id="searchToken"
               placeholder="${t("search_token") || 'Search token...'}"
               style="margin-bottom:10px;">
    `;

    DEFAULT_TOKENS.forEach(token => {

        // ❌ ONLY SKIP SDA
        if (token.symbol === "SDA") return;

        const customTokens =
            JSON.parse(localStorage.getItem("customTokens") || "[]");

        const isAdded = customTokens
            .some(tk => tk.address === token.address);

        const tokenData =
            encodeURIComponent(JSON.stringify(token));

        html += `
            <div class="asset-item token-row"
                 data-symbol="${token.symbol.toLowerCase()}">

                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${token.icon || token.logo || 'img/default.png'}"
                         style="width:28px;height:28px;border-radius:50%;">

                    <div>
                        <b>${token.name || token.symbol}</b><br>
                        <small style="color:#888;">${token.symbol}</small>
                    </div>
                </div>

                ${
                    isAdded
                    ? `<span style="color:#888;">${t("added") || 'Added'}</span>`
                    : `<button class="add-token-btn"
                               onclick='addTokenFromList(JSON.parse(decodeURIComponent("${tokenData}")))'>
                               +
                       </button>`
                }

            </div>
        `;
    });

    container.innerHTML = html;

    initTokenSearch();
}

// ==========================
// SEARCH TOKEN
// ==========================
function initTokenSearch() {

    const input = document.getElementById("searchToken");
    if (!input) return;

    input.addEventListener("input", () => {

        const keyword = input.value.toLowerCase();

        document.querySelectorAll(".token-row").forEach(row => {

            const symbol = row.dataset.symbol;

            row.style.display =
                symbol.includes(keyword) ? "flex" : "none";
        });
    });
}


// ==========================
// TAB SWITCH
// ==========================
function switchTab(tab) {

    document.querySelectorAll(".tab")
        .forEach(el => el.classList.remove("active"));

    document.querySelectorAll(".tab-content")
        .forEach(el => el.classList.remove("active"));

    const tabBtn = document.querySelector(
        `.tab[onclick="switchTab('${tab}')"]`
    );

    tabBtn?.classList.add("active");

    const tabContent = document.getElementById("tab-" + tab);
    tabContent?.classList.add("active");

    if (tab === "assets") renderAssets();
    if (tab === "tokens") renderTokenTab();
    if (tab === "lp") renderLP?.();
}


// ==========================
// LP LIST UI
// ==========================
function renderLPList() {

    const container = document.getElementById("lpList");
    const list = getLPs?.();

    if (!list || list.length === 0) {
        container.innerHTML =
            `<div style='text-align:center;color:#888;'>${t("no_lp") || "No LP added"}</div>`;
        return;
    }

    let html = "";

    list.forEach(id => {

        html += `
            <div class="asset-item">
                <div>
                    <b>LP Position</b><br>
                    <small style="color:#888;">NFT ID: #${id}</small>
                </div>

                <div>
                    <button onclick="removeLP('${id}')"
                            style="width:auto;">
                        ${t("remove") || "Remove"}
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function toggleAddress(el){
    el.classList.toggle("address-full");
}