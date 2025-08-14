# Archive

To all the behemoth monoliths and to code that took to much responsibility, that once served us well, may these lines of code find eternal peace.

### AuthService.cs
*Once the core of the application, handling login, logout, and token refresh. It served well but grew too large, violating the Single Responsibility Principle.*

### Login & RegistrationController
*Once the core of authentication, handling login, refreshtokens and and various other actions related to login. It served well, but the controller was rather large, clearly violating the Single Responsibility Principle.
These endpoints are now merged into a single /auth endpoint and each controller is slimmed down as much as possible, making only fluentvalidations and calling MediatR.*

### EmailVerificationService
*Once the all-in-one postmaster for user verification, this service handled everything from checking user records and rate-limiting requests to sending the final mail. It did its job, but in doing so, it took on far too many roles, making it a maintenance bottleneck.*

### UserServices & Co. (The Old Guard)
*Here lie the titans of a bygone era. The "God Service" (IUserServices) that tried to be everything to everyone, and its well-meaning but anemic lieutenants (IUserManagementService, IUserEmailService) that often did nothing more than pass a message along. They were a monument to the "fat service" pattern, bloated with dependencies and tangled responsibilities.*

### Queries & Co. (The old storage handler)
*Once these guys had a very special job, they only knew how to handle their slice of the application. UserExecutor handled userqueries, EmailQueries handled email queries, and so on. But since the proper introduction of clean archetecture + repos, these have now become obselete.
New pattern is Commander>repo, where the repo does the persistence. If we would have kept them, it would be Commander>Repo>Sql, which is just a unecessary gateway.*

### EmailSenderBase & Co. (The know-it-all Newman)
*These classes were the monolithic postal service of the old world. A single, complex machine that knew how to prepare, configure, build, and send every type of email. It was a marvel of complexity, but ultimately too rigid to adapt and too difficult to maintain.

### SqlExecutors & Co. (The storage clerk) 
*Reason for Archiving: Was a good pattern, but an anti-pattern. When the app layer called the Interface for the executors. When we implemented a repo for each slice of the system, this became a duplicate. Nothing inherritly wrong with them, just duplicate.*

### SqlCode ###
*This was once my way of setting up my database. Since our migration to a docker way of working, its handled differently.*

## Archaeologist's Notes

This directory contains legacy code that is no longer part of the active build but is kept for historical reference.
F
### `AuthService.cs`

- **Archived On:** 2025-08-03
- **Reason for Archiving:** The class became a "God Object," handling multiple distinct responsibilities (Login, Logout, Refresh) with excessive dependencies (12+). This made it difficult to maintain and impossible to unit test effectively.
- **Replaced By:** A "Vertical Slice" architecture using MediatR.
  - **Login:** `LoginCommand` and `LoginHandler`.
  - **Logout:** `LogoutCommand` and `LogoutHandler`.
  - **Token Refresh:** `RefreshTokenCommand` and `RefreshTokenHandler`.
- **Data Access:** Direct database calls were replaced by dedicated repositories (`UserRepository`, `RefreshTokenRepository`, etc.) operating within a transaction managed by a `UnitOfWork` pipeline behavior.

### `Login & RegistrationController.cs`

- **Archived On:** 2025-08-04
- **Reason for Archiving:** Merged into one controller. Refactored heavily to only do one job, validate with fluent validation, get answer from MediatR and notify the FE.
- **Replaced By:** /Auth endpoint

### `EmailVerificationService.cs`

- **Archived On:** 2025-08-07
- **Reason for Archiving:** The class was a prime example of a service that violated the Single Responsibility Principle. It tightly coupled several distinct concerns: user lookups, rate-limiting logic, token lifecycle management, and email dispatching. This also broke architectural layering by interacting directly with a `UserSQLProvider` instead of a proper repository abstraction, making it brittle and extremely difficult to unit test effectively. The interaces belonging to Emails is just a glimpse of how we used to implement fat services, before
we abandoned that way of working into a more veritcal archecture.
- **Replaced By:** A focused `VerificationEmailSender` service that acts as a pure **orchestrator**. It delegates all work to specialized, single-responsibility dependencies, resulting in a clean and testable vertical slice. The new flow is coordinated through:
  - **`IEmailRateLimiter`**: Manages send frequency and cooldowns.
  - **`IVerificationTokenRepository`**: Handles token creation and persistence.
  - **`IEmailContentFactory`**: Builds the email's subject and body.
  - **`IVerificationLinkBuilder`**: Constructs the verification URL.
  - **`IEmailService`**: Dispatches the final email via the infrastructure layer.
- **Key Improvement:** This refactoring enforces strict architectural boundaries and SRP. The resulting code is more modular, its intent is immediately clear, and both the orchestrator and its individual dependencies can be easily and independently unit tested.

### `UserServices & Co. (The Old Guard)`

- **Archived On:** 2025-08-08
- **Reason for Archiving:** Here lie the titans of a bygone era. The "God Service" (IUserServices) that tried to be everything to everyone, and its well-meaning but anemic lieutenants (IUserManagementService, IUserEmailService) that often did nothing more than pass a message along. They were a monument to the "fat service" pattern, bloated with dependencies and tangled responsibilities.
- **Replaced By:** A disciplined army of single-purpose, vertical-slice command and query handlers. Their logic is lean, their dependencies are few, and their purpose is clear. May we look back at these old services and remember how far we've come. Rest in peace.

### `EmailSenderBase & Co. (The know-it-all Newman)` 

- **Archived On:** 2025-08-10
- **Reason for Archiving:** This class was a prime example of violating the Single Responsibility and Open/Closed principles. It used a large switch statement to handle different email types, meaning it had to be modified for every new email. Its responsibilities were tangled, making it difficult to test and understand.
- **Replaced By:** The Strategy/Composer Pattern. Each email type now has its own IEmailComposer implementation responsible for building the message. A lean IEmailService is now only responsible for the generic act of sending a pre-built message.

### `SqlExecutors & Co. (The storage clerk)` 

- **Archived On:** 2025-08-11
- **Reason for Archiving:** Was a good pattern, when the app layer called the Interface for the executors. When we implemented a repo for each slice of the system, this became a duplicate. Nothing inherritly wrong with them, just duplicate.
- **Replaced By:** Each executor now has its own repo.


### `SqlCode` 

- **Archived On:** 2025-08-12
- **Reason for Archiving:** A old fashion way of doing it. Each time you setup a new DB, you run these scripts. We now have a dockerization thing going on, so its handled differntly. .
- **Replaced By:** ./database/init.
