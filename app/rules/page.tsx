'use client'

import Link from 'next/link'
import LegalDocLayout, { LegalSection } from '@/components/legal/LegalDocLayout'
import { LEGAL_LINKS } from '@/lib/legalOperator'

export default function RulesPage() {
  return (
    <LegalDocLayout title="Правила платформы">
      <p>
        Коротко о важном: соблюдение правил защищает клиентов, мастеров и продавцов. Юридические документы:{' '}
        <Link href={LEGAL_LINKS.terms} className="text-brand-accent font-medium">
          Соглашение
        </Link>
        ,{' '}
        <Link href={LEGAL_LINKS.privacy} className="text-brand-accent font-medium">
          Конфиденциальность
        </Link>
        ,{' '}
        <Link href={LEGAL_LINKS.offer} className="text-brand-accent font-medium">
          Оферта
        </Link>
        .
      </p>

      <LegalSection title="1) Общение и поведение">
        <ul className="list-disc pl-5 space-y-2">
          <li>Уважительное общение, без оскорблений, угроз и дискриминации.</li>
          <li>Запрещены спам, навязчивая реклама, массовые рассылки.</li>
          <li>Все договорённости рекомендуется фиксировать в чате.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2) Честность информации">
        <ul className="list-disc pl-5 space-y-2">
          <li>Мастера и продавцы указывают реальные услуги, опыт, цены, наличие.</li>
          <li>Запрещены ложные данные, поддельные отзывы и вводящие в заблуждение фото.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3) Запрещённый контент">
        <ul className="list-disc pl-5 space-y-2">
          <li>Мошенничество, продажа запрещённых товаров, контрафакт.</li>
          <li>Материалы 18+, призывы к насилию, публикация чужих персональных данных.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4) Жалобы и модерация">
        <ul className="list-disc pl-5 space-y-2">
          <li>Вы можете подать жалобу из чата или профиля.</li>
          <li>Нарушения могут привести к ограничениям или блокировке аккаунта.</li>
        </ul>
        <p className="text-sm text-text-muted">
          Для связи с поддержкой используйте пункт «Техподдержка» в меню или email support@vay-master.ru.
        </p>
      </LegalSection>
    </LegalDocLayout>
  )
}
