// ==========================================
// 1. CORE AES-GCM DECRYPTION SYSTEM (From Source)
// ==========================================

const textDecoder = new TextDecoder(); // [cite: 172]

/**
 * Secret string se 256-bit key buffer generate karne ka function
 */
async function deriveCryptoKey(secretText) {
    const encoder = new TextEncoder(); // [cite: 172]
    const encodedText = encoder.encode(secretText); // [cite: 172]
    const keyBuffer = new Uint8Array(32); // [cite: 172]
    
    // Key buffer ko 32 bytes tak fill karna (Source code padding logic)
    for (let i = 0; i < 32; i++) {
        keyBuffer[i] = i < encodedText.length ? encodedText[i] : 0; // [cite: 173, 174]
    }
    
    // Web Crypto API ke liye raw key import karna
    return window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    ); // [cite: 174]
}

/**
 * Hex string ko Uint8Array mein convert karne ka function
 */
function hexToUint8Array(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))); // [cite: 174]
}

/**
 * Main Decryption Function jo payload ko decode karega
 */
async function decryptPayload(encryptedData) {
    try {
        // System Check: Agar format valid encrypted string nahi hai, toh raw data return karo
        if (typeof encryptedData !== 'string' || !encryptedData.includes(':')) {
            return encryptedData;
        }

        // IV aur Ciphertext ko alag-alag split karein [cite: 175]
        const [ivHex, ciphertextHex] = encryptedData.split(":"); // [cite: 175]
        if (!ivHex || !ciphertextHex) {
            throw new Error("Invalid encrypted payload format."); // [cite: 176]
        }

        const iv = hexToUint8Array(ivHex); // [cite: 177]
        const ciphertext = hexToUint8Array(ciphertextHex); // [cite: 177]
        const secretKeyText = "maggikhalo"; // Source encryption key [cite: 177]

        // Key derive karke Web Crypto API se decrypt karein
        const cryptoKey = await deriveCryptoKey(secretKeyText); // [cite: 179]
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            cryptoKey,
            ciphertext
        ); // [cite: 179]

        // ArrayBuffer ko string aur fir JSON object mein convert karein
        const decryptedText = textDecoder.decode(decryptedBuffer); // [cite: 180]
        return JSON.parse(decryptedText); // [cite: 180]

    } catch (error) {
        console.error("Client-side decryption failed:", error); // [cite: 180]
        
        // Fallback: Agar simple JSON string hai toh parse karo, nahi toh wahi text de do
        try {
            return JSON.parse(encryptedData);
        } catch (e) {
            return encryptedData;
        }
    }
}

// ==========================================
// 2. SMART AUTO-DECODER WRAPPER
// ==========================================

/**
 * Automatic Layer: Yeh check karegi ki response json hai, object hai, ya encrypted cipher text hai
 */
async function processApiResponse(response) {
    let rawContent;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        rawContent = await response.json();
    } else {
        rawContent = await response.text();
    }

    // Case A: Agar pure object mila aur uske andar encrypted '.data' property hai
    if (rawContent && rawContent.data && typeof rawContent.data === 'string') {
        console.log("System Check: Encrypted '.data' field detected inside object. Decoding...");
        return await decryptPayload(rawContent.data);
    }

    // Case B: Agar poora response hi ek encrypted string hai
    if (typeof rawContent === 'string' && rawContent.includes(':')) {
        console.log("System Check: Raw encrypted payload string detected. Decoding...");
        return await decryptPayload(rawContent);
    }

    // Case C: Agar data pehle se plain object/JSON hai, toh bina kuch kiye return karo
    console.log("System Check: Data is already plain JSON or text. Skipping decryption.");
    return rawContent;
}

// ==========================================
// 3. OPTIMIZED FETCH FUNCTION TO USE IN DASHBOARD
// ==========================================

/**
 * Is function ko aap apne poore project mein API hit karne ke liye run karein
 */
async function smartFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`); // [cite: 116]
        
        // Auto-decode wrapper chalayein
        const cleanData = await processApiResponse(response);
        return cleanData;
    } catch (error) {
        console.error(`SmartFetch tracking error for URL: ${url}`, error);
        throw error;
    }
}