// ==========================
// GLOBAL RUNTIME CACHE
// ==========================
const poolAddressCache = {};
const priceCache = {};


function getAmounts(liquidity, sqrtPriceX96, tickLower, tickUpper){

    const Q96 = 2 ** 96;

    const sqrtLower = Math.pow(1.0001, tickLower / 2);
    const sqrtUpper = Math.pow(1.0001, tickUpper / 2);
    const sqrtPrice = Number(sqrtPriceX96) / Q96;

    const L = Number(liquidity);

    if(!L) return { amount0: 0, amount1: 0 };

    if(sqrtPrice <= sqrtLower){
        return {
            amount0: L * ((sqrtUpper - sqrtLower) / (sqrtLower * sqrtUpper)),
            amount1: 0
        };
    }

    if(sqrtPrice < sqrtUpper){
        return {
            amount0: L * ((sqrtUpper - sqrtPrice) / (sqrtPrice * sqrtUpper)),
            amount1: L * (sqrtPrice - sqrtLower)
        };
    }

    return {
        amount0: 0,
        amount1: L * (sqrtUpper - sqrtLower)
    };
}

async function getPoolAddress(token0, token1, fee){

    const key = `${token0}_${token1}_${fee}`;

    if(poolAddressCache[key]){
        return poolAddressCache[key];
    }

    const FACTORY = "0xCFE41fb5dA87916D84E7F22889087b4Ff7163cDE";

    const factoryAbi = [
        "function getPool(address,address,uint24) view returns (address)"
    ];

    const factory = new ethers.Contract(
        FACTORY,
        factoryAbi,
        provider
    );

    const pool = await factory.getPool(token0, token1, fee);

    poolAddressCache[key] = pool;

    return pool;
}


function getWalletSigner(){

    const wallet = getSelectedWallet();

    if(!wallet){
        throw new Error("No wallet selected");
    }

    // Wallet internal private key
    if(wallet.type === "pk" && wallet.privateKey){
        return new ethers.Wallet(
            wallet.privateKey,
            provider
        );
    }

    // Browser / injected wallet
    return provider.getSigner();
}

async function getRealClaimableFees(tokenId){

    try{

        const wallet = getSelectedWallet();

        if(!wallet?.address){
            throw new Error("walletAddress undefined!");
        }

        const NFT_CONTRACT =
            "0x8b9bCc8C722778f30146e20e44E8d8e28adD8df8";

        const contract = new ethers.Contract(
            NFT_CONTRACT,
            window.CONFIG.ABI_FEES,
            provider
        );

        const result = await contract.callStatic.collect({
            tokenId,
            recipient: wallet.address,
            amount0Max: ethers.BigNumber.from("0xffffffffffffffffffffffffffffffff"),
            amount1Max: ethers.BigNumber.from("0xffffffffffffffffffffffffffffffff")
        });

        return {
            amount0: result.amount0,
            amount1: result.amount1
        };

    }catch(e){

        console.error("DEBUG STATIC COLLECT ERROR ===");
        console.error("TOKEN ID:", tokenId.toString());
        console.error("ERROR:", e);

        return {
            amount0: 0,
            amount1: 0
        };
    }
}

// ======================
// LOAD NFT LP (TEMP SIMPLE)
// ======================
async function loadNFTs(){

    const wallet = getSelectedWallet();

console.log("DEBUG WALLET:", wallet);

if(!wallet || !wallet.address){
    console.warn("Wallet invalid:", wallet);
    return [];
}

    try{

        const NFT_CONTRACT =
            "0x8b9bCc8C722778f30146e20e44E8d8e28adD8df8";

        const abi = [
            "function balanceOf(address owner) view returns (uint256)",
            "function tokenOfOwnerByIndex(address owner,uint256 index) view returns (uint256)",
            "function positions(uint256 tokenId) view returns (uint96 nonce,address operator,address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint128 liquidity,uint256 feeGrowthInside0LastX128,uint256 feeGrowthInside1LastX128,uint128 tokensOwed0,uint128 tokensOwed1)"
        ];

        const POOL_ABI = [
            "function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)"
        ];

        const contract = new ethers.Contract(
            NFT_CONTRACT,
            abi,
            provider
        );

        const balance = Number(
            await contract.balanceOf(wallet.address)
        );

        if(balance === 0) return [];

        const tasks = Array.from(
            { length: balance },
            async (_, i) => {

                const tokenId =
                    await contract.tokenOfOwnerByIndex(
                        wallet.address,
                        i
                    );

                const pos =
                    await contract.positions(tokenId);

                const token0 = pos.token0;
                const token1 = pos.token1;
                const fee = pos.fee;

                const poolKey =
                    `${token0}_${token1}_${fee}`;

                let poolAddress =
                    poolAddressCache[poolKey];

                if(!poolAddress){

                    poolAddress =
                        await getPoolAddress(
                            token0,
                            token1,
                            fee
                        );

                    poolAddressCache[poolKey] =
                        poolAddress;
                }

                if(
                    !poolAddress ||
                    poolAddress ===
                    ethers.constants.AddressZero
                ){
                    return null;
                }

                const pool = new ethers.Contract(
                    poolAddress,
                    POOL_ABI,
                    provider
                );

                const [
                    slot0,
                    previewFees
                ] = await Promise.all([
                    pool.slot0(),
                    getRealClaimableFees(tokenId)
                ]);

                const priceKey =
                    `${token0}_${token1}`;

                let currentPrice =
                    priceCache[priceKey];

                if(!currentPrice){

                    currentPrice =
                        await PRICE_ENGINE.getPrice(
                            token0,
                            token1
                        );

                    priceCache[priceKey] =
                        currentPrice;
                }

                let priceLower =
                    Math.pow(
                        1.0001,
                        pos.tickLower
                    );

                let priceUpper =
                    Math.pow(
                        1.0001,
                        pos.tickUpper
                    );

                if(priceLower > priceUpper){
                    [priceLower, priceUpper] =
                        [priceUpper, priceLower];
                }

                const status =
                    slot0.tick >= pos.tickLower &&
                    slot0.tick < pos.tickUpper
                        ? "Active"
                        : "Inactive";

                const t0 = TOKENS.find(
                    t =>
                        t.address.toLowerCase() ===
                        token0.toLowerCase()
                );

                const t1 = TOKENS.find(
                    t =>
                        t.address.toLowerCase() ===
                        token1.toLowerCase()
                );

                const amounts = getAmounts(
                    pos.liquidity,
                    slot0.sqrtPriceX96,
                    pos.tickLower,
                    pos.tickUpper
                );

                return {
    id: tokenId.toString(),
    owner: wallet.address,

                    token0,
                    token1,

                    fee:
                        (fee / 10000) + "%",

                    status,

                    symbol0:
                        t0?.symbol || "T0",

                    symbol1:
                        t1?.symbol || "T1",

                    logo0:
                        t0?.logo ||
                        "img/default.png",

                    logo1:
                        t1?.logo ||
                        "img/default.png",

                    amount0: (
                        amounts.amount0 /
                        10 ** (t0?.decimals || 18)
                    ).toFixed(4),

                    amount1: (
                        amounts.amount1 /
                        10 ** (t1?.decimals || 18)
                    ).toFixed(4),

                    fees0: parseFloat(
                        ethers.utils.formatUnits(
                            previewFees.amount0,
                            t0?.decimals || 18
                        )
                    ).toFixed(4),

                    fees1: parseFloat(
                        ethers.utils.formatUnits(
                            previewFees.amount1,
                            t1?.decimals || 18
                        )
                    ).toFixed(4),

                    liquidity:
                        pos.liquidity.toString(),

                    tickLower:
                        pos.tickLower,

                    tickUpper:
                        pos.tickUpper,

                    priceLower,
                    priceUpper,
                    currentPrice
                };
            }
        );

        const list =
            (await Promise.all(tasks))
            .filter(Boolean);

        return list;

    }catch(e){

        console.warn(
            "NFT load error",
            e
        );

        return [];
    }
}

function openLPDetail(id){

    const lp = window.currentLPs.find(x => x.id == id);
    if(!lp) return;

    const wallet = getSelectedWallet();

    const canTransact =
    !!wallet &&
    !!wallet.privateKey &&
    wallet.address?.toLowerCase() === lp.owner?.toLowerCase();

    document.getElementById("tab-lp").innerHTML = `
        <div class="lp-detail">

            <button onclick="renderLP()">← Back</button>

            <h2>${lp.symbol0}/${lp.symbol1}</h2>
            <div>${lp.fee} #${lp.id}</div>

            <div class="lp-status ${lp.status==='Active' ? 'active' : 'inactive'}">
                ${lp.status}
            </div>

            <div class="lp-detail-card">
                <h3>Manage Liquidity</h3>

<button
    onclick="transferLP('${lp.id}')"
    ${!canTransact ? "disabled" : ""}
>
    ${canTransact ? "Send LP NFT" : "PK Required"}
</button>

                <button
                    onclick="boostLiquidity('${lp.id}')"
                    ${!canTransact ? "disabled" : ""}
                >
                    ${canTransact ? "Boost Liquidity" : "PK Required"}
                </button>

                <button
                    onclick="removeLiquidity('${lp.id}')"
                    ${!canTransact ? "disabled" : ""}
                >
                    ${canTransact ? "Remove Liquidity" : "PK Required"}
                </button>
            </div>

            <div class="lp-detail-card">
                <h3>Collect Fees</h3>

                <div>
                    Claimable: ${lp.fees0} ${lp.symbol0}
                </div>

                <div>
                    Claimable: ${lp.fees1} ${lp.symbol1}
                </div>

                <button 
                    onclick="collectFees('${lp.id}')"
                    ${
                        (!canTransact || (+lp.fees0 <= 0 && +lp.fees1 <= 0))
                        ? "disabled"
                        : ""
                    }
                >
                    ${
                        !canTransact
                        ? "PK Required"
                        : "Collect Fees"
                    }
                </button>

            </div>

        </div>
    `;
}

async function collectFees(tokenId){

    try{

        const wallet = getSelectedWallet();
        if(!wallet) return;

        const signer = getWalletSigner();

        const NFT_CONTRACT =
            "0x8b9bCc8C722778f30146e20e44E8d8e28adD8df8";

        const abi = [
            "function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) payable returns (uint256 amount0,uint256 amount1)"
        ];

        const contract = new ethers.Contract(
            NFT_CONTRACT,
            abi,
            signer
        );

        const tx = await contract.collect({
            tokenId,
            recipient: wallet.address,
            amount0Max: ethers.BigNumber.from("0xffffffffffffffffffffffffffffffff"),
            amount1Max: ethers.BigNumber.from("0xffffffffffffffffffffffffffffffff")
        });

        await tx.wait();

        clearCachedLP();
        renderLP(true);

        alert("Fees collected!");

    }catch(e){

        console.error(e);
        alert("Collect failed");
    }
}

// ======================
// TRANSFER LP NFT
// ======================
async function transferLP(tokenId){

    try{

        const wallet = getSelectedWallet();
        if(!wallet) return;

        const to = prompt("Enter recipient address:");
        if(!to) return;

        const signer = getWalletSigner();

        const NFT_CONTRACT =
            "0x8b9bCc8C722778f30146e20e44E8d8e28adD8df8";

        const abi = [
            "function safeTransferFrom(address from,address to,uint256 tokenId)"
        ];

        const contract = new ethers.Contract(
            NFT_CONTRACT,
            abi,
            signer
        );

        const tx = await contract.safeTransferFrom(
            wallet.address,
            to,
            tokenId
        );

        await tx.wait();

        alert("LP NFT sent!");

        clearCachedLP();
        renderLP(true);

    }catch(e){

        console.error(e);
        alert("Transfer failed");
    }
}

function formatPrice(p){

    if(p < 0.000001) return "0";
    if(p > 1e9) return "∞";

    return p.toFixed(5);
}



function tickToPrice(tick){
    return Math.pow(1.0001, tick);
}


const LP_CACHE_KEY = "lp_cache_v1";
const LP_CACHE_TTL = 60 * 1000; // 1 menit

function getCachedLP(wallet){

    if(!wallet) return null;

    const raw = localStorage.getItem(
        LP_CACHE_KEY + "_" + wallet.address
    );

    if(!raw) return null;

    try{

        const parsed = JSON.parse(raw);

        if(Date.now() - parsed.time > LP_CACHE_TTL){
            return null;
        }

        return parsed.data;

    }catch{
        return null;
    }
}

function setCachedLP(wallet, data){

    if(!wallet) return;

    localStorage.setItem(
        LP_CACHE_KEY + "_" + wallet.address,
        JSON.stringify({
            time: Date.now(),
            data
        })
    );
}

function clearCachedLP(){

    const wallet = getSelectedWallet();
    if(!wallet) return;

    localStorage.removeItem(
        LP_CACHE_KEY + "_" + wallet.address
    );
}

function renderLPCards(list){

    const container = document.getElementById("tab-lp");

    if(!list?.length){
        container.innerHTML =
            "<div style='text-align:center;color:#888;'>No liquidity found</div>";
        return;
    }

    let html = "";

    list.forEach(lp => {

        const active = lp.status === "Active";

        const progress = Math.max(
            0,
            Math.min(
                100,
                ((lp.currentPrice - lp.priceLower) /
                (lp.priceUpper - lp.priceLower)) * 100
            )
        );

        html += `
            <div class="lp-card" onclick="openLPDetail('${lp.id}')">

                <div class="lp-header">
                    <div class="lp-pair">
                        <img src="${lp.logo0}" class="lp-icon">
                        <img src="${lp.logo1}" class="lp-icon overlap">

                        <div>
                            <div class="lp-title">
                                ${lp.symbol0}/${lp.symbol1}
                            </div>

                            <div class="lp-sub">
                                ${lp.fee} #${lp.id}
                            </div>
                        </div>
                    </div>

                    <div class="lp-status ${active ? 'active' : 'inactive'}">
                        ${active ? 'Active' : 'Inactive'}
                    </div>
                </div>

                <div class="lp-price">
                    Current: 1 ${lp.symbol0} = ${lp.currentPrice.toFixed(6)} ${lp.symbol1}
                </div>

                <div class="lp-range-bar">
                    <div class="lp-range-dot" style="left:${progress}%"></div>
                </div>

                <div class="lp-range-labels">
                    <span>${formatPrice(lp.priceLower)}</span>
                    <span>${formatPrice(lp.priceUpper)}</span>
                </div>

                <div class="lp-balances">
                    <span>${lp.amount0} ${lp.symbol0}</span>
                    <span>${lp.amount1} ${lp.symbol1}</span>
                </div>

                <div class="lp-fees">
                    ${lp.fees0} ${lp.symbol0} + ${lp.fees1} ${lp.symbol1}
                </div>

            </div>
        `;
    });

    container.innerHTML = html;
}

async function renderLP(forceRefresh = false){

    const container = document.getElementById("tab-lp");
    const wallet = getSelectedWallet();

    if(!wallet){
        container.innerHTML =
            "<div style='text-align:center;color:#888;'>No wallet</div>";
        return;
    }

    // =====================
    // USE CACHE FIRST
    // =====================
    if(!forceRefresh){

        const cached = getCachedLP(wallet);

        if(cached?.length){

            window.currentLPs = cached;

            renderLPCards(cached);

            refreshLPBackground();

            return;
        }
    }

    // =====================
    // LOAD BLOCKCHAIN
    // =====================
    container.innerHTML = "Loading Liquidity...";

    try{

        const list = await loadNFTs();

        window.currentLPs = list;

        setCachedLP(wallet, list);

        renderLPCards(list);

    }catch(e){

        console.error(e);

        container.innerHTML =
            "<div style='text-align:center;color:#f66;'>Failed load LP</div>";
    }
}

async function refreshLPBackground(){

    try{

        const wallet = getSelectedWallet();
        if(!wallet) return;

        const fresh = await loadNFTs();

        window.currentLPs = fresh;

        setCachedLP(wallet, fresh);

    }catch(e){

        console.warn("LP background refresh fail", e);
    }
}

function getLPs(){
    const wallet = getSelectedWallet();
    if(!wallet) return [];

    const key = wallet.address + "_lp";
    return JSON.parse(localStorage.getItem(key) || "[]");
}

function setLPs(data){
    const wallet = getSelectedWallet();
    if(!wallet) return;

    const key = wallet.address + "_lp";
    localStorage.setItem(key, JSON.stringify(data));
}

function addLPManual(){

    const input = document.getElementById("lpIdInput");
    const id = input.value.trim();

    if(!id) return alert("Isi NFT ID");

    let list = getLPs();

    if(list.includes(id)){
        return alert("Sudah ada");
    }

    list.push(id);
    setLPs(list);

    input.value = "";

    renderLPList();
}

function removeLP(id){

    let list = getLPs();

    list = list.filter(x => x !== id);

    setLPs(list);

    renderLPList();
}