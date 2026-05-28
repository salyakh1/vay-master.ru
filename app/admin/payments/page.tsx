'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { FiSave, FiCreditCard, FiInfo } from 'react-icons/fi'

type Row = {
  id: string
  key: string
  value: unknown
  description: string | null
}

const KEYS = [
  'payment_order_publication_enabled',
  'order_publication_price_rub',
  'payment_tinkoff_enabled',
  'payment_sbp_enabled',
  'payment_order_provider',
  'payment_pro_provider',
  'payment_pro_purchase_enabled',
  'pro_subscription_price_rub',
  'pro_subscription_days',
] as const

export default function AdminPaymentsPage() {
  const { user: currentUser } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentUser) logAdminAction(currentUser.id, 'view_payments_settings', 'settings')
  }, [currentUser])

  const fetchRows = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('system_settings')
        .select('id, key, value, description')
        .in('key', [...KEYS])
        .order('key')

      if (error) throw error
      setRows((data || []) as Row[])
    } catch (e) {
      console.error(e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
  }, [])

  const getVal = (key: string): unknown => rows.find((r) => r.key === key)?.value

  const setLocal = (key: string, value: unknown) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, value } : r))
    )
  }

  const saveKey = async (key: string, value: unknown) => {
    const row = rows.find((r) => r.key === key)
    if (!row || !currentUser) {
      alert('Выполните в Supabase SQL: supabase/payment_settings_seed.sql — строки настроек не найдены.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          value,
          updated_by: currentUser.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      if (error) throw error
      await logAdminAction(currentUser.id, 'update_payment_setting', 'system_setting', row.id, { key, value })
      alert('Сохранено')
      fetchRows()
    } catch (e: any) {
      alert(e?.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const bool = (key: string) => getVal(key) === true || getVal(key) === 'true'
  const str = (key: string, def: string) => {
    const v = getVal(key)
    if (typeof v === 'string' && v.trim()) return v.trim()
    return def
  }
  const price = () => {
    const v = getVal('order_publication_price_rub')
    if (typeof v === 'number') return v
    if (typeof v === 'string') return parseFloat(v) || 199
    return 199
  }

  const proPrice = () => {
    const v = getVal('pro_subscription_price_rub')
    if (typeof v === 'number') return v
    if (typeof v === 'string') return parseFloat(v) || 990
    return 990
  }

  const proDays = () => {
    const v = getVal('pro_subscription_days')
    if (typeof v === 'number') return v
    if (typeof v === 'string') return parseInt(v, 10) || 30
    return 30
  }

  if (loading) {
    return <div className="text-text-secondary">Загрузка…</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2 flex items-center gap-2">
          <FiCreditCard />
          Оплата
        </h1>
        <p className="text-text-secondary">
          Управление публикацией заказов и способами оплаты. Секреты терминала Тинькофф задаются только в переменных окружения сервера (
          <code className="text-xs bg-bg-secondary px-1 rounded">TINKOFF_TERMINAL_KEY</code>,{' '}
          <code className="text-xs bg-bg-secondary px-1 rounded">TINKOFF_PASSWORD</code>
          ), не в базе.
        </p>
      </div>

      <div className="card border-amber-200 bg-amber-50/50 flex gap-3">
        <FiInfo className="text-amber-700 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          Если настроек нет в списке, выполните в Supabase SQL скрипт{' '}
          <code className="text-xs">supabase/payment_settings_seed.sql</code> и таблицу{' '}
          <code className="text-xs">supabase/payment_sessions.sql</code>.
        </p>
      </div>

      <div className="card space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Банк/провайдер для заказов</label>
            <div className="flex gap-2 items-center flex-wrap">
              <select
                className="input max-w-[260px]"
                value={str('payment_order_provider', 'tinkoff')}
                onChange={(e) => {
                  setLocal('payment_order_provider', e.target.value)
                  saveKey('payment_order_provider', e.target.value)
                }}
                disabled={saving}
              >
                <option value="tinkoff">Тинькофф</option>
                <option value="yookassa">ЮKassa (скоро)</option>
                <option value="cloudpayments">CloudPayments (скоро)</option>
              </select>
            </div>
            <p className="text-xs text-text-secondary mt-2">
              Секреты провайдера задаются в <code className="text-xs bg-bg-secondary px-1 rounded">.env</code>. В админке — только выбор и включение.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Банк/провайдер для PRO</label>
            <div className="flex gap-2 items-center flex-wrap">
              <select
                className="input max-w-[260px]"
                value={str('payment_pro_provider', 'tinkoff')}
                onChange={(e) => {
                  setLocal('payment_pro_provider', e.target.value)
                  saveKey('payment_pro_provider', e.target.value)
                }}
                disabled={saving}
              >
                <option value="tinkoff">Тинькофф</option>
                <option value="yookassa">ЮKassa (скоро)</option>
                <option value="cloudpayments">CloudPayments (скоро)</option>
              </select>
            </div>
            <p className="text-xs text-text-secondary mt-2">
              Можно сменить в любой момент. Если выбран провайдер, который ещё не реализован — кнопка оплаты у пользователей будет недоступна.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-medium text-text-primary">Платная публикация заказа</div>
            <div className="text-sm text-text-secondary">
              Если выключено — заказ создаётся сразу без окна оплаты.
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bool('payment_order_publication_enabled')}
              onChange={(e) => {
                setLocal('payment_order_publication_enabled', e.target.checked)
                saveKey('payment_order_publication_enabled', e.target.checked)
              }}
              disabled={saving}
              className="rounded w-5 h-5"
            />
            <span className="text-sm">Включено</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Стоимость публикации заказа (₽)</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={0}
              step={1}
              className="input max-w-[200px]"
              value={price()}
              onChange={(e) =>
                setLocal('order_publication_price_rub', parseInt(e.target.value, 10) || 0)
              }
              disabled={saving}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={saving}
              onClick={() => saveKey('order_publication_price_rub', price())}
            >
              <FiSave size={16} className="inline mr-1" />
              Сохранить цену
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap border-t border-border-light pt-6">
          <div>
            <div className="font-medium text-text-primary">Покупка PRO (/pro)</div>
            <div className="text-sm text-text-secondary">
              Если выключено — на странице PRO кнопка оплаты недоступна (остаётся выдача через админку подписок).
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bool('payment_pro_purchase_enabled')}
              onChange={(e) => {
                setLocal('payment_pro_purchase_enabled', e.target.checked)
                saveKey('payment_pro_purchase_enabled', e.target.checked)
              }}
              disabled={saving}
              className="rounded w-5 h-5"
            />
            <span className="text-sm">Включено</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">PRO: цена за период (₽)</label>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="number"
              min={0}
              step={1}
              className="input max-w-[200px]"
              value={proPrice()}
              onChange={(e) => setLocal('pro_subscription_price_rub', parseInt(e.target.value, 10) || 0)}
              disabled={saving}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={saving}
              onClick={() => saveKey('pro_subscription_price_rub', proPrice())}
            >
              <FiSave size={16} className="inline mr-1" />
              Сохранить цену PRO
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">PRO: длительность периода (дней)</label>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="number"
              min={1}
              max={3650}
              step={1}
              className="input max-w-[200px]"
              value={proDays()}
              onChange={(e) => setLocal('pro_subscription_days', parseInt(e.target.value, 10) || 1)}
              disabled={saving}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={saving}
              onClick={() => saveKey('pro_subscription_days', proDays())}
            >
              <FiSave size={16} className="inline mr-1" />
              Сохранить период
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap border-t border-border-light pt-6">
          <div>
            <div className="font-medium text-text-primary">Тинькофф (эквайринг)</div>
            <div className="text-sm text-text-secondary">
              Нужны ключи в .env на сервере. Без них кнопка остаётся в тестовом режиме.
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bool('payment_tinkoff_enabled')}
              onChange={(e) => {
                setLocal('payment_tinkoff_enabled', e.target.checked)
                saveKey('payment_tinkoff_enabled', e.target.checked)
              }}
              disabled={saving}
              className="rounded w-5 h-5"
            />
            <span className="text-sm">Включено</span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-medium text-text-primary">СБП в форме Тинькофф</div>
            <div className="text-sm text-text-secondary">
              Передаётся в платёж (если поддерживает терминал).
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bool('payment_sbp_enabled')}
              onChange={(e) => {
                setLocal('payment_sbp_enabled', e.target.checked)
                saveKey('payment_sbp_enabled', e.target.checked)
              }}
              disabled={saving}
              className="rounded w-5 h-5"
            />
            <span className="text-sm">Включено</span>
          </label>
        </div>
      </div>
    </div>
  )
}
