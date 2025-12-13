'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function EditProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    } else if (user) {
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
      setCity(user.city || '')
      setDescription(user.description || '')
    }
  }, [user, authLoading, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          city: city || null,
          description: description || null,
        })
        .eq('id', user.id)

      if (error) throw error

      router.push(`/profile/${user.id}`)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Ошибка при сохранении профиля')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h1 className="text-2xl font-bold mb-6">Редактировать профиль</h1>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  ФИО *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Город
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  О себе
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea"
                  rows={5}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn btn-outline"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

