import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import clienteAxios from '../api/clienteAxios'
import AvatarDisplay from './AvatarDisplay'
import UserBadges from './UserBadges'
import GiphySearch from './GiphySearch'
import FluidGlassCard from './ui/FluidGlassCard'
import { formatDateWithRelative } from '../utils/formatDate'
import { AuroraBackground } from './ui/aurora-background.jsx'
import './ProfilePage.css'
import './PostPage.css'
import ReportPostModal from './ReportPostModal'
import QuotePostModal from './QuotePostModal'

function QuotedPostEmbed({ post, depth = 0 }) {
  if (!post) return null
  const images = post.imageUrls?.length ? post.imageUrls : (post.imageUrl ? [post.imageUrl] : [])
  return <div className="PostPage__quote-embed">
    <div className="PostPage__quote-author"><AvatarDisplay avatarUrl={post.author?.avatarUrl} username={post.author?.username || 'Usuario'} size="sm" /><strong>@{post.author?.username || 'usuario'} <UserBadges user={post.author} /></strong></div>
    {post.content && <p>{post.content}</p>}
    {images[0] && <img src={images[0]} alt="Imagen de la publicación citada" />}
    {depth === 0 && post.quotedPost && <QuotedPostEmbed post={post.quotedPost} depth={1} />}
  </div>
}

export default function PostPage({ currentUser }) {
  const { postId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [sending, setSending] = useState(false)
  const [gif, setGif] = useState(null)
  const [showGifSearch, setShowGifSearch] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedSaving, setSavedSaving] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteSaving, setQuoteSaving] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  
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

  // Scroll to comment if hash is present (e.g., #comment-5)
  useEffect(() => {
    if (!post || loading) return
    const hash = location.hash
    if (hash?.startsWith('#comment-')) {
      const commentEl = document.getElementById(hash.slice(1))
      if (commentEl) {
        commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        commentEl.classList.add('PostPage__comment--highlight')
        const timer = setTimeout(() => commentEl.classList.remove('PostPage__comment--highlight'), 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [post, loading, location.hash])

  const submitComment = async (event) => {
    event.preventDefault()
    if (!comment.trim() && !gif) return
    try {
      setSending(true)
      const { data } = await clienteAxios.post(`/posts/${post.id}/comments`, { text: comment.trim(), ...(gif ? { gifUrl: gif.originalUrl } : {}), ...(replyTo ? { parentCommentId: replyTo.id } : {}) })
      setPost((current) => ({ ...current, comments: [data.comment, ...(current.comments || [])] })); setComment(''); setGif(null)
      setReplyTo(null)
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

  const toggleSaved = async () => {
    try {
      setSavedSaving(true)
      const { data } = await clienteAxios.post(`/posts/${post.id}/save`)
      setPost((current) => ({ ...current, saved: data.saved }))
    } catch (saveError) { setError(saveError.response?.data?.error || 'No se pudo actualizar Guardados.') } finally { setSavedSaving(false) }
  }

  const quotePost = async () => {
    setQuoteOpen(true)
  }

  const publishQuote = async ({ title, content }) => {
    try {
      setQuoteSaving(true)
      const { data } = await clienteAxios.post(`/posts/${post.id}/quote`, { title, content })
      setQuoteOpen(false)
      navigate(`/${data.post.author?.username || currentUser?.username || ''}/post/${data.post.id}`)
    } catch (quoteError) { setError(quoteError.response?.data?.error || 'No se pudo citar la publicación.') } finally { setQuoteSaving(false) }
  }

  if (loading) return (
    <AuroraBackground>
      <main className="ProfilePage"><div className="ProfilePage__state">Cargando publicación...</div></main>
    </AuroraBackground>
  )

  if (error && !post) return (
    <AuroraBackground>
      <main className="ProfilePage"><div className="ProfilePage__state">{error}<button onClick={() => navigate('/')}>Volver</button></div></main>
    </AuroraBackground>
  )

  const comments = post.comments || []
  const author = post.author || {}
  const postImages = post.imageUrls?.length ? post.imageUrls : (post.imageUrl ? [post.imageUrl] : [])
  const openProfile = (user) => user?.username && navigate(`/${user.username}`)

  return (
   
      <main className="ProfilePage PostPage">
        <section className="ProfilePage__shell">
          <button type="button" className="ProfilePage__back" onClick={() => navigate(-1)}>← Volver al feed</button>
          
          <div className="ProfilePage__banner" />
          
          <div className="ProfilePage__identity profile-header">
            <button type="button" className="ProfilePage__avatar PostPage__author" onClick={() => openProfile(author)} aria-label={`Ver perfil de ${author.username || 'usuario'}`}>
              <AvatarDisplay avatarUrl={author.avatarUrl} username={author.username || 'Usuario'} size="lg" />
            </button>
            <div className="ProfilePage__identity-copy">
              <div className="profile-header-top">
                <div>
                  <span className="PostPage__author-name-wrap">
                    <button type="button" className="PostPage__author-name" onClick={() => openProfile(author)}>@{author.username || 'Usuario'}</button>
                    <UserBadges user={author} />
                  </span>
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
                {post.title && <h2>{post.title}</h2>}
                <p>{post.content || 'Sin contenido.'}</p>

                <div className="PostPage__post-actions">
                  <button type="button" className="icon-btn" onClick={toggleSaved} disabled={savedSaving}>{post.saved ? '★ Guardado' : '☆ Guardar'}</button>
                  {currentUser && <button type="button" className="icon-btn" onClick={quotePost}>❝ Citar</button>}
                  {currentUser && !isOwner && <button type="button" className="icon-btn danger" onClick={() => setReportOpen(true)}>⚑ Reportar</button>}
                </div>
                {postImages.length > 0 && <div className="PostPage__carousel"><img src={postImages[imageIndex]} alt="Publicación" />{postImages.length > 1 && <div><button type="button" onClick={() => setImageIndex((current) => (current - 1 + postImages.length) % postImages.length)}>‹</button><span>{imageIndex + 1}/{postImages.length}</span><button type="button" onClick={() => setImageIndex((current) => (current + 1) % postImages.length)}>›</button></div>}</div>}
                {post.quotedPost && <QuotedPostEmbed post={post.quotedPost} />}
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
                comments.filter((item) => !item.parentId).map((item) => {
                  const itemAuthor = item.author || {};
                  const mine = currentUserId === (itemAuthor.id || item.authorId);
                  return (
                    <FluidGlassCard as="article" key={item.id} id={`comment-${item.id}`} className="PostPage__comment" mode="cube" thickness={5} chromaticAberration={0.1}>
                      <button type="button" className="PostPage__comment-avatar" onClick={() => openProfile(itemAuthor)}>
                        <AvatarDisplay avatarUrl={itemAuthor.avatarUrl} username={itemAuthor.username || 'Usuario'} size="sm" />
                      </button>
                      <div>
                        <button type="button" className="PostPage__comment-author" onClick={() => openProfile(itemAuthor)}>@{itemAuthor.username || 'Usuario'} <UserBadges user={itemAuthor} /></button>
                        <p>{item.text}</p>
                        {item.gifUrl && <img src={item.gifUrl} alt="GIF del comentario" className="PostPage__gif" />}
                         <time>{item.createdAt ? formatDateWithRelative(item.createdAt) : 'Hace poco'}</time>
                         {currentUser && <button type="button" className="PostPage__reply" onClick={() => { setReplyTo(item); document.querySelector('.PostPage__composer textarea')?.focus() }}>Responder</button>}
                         {comments.filter((reply) => reply.parentId === item.id).map((reply) => <div key={reply.id} className="PostPage__reply-item"><strong>@{reply.author?.username || 'Usuario'} <UserBadges user={reply.author} /></strong><p>{reply.text}</p></div>)}
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
          {reportOpen && <ReportPostModal postId={post.id} onClose={() => setReportOpen(false)} onReported={() => setError('Reporte enviado al equipo de moderación.')} />}
          {quoteOpen && <QuotePostModal onClose={() => setQuoteOpen(false)} onSubmit={publishQuote} saving={quoteSaving} />}
        </section>
      </main>
    
  )
}
