
// ==========================
// ELEMENT (SAFE ACCESS)
// ==========================

// NOTE: jangan ambil DOM di global langsung (biar tidak "undefined order issue")
function getBalanceEl() {
    return document.getElementById("balance");
}

function getSelectEl() {
    return document.getElementById("walletSelect");
}

function getAddressInput() {
    return document.getElementById("address");
}

function getSaveBtn() {
    return document.querySelector("button[onclick='saveWallet()']");
}


// ==========================
// ASSET RENDER
// ==========================
function renderAssets() {
	
	syncCustomTokens();

    const container = document.getElementById("tab-assets");
    if (!container) return;

    const wallet = typeof getSelectedWallet === "function"
        ? getSelectedWallet()
        : null;

    if (!wallet) {
        container.innerHTML =
            "<div style='color:#888;text-align:center;'>No wallet</div>";
        return;
    }

    let html = "";

    // ======================
    // SDA CACHE SAFE
    // ======================
    const sdaCache =
        localStorage.getItem(wallet.address + "_native") ||
        "0.00 SDA";

    html += `
        <div class="asset-item">
            <div style="display:flex;align-items:center;gap:10px;">
                <img src="img/sda.png" style="width:32px;height:32px;border-radius:50%;">
                <div>
                    <b>SDA</b><br>
                    <small style="color:#888;">Native Token</small>
                </div>
            </div>
            <div>${sdaCache.replace(" SDA", "")}</div>
        </div>
    `;

    // ======================
    // CUSTOM TOKENS SAFE MODE
    // ======================
    const tokens = Array.isArray(window.customTokens)
        ? window.customTokens
        : [];

    tokens.slice(0, 10).forEach(token => {

        const cacheKey = wallet.address + "_" + token.address;

        const cached =
            localStorage.getItem(cacheKey) ||
            ("0.00 " + token.symbol);

        html += `
            <div class="asset-item">
                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${token.logo || 'img/default.png'}"
                         style="width:32px;height:32px;border-radius:50%;">
                    <div>
                        <b>${token.symbol}</b><br>
                        <small style="color:#888;">ERC20</small>
                    </div>
                </div>

                <div>
                    <span>${cached.replace(" " + token.symbol, "")}</span>
                    <button onclick="removeToken('${token.address}')">-</button>
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

    let html = `
        <input type="text" id="searchToken"
               placeholder="Cari token..."
               style="margin-bottom:10px;">
    `;

    DEFAULT_TOKENS.forEach(token => {

        const customTokens =
    JSON.parse(localStorage.getItem("customTokens") || "[]");

const isAdded = customTokens
    .some(t => t.address === token.address);

        const tokenData =
            encodeURIComponent(JSON.stringify(token));

        html += `
            <div class="asset-item token-row"
                 data-symbol="${token.symbol.toLowerCase()}">

                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${token.logo || 'img/default.png'}"
                         style="width:28px;height:28px;border-radius:50%;">
                    <div>${token.symbol}</div>
                </div>

                ${
                    isAdded
                    ? `<span style="color:#888;">Added</span>`
                    : `<button onclick='addTokenFromList(JSON.parse(decodeURIComponent("${tokenData}")))'
                               style="width:auto;">+</button>`
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

    if (tabBtn) tabBtn.classList.add("active");

    const tabContent = document.getElementById("tab-" + tab);
    if (tabContent) tabContent.classList.add("active");

    if (tab === "assets") renderAssets();
    if (tab === "tokens") renderTokenTab();
    if (tab === "lp") renderLP();
}


// ==========================
// LP LIST UI
// ==========================
function renderLPList() {

    const container = document.getElementById("lpList");
    const list = getLPs();

    if (!list || list.length === 0) {
        container.innerHTML =
            "<div style='text-align:center;color:#888;'>No LP added</div>";
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
                        Remove
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}