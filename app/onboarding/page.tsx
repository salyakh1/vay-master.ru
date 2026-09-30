'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { trackFunnel } from '@/lib/track-funnel'
import {
  ONBOARDING_FLOWS,
  loadOnboardingStep,
  markOnboardingDone,
  saveOnboardingStep,
  type OnboardingStepId,
} from '@/lib/onboarding'
import StepSpecializations from '@/components/onboarding/StepSpecializations'
import StepLocation from '@/components/onboarding/StepLocation'
import StepProfile from '@/components/onboarding/StepProfile'
import StepSellerCategories from '@/components/onboarding/StepSellerCategories'
import StepClientTask from '@/components/onboarding/StepClientTask'
import StepDone from '@/components/onboarding/StepDone'
import type { OnboardingStepProps } from '@/components/onboarding/types'

const STEP_COMPONENTS: Record<OnboardingStepId, (props: OnboardingStepProps) => JSX.Element> = {
  specs: StepSpecializations,
  location: StepLocation,
  profile: StepProfile,
  categories: StepSellerCategories,
  task: StepClientTask,
  done: StepDone,
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [index, setIndex] = useState<number | null>(null)

  const role = user?.role
  const flow = useMemo(() => (role ? ONBOARDING_FLOWS[role] ?? ONBOARDING_FLOWS.client : []), [role])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/auth/login')
      return
    }
    setIndex((prev) => prev ?? loadOnboardingStep(user.id, flow.length))
  }, [loading, user, router, flow.length])

  const goTo = useCallback(
    (next: number) => {
      if (!user) return
      setIndex(next)
      saveOnboardingStep(user.id, next)
      window.scrollTo({ top: 0 })
      void trackFunnel('onboarding_step', { role: user.role, step: flow[next], index: next })
    },
    [user, flow]
  )

  const finish = useCallback(
    (href: string) => {
      if (!user) return
      markOnboardingDone(user.id)
      void trackFunnel('onboarding_complete', { role: user.role, target: href })
      router.push(href)
    },
    [user, router]
  )

  if (loading || !user || index == null) {
    return (
      <div className="min-h-[100dvh] bg-[#f4f4f4] flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-[#d1d1d6] border-t-brand-accent animate-spin" aria-label="Загрузка" />
      </div>
    )
  }

  const stepId = flow[index]
  const Step = STEP_COMPONENTS[stepId]
  const isLast = index === flow.length - 1

  return (
    <Step
      user={user}
      index={index}
      total={flow.length}
      onBack={index > 0 ? () => goTo(index - 1) : undefined}
      onNext={() => (isLast ? finish('/feed') : goTo(index + 1))}
      onFinish={finish}
    />
  )
}
