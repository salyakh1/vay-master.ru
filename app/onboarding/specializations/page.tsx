'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiBriefcase, FiCheck } from 'react-icons/fi'

type TreeCategory = {
  id: string
  name: string
  slug: string
  image_url?: string | null
  sort_order: number
  subcategories: Array<{
    id: string
    name: string
    slug: string
    image_url?: string | null
    sort_order: number
    services: Array<{ id: string; name: string; slug: string; sort_order: number }>
  }>
}

type Step = 'category' | 'subcategory' | 'service'

export default function SpecializationsOnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [tree, setTree] = useState<TreeCategory[]>([])
  const [step, setStep] = useState<Step>('category')
  const [currentCategoryId, setCurrentCategoryId] = useState<string>('')
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')
  const [filterImageFailed, setFilterImageFailed] = useState<Set<string>>(new Set())

  const fetchReferenceData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/master-categories/tree')
      const data = await res.json().catch(() => ({}))
      setTree((data?.tree as TreeCategory[]) || [])
    } catch (err) {
      console.error('Error fetching reference data:', err)
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
    if (user) fetchReferenceData()
  }, [user, authLoading, router])

  const currentCategory = tree.find((c) => c.id === currentCategoryId)
  const subcategoriesForStep = currentCategory?.subcategories || []
  const selectedSubcategoriesInCurrent = subcategoriesForStep.filter((s) => selectedSubcategoryIds.includes(s.id))
  const servicesForStep = selectedSubcategoriesInCurrent.flatMap((s) => s.services)

  const toggleSubcategory = (id: string) => {
    setSelectedSubcategoryIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      setSelectedServiceIds((prevSvc) =>
        prevSvc.filter((svcId) => {
          const sub = tree.flatMap((c) => c.subcategories).find((s) => s.services.some((v) => v.id === svcId))
          return !sub || next.includes(sub.id)
        })
      )
      return next
    })
  }

  const toggleService = (id: string) => {
    const sub = tree.flatMap((c) => c.subcategories).find((s) => s.services.some((v) => v.id === id))
    if (sub && !selectedSubcategoryIds.includes(sub.id)) {
      setSelectedSubcategoryIds((prev) => [...prev, sub.id])
    }
    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSave = async () => {
    if (!user) return
    if (selectedSubcategoryIds.length === 0) {
      setError('Выберите хотя бы одну подкатегорию')
      return
    }
    setSaving(true)
    setError('')
    setSaveSuccess(false)
    try {
      const [{ data: curSubs }, { data: curSvcs }] = await Promise.all([
        supabase.from('profile_subcategories').select('subcategory_id').eq('profile_id', user.id),
        supabase.from('profile_services').select('service_id').eq('profile_id', user.id),
      ])
      const curSubIds = new Set((curSubs || []).map((r) => r.subcategory_id as string))
      const curSvcIds = new Set((curSvcs || []).map((r) => r.service_id as string))
      const nextSub = new Set(selectedSubcategoryIds)
      const nextSvc = new Set(selectedServiceIds)

      const toDelSubs = [...curSubIds].filter((id) => !nextSub.has(id))
      const toAddSubs = selectedSubcategoryIds.filter((id) => !curSubIds.has(id))
      const toDelSvcs = [...curSvcIds].filter((id) => !nextSvc.has(id))
      const toAddSvcs = selectedServiceIds.filter((id) => !curSvcIds.has(id))

      if (toDelSubs.length) {
        const { error: e } = await supabase
          .from('profile_subcategories')
          .delete()
          .eq('profile_id', user.id)
          .in('subcategory_id', toDelSubs)
        if (e) throw e
      }
      if (toDelSvcs.length) {
        const { error: e } = await supabase
          .from('profile_services')
          .delete()
          .eq('profile_id', user.id)
          .in('service_id', toDelSvcs)
        if (e) throw e
      }
      if (toAddSubs.length) {
        const { error: e } = await supabase.from('profile_subcategories').insert(
          toAddSubs.map((subId) => ({ profile_id: user.id, subcategory_id: subId }))
        )
        if (e) throw e
      }
      if (toAddSvcs.length) {
        const { error: e } = await supabase.from('profile_services').insert(
          toAddSvcs.map((svcId) => ({ profile_id: user.id, service_id: svcId }))
        )
        if (e) throw e
      }

      setSaveSuccess(true)
      window.setTimeout(() => router.push('/'), 900)
    } catch (err: unknown) {
      console.error('Error saving:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении')
      setSaving(false)
    }
  }

  const goToCategories = () => {
    setStep('category')
    setCurrentCategoryId('')
  }

  const goToSubcategories = () => {
    setStep('subcategory')
  }

  const goToServices = () => {
    setStep('service')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }
  if (!user || user.role !== 'master') return null

  return (
    <div className="min-h-screen bg-white pb-24">
      <Navbar />
      {saveSuccess && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-6 bg-black/30">
          <div className="bg-[#1c1c1e]/95 text-white rounded-2xl px-5 py-4 shadow-xl max-w-xs w-full text-center">
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-[#22a85e] flex items-center justify-center">
              <FiCheck size={22} strokeWidth={3} />
            </div>
            <p className="text-[14px] font-bold">Специализации сохранены</p>
            <p className="text-[11px] text-white/70 mt-1">Переходим дальше…</p>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-1 text-black">Категории и услуги</h1>
        <p className="text-sm text-gray-600 mb-4">
          Выберите категории, подкатегории и услуги, в которых вы работаете. Как в фильтре поиска: сначала категория, затем подкатегории и услуги.
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {/* Шаг: Категория */}
        {step === 'category' && (
          <>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Категория</div>
            <div className="grid grid-cols-3 gap-2">
              {tree.map((cat) => {
                const showImage = cat.image_url && !filterImageFailed.has(cat.id)
                const imgSize = 88
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCurrentCategoryId(cat.id)
                      setStep('subcategory')
                    }}
                    className="flex flex-col overflow-hidden rounded-xl border border-border-light text-graphite-secondary hover:border-brand-accent/30 hover:bg-bg-secondary transition-all text-left"
                  >
                    <div className="w-full aspect-square flex-shrink-0 bg-bg-secondary flex items-center justify-center">
                      {showImage ? (
                        <img
                          src={cat.image_url!}
                          alt=""
                          width={imgSize * 2}
                          height={imgSize * 2}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={() => setFilterImageFailed((prev) => new Set(prev).add(cat.id))}
                        />
                      ) : (
                        <FiBriefcase size={32} className="text-text-muted" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-center leading-tight line-clamp-2 px-1 py-2 block">
                      {cat.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Шаг: Подкатегория */}
        {step === 'subcategory' && currentCategory && (
          <>
            <button
              type="button"
              onClick={goToCategories}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-graphite-secondary font-medium mb-3"
            >
              ← Назад к категориям
            </button>
            <div className="p-3 bg-bg-secondary rounded-lg mb-4">
              <span className="text-sm font-semibold text-graphite-secondary">{currentCategory.name}</span>
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Подкатегории (можно несколько)</div>
            <div className="grid grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1">
              {subcategoriesForStep.map((sub) => (
                <label
                  key={sub.id}
                  className={`flex items-center gap-3 border rounded-xl p-3 text-left text-sm cursor-pointer transition-all ${
                    selectedSubcategoryIds.includes(sub.id)
                      ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                      : 'border-border-light text-graphite-secondary hover:border-brand-accent/30 hover:bg-bg-secondary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSubcategoryIds.includes(sub.id)}
                    onChange={() => toggleSubcategory(sub.id)}
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="font-medium">{sub.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Выбрано подкатегорий: {selectedSubcategoryIds.length}</p>
            <div className="flex flex-col gap-3 mt-4">
              <button
                type="button"
                onClick={goToServices}
                disabled={selectedSubcategoriesInCurrent.length === 0}
                className="btn btn-primary w-full h-12"
              >
                Далее — выбрать услуги
              </button>
              {selectedSubcategoryIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-secondary w-full h-12"
                >
                  {saving ? 'Сохранение...' : 'Сохранить без выбора услуг'}
                </button>
              )}
            </div>
          </>
        )}

        {/* Шаг: Услуги */}
        {step === 'service' && currentCategory && (
          <>
            <button
              type="button"
              onClick={goToSubcategories}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-graphite-secondary font-medium mb-3"
            >
              ← Назад к подкатегориям
            </button>
            <div className="p-3 bg-bg-secondary rounded-lg mb-4">
              <span className="text-sm font-semibold text-graphite-secondary">{currentCategory.name}</span>
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Услуги (можно несколько)</div>
            <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1">
              {servicesForStep.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center gap-3 border rounded-xl p-3 text-left text-sm cursor-pointer transition-all ${
                    selectedServiceIds.includes(svc.id)
                      ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                      : 'border-border-light text-graphite-secondary hover:border-brand-accent/30 hover:bg-bg-secondary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(svc.id)}
                    onChange={() => toggleService(svc.id)}
                    className="w-4 h-4 shrink-0"
                  />
                  <span>{svc.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Выбрано услуг: {selectedServiceIds.length}</p>
            <div className="flex flex-col gap-3 mt-4">
              <button
                type="button"
                onClick={goToCategories}
                className="btn btn-secondary w-full h-12"
              >
                Добавить ещё категорию
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || selectedSubcategoryIds.length === 0}
                className="btn btn-primary w-full h-12"
              >
                {saving ? 'Сохранение...' : 'Сохранить и продолжить'}
              </button>
            </div>
          </>
        )}

        {/* Внизу при шаге категории: счётчики, Сохранить (если есть выбор), Пропустить */}
        {step === 'category' && (
          <div className="mt-6 flex flex-col gap-3">
            {selectedSubcategoryIds.length > 0 && (
              <>
                <p className="text-sm text-gray-600">
                  Уже выбрано: {selectedSubcategoryIds.length} подкатегорий, {selectedServiceIds.length} услуг. Выберите категорию выше, чтобы добавить ещё.
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary w-full h-12"
                >
                  {saving ? 'Сохранение...' : 'Сохранить и продолжить'}
                </button>
              </>
            )}
            <button type="button" onClick={() => router.push('/feed')} className="btn btn-secondary w-full h-12">
              Пропустить
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
