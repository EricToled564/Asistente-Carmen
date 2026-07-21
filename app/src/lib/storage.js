const PREFIX = 'nava.'

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — silently ignore, nothing critical lives only here
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key)
}
