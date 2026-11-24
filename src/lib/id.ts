const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const ID_LENGTH = 15
// 252 = 36 * 7: bytes >= 252 are rejected so every character is equally likely.
const LIMIT = 252

/** 15 chars [a-z0-9], PocketBase-compatible. */
export function newId(): string {
  let id = ''
  while (id.length < ID_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH * 2))
    for (const b of bytes) {
      if (b < LIMIT && id.length < ID_LENGTH) id += ALPHABET[b % 36]
    }
  }
  return id
}
