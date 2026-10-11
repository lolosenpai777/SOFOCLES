import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import clienteAxios from '../api/clienteAxios'
import AvatarDisplay from './AvatarDisplay'
import UserBadges from './UserBadges'
import FluidGlassCard from './ui/FluidGlassCard'
import { formatDateWithRelative } from '../utils/formatDate'
import './ProfilePage.css'

const ACCENT_COLORS = ['#3ECF8E', '#C9A24B', '#69B7FF', '#C084FC', '#F28B82']

function normalizeExternalUrl(value, platform) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (platform === 'twitter' && /^@[\w.]+$/.test(raw)) return `https://x.com/${raw.slice(1)}`
  if (platform === 'instagram' && /^@[\w.]+$/.test(raw)) return `https://instagram.com/${raw.slice(1)}`
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

function validatePlatformLink(value, platform) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (platform === 'twitter' && /^@[\w.]+$/.test(raw)) return ''
  if (platform === 'instagram' && /^@[\w.]+$/.test(raw)) return ''
  try {
    const parsed = new URL(normalizeExternalUrl(raw), window.location.origin)
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const allowed = platform === 'twitter' ? ['x.com', 'twitter.com'] : ['instagram.com']
    return allowed.includes(hostname) ? '' : `Usa un enlace de ${platform === 'twitter' ? 'X/Twitter' : 'Instagram'} válido.`
  } catch {
    return `Usa un enlace de ${platform === 'twitter' ? 'X/Twitter' : 'Instagram'} válido.`
  }
}

function linkifyBio(text) {
  return String(text || '').split(/(https?:\/\/[^\s]+|@[\w.-]+)/g).map((part, index) => {
    if (/^https?:\/\//.test(part)) return <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer">{part}</a>
    if (/^@[\w.-]+$/.test(part)) return <a key={`${part}-${index}`} href={`/${part.slice(1)}`}>{part}</a>
    return part
  })
}

function cropImageToDataUrl(file, aspectRatio) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('El archivo no es una imagen válida'))
      image.onload = () => {
        const sourceRatio = image.width / image.height
        let sourceWidth = image.width
        let sourceHeight = image.height
        let sourceX = 0
        let sourceY = 0
        if (sourceRatio > aspectRatio) {
          sourceWidth = Math.round(image.height * aspectRatio)
          sourceX = Math.round((image.width - sourceWidth) / 2)
        } else {
          sourceHeight = Math.round(image.width / aspectRatio)
          sourceY = Math.round((image.height - sourceHeight) / 2)
        }
        const canvas = document.createElement('canvas')
        const outputWidth = aspectRatio === 1 ? 800 : 1600
        canvas.width = outputWidth
        canvas.height = Math.round(outputWidth / aspectRatio)
        canvas.getContext('2d').drawImage(
          image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height,
        )
        resolve(canvas.toDataURL('image/webp', 0.84))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
}

function useCountUp(target, duration = 360) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !target) {
      setValue(target || 0)
      return undefined
    }
    const started = performance.now()
    let frame
    const tick = (now) => {
      const progress = Math.min((now - started) / duration, 1)
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}

export default function ProfilePage({ currentUser, onFollow, following = [] }) {
  const { username } = useParams()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('posts')
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0])
  const [avatarFile, setAvatarFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [bannerPreview, setBannerPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [followingProfile, setFollowingProfile] = useState(false)
  const [connectionsType, setConnectionsType] = useState(null)
  const [moderationMessage, setModerationMessage] = useState('')
  const [savedPosts, setSavedPosts] = useState([])
  const [linkErrors, setLinkErrors] = useState({ twitter: '', instagram: '' })
  const [verificationDocument, setVerificationDocument] = useState(null)
  const [verificationSelfie, setVerificationSelfie] = useState(null)
  const [verificationConsent, setVerificationConsent] = useState(false)
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        const usersResponse = await clienteAxios.get('/users', { params: { search: username } })
        const candidates = usersResponse.data?.users || usersResponse.data?.items || []
        const match = candidates.find(
          (item) => item.username?.toLowerCase() === username.toLowerCase(),
        )
        if (!match) {
          const notFound = new Error('Perfil no encontrado')
          notFound.statusCode = 404
          throw notFound
        }
        const profileResponse = await clienteAxios.get(`/users/${match.id}/profile`)
        if (!active) return
        setProfile(profileResponse.data)
        setBio(profileResponse.data.biography || '')
        setAvatarUrl(profileResponse.data.avatarUrl || '')
        setBannerUrl(profileResponse.data.bannerUrl || '')
        setWebsiteUrl(profileResponse.data.websiteUrl || '')
        setTwitterUrl(profileResponse.data.twitterUrl || '')
        setInstagramUrl(profileResponse.data.instagramUrl || '')
        setAccentColor(profileResponse.data.accentColor || ACCENT_COLORS[0])
        setAvatarPreview(profileResponse.data.avatarUrl || '')
        setBannerPreview(profileResponse.data.bannerUrl || '')
      } catch (loadError) {
        console.error(loadError)
        if (!active) return
        if (loadError.response?.status === 404 || loadError.statusCode === 404) {
          setError(`No existe un perfil público para @${username}.`)
        } else if (!loadError.response) {
          setError('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
        } else if (loadError.response.status >= 500) {
          setError('El servidor no pudo cargar este perfil. Inténtalo nuevamente en unos minutos.')
        } else {
          setError('No se pudo cargar este perfil por una respuesta inesperada.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [username])

  const isOwnProfile = Boolean(profile && currentUser?.id === profile.id)

  useEffect(() => {
    if (!isOwnProfile) return undefined
    let active = true
    clienteAxios.get('/posts/saved')
      .then(({ data }) => { if (active) setSavedPosts(data.posts || []) })
      .catch(() => { if (active) setSavedPosts([]) })
    return () => { active = false }
  }, [isOwnProfile])
  const isFollowing = Boolean(profile && following.includes(profile.id))
  const postsCount = useCountUp(profile?.postsCount || 0)
  const followersCount = useCountUp(profile?.followersCount || 0)
  const followingCountVal = useCountUp(profile?.followingCount || 0)
  const posts = useMemo(() => profile?.posts || [], [profile])

  useEffect(() => {
    setFollowingProfile(isFollowing)
  }, [isFollowing])

  const toggleProfileFollow = async () => {
    if (!profile || !onFollow) return
    const next = await onFollow(profile.id)
    if (typeof next === 'boolean') setFollowingProfile(next)
  }

  const moderateProfile = async (action) => {
    if (!profile || isOwnProfile) return
    try {
      if (action === 'report') {
        const details = window.prompt('Motivo del reporte', 'Comportamiento inapropiado')
        if (!details?.trim()) return
        await clienteAxios.post('/reports', { userId: profile.id, category: 'OTHER', details: details.trim() })
        setModerationMessage('Reporte enviado al equipo de moderación.')
      } else {
        const { data } = await clienteAxios.post(`/users/${profile.id}/${action}`)
        setModerationMessage(data[action === 'block' ? 'blocked' : 'muted'] ? 'Usuario bloqueado.' : 'Bloqueo retirado.')
      }
    } catch (moderationError) {
      setModerationMessage(moderationError.response?.data?.error || 'No se pudo completar la acción.')
    }
  }

  const togglePinned = async (postId) => {
    try {
      const { data } = await clienteAxios.post(`/posts/${postId}/pin`)
      setProfile((current) => ({ ...current, posts: current.posts.map((post) => ({ ...post, pinnedAt: post.id === postId && data.pinned ? data.pinnedAt : null })) }))
    } catch (pinError) {
      setModerationMessage(pinError.response?.data?.error || 'No se pudo fijar el post.')
    }
  }

  const saveProfile = async () => {
    const nextTwitterUrl = twitterUrl.trim()
    const nextInstagramUrl = instagramUrl.trim()
    const nextLinkErrors = {
      twitter: validatePlatformLink(nextTwitterUrl, 'twitter'),
      instagram: validatePlatformLink(nextInstagramUrl, 'instagram'),
    }

    setLinkErrors(nextLinkErrors)
    if (nextLinkErrors.twitter || nextLinkErrors.instagram) return
    try {
      setSaving(true)
      let nextAvatarUrl = avatarUrl
      let nextBannerUrl = bannerUrl
      if (avatarFile) {
        const imageData = await cropImageToDataUrl(avatarFile, 1)
        const { data } = await clienteAxios.post('/uploads/avatar', { imageData })
        nextAvatarUrl = data.url
      }
      if (bannerFile) {
        const imageData = await cropImageToDataUrl(bannerFile, 16 / 5)
        const { data } = await clienteAxios.post('/uploads/banner', { imageData })
        nextBannerUrl = data.url
      }
      const { data } = await clienteAxios.put('/users/profile', {
        biography: bio,
        avatarUrl: nextAvatarUrl,
        bannerUrl: nextBannerUrl,
        websiteUrl: normalizeExternalUrl(websiteUrl),
        twitterUrl: normalizeExternalUrl(nextTwitterUrl, 'twitter'),
        instagramUrl: normalizeExternalUrl(nextInstagramUrl, 'instagram'),
        accentColor,
      })
      const updatedProfile = data.user || data
      setAvatarUrl(updatedProfile.avatarUrl || nextAvatarUrl)
      setBannerUrl(updatedProfile.bannerUrl || nextBannerUrl)
      setAvatarPreview(updatedProfile.avatarUrl || nextAvatarUrl)
      setBannerPreview(updatedProfile.bannerUrl || nextBannerUrl)
      setWebsiteUrl(updatedProfile.websiteUrl || websiteUrl)
      setTwitterUrl(updatedProfile.twitterUrl || twitterUrl)
      setInstagramUrl(updatedProfile.instagramUrl || instagramUrl)
      setAccentColor(updatedProfile.accentColor || accentColor)
      setAvatarFile(null)
      setBannerFile(null)
      setProfile((current) => ({ ...current, ...updatedProfile, biography: bio }))
      setEditing(false)
    } catch (saveError) {
      console.error(saveError)
    } finally {
      setSaving(false)
    }
  }

  const verifyIdentity = async () => {
    if (!verificationDocument || !verificationSelfie || !verificationConsent) {
      setVerificationMessage('Selecciona el documento, toma una selfie y acepta el tratamiento temporal.')
      return
    }
    try {
      setVerificationLoading(true)
      setVerificationMessage('')
      const [documentImage, selfieImage] = await Promise.all([
        fileToDataUrl(verificationDocument),
        fileToDataUrl(verificationSelfie),
      ])
      const { data } = await clienteAxios.post('/users/identity-verification', {
        documentImage,
        selfieImage,
        consent: true,
      }, { timeout: 45000 })
      setProfile((current) => ({ ...current, isVerified: data.verified }))
      setVerificationMessage(data.verified
        ? 'Identidad verificada. Las imágenes fueron procesadas temporalmente y no se guardaron.'
        : `No pudimos verificarte${data.reason ? `: ${data.reason}` : '.'}`)
      setVerificationDocument(null)
      setVerificationSelfie(null)
      setVerificationConsent(false)
    } catch (verificationError) {
      setVerificationMessage(verificationError.response?.data?.error || 'No se pudo completar la verificación. Inténtalo de nuevo.')
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleImageChange = async (event, kind) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const preview = await cropImageToDataUrl(file, kind === 'avatar' ? 1 : 16 / 5)
      if (kind === 'avatar') {
        setAvatarFile(file)
        setAvatarPreview(preview)
      } else {
        setBannerFile(file)
        setBannerPreview(preview)
      }
    } catch (imageError) {
      console.error(imageError)
      setError('No se pudo preparar la imagen. Usa PNG, JPEG o WebP.')
    } finally {
      event.target.value = ''
    }
  }

  if (loading) return <div className="ProfilePage"><div className="ProfilePage__state">Cargando perfil...</div></div>
  if (error || !profile) return <div className="ProfilePage"><div className="ProfilePage__state">{error || 'Perfil no encontrado.'}<button onClick={() => navigate('/')}>Volver</button></div></div>

  return (
    <main className="ProfilePage" style={{ '--profile-accent': profile.accentColor || accentColor }}>
      <section className="ProfilePage__shell">
        <button type="button" className="ProfilePage__back" onClick={() => navigate(-1)}>← Volver al feed</button>
        
        <div 
          className="ProfilePage__banner" 
          style={bannerPreview ? { backgroundImage: `url(${bannerPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        />

        <div className="ProfilePage__identity profile-header">
          <div className="ProfilePage__avatar"><AvatarDisplay avatarUrl={avatarPreview || profile.avatarUrl} username={profile.username} size="lg" /></div>
          <div className="ProfilePage__identity-copy">
            <div className="profile-header-top">
              <div>
                <h1 className="profile-name">{profile.username} <UserBadges user={profile} /></h1>
                <p>@{profile.username}</p>
              </div>
              <div className="ProfilePage__actions">
                {isOwnProfile ? (
                  <button type="button" className="Btn-Secundario edit-btn" onClick={() => setEditing((current) => !current)}>{editing ? 'Cancelar' : 'Editar perfil'}</button>
                ) : currentUser ? (
                  <div className="ProfilePage__foreign-actions">
                    <button type="button" className={`Btn-Secundario edit-btn ${followingProfile ? 'Siguiendo' : ''}`} onClick={toggleProfileFollow}>{followingProfile ? 'Siguiendo' : 'Seguir'}</button>
                    <button type="button" className="Btn-Secundario edit-btn" onClick={() => moderateProfile('report')}>Reportar</button>
                    <button type="button" className="Btn-Secundario edit-btn" onClick={() => moderateProfile('block')}>Bloquear</button>
                  </div>
                ) : null}
              </div>
            </div>
            {!editing && profile.biography ? <p className="ProfilePage__bio">{linkifyBio(profile.biography)}</p> : null}
            {!editing && (profile.websiteUrl || profile.twitterUrl || profile.instagramUrl) && (
              <nav className="ProfilePage__social-links" aria-label="Enlaces sociales">
                {profile.websiteUrl && <a href={normalizeExternalUrl(profile.websiteUrl)} target="_blank" rel="noopener noreferrer">⌂ Sitio web</a>}
                {profile.twitterUrl && <a href={normalizeExternalUrl(profile.twitterUrl, 'twitter')} target="_blank" rel="noopener noreferrer">𝕏 X</a>}
                {profile.instagramUrl && <a href={normalizeExternalUrl(profile.instagramUrl, 'instagram')} target="_blank" rel="noopener noreferrer">◎ Instagram</a>}
              </nav>
            )}
            <p className="ProfilePage__joined">Se unió en {new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date(profile.joinDate))}</p>
          </div>
        </div>

        {editing ? (
          <div className="ProfilePage__editor">
            <label className="ProfilePage__field-label" htmlFor="profile-bio">Biografía</label>
            <p className="ProfilePage__counter">{bio.length}/160</p>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} placeholder="Cuéntanos sobre ti" />
            <label className="ProfilePage__field-label" htmlFor="profile-avatar">Avatar</label>
            <input id="profile-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleImageChange(event, 'avatar')} />
            {avatarPreview && <img className="ProfilePage__image-preview ProfilePage__image-preview--avatar" src={avatarPreview} alt="Vista previa del avatar" />}
            <label className="ProfilePage__field-label" htmlFor="profile-banner">Banner</label>
            <input id="profile-banner" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleImageChange(event, 'banner')} />
            {bannerPreview && <img className="ProfilePage__image-preview ProfilePage__image-preview--banner" src={bannerPreview} alt="Vista previa del banner" />}
            <label className="ProfilePage__field-label" htmlFor="profile-website">Sitio web</label>
            <input id="profile-website" type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://tusitio.com" />
            <label className="ProfilePage__field-label" htmlFor="profile-twitter">X / Twitter</label>
            <input id="profile-twitter" type="text" value={twitterUrl} onChange={(event) => { setTwitterUrl(event.target.value); setLinkErrors((current) => ({ ...current, twitter: '' })) }} placeholder="@usuario o https://x.com/usuario" aria-invalid={Boolean(linkErrors.twitter)} />
            {linkErrors.twitter && <p className="ProfilePage__field-error" role="alert">{linkErrors.twitter}</p>}
            <label className="ProfilePage__field-label" htmlFor="profile-instagram">Instagram</label>
            <input id="profile-instagram" type="text" value={instagramUrl} onChange={(event) => { setInstagramUrl(event.target.value); setLinkErrors((current) => ({ ...current, instagram: '' })) }} placeholder="@usuario o https://instagram.com/usuario" aria-invalid={Boolean(linkErrors.instagram)} />
            {linkErrors.instagram && <p className="ProfilePage__field-error" role="alert">{linkErrors.instagram}</p>}
            <label className="ProfilePage__field-label">Color de acento</label>
            <div className="ProfilePage__accent-picker" role="radiogroup" aria-label="Color de acento">
              {ACCENT_COLORS.map((color) => (
                <button key={color} type="button" className={accentColor === color ? 'is-selected' : ''} style={{ backgroundColor: color }} onClick={() => setAccentColor(color)} aria-label={`Elegir ${color}`} />
              ))}
            </div>
            <section className="ProfilePage__verification" aria-labelledby="profile-verification-title">
              <h2 id="profile-verification-title">Verificar identidad</h2>
              <p>Usaremos temporalmente un documento de identidad y una selfie para comprobar que pertenecen a la misma persona. No guardamos las imágenes ni extraemos datos personales. Esto no sustituye una verificación legal.</p>
              <label className="ProfilePage__field-label" htmlFor="profile-document">Documento de identidad</label>
              <input id="profile-document" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setVerificationDocument(event.target.files?.[0] || null)} />
              <label className="ProfilePage__field-label" htmlFor="profile-selfie">Selfie en tiempo real</label>
              <input id="profile-selfie" type="file" accept="image/png,image/jpeg,image/webp" capture="user" onChange={(event) => setVerificationSelfie(event.target.files?.[0] || null)} />
              <label className="ProfilePage__consent">
                <input type="checkbox" checked={verificationConsent} onChange={(event) => setVerificationConsent(event.target.checked)} />
                <span>Acepto el procesamiento temporal de estas imágenes para esta comprobación.</span>
              </label>
              <button type="button" className="Btn-Secundario" onClick={verifyIdentity} disabled={verificationLoading}>
                {verificationLoading ? 'Comprobando...' : profile.isVerified ? 'Volver a verificar' : 'Verificar ahora'}
              </button>
              {verificationMessage && <p className="ProfilePage__verification-message" role="status">{verificationMessage}</p>}
            </section>
            <button type="button" className="Btn-Primario" onClick={saveProfile} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        ) : null}

        <p className="ProfilePage__stats ProfilePage__stats--interactive">
          <strong>{postsCount}</strong> posts · <button type="button" onClick={() => setConnectionsType('followers')}>{followersCount} seguidores</button> · <button type="button" onClick={() => setConnectionsType('following')}>{followingCountVal} siguiendo</button>
        </p>


        {moderationMessage && <p className="ProfilePage__notice">{moderationMessage}</p>}

        <nav className="ProfilePage__tabs" aria-label="Contenido del perfil">
          <button className={tab === 'posts' ? 'is-active' : ''} onClick={() => setTab('posts')}>Posts</button>
          <button className={tab === 'media' ? 'is-active' : ''} onClick={() => setTab('media')}>Multimedia</button>
          {isOwnProfile && <button className={tab === 'saved' ? 'is-active' : ''} onClick={() => setTab('saved')}>Guardados</button>}
        </nav>

        <section className="ProfilePage__posts">
          {(tab === 'saved' ? savedPosts : tab === 'media' ? posts.filter((post) => post.imageUrl) : posts).map((post) => (
            <FluidGlassCard
              as="article"
              key={post.id || post._id}
              className={`ProfilePage__post-card ProfilePage__post-link`}
              mode="cube"
              thickness={5}
              chromaticAberration={0.1}
              onClick={() => navigate(`/${username}/post/${post.id || post._id}`)}
              data-pinned={post.pinnedAt ? 'true' : 'false'}
            >
              {post.pinnedAt && <span className="ProfilePage__pinned-badge">📌 Fijado</span>}
              {post.title && <h2>{post.title}</h2>}
              {post.content && <p>{post.content}</p>}
              {post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" />}
              <div className="ProfilePage__post-meta">
                <time>{formatDateWithRelative(post.createdAt)}</time>
                {isOwnProfile && <button type="button" className="ProfilePage__pin-button" onClick={(event) => { event.stopPropagation(); togglePinned(post.id || post._id) }}>{post.pinnedAt ? 'Desfijar' : 'Fijar post'}</button>}
              </div>
            </FluidGlassCard>
          ))}
          {((tab === 'media' ? posts.filter((post) => post.imageUrl) : posts).length === 0) && <p className="ProfilePage__empty">Todavía no hay contenido en esta sección.</p>}
          {tab === 'saved' && savedPosts.length === 0 && <p className="ProfilePage__empty">No hay publicaciones guardadas.</p>}
        </section>
        {connectionsType && (
          <div className="ProfilePage__connections-backdrop" onClick={() => setConnectionsType(null)}>
            <section className="ProfilePage__connections" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="ProfilePage__connections-head"><h2>{connectionsType === 'followers' ? 'Seguidores' : 'Siguiendo'}</h2><button type="button" onClick={() => setConnectionsType(null)}>Cerrar</button></div>
              {(profile[connectionsType] || []).map((user) => (
                <button key={user.id} type="button" className="ProfilePage__connection" onClick={() => { setConnectionsType(null); navigate(`/${user.username}`) }}>
                  <AvatarDisplay avatarUrl={user.avatarUrl} username={user.username} size="sm" />
                  <span>@{user.username} <UserBadges user={user} /></span>
                </button>
              ))}
              {(profile[connectionsType] || []).length === 0 && <p className="ProfilePage__empty">No hay usuarios en esta lista.</p>}
            </section>
          </div>
        )}
      </section>
    </main>
  )
}
