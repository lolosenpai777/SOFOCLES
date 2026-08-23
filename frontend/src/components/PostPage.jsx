import { useEffect, useMemo, useState } from 'react'
import clienteAxios from '../api/clienteAxios'
import AvatarDisplay from './AvatarDisplay'
import GiphySearch from './GiphySearch'
import FluidGlassCard from './ui/FluidGlassCard'
import { formatDateWithRelative } from '../utils/formatDate'
import { AuroraBackground } from './ui/aurora-background.jsx'
import './ProfilePage.css'
import './PostPage.css'

export default function PostPage({ postId, currentUser, onBack, onOpenProfile }) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [gif, setGif] = useState(null)
  const [showGifSearch, setShowGifSearch] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  
  const currentUserId = currentUser?.id || currentUser?._id
  const isOwner = useMemo(() => Boolean(post && currentUserId === (post.author?.id || post.authorId)), [currentUserId, post])

  const loadPost = async () => {
    try {
      setLoading(true); setError('')
      const { data } = await clienteAxios.get(`/posts/${postId}`)
      setPost(data.post); setTitle(data.post.title || ''); setContent(data.post.content || '')
    } catch (loadError) {
      console.error(loadError); setError(loadError.response?.data?.error || 'No se pudo cargar esta publicación.')
    } finally { setLoading(false) }
  }
  
  useEffect(() => { loadPost() }, [postId])

  const submitComment = async (event) => {
    event.preventDefault()
    if (!comment.trim() && !gif) return
    try {
      setSending(true)
      const { data } = await clienteAxios.post(`/posts/${post.id}/comments`, { text: comment.trim(), ...(gif ? { gifUrl: gif.originalUrl } : {}) })
      setPost((current) => ({ ...current, comments: [data.comment, ...(current.comments || [])] })); setComment(''); setGif(null)
    } catch (submitError) { setError(submitError.response?.data?.mensaje || 'No se pudo publicar tu comentario.') } finally { setSending(false) }
  }

  const deleteComment = async (commentId) => {
    try {
      await clienteAxios.delete(`/posts/${post.id}/comments/${commentId}`)
      setPost((current) => ({ ...current, comments: current.comments.filter((item) => item.id !== commentId) }))
    } catch { setError('No se pudo eliminar el comentario.') }
  }

  const savePost = async () => {
    try {
      setSaving(true)
      const { data } = await clienteAxios.put(`/posts/${post.id}`, { title: title.trim(), content: content.trim() })
      setPost(data.post); setEditing(false)
    } catch (saveError) { setError(saveError.response?.data?.error || 'No se pudo guardar la publicación.') } finally { setSaving(false) }
  }

  if (loading) return (
    <AuroraBackground>
      <main className="ProfilePage"><div className="ProfilePage__state">Cargando publicación...</div></main>
    </AuroraBackground>
  )

  if (error && !post) return (
    <AuroraBackground>
      <main className="ProfilePage"><div className="ProfilePage__state">{error}<button onClick={onBack}>Volver</button></div></main>
    </AuroraBackground>
  )

  const comments = post.comments || []
  const author = post.author || {}
  const openProfile = (user) => user?.username && onOpenProfile?.(user)

  return (
   
      <main className="ProfilePage PostPage">
        <section className="ProfilePage__shell">
          <button type="button" className="ProfilePage__back" onClick={onBack}>← Volver al feed</button>
          
          <div className="ProfilePage__banner" />
          
          <div className="ProfilePage__identity profile-header">
            <button type="button" className="ProfilePage__avatar PostPage__author" onClick={() => openProfile(author)} aria-label={`Ver perfil de ${author.username || 'usuario'}`}>
              <AvatarDisplay avatarUrl={author.avatarUrl} username={author.username || 'Usuario'} size="lg" />
            </button>
            <div className="ProfilePage__identity-copy">
              <div className="profile-header-top">
                <div>
                  <button type="button" className="PostPage__author-name" onClick={() => openProfile(author)}>@{author.username || 'Usuario'}</button>
                  <p>{post.createdAt ? formatDateWithRelative(post.createdAt) : 'Hace instantes'}</p>
                </div>
                {isOwner && <button type="button" className="Btn-Secundario edit-btn" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancelar' : 'Editar publicación'}</button>}
              </div>
            </div>
          </div>

          <FluidGlassCard as="article" className="ProfilePage__posts PostPage__post" mode="cube" thickness={5} chromaticAberration={0.1}>
            {editing ? (
              <div className="ProfilePage__editor">
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título" />
                <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} />
                <button type="button" className="Btn-Primario" onClick={savePost} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            ) : (
              <>
                <h2>{post.title || 'Pensamiento sin título'}</h2>
                <p>{post.content || 'Sin contenido.'}</p>
                {post.imageUrl && <img src={post.imageUrl} alt="Publicación" />}
              </>
            )}
          </FluidGlassCard>

          <section className="PostPage__comments" aria-labelledby="comments-heading">
            <h2 id="comments-heading">Comentarios <span>({comments.length})</span></h2>
            {error && <p className="PostPage__error">{error}</p>}
            
            {currentUser ? (
              <FluidGlassCard as="form" className="PostPage__composer" mode="cube" thickness={5} chromaticAberration={0.1} onSubmit={submitComment}>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} placeholder="Expresa tu opinión..." />
                {gif && (
                  <div className="PostPage__selected-gif">
                    <img src={gif.url} alt={gif.title || 'GIF seleccionado'} />
                    <button type="button" onClick={() => setGif(null)} aria-label="Quitar GIF">×</button>
                  </div>
                )}
                <div>
                  <span>{500 - comment.length} caracteres restantes</span>
                  <div className="PostPage__composer-actions">
                    <button type="button" className="Btn-Secundario" onClick={() => setShowGifSearch(true)}>GIF</button>
                    <button className="Btn-Primario" disabled={sending || (!comment.trim() && !gif)}>{sending ? 'Enviando...' : 'Comentar'}</button>
                  </div>
                </div>
              </FluidGlassCard>
            ) : (
              <p className="PostPage__signin">Inicia sesión para participar en la conversación.</p>
            )}

            <div className="PostPage__comment-list">
              {comments.length === 0 ? (
                <p className="ProfilePage__empty">Aún no hay opiniones sobre esta idea.</p>
              ) : (
                comments.map((item) => {
                  const itemAuthor = item.author || {};
                  const mine = currentUserId === (itemAuthor.id || item.authorId);
                  return (
                    <FluidGlassCard as="article" key={item.id} className="PostPage__comment" mode="cube" thickness={5} chromaticAberration={0.1}>
                      <button type="button" className="PostPage__comment-avatar" onClick={() => openProfile(itemAuthor)}>
                        <AvatarDisplay avatarUrl={itemAuthor.avatarUrl} username={itemAuthor.username || 'Usuario'} size="sm" />
                      </button>
                      <div>
                        <button type="button" className="PostPage__comment-author" onClick={() => openProfile(itemAuthor)}>@{itemAuthor.username || 'Usuario'}</button>
                        <p>{item.text}</p>
                        {item.gifUrl && <img src={item.gifUrl} alt="GIF del comentario" className="PostPage__gif" />}
                        <time>{item.createdAt ? formatDateWithRelative(item.createdAt) : 'Hace poco'}</time>
                      </div>
                      {mine && <button type="button" className="PostPage__delete" onClick={() => deleteComment(item.id)}>Eliminar</button>}
                    </FluidGlassCard>
                  );
                })
              )}
            </div>
          </section>

          {showGifSearch && (
            <GiphySearch onSelectGif={(selected) => { setGif(selected); setShowGifSearch(false) }} onClose={() => setShowGifSearch(false)} />
          )}
        </section>
      </main>
    
  )
}