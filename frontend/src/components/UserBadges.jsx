export default function UserBadges({ user, className = '' }) {
  if (!user) return null
  const admin = user.role === 'ADMIN'
  const staff = !admin && user.moderationRole && user.moderationRole !== 'NONE'
  return (
    <span className={`UserBadges ${className}`} aria-label={[user.isVerified && 'Cuenta verificada', admin && 'Administrador', staff && 'Staff'].filter(Boolean).join(', ')}>
      {user.isVerified && <span className="UserBadge UserBadge--verified" title="Cuenta verificada" aria-label="Cuenta verificada">✓</span>}
      {admin && <img className="UserBadge UserBadge--admin" src="/leaf-svgrepo-com.svg" title="Administrador" alt="Administrador" />}
      {staff && <span className="UserBadge UserBadge--staff" title="Staff" aria-label="Staff">★</span>}
    </span>
  )
}
