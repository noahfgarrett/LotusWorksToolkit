const STORAGE_KEY = 'lwt-user-profile'

export interface UserProfile {
  name: string
  email: string
  initials: string
}

export function getUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'name' in parsed &&
      'email' in parsed &&
      'initials' in parsed &&
      typeof (parsed as UserProfile).name === 'string' &&
      typeof (parsed as UserProfile).email === 'string' &&
      typeof (parsed as UserProfile).initials === 'string'
    ) {
      return parsed as UserProfile
    }
    return null
  } catch {
    return null
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function generateInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word[0].toUpperCase())
    .slice(0, 3)
    .join('')
}

export function hasUserProfile(): boolean {
  return getUserProfile() !== null
}
