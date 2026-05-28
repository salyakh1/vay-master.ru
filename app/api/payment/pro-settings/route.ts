import { NextResponse } from 'next/server'
import { getProPaymentSettings } from '@/lib/payment-settings-server'

export const dynamic = 'force-dynamic'

/** Публичные настройки оплаты PRO (без секретов) */
export async function GET() {
  try {
    const s = await getProPaymentSettings()
    const provider = s.proPaymentProvider || 'tinkoff'
    const tinkoffReady = provider === 'tinkoff' && s.paymentTinkoffEnabled && s.tinkoffEnvConfigured

    return NextResponse.json({
      paymentProPurchaseEnabled: s.paymentProPurchaseEnabled,
      proSubscriptionPriceRub: s.proSubscriptionPriceRub,
      proSubscriptionDays: s.proSubscriptionDays,
      proPaymentProvider: provider,
      paymentTinkoffEnabled: s.paymentTinkoffEnabled,
      paymentSbpEnabled: s.paymentSbpEnabled,
      tinkoffEnvConfigured: s.tinkoffEnvConfigured,
      tinkoffReady: tinkoffReady && s.paymentProPurchaseEnabled,
    })
  } catch (e) {
    console.error('pro-settings GET', e)
    return NextResponse.json(
      {
        paymentProPurchaseEnabled: true,
        proSubscriptionPriceRub: 990,
        proSubscriptionDays: 30,
        proPaymentProvider: 'tinkoff',
        paymentTinkoffEnabled: false,
        paymentSbpEnabled: true,
        tinkoffEnvConfigured: false,
        tinkoffReady: false,
      },
      { status: 200 }
    )
  }
}
