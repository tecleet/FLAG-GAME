const iso3166 = require('iso-3166-1');

// Regional Indicator Symbol A is 127462 (0x1F1E6)
const RIS_A = 0x1F1E6;

/**
 * Converts a pair of regional indicator symbols to an ISO 3166-1 alpha-2 code.
 */
function emojiToIso(flagEmoji) {
    if (!flagEmoji || flagEmoji.length < 2) return null;
    const chars = [...flagEmoji];
    if (chars.length !== 2) return null;
    const cp1 = chars[0].codePointAt(0);
    const cp2 = chars[1].codePointAt(0);
    if (cp1 >= RIS_A && cp1 <= RIS_A + 25 && cp2 >= RIS_A && cp2 <= RIS_A + 25) {
        return String.fromCharCode(cp1 - RIS_A + 65) + String.fromCharCode(cp2 - RIS_A + 65);
    }
    return null;
}

/**
 * Extracts the first valid country flag from a text string.
 */
function extractFirstFlag(text) {
    if (!text) return null;
    const chars = [...text];
    for (let i = 0; i < chars.length - 1; i++) {
        const cp1 = chars[i].codePointAt(0);
        const cp2 = chars[i+1].codePointAt(0);
        if (cp1 >= RIS_A && cp1 <= RIS_A + 25 && cp2 >= RIS_A && cp2 <= RIS_A + 25) {
            const potentialCode = String.fromCharCode(cp1 - RIS_A + 65) + String.fromCharCode(cp2 - RIS_A + 65);
            if (iso3166.whereAlpha2(potentialCode)) return potentialCode;
        }
    }
    return null;
}

function getRandomCountry() {
    const all = iso3166.all();
    const random = all[Math.floor(Math.random() * all.length)];
    return { code: random.alpha2, name: random.country };
}

module.exports = { emojiToIso, extractFirstFlag, getRandomCountry };
