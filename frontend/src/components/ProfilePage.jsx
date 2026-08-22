import { useEffect, useMemo, useState } from 'react'
import clienteAxios from '../api/clienteAxios'
import AvatarDisplay from './AvatarDisplay'
import { formatDateWithRelative } from '../utils/formatDate'
import './ProfilePage.css'

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

export default function ProfilePage({ username, currentUser, onBack, onFollow, following = [] }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('posts')
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [followingProfile, setFollowingProfile] = useState(false)

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
  const isFollowing = Boolean(profile && following.includes(profile.id))
  const postsCount = useCountUp(profile?.postsCount || 0)
  const followersCount = useCountUp(profile?.followersCount || 0)
  const followingCount = useCountUp(profile?.followingCount || 0)
  const posts = useMemo(() => profile?.posts || [], [profile])

  useEffect(() => {
    setFollowingProfile(isFollowing)
  }, [isFollowing])

  const toggleProfileFollow = async () => {
    if (!profile || !onFollow) return
    const next = await onFollow(profile.id)
    if (typeof next === 'boolean') setFollowingProfile(next)
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      const { data } = await clienteAxios.put('/users/profile', { biography: bio, avatarUrl })
      setProfile((current) => ({ ...current, ...data, biography: bio, avatarUrl }))
      setEditing(false)
    } catch (saveError) {
      console.error(saveError)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="ProfilePage"><div className="ProfilePage__state">Cargando perfil...</div></div>
  if (error || !profile) return <div className="ProfilePage"><div className="ProfilePage__state">{error || 'Perfil no encontrado.'}<button onClick={onBack}>Volver</button></div></div>

  return (
    <main className="ProfilePage">
      <section className="ProfilePage__shell">
        <button type="button" className="ProfilePage__back" onClick={onBack}>← Volver al feed</button>
        <div className="ProfilePage__banner" />
        <div className="ProfilePage__identity profile-header">
          <div className="ProfilePage__avatar"><AvatarDisplay avatarUrl={profile.avatarUrl} username={profile.username} size="lg" /></div>
          <div className="ProfilePage__identity-copy">
            <div className="profile-header-top">
              <div>
                <h1 className="profile-name">{profile.username}</h1>
                <p>@{profile.username}</p>
              </div>
              <div className="ProfilePage__actions">
                {isOwnProfile ? (
                  <button type="button" className="Btn-Secundario edit-btn" onClick={() => setEditing((current) => !current)}>{editing ? 'Cancelar' : 'Editar perfil'}</button>
                ) : currentUser ? (
                  <button type="button" className={`Btn-Secundario edit-btn ${followingProfile ? 'Siguiendo' : ''}`} onClick={toggleProfileFollow}>{followingProfile ? 'Siguiendo' : 'Seguir'}</button>
                ) : null}
              </div>
            </div>
            {!editing && profile.biography ? <p className="ProfilePage__bio">{profile.biography}</p> : null}
          </div>
        </div>

        {editing ? (
          <div className="ProfilePage__editor">
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} placeholder="Cuéntanos sobre ti" />
            <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="URL del avatar" />
            <button type="button" className="Btn-Primario" onClick={saveProfile} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        ) : null}

        <p className="ProfilePage__stats"><strong>{postsCount}</strong> posts · <strong>{followersCount}</strong> seguidores · <strong>{followingCount}</strong> siguiendo</p>

        <nav className="ProfilePage__tabs" aria-label="Contenido del perfil">
          <button className={tab === 'posts' ? 'is-active' : ''} onClick={() => setTab('posts')}>Posts</button>
          <button className={tab === 'media' ? 'is-active' : ''} onClick={() => setTab('media')}>Multimedia</button>
        </nav>

        <section className="ProfilePage__posts">
          {(tab === 'media' ? posts.filter((post) => post.imageUrl) : posts).map((post) => (
            <article key={post.id || post._id}>
              <h2>{post.title || 'Pensamiento sin título'}</h2>
              {post.content && <p>{post.content}</p>}
              {post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" />}
              <time>{formatDateWithRelative(post.createdAt)}</time>
            </article>
          ))}
          {((tab === 'media' ? posts.filter((post) => post.imageUrl) : posts).length === 0) && <p className="ProfilePage__empty">Todavía no hay contenido en esta sección.</p>}
        </section>
      </section>
    </main>
  )
}
