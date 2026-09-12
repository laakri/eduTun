# Bac Access and Approval Plan

## Goal

A learner chooses a Bac type and access plan without paying. The request stays pending until an admin reviews it. Approval creates the learner subscription and exposes the Bac context. The learner then chooses the categories they want to study, and the catalog shows only courses in those selected categories.

## User flow

1. Learner opens the packs/access page.
2. Learner selects a Bac type and submits an access request.
3. The request is stored as `pending`; no subscription is activated and no payment is attempted.
4. An admin reviews the request from the admin workspace.
5. Approval creates an active subscription containing the Bac type and links it to the request.
6. The learner sees the approved subscription and selects one or more categories inside that Bac.
7. The learning catalog filters by the selected categories and displays accessible courses, their chapters, and their professors.
8. Rejection leaves the learner without access and stores an optional review note.

## Implementation phases

### Phase 1: Safe data and approval foundation

- Add `BacAccessRequest` with pending/approved/rejected status.
- Add Bac type and request references to `UserSubscription`.
- Add `UserSubscriptionCategory` for learner-selected categories.
- Keep new fields nullable where existing rows need compatibility.
- Add admin list and approve/reject endpoints.

### Phase 2: Learner request and approved access

- Replace immediate activation on `/packs` with request submission.
- Add a learner status page showing pending, approved, or rejected requests.
- After approval, display the Bac type and category selection step.

### Phase 3: Category-aware learning catalog

- Save selected categories for the approved subscription.
- Restrict catalog access to selected categories and their descendants.
- Keep course, chapter, professor, search, and category filters in the learning view.
- Preserve existing behavior for legacy active subscriptions without selections during migration.

### Phase 4: Admin and UX hardening

- Add the professor application approval link to the admin navigation.
- Add clear empty, pending, approved, and rejected states.
- Validate ownership and prevent duplicate pending requests.
- Add focused Prisma, TypeScript, and API checks.

## Explicitly deferred

- Payment provider integration.
- Payouts and professor earnings.
- Automated billing or renewals.

## Safety rules

- Never grant access from a client-side flag.
- Only an admin can approve or reject an access request.
- Only the request owner can view or submit their own request.
- Existing active subscriptions must continue working while learners move to category selections.
