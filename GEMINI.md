# GEMINI.md: Project Context and Guidelines

This document provides essential context about the project structure, technologies, and conventions. Please adhere to these guidelines to ensure your contributions are accurate, consistent, and aligned with our standards.

## 1. High-Level Project Goal

This is a full-stack web application designed to help everyday Swedish people create and maintain a personal budget. The user experience should be simple, intuitive, and focused on clarity.

---

## 2. Backend

The backend is built with a focus on maintainability and separation of concerns.

* **Technology Stack:** C# (.NET), MariaDB, and Dapper for data access.
* **Architecture:** We strictly adhere to **Clean Architecture**. Please maintain the clear separation between the Domain, Application, Infrastructure, and API layers.
* **Folder Structure:** The existing folder structure is deliberate. When adding new features, create files in the appropriate corresponding folders within the established architecture.
* **Database Interaction:** We use the Dapper ORM for executing raw SQL queries against the MariaDB database. Avoid introducing other ORMs like Entity Framework unless specifically instructed.

### Backend Testing

* **Location:** All tests are located in the `backend.test` folder.
* **Structure:** We follow a consistent testing structure. When creating new tests, please observe and replicate the patterns found in existing tests. Key base classes for inheritance are:
    * `Backend.Tests\UnitTests\BaseClasses\UnitTestBase.cs`
    * `Backend.Tests\IntegrationTests\BaseClasses\IntegrationTestBase.cs`
* > **VERY IMPORTANT RULE:** Do **not** execute tests that you have not created or modified, unless specifically instructed to do so. Some integration tests are time-consuming and resource-intensive. Running them unnecessarily is inefficient. Deciding when to run a full test suite is the responsibility of the human developer in charge.
* > **ADDITIONAL RULE:** Every test you create is to stay. Do not delete tests, even as part of a cleanup process. All created tests should remain in the codebase for review.

---

## 3. Frontend

The frontend is a modern, responsive single-page application (SPA).

* **Technology Stack:** React, TypeScript, Tailwind CSS, and Vite for the build tool. Please adhere to this stack.
* **Component Architecture:** We use the **Atomic Design** methodology (Atoms, Molecules, Organisms). Please create new components at the correct level of abstraction and place them in the corresponding folders (e.g., `src/components/atoms`, `src/components/molecules`).
* **Key Component Location (Wizard):** The primary user onboarding and setup wizard components are located under:
    * `src/components/organisms/overlays/wizard/`
* **Wizard Entry Point:** The main parent component that orchestrates the entire wizard flow is:
    * `src/components/organisms/overlays/wizard/SetupWizard.tsx`

---

## 4. General Instructions

* **Git Workflow:** Your role is to generate code and propose commit messages, but not to manage the repository history directly.
    * You are **NEVER** to execute `git commit` or `git push`.
    * After you have finished generating or modifying code based on a task, you **SHOULD** write a proposed commit message into a file named `COMMIT_MSG.tmp` located in the project's root directory.
    * Please format the message using the **Conventional Commits** specification (e.g., `feat: Add user login functionality`). The human developer will review this file and perform the actual commit.

* **Code Style:** Follow the existing code style, naming conventions, and formatting.
* **Clarity Over Brevity:** Write clear, readable, and maintainable code.
* **Questions:** If an instruction is unclear or ambiguous, please ask for clarification before proceeding.