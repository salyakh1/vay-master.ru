'use client'

import { useRef, useState } from 'react'
import type { AdBanner } from '@/lib/supabase'
import { UNIFIED_BANNER } from '@/components/CompactPageBanner'

type LinkKind = 'url' | 'master' | 'product' | 'none'

type Props = {
  onClose: () => void
  onOpenFullConstructor: () => void
  onPublish: (banner: Partial<AdBanner>) => Promise<void>
  uploadImage: (file: File) => Promise<string>
}

const PAGE_OPTS = [
  { value: 'home', label: '🏠 Главная' },
  { value: 'search', label: '🔍 Поиск' },
  { value: 'products', label: '📦 Товары' },
  { value: 'feed', label: '📰 Лента' },
] as const

const AUDIENCE_OPTS = [
  { value: 'all', label: '👥 Все' },
  { value: 'master', label: '🔨 Мастера' },
  { value: 'seller', label: '🛒 Продавцы' },
  { value: 'client', label: '👤 Клиенты' },
] as const

export default function AdminBannerCreateWizard({
  onClose,
  onOpenFullConstructor,
  onPublish,
  uploadImage,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'fast' | 'full'>('fast')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [linkKind, setLinkKind] = useState<LinkKind>('url')
  const [externalUrl, setExternalUrl] = useState('')
  const [targetId, setTargetId] = useState('')
  const [utm, setUtm] = useState('')
  const [pages, setPages] = useState<string[]>(['home', 'search'])
  const [audience, setAudience] = useState<string[]>(['all'])
  const [draft, setDraft] = useState(false)

  const togglePage = (p: string) => {
    setPages((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  const toggleAudience = (a: string) => {
    if (a === 'all') {
      setAudience(['all'])
      return
    }
    setAudience((prev) => {
      const next = prev.filter((x) => x !== 'all')
      return next.includes(a) ? next.filter((x) => x !== a) : [...next, a]
    })
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Файл больше 10 МБ')
      return
    }
    try {
      setUploading(true)
      const url = await uploadImage(file)
      setImageUrl(url)
    } catch (e: any) {
      alert(e?.message || 'Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  const buildTarget = (): Pick<AdBanner, 'target_type' | 'target_id' | 'external_url'> => {
    if (linkKind === 'url') {
      let url = externalUrl.trim()
      if (utm.trim() && url) {
        const sep = url.includes('?') ? '&' : '?'
        url = `${url}${sep}${utm.trim().replace(/^\?/, '')}`
      }
      return { target_type: 'external_url', external_url: url || undefined, target_id: undefined }
    }
    if (linkKind === 'master') {
      return { target_type: 'master', target_id: targetId.trim() || undefined, external_url: undefined }
    }
    if (linkKind === 'product') {
      return { target_type: 'product', target_id: targetId.trim() || undefined, external_url: undefined }
    }
    return { target_type: null, target_id: undefined, external_url: undefined }
  }

  const publishFast = async (asDraft: boolean) => {
    if (!imageUrl) {
      alert('Загрузите картинку баннера')
      return
    }
    if (pages.length === 0) {
      alert('Выберите хотя бы одну страницу')
      return
    }
    const target = buildTarget()
    if (linkKind === 'url' && !target.external_url) {
      alert('Вставьте ссылку')
      return
    }
    if ((linkKind === 'master' || linkKind === 'product') && !target.target_id) {
      alert('Укажите ID')
      return
    }

    const keywords = audience.includes('all')
      ? []
      : audience.map((a) => `audience:${a}`)

    const payload: Partial<AdBanner> = {
      title: 'Баннер',
      description: '',
      image_url: imageUrl,
      type: 'image',
      ad_type: 'HERO_SPONSORED',
      hero_layout: 'full_image',
      pages,
      priority: 0,
      duration: 5,
      is_active: !asDraft,
      category: [],
      keywords,
      regions: ['ALL'],
      brand_name: '',
      pricing_model: 'fixed',
      show_badge: true,
      badge_text: 'Реклама',
      show_title: false,
      show_description: false,
      ...target,
    }

    try {
      setSaving(true)
      setDraft(asDraft)
      await onPublish(payload)
    } catch (e: any) {
      // ошибка уже показана в onPublish / saveBannerData
      console.error(e)
    } finally {
      setSaving(false)
      setDraft(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-[#f2f2f7] rounded-2xl shadow-xl w-full max-w-[560px] my-4 overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white border border-[#e5e5ea] flex items-center justify-center text-brand-accent text-base"
            aria-label="Назад"
          >
            ←
          </button>
          <div>
            <div className="text-[18px] font-bold text-[#1c1c1e]">Создать баннер</div>
            <div className="text-[11px] text-[#8e8e93] mt-0.5">Выберите режим создания</div>
          </div>
        </div>

        <div className="px-4 pb-4">
          {/* Mode select */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <button
              type="button"
              onClick={() => setMode('fast')}
              className={`relative text-left bg-white rounded-2xl border p-4 transition-all overflow-hidden ${
                mode === 'fast' ? 'border-brand-accent border-[1.5px] bg-[#fdf0f0]' : 'border-[#e5e5ea]'
              }`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-[3px] ${mode === 'fast' ? 'bg-brand-accent' : 'bg-[#e5e5ea]'}`}
              />
              <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#edfff5] text-[#22a85e]">
                Быстро
              </span>
              <div className="text-[28px] mb-2">⚡</div>
              <div className="text-[13px] font-bold text-[#1c1c1e] mb-1">Картинка + ссылка</div>
              <div className="text-[10px] text-[#8e8e93] leading-snug">
                Загрузи готовый баннер и вставь ссылку. Без лишних полей.
              </div>
              <span
                className={`absolute bottom-2.5 right-2.5 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center text-[10px] ${
                  mode === 'fast'
                    ? 'bg-brand-accent border-brand-accent text-white'
                    : 'border-[#e5e5ea] bg-white'
                }`}
              >
                {mode === 'fast' ? '✓' : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode('full')}
              className={`relative text-left bg-white rounded-2xl border p-4 transition-all overflow-hidden ${
                mode === 'full' ? 'border-brand-accent border-[1.5px] bg-[#fdf0f0]' : 'border-[#e5e5ea]'
              }`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-[3px] ${mode === 'full' ? 'bg-brand-accent' : 'bg-[#e5e5ea]'}`}
              />
              <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#fdf0f0] text-brand-accent">
                Расширенный
              </span>
              <div className="text-[28px] mb-2">🎨</div>
              <div className="text-[13px] font-bold text-[#1c1c1e] mb-1">Конструктор</div>
              <div className="text-[10px] text-[#8e8e93] leading-snug">
                Заголовок, текст, метка, кнопка, расписание — формат A.
              </div>
              <span
                className={`absolute bottom-2.5 right-2.5 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center text-[10px] ${
                  mode === 'full'
                    ? 'bg-brand-accent border-brand-accent text-white'
                    : 'border-[#e5e5ea] bg-white'
                }`}
              >
                {mode === 'full' ? '✓' : ''}
              </span>
            </button>
          </div>

          {mode === 'fast' ? (
            <div className="space-y-3">
              {/* Image */}
              <div className="bg-white rounded-[14px] border border-[#e5e5ea] overflow-hidden">
                <div className="px-3.5 py-3 border-b border-[#f2f2f7] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[7px] bg-[#fdf0f0] flex items-center justify-center text-[13px]">
                    🖼️
                  </div>
                  <div className="text-[13px] font-bold text-[#1c1c1e]">
                    Картинка баннера <span className="text-brand-accent">*</span>
                  </div>
                </div>
                <div className="p-3.5 space-y-3">
                  <div>
                    <div className="text-[11px] font-semibold text-[#1c1c1e] mb-1.5">Формат</div>
                    <div className="rounded-[10px] border-[1.5px] border-brand-accent bg-[#fdf0f0] p-2.5 text-center">
                      <div className="text-xl mb-0.5">▬</div>
                      <div className="text-[11px] font-bold text-[#1c1c1e]">Единый</div>
                      <div className="text-[10px] text-[#8e8e93]">
                        {UNIFIED_BANNER.designWidth} × {UNIFIED_BANNER.designHeight} px · 2.8∶1
                      </div>
                    </div>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => void handleFile(e.target.files?.[0])}
                  />

                  {!imageUrl ? (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="w-full border-[1.5px] border-dashed border-[#e5e5ea] rounded-xl py-6 px-4 text-center bg-[#fafafa] hover:border-brand-accent hover:bg-[#fdf0f0] transition-colors disabled:opacity-50"
                    >
                      <div className="text-[32px] mb-2">📷</div>
                      <div className="text-[13px] font-semibold text-[#1c1c1e] mb-1">
                        {uploading ? 'Загрузка…' : 'Загрузить картинку'}
                      </div>
                      <div className="text-[11px] text-[#8e8e93] leading-snug mb-2">
                        Готовый дизайн. Текст и кнопки уже на картинке.
                      </div>
                      <span className="inline-block bg-brand-accent text-white text-[11px] font-bold px-4 py-1.5 rounded-lg">
                        Выбрать файл
                      </span>
                      <div className="flex gap-1 justify-center mt-2">
                        {['JPG', 'PNG', 'WebP', 'до 10 МБ'].map((f) => (
                          <span key={f} className="text-[9px] text-[#8e8e93] bg-[#f2f2f7] px-1.5 py-0.5 rounded">
                            {f}
                          </span>
                        ))}
                      </div>
                    </button>
                  ) : (
                    <div className="relative w-full aspect-[2.8/1] rounded-xl overflow-hidden bg-[#111]">
                      <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm"
                      >
                        Заменить
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center"
                      >
                        ✕
                      </button>
                      <span className="absolute bottom-2 left-2 text-[9px] text-white/70 bg-black/35 px-1.5 py-0.5 rounded">
                        Реклама
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Link */}
              <div className="bg-white rounded-[14px] border border-[#e5e5ea] overflow-hidden">
                <div className="px-3.5 py-3 border-b border-[#f2f2f7] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[7px] bg-[#fdf0f0] flex items-center justify-center text-[13px]">
                    🔗
                  </div>
                  <div className="text-[13px] font-bold text-[#1c1c1e]">
                    Ссылка при клике <span className="text-brand-accent">*</span>
                  </div>
                </div>
                <div className="p-3.5 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { k: 'url' as const, label: '🌐 Внешний сайт' },
                        { k: 'master' as const, label: '👤 Профиль' },
                        { k: 'product' as const, label: '📦 Товар' },
                        { k: 'none' as const, label: '∅ Без ссылки' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.k}
                        type="button"
                        onClick={() => setLinkKind(opt.k)}
                        className={`px-3 py-1.5 rounded-lg border text-[11px] transition-colors ${
                          linkKind === opt.k
                            ? 'bg-[#fdf0f0] border-brand-accent text-brand-accent font-bold'
                            : 'bg-white border-[#e5e5ea] text-[#555] font-medium'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {linkKind === 'url' && (
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://ваш-сайт.ru"
                      className="w-full border border-[#e5e5ea] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-brand-accent"
                    />
                  )}
                  {(linkKind === 'master' || linkKind === 'product') && (
                    <div>
                      <input
                        type="text"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        placeholder={linkKind === 'master' ? 'ID профиля мастера/продавца' : 'ID товара'}
                        className="w-full border border-[#e5e5ea] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-brand-accent"
                      />
                      <p className="text-[10px] text-[#8e8e93] mt-1">
                        {linkKind === 'master'
                          ? 'Перейдёт на страницу профиля'
                          : 'Перейдёт на карточку товара'}
                      </p>
                    </div>
                  )}

                  {linkKind === 'url' && (
                    <div>
                      <label className="text-[11px] font-semibold text-[#1c1c1e] mb-1 block">
                        UTM-метка{' '}
                        <span className="font-normal text-[#8e8e93]">(необязательно)</span>
                      </label>
                      <input
                        type="text"
                        value={utm}
                        onChange={(e) => setUtm(e.target.value)}
                        placeholder="utm_campaign=banner_aug"
                        className="w-full border border-[#e5e5ea] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-brand-accent"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Pages + audience */}
              <div className="bg-white rounded-[14px] border border-[#e5e5ea] overflow-hidden">
                <div className="px-3.5 py-3 border-b border-[#f2f2f7] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[7px] bg-[#fdf0f0] flex items-center justify-center text-[13px]">
                    📍
                  </div>
                  <div className="text-[13px] font-bold text-[#1c1c1e]">Где показывать</div>
                </div>
                <div className="p-3.5 space-y-3">
                  <div>
                    <div className="text-[11px] font-semibold text-[#1c1c1e] mb-1.5">Страницы</div>
                    <div className="flex flex-wrap gap-1.5">
                      {PAGE_OPTS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => togglePage(p.value)}
                          className={`px-3 py-1.5 rounded-full border text-[11px] ${
                            pages.includes(p.value)
                              ? 'bg-[#fdf0f0] border-brand-accent text-brand-accent font-bold'
                              : 'bg-white border-[#e5e5ea] text-[#555]'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#1c1c1e] mb-1.5">Аудитория</div>
                    <div className="flex flex-wrap gap-1.5">
                      {AUDIENCE_OPTS.map((a) => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => toggleAudience(a.value)}
                          className={`px-3 py-1.5 rounded-full border text-[11px] ${
                            audience.includes(a.value)
                              ? 'bg-[#fdf0f0] border-brand-accent text-brand-accent font-bold'
                              : 'bg-white border-[#e5e5ea] text-[#555]'
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#8e8e93] mt-1.5">
                      Пока сохраняется в keywords для будущей фильтрации; показ идёт на выбранных страницах.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 bg-[#f9f9fb] border border-[#e5e5ea] rounded-[10px] p-2.5">
                <span className="text-[15px]">💡</span>
                <p className="text-[11px] text-[#8e8e93] leading-relaxed">
                  Подготовьте картинку заранее с текстом и дизайном. Размер:{' '}
                  <strong>
                    {UNIFIED_BANNER.designWidth}×{UNIFIED_BANNER.designHeight} px (2.8∶1)
                  </strong>
                  . Пометка «Реклама» добавится автоматически.
                </p>
              </div>

              <button
                type="button"
                disabled={saving || uploading}
                onClick={() => void publishFast(false)}
                className="w-full bg-brand-accent text-white text-[14px] font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {saving && !draft ? 'Публикация…' : '⚡ Опубликовать'}
              </button>
              <button
                type="button"
                onClick={onOpenFullConstructor}
                className="w-full bg-white text-[#1c1c1e] text-[13px] font-semibold py-2.5 rounded-xl border border-[#e5e5ea]"
              >
                🎨 Перейти в конструктор
              </button>
              <button
                type="button"
                disabled={saving || uploading}
                onClick={() => void publishFast(true)}
                className="w-full text-[#8e8e93] text-[12px] font-medium py-2"
              >
                {saving && draft ? 'Сохранение…' : 'Сохранить черновик'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2 bg-[#f9f9fb] border border-[#e5e5ea] rounded-[10px] p-2.5">
                <span className="text-[15px]">🎨</span>
                <p className="text-[11px] text-[#8e8e93] leading-relaxed">
                  Конструктор: заголовок, подзаголовок, метка, кнопка, фото 1400×500, расписание — формат A.
                </p>
              </div>
              <div className="bg-white rounded-[14px] border border-[#e5e5ea] p-6 text-center">
                <div className="text-[40px] mb-2">🎨</div>
                <div className="text-[14px] font-bold text-[#1c1c1e] mb-1.5">Полный конструктор</div>
                <div className="text-[12px] text-[#8e8e93] mb-4 leading-relaxed">
                  Заголовок · Текст · Метка · Кнопка · Фото · Страницы · Расписание · Приоритет
                </div>
                <ul className="text-left text-[12px] text-[#1c1c1e] space-y-1.5 bg-[#f9f9fb] border border-[#e5e5ea] rounded-xl p-3.5 mb-4">
                  <li>📝 Заголовок + описание + метка</li>
                  <li>🤍 Текст белой кнопки</li>
                  <li>🖼️ Фото 1400×500 (2.8∶1)</li>
                  <li>📅 Расписание и лимиты</li>
                  <li>👁️ Превью в реальном времени</li>
                </ul>
                <button
                  type="button"
                  onClick={onOpenFullConstructor}
                  className="w-full bg-brand-accent text-white text-[14px] font-bold py-3 rounded-xl"
                >
                  🎨 Открыть конструктор
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMode('fast')}
                className="w-full bg-white text-[#1c1c1e] text-[13px] font-semibold py-2.5 rounded-xl border border-[#e5e5ea]"
              >
                ⚡ Назад к быстрому режиму
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
