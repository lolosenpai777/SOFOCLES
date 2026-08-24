import { useNavigate } from 'react-router-dom'
import FluidGlassCard from './ui/FluidGlassCard'
import './ProfilePage.css'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <main className="ProfilePage">
      <section className="ProfilePage__shell">
        <div className="ProfilePage__banner" />
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--marble)', marginBottom: '0.5rem' }}>404</h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Esta página no existe en el ágora de Sófocles.
          </p>
          <FluidGlassCard
            as="div"
            mode="cube"
            thickness={5}
            chromaticAberration={0.1}
            style={{ padding: '1.5rem', maxWidth: '24rem', margin: '0 auto' }}
          >
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Puede que el enlace esté roto o que el contenido haya sido eliminado.
            </p>
            <button
              type="button"
              className="Btn-Primario"
              onClick={() => navigate('/')}
            >
              Volver al feed
            </button>
          </FluidGlassCard>
        </div>
      </section>
    </main>
  )
}
