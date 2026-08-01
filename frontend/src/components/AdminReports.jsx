import { useEffect, useState } from 'react'
import clienteAxios from '../api/clienteAxios'

export default function AdminReports({ onClose }) {
  const [reports, setReports] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await clienteAxios.get('/admin/reports')
      setReports(Array.isArray(data.items) ? data.items : data.items || [])
      setError('')
    } catch (err) {
      console.error(err)
      setError('No fue posible cargar los reportes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const resolve = async (id, removeContent) => {
    await clienteAxios.patch(`/admin/reports/${id}`, { status: 'RESOLVED', removeContent })
    load()
  }

  return (
    <div className="Modal-Overlay" role="presentation" onClick={onClose}>
      <section className="Modal-Confirmacion Admin-Modal" role="dialog" aria-label="Panel de moderación" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="Admin-Modal__header">
          <div>
            <h2 className="Titulo-Modal">Panel de Moderación</h2>
            <p className="Texto-Modal">Revisa reportes y toma acciones rápidas sin salir del flujo.</p>
          </div>
          <button className="Btn-Modal-Cancelar" onClick={onClose} aria-label="Cerrar panel">Cerrar</button>
        </div>

        <div className="Admin-Modal__body">
          {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}

          {loading ? (
            <div className="mt-4">Cargando reportes…</div>
          ) : reports.length === 0 ? (
            <div className="mt-4 rounded-3xl p-4 border" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.56)' }}>No hay reportes pendientes.</div>
          ) : (
            <div className="mt-4 grid gap-3">
              {reports.map((report) => (
                <article key={report.id} className="Admin-Card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="block text-sm" style={{ color: 'var(--text-primary)' }}>{report.reason}</strong>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Reportado por @{report.reporter.username} · <span style={{ color: '#f59e0b' }}>{report.status}</span></div>
                      <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{report.post ? `Publicación: ${report.post.title}` : `Usuario: @${report.reportedUser?.username}`}</div>
                    </div>
                    <div className="Admin-Card__actions">
                      <button className="Btn-Secundario" onClick={() => resolve(report.id, false)}>Resolver</button>
                      {report.post && <button className="Btn-Modal-Cancelar" style={{ background: '#991b1b', color: 'white', borderColor: '#991b1b' }} onClick={() => resolve(report.id, true)}>Retirar</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
