const { emojiToIso, extractFirstFlag, getRandomCountry, getCountryName } = require('../services/flagService');

console.log('Testing Flag Service...');

// Test 1: emojiToIso
const usFlag = '🇺🇸';
const usIso = emojiToIso(usFlag);
console.log(`emojiToIso('${usFlag}') -> ${usIso}`);
if (usIso !== 'US') throw new Error('Failed to convert US flag');

const frFlag = '🇫🇷';
const frIso = emojiToIso(frFlag);
console.log(`emojiToIso('${frFlag}') -> ${frIso}`);
if (frIso !== 'FR') throw new Error('Failed to convert FR flag');

// Test 2: extractFirstFlag
const text1 = 'Hello 🇺🇸 world';
const extracted1 = extractFirstFlag(text1);
console.log(`extractFirstFlag('${text1}') -> ${extracted1}`);
if (extracted1 !== 'US') throw new Error('Failed to extract flag from text');

const text2 = 'Multiple flags 🇫🇷 🇺🇸';
const extracted2 = extractFirstFlag(text2);
console.log(`extractFirstFlag('${text2}') -> ${extracted2}`);
if (extracted2 !== 'FR') throw new Error('Failed to extract first flag (FR) from text');

const text3 = 'No flag here';
const extracted3 = extractFirstFlag(text3);
console.log(`extractFirstFlag('${text3}') -> ${extracted3}`);
if (extracted3 !== null) throw new Error('Found flag where none existed');

// Test 3: getRandomCountry
const randomCountry = getRandomCountry();
console.log('Random Country:', randomCountry);
if (!randomCountry.code || !randomCountry.name) throw new Error('Invalid random country format');

// Test 4: getCountryName
const nameUS = getCountryName('US');
console.log(`getCountryName('US') -> ${nameUS}`);
if (nameUS !== 'United States of America') throw new Error('Failed to get US name');

console.log('All tests passed!');
