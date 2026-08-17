'use client'

import Navbar from '@/components/Navbar'

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="card">
            <h1 className="text-2xl font-semibold text-graphite-secondary tracking-tight mb-2">Правила платформы</h1>
            <p className="text-text-secondary">
              Коротко о важном: соблюдение правил защищает клиентов, мастеров и продавцов.
            </p>
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-graphite-secondary tracking-tight">1) Общение и поведение</h2>
            <ul className="list-disc pl-5 space-y-2 text-text-secondary">
              <li>Уважительное общение, без оскорблений, угроз и дискриминации.</li>
              <li>Запрещены спам, навязчивая реклама, массовые рассылки.</li>
              <li>Все договорённости рекомендуется фиксировать в чате.</li>
            </ul>
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-graphite-secondary tracking-tight">2) Честность информации</h2>
            <ul className="list-disc pl-5 space-y-2 text-text-secondary">
              <li>Мастера и продавцы указывают реальные услуги, опыт, цены, наличие.</li>
              <li>Запрещены ложные данные, поддельные отзывы и вводящие в заблуждение фото.</li>
            </ul>
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-graphite-secondary tracking-tight">3) Запрещённый контент</h2>
            <ul className="list-disc pl-5 space-y-2 text-text-secondary">
              <li>Мошенничество, продажа запрещённых товаров, контрафакт.</li>
              <li>Материалы 18+, призывы к насилию, публикация чужих персональных данных.</li>
            </ul>
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-graphite-secondary tracking-tight">4) Жалобы и модерация</h2>
            <ul className="list-disc pl-5 space-y-2 text-text-secondary">
              <li>Вы можете подать жалобу из чата или профиля.</li>
              <li>Нарушения могут привести к ограничениям или блокировке аккаунта.</li>
            </ul>
            <p className="text-sm text-text-muted">
              Для связи с поддержкой используйте пункт «Техподдержка» в меню.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
