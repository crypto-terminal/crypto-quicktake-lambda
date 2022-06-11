const crypto = require("crypto");
const fetch = require("node-fetch");
const Decimal = require("decimal.js");

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
};

const BASE_URL = "https://api.binance.us";

const ENDPOINTS = {
    USER_ACCOUNT: "/api/v3/account",
    USER_STATUS: "/wapi/v3/accountStatus.html",
    COIN_PRICES: "/api/v3/ticker/price",
};

const getSignature = (API_SECRET, timestamp) => {
    return crypto
        .createHmac("sha256", API_SECRET)
        .update(new URLSearchParams({ timestamp }).toString())
        .digest("hex");
};

const getQuery = (signature, timestamp) => new URLSearchParams({ timestamp, signature }).toString();

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, message: "Method Not supported" }),
        };
    }

    try {
        const payload = JSON.parse(event.body);
        const { pair } = payload;

        if (!pair || !pair.apiKey || !pair.apiSecret || !pair.ex) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: "Field missing!" }),
            };
        }

        const timestamp = Date.now();
        const API_KEY = pair.apiKey;
        const API_SECRET = pair.apiSecret;
        const signature = getSignature(API_SECRET, timestamp);
        const query = getQuery(signature, timestamp);

        const fetchAccountInfo = fetch(`${BASE_URL}${ENDPOINTS.USER_ACCOUNT}?${query}`, {
            method: "GET",
            headers: {
                "X-MBX-APIKEY": API_KEY,
            },
        });
        const fetchCoinPrices = fetch(`${BASE_URL}${ENDPOINTS.COIN_PRICES}`);

        const [accountInfoResponse, coinPricesResponse] = await Promise.all([
            fetchAccountInfo,
            fetchCoinPrices,
        ]);
        let accountInfo = await accountInfoResponse.json();
        const coinPrices = await coinPricesResponse.json();

        accountInfo = {
            ...accountInfo,
            balances: accountInfo.balances
                .filter((balance) => parseInt(balance.free) > 0 || parseInt(balance.locked) > 0)
                .map((balance) => {
                    let price = coinPrices.find((p) => p.symbol === `${balance.asset}USD`)?.price;
                    price = price || "0";
                    return {
                        raw: balance,
                        fiatValue: new Decimal(price).times(balance.free).toFixed(2), // fiat balance
                        fiatSymbol: "USD", // fiat symbol
                        coinSymbol: balance.asset, // coin
                        coinAmount: balance.free,
                    };
                }),
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: "Hello World!",
                data: {
                    accountInfo,
                    totalBalance: accountInfo.balances.reduce(
                        (prev, curr) => prev + parseFloat(curr.fiatValue),
                        0
                    ),
                },
            }),
        };
    } catch (err) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: false,
                message: "error",
                data: null,
            }),
        };
    }
};


// json: >>
// {
//     makerCommission: 10,
//     takerCommission: 10,
//     buyerCommission: 0,
//     sellerCommission: 0,
//     canTrade: true,
//     canWithdraw: true,
//     canDeposit: true,
//     updateTime: 1652935614759,
//     accountType: 'SPOT',
//     balances: [
//       { asset: 'BTC', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ETH', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'USD', free: '0.0000', locked: '0.0000' },
//       { asset: 'XRP', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'USDT', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'BCH', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'LTC', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ADA', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'XLM', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'BAT', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ETC', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ZRX', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'BNB', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'LINK', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'REP', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'RVN', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'DASH', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ZEC', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ALGO', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'IOTA', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'BUSD', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'DOGE', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'WAVES', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ATOM', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'NEO', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'VET', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'QTUM', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'NANO', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'EOS', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ICX', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ENJ', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ONT', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ZIL', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'USDC', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'XTZ', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'HBAR', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'OMG', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'MATIC', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ONE', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'VTHO', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'KNC', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'COMP', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'REN', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'MANA', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'HNT', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'MKR', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'DAI', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'BAND', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'STORJ', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'SOL', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'UNI', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'EGLD', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'PAXG', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'OXT', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ZEN', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'FIL', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'AAVE', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'GRT', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'SUSHI', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'AMP', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ANKR', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'SHIB', free: '0.00', locked: '0.00' },
//       { asset: 'CRV', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'AVAX', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'AXS', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'DOT', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'CTSI', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'YFI', free: '0.00000000', locked: '0.00000000' },
//       { asset: '1INCH', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'FTM', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'NEAR', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'LRC', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'KSHIB', free: '0.0000', locked: '0.0000' },
//       { asset: 'LPT', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'SLP', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'POLY', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'NMR', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ANT', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'AUDIO', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'GALA', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'CHZ', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'ENS', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'OGN', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'XNO', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'TLM', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'SNX', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'APE', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'REQ', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'WBTC', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'VOXEL', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'TRX', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'FLOW', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'FLUX', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'BICO', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'SPELL', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'COTI', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'API3', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'CELR', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'IMX', free: '0.00000000', locked: '0.00000000' },
//       { asset: 'JASMY', free: '0.00000000', locked: '0.00000000' },
//       ... 11 more items
//     ],
//     permissions: [ 'SPOT' ]
//   }
