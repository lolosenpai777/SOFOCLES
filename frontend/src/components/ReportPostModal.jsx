import { useMemo, useState } from 'react'
import clienteAxios from '../api/clienteAxios'

const CATEGORY_OPTIONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'SEXUAL_CONTENT', label: 'Contenido sexual o desnudez' },
  { value: 'HATE_SPEECH', label: 'Discurso de odio o discriminación' },
  { value: 'HARASSMENT_BULLYING', label: 'Acoso o bullying' },
  { value: 'VIOLENCE_GRAPHIC', label: 'Violencia o contenido gráfico/perturbador' },
  { value: 'MISINFORMATION', label: 'Información falsa o engañosa' },
  { value: 'SELF_HARM_SUICIDE', label: 'Autolesión o suicidio' },
  { value: 'MINOR_SAFETY', label: 'Explotación o riesgo para menores' },
  { value: 'IMPERSONATION', label: 'Suplantación de identidad' },
  { value: 'COPYRIGHT_IP', label: 'Infracción de derechos de autor / propiedad intelectual' },
  { value: 'ILLEGAL_SALES', label: 'Venta de productos o servicios ilegales' },
  { value: 'OTHER', label: 'Otro' },
]

export default function ReportPostModal({ postId, onClose, onReported }) {
  const [category, setCategory] = useState('SPAM')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const requiresDetails = category === 'OTHER'
  const detailsLength = details.trim().length
  const canSubmit = useMemo(() => {
    if (!postId || saving) return false
    if (!requiresDetails) return true
    return detailsLength >= 20
  }, [postId, saving, requiresDetails, detailsLength])

  const submit = async (event) => {
    event.preventDefault()
    if (!canSubmit) {
      setError('Completa todos los campos requeridos antes de enviar el reporte.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await clienteAxios.post('/reports', {
        postId,
        category,
        details: details.trim() || undefined,
      })
      onReported?.()
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar el reporte.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="Modal-Overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="Modal-Confirmacion Admin-Modal"
        role="dialog"
        aria-modal="true"
        aria-label="Reportar publicación"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="Admin-Modal__header">
          <div>
            <h2 className="Titulo-Modal">Reportar publicación</h2>
            <p className="Texto-Modal">
              Tu reporte se enviará al equipo de moderación para revisión.
            </p>
          </div>
          <button type="button" className="Btn-Modal-Cancelar" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form className="Admin-Modal__body space-y-3" onSubmit={submit}>
          <label className="text-left text-sm block">
            <span className="font-semibold">Categoría</span>
            <select
              className="Input-Olimpo-Feed mt-2"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-left text-sm block">
            <span className="font-semibold">
              Detalles {requiresDetails ? '(obligatorio, mínimo 20 caracteres)' : '(opcional)'}
            </span>
            <textarea
              className="Input-Olimpo-Feed mt-2 min-h-28"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              placeholder="Describe brevemente el motivo del reporte"
            />
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {detailsLength}/1000
            </div>
          </label>

          {error && (
            <p className="text-sm" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="Btn-Modal-Cancelar" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="Btn-Modal-Confirmar" disabled={!canSubmit}>
              {saving ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
