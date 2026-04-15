const ACCESS_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const ACCESS_CODE_LENGTH = 4;
export const ACCESS_CODE_REGEX = new RegExp(`^[A-Z0-9]{${ACCESS_CODE_LENGTH}}$`);

export function generateAccessCode(length = ACCESS_CODE_LENGTH): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);

    return Array.from(bytes)
      .map((value) => ACCESS_CODE_ALPHABET[value % ACCESS_CODE_ALPHABET.length])
      .join("");
  }

  return Array.from({ length })
    .map(() => ACCESS_CODE_ALPHABET[Math.floor(Math.random() * ACCESS_CODE_ALPHABET.length)])
    .join("");
}
