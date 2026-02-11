const iso3166 = require('iso-3166-1');

// Regional Indicator Symbol A is 127462 (0x1F1E6)
const RIS_A = 0x1F1E6;

/**
 * Converts a pair of regional indicator symbols to an ISO 3166-1 alpha-2 code.
 * @param {string} flagEmoji - The flag emoji (2 characters).
 * @returns {string|null} The ISO code, or null if invalid.
 */
function emojiToIso(flagEmoji) {
    if (!flagEmoji || flagEmoji.length < 2) return null;

    const char1 = flagEmoji.codePointAt(0);
    // Be careful with surrogate pairs in JS strings.
    // Flag emojis are usually represented by 2 code points, but in UTF-16 strings they might take 4 chars (2 surrogates each).
    // However, if we iterate by code points properly...

    // Let's assume the input is exactly the flag emoji string.
    // We can iterate over code points.
    const codePoints = [];
    for (const char of flagEmoji) {
        codePoints.push(char.codePointAt(0));
    }

    // Actually, iterating a string with `for...of` iterates over code points (mostly).
    // Let's re-verify:
    // '🇺🇸' has length 4 in UTF-16, but 2 code points.
    // [...'🇺🇸'] -> ['🇺', '🇸'] (Regional Indicator Symbol U and S)

    const chars = [...flagEmoji];
    if (chars.length !== 2) return null;

    const cp1 = chars[0].codePointAt(0);
    const cp2 = chars[1].codePointAt(0);

    if (cp1 >= RIS_A && cp1 <= RIS_A + 25 && cp2 >= RIS_A && cp2 <= RIS_A + 25) {
        const char1 = String.fromCharCode(cp1 - RIS_A + 'A'.charCodeAt(0));
        const char2 = String.fromCharCode(cp2 - RIS_A + 'A'.charCodeAt(0));
        return char1 + char2;
    }

    return null;
}

/**
 * Extracts the first valid country flag from a text string.
 * @param {string} text - The input text.
 * @returns {string|null} The ISO code of the first valid flag found, or null.
 */
function extractFirstFlag(text) {
    if (!text) return null;

    // Using spread syntax to handle code points correctly
    const chars = [...text];

    for (let i = 0; i < chars.length - 1; i++) {
        const cp1 = chars[i].codePointAt(0);
        const cp2 = chars[i+1].codePointAt(0);

        if (cp1 >= RIS_A && cp1 <= RIS_A + 25 && cp2 >= RIS_A && cp2 <= RIS_A + 25) {
            const potentialCode = String.fromCharCode(cp1 - RIS_A + 65) + String.fromCharCode(cp2 - RIS_A + 65);
            if (iso3166.whereAlpha2(potentialCode)) {
                return potentialCode;
            }
            // If it's a flag-like sequence but not a valid country, we might skip it or consider it invalid.
            // But we should continue searching? The rule says "take first valid one".
            // However, a user is unlikely to type an invalid flag emoji (most systems don't render them as flags).
            // But just in case, we continue.
        }
    }
    return null;
}

/**
 * Gets a random country.
 * @returns {object} { code: 'US', name: 'United States of America' }
 */
function getRandomCountry() {
    const all = iso3166.all();
    const random = all[Math.floor(Math.random() * all.length)];
    return {
        code: random.alpha2,
        name: random.country
    };
}

/**
 * Gets country name by code.
 * @param {string} code
 * @returns {string|null}
 */
function getCountryName(code) {
    const country = iso3166.whereAlpha2(code);
    return country ? country.country : null;
}

module.exports = {
    emojiToIso,
    extractFirstFlag,
    getRandomCountry,
    getCountryName
};
