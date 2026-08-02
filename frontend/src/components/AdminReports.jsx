import { useEffect, useMemo, useState } from 'react'
import clienteAxios from '../api/clienteAxios'
import './AdminReports.css'
import { formatAbsoluteDate, formatDateWithRelative } from '../utils/formatDate'

const PREVIEW_COLLAPSED_CHARS = 380

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

function actionToLabel(actionType) {
  if (actionType === 'DISMISS_REPORT') return 'Descartar'
  if (actionType === 'ISSUE_WARNING') return 'Advertencia'
  if (actionType === 'DELETE_POST') return 'Eliminar publicación'
  if (actionType === 'SUSPEND_TEMPORARY') return 'Suspensión temporal'
  if (actionType === 'SUSPEND_PERMANENT') return 'Ban permanente'
  return actionType
}

function collectPostImageUrls(post) {
  if (!post) return []

  const imageUrls = Array.isArray(post.imageUrls)
    ? post.imageUrls.filter(Boolean)
    : []

  const images = Array.isArray(post.images)
    ? post.images.map((img) => img?.url || img?.src).filter(Boolean)
    : []

  const mediaImages = Array.isArray(post.media)
    ? post.media
      .filter((item) => {
        const mediaType = typeof item?.type === 'string' ? item.type.toLowerCase() : ''
        return !mediaType || mediaType === 'image' || mediaType.startsWith('image/')
      })
      .map((item) => item?.url || item?.src)
      .filter(Boolean)
    : []

  const single = post.imageUrl ? [post.imageUrl] : []
  return Array.from(new Set([...single, ...imageUrls, ...images, ...mediaImages]))
}

export default function AdminReports({
  currentUser,
  onBack,
  initialCaseId = null,
  onCaseChange,
  onOpenUsersModeration,
}) {
  const [pendingCases, setPendingCases] = useState([])
  const [resolvedCases, setResolvedCases] = useState([])
  const [queueTab, setQueueTab] = useState('pending')
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId ? Number(initialCaseId) : null)
  const [selectedCase, setSelectedCase] = useState(null)
  const [history, setHistory] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingCase, setLoadingCase] = useState(false)
  const [reason, setReason] = useState('')
  const [contentDecision, setContentDecision] = useState('NONE')
  const [sanctionDecision, setSanctionDecision] = useState('NONE')
  const [durationHours, setDurationHours] = useState(168)
  const [customDuration, setCustomDuration] = useState('')
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false)
  const [submittingAction, setSubmittingAction] = useState(false)
  const [confirmAction, setConfirmAction] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [submittingReopen, setSubmittingReopen] = useState(false)

  const loadQueues = async () => {
    setLoading(true)
    try {
      const [pendingResponse, resolvedResponse] = await Promise.all([
        clienteAxios.get('/admin/reports', { params: { bucket: 'pending' } }),
        clienteAxios.get('/admin/reports', { params: { bucket: 'resolved' } }),
      ])
      setPendingCases(Array.isArray(pendingResponse.data?.items) ? pendingResponse.data.items : [])
      setResolvedCases(Array.isArray(resolvedResponse.data?.items) ? resolvedResponse.data.items : [])
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
      const detailResponse = await clienteAxios.get(`/admin/reports/${caseId}`)
      let detail = detailResponse.data?.item
      if (detail?.status === 'OPEN') {
        await clienteAxios.patch(`/admin/reports/${caseId}/status`, { status: 'REVIEWING' })
        detail = { ...detail, status: 'REVIEWING' }
      }
      setSelectedCase(detail)
      setIsPreviewExpanded(false)
      setReason('')
      setContentDecision('NONE')
      setSanctionDecision('NONE')
      setDurationHours(168)
      setCustomDuration('')
      setError('')
      setSuccessMsg('')
      if (detail?.post?.author?.id) {
        const historyResponse = await clienteAxios.get(
          `/admin/users/${detail.post.author.id}/moderation-history`,
        )
        setHistory(historyResponse.data?.history ?? null)
      } else {
        setHistory(null)
      }
      await loadQueues()
    } catch (err) {
      console.error(err)
      setError('No se pudo abrir el detalle del caso, intenta de nuevo.')
    } finally {
      setLoadingCase(false)
    }
  }

  useEffect(() => {
    loadQueues()
  }, [])

  useEffect(() => {
    if (!initialCaseId) return
    setSelectedCaseId(Number(initialCaseId))
  }, [initialCaseId])

  useEffect(() => {
    if (!selectedCaseId) return
    loadCaseDetail(selectedCaseId)
  }, [selectedCaseId])

  const selectCase = (caseId) => {
    setSelectedCaseId(caseId)
    onCaseChange?.(caseId)
  }

  const executeAction = async (dismiss = false) => {
    if (!selectedCase) return
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Debes indicar un motivo de al menos 3 caracteres.')
      return
    }

    const hasContentDecision = contentDecision === 'DELETE_POST'
    const hasSanctionDecision = sanctionDecision !== 'NONE'
    if (!dismiss && !hasContentDecision && !hasSanctionDecision) {
      setError('Debes seleccionar al menos una decisión de moderación.')
      return
    }

    let resolvedDuration = null
    if (!dismiss && sanctionDecision === 'SUSPEND_TEMPORARY') {
      resolvedDuration =
        durationHours === 'custom' ? Number(customDuration) : Number(durationHours)
      if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0) {
        setError('Debes indicar una duración válida para la suspensión temporal.')
        return
      }
    }

    try {
      setSubmittingAction(true)
      setError('')
      setSuccessMsg('')

      const payload = {
        dismiss,
        contentAction: dismiss ? null : hasContentDecision ? 'DELETE_POST' : null,
        sanctionAction: dismiss || !hasSanctionDecision ? null : sanctionDecision,
        reason: reason.trim(),
      }
      if (!dismiss && sanctionDecision === 'SUSPEND_TEMPORARY') {
        payload.durationHours = resolvedDuration
      }

      const { data } = await clienteAxios.post(`/admin/reports/${selectedCase.id}/actions`, payload)
      const updatedCase = data?.updatedCase
      const nextStatus = updatedCase?.status || data?.nextCaseStatus
      const isFinal = nextStatus === 'RESOLVED' || nextStatus === 'DISMISSED'

      setSuccessMsg('Acción aplicada correctamente.')
      setConfirmAction(false)

      if (isFinal) {
        setPendingCases((previous) => previous.filter((item) => item.id !== selectedCase.id))
      } else if (updatedCase) {
        setPendingCases((previous) => previous.map((item) => (item.id === updatedCase.id ? updatedCase : item)))
      }

      if (updatedCase && isFinal) {
        setResolvedCases((previous) => [updatedCase, ...previous.filter((item) => item.id !== updatedCase.id)])
      }

      if (updatedCase) {
        setSelectedCase((previous) => ({
          ...previous,
          ...updatedCase,
          post: updatedCase.post ?? previous?.post,
          reports: updatedCase.reports ?? previous?.reports,
        }))
      }
      await loadQueues()
    } catch (err) {
      console.error(err)
      setError('No se pudo aplicar la acción, revisa los datos e intenta de nuevo.')
    } finally {
      setSubmittingAction(false)
    }
  }

  const requestDismiss = () => {
    setContentDecision('NONE')
    setSanctionDecision('NONE')
    setDurationHours(168)
    setCustomDuration('')
    setConfirmAction(false)
    executeAction(true)
  }

  const requestResolve = () => {
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Debes indicar un motivo de al menos 3 caracteres.')
      return
    }

    const hasContentDecision = contentDecision === 'DELETE_POST'
    const hasSanctionDecision = sanctionDecision !== 'NONE'
    if (!hasContentDecision && !hasSanctionDecision) {
      setError('Debes seleccionar al menos una decisión de moderación.')
      return
    }

    const needsConfirmation =
      contentDecision === 'DELETE_POST' || sanctionDecision === 'SUSPEND_PERMANENT'

    if (needsConfirmation) {
      setConfirmAction(true)
      return
    }

    executeAction(false)
  }

  const reopenCase = async () => {
    if (!selectedCase) return
    if (!reopenReason.trim() || reopenReason.trim().length < 3) {
      setError('Debes indicar un motivo de reapertura de al menos 3 caracteres.')
      return
    }

    try {
      setSubmittingReopen(true)
      setError('')
      setSuccessMsg('')
      const { data } = await clienteAxios.post(`/admin/reports/${selectedCase.id}/reopen`, {
        reason: reopenReason.trim(),
      })
      const updatedCase = data?.updatedCase
      setSuccessMsg('Caso reabierto correctamente.')
      setConfirmReopen(false)
      setReopenReason('')
      setQueueTab('pending')

      if (updatedCase) {
        setResolvedCases((previous) => previous.filter((item) => item.id !== updatedCase.id))
        setPendingCases((previous) => [updatedCase, ...previous.filter((item) => item.id !== updatedCase.id)])
        setSelectedCase((previous) => ({
          ...previous,
          ...updatedCase,
          post: updatedCase.post ?? previous?.post,
          reports: previous?.reports ?? [],
        }))
      }

      await loadQueues()
      await loadCaseDetail(selectedCase.id)
    } catch (err) {
      console.error(err)
      setError('No se pudo reabrir el caso, revisa los datos e intenta de nuevo.')
    } finally {
      setSubmittingReopen(false)
    }
  }

  const canExecuteActions = Boolean(
    selectedCase && selectedCase.status !== 'RESOLVED' && selectedCase.status !== 'DISMISSED',
  )
  const isReasonValid = reason.trim().length >= 3
  const hasAnyResolutionDecision =
    contentDecision === 'DELETE_POST' || sanctionDecision !== 'NONE'
  const hasValidTemporaryDuration =
    sanctionDecision !== 'SUSPEND_TEMPORARY' ||
    ((durationHours === 'custom' ? Number(customDuration) : Number(durationHours)) > 0)
  const canReopenCase = Boolean(
    selectedCase &&
    (selectedCase.status === 'RESOLVED' || selectedCase.status === 'DISMISSED') &&
    (currentUser?.role === 'ADMIN' || currentUser?.moderationRole === 'ADMIN'),
  )
  const warningCounter = useMemo(() => history?.warningsCount ?? 0, [history])
  const selectedPost = selectedCase?.post ?? null
  const postContent = (selectedPost?.content || '').trim()
  const hasLongContent = postContent.length > PREVIEW_COLLAPSED_CHARS
  const previewContent =
    isPreviewExpanded || !hasLongContent
      ? postContent
      : `${postContent.slice(0, PREVIEW_COLLAPSED_CHARS)}...`
  const previewImages = collectPostImageUrls(selectedPost)
  const queueItems = queueTab === 'pending' ? pendingCases : resolvedCases
  const latestResolvedAction =
    selectedCase?.latestAction ??
    (Array.isArray(selectedCase?.actions) && selectedCase.actions.length > 0
      ? selectedCase.actions[0]
      : null)

  return (
    <div className="AdminReportsPage">
      <main className="AdminReportsPage__shell">
        <header className="AdminReportsPage__header">
          <div>
            <h1 className="Titulo-Modal">Panel de Moderación</h1>
            <p className="Texto-Modal">
              Casos agrupados por publicación, priorizados por riesgo y volumen de reportes.
            </p>
          </div>
          <div className="AdminReportsPage__header-actions">
            <button className="Btn-Secundario" type="button" onClick={onOpenUsersModeration}>
              Usuarios moderados
            </button>
            <button className="Btn-Modal-Cancelar" onClick={onBack} aria-label="Volver al feed">
              Volver al feed
            </button>
          </div>
        </header>

        <div className="AdminReportsPage__layout">
          <aside className="AdminReportsPage__column AdminReportsPage__column--cases">
            <h3 className="text-sm font-semibold mb-2">Cola de casos</h3>
            <div className="AdminReportsPage__tabs">
              <button
                type="button"
                className={`Btn-Secundario ${queueTab === 'pending' ? 'is-active' : ''}`}
                onClick={() => setQueueTab('pending')}
              >
                Pendientes
              </button>
              <button
                type="button"
                className={`Btn-Secundario ${queueTab === 'resolved' ? 'is-active' : ''}`}
                onClick={() => setQueueTab('resolved')}
              >
                Resueltos
              </button>
            </div>
            {loading ? (
              <div>Cargando casos...</div>
            ) : queueItems.length === 0 ? (
              <div className="rounded-2xl p-3 border" style={{ borderColor: 'var(--border)' }}>
                {queueTab === 'pending' ? 'No hay casos pendientes.' : 'No hay casos resueltos.'}
              </div>
            ) : (
              <div className="Cases-List">
                {queueItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`Admin-Card text-left ${selectedCaseId === item.id ? 'ring-2 ring-emerald-500' : ''}`}
                    onClick={() => selectCase(item.id)}
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
                    {queueTab === 'resolved' && item.latestAction && (
                      <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                        Acción: {actionToLabel(item.latestAction.actionType)} · Por @{item.latestAction.moderator?.username || 'sistema'} ·{' '}
                        {formatDateWithRelative(item.latestAction.createdAt)}
                        <br />
                        Motivo: {item.latestAction.reason}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="AdminReportsPage__column AdminReportsPage__column--detail">
            {error && (
              <p className="text-sm mb-2" style={{ color: '#ef4444' }}>
                {error}
              </p>
            )}
            {successMsg && (
              <p className="text-sm mb-2" style={{ color: '#10b981' }}>
                {successMsg}
              </p>
            )}

            {!selectedCaseId ? (
              <div className="rounded-2xl p-3 border" style={{ borderColor: 'var(--border)' }}>
                Selecciona un caso para ver reportes y tomar acciones.
              </div>
            ) : loadingCase || !selectedCase ? (
              <div>Cargando detalle del caso...</div>
            ) : (
              <div className="space-y-3">
                <article className="Admin-Card">
                  <h4 className="text-sm font-semibold mb-2">Vista previa de la publicación</h4>
                  <strong className="block text-sm">{selectedPost?.title || 'Sin título'}</strong>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Autor: @{selectedPost?.author?.username || 'desconocido'} · Fecha:{' '}
                    {selectedPost?.createdAt ? formatDateWithRelative(selectedPost.createdAt) : 'Sin fecha'} · Estado del post:{' '}
                    {selectedPost?.hiddenAt ? 'Oculto' : 'Visible'}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Estado del caso: {statusToLabel(selectedCase.status)} · Advertencias acumuladas del autor: {warningCounter}
                  </div>

                  {postContent ? (
                    <>
                      <p className="text-sm mt-3 whitespace-pre-wrap">{previewContent}</p>
                      {hasLongContent && (
                        <button
                          type="button"
                          className="Btn-Secundario mt-2"
                          onClick={() => setIsPreviewExpanded((previous) => !previous)}
                        >
                          {isPreviewExpanded ? 'Ver menos' : 'Ver más'}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
                      Esta publicación no tiene texto.
                    </p>
                  )}

                  {previewImages.length > 0 && (
                    <div
                      className={`Admin-PostMediaGrid ${previewImages.length === 1 ? 'Admin-PostMediaGrid--single' : ''}`}
                    >
                      {previewImages.map((url, index) => (
                        <img
                          key={`${url}-${index}`}
                          src={url}
                          alt={`Adjunto ${index + 1} de la publicación`}
                          className="Admin-PostMedia"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </article>

                <article className="Admin-Card">
                  <h4 className="text-sm font-semibold mb-2">Reportes del caso</h4>
                  <div className="Reports-List" style={{ maxHeight: '10rem', overflow: 'auto', paddingRight: '0.25rem' }}>
                    {selectedCase.reports?.map((report) => (
                      <div key={report.id} className="rounded-xl border p-2" style={{ borderColor: 'var(--border)' }}>
                        <div className="text-xs font-semibold">{report.reason}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          @{report.reporter?.username} · {formatDateWithRelative(report.createdAt)}
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

                {selectedCase.status === 'RESOLVED' || selectedCase.status === 'DISMISSED' ? (
                  <article className="Admin-Card">
                    <h4 className="text-sm font-semibold mb-2">Acción tomada</h4>
                    {latestResolvedAction ? (
                      <p className="text-sm whitespace-pre-wrap">
                        {actionToLabel(latestResolvedAction.actionType)} · Por @{latestResolvedAction.moderator?.username || 'sistema'} ·{' '}
                        {formatAbsoluteDate(latestResolvedAction.createdAt)}
                        <br />
                        Motivo: {latestResolvedAction.reason || 'Sin motivo'}
                      </p>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        No hay acción registrada para este caso.
                      </p>
                    )}

                    {canReopenCase && (
                      <div className="Admin-Card__actions mt-3">
                        <button
                          type="button"
                          className="Btn-Secundario"
                          disabled={submittingReopen}
                          onClick={() => {
                            setConfirmReopen(true)
                            setReopenReason('')
                          }}
                        >
                          Reabrir caso
                        </button>
                      </div>
                    )}
                  </article>
                ) : (
                  <article className="Admin-Card">
                    <h4 className="text-sm font-semibold mb-2">Acción de moderación</h4>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Selecciona una decisión sobre contenido y/o una sanción al usuario, luego aplica y resuelve el caso.
                    </p>
                    <textarea
                      className="Input-Olimpo-Feed min-h-24 mb-2"
                      placeholder="Motivo de la acción"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={500}
                    />

                    <div className="Action-Row">
                      <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        Decisión sobre contenido
                      </label>
                      <select
                        className="Input-Olimpo-Feed"
                        value={contentDecision}
                        onChange={(event) => setContentDecision(event.target.value)}
                        disabled={!canExecuteActions || submittingAction}
                      >
                        <option value="NONE">Sin acción sobre contenido</option>
                        <option value="DELETE_POST">Eliminar publicación</option>
                      </select>
                    </div>

                    <div className="Action-Row mt-2">
                      <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        Decisión sobre el usuario
                      </label>
                      <select
                        className="Input-Olimpo-Feed"
                        value={sanctionDecision}
                        onChange={(event) => setSanctionDecision(event.target.value)}
                        disabled={!canExecuteActions || submittingAction}
                      >
                        <option value="NONE">Sin sanción al usuario</option>
                        <option value="ISSUE_WARNING">Advertencia</option>
                        <option value="SUSPEND_TEMPORARY">Suspensión temporal</option>
                        <option value="SUSPEND_PERMANENT">Ban permanente</option>
                      </select>
                    </div>

                    {sanctionDecision === 'SUSPEND_TEMPORARY' && (
                      <div className="Action-Row mt-2">
                        <select
                          className="Input-Olimpo-Feed"
                          value={durationHours}
                          onChange={(event) =>
                            setDurationHours(
                              event.target.value === 'custom' ? 'custom' : Number(event.target.value)
                            )
                          }
                          disabled={!canExecuteActions || submittingAction}
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
                            disabled={!canExecuteActions || submittingAction}
                          />
                        )}
                      </div>
                    )}

                    <div className="Admin-Card__actions mt-3 flex-wrap">
                      <button
                        className="Btn-Secundario"
                        disabled={!canExecuteActions || submittingAction}
                        onClick={requestDismiss}
                      >
                        {submittingAction ? 'Aplicando...' : 'Descartar'}
                      </button>
                      <button
                        className="Btn-Modal-Confirmar"
                        style={{ background: '#92400e', color: 'white', borderColor: '#92400e' }}
                        disabled={
                          !canExecuteActions ||
                          submittingAction ||
                          !isReasonValid ||
                          !hasAnyResolutionDecision ||
                          !hasValidTemporaryDuration
                        }
                        onClick={requestResolve}
                      >
                        {submittingAction ? 'Aplicando...' : 'Aplicar y resolver caso'}
                      </button>
                    </div>
                  </article>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {confirmAction && (
        <div className="Modal-Overlay" role="presentation" onMouseDown={() => setConfirmAction(false)}>
          <section
            className="Modal-Confirmacion w-full max-w-lg"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="Titulo-Modal">Confirmar acción de alto impacto</h3>
            <p className="Texto-Modal mt-2">
              Esta resolución incluye una o más acciones sensibles:
              <strong>
                {contentDecision === 'DELETE_POST' ? ' eliminar publicación' : ''}
                {contentDecision === 'DELETE_POST' && sanctionDecision === 'SUSPEND_PERMANENT'
                  ? ' y'
                  : ''}
                {sanctionDecision === 'SUSPEND_PERMANENT' ? ' ban permanente' : ''}
              </strong>
              .
            </p>
            <p className="Texto-Modal mt-2">
              Motivo: <strong>{reason.trim()}</strong>
            </p>
            <div className="Acciones-Modal">
              <button type="button" className="Btn-Modal-Cancelar" onClick={() => setConfirmAction(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="Btn-Modal-Confirmar"
                disabled={!reason.trim() || reason.trim().length < 3 || submittingAction}
                onClick={() => executeAction(false)}
              >
                {submittingAction ? 'Aplicando...' : 'Confirmar'}
              </button>
            </div>
          </section>
        </div>
      )}

      {confirmReopen && selectedCase && (
        <div className="Modal-Overlay" role="presentation" onMouseDown={() => setConfirmReopen(false)}>
          <section
            className="Modal-Confirmacion w-full max-w-lg"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="Titulo-Modal">Confirmar reapertura de caso</h3>
            <p className="Texto-Modal mt-2">
              El caso #{selectedCase.id} volverá a estado <strong>En revisión</strong> y regresará a pendientes.
            </p>
            <textarea
              className="Input-Olimpo-Feed mt-3 min-h-24"
              value={reopenReason}
              onChange={(event) => setReopenReason(event.target.value)}
              placeholder="Motivo de reapertura (obligatorio)"
              maxLength={500}
            />
            <div className="Acciones-Modal">
              <button type="button" className="Btn-Modal-Cancelar" onClick={() => setConfirmReopen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="Btn-Modal-Confirmar"
                disabled={reopenReason.trim().length < 3 || submittingReopen}
                onClick={reopenCase}
              >
                {submittingReopen ? 'Reabriendo...' : 'Confirmar reapertura'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
