'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiChevronDown, FiCheck, FiX } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { hapticTap } from '@/lib/nativeApp'
import OnboardingShell, { OnbError, OnbPrimaryButton, OnbSkipButton } from './OnboardingShell'
import type { OnboardingStepProps } from './types'

type Sub = { id: string; name: string }
type Cat = { id: string; name: string; subcategories: Sub[] }

export default function StepSpecializations({ user, index, total, onBack, onNext }: OnboardingStepProps) {
  const [tree, setTree] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [initial, setInitial] = useState<string[]>([])
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/master-categories/tree').then((r) => r.json()),
      supabase.from('profile_subcategories').select('subcategory_id').eq('profile_id', user.id),
    ])
      .then(([treeJson, subsRes]) => {
        if (cancelled) return
        const cats = ((treeJson?.tree as Cat[]) || []).filter((c) => c.subcategories?.length)
        setTree(cats)
        const ids = (subsRes.data || []).map((r: { subcategory_id: string }) => r.subcategory_id)
        setSelected(ids)
        setInitial(ids)
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

  const subById = useMemo(() => {
    const m = new Map<string, Sub & { catName: string }>()
    for (const c of tree) for (const s of c.subcategories) m.set(s.id, { ...s, catName: c.name })
    return m
  }, [tree])

  const q = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!q) return []
    return Array.from(subById.values()).filter(
      (s) => s.name.toLowerCase().includes(q) || s.catName.toLowerCase().includes(q)
    )
  }, [q, subById])

  const toggle = (id: string) => {
    hapticTap()
    setError('')
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSave = async () => {
    if (!selected.length) {
      setError('Выберите хотя бы одно направление')
      return
    }
    setSaving(true)
    setError('')
    try {
      const next = new Set(selected)
      const prev = new Set(initial)
      const toDel = initial.filter((id) => !next.has(id))
      const toAdd = selected.filter((id) => !prev.has(id))
      if (toDel.length) {
        const { error: e } = await supabase
          .from('profile_subcategories')
          .delete()
          .eq('profile_id', user.id)
          .in('subcategory_id', toDel)
        if (e) throw e
      }
      if (toAdd.length) {
        const { error: e } = await supabase
          .from('profile_subcategories')
          .insert(toAdd.map((subcategory_id) => ({ profile_id: user.id, subcategory_id })))
        if (e) throw e
      }
      setInitial(selected)
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  const chip = (s: Sub) => {
    const on = selected.includes(s.id)
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => toggle(s.id)}
        aria-pressed={on}
        className={[
          'inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-[14px] font-semibold transition-all active:scale-95',
          on ? 'border-brand-accent bg-[#fdf2f1] text-brand-accent' : 'border-[#e5e5ea] bg-white text-[#1c1c1e]',
        ].join(' ')}
      >
        {on && <FiCheck size={14} strokeWidth={3} />}
        {s.name}
      </button>
    )
  }

  return (
    <OnboardingShell
      total={total}
      current={index}
      stepKey="specs"
      onBack={onBack}
      title="Чем вы занимаетесь?"
      subtitle="По этим направлениям вас найдут клиенты и придут заказы. Можно выбрать несколько."
      footer={
        <>
          <OnbError message={error} />
          <OnbPrimaryButton onClick={handleSave} loading={saving} disabled={loading || !selected.length}>
            {selected.length ? `Продолжить · ${selected.length}` : 'Выберите направление'}
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
          placeholder="Поиск: кровля, сварка, электрик…"
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

      {selected.length > 0 && !q && (
        <div className="mb-4 flex flex-wrap gap-2">
          {selected.map((id) => {
            const s = subById.get(id)
            return s ? chip(s) : null
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-white animate-pulse" />
          ))}
        </div>
      ) : q ? (
        searchResults.length ? (
          <div className="flex flex-wrap gap-2">{searchResults.map(chip)}</div>
        ) : (
          <p className="text-[14px] text-[#8e8e93] text-center py-8">Ничего не нашли. Попробуйте другое слово.</p>
        )
      ) : (
        <div className="space-y-2.5">
          {tree.map((cat) => {
            const open = openCat === cat.id
            const count = cat.subcategories.filter((s) => selected.includes(s.id)).length
            return (
              <div key={cat.id} className="rounded-2xl bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenCat(open ? null : cat.id)}
                  aria-expanded={open}
                  className="w-full flex items-center gap-3 px-4 h-14 text-left"
                >
                  <span className="flex-1 min-w-0 text-[15px] font-bold text-[#1c1c1e] truncate">{cat.name}</span>
                  {count > 0 && (
                    <span className="min-w-6 h-6 px-2 rounded-full bg-brand-accent text-white text-[12px] font-bold flex items-center justify-center">
                      {count}
                    </span>
                  )}
                  <FiChevronDown
                    size={20}
                    className={`text-[#8e8e93] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open && <div className="px-4 pb-4 flex flex-wrap gap-2 animate-fade-in">{cat.subcategories.map(chip)}</div>}
              </div>
            )
          })}
        </div>
      )}
    </OnboardingShell>
  )
}
