import { useEffect, useMemo, useState } from 'react'
import clienteAxios from '../api/clienteAxios'
import './AdminUsersModeration.css'
import { formatDateWithRelative } from '../utils/formatDate'

function statusLabel(status) {
  if (status === 'WARNING') return 'Advertencia'
  if (status === 'SUSPENDED_TEMPORARY') return 'Suspendido temporal'
  if (status === 'BANNED_PERMANENT') return 'Baneado permanente'
  return status
}

export default function AdminUsersModeration({ onBack, onOpenReports }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [revocation, setRevocation] = useState(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [submittingRevoke, setSubmittingRevoke] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await clienteAxios.get('/admin/users/sanctions', {
        params: { q: query || undefined, status },
      })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setError('')
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar la lista de usuarios moderados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [query, status])

  const canConfirmRevocation = useMemo(() => revokeReason.trim().length >= 3, [revokeReason])

  const confirmRevoke = async () => {
    if (!revocation || !canConfirmRevocation) return
    setSubmittingRevoke(true)
    setError('')
    setSuccess('')
    try {
      await clienteAxios.post(
        `/admin/users/${revocation.user.id}/sanctions/${revocation.suspensionId}/revoke`,
        { reason: revokeReason.trim() },
      )
      setSuccess('Sanción revocada correctamente.')
      setRevocation(null)
      setRevokeReason('')
      await load()
    } catch (err) {
      console.error(err)
      setError('No se pudo revocar la sanción, revisa los datos e intenta de nuevo.')
    } finally {
      setSubmittingRevoke(false)
    }
  }

  return (
    <div className="AdminUsersPage">
      <main className="AdminUsersPage__shell">
        <header className="AdminUsersPage__header">
          <div>
            <h1 className="Titulo-Modal">Usuarios moderados</h1>
            <p className="Texto-Modal">Advertencias, suspensiones y baneos activos.</p>
          </div>
          <div className="AdminUsersPage__actions">
            <button type="button" className="Btn-Secundario" onClick={onOpenReports}>
              Ver casos
            </button>
            <button type="button" className="Btn-Modal-Cancelar" onClick={onBack}>
              Volver al feed
            </button>
          </div>
        </header>

        <section className="Admin-Card">
          <div className="AdminUsersPage__filters">
            <input
              className="Input-Olimpo-Feed"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por username"
            />
            <select
              className="Input-Olimpo-Feed"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="WARNING">Advertencia</option>
              <option value="SUSPENDED_TEMPORARY">Suspendido temporal</option>
              <option value="BANNED_PERMANENT">Baneado permanente</option>
            </select>
          </div>
        </section>

        {error && <p className="AdminUsersPage__error">{error}</p>}
        {success && <p className="AdminUsersPage__success">{success}</p>}

        <section className="Admin-Card AdminUsersPage__tableWrap">
          {loading ? (
            <div>Cargando usuarios...</div>
          ) : items.length === 0 ? (
            <div>No hay usuarios moderados para este filtro.</div>
          ) : (
            <table className="AdminUsersPage__table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Motivo</th>
                  <th>Moderador</th>
                  <th>Fecha</th>
                  <th>Expira</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.user.id}-${item.status}`}>
                    <td>@{item.user.username}</td>
                    <td>{statusLabel(item.status)}</td>
                    <td>{item.action?.reason || '—'}</td>
                    <td>@{item.action?.moderator?.username || 'sistema'}</td>
                    <td>{item.action?.createdAt ? formatDateWithRelative(item.action.createdAt) : '—'}</td>
                    <td>{item.status === 'SUSPENDED_TEMPORARY' ? formatDateWithRelative(item.expiresAt) : '—'}</td>
                    <td>
                      {item.revocable && (
                        <button
                          type="button"
                          className="Btn-Modal-Cancelar"
                          onClick={() => {
                            setRevocation(item)
                            setRevokeReason('')
                            setError('')
                            setSuccess('')
                          }}
                        >
                          Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {revocation && (
        <div className="Modal-Overlay" role="presentation" onMouseDown={() => setRevocation(null)}>
          <section
            className="Modal-Confirmacion w-full max-w-lg"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="Titulo-Modal">Confirmar revocación</h3>
            <p className="Texto-Modal mt-2">
              Vas a revocar la sanción de @{revocation.user.username}. Esta acción quedará registrada en auditoría.
            </p>
            <textarea
              className="Input-Olimpo-Feed mt-3 min-h-24"
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              placeholder="Motivo de revocación (obligatorio)"
              maxLength={500}
            />
            <div className="Acciones-Modal">
              <button type="button" className="Btn-Modal-Cancelar" onClick={() => setRevocation(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="Btn-Modal-Confirmar"
                disabled={!canConfirmRevocation || submittingRevoke}
                onClick={confirmRevoke}
              >
                {submittingRevoke ? 'Revocando...' : 'Confirmar revocación'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
