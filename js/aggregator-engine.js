// =====================================
// AGGREGATOR ENGINE v3
// =====================================

window.AGGREGATOR = (() => {

    const WSDA         = () => window.CONFIG?.WSDA;
    const FEE_PER_HOP  = 0.003;
    const SLIPPAGE     = 0.005;
    const SCAN_TIMEOUT = 15000;
    const BATCH_SIZE   = 2;
    const BATCH_DELAY  = 500;
    const MAX_RESULTS  = 15;

    let _scanning    = false;
    let _lastScanKey = "";
    let _lastResults = [];
    let _panelOpen   = false;

    function _isNat(addr) { return !addr || addr === "native"; }
    function _same(a, b)  { return String(a).toLowerCase() === String(b).toLowerCase(); }

    function symbolOf(addr) {
        if (_isNat(addr)) return "SDA";
        return (window.TOKENS || []).find(t => _same(t.address, addr))?.symbol || addr.slice(0,6)+"...";
    }

    function logoOf(addr) {
        if (_isNat(addr)) return "img/sda.png";
        return (window.TOKENS || []).find(t => _same(t.address, addr))?.logo || "img/default.png";
    }

    function withTimeout(p, ms) {
        return Promise.race([p, new Promise((_,r) => setTimeout(() => r(new Error("timeout")), ms))]);
    }

function getTokenDecimals(addr) {
    if (_isNat(addr)) return 18;

    return (window.TOKENS || [])
        .find(t => _same(t.address, addr))
        ?.decimals || 18;
}

function formatTokenAmount(raw, decimals = 18) {
    if (!raw && raw !== 0) return null;

    const num = Number(raw) / (10 ** decimals);

    return isFinite(num) ? num : null;
}
    // =====================================
    // CORE SCAN
    // =====================================
    async function scanCheapestPayer(receiveToken, amountOut) {
        if (!receiveToken) return [];

        const customList = JSON.parse(localStorage.getItem("customTokens") || "[]");
        const candidates = [
            { address: "native", symbol: "SDA", logo: "img/sda.png" },
            ...customList.filter(t =>
                t.address &&
                !_same(t.address, receiveToken) &&
                !_same(t.address, WSDA()) &&
                t.symbol !== "WSDA"
            )
        ];

        const targetAmt = amountOut > 0 ? amountOut : 1;
        const panelEl   = document.getElementById("aggPanel");

        // debug helper â€” tampil langsung di panel
        const dbg = (msg) => {
            if (panelEl) panelEl.innerHTML +=
                `<div style="font-size:10px;color:#555;padding:1px 12px;">${msg}</div>`;
        };

        if (panelEl) panelEl.innerHTML =
            `<div style="padding:10px 12px;font-size:11px;color:#888;">
                Scan ${candidates.length} kandidat untuk ${symbolOf(receiveToken)}...
             </div>`;

        // baseline: berapa SDA untuk dapat 1 receiveToken
        let baselineSDACost = null;
        try {
            const sdaOut = await withTimeout(PRICE_ENGINE.getAmountOut("native", receiveToken, 1), SCAN_TIMEOUT);
            dbg(`SDA -> ${symbolOf(receiveToken)}: rate=${sdaOut}`);
            if (sdaOut > 0) baselineSDACost = targetAmt / sdaOut;
        } catch(e) {
            dbg(`baseline err: ${e.message}`);
        }

        const results = [];

        for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            const batch = candidates.slice(i, i + BATCH_SIZE);

            const batchRes = await Promise.all(batch.map(async (token) => {
                try {
                    // rate: 1 token -> berapa receiveToken
                    const rateOut = await withTimeout(
                        PRICE_ENGINE.getAmountOut(token.address, receiveToken, 1),
                        SCAN_TIMEOUT
                    );
                    dbg(`${token.symbol} -> ${symbolOf(receiveToken)}: ${rateOut}`);
                    if (!rateOut || rateOut <= 0) return null;

                    const unitsNeeded = targetAmt / rateOut;

                    // harga token dalam SDA
                    let sdaPerToken = _isNat(token.address) ? 1 : null;
                    if (!sdaPerToken) {
                        const out2 = await withTimeout(
                            PRICE_ENGINE.getAmountOut("native", token.address, 1),
                            SCAN_TIMEOUT
                        );
                        dbg(`  SDA -> ${token.symbol}: ${out2}`);
                        sdaPerToken = out2 > 0 ? (1 / out2) : null;
                    }
                    if (!sdaPerToken || sdaPerToken <= 0) return null;

                    const totalSDAEq = unitsNeeded * sdaPerToken;
                    const hops       = _isNat(token.address) ? 1 : 2;
                    const feeAdj     = Math.pow(1 - FEE_PER_HOP, hops) * (1 - SLIPPAGE);
                    const netSDAEq   = totalSDAEq / feeAdj;

                    let savingsPct = null;

if (baselineSDACost && baselineSDACost > 0) {
    savingsPct =
        ((baselineSDACost - netSDAEq) / baselineSDACost) * 100;
}


// ================================
// LIQUIDITY CHECK PER ROUTE
// ================================
let maxSafeReceive = null;
let liquidityWarn  = false;

try {
    const liq = await PRICE_ENGINE.getPoolLiquidity(
        token.address,
        receiveToken
    );

    if (liq) {

if (liq.maxSwapOut) {
    maxSafeReceive = formatTokenAmount(
        liq.maxSwapOut,
        getTokenDecimals(receiveToken)
    );
}

        else if (liq.maxSwapIn) {
            maxSafeReceive =
    formatTokenAmount(liq.maxSwapIn, getTokenDecimals(token.address))
    * rateOut;
        }

        if (maxSafeReceive && targetAmt > maxSafeReceive) {
            liquidityWarn = true;
        }
    }

} catch (e) {
    console.warn(
        "[AGG] Liquidity check fail:",
        token.symbol,
        e?.message || e
    );
}


return {
    payToken:  token.address,
    paySymbol: token.symbol || symbolOf(token.address),
    payLogo:   token.logo   || logoOf(token.address),

    unitsNeeded,
    sdaEquiv: netSDAEq,

    savings: baselineSDACost
        ? baselineSDACost - netSDAEq
        : null,

    savingsPct,
    hops,

    isSDA: _isNat(token.address),

    maxSafeReceive,
    liquidityWarn
};
                } catch(e) {
                    dbg(`${token.symbol} err: ${e.message}`);
                    return null;
                }
            }));

            results.push(...batchRes.filter(Boolean));
            if (results.length && _panelOpen) _renderIncremental(results, receiveToken, targetAmt);
            if (i + BATCH_SIZE < candidates.length) await new Promise(r => setTimeout(r, BATCH_DELAY));
        }

        results.sort((a, b) => {

    const aPenalty = a.liquidityWarn ? 999999 : 0;
    const bPenalty = b.liquidityWarn ? 999999 : 0;

    return (a.sdaEquiv + aPenalty) - (b.sdaEquiv + bPenalty);
});
        return results.slice(0, MAX_RESULTS);
    }

    // =====================================
    // RENDER
    // =====================================
    function renderPanel(results, receiveToken, targetAmt) {
        const el = document.getElementById("aggPanel");
        if (!el) return;

        if (!results?.length) {
            el.innerHTML = `<div style="padding:16px;text-align:center;color:#888;font-size:12px;">
                Tidak ada data â€” coba token lain</div>`;
            return;
        }

        const recvSym = symbolOf(receiveToken);
        const best    = results[0];

        el.innerHTML = `
            <div class="agg-header-info">
                Untuk dapat <b>${targetAmt} ${recvSym}</b> &bull;
                paling murah: <b style="color:#00d084">${best.paySymbol}</b>
            </div>
            ${results.map((r, idx) => _buildRow(r, idx, receiveToken, targetAmt)).join("")}
        `;
    }

    function _renderIncremental(results, receiveToken, targetAmt) {
        renderPanel([...results].sort((a,b) => a.sdaEquiv - b.sdaEquiv), receiveToken, targetAmt);
    }

    function _buildRow(r, idx, receiveToken, targetAmt) {
    const isBest  = idx === 0;
    const cheaper = r.savingsPct !== null && r.savingsPct > 0.5;
    const pricier = r.savingsPct !== null && r.savingsPct < -0.5;

    const badge = r.isSDA
        ? `<span class="agg-tag blue">BASELINE</span>`
        : cheaper
            ? `<span class="agg-tag green">SAVE ${r.savingsPct.toFixed(1)}%</span>`
            : pricier
                ? `<span class="agg-tag red">${r.savingsPct.toFixed(1)}%</span>`
                : "";

    const unitsDisplay = r.unitsNeeded < 0.000001
        ? r.unitsNeeded.toExponential(3)
        : r.unitsNeeded.toFixed(6).replace(/\.?0+$/, "");

    const sdaDisplay = Number(r.sdaEquiv || 0).toFixed(4);

        // Liquidity warning
        // =====================================
// LIQUIDITY DISPLAY
// =====================================
const hasLiqData = r.maxSafeReceive !== null && r.maxSafeReceive !== undefined;

const liqWarnHTML = hasLiqData
    ? `
        <div class="agg-liq"
             style="
                font-size:11px;
                margin-top:4px;
                color:${r.liquidityWarn ? '#ff4d4f' : '#888'};
             ">
            <i class="fa-solid ${
                r.liquidityWarn
                    ? 'fa-triangle-exclamation'
                    : 'fa-droplet'
            }"></i>
            ${
                r.liquidityWarn
                    ? 'Max Aman'
                    : 'Liq OK'
            }:
            ~${Number(r.maxSafeReceive).toLocaleString(undefined,{
    maximumFractionDigits:2
})}
            ${symbolOf(receiveToken)}
        </div>
    `
    : "";

return `
    <div class="agg-row
                ${isBest ? 'agg-best' : ''}
                ${r.liquidityWarn ? 'agg-liq-danger' : ''}"
         onclick="AGGREGATOR.usePayToken(
             '${r.payToken}',
             '${receiveToken}',
             ${targetAmt}
         )">

        <div class="agg-row-left">

            <img src="${r.payLogo}"
                 onerror="this.src='img/default.png'"
                 style="
                    width:28px;
                    height:28px;
                    border-radius:50%;
                    flex-shrink:0;
                    object-fit:contain;
                 ">

            <div>
                <div class="agg-path">
                    Bayar dengan <b>${r.paySymbol}</b>
                </div>

                <div class="agg-meta">
                    ${unitsDisplay} ${r.paySymbol}
                    &equiv; ${sdaDisplay} SDA
                </div>

                ${liqWarnHTML}

            </div>
        </div>

        <div class="agg-row-right">

            ${badge}

            ${
                isBest && !r.isSDA && !r.liquidityWarn
                    ? '<div class="agg-best-tag">BEST</div>'
                    : ''
            }

            ${
                r.liquidityWarn
                    ? '<div class="agg-best-tag" style="background:#ff4d4f;">TIPIS</div>'
                    : ''
            }

        </div>
    </div>
`;
    }

    // =====================================
    // USE PAY TOKEN
    // =====================================
    function usePayToken(payToken, receiveToken, targetAmt) {
        window.swapState.payToken = payToken;

        const paySymEl  = document.getElementById("payTokenSymbol");
        const payIconEl = document.getElementById("payTokenIcon");
        if (paySymEl)  paySymEl.innerText = symbolOf(payToken);
        if (payIconEl) payIconEl.src      = logoOf(payToken);

        _calcPayAmount(payToken, receiveToken, targetAmt);
        showToast?.(`Bayar dengan ${symbolOf(payToken)}`, "success");
        if (window.innerWidth < 520) {
            const w = document.getElementById("aggPanelWrap");
            if (w) w.style.display = "none";
            _panelOpen = false;
        }
    }

    async function _calcPayAmount(payToken, receiveToken, targetAmt) {
        try {
            const rate = await PRICE_ENGINE.getAmountOut(payToken, receiveToken, 1);
            if (!rate || rate <= 0) return;
            const payInput  = document.getElementById("payAmount");
            const recvInput = document.getElementById("receiveAmount");
            if (payInput)  payInput.value  = (targetAmt / rate).toFixed(6);
            if (recvInput) recvInput.value = Number(targetAmt).toFixed(6);
        } catch {}
    }

    // =====================================
    // TOGGLE
    // =====================================
    function togglePanel() {
        const wrap = document.getElementById("aggPanelWrap");
        if (!wrap) return;
        _panelOpen = !_panelOpen;
        wrap.style.display = _panelOpen ? "block" : "none";
        const btn = document.getElementById("aggToggleBtn");
        if (btn) btn.innerHTML = `<i class="fa-solid fa-magnifying-glass-dollar"></i> Best Price
            <i class="fa-solid fa-chevron-${_panelOpen?'up':'down'}" style="font-size:10px;margin-left:4px;"></i>`;
        if (_panelOpen) triggerScan();
    }

    // =====================================
    // TRIGGER SCAN
    // =====================================
    async function triggerScan() {
        if (_scanning) return;

        const receiveToken = window.swapState?.receiveToken;
        const amount       = parseFloat(document.getElementById("payAmount")?.value) || 1;

        if (!receiveToken) return;

        const scanKey = `${receiveToken}_${amount}`;
        if (scanKey === _lastScanKey && _lastResults.length) {
            renderPanel(_lastResults, receiveToken, amount);
            return;
        }

        _scanning    = true;
        _lastScanKey = scanKey;
        _setBadge("...");

        try {
            const results = await scanCheapestPayer(receiveToken, amount);

            // Enrich dengan data likuiditas
            const enriched = window.LIQUIDITY_CHECK
                ? await window.LIQUIDITY_CHECK.enrichWithLiquidity(results, receiveToken)
                : results;

            _lastResults  = enriched;
            renderPanel(enriched, receiveToken, amount);
            const cheaper = enriched.filter(r => !r.isSDA && r.savingsPct > 0.5).length;
            _setBadge(cheaper > 0 ? cheaper : enriched.length);
        } catch(e) {
            const p = document.getElementById("aggPanel");
            if (p) p.innerHTML = `<div style="padding:12px;color:#f66;font-size:12px;">Error: ${e.message}</div>`;
        } finally {
            _scanning = false;
        }
    }

    function _setBadge(val) {
        const b = document.getElementById("aggBadge");
        if (!b) return;
        b.textContent  = val;
        b.style.display = val ? "inline-block" : "none";
    }

    function rescan() { _lastScanKey = ""; triggerScan(); }

    // =====================================
    // INJECT UI
    // =====================================
    function injectUI() {
        const anchor = document.getElementById("bestRoute");
        if (!anchor) return;
        document.getElementById("arbResults")?.closest(".market-scan-box")?.remove();

        anchor.innerHTML = `
            <div class="agg-toggle-row">
                <button id="aggToggleBtn" class="agg-toggle-btn" onclick="AGGREGATOR.togglePanel()">
                    <i class="fa-solid fa-magnifying-glass-dollar"></i> Best Price
                    <i class="fa-solid fa-chevron-down" style="font-size:10px;margin-left:4px;"></i>
                </button>
                <span id="aggBadge" class="agg-badge" style="display:none;"></span>
                <button class="agg-rescan-btn" onclick="AGGREGATOR.rescan()" title="Rescan">
                    <i class="fa-solid fa-rotate"></i>
                </button>
            </div>
            <div id="aggPanelWrap" style="display:none;">
                <div id="aggPanel" class="agg-panel">
                    <div style="padding:14px;text-align:center;color:#888;font-size:12px;">
                        Pilih token yang ingin dibeli dulu
                    </div>
                </div>
            </div>`;
    }

    // =====================================
    // WATCHER
    // =====================================
    function initWatcher() {
        let lastKey = "";
        setInterval(() => {
            if (!_panelOpen) return;
            const rt  = window.swapState?.receiveToken;
            const amt = document.getElementById("payAmount")?.value || "1";
            const key = `${rt}_${amt}`;
            if (key !== lastKey) { lastKey = key; triggerScan(); }
        }, 1500);
    }

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => { injectUI(); initWatcher(); }, 600);
    });

    return { togglePanel, triggerScan, rescan, usePayToken, scanCheapestPayer };

})();