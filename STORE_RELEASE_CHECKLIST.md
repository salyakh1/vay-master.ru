# VayMaster — чеклист публикации (Google Play + App Store)

Код подготовлен под **путь A**: оплата цифрового PRO через Tinkoff **только на сайте**, в store-приложениях кнопка оплаты скрыта.

## Витрина (готовые материалы)
Смотри папку `store-assets/`:
- тексты Play/App Store → `store-assets/listing/STORE_LISTING.md`
- скриншоты → `store-assets/screenshots/`
- иконка / splash / feature graphic → `store-assets/icons/`
- иконки уже вставлены в `android/.../mipmap-*` и `ios/.../AppIcon`

## 0. Перед всем — ваши реквизиты РФ

Откройте `lib/legalOperator.ts` и заполните:

- форма (ИП / ООО / физлицо)
- наименование
- ИНН
- ОГРН / ОГРНИП
- адрес в РФ
- email для ПДн (сейчас `support@vay-master.ru`)

Страницы уже доступны:

- https://vay-master.ru/privacy
- https://vay-master.ru/terms
- https://vay-master.ru/offer
- https://vay-master.ru/rules

После деплоя проверьте, что они открываются без 404.

---

## 1. Google Play (можно с Windows)

### 1.1 Аккаунт
1. https://play.google.com/console — оплатить $25
2. Создать приложение: **VayMaster**, пакет `ru.vaymaster.app`

### 1.2 Firebase (для push Android)
1. https://console.firebase.google.com → проект
2. Добавить Android app: `ru.vaymaster.app`
3. Скачать `google-services.json` → положить в `android/app/google-services.json`
4. Выполнить: `npx cap sync android`

### 1.3 Подпись (keystore) — СОХРАНИТЕ НАВСЕГДА
```bash
keytool -genkey -v -keystore vaymaster-upload.keystore -alias vaymaster -keyalg RSA -keysize 2048 -validity 10000
```
Пароли и файл — в сейф (1Password / бумажка). Потеря = нельзя обновлять приложение.

SHA-256 отпечаток вставить в `public/.well-known/assetlinks.json` вместо `REPLACE_WITH_UPLOAD_KEYSTORE_SHA256`.

### 1.4 Сборка AAB
```bash
npx cap sync android
npx cap open android
```
В Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.

### 1.5 Витрина Play
- Privacy Policy URL: `https://vay-master.ru/privacy`
- Short/Full description
- Иконка 512×512, Feature Graphic 1024×500
- Скриншоты телефона (минимум 2)
- Data safety: аккаунт, гео, сообщения, фото, платежный статус
- Тестовые логины (клиент + мастер)

### 1.6 Тест → Production
Internal testing → (при необходимости Closed) → Production.

---

## 2. App Store (нужен Mac)

### 2.1 Аккаунт
1. Apple Developer Program — $99/год
2. App Store Connect → App ID `ru.vaymaster.app`
3. Создать приложение VayMaster

### 2.2 Xcode
На Mac:
```bash
npx cap sync ios
npx cap open ios
```
1. Signing & Capabilities → ваш Team
2. Добавьте в target файл `PrivacyInfo.xcprivacy` (лежит в `ios/App/App/`)
3. Push Notifications capability (когда будут APNs)
4. В `apple-app-site-association` замените `TEAMID` на ваш Team ID
5. Product → Archive → Distribute → App Store Connect

### 2.3 Витрина App Store
- Privacy Policy URL: `https://vay-master.ru/privacy`
- Скриншоты 6.7" и 6.1"
- Age rating, Privacy Nutrition Labels
- Notes for Review: тестовые логины + текст:

> Digital PRO purchases are completed on the website vay-master.ru in a browser. In-app external checkout for PRO is disabled to comply with Guideline 3.1.1.

### 2.4 TestFlight → Submit

---

## 3. Что уже сделано в коде

- `/privacy`, `/terms`, `/offer` (+ усиленные `/rules`)
- согласие при регистрации
- ссылки в Footer и Settings (все роли)
- удаление аккаунта у seller
- PRO checkout скрыт в native + API блокирует `x-vay-platform: ios|android`
- Tinkoff-домены в Capacitor allowNavigation
- iOS usage strings + Privacy Manifest + ITSAppUsesNonExemptEncryption
- версии `1.0.0`
- каркас `@capacitor/push-notifications`
- заготовки deep links в `public/.well-known/`

## 4. Чего код один не закроет

- оплата аккаунтов сторов
- keystore / Apple Team
- Firebase / APNs сертификаты
- финальные бренд-иконки (сейчас placeholder Capacitor — желательно заменить)
- скриншоты и модерация
- проверка юристом текстов под ваши реквизиты

## 5. Рекомендуемый порядок

1. Заполнить `legalOperator.ts` → задеплоить сайт  
2. Google Play сначала  
3. Потом App Store с Mac  
4. IAP/Play Billing (путь B) — позже, когда PRO стабильно продаётся
