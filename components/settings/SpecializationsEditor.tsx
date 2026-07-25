'use client'

import { useEffect, useState } from 'react'
import { FiBriefcase, FiCheck } from 'react-icons/fi'
import type { CategoryNode } from '@/lib/masterCategoriesTree'

type Props = {
  tree: CategoryNode[]
  treeLoading: boolean
  treeError: string
  selectedSubcategoryIds: string[]
  selectedServiceIds: string[]
  saving: boolean
  saveSuccess?: boolean
  saveError?: string
  onDismissFeedback?: () => void
  onToggleSubcategory: (id: string) => void
  onToggleService: (id: string) => void
  onSave: () => void
  onRetry: () => void
}

type Step = 'category' | 'subcategory' | 'service'

export default function SpecializationsEditor({
  tree,
  treeLoading,
  treeError,
  selectedSubcategoryIds,
  selectedServiceIds,
  saving,
  saveSuccess = false,
  saveError = '',
  onDismissFeedback,
  onToggleSubcategory,
  onToggleService,
  onSave,
  onRetry,
}: Props) {
  const [step, setStep] = useState<Step>('category')
  const [currentCategoryId, setCurrentCategoryId] = useState('')
  const [filterImageFailed, setFilterImageFailed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (tree.length > 0 && !currentCategoryId) {
      setCurrentCategoryId(tree[0].id)
    }
  }, [tree, currentCategoryId])

  useEffect(() => {
    if (!saveSuccess) return
    const t = window.setTimeout(() => onDismissFeedback?.(), 2200)
    return () => window.clearTimeout(t)
  }, [saveSuccess, onDismissFeedback])

  const currentCategory = tree.find((c) => c.id === currentCategoryId)
  const subcategoriesForStep = currentCategory?.subcategories || []
  const selectedSubcategoriesInCurrent = subcategoriesForStep.filter((s) =>
    selectedSubcategoryIds.includes(s.id)
  )
  const servicesForStep = selectedSubcategoriesInCurrent.flatMap((s) => s.services)

  // Не прячем редактор при фоновой перезагрузке — иначе «зависает» на «Загрузка…»
  if (treeLoading && tree.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-[#8e8e93]">
        Загрузка категорий…
      </div>
    )
  }

  if (treeError && tree.length === 0) {
    return (
      <div className="py-4 space-y-3">
        <p className="text-sm text-red-600">{treeError}</p>
        <button type="button" onClick={onRetry} className="w-full btn btn-secondary text-sm">
          Повторить
        </button>
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="py-4 space-y-3">
        <p className="text-sm text-[#8e8e93]">Каталог категорий пока пуст.</p>
        <button type="button" onClick={onRetry} className="w-full btn btn-secondary text-sm">
          Обновить
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-1 relative">
      {saveSuccess && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none px-6">
          <div className="pointer-events-auto bg-[#1c1c1e]/92 text-white rounded-2xl px-5 py-4 shadow-xl max-w-xs w-full text-center animate-slide-up">
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-[#22a85e] flex items-center justify-center">
              <FiCheck size={22} strokeWidth={3} />
            </div>
            <p className="text-[14px] font-bold">Специализации сохранены</p>
            <p className="text-[11px] text-white/70 mt-1">
              {selectedSubcategoryIds.length} подкатегор. · {selectedServiceIds.length} услуг
            </p>
          </div>
        </div>
      )}

      <p className="text-[11px] text-[#8e8e93] leading-relaxed">
        Выберите категорию, подкатегории и услуги, в которых вы работаете.
      </p>

      <div className="flex gap-2 text-[10px] font-semibold">
        <span className="bg-[#fff1f2] text-brand-accent px-2 py-1 rounded-full">
          Подкатегории: {selectedSubcategoryIds.length}
        </span>
        <span className="bg-[#f5f5f7] text-[#555] px-2 py-1 rounded-full">
          Услуги: {selectedServiceIds.length}
        </span>
      </div>

      {step === 'category' && (
        <>
          <div className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-wide">Категория</div>
          <div className="grid grid-cols-3 gap-2">
            {tree.map((cat) => {
              const showImage = cat.image_url && !filterImageFailed.has(cat.id)
              const hasSelected = cat.subcategories.some((s) => selectedSubcategoryIds.includes(s.id))
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCurrentCategoryId(cat.id)
                    setStep('subcategory')
                  }}
                  className={`flex flex-col overflow-hidden rounded-xl border bg-white text-left active:scale-[0.98] transition-transform ${
                    hasSelected ? 'border-brand-accent ring-1 ring-brand-accent/30' : 'border-[#e5e5ea]'
                  }`}
                >
                  <div className="w-full aspect-square bg-[#f2f2f7] flex items-center justify-center relative">
                    {showImage ? (
                      <img
                        src={cat.image_url!}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setFilterImageFailed((prev) => new Set(prev).add(cat.id))}
                      />
                    ) : (
                      <FiBriefcase size={24} className="text-[#c7c7cc]" />
                    )}
                    {hasSelected && (
                      <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-brand-accent text-white flex items-center justify-center">
                        <FiCheck size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight line-clamp-2 px-1 py-2 text-[#1c1c1e]">
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {step === 'subcategory' && currentCategory && (
        <>
          <button
            type="button"
            onClick={() => setStep('category')}
            className="text-xs text-[#8e8e93] hover:text-[#1c1c1e]"
          >
            ← Назад к категориям
          </button>
          <div className="p-2.5 bg-white rounded-lg border border-[#e5e5ea]">
            <span className="text-sm font-semibold text-[#1c1c1e]">{currentCategory.name}</span>
          </div>
          <div className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-wide">
            Подкатегории
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto">
            {subcategoriesForStep.map((sub) => (
              <label
                key={sub.id}
                className={`flex items-center gap-3 border rounded-xl p-3 text-sm cursor-pointer transition-colors ${
                  selectedSubcategoryIds.includes(sub.id)
                    ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                    : 'border-[#e5e5ea] bg-white text-[#1c1c1e]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSubcategoryIds.includes(sub.id)}
                  onChange={() => onToggleSubcategory(sub.id)}
                  className="w-4 h-4 shrink-0 accent-[#c0392b]"
                />
                <span className="font-medium">{sub.name}</span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-[#8e8e93]">
            Выбрано подкатегорий: {selectedSubcategoryIds.length}
          </p>
          <button
            type="button"
            onClick={() => setStep('service')}
            disabled={selectedSubcategoriesInCurrent.length === 0}
            className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
          >
            Далее — выбрать услуги
          </button>
        </>
      )}

      {step === 'service' && currentCategory && (
        <>
          <button
            type="button"
            onClick={() => setStep('subcategory')}
            className="text-xs text-[#8e8e93] hover:text-[#1c1c1e]"
          >
            ← Назад к подкатегориям
          </button>
          <div className="p-2.5 bg-white rounded-lg border border-[#e5e5ea]">
            <span className="text-sm font-semibold text-[#1c1c1e]">{currentCategory.name}</span>
          </div>
          <div className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-wide">Услуги</div>
          <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto">
            {servicesForStep.length === 0 ? (
              <p className="text-sm text-[#8e8e93] py-2">Нет услуг для выбранных подкатегорий</p>
            ) : (
              servicesForStep.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center gap-3 border rounded-xl p-3 text-sm cursor-pointer transition-colors ${
                    selectedServiceIds.includes(svc.id)
                      ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                      : 'border-[#e5e5ea] bg-white text-[#1c1c1e]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(svc.id)}
                    onChange={() => onToggleService(svc.id)}
                    className="w-4 h-4 shrink-0 accent-[#c0392b]"
                  />
                  <span className="font-medium">{svc.name}</span>
                </label>
              ))
            )}
          </div>
          <p className="text-[10px] text-[#8e8e93]">Выбрано услуг: {selectedServiceIds.length}</p>
        </>
      )}

      {saveError && <p className="text-xs text-red-600">{saveError}</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={saving || selectedSubcategoryIds.length === 0}
        className="w-full bg-brand-accent text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
      >
        {saving ? 'Сохранение…' : 'Сохранить'}
      </button>
    </div>
  )
}
