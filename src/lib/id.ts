const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

export function uid(prefix = ''): string {
  let s = ''
  const time = Date.now().toString(36)
  const rnd = new Uint8Array(10)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(rnd)
  } else {
    for (let i = 0; i < rnd.length; i++) rnd[i] = Math.floor(Math.random() * 256)
  }
  for (let i = 0; i < rnd.length; i++) s += ALPHABET[rnd[i] % ALPHABET.length]
  return `${prefix}${time}${s}`
}

export function clientId(): string {
  const KEY = 'familyos:client'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = uid('c_')
    localStorage.setItem(KEY, id)
  }
  return id
}
