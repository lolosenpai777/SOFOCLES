import { useState } from 'react'

export default function QuotePostModal({ onClose, onSubmit, saving = false }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentError, setContentError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (saving) return
    if (!content.trim()) {
      setContentError('Escribe un comentario para tu cita')
      return
    }
    setContentError('')
    onSubmit({ title: title.trim() || null, content: content.trim() })
  }

  return (
    <div className="Modal-Overlay" role="presentation" onMouseDown={onClose}>
      <section className="Modal-Confirmacion QuotePost-Modal" role="dialog" aria-modal="true" aria-labelledby="quote-post-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="Admin-Modal__header">
          <div>
            <h2 id="quote-post-title" className="Titulo-Modal">Citar publicación</h2>
            <p className="Texto-Modal">Añade tu comentario. El título es opcional.</p>
          </div>
          <button type="button" className="Btn-Modal-Cancelar" onClick={onClose} disabled={saving}>Cerrar</button>
        </div>
        <form className="Admin-Modal__body QuotePost-Modal__form" onSubmit={submit}>
          <label>
            <span>Título opcional</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Puedes dejarlo vacío" />
          </label>
          <label>
            <span>Comentario</span>
            <textarea value={content} onChange={(event) => { setContent(event.target.value); if (event.target.value.trim()) setContentError('') }} maxLength={2000} required autoFocus aria-invalid={Boolean(contentError)} aria-describedby={contentError ? 'quote-content-error' : undefined} placeholder="¿Qué quieres añadir a esta cita?" />
            {contentError && <p id="quote-content-error" className="QuotePost-Modal__error" role="alert">{contentError}</p>}
          </label>
          <div className="QuotePost-Modal__actions">
            <button type="button" className="Btn-Modal-Cancelar" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="Btn-Modal-Confirmar" disabled={saving}>{saving ? 'Publicando...' : 'Publicar cita'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
