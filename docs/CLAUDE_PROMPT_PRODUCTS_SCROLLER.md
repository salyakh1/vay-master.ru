# PROMPT FOR CLAUDE — Product scroller system redesign
**Project:** VayMaster (`vay-master.ru`)  
**Repo:** https://github.com/salyakh1/vay-master.ru  
**Scope:** Horizontal product scroller on `/search` titled «Товары для вашей задачи» (and related scroller stack if needed)  
**Date context:** 2026-08-09  
**Instruction:** Design a complete, production-ready recommendation / display system for this scroller. Do **not** implement code until the user explicitly asks. First deliver a clear product + ranking + UX spec. Invent your own best approach from first principles and the codebase — do not reuse external “variant lists” from other agents.

---

## Goal
Users on the masters search page see a horizontal product strip («Товары для вашей задачи» / label «Вам понадобится»).  
We need a **thorough, role-aware logic** for:
1. **Who** sees the scroller (guest / client / master / seller)
2. **When** it appears vs hides
3. **What** products are selected and in what order
4. **How** filters, geo, search query, and specialization mapping interact
5. **What** «Ещё» / «Каталог →» / «+» on the card should do
6. **How** sellers benefit (monetization / fairness) without destroying UX
7. Empty states, cold start, sparse inventory

Success = higher useful clicks to products + higher trust (no random junk) + clear copy matching reality.

---

## Roles (must address each)
| Role | Intent on `/search` |
|------|---------------------|
| **Guest / Client** | Looking for a master for a job; may need materials for that job later |
| **Master** | Looking at peers / work; often buys materials for their specialization |
| **Seller** | Competitor inventory; usually should not be the primary audience of this strip |

---

## Current implementation (facts to verify in code)
Primary UI:
- `app/search/SearchClient.tsx` → `<ProductsScrollerSection title="Товары для вашей задачи" … />`
- `components/scrollers/ProductsScrollerSection.tsx`
- `components/scrollers/ProductScrollerCard.tsx`
- `components/scrollers/HorizontalScroller.tsx`
- Mapping: `lib/specialization-product-mapping.ts`
- Fetch: `lib/scrollerApi.ts` → `fetchProductsScrollerPage`
- APIs involved: `/api/recommendations/nearby`, `/api/recommendations/products`

Observed behavior patterns to audit:
- `productScrollerSlugs` derived from selected master category/subcategory filters and/or logged-in master’s specializations mapped to product category/subcategory slugs.
- If `lat/lng` are set, `fetchProductsScrollerPage` currently prefers **nearby** recommendations and may **not** apply the category/subcategory slug filters in that branch — verify and treat as a design constraint or bug to resolve in the spec.
- Without geo, falls back to `/api/recommendations/products` with optional `categorySlugs` / `subcategorySlugs` / `q`.
- Section returns `null` when no items (after load).
- Meta text: `Показано N из total`; link to `/products`; trailing «Ещё» card.
- Product card shows image, name, seller + distance, price, red «+» control — clarify intended action of «+».

UI screenshot context: strip can show a single product (e.g. «брус») + dashed «Ещё» card while meta says «Показано 1 из 1» — cold/sparse catalog is a real case.

---

## Hard constraints
- Do not invent a second marketplace; products already live in VayMaster catalog (`/products`).
- Keep mobile-first horizontal scroller pattern (existing components preferred).
- Respect existing geo / radius concepts used elsewhere on search.
- Monetization ideas must be realistic for a regional RU marketplace (CPC/featured slots ok to propose; don’t assume unlimited inventory).
- Prefer one clear primary ranking story over many weak signals.
- Accessibility / performance: avoid huge unbounded fetches; pagination already exists in scroller helpers (`SCROLLER_PAGE_SIZE`).

---

## Deliverables (required structure in your answer)
1. **Product thesis** — one paragraph: what this strip is *for* and what it is *not*.
2. **Audience matrix** — for guest, client, master, seller: show/hide, title/label copy, primary ranking inputs.
3. **Selection algorithm** — ordered steps (inputs → filters → score → diversify → limit). Include cold-start / no-geo / no-filter fallbacks.
4. **Interaction map** — click card, «+», «Ещё», «Каталог →», header meta; deep-link query params into `/products` when relevant.
5. **Freshness & fairness** — how new sellers get exposure; anti-spam; distance caps.
6. **Analytics events** — minimal set to prove ROI (impressions, click, add intent, convert).
7. **Phased rollout** — Phase 1 (logic fix only), Phase 2 (ranking), Phase 3 (monetization) with effort estimate in days.
8. **Acceptance tests** — concrete scenarios (e.g. client filters «Сантехника» with geo; master with roofing specialization and no geo; empty catalog; guest no location permission).
9. **Open questions** for the product owner (max 5).

Optional: propose copy variants for title/label that match the chosen thesis (RU).

---

## Out of scope (unless user expands later)
- Full rebuild of `/products` catalog page
- Native app wrapper
- Changing payment / Tinkoff flows
- Rewriting master search ranking itself (only how it *feeds* this strip)

---

## Output style
Russian, direct, concrete. No fluff. Prefer tables and numbered algorithms. Flag any current-code bug that breaks the intended product story.

**End of prompt.**
