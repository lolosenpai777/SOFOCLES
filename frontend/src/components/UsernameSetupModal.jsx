import { useEffect, useState } from 'react'
import clienteAxios from '../api/clienteAxios'

export default function UsernameSetupModal({ user, onCompleted }) {
  const [username, setUsername] = useState(user?.username || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setUsername(user?.username || '')
  }, [user?.id, user?.username])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { data } = await clienteAxios.patch('/auth/username', { username })
      onCompleted(data.usuario)
    } catch (err) {
      console.error(err)
      if (err.response?.status === 409) {
        setError('Ese nombre de usuario ya está en uso.')
      } else if (err.response?.status === 400) {
        setError(err.response.data?.error || 'Revisa el nombre de usuario e inténtalo nuevamente.')
      } else {
        setError('No se pudo guardar el nombre de usuario. Inténtalo nuevamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="Modal-Overlay fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="username-setup-title">
      <div className="Modal-Confirmacion w-full max-w-lg p-6">
        <h1 id="username-setup-title" className="Titulo-Modal">Elige tu nombre de usuario</h1>
        <p className="Texto-Modal mt-2">Confirma o cambia el nombre con el que aparecerás en Sófocles.</p>
        <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
          <label className="Form-Grupo">
            <span>Nombre de usuario</span>
            <input
              className="Input-Olimpo"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={40}
              required
              autoFocus
              disabled={saving}
            />
          </label>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button className="Btn-Modal-Confirmar" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
