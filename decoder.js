const crypto = require('crypto');

/**
 * Solid Node.js Decryption Function matching the Frontend AES-GCM Logic
 * @param {string} encryptedPayload - The raw response from the API (IV:Ciphertext)
 */
function decryptData(encryptedPayload) {
    try {
        // Agar data string nahi hai ya usme ':' nahi hai, toh wo encrypted nahi hai
        if (typeof encryptedPayload !== 'string' || !encryptedPayload.includes(':')) {
            return encryptedPayload;
        }

        // 1. IV aur Ciphertext ko split karein (Jaise source mein t aur s kiya tha)
        const [ivHex, encryptedHex] = encryptedPayload.split(':');
        if (!ivHex || !encryptedHex) {
            throw new Error("Invalid encrypted payload format.");
        }

        // 2. Encryption Key taiyar karein (32 bytes, padded with 0)
        const secretKey = "maggikhalo"; // Found in your source code!
        const keyBuffer = Buffer.alloc(32, 0);
        Buffer.from(secretKey, 'utf-8').copy(keyBuffer);

        // 3. Hex strings ko Buffers mein convert karein
        const iv = Buffer.from(ivHex, 'hex');
        const combinedCiphertext = Buffer.from(encryptedHex, 'hex');

        // 4. Web Crypto API ciphertext ke aakhri 16 bytes mein Auth Tag append karta hai
        const authTagLength = 16;
        if (combinedCiphertext.length < authTagLength) {
            throw new Error("Ciphertext length is too short.");
        }

        // Split ciphertext and auth tag
        const ciphertext = combinedCiphertext.subarray(0, combinedCiphertext.length - authTagLength);
        const authTag = combinedCiphertext.subarray(combinedCiphertext.length - authTagLength);

        // 5. Node.js Crypto module se Decrypt karein
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, 'binary', 'utf-8');
        decrypted += decipher.final('utf-8');

        // Decrypted data ko JSON mein parse karke return karein
        return JSON.parse(decrypted);

    } catch (error) {
        console.error("Client-side decryption failed or data is already plain:", error.message);
        
        // Fallback: Agar pehle se JSON string ho toh parse kar do, nahi toh raw return karo
        try {
            return JSON.parse(encryptedPayload);
        } catch (e) {
            return encryptedPayload;
        }
    }
}

/**
 * Smart Auto-Check Layer for API Fetching
 * Use this wrapper to automatically clean response data
 */
async function smartApiHandler(apiResponse) {
    // Agar response object hai (jaise axios ya fetch ka response)
    let rawData = apiResponse;
    
    // System Check 1: Agar data object hai aur usme .data encrypted form mein hai
    if (rawData && rawData.data && typeof rawData.data === 'string') {
        console.log("System Check: Encrypted payload found in response object. Decrypting...");
        return decryptData(rawData.data);
    }
    
    // System Check 2: Agar direct string payload mila hai
    if (typeof rawData === 'string') {
        return decryptData(rawData);
    }

    return rawData;
}

module.exports = { decryptData, smartApiHandler };