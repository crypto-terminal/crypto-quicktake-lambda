const crypto = require("crypto");
const fetch = require("node-fetch");

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
};

const BASE_URL = "https://api.gemini.com";

const PATHS = {
    ACCOUNT_INFO: "/v1/account",
    ACCOUNT_BALANCES: "/v1/balances",
    ACCOUNT_BALANCES_USD: "/v1/notionalbalances/usd",
};

const getNonce = () => String(Math.floor(Date.now() / 1000) * 1000);

const getHeadersForGeminiRequest = (path, API_KEY, API_SECRET) => {
    const nonce = getNonce();
    const payload = {
        request: path,
        nonce,
    };

    const base64payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const signature = crypto.createHmac("sha384", API_SECRET).update(base64payload).digest("hex");
    const _headers = {
        "Content-Type": "text/plain",
        "Content-Length": "0",
        "X-GEMINI-APIKEY": API_KEY,
        "X-GEMINI-PAYLOAD": base64payload,
        "X-GEMINI-SIGNATURE": signature,
        "Cache-Control": "no-cache",
    };

    return _headers;
};

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

        const API_KEY = pair.apiKey;
        const API_SECRET = pair.apiSecret;

        const _headers = getHeadersForGeminiRequest(
            PATHS.ACCOUNT_BALANCES_USD,
            API_KEY,
            API_SECRET
        );

        const fetchAccountBalancesUSD = fetch(BASE_URL + PATHS.ACCOUNT_BALANCES_USD, {
            method: "POST",
            headers: _headers,
        });

        const [accountBalancesUSDResponse] = await Promise.all([fetchAccountBalancesUSD]);
        let accountBalancesUSD = await accountBalancesUSDResponse.json();

        accountBalancesUSD = accountBalancesUSD.map((b) => {
            return {
                raw: b,
                fiatValue: parseFloat(b.amountNotional).toFixed(2),
                fiatSymbol: "USD",
                coinSymbol: b.currency,
                coinAmount: b.amount,
            };
        });

        const totalBalance = accountBalancesUSD.reduce(
            (prev, curr) => prev + parseFloat(curr.fiatValue),
            0
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: "Hello World!",
                data: {
                    accountInfo: { balances: accountBalancesUSD },
                    totalBalance,
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

// accountBalances :>>  [
//     {
//       type: 'exchange',
//       currency: 'SOL',
//       amount: '2.732824',
//       available: '2.732824',
//       availableForWithdrawal: '0'
//     }
//   ]
// 
// accountBalancesUSD :>>  [
//     {
//       currency: 'SOL',
//       amount: '2.732824',
//       amountNotional: '93.793252504', // great, I don't have to calculate this value by myself, just use the value here
//       available: '2.732824',
//       availableNotional: '93.793252504',
//       availableForWithdrawal: '0',
//       availableForWithdrawalNotional: '0.00'
//     }
//   ]