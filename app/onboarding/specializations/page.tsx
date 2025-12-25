'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase, Specialization, Service } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function SpecializationsOnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [specializations, setSpecializations] = useState<Specialization[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedSpecializationIds, setSelectedSpecializationIds] = useState<string[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchReferenceData = async () => {
    try {
      setLoading(true)
      const [specResult, svcResult] = await Promise.all([
        supabase.from('specializations').select('*').order('name', { ascending: true }),
        supabase.from('services').select('*').order('name', { ascending: true })
      ])

      if (specResult.error) throw specResult.error
      if (svcResult.error) throw svcResult.error

      setSpecializations((specResult.data as Specialization[]) || [])
      setServices((svcResult.data as Service[]) || [])
    } catch (error) {
      console.error('Error fetching reference data:', error)
      setError('Ошибка при загрузке данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user && user.role !== 'master') {
      router.push('/feed')
      return
    }

    if (user) {
      fetchReferenceData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router])

  const toggleSpecialization = (id: string) => {
    setSelectedSpecializationIds((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id]
      // Удаляем услуги, которые больше не принадлежат выбранным специализациям
      setSelectedServiceIds((prevServices) =>
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
    if (svc && !selectedSpecializationIds.includes(svc.specialization_id)) {
      // Автоматически выбираем специализацию, если она не выбрана
      setSelectedSpecializationIds((prev) => [...prev, svc.specialization_id])
    }
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!user) return

    if (selectedSpecializationIds.length === 0) {
      setError('Пожалуйста, выберите хотя бы одну специализацию')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Удаляем старые записи
      await supabase.from('profile_specializations').delete().eq('profile_id', user.id)
      await supabase.from('profile_services').delete().eq('profile_id', user.id)

      // Сохраняем специализации
      if (selectedSpecializationIds.length > 0) {
        const specPayload = selectedSpecializationIds.map((specId) => ({
          profile_id: user.id,
          specialization_id: specId,
        }))
        const { error: specError } = await supabase.from('profile_specializations').insert(specPayload)
        if (specError) throw specError
      }

      // Сохраняем услуги
      if (selectedServiceIds.length > 0) {
        const svcPayload = selectedServiceIds.map((svcId) => ({
          profile_id: user.id,
          service_id: svcId,
        }))
        const { error: svcError } = await supabase.from('profile_services').insert(svcPayload)
        if (svcError) throw svcError
      }

      // Редирект на профиль
      router.push(`/profile/${user.id}`)
    } catch (error: any) {
      console.error('Error saving specializations:', error)
      setError(error.message || 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const filteredServices = services.filter((svc) =>
    selectedSpecializationIds.includes(svc.specialization_id)
  )

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!user || user.role !== 'master') {
    return null
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card">
          <h1 className="text-2xl font-bold mb-2 text-black">Выберите специализации</h1>
          <p className="text-gray-600 mb-6">
            Выберите специализации, в которых вы работаете. Это поможет клиентам найти вас.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium mb-3 text-black">
              Специализации *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto border border-gray-200 p-4 rounded">
              {specializations.length === 0 ? (
                <p className="text-sm text-gray-500">Загрузка специализаций...</p>
              ) : (
                specializations.map((spec) => (
                  <label
                    key={spec.id}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpecializationIds.includes(spec.id)}
                      onChange={() => toggleSpecialization(spec.id)}
                      className="w-4 h-4"
                    />
                    <span>{spec.name}</span>
                  </label>
                ))
              )}
            </div>
            {selectedSpecializationIds.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Выбрано: {selectedSpecializationIds.length}
              </p>
            )}
          </div>

          {selectedSpecializationIds.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 text-black">
                Услуги (опционально)
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Выберите конкретные услуги, которые вы предоставляете
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 p-4 rounded">
                {filteredServices.length === 0 ? (
                  <p className="text-sm text-gray-500">Нет услуг для выбранных специализаций</p>
                ) : (
                  filteredServices.map((svc) => (
                    <label
                      key={svc.id}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(svc.id)}
                        onChange={() => toggleService(svc.id)}
                        className="w-4 h-4"
                      />
                      <span>{svc.name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedServiceIds.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Выбрано услуг: {selectedServiceIds.length}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || selectedSpecializationIds.length === 0}
              className="btn btn-primary flex-1"
            >
              {saving ? 'Сохранение...' : 'Сохранить и продолжить'}
            </button>
            <button
              onClick={() => router.push('/feed')}
              className="btn btn-secondary"
            >
              Пропустить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

