import { Suspense } from 'react'
import SettingsClient from '@/components/settings/SettingsClient'
import SettingsLoading from './loading'

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsClient />
    </Suspense>
  )
}
