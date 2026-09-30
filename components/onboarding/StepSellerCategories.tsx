'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiCheck, FiX } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { PRODUCT_CATEGORY_SECTIONS, type ProductCategory } from '@/types/db'
import { useAuth } from '@/app/providers'
import { hapticTap } from '@/lib/nativeApp'
import OnboardingShell, { OnbError, OnbPrimaryButton, OnbSkipButton } from './OnboardingShell'
import type { OnboardingStepProps } from './types'

export default function StepSellerCategories({ user, index, total, onBack, onNext }: OnboardingStepProps) {
  const { refreshUser } = useAuth()
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('product_categories').select('*').order('name'),
      supabase.from('profile_product_categories').select('category_id').eq('profile_id', user.id),
    ])
      .then(([catsRes, mineRes]) => {
        if (cancelled) return
        const cats = (catsRes.data as ProductCategory[]) || []
        setCategories(cats)
        setSelected((mineRes.data || []).map((r: { category_id: string }) => r.category_id))
        if (!cats.length) setLoadFailed(true)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user.id])

  const q = query.trim().toLowerCase()
  const sections = useMemo(
    () =>
      PRODUCT_CATEGORY_SECTIONS.map((s) => ({
        ...s,
        categories: categories.filter((c) => c.section === s.id && (!q || c.name.toLowerCase().includes(q))),
      })).filter((s) => s.categories.length > 0),
    [categories, q]
  )

  const toggle = (id: string) => {
    hapticTap()
    setError('')
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSave = async () => {
    if (!selected.length) {
      setError('Выберите хотя бы одну категорию')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { error: delErr } = await supabase.from('profile_product_categories').delete().eq('profile_id', user.id)
      if (delErr) throw delErr
      const { error: insErr } = await supabase
        .from('profile_product_categories')
        .insert(selected.map((category_id) => ({ profile_id: user.id, category_id })))
      if (insErr) throw insErr
      const names = categories
        .filter((c) => selected.includes(c.id))
        .map((c) => c.name)
        .join(', ')
      await supabase.from('profiles').update({ product_categories: names }).eq('id', user.id)
      await refreshUser()
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <OnboardingShell
      total={total}
      current={index}
      stepKey="categories"
      onBack={onBack}
      title="Чем вы торгуете?"
      subtitle="Покажем ваш магазин покупателям и мастерам, которым нужны эти товары."
      footer={
        <>
          <OnbError message={error} />
          <OnbPrimaryButton onClick={handleSave} loading={saving} disabled={loading || !selected.length}>
            {selected.length ? `Продолжить · ${selected.length}` : 'Выберите категории'}
          </OnbPrimaryButton>
          {loadFailed && <OnbSkipButton onClick={onNext}>Пропустить, выберу позже</OnbSkipButton>}
        </>
      }
    >
      <div className="relative mb-4">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: кирпич, краска, автозапчасти…"
          className="w-full h-12 rounded-2xl bg-white border border-[#e5e5ea] pl-11 pr-10 text-[15px] outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Очистить"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[#8e8e93]"
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white animate-pulse" />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <p className="text-[14px] text-[#8e8e93] text-center py-8">Ничего не нашли. Попробуйте другое слово.</p>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-[13px] font-bold text-[#1c1c1e] mb-3">{section.label}</p>
              <div className="flex flex-wrap gap-2">
                {section.categories.map((c) => {
                  const on = selected.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      aria-pressed={on}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-[14px] font-semibold transition-all active:scale-95',
                        on ? 'border-brand-accent bg-[#fdf2f1] text-brand-accent' : 'border-[#e5e5ea] bg-white text-[#1c1c1e]',
                      ].join(' ')}
                    >
                      {on && <FiCheck size={14} strokeWidth={3} />}
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </OnboardingShell>
  )
}
