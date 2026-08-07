# Contributing — VayMaster

## PR checklist
- [ ] `npm run test:unit` проходит
- [ ] `npm run test:e2e:critical` проходит
- [ ] Нет секретов в коммите (`.env`, service role keys)

## Обязательный security-ревью для SQL-миграций

Если PR трогает файлы в `supabase/**` и содержит хотя бы одно из:

- `CREATE/ALTER/DROP POLICY` (RLS)
- `GRANT` / `REVOKE`
- `SECURITY DEFINER`
- изменение колонок биллинга (`is_pro`, `pro_until`, payment_*)
- RPC, вызываемые ролью `authenticated`

то:

1. **Обязателен второй ревьюер** (не автор PR).
2. В описании PR — секция **Security impact** (что меняется, кто может вызвать, как проверен ownership).
3. Для `SECURITY DEFINER`: проверка `auth.uid()` / revoke у `authenticated`, если мутируются чужие данные.
4. Для биллинга: убедиться, что пользователь не может выставить себе PRO через REST.

Без пункта 1 merge в `main` не делать.
