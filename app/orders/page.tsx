import { Suspense } from 'react'
import OrdersClient from '@/components/orders/OrdersClient'
import OrdersLoading from './loading'

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersLoading />}>
      <OrdersClient />
    </Suspense>
  )
}
