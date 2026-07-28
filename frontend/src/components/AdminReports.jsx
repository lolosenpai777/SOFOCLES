import { useEffect, useState } from 'react'
import clienteAxios from '../api/clienteAxios'

const pageStyle = { minHeight: '100vh', background: '#111827', color: '#f8fafc', padding: '32px 16px', fontFamily: 'system-ui, sans-serif' }
const buttonStyle = { border: '1px solid #475569', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', background: '#1e293b', color: '#f8fafc' }

export default function AdminReports({ onClose }) {
  const [reports, setReports] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try {
      const { data } = await clienteAxios.get('/admin/reports')
      setReports(Array.isArray(data.items) ? data.items : [])
      setError('')
    } catch {
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
  return <main style={pageStyle}><section style={{ maxWidth: 860, margin: '0 auto' }}>
    <button type="button" onClick={onClose} style={buttonStyle}>← Volver al feed</button>
    <h1 style={{ margin: '24px 0 6px', fontSize: 28 }}>Panel de moderación</h1>
    <p style={{ color: '#94a3b8', marginTop: 0 }}>Revisa los reportes recibidos y retira contenido cuando corresponda.</p>
    {error && <p style={{ color: '#fca5a5' }}>{error}</p>}
    {loading ? <p>Cargando reportes…</p> : reports.length === 0 ? <div style={{ background: '#1e293b', padding: 24, borderRadius: 12, border: '1px solid #334155' }}>No hay reportes pendientes.</div> : <div style={{ display: 'grid', gap: 12 }}>{reports.map((report) => <article key={report.id} style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #334155' }}>
      <strong>{report.reason}</strong> <span style={{ color: '#fbbf24' }}>· {report.status}</span>
      <p style={{ color: '#cbd5e1' }}>Reportado por @{report.reporter.username}</p>
      <p>{report.post ? `Publicación: ${report.post.title}` : `Usuario: @${report.reportedUser?.username}`}</p>
      <button type="button" style={buttonStyle} onClick={() => resolve(report.id, false)}>Resolver</button>
      {report.post && <button type="button" style={{ ...buttonStyle, marginLeft: 8, background: '#991b1b' }} onClick={() => resolve(report.id, true)}>Retirar contenido</button>}
    </article>)}</div>}
  </section></main>
}
