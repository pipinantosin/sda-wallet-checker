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

    const tokens = window.TOKENS || [];

    tokens.forEach(t => {

        const opt = document.createElement("option");

        opt.value = t.address;
        opt.textContent = `${t.symbol}`;

        //  icon tetap aman (PNG SYSTEM TIDAK DIHAPUS)
        opt.dataset.icon = t.logo || "img/default.png";

        select.appendChild(opt);
    });

    select.value = window.selectedToken || "native";

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


// ======================================================
//  ADD TOKEN
// ======================================================
function addToken(symbol, address){

    symbol = symbol.trim().toUpperCase();
    address = address.trim();

    if (!ethers.utils.isAddress(address)) {
        alert("Invalid contract address");
        return;
    }

    const exists = window.TOKENS.find(
        t => t.address.toLowerCase() === address.toLowerCase()
    );

    if (exists){
        alert("Token already added");
        return;
    }

    const newToken = normalizeToken({
        symbol,
        address
    });

    customTokens.push(newToken);

    saveTokens();
    rebuildTokens();

    renderTokenList();
}

// ======================================================
//  REMOVE TOKEN
// ======================================================
function removeToken(address){

    customTokens = customTokens.filter(
        t => t.address.toLowerCase() !== address.toLowerCase()
    );

    saveTokens();
    rebuildTokens();

    renderTokenList();
}

function openTokenDropdown(target){

    const tokens = window.TOKENS || [];

    let html = "";

    tokens.forEach(t => {

        html += `
            <div class="token-item"
                 data-address="${t.address}"
                 data-symbol="${t.symbol.toLowerCase()}">

                <img src="${t.logo || 'img/default.png'}">

                <div>
                    <b>${t.symbol}</b><br>
                    <small style="color:#888;">${t.name}</small>
                </div>

            </div>
        `;
    });

    const box = document.createElement("div");
    box.id = "tokenPopup";

    box.innerHTML = `
        <div class="popup-bg"></div>

        <div class="popup">

            <div class="token-search">
                <input id="tokenSearchInput" placeholder="Search token...">
            </div>

            <div id="tokenList">
                ${html}
            </div>

        </div>
    `;

    document.body.appendChild(box);

    const input = box.querySelector("#tokenSearchInput");
    const list = box.querySelector("#tokenList");

    // ==========================
    // SEARCH FILTER
    // ==========================
    input.addEventListener("input", (e) => {

        const keyword = e.target.value.toLowerCase();

        list.querySelectorAll(".token-item").forEach(item => {

            const symbol = item.dataset.symbol;

            item.style.display =
                symbol.includes(keyword) ? "flex" : "none";
        });
    });

    // ==========================
    // SELECT TOKEN ( CORE FIX)
    // ==========================
    box.addEventListener("click", (e) => {

        if (e.target.classList.contains("popup-bg")) {
            box.remove();
            return;
        }

        const item = e.target.closest(".token-item");
        if (!item) return;

        const addr = item.dataset.address;

        // ==========================
        //  1 SOURCE OF TRUTH
        // ==========================
        window.activeToken = addr;
        localStorage.setItem("selectedToken", addr);

        // ==========================
        // UPDATE SYSTEM HOME + SEND
        // ==========================
        setGlobalToken(addr);     // sync home
        setSendToken(addr);       // sync send

        // ==========================
        // FORCE UI UPDATE ALL
        // ==========================
        syncSendTokenUI?.();
        updateSendBalance?.();
        loadBalance?.();
        renderAssets?.();

        box.remove();
    });
}

document.getElementById("tokenSelect")?.addEventListener("mousedown", (e) => {
    e.preventDefault(); //  STOP native dropdown
    openTokenDropdown("home");
});

document.getElementById("sendTokenSelect")?.addEventListener("mousedown", (e) => {
    e.preventDefault(); //  STOP native dropdown
    openTokenDropdown("send");
});

// ======================================================
//  SAVE CUSTOM TOKENS
// ======================================================
function saveTokens(){
    localStorage.setItem("customTokens", JSON.stringify(customTokens));
}

// ======================================================
//  RENDER CUSTOM TOKEN LIST (MANAGER PAGE)
// ======================================================
function renderTokenList(){

    const list = document.getElementById("token-list");
    if (!list) return;

    list.innerHTML = "";

    customTokens.forEach(token => {

        const div = document.createElement("div");
        div.style.marginBottom = "6px";

        div.innerHTML = `
            <img src="${getTokenIcon(token)}"
                 style="width:16px;height:16px;margin-right:6px"
                 onerror="this.src='img/default.png'">

            <span>${token.symbol}</span>

            <button onclick="removeToken('${token.address}')">
                Remove
            </button>
        `;

        list.appendChild(div);
    });
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