// ==========================
// SIDRACHAIN LP ENGINE
// Uniswap V3 NFT Positions
// ==========================

const PM_ADDRESS = "0x8b9bCc8C722778f30146e20e44E8d8e28adD8df8";

const PM_ABI = [
    "function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) returns (uint256,uint128,uint256,uint256)",
    "function increaseLiquidity((uint256 tokenId,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) returns (uint128,uint256,uint256)",
    "function decreaseLiquidity((uint256 tokenId,uint128 liquidity,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) returns (uint256,uint256)",
    "function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) returns (uint256,uint256)",
    "function positions(uint256) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

// ==========================
// WALLET (PK MODE)
// ==========================
function getSigner() {
    if (!window.walletPK) throw new Error("Private key belum di-set");

    return new ethers.Wallet(
        window.walletPK,
        window.provider
    );
}

// ==========================
// CONTRACT INSTANCE
// ==========================
function getPM() {
    return new ethers.Contract(PM_ADDRESS, PM_ABI, getSigner());
}

function getToken(token) {
    return new ethers.Contract(token, ERC20_ABI, getSigner());
}

// ==========================
// APPROVE TOKEN SAFE
// ==========================
async function approve(token, amount) {
    const signer = getSigner();
    const owner = await signer.getAddress();

    const erc20 = getToken(token);
    const allowance = await erc20.allowance(owner, PM_ADDRESS);

    if (allowance.gte(amount)) return true;

    const tx = await erc20.approve(PM_ADDRESS, amount);
    await tx.wait();

    return true;
}

// ==========================
// ADD LIQUIDITY (MINT NEW POSITION)
// ==========================
async function addLP({
    token0,
    token1,
    fee = window.CONFIG.FEE,
    tickLower,
    tickUpper,
    amount0,
    amount1
}) {
    try {
        const signer = getSigner();
        const addr = await signer.getAddress();

        const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

        // approve dulu
        await approve(token0, amount0);
        await approve(token1, amount1);

        const pm = getPM();

        const tx = await pm.mint({
            token0,
            token1,
            fee,
            tickLower,
            tickUpper,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: addr,
            deadline
        });

        const receipt = await tx.wait();

        console.log("✅ LP CREATED:", receipt);
        return receipt;

    } catch (e) {
        console.error("❌ addLP error:", e);
        throw e;
    }
}

// ==========================
// INCREASE LP
// ==========================
async function increaseLP({
    tokenId,
    amount0,
    amount1
}) {
    try {
        const pm = getPM();
        const deadline = Math.floor(Date.now() / 1000) + 600;

        const tx = await pm.increaseLiquidity({
            tokenId,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            deadline
        });

        return await tx.wait();

    } catch (e) {
        console.error("increaseLP error:", e);
        throw e;
    }
}

// ==========================
// DECREASE LP
// ==========================
async function decreaseLP({
    tokenId,
    liquidity
}) {
    try {
        const pm = getPM();
        const deadline = Math.floor(Date.now() / 1000) + 600;

        const tx = await pm.decreaseLiquidity({
            tokenId,
            liquidity,
            amount0Min: 0,
            amount1Min: 0,
            deadline
        });

        return await tx.wait();

    } catch (e) {
        console.error("decreaseLP error:", e);
        throw e;
    }
}

// ==========================
// COLLECT FEES
// ==========================
async function collectLP(tokenId) {
    try {
        const pm = getPM();
        const signer = getSigner();
        const addr = await signer.getAddress();

        const tx = await pm.collect({
            tokenId,
            recipient: addr,
            amount0Max: ethers.constants.MaxUint256,
            amount1Max: ethers.constants.MaxUint256
        });

        return await tx.wait();

    } catch (e) {
        console.error("collectLP error:", e);
        throw e;
    }
}

// ==========================
// GET POSITION DETAIL
// ==========================
async function getLP(tokenId) {
    const pm = getPM();
    const p = await pm.positions(tokenId);

    return {
        token0: p.token0,
        token1: p.token1,
        fee: p.fee,
        tickLower: p.tickLower,
        tickUpper: p.tickUpper,
        liquidity: p.liquidity.toString(),
        owed0: p.tokensOwed0.toString(),
        owed1: p.tokensOwed1.toString()
    };
}

// ==========================
// EXPORT GLOBAL
// ==========================
window.LP_ENGINE = {
    addLP,
    increaseLP,
    decreaseLP,
    collectLP,
    getLP
};