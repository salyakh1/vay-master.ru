'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Specialization, Service } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/app/providers'

export default function OnboardingSpecializations() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [specializations, setSpecializations] = useState<Specialization[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login')
      } else {
        fetchReference()
      }
    }
  }, [authLoading, user, router])

  const fetchReference = async () => {
    try {
      const [{ data: specData }, { data: svcData }] = await Promise.all([
        supabase.from('specializations').select('*').order('name', { ascending: true }),
        supabase.from('services').select('*').order('name', { ascending: true }),
      ])
      setSpecializations((specData as Specialization[]) || [])
      setServices((svcData as Service[]) || [])
    } catch (err) {
      console.error(err)
      setError('Не удалось загрузить справочники')
    } finally {
      setLoading(false)
    }
  }

  const toggleSpec = (id: string) => {
    setSelectedSpecs((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id]
      // сбрасываем услуги, которые не подходят
      setSelectedServices((prevServices) =>
        prevServices.filter((svcId) => {
          const svc = services.find((s) => s.id === svcId)
          return svc ? next.includes(svc.specialization_id) : false
        })
      )
      return next
    })
  }

  const toggleService = (id: string) => {
    const svc = services.find((s) => s.id === id)
    if (svc && !selectedSpecs.includes(svc.specialization_id)) {
      setSelectedSpecs((prev) => [...prev, svc.specialization_id])
    }
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const filteredServices = services.filter((svc) => selectedSpecs.includes(svc.specialization_id))

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      // очистить старое
      await supabase.from('profile_specializations').delete().eq('profile_id', user.id)
      await supabase.from('profile_services').delete().eq('profile_id', user.id)

      if (selectedSpecs.length > 0) {
        const specPayload = selectedSpecs.map((specId) => ({
          profile_id: user.id,
          specialization_id: specId,
        }))
        await supabase.from('profile_specializations').insert(specPayload)
      }

      if (selectedServices.length > 0) {
        const svcPayload = selectedServices.map((svcId) => ({
          profile_id: user.id,
          service_id: svcId,
        }))
        await supabase.from('profile_services').insert(svcPayload)
      }

      router.push(`/profile/${user.id}`)
    } catch (err: any) {
      console.error(err)
      setError('Не удалось сохранить выбор. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">Выбор специализаций и услуг</h1>
        <p className="text-gray-600 mb-6">
          Выберите ваши специализации и конкретные услуги. Это поможет клиентам находить вас в поиске.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-3">Специализации</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto border border-gray-200 p-3 rounded">
            {specializations.map((spec) => (
              <label key={spec.id} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedSpecs.includes(spec.id)}
                  onChange={() => toggleSpec(spec.id)}
                  className="w-4 h-4"
                />
                <span>{spec.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-3">Услуги</h2>
          <p className="text-sm text-gray-500 mb-2">Список фильтруется по выбранным специализациям</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto border border-gray-200 p-3 rounded">
            {filteredServices.length === 0 ? (
              <p className="text-sm text-gray-500">Сначала выберите специализации.</p>
            ) : (
              filteredServices.map((svc) => (
                <label key={svc.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(svc.id)}
                    onChange={() => toggleService(svc.id)}
                    className="w-4 h-4"
                  />
                  <span>{svc.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-black text-white border border-black hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Сохранение...' : 'Сохранить и завершить'}
          </button>
          <button
            onClick={() => router.push('/feed')}
            className="px-4 py-2 text-sm font-medium bg-white text-black border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Пропустить
          </button>
        </div>
      </div>
    </div>
  )
}

