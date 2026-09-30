import type { User } from '@/types/db'

export type OnboardingStepProps = {
  user: User
  index: number
  total: number
  onBack?: () => void
  onNext: () => void
  onFinish: (href: string) => void
}
