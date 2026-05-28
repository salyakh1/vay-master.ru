import { NextResponse } from 'next/server'
import { getPaymentOrderSettings } from '@/lib/payment-settings-server'

export const dynamic = 'force-dynamic'

/** Публичные настройки оплаты для страницы создания заказа (без секретов) */
export async function GET() {
  try {
    const s = await getPaymentOrderSettings()
    const provider = s.orderPaymentProvider || 'tinkoff'
    const tinkoffActive = provider === 'tinkoff' && s.paymentTinkoffEnabled && s.tinkoffEnvConfigured

    return NextResponse.json({
      paymentOrderPublicationEnabled: s.paymentOrderPublicationEnabled,
      orderPublicationPriceRub: s.orderPublicationPriceRub,
      orderPaymentProvider: provider,
      paymentTinkoffEnabled: s.paymentTinkoffEnabled,
      paymentSbpEnabled: s.paymentSbpEnabled,
      tinkoffEnvConfigured: s.tinkoffEnvConfigured,
      /** Можно ли реально увести пользователя на оплату Тинькофф */
      tinkoffReady: tinkoffActive,
    })
  } catch (e) {
    console.error('order-settings GET', e)
    return NextResponse.json(
      {
        paymentOrderPublicationEnabled: true,
        orderPublicationPriceRub: 199,
        orderPaymentProvider: 'tinkoff',
        paymentTinkoffEnabled: false,
        paymentSbpEnabled: true,
        tinkoffEnvConfigured: false,
        tinkoffReady: false,
      },
      { status: 200 }
    )
  }
}
