import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDocLayout, { LegalSection } from '@/components/legal/LegalDocLayout'
import { LEGAL_LINKS, LEGAL_OPERATOR } from '@/lib/legalOperator'

export const metadata: Metadata = {
  title: 'Пользовательское соглашение | VayMaster',
  description: 'Пользовательское соглашение сервиса VayMaster.',
}

export default function TermsPage() {
  const o = LEGAL_OPERATOR
  return (
    <LegalDocLayout title="Пользовательское соглашение">
      <LegalSection title="1. Термины">
        <p>
          <strong>Сервис</strong> — платформа {o.appName} (сайт и мобильные приложения), соединяющая клиентов,
          мастеров и продавцов. <strong>Пользователь</strong> — любое лицо, использующее Сервис.
          <strong> Оператор</strong> — лицо, указанное в{' '}
          <Link href={LEGAL_LINKS.privacy} className="text-brand-accent font-medium">
            Политике конфиденциальности
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Предмет соглашения">
        <p>
          Оператор предоставляет Пользователю доступ к функционалу маркетплейса: профили, поиск, заказы,
          чаты, публикации, каталог товаров и связанные сервисы. Условия платных функций изложены в{' '}
          <Link href={LEGAL_LINKS.offer} className="text-brand-accent font-medium">
            Публичной оферте
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Регистрация и аккаунт">
        <ul className="list-disc pl-5 space-y-1">
          <li>Для части функций нужна регистрация с достоверными данными.</li>
          <li>Пользователь обязан сохранять конфиденциальность пароля.</li>
          <li>Один человек — один аккаунт, если иное не согласовано с поддержкой.</li>
          <li>Запрещено передавать аккаунт третьим лицам.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Роли">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Клиент</strong> — размещает задачи/заказы, общается с мастерами, покупает товары у продавцов.
          </li>
          <li>
            <strong>Мастер</strong> — предлагает услуги, откликается на заказы, ведёт портфолио.
          </li>
          <li>
            <strong>Продавец</strong> — размещает товары/материалы на витрине.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Обязанности пользователя">
        <ul className="list-disc pl-5 space-y-1">
          <li>соблюдать законодательство РФ и{' '}
            <Link href={LEGAL_LINKS.rules} className="text-brand-accent font-medium">
              Правила платформы
            </Link>
            ;
          </li>
          <li>не размещать запрещённый, ложный или чужой контент без прав;</li>
          <li>не использовать Сервис для мошенничества и спама;</li>
          <li>самостоятельно проверять контрагента перед сделкой вне платёжных сценариев Сервиса.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Роль Оператора">
        <p>
          {o.appName} — информационный посредник (площадка). Оператор не является стороной договора между
          клиентом и мастером/продавцом, если иное прямо не указано для конкретной платной функции платформы
          (например, подписка PRO). Качество работ/товаров обеспечивает исполнитель/продавец.
        </p>
      </LegalSection>

      <LegalSection title="7. Контент и модерация">
        <p>
          Оператор вправе скрывать, удалять контент и ограничивать доступ при нарушениях, жалобах или требованиях
          закона. Подробнее — в Правилах платформы.
        </p>
      </LegalSection>

      <LegalSection title="8. Интеллектуальная собственность">
        <p>
          Дизайн, код, товарные обозначения Сервиса принадлежат Оператору или правообладателям. Контент,
          загруженный Пользователем, остаётся его ответственностью; Пользователь даёт Оператору неисключительную
          лицензию на показ контента в рамках работы Сервиса.
        </p>
      </LegalSection>

      <LegalSection title="9. Ограничение ответственности">
        <p>
          Сервис предоставляется «как есть». Оператор не отвечает за убытки от сделок между пользователями,
          перебоев связи, действий третьих лиц, если иное не предусмотрено императивными нормами РФ.
        </p>
      </LegalSection>

      <LegalSection title="10. Персональные данные">
        <p>
          Обработка ПДн регулируется{' '}
          <Link href={LEGAL_LINKS.privacy} className="text-brand-accent font-medium">
            Политикой конфиденциальности
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Изменение условий и контакты">
        <p>
          Оператор может обновлять Соглашение, публикуя новую редакцию на этой странице. Вопросы:{' '}
          <a className="text-brand-accent font-medium" href={`mailto:${o.supportEmail}`}>
            {o.supportEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocLayout>
  )
}
