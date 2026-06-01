const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// Middleware Setups
app.use(cors());
app.use(express.json());

// Agar aapka frontend codes 'public' folder mein hain toh ise uncomment karein
// app.use(express.static('public'));

// Dynamic Timing Helper: Server status 429/500 troubleshooting ke liye delay mechanism
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =================================================================
// 1. BACKEND AES-GCM DECRYPTION SYSTEM (Secret Key: maggikhalo)
// =================================================================
function decryptBackendPayload(encryptedPayload) {
    try {
        if (typeof encryptedPayload !== 'string' || !encryptedPayload.includes(':')) {
            return encryptedPayload;
        }

        const [ivHex, encryptedHex] = encryptedPayload.split(':');
        const secretKey = "maggikhalo";
        const keyBuffer = Buffer.alloc(32, 0);
        Buffer.from(secretKey, 'utf-8').copy(keyBuffer);

        const iv = Buffer.from(ivHex, 'hex');
        const combinedCiphertext = Buffer.from(encryptedHex, 'hex');
        const authTagLength = 16;

        if (combinedCiphertext.length < authTagLength) return encryptedPayload;

        const ciphertext = combinedCiphertext.subarray(0, combinedCiphertext.length - authTagLength);
        const authTag = combinedCiphertext.subarray(combinedCiphertext.length - authTagLength);

        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, 'binary', 'utf-8');
        decrypted += decipher.final('utf-8');

        return JSON.parse(decrypted);
    } catch (error) {
        console.error("[Decryption Fail] Passing raw payload data:", error.message);
        return encryptedPayload;
    }
}

// =================================================================
// 2. DYNAMIC PROXY ROUTE (Handles 429 Rate Limits & 500 Errors)
// =================================================================
app.all('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ error: "Target parameter 'url' required." });
    }

    let attempts = 0;
    const maxAttempts = 3;
    let timingDelay = 2000; // Base delay parameter (Troubleshooting window 1-10s)

    while (attempts < maxAttempts) {
        try {
            attempts++;
            console.log(`[Proxy Request] Target: ${targetUrl} (Attempt ${attempts}/${maxAttempts})`);

            const options = {
                method: req.method,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Content-Type': 'application/json'
                }
            };

            if (req.method !== 'GET' && req.method !== 'HEAD') {
                options.body = JSON.stringify(req.body);
            }

            const apiResponse = await fetch(targetUrl, options);

            // Handle Server Rate Limiting (429) or internal issues (500) gracefully
            if (apiResponse.status === 429 || apiResponse.status === 500) {
                console.warn(`[Proxy Warning] Encountered status ${apiResponse.status}. Retrying after backup delay...`);
                await wait(timingDelay);
                timingDelay *= 2; // Exponential backoff timing
                continue;
            }

            const contentType = apiResponse.headers.get("content-type");
            let dataPayload;

            if (contentType && contentType.includes("application/json")) {
                dataPayload = await apiResponse.json();
            } else {
                dataPayload = await apiResponse.text();
            }

            // Auto-check and parse encrypted payloads
            if (dataPayload && dataPayload.data && typeof dataPayload.data === 'string') {
                dataPayload.data = decryptBackendPayload(dataPayload.data);
            } else if (typeof dataPayload === 'string') {
                dataPayload = decryptBackendPayload(dataPayload);
            }

            return res.status(apiResponse.status).json(dataPayload);

        } catch (error) {
            console.error(`[Proxy Catch] Attempt ${attempts} error:`, error.message);
            if (attempts >= maxAttempts) {
                return res.status(500).json({ error: "All backend proxy sync sequences failed.", details: error.message });
            }
            await wait(timingDelay);
        }
    }
});

// Root route to ensure Render health checks always return 200 OK
app.get('/', (req, res) => {
    res.status(200).send("Delta Study Centralized Proxy Server Is Running Successfully! 🚀");
});

// =================================================================
// 3. CRITICAL RENDER BINDING (Fixes early exit crashes)
// =================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Success] Server is live and listening continuously on port ${PORT}`);
});