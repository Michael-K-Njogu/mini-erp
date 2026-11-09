export function getDisplayName(profile, user, fallback = 'User') {
  const authName = user?.user_metadata?.full_name
  return (
    profile?.display_name?.trim() ||
    (typeof authName === 'string' ? authName.trim() : '') ||
    user?.email ||
    fallback
  )
}

export function getInitials(name) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'U'
  )
}
