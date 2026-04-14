function getAmounts(liquidity, sqrtPrice, sqrtLower, sqrtUpper){

    //  JANGAN formatUnits
    const L = parseFloat(liquidity.toString());

    if(!L || L === 0){
        return { amount0: 0, amount1: 0 };
    }

    if(sqrtPrice <= sqrtLower){
        return {
            amount0: L * (sqrtUpper - sqrtLower) / (sqrtLower * sqrtUpper),
            amount1: 0
        };
    }

    if(sqrtPrice < sqrtUpper){
        return {
            amount0: L * (sqrtUpper - sqrtPrice) / (sqrtPrice * sqrtUpper),
            amount1: L * (sqrtPrice - sqrtLower)
        };
    }

    return {
        amount0: 0,
        amount1: L * (sqrtUpper - sqrtLower)
    };
}

async function getPoolAddress(token0, token1, fee){

    const FACTORY = "0xCFE41fb5dA87916D84E7F22889087b4Ff7163cDE"; //  ganti sesuai DEX

    const factoryAbi = [
        "function getPool(address,address,uint24) view returns (address)"
    ];

    const factory = new ethers.Contract(FACTORY, factoryAbi, provider);

    return await factory.getPool(token0, token1, fee);
}

// ======================
// LOAD NFT LP (TEMP SIMPLE)
// ======================
async function loadNFTs(){

    const wallet = getSelectedWallet();
    if(!wallet) return [];

    try{

        const NFT_CONTRACT = "0x8b9bCc8C722778f30146e20e44E8d8e28adD8df8";

        const abi = [
            "function balanceOf(address owner) view returns (uint256)",
            "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
            "function positions(uint256 tokenId) view returns (uint96 nonce,address operator,address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint128 liquidity,uint256 feeGrowthInside0LastX128,uint256 feeGrowthInside1LastX128,uint128 tokensOwed0,uint128 tokensOwed1)"
        ];

        const POOL_ABI = [
            "function slot0() view returns (uint160 sqrtPriceX96,int24,int24,int24,int24,int24,int24)"
        ];

        const contract = new ethers.Contract(NFT_CONTRACT, abi, provider);

        const balance = await contract.balanceOf(wallet.address);

        const list = [];

        for(let i = 0; i < balance; i++){

            const tokenId = await contract.tokenOfOwnerByIndex(wallet.address, i);
            const pos = await contract.positions(tokenId);

            // =========================
            // BASIC DATA
            // =========================
            const token0 = pos.token0;
            const token1 = pos.token1;
            const fee = pos.fee; //  FIX (dipindah ke atas)
            const tickLower = pos.tickLower;
            const tickUpper = pos.tickUpper;
            const liquidity = pos.liquidity;

            // =========================
            // POOL
            // =========================
            const poolAddress = await getPoolAddress(token0, token1, fee);

            if(!poolAddress || poolAddress === ethers.constants.AddressZero){
                continue;
            }

            const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);

            const slot0 = await pool.slot0();

const sqrtPrice = parseFloat(
    ethers.utils.formatUnits(slot0.sqrtPriceX96, 96)
);

            // =========================
            // PRICE RANGE
            // =========================
            const priceLower = Math.pow(1.0001, tickLower);
            const priceUpper = Math.pow(1.0001, tickUpper);

            let rangeText = "";

            const isFullRange =
                tickLower <= -887000 && tickUpper >= 887000;

            const isExtremePrice =
                priceLower < 1e-8 && priceUpper > 1e10;

            if(isFullRange || isExtremePrice){
                rangeText = "Full Range";
            }else{
                rangeText =
                    priceLower.toFixed(5) + "  " +
                    priceUpper.toFixed(5);
            }

            // =========================
            // STATUS
            // =========================
            const currentPrice = sqrtPrice * sqrtPrice; //  FIX

            let status = "Active";

            if(currentPrice < priceLower || currentPrice > priceUpper){
                status = "Out of Range";
            }

            // =========================
            // TOKEN INFO
            // =========================
            const t0 = TOKENS.find(t => t.address.toLowerCase() === token0.toLowerCase());
            const t1 = TOKENS.find(t => t.address.toLowerCase() === token1.toLowerCase());

            const symbol0 = t0?.symbol || "T0";
            const symbol1 = t1?.symbol || "T1";

            const logo0 = t0?.logo || "img/default.png";
            const logo1 = t1?.logo || "img/default.png";

            // =========================
            // AMOUNT CALC
            // =========================
            const sqrtLower = Math.sqrt(priceLower);
            const sqrtUpper = Math.sqrt(priceUpper);

            const amounts = getAmounts(
                liquidity,
                sqrtPrice,
                sqrtLower,
                sqrtUpper
            );

            // =========================
            // PUSH DATA
            // =========================
            list.push({
                id: tokenId.toString(),

                token0,
                token1,

                fee: (fee / 10000) + "%",
                range: rangeText,
                status,

                symbol0,
                symbol1,
                logo0,
                logo1,

                amount0: amounts.amount0 > 0
                    ? amounts.amount0.toFixed(4)
                    : "-",

                amount1: amounts.amount1 > 0
                    ? amounts.amount1.toFixed(4)
                    : "-",

                liquidity: liquidity.toString(),

                tickLower,
                tickUpper
            });
        }

        return list;

    }catch(e){
        console.warn("NFT load error", e);
        return [];
    }
}

function formatPrice(p){
    if(p < 0.000001) return "0";
    if(p > 1e9) return "";
    return p.toFixed(5);
}

function getAmounts(liquidity, sqrtPrice, sqrtLower, sqrtUpper){

    const L = parseFloat(liquidity.toString()); //  FIX

    if(!L || L === 0){
        return { amount0: 0, amount1: 0 };
    }

    if(sqrtPrice <= sqrtLower){
        return {
            amount0: L * (sqrtUpper - sqrtLower) / (sqrtLower * sqrtUpper),
            amount1: 0
        };
    }

    if(sqrtPrice < sqrtUpper){
        return {
            amount0: L * (sqrtUpper - sqrtPrice) / (sqrtPrice * sqrtUpper),
            amount1: L * (sqrtPrice - sqrtLower)
        };
    }

    return {
        amount0: 0,
        amount1: L * (sqrtUpper - sqrtLower)
    };
}

function tickToPrice(tick){
    return Math.pow(1.0001, tick);
}

function renderLP(){

    const container = document.getElementById("tab-lp");
    const wallet = getSelectedWallet();

    if(!wallet){
        container.innerHTML =
        "<div style='text-align:center;color:#888;'>No wallet</div>";
        return;
    }

    container.innerHTML = "Loading LP...";

    loadNFTs().then(list => {

        if(!list || list.length === 0){
            container.innerHTML =
            "<div style='text-align:center;color:#888;'>No LP found</div>";
            return;
        }

        let html = "";

        list.forEach(lp => {

            const t0 = getTokenData(lp.token0);
            const t1 = getTokenData(lp.token1);

            //  convert tick  price
            const priceMin = tickToPrice(lp.tickLower);
            const priceMax = tickToPrice(lp.tickUpper);

            //  format
            let rangeText;

const isFullRange =
    lp.tickLower <= -887000 && lp.tickUpper >= 887000;

if(isFullRange){
    rangeText = "Full Range";
}else{
    rangeText =
        priceMin.toFixed(5) + "  " +
        priceMax.toFixed(5);
}

            //  dummy status (bisa upgrade nanti)
            const status = "Active";

            html += `
            <div class="asset-item" style="flex-direction:column; align-items:flex-start; gap:8px;">

                <!-- TOKEN ICON -->
                <div style="display:flex; align-items:center; gap:6px;">
                    <img src="${t0.logo}" style="width:22px;height:22px;border-radius:50%;">
                    <img src="${t1.logo}" style="width:22px;height:22px;border-radius:50%; margin-left:-8px;">
                    
                    <b>${t0.symbol} / ${t1.symbol}</b>
                </div>

                <!-- LP ID -->
                <div style="font-size:12px;color:#888;">
                    LP NFT #${lp.id}
                </div>

                <!-- FEE -->
                <div style="font-size:12px;color:#aaa;">
                    Fee: ${lp.fee}
                </div>

                <!-- RANGE -->
                <div style="font-size:12px;color:#aaa;">
                    Range:<br>
                    ${rangeText}
                </div>

                <!-- STATUS -->
                <div style="font-size:12px;color:${status==='Active'?'#00ff99':'#ff4d4d'};">
                    ${status}
                </div>

                <!-- LIQ -->
                <div style="font-size:11px;color:#888;">
                    <small style="color:#555;">LP Position</small>
                </div>

            </div>
            `;
        });

        container.innerHTML = html;
    });
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