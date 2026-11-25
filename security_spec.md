# FlightHub Lmtd Security Specification (Phase 0)

## Data Invariants
1. Every document under `/users/{userId}` and its subcollections (`/private/{docId}`, `/bookings/{bookingId}`, `/events/{eventId}`) is strictly owned by `request.auth.uid == userId` with `request.auth.token.email_verified == true`.
2. Subcollection documents (`bookings`, `events`, `private`) require the parent `/users/{userId}` workspace document to exist (`Master Gate`).
3. Booking IDs and Event IDs must match `^[a-zA-Z0-9_\-]+$` and stay within `<= 64` characters; `seatBooked` must match `^([1-9]|[12][0-9]|30)[A-F]$`.
4. All strings and maps are strictly length-bounded to prevent Denial-of-Wallet storage abuse, and shadow keys are rejected by `hasAll` + `hasOnly`.
5. Server timestamps (`request.time`) are enforced on `updatedAt` and `serverCreatedAt`.
6. PII (`email`, Razorpay `contact`, passenger names) is strictly private to the owning verified user; blanket `allow read: if isSignedIn()` is prohibited.

## The "Dirty Dozen" Adversarial Payloads
1. Unauthenticated read/write to `/users/u1/bookings/BC1`.
2. Verified user `u2` attempting `get` or `list` on `/users/u1/bookings`.
3. Unverified email account (`email_verified: false`) writing to `/users/u1/bookings/BC1`.
4. Identity spoofing: `u1` creates booking under `/users/u1/bookings/BC1` with `ownerId: "u2"`.
5. Shadow field injection: `u1` adds `"isAdmin": true` or `"ghost": 1` on `Booking` create.
6. Orphaned subcollection write: `u1` creates booking before `/users/u1` workspace doc exists.
7. Path poisoning: `bookingId` exceeds 128 chars or contains spaces/invalid characters.
8. Value poisoning: `passengerName` exceeds 120 chars or `fare <= 0`.
9. Invalid seat number poisoning: `seatBooked: "99Z"` bypassing `1A`–`30F`.
10. Timestamp forgery: `serverCreatedAt` set to client `Date` instead of `request.time`.
11. Immutable field mutation attempt: attempting `update` on `Booking` to overwrite `ownerId` or `bookingId`.
12. Unscoped `list` query on `/users` collection.
