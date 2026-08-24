export default function UserBadges({ user, className = '' }) {
  if (!user) return null
  const staff = user.role === 'ADMIN' || (user.moderationRole && user.moderationRole !== 'NONE')
  return (
    <span className={`UserBadges ${className}`} aria-label={[user.isVerified && 'Cuenta verificada', staff && 'Staff'].filter(Boolean).join(', ')}>
      {user.isVerified && <span className="UserBadge UserBadge--verified" title="Cuenta verificada" aria-label="Cuenta verificada">✓</span>}
      {staff && <span className="UserBadge UserBadge--staff" title="Staff" aria-label="Staff">★</span>}
    </span>
  )
}
