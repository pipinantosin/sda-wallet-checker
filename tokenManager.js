/**
 * ==========================================
 * SIDRAPULSE - TOKEN MANAGER
 * - Default tokens
 * - Custom tokens (saved)
 * - Add / Remove
 * ==========================================
 */

const DEFAULT_TOKENS = [
  { "symbol": "FREEt", "address": "0x0914BF761Af71F4A39DcE0E9ce71B7ed96c457E3" ,logo: "img/freet.png" },
  { "symbol": "SMAF", "address": "0x2cE9e7c168035D61cc3a3655949C147c063EeCc4" ,logo: "img/smaf.png" },
  { "symbol": "SDS", "address": "0x9bA4035871119991fC7B420873345f9be92aF146" ,logo: "img/sds.png" },
  { "symbol": "GLNs", "address": "0xE1a8FfD7280D5A278A9E8c6daFf6d391b59081B4" ,logo: "img/glns.png" },
  { "symbol": "FBAY", "address": "0x3Acd3c10d4C080ace3662153913833081684cBB8" ,logo: "img/fbay.png" },
  { "symbol": "EWM", "address": "0x3BDC0adbA5ac8F68b977266ef308243443886CEa" ,logo: "img/ewm.png" },
  { "symbol": "VPA", "address": "0x983428b824D8462De6240bA19e790Bbf19703f33" ,logo: "img/vpa.png" },
  { "symbol": "ARMs", "address": "0x9B61324f0beE10f4624FE6E75c60943b73125e81" ,logo: "img/arms.png" },
  { "symbol": "HEC", "address": "0xBCdA8739687C12EEc3206d8AEC80c32a3C545Ae9" ,logo: "img/hec.png" },
  { "symbol": "STSX", "address": "0x84Fb6Ad958a73a9e978C2bf00719b84D8b73304A" ,logo: "img/stsx.png" },
  { "symbol": "ZSM", "address": "0x828Df8009adD5279b9133c39955eE95bdCAAE476" ,logo: "img/zsm.png" },
  { "symbol": "WPX", "address": "0xfaeCbE5956a02e45Ee663922174F955ae78D0309" ,logo: "img/wpx.png" },
  { "symbol": "SKMH", "address": "0xe787BfFC078A0231a038Be1Fb199B9c6FD1d511a" ,logo: "img/skmh.png" },
  { "symbol": "AIR", "address": "0x4cE5ef02F9aEbb80BB4e327F76DFb95eac1B69A6" ,logo: "img/air.png" },
  { "symbol": "SIT", "address": "0xF102009Cd862Fc714e01c46591c3DF10D097f7B9" ,logo: "img/sit.png" },
  { "symbol": "GPC", "address": "0xd0981E59c8B51778A3b7754298614820CF08C17B" ,logo: "img/gpc.png" },
  { "symbol": "LNH", "address": "0xcb13385a82565E2090B9275e49C5CBbdB1875aEA" ,logo: "img/lnh.png" },
  { "symbol": "DBI", "address": "0xf94a744807da1e4F933C3D31e1d93A0A026fD21d" ,logo: "img/dbi.png" },
  { "symbol": "SGWA", "address": "0x940692728873F93B5ECEabB373871ddEF5910312" ,logo: "img/sgwa.png" },
  { "symbol": "IDM", "address": "0x4Ae77f557c5aAcA450EeC79B929b5Cd06A8b8e6d" ,logo: "img/idm.png" },
  { "symbol": "MBF", "address": "0xF74106911432657a24b0D85257d40F24f801cc01" ,logo: "img/mbf.png" },
  { "symbol": "CSF", "address": "0x49c27873E134A62231C8867f7f5d6b9ebfd7AA78" ,logo: "img/csf.png" },
  { "symbol": "DAN", "address": "0xb0040F8B957329BFB2615dC081c1666540A153Bd" ,logo: "img/dan.png" },
  { "symbol": "SLND", "address": "0x91210544fF2218c2670693682B53d6362b9915eF" ,logo: "img/slnd.png" },
  { "symbol": "TRL", "address": "0xe077af3aE012cAa3eD975Eb1006b62090FaA2942" ,logo: "img/trl.png" },
  { "symbol": "VPD", "address": "0x345B20D4fca08376f19145C36c531A1821AF96c4" ,logo: "img/vpd.png" },
  { "symbol": "VLCP", "address": "0xE7C1F17Cc6aC5CEB7f763DcE84310D2c26bDF927" ,logo: "img/vlcp.png" },
  { "symbol": "TAP", "address": "0x2b78034DBEA0cE70e662c9aA238db5CAF3CfE28F" ,logo: "img/tap.png" },
  { "symbol": "VPM", "address": "0x4ACc2B052665b731182829178eB369797Ee44170" ,logo: "img/vpm.png" },
  { "symbol": "VMB", "address": "0xe2f49f86C02E627b2e86809424737b79b2651B8c" ,logo: "img/vmb.png" },
  { "symbol": "AITT", "address": "0xaAADd5D2BB88fBdaa426fFdb95b917B861fe94bB" ,logo: "img/aitt.png" },
  { "symbol": "SUBV", "address": "0x0DDC0c44251a98747b9e7dc165FDE86257876F79" ,logo: "img/subv.png" },
  { "symbol": "GSML", "address": "0x09F0b54101e08607A9e5E4C956A9b47Ef5fb24DB" ,logo: "img/gsml.png" },
  { "symbol": "AMHS", "address": "0x75791A9C2703C300AF7716c19fbC2d3Aa1C87fA0" ,logo: "img/amhs.png" },
  { "symbol": "ALNS", "address": "0xdc0EF76F3D82D275AaE268781a166C5Ea078C1b7" ,logo: "img/alns.png" },
  { "symbol": "AILP", "address": "0xA80C9a3B7a92F181648209Cb98E1974d05cbe68f" ,logo: "img/ailp.png" },
  { "symbol": "SDFL", "address": "0x63Ec72E6A6D6B4f8725c76BD279Bee162663b75B" ,logo: "img/sdfl.png" },
  { "symbol": "ATES", "address": "0x05322f2356e8FfdC28c4a5e69d4FEebEbbB33649" ,logo: "img/ates.png" },
  { "symbol": "DQLP", "address": "0xA9272A802125C2b800e76F3232Ddca8fa8E81FaD" ,logo: "img/dqlp.png" },
  { "symbol": "SMRX", "address": "0xFd88245B2294F833BD83245d4982c64f4B9D121D" ,logo: "img/smrx.png" },
  { "symbol": "TKWF", "address": "0x068E5B1C385ea2647008F1694a35AAb5DDe642F2" ,logo: "img/tkwf.png" },
  { "symbol": "SFAR", "address": "0x641a328505134b16A2B385670a0062E911871Df5" ,logo: "img/sfar.png" },
  { "symbol": "EZY", "address": "0x71bF57a174156ebBc9c935A8490c1C4C1DBe6F00" ,logo: "img/ezy.png" },
  { "symbol": "FLT", "address": "0x908dA7121a392CB929C3578bed9A1E5a6aD15939" ,logo: "img/flt.png" },
  { "symbol": "HAQ", "address": "0x04E0A7503c64eF7a143B92B60B471BAEdC81CAb9" ,logo: "img/haq.png" },
  { "symbol": "GTAP", "address": "0x719A2D9a0DfAF65D15EF48C730C5F64c75d439ef" ,logo: "img/gtap.png" }
    // tambahkan default token resmi di sini
];



// ambil dari localStorage
let customTokens =
    JSON.parse(localStorage.getItem("customTokens")) || [];

// gabungkan default + custom
let TOKENS = [...DEFAULT_TOKENS, ...customTokens];

// ===============================
// SAVE
// ===============================
function saveTokens() {
    localStorage.setItem(
        "customTokens",
        JSON.stringify(customTokens)
    );
}

// ===============================
// ADD TOKEN
// ===============================
function addToken(symbol, address) {

    symbol = symbol.trim().toUpperCase();
    address = address.trim();

    if (!ethers.utils.isAddress(address)) {
        alert("Invalid contract address");
        return;
    }

    // cek duplikat
    const exists = TOKENS.find(
        t => t.address.toLowerCase() === address.toLowerCase()
    );

    if (exists) {
        alert("Token already added");
        return;
    }

    const newToken = { symbol, address };

    customTokens.push(newToken);
    TOKENS = [...DEFAULT_TOKENS, ...customTokens];

    saveTokens();
    renderTokenList();
}

// ===============================
// REMOVE TOKEN
// ===============================
function removeToken(address) {

    customTokens = customTokens.filter(
        t => t.address.toLowerCase() !== address.toLowerCase()
    );

    TOKENS = [...DEFAULT_TOKENS, ...customTokens];

    saveTokens();
    renderTokenList();
}

// ===============================
// RENDER TOKEN LIST (OPTIONAL UI)
// ===============================
function renderTokenList() {

    const list = document.getElementById("token-list");
    if (!list) return;

    list.innerHTML = "";

    customTokens.forEach(token => {

        const div = document.createElement("div");
        div.style.marginBottom = "6px";

        div.innerHTML = `
            <span>${token.symbol}</span>
            <button onclick="removeToken('${token.address}')">
                Remove
            </button>
        `;

        list.appendChild(div);
    });
}

// render saat load
document.addEventListener("DOMContentLoaded", renderTokenList);