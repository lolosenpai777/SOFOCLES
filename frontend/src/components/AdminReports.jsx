import { useEffect, useMemo, useState } from 'react'
import clienteAxios from '../api/clienteAxios'

const TEMP_SUSPENSION_PRESETS = [
  { label: '24h', value: 24 },
  { label: '3 días', value: 72 },
  { label: '7 días', value: 168 },
  { label: '30 días', value: 720 },
]

function statusToLabel(status) {
  if (status === 'OPEN') return 'Pendiente'
  if (status === 'REVIEWING') return 'En revisión'
  if (status === 'RESOLVED') return 'Resuelto'
  if (status === 'DISMISSED') return 'Descartado'
  return status
}

export default function AdminReports({ onClose }) {
  const [cases, setCases] = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [selectedCase, setSelectedCase] = useState(null)
  const [history, setHistory] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingCase, setLoadingCase] = useState(false)
  const [reason, setReason] = useState('')
  const [durationHours, setDurationHours] = useState(168)
  const [customDuration, setCustomDuration] = useState('')

  const loadCases = async () => {
    setLoading(true)
    try {
      const { data } = await clienteAxios.get('/admin/reports')
      setCases(Array.isArray(data.items) ? data.items : [])
      setError('')
    } catch (err) {
      console.error(err)
      setError('No fue posible cargar los casos de moderación.')
    } finally {
      setLoading(false)
    }
  }

  const loadCaseDetail = async (caseId) => {
    setLoadingCase(true)
    try {
      const [detailResponse] = await Promise.all([
        clienteAxios.get(`/admin/reports/${caseId}`),
        clienteAxios.patch(`/admin/reports/${caseId}/status`, { status: 'REVIEWING' }),
      ])
      const detail = detailResponse.data?.item
      setSelectedCase(detail)
      setReason('')
      setError('')
      if (detail?.post?.author?.id) {
        const historyResponse = await clienteAxios.get(
          `/admin/users/${detail.post.author.id}/moderation-history`,
        )
        setHistory(historyResponse.data?.history ?? null)
      } else {
        setHistory(null)
      }
      await loadCases()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'No se pudo abrir el detalle del caso.')
    } finally {
      setLoadingCase(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  useEffect(() => {
    if (!selectedCaseId) return
    loadCaseDetail(selectedCaseId)
  }, [selectedCaseId])

  const executeAction = async (actionType) => {
    if (!selectedCase) return
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Debes indicar un motivo de al menos 3 caracteres.')
      return
    }
    try {
      const payload = {
        actionType,
        reason: reason.trim(),
      }
      if (actionType === 'SUSPEND_TEMPORARY') {
        payload.durationHours =
          durationHours === 'custom' ? Number(customDuration) : Number(durationHours)
      }
      await clienteAxios.post(`/admin/reports/${selectedCase.id}/actions`, payload)
      await loadCaseDetail(selectedCase.id)
      setError('')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'No se pudo aplicar la acción de moderación.')
    }
  }

  const canExecuteActions = Boolean(selectedCase && selectedCase.status !== 'RESOLVED' && selectedCase.status !== 'DISMISSED')

  const warningCounter = useMemo(() => {
    return history?.warningsCount ?? 0
  }, [history])

  return (
    <div className="Modal-Overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="Modal-Confirmacion Admin-Modal"
        role="dialog"
        aria-label="Panel de moderación"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="Admin-Modal__header">
          <div>
            <h2 className="Titulo-Modal">Panel de Moderación</h2>
            <p className="Texto-Modal">
              Casos agrupados por publicación, priorizados por riesgo y volumen de reportes.
            </p>
          </div>
          <button className="Btn-Modal-Cancelar" onClick={onClose} aria-label="Cerrar panel">
            Cerrar
          </button>
        </div>

        <div className="Admin-Modal__body grid gap-4 md:grid-cols-[minmax(260px,1fr)_minmax(360px,1.4fr)]">
          <div>
            <h3 className="text-sm font-semibold mb-2">Cola de casos</h3>
            {loading ? (
              <div>Cargando casos…</div>
            ) : cases.length === 0 ? (
              <div className="rounded-2xl p-3 border" style={{ borderColor: 'var(--border)' }}>
                No hay casos pendientes.
              </div>
            ) : (
              <div className="grid gap-2">
                {cases.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`Admin-Card text-left ${selectedCaseId === item.id ? 'ring-2 ring-emerald-500' : ''}`}
                    onClick={() => setSelectedCaseId(item.id)}
                  >
                    <strong className="block text-sm">#{item.id} · {item.post?.title || 'Publicación sin título'}</strong>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Estado: {statusToLabel(item.status)} · Prioridad: {item.priorityScore} · Reportes: {item.reportsCount}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Reportantes únicos: {item.distinctReportersCount}
                    </div>
                    {item.autoHiddenAt && (
                      <div className="text-xs mt-1" style={{ color: '#b45309' }}>
                        Ocultado preventivamente por múltiples reportes
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {error && (
              <p className="text-sm mb-2" style={{ color: '#ef4444' }}>
                {error}
              </p>
            )}

            {!selectedCaseId ? (
              <div className="rounded-2xl p-3 border" style={{ borderColor: 'var(--border)' }}>
                Selecciona un caso para ver reportes y tomar acciones.
              </div>
            ) : loadingCase || !selectedCase ? (
              <div>Cargando detalle del caso…</div>
            ) : (
              <div className="space-y-3">
                <article className="Admin-Card">
                  <strong className="block text-sm">
                    Publicación: {selectedCase.post?.title || 'Sin título'}
                  </strong>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Autor: @{selectedCase.post?.author?.username} · Estado:{' '}
                    {statusToLabel(selectedCase.status)}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Advertencias acumuladas del autor: {warningCounter}
                  </div>
                </article>

                <article className="Admin-Card">
                  <h4 className="text-sm font-semibold mb-2">Reportes del caso</h4>
                  <div className="grid gap-2 max-h-40 overflow-auto pr-1">
                    {selectedCase.reports?.map((report) => (
                      <div key={report.id} className="rounded-xl border p-2" style={{ borderColor: 'var(--border)' }}>
                        <div className="text-xs font-semibold">{report.reason}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          @{report.reporter?.username} · {new Date(report.createdAt).toLocaleString()}
                        </div>
                        {report.details && (
                          <p className="text-xs mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                            {report.details}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </article>

                <article className="Admin-Card">
                  <h4 className="text-sm font-semibold mb-2">Acción de moderación</h4>
                  <textarea
                    className="Input-Olimpo-Feed min-h-24 mb-2"
                    placeholder="Motivo de la acción"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={500}
                  />

                  <div className="Admin-Card__actions flex-wrap">
                    <button
                      className="Btn-Secundario"
                      disabled={!canExecuteActions}
                      onClick={() => executeAction('DISMISS_REPORT')}
                    >
                      Descartar
                    </button>
                    <button
                      className="Btn-Secundario"
                      disabled={!canExecuteActions}
                      onClick={() => executeAction('ISSUE_WARNING')}
                    >
                      Advertencia
                    </button>
                    <button
                      className="Btn-Secundario"
                      disabled={!canExecuteActions}
                      onClick={() => executeAction('DELETE_POST')}
                    >
                      Eliminar publicación
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                    <select
                      className="Input-Olimpo-Feed"
                      value={durationHours}
                      onChange={(event) => setDurationHours(event.target.value === 'custom' ? 'custom' : Number(event.target.value))}
                    >
                      {TEMP_SUSPENSION_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          Suspensión temporal: {preset.label}
                        </option>
                      ))}
                      <option value="custom">Suspensión temporal personalizada (horas)</option>
                    </select>
                    {durationHours === 'custom' && (
                      <input
                        type="number"
                        className="Input-Olimpo-Feed"
                        min={1}
                        value={customDuration}
                        onChange={(event) => setCustomDuration(event.target.value)}
                        placeholder="Horas"
                      />
                    )}
                  </div>

                  <div className="Admin-Card__actions mt-2 flex-wrap">
                    <button
                      className="Btn-Modal-Cancelar"
                      style={{ background: '#92400e', color: 'white', borderColor: '#92400e' }}
                      disabled={!canExecuteActions}
                      onClick={() => executeAction('SUSPEND_TEMPORARY')}
                    >
                      Suspender temporal
                    </button>
                    <button
                      className="Btn-Modal-Cancelar"
                      style={{ background: '#7f1d1d', color: 'white', borderColor: '#7f1d1d' }}
                      disabled={!canExecuteActions}
                      onClick={() => executeAction('SUSPEND_PERMANENT')}
                    >
                      Ban permanente
                    </button>
                  </div>
                </article>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
