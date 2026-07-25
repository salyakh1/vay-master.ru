'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/app/providers'
import { supabase, User, Service } from '@/lib/supabase'
import { fetchMasterCategoriesTree, type CategoryNode } from '@/lib/masterCategoriesTree'
import SpecializationsEditor from '@/components/settings/SpecializationsEditor'
import { FiCamera, FiImage, FiTrash2 } from 'react-icons/fi'
import Image from 'next/image'

const MasterRadiusPicker = dynamic(() => import('@/components/MasterRadiusPicker'), { ssr: false })
const SellerAddressPicker = dynamic(() => import('@/components/SellerAddressPicker'), { ssr: false })

export type SettingsPanelId =
  | 'profile'
  | 'specializations'
  | 'location'
  | 'store'
  | 'password'
  | 'email'

type TreeCategory = CategoryNode

export function useSettingsForms(onSaved?: () => void) {
  const { user, refreshUser } = useAuth()
  const [tree, setTree] = useState<TreeCategory[]>([])
  const [treeLoading, setTreeLoading] = useState(false)
  const [treeError, setTreeError] = useState('')
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingSpecializations, setSavingSpecializations] = useState(false)
  const [specsSaveSuccess, setSpecsSaveSuccess] = useState(false)
  const [specsSaveError, setSpecsSaveError] = useState('')

  const [servicesText, setServicesText] = useState('')
  const [serviceLocation, setServiceLocation] = useState<'home' | 'workshop' | 'both'>('both')
  const [experienceYears, setExperienceYears] = useState<number | ''>('')
  const [workSchedule, setWorkSchedule] = useState('')

  const [workHours, setWorkHours] = useState('')
  const [deliveryAvailable, setDeliveryAvailable] = useState(false)
  const [deliveryZones, setDeliveryZones] = useState('')
  const [productCategories, setProductCategories] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const hydrateFromUser = useCallback((u: User) => {
    setFullName(u.full_name || '')
    setPhone(u.phone || '')
    setCity(u.city || '')
    setDescription(u.description || '')
    setServicesText(u.services || '')
    setServiceLocation(u.service_location || 'both')
    setExperienceYears(u.experience_years || '')
    setWorkSchedule(u.work_schedule || '')
    setWorkHours(u.work_hours || '')
    setDeliveryAvailable(u.delivery_available || false)
    setDeliveryZones(u.delivery_zones || '')
    setProductCategories(u.product_categories || '')
  }, [])

  useEffect(() => {
    if (user) hydrateFromUser(user)
  }, [user, hydrateFromUser])

  const fetchTree = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setTreeLoading(true)
    setTreeError('')
    try {
      const nextTree = await fetchMasterCategoriesTree(supabase)
      setTree(nextTree)
      if (nextTree.length === 0) {
        setTreeError('Каталог категорий пуст')
      }
    } catch (e) {
      console.error(e)
      setTree([])
      setTreeError('Не удалось загрузить категории и услуги')
    } finally {
      setTreeLoading(false)
    }
  }, [])

  const fetchSelections = useCallback(async (profileId: string) => {
    try {
      const [{ data: subSel }, { data: svcSel }] = await Promise.all([
        supabase
          .from('profile_subcategories')
          .select('subcategory_id')
          .eq('profile_id', profileId),
        supabase.from('profile_services').select('service_id').eq('profile_id', profileId),
      ])
      setSelectedSubcategoryIds((subSel || []).map((r) => r.subcategory_id))
      setSelectedServiceIds((svcSel || []).map((r) => r.service_id))
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Дерево и выбор — только при смене пользователя/роли, не при каждом refreshUser
  useEffect(() => {
    if (!user || user.role !== 'master') return
    void fetchTree()
    void fetchSelections(user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- намеренно только id/role
  }, [user?.id, user?.role])

  const syncSelections = async (profileId: string) => {
    const [{ data: curSubs, error: curSubsErr }, { data: curSvcs, error: curSvcsErr }] = await Promise.all([
      supabase.from('profile_subcategories').select('subcategory_id').eq('profile_id', profileId),
      supabase.from('profile_services').select('service_id').eq('profile_id', profileId),
    ])
    if (curSubsErr) throw curSubsErr
    if (curSvcsErr) throw curSvcsErr

    const curSubIds = new Set((curSubs || []).map((r) => r.subcategory_id as string))
    const curSvcIds = new Set((curSvcs || []).map((r) => r.service_id as string))
    const nextSubIds = new Set(selectedSubcategoryIds)
    const nextSvcIds = new Set(selectedServiceIds)

    const toAddSubs = selectedSubcategoryIds.filter((id) => !curSubIds.has(id))
    const toDelSubs = [...curSubIds].filter((id) => !nextSubIds.has(id))
    const toAddSvcs = selectedServiceIds.filter((id) => !curSvcIds.has(id))
    const toDelSvcs = [...curSvcIds].filter((id) => !nextSvcIds.has(id))

    const ops: PromiseLike<{ error: { message: string } | null }>[] = []

    if (toDelSubs.length > 0) {
      ops.push(
        supabase
          .from('profile_subcategories')
          .delete()
          .eq('profile_id', profileId)
          .in('subcategory_id', toDelSubs)
      )
    }
    if (toDelSvcs.length > 0) {
      ops.push(
        supabase.from('profile_services').delete().eq('profile_id', profileId).in('service_id', toDelSvcs)
      )
    }

    const delResults = await Promise.all(ops)
    for (const r of delResults) {
      if (r.error) throw r.error
    }

    if (toAddSubs.length > 0) {
      const { error } = await supabase.from('profile_subcategories').insert(
        toAddSubs.map((subId) => ({ profile_id: profileId, subcategory_id: subId }))
      )
      if (error) throw error
    }
    if (toAddSvcs.length > 0) {
      const { error } = await supabase.from('profile_services').insert(
        toAddSvcs.map((svcId) => ({ profile_id: profileId, service_id: svcId }))
      )
      if (error) throw error
    }
  }

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

  const filteredServices = tree
    .flatMap((c) => c.subcategories.flatMap((s) => s.services.map((v) => ({ ...v, subcategory_id: s.id }))))
    .filter((svc) => selectedSubcategoryIds.includes(svc.subcategory_id))

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const updateData: Record<string, unknown> = {
        full_name: fullName,
        phone: phone || null,
        description: description || null,
      }
      if (user.role !== 'seller') updateData.city = city || null
      if (user.role === 'master') {
        updateData.services = servicesText || null
        updateData.service_location = serviceLocation || null
        updateData.experience_years = experienceYears ? Number(experienceYears) : null
        updateData.work_schedule = workSchedule || null
      }
      if (user.role === 'seller') {
        updateData.work_hours = workHours || null
        updateData.delivery_available = deliveryAvailable
        updateData.delivery_zones = deliveryZones || null
        updateData.product_categories = productCategories || null
      }
      const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id)
      if (error) throw error
      await refreshUser()
      onSaved?.()
    } catch {
      alert('Ошибка при сохранении профиля')
    } finally {
      setSaving(false)
    }
  }

  const saveSpecializations = async () => {
    if (!user) return
    if (selectedSubcategoryIds.length === 0) {
      setSpecsSaveError('Выберите хотя бы одну подкатегорию')
      return
    }
    setSavingSpecializations(true)
    setSpecsSaveError('')
    setSpecsSaveSuccess(false)
    try {
      await syncSelections(user.id)
      setSpecsSaveSuccess(true)
      // Не ждём refresh — иначе UI «висит»; счётчик обновим в фоне
      void Promise.resolve(onSaved?.())
    } catch (e) {
      console.error(e)
      setSpecsSaveError(e instanceof Error ? e.message : 'Ошибка при сохранении')
    } finally {
      setSavingSpecializations(false)
    }
  }

  const clearSpecsSaveFeedback = useCallback(() => {
    setSpecsSaveSuccess(false)
    setSpecsSaveError('')
  }, [])

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setPasswordError('')
    setPasswordSuccess('')
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Заполните все поля')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Минимум 6 символов')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают')
      return
    }
    setChangingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) {
        setPasswordError('Текущий пароль неверен')
        return
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSuccess('Пароль изменён')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setChangingPassword(false)
    }
  }

  const uploadImage = async (file: File, kind: 'avatar' | 'cover') => {
    if (!user) return
    const setter = kind === 'avatar' ? setUploadingAvatar : setUploadingCover
    setter(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${kind}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
      const field = kind === 'avatar' ? 'avatar_url' : 'cover_photo_url'
      const { error } = await supabase.from('profiles').update({ [field]: urlData.publicUrl }).eq('id', user.id)
      if (error) throw error
      await refreshUser()
      onSaved?.()
    } catch {
      alert('Ошибка загрузки')
    } finally {
      setter(false)
    }
  }

  const removeCover = async () => {
    if (!user) return
    if (!confirm('Убрать обложку профиля?')) return
    setUploadingCover(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ cover_photo_url: null })
        .eq('id', user.id)
      if (error) throw error
      await refreshUser()
      onSaved?.()
    } catch {
      alert('Ошибка удаления')
    } finally {
      setUploadingCover(false)
    }
  }

  return {
    user,
    tree,
    treeLoading,
    treeError,
    reloadTree: fetchTree,
    fullName,
    setFullName,
    phone,
    setPhone,
    city,
    setCity,
    description,
    setDescription,
    servicesText,
    setServicesText,
    serviceLocation,
    setServiceLocation,
    experienceYears,
    setExperienceYears,
    workSchedule,
    setWorkSchedule,
    workHours,
    setWorkHours,
    deliveryAvailable,
    setDeliveryAvailable,
    deliveryZones,
    setDeliveryZones,
    productCategories,
    setProductCategories,
    selectedSubcategoryIds,
    selectedServiceIds,
    toggleSubcategory,
    toggleService,
    filteredServices,
    saving,
    savingSpecializations,
    specsSaveSuccess,
    specsSaveError,
    clearSpecsSaveFeedback,
    saveProfile,
    saveSpecializations,
    changePassword,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    changingPassword,
    passwordError,
    passwordSuccess,
    uploadingAvatar,
    uploadingCover,
    uploadImage,
    removeCover,
    refreshUser,
  }
}

export function ProfileEditPanel({ forms }: { forms: ReturnType<typeof useSettingsForms> }) {
  const { user } = forms
  if (!user) return null

  return (
    <form onSubmit={forms.saveProfile} className="space-y-3 pt-2">
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14 rounded-full bg-brand-accent overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold">
          {user.avatar_url ? (
            <Image src={user.avatar_url} alt="" width={56} height={56} className="object-cover w-full h-full" />
          ) : (
            user.full_name?.[0]?.toUpperCase() || '?'
          )}
        </div>
        <label className="text-xs font-semibold text-brand-accent cursor-pointer">
          <FiCamera className="inline mr-1" size={14} />
          {forms.uploadingAvatar ? 'Загрузка…' : 'Сменить фото'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={forms.uploadingAvatar}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) forms.uploadImage(f, 'avatar')
              e.target.value = ''
            }}
          />
        </label>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-[#8e8e93] mb-1.5">Обложка профиля</label>
        <div className="relative h-[88px] rounded-xl overflow-hidden bg-[#1c1c1e] border border-[#e5e7eb]">
          {user.cover_photo_url ? (
            <Image src={user.cover_photo_url} alt="" fill className="object-cover" sizes="400px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[#8e8e93]">
              Без картинки — тёмный фон
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <label className="text-xs font-semibold text-brand-accent cursor-pointer inline-flex items-center gap-1">
            <FiImage size={14} />
            {forms.uploadingCover ? 'Загрузка…' : user.cover_photo_url ? 'Сменить обложку' : 'Загрузить обложку'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={forms.uploadingCover}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) forms.uploadImage(f, 'cover')
                e.target.value = ''
              }}
            />
          </label>
          {user.cover_photo_url && (
            <button
              type="button"
              disabled={forms.uploadingCover}
              onClick={() => void forms.removeCover()}
              className="text-xs font-medium text-[#8e8e93] inline-flex items-center gap-1 disabled:opacity-50"
            >
              <FiTrash2 size={13} />
              Убрать
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">ФИО</label>
        <input className="input w-full text-sm" value={forms.fullName} onChange={(e) => forms.setFullName(e.target.value)} required />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">Телефон</label>
        <input className="input w-full text-sm" value={forms.phone} onChange={(e) => forms.setPhone(e.target.value)} />
      </div>
      {user.role !== 'seller' && (
        <div>
          <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">Город</label>
          <input className="input w-full text-sm" value={forms.city} onChange={(e) => forms.setCity(e.target.value)} />
        </div>
      )}
      <div>
        <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">О себе</label>
        <textarea className="textarea w-full text-sm" rows={3} value={forms.description} onChange={(e) => forms.setDescription(e.target.value)} />
      </div>

      {user.role === 'master' && (
        <>
          <div>
            <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">Описание услуг</label>
            <textarea className="textarea w-full text-sm" rows={2} value={forms.servicesText} onChange={(e) => forms.setServicesText(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">Место работы</label>
            <select className="input w-full text-sm" value={forms.serviceLocation} onChange={(e) => forms.setServiceLocation(e.target.value as 'home' | 'workshop' | 'both')}>
              <option value="home">Выезд на дом</option>
              <option value="workshop">В мастерской</option>
              <option value="both">Выезд и в мастерской</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">Опыт (лет)</label>
            <input type="number" min={0} className="input w-full text-sm" value={forms.experienceYears} onChange={(e) => forms.setExperienceYears(e.target.value ? Number(e.target.value) : '')} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">График работы</label>
            <input className="input w-full text-sm" value={forms.workSchedule} onChange={(e) => forms.setWorkSchedule(e.target.value)} placeholder="Пн-Пт 9:00-18:00" />
          </div>
        </>
      )}

      {user.role === 'seller' && (
        <>
          <div>
            <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">Режим работы</label>
            <input className="input w-full text-sm" value={forms.workHours} onChange={(e) => forms.setWorkHours(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={forms.deliveryAvailable} onChange={(e) => forms.setDeliveryAvailable(e.target.checked)} />
            Доставка
          </label>
          {forms.deliveryAvailable && (
            <div>
              <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">Зоны доставки</label>
              <input className="input w-full text-sm" value={forms.deliveryZones} onChange={(e) => forms.setDeliveryZones(e.target.value)} />
            </div>
          )}
          <div>
            <label className="block text-[11px] font-medium text-[#8e8e93] mb-1">Категории товаров</label>
            <input className="input w-full text-sm" value={forms.productCategories} onChange={(e) => forms.setProductCategories(e.target.value)} />
          </div>
        </>
      )}

      <button type="submit" disabled={forms.saving} className="w-full bg-brand-accent text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50">
        {forms.saving ? 'Сохранение…' : 'Сохранить'}
      </button>
    </form>
  )
}

export function SpecializationsPanel({ forms }: { forms: ReturnType<typeof useSettingsForms> }) {
  const {
    tree,
    treeLoading,
    treeError,
    reloadTree,
    selectedSubcategoryIds,
    selectedServiceIds,
    savingSpecializations,
    specsSaveSuccess,
    specsSaveError,
    clearSpecsSaveFeedback,
    toggleSubcategory,
    toggleService,
    saveSpecializations,
  } = forms

  useEffect(() => {
    if (tree.length === 0 && !treeLoading && !treeError) {
      void reloadTree()
    }
  }, [tree.length, treeLoading, treeError, reloadTree])

  return (
    <SpecializationsEditor
      tree={tree}
      treeLoading={treeLoading}
      treeError={treeError}
      selectedSubcategoryIds={selectedSubcategoryIds}
      selectedServiceIds={selectedServiceIds}
      saving={savingSpecializations}
      saveSuccess={specsSaveSuccess}
      saveError={specsSaveError}
      onDismissFeedback={clearSpecsSaveFeedback}
      onToggleSubcategory={toggleSubcategory}
      onToggleService={toggleService}
      onSave={saveSpecializations}
      onRetry={() => void reloadTree({ silent: tree.length > 0 })}
    />
  )
}

export function LocationPanel() {
  return (
    <div className="pt-2 -mx-1">
      <MasterRadiusPicker />
    </div>
  )
}

export function StoreAddressPanel({ onSaved }: { onSaved?: () => void }) {
  return (
    <div className="pt-2 space-y-3">
      <p className="text-[11px] text-[#8e8e93]">Точный адрес магазина для карты и поиска «Товары рядом».</p>
      <SellerAddressPicker onSave={() => onSaved?.()} />
    </div>
  )
}

export function PasswordPanel({ forms }: { forms: ReturnType<typeof useSettingsForms> }) {
  return (
    <form onSubmit={forms.changePassword} className="space-y-3 pt-2">
      <input type="password" className="input w-full text-sm" placeholder="Текущий пароль" value={forms.currentPassword} onChange={(e) => forms.setCurrentPassword(e.target.value)} />
      <input type="password" className="input w-full text-sm" placeholder="Новый пароль" value={forms.newPassword} onChange={(e) => forms.setNewPassword(e.target.value)} />
      <input type="password" className="input w-full text-sm" placeholder="Повторите пароль" value={forms.confirmPassword} onChange={(e) => forms.setConfirmPassword(e.target.value)} />
      {forms.passwordError && <p className="text-xs text-red-600">{forms.passwordError}</p>}
      {forms.passwordSuccess && <p className="text-xs text-green-600">{forms.passwordSuccess}</p>}
      <button type="submit" disabled={forms.changingPassword} className="w-full bg-brand-accent text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50">
        {forms.changingPassword ? 'Изменение…' : 'Изменить пароль'}
      </button>
    </form>
  )
}

export function EmailPanel({ email }: { email: string }) {
  return (
    <div className="pt-2">
      <p className="text-sm text-[#1c1c1e] font-medium">{email}</p>
      <p className="text-[10px] text-[#8e8e93] mt-1">Email изменяется через поддержку</p>
    </div>
  )
}
