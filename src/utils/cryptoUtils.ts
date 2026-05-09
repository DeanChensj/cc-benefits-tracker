const CIPHER_KEY = 42;

export const obfuscateKey = (key: string): string => {
  const scrambled = key.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ CIPHER_KEY)).join('');
  return btoa(unescape(encodeURIComponent(scrambled)));
};

export const deobfuscateKey = (obfuscated: string): string => {
  try {
    const scrambled = decodeURIComponent(escape(atob(obfuscated)));
    return scrambled.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ CIPHER_KEY)).join('');
  } catch (err) {
    return obfuscated;
  }
};
