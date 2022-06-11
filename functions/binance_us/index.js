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
                .filter((balance) => parseInt(balance.free) > 0)
                .map((balance) => {
                    let price = coinPrices.find((p) => p.symbol === `${balance.asset}USD`)?.price;
                    price = price || "0";
                    return {
                        ...balance,
                        price,
                        value: new Decimal(price).times(balance.free).toFixed(2),
                    };
                }),
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: "Hello World!",
                data: { accountInfo },
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