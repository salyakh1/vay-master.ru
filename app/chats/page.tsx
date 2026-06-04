import { Suspense } from 'react'
import ChatsClient from '@/components/chats/ChatsClient'
import ChatsLoading from './loading'

export default function ChatsPage() {
  return (
    <Suspense fallback={<ChatsLoading />}>
      <ChatsClient />
    </Suspense>
  )
}
