// =====================================
// AGGREGATOR ENGINE v2
// Multi-hop route finder + executor
// =====================================

window.AGGREGATOR = (() => {

    // =====================================
    // CONFIG
    // =====================================
    const WSDA          = () => window.CONFIG?.WSDA;
    const ROUTE_HUBS    = () => [
        window.CONFIG?.WSDA,
        "0xb8d7fb85c4BF32f418715Dcb9eBF88107eE73CB7", // IFC
        "0xEEd87C64D1650A824F8589adcB76a13A692E2EA8"  // SGHC
    ].filter(Boolean);

    const FEE_PER_HOP   = 0.003;   // 0.3% per pool
    const SLIPPAGE      = 0.005;   // 0.5%
    const SCAN_TIMEOUT  = 8000;    // ms per token scan
    const MAX_RESULTS   = 20;

    let   _scanning     = false;
    let   _lastScanKey  = "";
    let   _lastResults  = [];
    let   _panelOpen    = false;


    // =====================================
    // HELPERS
    // =====================================
    function isNative(addr) {
        return !addr || addr === "native";
    }

    function toWrap(addr) {
        return isNative(addr) ? WSDA() : addr;
    }

    function same(a, b) {
        return String(a).toLowerCase() === String(b).toLowerCase();
    }

    function symbolOf(addr) {
        if (isNative(addr)) return "SDA";
        return (window.TOKENS || []).find(t => same(t.address, addr))?.symbol || addr.slice(0, 6) + "...";
    }

    function logoOf(addr) {
        if (isNative(addr)) return "img/sda.png";
        const t = (window.TOKENS || []).find(x => same(x.address, addr));
        return t?.logo || "img/default.png";
    }

    function feeForHops(n) {
        // compound fee deduction: (1 - fee)^n
        return 1 - Math.pow(1 - FEE_PER_HOP, n);
    }

    function withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), ms)
            )
        ]);
    }


    // =====================================
    // ROUTE SIMULATION
    // Coba semua kemungkinan path:
    // direct, via setiap hub, via 2 hub
    // =====================================
    async function simulateBestRoute(tokenIn, tokenOut, amountIn) {

        const tIn  = toWrap(tokenIn);
        const tOut = toWrap(tokenOut);

        if (same(tIn, tOut)) return null;

        const hubs    = ROUTE_HUBS().filter(h => !same(h, tIn) && !same(h, tOut));
        const routes  = [
            [tIn, tOut],                           // direct
            ...hubs.map(h => [tIn, h, tOut]),      // 1 hop via hub
            ...hubs.flatMap((h1, i) =>             // 2 hop via 2 hubs
                hubs.slice(i + 1).map(h2 => [tIn, h1, h2, tOut])
            )
        ];

        let bestOut   = 0;
        let bestRoute = null;
        let bestNet   = 0;

        const tasks = routes.map(async (route) => {
            try {
                let out = amountIn;

                for (let i = 0; i < route.length - 1; i++) {
                    out = await withTimeout(
                        PRICE_ENGINE.getAmountOut(route[i], route[i + 1], out),
                        SCAN_TIMEOUT
                    );
                    if (!out || out <= 0) return;
                }

                const hops    = route.length - 1;
                const netFee  = feeForHops(hops);
                const netOut  = out * (1 - netFee) * (1 - SLIPPAGE);

                if (netOut > bestNet) {
                    bestOut   = out;
                    bestNet   = netOut;
                    bestRoute = route;
                }
            } catch { /* skip failed route */ }
        });

        await Promise.all(tasks);

        if (!bestRoute) return null;

        return {
            route:    bestRoute,
            rawOut:   bestOut,
            netOut:   bestNet,
            hops:     bestRoute.length - 1,
            path:     bestRoute.map(symbolOf).join(" â†’ ")
        };
    }


    // =====================================
    // SCAN ALL TOKENS
    // Untuk setiap token T di tokens.json:
    // hitung rute: payToken â†’ T â†’ receiveToken
    // vs direct: payToken â†’ receiveToken
    // =====================================
    async function scanAllRoutes(payToken, receiveToken, amountIn) {

        const allTokens = (window.DEFAULT_TOKENS || window.TOKENS || [])
            .filter(t =>
                t.address &&
                !same(t.address, payToken) &&
                !same(t.address, receiveToken) &&
                !same(t.address, WSDA()) &&
                t.symbol !== "WSDA"
            );

        // tambah SDA native kalau bukan sudah pay/receive
        const candidates = [
            ...(isNative(payToken) || isNative(receiveToken)
                ? [] : [{ address: "native", symbol: "SDA" }]),
            ...allTokens
        ];

        // baseline: direct route
        const baseline = await simulateBestRoute(payToken, receiveToken, amountIn);

        const results = [];

        // scan parallel tapi batasi 5 sekaligus
        const BATCH = 5;
        for (let i = 0; i < candidates.length; i += BATCH) {
            const batch = candidates.slice(i, i + BATCH);

            const batchResults = await Promise.all(batch.map(async (mid) => {
                try {
                    // route: pay â†’ mid â†’ receive
                    const midOut = await withTimeout(
                        PRICE_ENGINE.getAmountOut(payToken, mid.address, amountIn),
                        SCAN_TIMEOUT
                    );
                    if (!midOut || midOut <= 0) return null;

                    const finalOut = await withTimeout(
                        PRICE_ENGINE.getAmountOut(mid.address, receiveToken, midOut),
                        SCAN_TIMEOUT
                    );
                    if (!finalOut || finalOut <= 0) return null;

                    const hops   = 2;
                    const netFee = feeForHops(hops);
                    const netOut = finalOut * (1 - netFee) * (1 - SLIPPAGE);

                    const baselineNet = baseline?.netOut || 0;
                    const improvement = baselineNet > 0
                        ? ((netOut - baselineNet) / baselineNet) * 100
                        : 0;

                    return {
                        via:         mid.address,
                        viaSymbol:   mid.symbol || symbolOf(mid.address),
                        viaLogo:     logoOf(mid.address),
                        rawOut:      finalOut,
                        netOut,
                        hops,
                        improvement,
                        path:        `${symbolOf(payToken)} â†’ ${mid.symbol || symbolOf(mid.address)} â†’ ${symbolOf(receiveToken)}`
                    };
                } catch { return null; }
            }));

            results.push(...batchResults.filter(Boolean));
        }

        // tambahkan baseline sebagai opsi
        if (baseline) {
            results.unshift({
                via:         null,
                viaSymbol:   "Direct",
                viaLogo:     null,
                rawOut:      baseline.rawOut,
                netOut:      baseline.netOut,
                hops:        baseline.hops,
                improvement: 0,
                path:        baseline.path,
                isDirect:    true
            });
        }

        // sort: netOut tertinggi di atas
        results.sort((a, b) => b.netOut - a.netOut);

        return results.slice(0, MAX_RESULTS);
    }


    // =====================================
    // RENDER PANEL
    // =====================================
    function renderPanel(results, payToken, receiveToken, amountIn) {
        const el = document.getElementById("aggPanel");
        if (!el) return;

        if (!results?.length) {
            el.innerHTML = `
                <div style="padding:16px;text-align:center;color:#888;font-size:13px;">
                    No routes found
                </div>`;
            return;
        }

        const best = results[0];

        el.innerHTML = `
            <div style="padding:12px 0 6px;font-size:11px;color:#666;text-align:center;">
                ${results.length} routes found &bull; Best: ${best.path}
            </div>
            ${results.map((r, idx) => _renderRow(r, idx, payToken, receiveToken, amountIn)).join("")}
        `;
    }

    function _renderRow(r, idx, payToken, receiveToken, amountIn) {
        const isBest = idx === 0;
        const isPos  = r.improvement > 0;
        const color  = r.isDirect
            ? "#58a6ff"
            : isPos ? "#00d084" : "#888";

        const improvText = r.isDirect
            ? "baseline"
            : (r.improvement > 0
                ? `+${r.improvement.toFixed(2)}%`
                : `${r.improvement.toFixed(2)}%`);

        const netDisplay = r.netOut > 0
            ? r.netOut.toFixed(6)
            : "â€“";

        const viaIcon = r.viaLogo
            ? `<img src="${r.viaLogo}" onerror="this.src='img/default.png'"
                    style="width:16px;height:16px;border-radius:50%;margin-right:4px;vertical-align:middle;">`
            : "";

        return `
            <div class="agg-row ${isBest ? 'agg-best' : ''}"
                 onclick="AGGREGATOR.useRoute('${r.via || ''}', '${payToken}', '${receiveToken}', ${amountIn})">

                <div class="agg-row-left">
                    ${viaIcon}
                    <div>
                        <div class="agg-path">${r.path}</div>
                        <div class="agg-meta">${r.hops} hop${r.hops > 1 ? 's' : ''} &bull; after fees</div>
                    </div>
                </div>

                <div class="agg-row-right">
                    <div class="agg-out">${netDisplay} ${symbolOf(receiveToken)}</div>
                    <div class="agg-improve" style="color:${color}">${improvText}</div>
                    ${isBest ? '<div class="agg-best-tag">BEST</div>' : ''}
                </div>

            </div>
        `;
    }


    // =====================================
    // USE ROUTE â€” set swap state ke route terbaik
    // =====================================
    function useRoute(viaAddr, payToken, receiveToken, amountIn) {
        if (viaAddr && viaAddr !== "null") {
            // set intermediate via swapState hint
            window.swapState._aggVia = viaAddr;
            showToast?.(`Route via ${symbolOf(viaAddr)} dipilih`, "success");
        } else {
            window.swapState._aggVia = null;
            showToast?.("Direct route dipilih", "success");
        }

        // update receive estimate di swap modal
        _updateSwapEstimate(payToken, receiveToken, amountIn, viaAddr || null);

        closePanelIfMobile();
    }

    async function _updateSwapEstimate(payToken, receiveToken, amountIn, via) {
        const outEl = document.getElementById("receiveAmount");
        if (!outEl) return;

        try {
            let out = amountIn;

            if (via) {
                const mid = await PRICE_ENGINE.getAmountOut(payToken, via, amountIn);
                out = await PRICE_ENGINE.getAmountOut(via, receiveToken, mid);
            } else {
                out = await PRICE_ENGINE.getAmountOut(payToken, receiveToken, amountIn);
            }

            const hops   = via ? 2 : 1;
            const net    = out * (1 - feeForHops(hops)) * (1 - SLIPPAGE);

            if (typeof getRealisticOut === "function") {
                outEl.value = getRealisticOut(amountIn, net).toFixed(6);
            } else {
                outEl.value = net.toFixed(6);
            }
        } catch { /* ignore */ }
    }


    // =====================================
    // PANEL TOGGLE
    // =====================================
    function togglePanel() {
        const wrap = document.getElementById("aggPanelWrap");
        if (!wrap) return;

        _panelOpen = !_panelOpen;
        wrap.style.display = _panelOpen ? "block" : "none";

        const btn = document.getElementById("aggToggleBtn");
        if (btn) {
            btn.innerHTML = _panelOpen
                ? '<i class="fa-solid fa-chart-line"></i> Routes <i class="fa-solid fa-chevron-up" style="font-size:10px;margin-left:4px;"></i>'
                : '<i class="fa-solid fa-chart-line"></i> Routes <i class="fa-solid fa-chevron-down" style="font-size:10px;margin-left:4px;"></i>';
        }

        // trigger scan saat panel dibuka
        if (_panelOpen) triggerScan();
    }

    function closePanelIfMobile() {
        // tutup panel di mobile setelah pilih route
        if (window.innerWidth < 480) {
            const wrap = document.getElementById("aggPanelWrap");
            if (wrap) wrap.style.display = "none";
            _panelOpen = false;
        }
    }


    // =====================================
    // TRIGGER SCAN
    // =====================================
    async function triggerScan() {
        if (_scanning) return;

        const payToken     = window.swapState?.payToken;
        const receiveToken = window.swapState?.receiveToken;
        const amountRaw    = document.getElementById("payAmount")?.value;
        const amountIn     = parseFloat(amountRaw);

        if (!payToken || !receiveToken) return;
        if (same(payToken, receiveToken)) return;

        const amount = (!amountIn || amountIn <= 0) ? 1 : amountIn;
        const scanKey = `${payToken}_${receiveToken}_${amount}`;

        // skip kalau sama persis
        if (scanKey === _lastScanKey && _lastResults.length) {
            renderPanel(_lastResults, payToken, receiveToken, amount);
            return;
        }

        _scanning   = true;
        _lastScanKey = scanKey;

        const panelEl = document.getElementById("aggPanel");
        if (panelEl) panelEl.innerHTML = `
            <div style="padding:16px;text-align:center;">
                <i class="fa-solid fa-spinner fa-spin" style="color:#ff7a00;"></i>
                <span style="color:#888;font-size:12px;margin-left:8px;">Scanning ${(window.DEFAULT_TOKENS || window.TOKENS || []).length} tokens...</span>
            </div>`;

        // update badge
        _setBadge("...");

        try {
            const results = await scanAllRoutes(payToken, receiveToken, amount);
            _lastResults  = results;

            renderPanel(results, payToken, receiveToken, amount);

            // badge: jumlah route profitable
            const profitable = results.filter(r => r.improvement > 0).length;
            _setBadge(profitable > 0 ? profitable : results.length);

        } catch (e) {
            console.warn("Aggregator scan error:", e);
            if (panelEl) panelEl.innerHTML =
                `<div style="padding:12px;color:#f66;font-size:12px;">Scan gagal: ${e.message}</div>`;
        } finally {
            _scanning = false;
        }
    }

    function _setBadge(val) {
        const badge = document.getElementById("aggBadge");
        if (!badge) return;
        badge.textContent = val;
        badge.style.display = val ? "inline-block" : "none";
    }


    // =====================================
    // INJECT UI KE SWAP MODAL
    // =====================================
    function injectUI() {
        // cari anchor di swap modal
        const anchor = document.getElementById("bestRoute");
        if (!anchor) return;

        anchor.innerHTML = `
            <div class="agg-toggle-row">
                <button id="aggToggleBtn" class="agg-toggle-btn" onclick="AGGREGATOR.togglePanel()">
                    <i class="fa-solid fa-chart-line"></i> Routes
                    <i class="fa-solid fa-chevron-down" style="font-size:10px;margin-left:4px;"></i>
                </button>
                <span id="aggBadge" class="agg-badge" style="display:none;">0</span>
                <button class="agg-rescan-btn" onclick="AGGREGATOR.rescan()" title="Rescan">
                    <i class="fa-solid fa-rotate"></i>
                </button>
            </div>

            <div id="aggPanelWrap" style="display:none;">
                <div id="aggPanel" class="agg-panel">
                    <div style="padding:16px;text-align:center;color:#888;font-size:12px;">
                        Pilih token dan jumlah dulu
                    </div>
                </div>
            </div>
        `;
    }


    // =====================================
    // RESCAN (manual)
    // =====================================
    function rescan() {
        _lastScanKey = ""; // force rescan
        triggerScan();
    }


    // =====================================
    // WATCHER â€” auto trigger saat token / amount berubah
    // =====================================
    function initWatcher() {
        let lastKey = "";

        setInterval(() => {
            if (!_panelOpen) return;

            const pt = window.swapState?.payToken;
            const rt = window.swapState?.receiveToken;
            const amt = document.getElementById("payAmount")?.value || "1";
            const key = `${pt}_${rt}_${amt}`;

            if (key !== lastKey) {
                lastKey = key;
                triggerScan();
            }
        }, 1200);
    }


    // =====================================
    // INIT
    // =====================================
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
            injectUI();
            initWatcher();
        }, 500);
    });


    // =====================================
    // PUBLIC API
    // =====================================
    return {
        togglePanel,
        triggerScan,
        rescan,
        useRoute,
        scanAllRoutes,
        simulateBestRoute
    };

})();
