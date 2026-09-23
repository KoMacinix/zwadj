# Zwadj — SOLID and Strategy audit

Reviewed archive: **zwadj(6).zip**, compared byte-for-byte with **zwadj(5).zip**  
Updated: **9 September 2026** · Initial review: 8 September 2026  
Scope: architecture review, source inspection, existing checks, and targeted diagnostic reproductions. No production source changes.

## Verdict

**The project implements Strategy correctly in its pricing engines and at the payment gateway boundary. It only partially satisfies SOLID across the whole application.**

The strongest parts are the pure pricing/admission/state-decision functions, typed strategy registries, external-provider adapters, and the segregated frontend API interfaces. The shared booking/quote charge calculation has now been extracted and its two callers were verified. Remaining architectural gaps include persistence details leaking through application interfaces, large services combining several change responsibilities, and independently maintained browser pricing.

There are also correctness problems at those boundaries. Seven probes in the initial review reproduced unwanted behavior using real application code with controlled persistence or provider responses; an account-deletion race was identified by source inspection. Findings F1–F8 remain open: their relevant methods and adapters have not changed in this archive. The ten new revision probes are described separately below.

| Principle | Assessment | Evidence |
|---|---|---|
| Single Responsibility | Partial | Pure business helpers are well separated. Booking/quote charge calculation is now a shared pure module. Booking orchestration, authentication, and WalkinJourney still combine several responsibilities. |
| Open/Closed | Good in pricing; partial elsewhere | Typed strategy registries isolate algorithm variants. Browser pricing remains another extension point. Booking and quote totals now share the same implementation. |
| Liskov Substitution | No clear violation established | The existing small adapter contracts are reasonable. Few production implementations exist, and passing type checks does not prove behavioral substitutability. The malformed-provider-response finding is a contract robustness problem, not proof of an inheritance violation. |
| Interface Segregation | Mostly good in the reviewed boundaries | Six focused venue-client interfaces and six narrowed hooks are actually used. The composed client is appropriate at the construction boundary. |
| Dependency Inversion | Partial; the largest architecture gap | Payment/provider ports are strong. Several repository contracts still expose Prisma types, and 19 of 25 application service files directly import PrismaService. |
| Strategy | Correct where implemented | Venue-rule matching, service-line pricing, and interchangeable payment-gateway implementations use genuine common contracts and selection points. |

SOLID is a design judgment rather than a certification or percentage score. A deliberate MVP compromise can be reasonable while still preventing a claim of full separation.

## Changes verified since zwadj(5).zip

**Progress is real and localized.** There are **3 added files, 8 modified files, no removals, and 533 byte-identical files**. The pure charge builder requested by A2 is now implemented. This closes the duplicated server-side service/total/deposit calculation; it does not close all of A2 or establish full SOLID compliance.

| Area | Before | Current result |
|---|---|---|
| Booking/quote charge calculation | Separate loops, totals, and deposit orchestration | Both use `resolveCharge` in [apps/api/src/venues/booking-charge.ts:92](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-charge.ts) |
| Duplicate services | A repeated service could produce two charge lines | `SERVICE_DUPLICATE`, HTTP 409, before either service writes; verified against both archive versions |
| Service belongs to venue | Enforced through the catalog query filter | Query filter retained; the pure module additionally checks `found.venueId` against the requested venue |
| Expected client amount | Inline comparison in booking creation | Pure `confrontExpectedCharge`, preserving actual total and deposit in the 409; intentionally only used for the client request |
| Testability | Aggregate decision lived inside database-oriented services | 13 new pure tests; all seven local mutation targets produced actual assertion failures, followed by a restored green baseline |
| Overall architecture/security | Partial SOLID; open security and concurrency findings | These overall verdicts remain; the shared pricing subfinding is resolved |

Measured with the same rule—nonblank lines excluding lines beginning with `//`, `/*` or `*`—`BookingsService.create` goes from **123 to 107 lines**. Its AST method span goes from **168 to 162 physical lines**, excluding leading comments. The private I/O helper accounts for part of this reduction. This is a size measure, not a SOLID score; the stronger evidence is a pure calculation consumed by both services.

The new module has no Nest, Prisma, clock, or network dependency: its imports are shared types, the deposit helper, and the existing service-pricing strategies. It **composes existing Strategy implementations**; it is not itself an additional interchangeable strategy family.

The changed production files are `bookings.service.ts`, `quotes.service.ts`, the shared error-code contract, and FR/AR translations, plus the new `booking-charge.ts`. The other changes are its spec, a mutation harness, and three project documents. All dependency manifests, the lockfile, authentication, logging, HTTP configuration, media pipeline, and SQL migrations are unchanged.

`ZWADJ_CONTINUITE.md` reports steps 1–3 of S11-b complete and explicitly leaves the SQL amount-coherence CHECK and the two deadlines for steps 4–6. This matches the files provided. Its reported PostgreSQL/E2E runs are author-provided evidence; they were not independently repeated here.

## Coverage and method

The new archive contains **544 files**, including **424 TypeScript/TSX files**, **26 SQL migrations**, and **28 Python tooling scripts**. Every original file was compared, and all 424 TS/TSX files were parsed without syntax diagnostics. The initial architecture map covered 248 production modules; `booking-charge.ts` brings that to **249**. This revision manually follows every functional change and carries forward the earlier review only where the compared code is unchanged.

| Area | Production TS/TSX modules | Review focus |
|---|---:|---|
| apps/api | 110 | Controllers, services, ports/adapters, authorization, state changes, pricing, payments, notifications, media |
| apps/client | 55 | Client boundaries, session flow, booking preview/submission, component responsibilities |
| apps/pro | 48 | Narrow client hooks, venue editing, calendar/visit flows, walk-in quote and booking journey |
| packages/api-client | 9 | HTTP abstraction, segregated client contracts, composed factory |
| packages/types | 13 | Shared DTO/schema contracts, enums, framework independence |
| packages/i18n | 2 | Translation and formatting boundaries |
| packages/ui | 12 | Shared presentation components and composition |
| Other files | Not included in the production count | SQL schema/migrations, seeds, tests, E2E harness, configuration, documentation, and mutation-tooling structure |

The project’s own architecture instructions were used as context, including its rules about atomic state decisions and avoiding unnecessary abstractions. SQL migrations were inspected alongside the Prisma schema because exclusion constraints and partial indexes are not fully represented by that schema.

The dependency scan found no runtime import cycle among the production local/workspace modules and no shared package importing an application. This is useful evidence of layering; it does not prove that every dependency points to an appropriate abstraction.

## Findings to fix first

Priority **P1** means address before relying on the affected workflow under concurrent requests or failures. **P2** means a localized defect or important maintainability correction. These are review priorities, not externally assigned security severity scores.

### F1 — P1: Booking acceptance can overwrite another committed transition

**Evidence:** [apps/api/src/venues/booking-locks.prisma.ts:71](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-locks.prisma.ts), [apps/api/src/venues/booking-locks.prisma.ts:104](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-locks.prisma.ts), and [apps/api/src/venues/booking-locks.prisma.ts:127](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-locks.prisma.ts).

Acceptance locks the venue, reads the booking status, checks availability blocks, and then updates the booking by ID alone. Decline/client-cancellation use a status-conditional booking update but do not acquire that venue lock. They can therefore change the booking between acceptance’s read and its unconditional write.

The diagnostic probe placed a committed DECLINED state after the acceptance status read. The real PrismaBookingLocks implementation subsequently wrote ACCEPTED and returned success.

The SQL exclusion constraint protects overlapping hard bookings; it does not validate the previous status of this booking. Two concurrent acceptances being serialized by a venue lock does not establish safety against a different command.

**Correction:** Keep the venue lock for cross-resource availability, and make the booking transition conditional on its expected source state at the write. Alternatively, coordinate commands using a booking-row lock with a consistent lock order. Return the existing conflict outcome if another transition wins. Verify accept-versus-decline and accept-versus-cancel against PostgreSQL.

**Confidence:** Reproduced with real adapter code and a controlled persistence schedule; not a live PostgreSQL concurrency test.

### F2 — P1: Quote conversion does not atomically enforce the quote’s status

**Evidence:** [apps/api/src/venues/quotes.service.ts:289](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/quotes.service.ts) and [apps/api/src/venues/quote-store.prisma.ts:128](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/quote-store.prisma.ts).

The service checks that the quote can be converted, performs further reads, and asks the repository to create a booking. The repository neither rechecks nor locks the quote’s status during that write.

The probe committed quote cancellation during the subsequent venue lookup. Conversion still created a booking and returned a CANCELLED quote with a booking ID.

The unique bookings.quote_id index correctly prevents duplicate conversions. It does not prevent converting a quote whose cancellation committed before the booking write.

**Correction:** Make conversion an atomic repository command that checks the relevant quote state and creates the booking together, coordinating with cancellation. Preserve the existing intended semantics for a separate, later cancellation of an already converted quote.

A related static issue exists in revision: [apps/api/src/venues/quotes.service.ts:246](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/quotes.service.ts) checks status before pricing, while [apps/api/src/venues/quote-store.prisma.ts:86](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/quote-store.prisma.ts) locks the version chain but does not revalidate the parent’s status. That path was inspected but was not one of the seven probes.

**Confidence:** Conversion reproduced with real service and adapter code plus controlled persistence; revision is a source-level finding.

### F3 — P1: A password-reset token can be consumed twice

**Evidence:** [apps/api/src/auth/auth.service.ts:751](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth.service.ts) and [apps/api/src/auth/auth.service.ts:778](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth.service.ts).

Token eligibility is read before password hashing and before the transaction. Inside the transaction, the token is updated by ID without requiring that it remain unused. Two requests can both read the unused token and then complete successfully, writing two different password hashes.

The probe synchronized both eligibility reads and then serialized the transaction callbacks. Both resets returned success and both wrote the password. Even serialized transactions cannot protect a decision that was already made outside them.

**Correction:** Atomically consume an unused, unexpired token and update the eligible account/password and session revocations in the same transaction. The losing request must receive the existing invalid-token response. Review email-verification and email-change token consumption for the same read-then-unconditional-write shape.

**Confidence:** Reproduced with the real AuthService and controlled persistence. This demonstrates broken one-use semantics; it does not establish account takeover without possession of a valid token.

### F4 — P1: Account-deletion approval can act on a cancelled request

**Evidence:** [apps/api/src/account/account-deletion.service.ts:106](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/account/account-deletion.service.ts), [apps/api/src/account/account-deletion.service.ts:196](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/account/account-deletion.service.ts), [apps/api/src/account/account-deletion.service.ts:226](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/account/account-deletion.service.ts), and [apps/api/src/account/account-deletion.service.ts:276](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/account/account-deletion.service.ts).

Approval reads a PENDING deletion request before opening its transaction. The user’s cancellation can commit after that read. Approval then anonymizes the account and unconditionally changes the request to APPROVED. Its final update has no PENDING condition.

The administrative rejection path has the same stale-check shape at [apps/api/src/account/account-deletion.service.ts:167](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/account/account-deletion.service.ts).

**Correction:** Acquire or conditionally claim the still-PENDING request inside the transaction before anonymization. Coordinate approval, cancellation, and rejection through that same state check. If cancellation wins, no anonymization should occur.

**Confidence:** High-confidence source-level concurrency risk; no dedicated diagnostic probe or live database execution was performed for this finding.

### F5 — P2: Client cancellation can bypass the required reason

**Evidence:** [apps/api/src/venues/bookings.service.ts:475](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.service.ts), [apps/api/src/venues/bookings.service.ts:491](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.service.ts), and [apps/api/src/venues/booking-transitions.ts:65](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-transitions.ts).

The pure transition policy requires a cancellation reason for an ACCEPTED booking, but not a PENDING booking. The service evaluates this policy using an earlier read. Its write accepts either source status.

The probe changed the booking from PENDING to ACCEPTED immediately after the read. Cancellation still succeeded with a null reason.

**Correction:** Evaluate state-dependent conditions against the state protected by the write. Either require the exact observed status and retry/revalidate after a conflict, or evaluate the policy inside a coordinated transactional command.

**Confidence:** Reproduced with the real service and booking adapter using controlled persistence.

### F6 — P2: Notification enrichment can fail an already committed booking operation

**Evidence:** [apps/api/src/venues/bookings.service.ts:420](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.service.ts), [apps/api/src/venues/bookings.service.ts:660](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.service.ts), and [apps/api/src/venues/domain-events.ts:79](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/domain-events.ts).

The event publisher correctly catches subscriber failures. However, acceptance first awaits notificationFor to load recipient details, then calls publish. A failure in that lookup occurs outside the publisher’s catch and after the booking has been saved.

The probe recorded a committed ACCEPTED state, made the recipient lookup throw, and observed rejection of the service call. The publisher was never called. The API can therefore report an error for a completed action, making a retry appear to conflict.

Decline and professional cancellation use the same arrangement at [apps/api/src/venues/bookings.service.ts:435](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.service.ts) and [apps/api/src/venues/bookings.service.ts:453](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.service.ts).

**Correction:** Move enrichment into a subscriber covered by the existing failure handling, or explicitly protect both enrichment and dispatch as the existing best-effort side effect. A durable queue is not required to correct this particular error boundary.

**Confidence:** Reproduced with the real BookingsService and controlled dependencies.

### F7 — P2: Arabic booking notifications are mapped to French

**Evidence:** [apps/api/src/venues/booking-notification-input.ts:80](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-notification-input.ts), [apps/api/src/venues/booking-notification-input.ts:88](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-notification-input.ts), [apps/api/prisma/schema.prisma:75](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/prisma/schema.prisma), and [apps/api/src/venues/booking-notification-input.spec.ts:213](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-notification-input.spec.ts).

The database locale enum is lowercase fr/ar. The booking notification mapper compares both recipient locales with uppercase AR. A valid ar locale therefore becomes fr.

The probe supplied the actual lowercase domain value and observed French for both recipients. An existing test explicitly expects ar to become fr, so the passing test suite currently preserves the defect.

**Correction:** Use the canonical locale values and a narrow locale type in notification inputs. Test fixtures should satisfy that real contract rather than an unrestricted string contract. Cover both professional and client recipients.

**Confidence:** Directly reproduced against the pure mapper; also verified against the schema and SQL enum definition.

### F8 — P2: A valid JSON null provider response escapes the adapter’s error mapping

**Evidence:** [apps/api/src/payments/chargily.gateway.ts:153](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/payments/chargily.gateway.ts).

The gateway casts decoded JSON to ChargilyCheckoutResponse. Parsing null succeeds, but reading body.id then throws TypeError, bypassing the intended PAYMENT_PROVIDER_MALFORMED response.

**Correction:** Treat decoded provider JSON as unknown. Check that it is a non-null object, then validate the required fields before creating the normalized CheckoutSession.

**Confidence:** Reproduced against the real gateway with a mocked HTTP response. The complete checkout/controller/webhook workflow is deliberately unfinished in this archive, so this is an adapter defect rather than evidence of a currently exposed checkout failure.

## Architectural changes justified by the code

### A1 — Dependency Inversion is incomplete at the persistence boundary

Introducing an interface and injection token is useful, but it does not fully invert the dependency when the interface is still defined in ORM terms:

- [apps/api/src/venues/booking-locks.types.ts:81](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-locks.types.ts) defines BookingRow through Prisma.BookingGetPayload. Its transition input accepts an unrestricted record at line 125, and the adapter casts that record to a Prisma update input.
- [apps/api/src/venues/bookings.service.ts:611](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.service.ts) still takes Prisma.BookingUpdateManyMutationInput in its transition helper.
- [apps/api/src/venues/venue-store.types.ts:26](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/venue-store.types.ts) imports Prisma and imports a runtime query selector from pricing-rules.service. The service’s DTO mapping calls Decimal.toNumber at [apps/api/src/venues/venues.service.ts:210](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/venues.service.ts).
- [apps/api/src/venues/quote-store.types.ts:41](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/quote-store.types.ts) exposes a Prisma-derived row; DevisChiffre.lines uses Prisma.InputJsonValue at line 56.

The BookingLocks header explicitly documents the ORM-derived row as a deliberate exception to avoid maintaining a second copied shape. Other service comments also acknowledge retained direct reads. These are conscious tradeoffs, not missing interfaces discovered solely by a naming scan.

Nevertheless, application policy still depends on the storage representation. Replacing persistence or testing a policy requires knowledge of ORM-shaped objects. The runtime selector import also means a nominal contract module pulls in a concrete service module.

**Recommended direction:** Use small application-owned read models and semantic write commands for the boundaries that need isolation. Convert Prisma Decimal/JSON/query shapes in adapters, keep selectors there, and type-check adapter mappings to prevent drift. Start with the state-changing paths above; do not create a generic repository for every table.

Measured direct PrismaService imports: 19 of 25 application service files, excluding the infrastructure PrismaService itself. This count includes notification orchestration, whose direct import is passed into a shared dispatch helper. It measures coupling, not 19 equally severe violations.

### A2 — Charge calculation extracted; remaining service responsibilities still open

**Resolved subfinding:** the duplicated server-side service-line, total, and deposit calculation. [apps/api/src/venues/bookings.service.ts:223](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.service.ts) calls `chargeOrThrow`, which loads the catalog and delegates to [apps/api/src/venues/booking-charge.ts:92](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-charge.ts). [apps/api/src/venues/quotes.service.ts:448](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/quotes.service.ts) calls the same function. Its input is loaded domain data and its output is either a complete priced result or a typed failure. This implements the previous audit's proposed direction.

The duplicate-service guard is a behavior correction as well as a refactor. Controlled probes confirmed that v5 would reach both persistence boundaries with two copies of the same fixed service and a corresponding increased deposit. V6 returns `SERVICE_DUPLICATE` before those writes. A foreign-venue catalog row is also rejected in both paths even when deliberately returned by the mocked repository. Catalog query filters remain in place.

**Still open:** [apps/api/src/venues/bookings.service.ts:148](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.service.ts) coordinates lookup/admission, slot pricing, expected amounts, snapshot construction, expiration, persistence, events, and DTO mapping. [apps/api/src/venues/quotes.service.ts:411](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/quotes.service.ts) still performs slot/holiday/catalog reads and persistence-shaped output construction, including `Prisma.InputJsonValue`. [apps/api/src/auth/auth.service.ts:132](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth.service.ts) still combines registration, verification, password login, OAuth, refresh, reset, policies, and persistence.

**Recommended direction:** continue with the remaining cohesive decisions and narrow transactional contracts. Reuse the new charge module. Do not create a second result builder or reopen the resolved extraction. Preserve the intended difference that quotes have no client expected-amount confrontation.

### A3 — Browser pricing creates another extension point

[apps/client/src/components/venue/booking-request-panel.tsx:62](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/client/src/components/venue/booking-request-panel.tsx) repeats deposit arithmetic from [apps/api/src/venues/deposit.ts:37](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/deposit.ts). Its service-line preview at line 85 handles three named pricing types and silently treats the remaining case as fixed-price.

A new server pricing strategy can be made exhaustive in the backend registry while the browser continues falling through to the old fixed-price preview. That is an Open/Closed and consistency weakness.

The backend checks the submitted expected amounts, so this finding is about incorrect previews and price-change rejections. It is not evidence that a client-supplied amount is trusted for charging.

**Recommended direction:** Share the framework-independent arithmetic and pricing discriminants in an appropriate workspace package, with explicit browser/server input normalization and exhaustive cases. Keep catalog availability and authoritative validation on the server. Do not import the API application into the browser.

### A4 — WalkinJourney has too many local reasons to change

[apps/pro/src/dashboard/walkin-journey.tsx:147](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/pro/src/dashboard/walkin-journey.tsx) is a single component spanning approximately 650 physical lines with 15 state hooks. It handles the five-step journey, catalog fetching, quote creation/revision, conversion and acceptance, focus management, and rendered step content.

**Recommended direction:** Extract a focused journey hook/reducer for state and async commands, plus cohesive step components. Keep the existing shared UI controls. Different sequential steps are not interchangeable algorithms, so Strategy is not the natural pattern for this UI.

File size alone was not treated as a defect. For example, [apps/pro/src/venues/venue-form.tsx:1052](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/pro/src/venues/venue-form.tsx) is a small composing component inside a large file that already contains many separate field components and pure helpers.

### A5 — Events are typed, but their application-facing contract is still concrete

[apps/api/src/venues/domain-events.ts:23](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/domain-events.ts) derives event payloads from notification-service types. Application services depend on the concrete publisher/subscriber class and construct notification recipient details.

This is a real improvement over direct notification calls, but event contracts still depend on one side-effect consumer. F6 shows a practical consequence of putting enrichment on the publishing side.

**Recommended direction:** Give use cases a narrow publish-only contract. Let the event contract own its payload; let subscribers load notification-specific details where appropriate. Keep the current in-process implementation while it meets the project’s delivery requirements. Adding a broker, CQRS layer, or class per event is not necessary for SOLID.

## Strategy and other patterns that are already sound

| Implementation | Assessment |
|---|---|
| [apps/api/src/venues/pricing-engine.ts:81](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/pricing-engine.ts) | A typed registry of HOLIDAY, WEEKDAY, and SEASON matchers shares one RuleMatcher contract. The caller selects and invokes the appropriate algorithm. This is functional Strategy. |
| [apps/api/src/venues/service-pricing.ts:100](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/service-pricing.ts) | A typed registry implements TIERED, FIXED, PER_GUEST, and PER_UNIT line resolution. Variant-specific validation stays with its resolver; dispatch and common checks are centralized. |
| [apps/api/src/payments/payment.types.ts:67](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/payments/payment.types.ts) | PaymentGateway has one focused createCheckout contract. ChargilyGateway and UnavailablePaymentGateway implement it without leaking provider response shapes to callers. F8 is a localized robustness defect. |
| [apps/api/src/payments/payment-gateway.factory.ts:34](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/payments/payment-gateway.factory.ts) | The factory selects the enabled provider or the deliberately unavailable implementation. Selection at startup is a legitimate variation point; Strategy does not require per-request switching. |
| [apps/api/src/payments/payments.module.ts:30](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/payments/payments.module.ts) | The composition root binds the payment store and gateway abstractions to implementations. |
| [apps/api/src/payments/payment-store.types.ts:44](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/payments/payment-store.types.ts) | The payment repository uses application-shaped inputs/outcomes instead of Prisma types. This is a useful local example for future boundary work. |
| [apps/api/src/venues/booking-transitions.ts:45](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-transitions.ts) and [apps/api/src/venues/quote-transitions.ts:41](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/quote-transitions.ts) | Central tables and pure decisions form a data-driven state machine. A GoF class-per-state implementation is unnecessary. The execution must still enforce the decision atomically. |
| [apps/api/src/venues/domain-events.ts:79](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/domain-events.ts) and [apps/api/src/venues/notification-subscriptions.ts:25](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/notification-subscriptions.ts) | Typed publish/subscribe routing is genuine and isolates subscriber failures. Delivery is in-process and best effort, not a durable event system. |

The payment service currently opens an intent and exposes its gateway; [apps/api/src/payments/payments.service.ts:58](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/payments/payments.service.ts) does not implement the full checkout and webhook lifecycle. The pattern assessment should not be mistaken for certification of a completed payment integration.

Updating a strategy registry, enum, schema, or composition root when introducing a new supported variant is reasonable. Open/Closed does not mean “no existing file ever changes.” There is no justification here for replacing the working function strategies with extra classes solely to make the pattern look more object-oriented.

## Interface Segregation is substantially implemented

[packages/api-client/src/venue-client.ts:79](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/packages/api-client/src/venue-client.ts) defines six focused client families: venue CRUD, media, slot templates, pricing rules, availability, and visits. [apps/pro/src/venues/venue-client-context.tsx:103](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/pro/src/venues/venue-client-context.tsx) exposes six corresponding narrowed hooks. Production consumers use those focused contracts.

VenueProClient composes the families at [packages/api-client/src/venue-client.ts:212](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/packages/api-client/src/venue-client.ts). Keeping a composed client for construction and compatibility does not itself violate ISP. The important point is what each consumer requires. The compatibility useVenues hook is present, but was not found in production consumer calls.

The client interface and hook narrowing tests are backed by successful TypeScript checks. These checks provide stronger evidence than naming the interfaces without using them.

## Database and tooling observations

The database has meaningful protections, including the booking overlap exclusion constraint, unique quote-to-booking conversion, and partial payment uniqueness. In particular, [apps/api/prisma/migrations/20260824120000_payment_one_pending_per_booking/migration.sql:61](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/prisma/migrations/20260824120000_payment_one_pending_per_booking/migration.sql) enforces one pending payment per booking. The audit does not report that constraint as missing.

These constraints protect their stated invariants. They do not replace application transaction rules for status-dependent actions or one-use tokens.

The repository also contains extensive unit/component tests, browser E2E harnesses, and mutation/neutralisation campaigns. The initial review inspected the campaigns as tooling. This revision ran the seven local targets of the new S11-b campaign; its database target and other campaigns were not rerun. Passing ordinary ESLint and TypeScript checks does not enforce every architecture rule; a small dependency guard for designated pure modules and port contracts would help after those boundaries are clarified.

## Additional observations in the revision

### R1 — The new mutation harness can misclassify infrastructure failures

[neutralisation/neutralize-s11b.py:250](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/neutralisation/neutralize-s11b.py) accepts a zero exit status as its preflight proof. [neutralisation/neutralize-s11b.py:282](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/neutralisation/neutralize-s11b.py) then discards the test output and counts every nonzero mutated run as a detected guard. It does not verify that tests were collected or that assertions actually failed.

A controlled calibration of the real harness used a simulated zero-test successful preflight followed by a simulated configuration-load failure. The harness announced one detected mutation and exited 0, although no test assertion had executed. This does **not** invalidate the seven local targets measured in this revision: their JSON reports were separately checked for 13 collected tests and real assertion failures.

**Correction:** distinguish infrastructure/collection errors from assertion failures, check nonzero executed test counts, retain each output, and rerun the restored baseline. This is a test-tool reliability finding, not a demonstrated production vulnerability.

### R2 — Clarify the promised ordering of validation failures

The module comment promises duplicate → unavailable → line validation. Duplicate detection is global, but [apps/api/src/venues/booking-charge.ts:110](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-charge.ts) checks availability and line validity within the same loop. A tier mismatch on the first choice therefore hides an unavailable second choice; reversing those choices changes the returned error. A focused probe confirmed both results.

Every invalid request in this example is still rejected. If the intended priority is global, check availability for all choices before resolving their lines; otherwise document the per-choice rule. This is a localized contract clarification, not a bypass of authorization or a regression demonstrated against v5.

## Verification actually performed

| Verification on zwadj(6).zip | Result |
|---|---|
| Full API unit suite | **653 passed / 57 files**, including the 13 new charge tests |
| Additional comparison/wiring probes | **10 passed**: v5/v6 duplicate behavior, both current callers' ownership rejection and correct amount snapshots, expected-price conflict, and the ordering diagnostic |
| TypeScript and ESLint | **All 6 checks passed** for API, shared types, and i18n, the changed code workspaces |
| Shared types build | Passed |
| Seven local S11-b mutations | Every target produced real assertion failures with 13 collected tests; restored source passed all 13 again |
| Eighth mutation target, PostgreSQL consumers | **Not run here**; harness result 3 correctly reports an incomplete full campaign |
| Harness calibration | Confirmed R1 using simulated process outputs in an isolated copy |
| Original-file integrity | **544/544 byte-identical to zwadj(6).zip** after the review |

The ten-probe run also collected the API suite because the merged Vitest include arrays were additive: its full output contains 663 passing tests across 58 files. This is **653 existing tests plus 10 diagnostics**, not 663 new regression tests. The expected failures caused by mutations are recorded separately.

The initial v5 audit ran **1,310 tests / 107 files** (API 640, API client 36, client 287, pro 347) and TypeScript/ESLint across all eight workspaces. Those are historical measurements. The unchanged frontend suites were not rerun here. D279 reports 1,323 project tests, build, 434 integration tests, E2E, and 8/8 mutations on the author's machine; those claims are not substituted for this revision's independent checks.

F1–F8 retain the initial diagnostic/source evidence. A syntax-tree comparison confirms that the changed services' `accept`, cancellation, `notificationFor`, `convert`, and `revise` methods are unchanged; all other files implicated in those findings are byte-identical. The new charge calculation therefore does not close those findings. Diagnostic tests asserting undesirable behavior are evidence of a defect, not a passing security guarantee.

The updated evidence archive preserves the initial material under `v5/` and the revision measurements under `v6/`: [zwadj-audit-evidence.zip](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-evidence.zip). The README distinguishes actual checks from historical results and controlled harness calibration.

### Environment and limits

- Cached dependency trees were reused only after confirming that both uploaded lockfiles are byte-identical. Workspace links resolve to each extracted archive's source. The real Prisma 7.8.0 client was generated from the v6 schema; no Prisma stub was used.
- Runtime: **Node 24.19.0**, versus the project's Node 22; available **pnpm 11.19.0**, versus pinned 10.34.4. Checks used local executables. For the mutation harness only the subprocess launcher was adapted, and every actual result was checked through Vitest JSON; production source was restored byte-for-byte.
- No PostgreSQL or Docker executable was available. No actual database migration, concurrent database transaction, browser E2E run, full production build, or external payment call was performed here.
- All temporary probes were removed from the reviewed source tree. The uploaded application was not patched.

Archive SHA-256: 5d0deaf82489da57c164129eaa154dd6d86862f7f7d71bba2038aa943fe8f970  
Lockfile SHA-256: 99018400767a6a14232683e8158806e29178b6f79e76f15111a25dd0c3141bbb

## Recommended implementation order

1. **Protect atomic decisions.** Correct F1–F5 with semantic transactional operations, then add PostgreSQL integration tests for competing commands and one-use tokens.
2. **Correct the localized contracts.** Fix notification locale mapping, cover enrichment failures after commit, and validate provider JSON.
3. **Continue from the completed charge extraction.** Address browser/server preview consistency and the explicitly pending SQL amount-coherence and deadline work. Harden the new mutation harness; clarify the validation-error ordering.
4. **Tighten the highest-value ports.** Move ORM selectors/shapes out of the state-changing application contracts; use the existing PaymentStore as a local example.
5. **Reduce the remaining coordination hotspots.** Split WalkinJourney state/commands from its steps and isolate authentication responsibilities incrementally.
6. **Keep the working pattern implementations.** Preserve the functional strategies, narrowed API hooks, centralized transition policy, and existing adapters; add narrow architecture checks around the intended boundaries.

The useful next step is a focused correctness and boundary refactor. A whole-project rewrite or additional pattern hierarchy is not justified by this audit.
