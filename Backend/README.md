SteenBudget Backend

The backend application for SteenBudget, built with C# and .NET 8, focuses on robust data management, security, and scalability. It provides a comprehensive API for managing users, budgets, and financial data.

🛠️ Project Status

⚠️ Work in Progress
This project is actively being developed. Changes to folder structure, components, and functionality may occur frequently.

🚀 Features

    Secure Authentication: JWT-based authentication for secure API access.
    ReCAPTCHA Integration: Protects against bot activity in registration and contact forms.
    CRUD Operations: Full support for managing users, budgets, and financial transactions.
    Email Notifications: SMTP integration for account verification and notifications.
    Optimized Database Access: Dapper for high-performance SQL queries.

📂 Folder Structure

    /Backend
    │   appsettings.Development.json     # Development configuration
    │   appsettings.json                 # Shared configuration
    │   appsettings.Production.json      # Production configuration
    │   Backend.csproj                   # Project file
    │   Backend.http                     # HTTP request examples
    │   Program.cs                       # Application entry point
    │
    ├───Application                      # Core business logic and interfaces
    │   ├───DTO                          # Data Transfer Objects
    │   ├───Interfaces                   # Interfaces for services
    │   ├───Services                     # Business services (Email, Token, User)
    │   ├───Settings                     # Application settings classes
    │   └───Validators                   # Input validation classes
    │
    ├───Domain                           # Application domain models
    │   ├───Entities                     # Data models (e.g., User, Income)
    │   └───Interfaces                   # Interface definitions
    │
    ├───Infrastructure                   # Data and infrastructure services
    │   ├───Data                         # Database access logic
    │   │   ├───Sql                      # SQL execution classes and queries
    │   │   └───SqlCode                  # Raw SQL scripts
    │   ├───Email                        # Email handling services
    │   ├───Helpers                      # Helper utilities
    │   └───Security                     # Security helpers (e.g., hashing)
    │
    ├───logs                             # Log files
    ├───Presentation                     # API controllers
    │   └───Controllers                  # RESTful controllers (e.g., Registration)
    ├───Properties                       # Application properties
    │   └───launchSettings.json          # Local launch settings
    └───Test                             # Unit tests and mocks
        ├───Mocks                        # Mock services for testing
        └───UserTests                    # User-related unit tests
    /backend.test                        # Separate folder for tests
    ├───IntegrationTests                 # Integration tests for APIs and services
    ├───UnitTests                        # Unit tests for individual components
    ├───StartupTest.cs                   # Test-specific configuration setup

🛠️ Setup and Installation
Prerequisites

    .NET 8 SDK and Runtime installed.
    MariaDB for the database.
    SMTP server for email functionality.

⚙️ Environment Variables

Set the following environment variables to ensure proper functionality:
Required

    JWT_SECRET_KEY: Secret key for JWT authentication.
    DB_CONNECTION_STRING: Connection string for the MariaDB database.

Production Only

    SMTP_PASSWORD: Password for the SMTP server.
    SMTP_PASSWORD_INFO: Secondary SMTP password for contact/support emails.

🧩 Key Components

Core Layers

    Application: Contains services, DTOs, validators, and business logic interfaces.
    Domain: Houses the domain entities and models.
    Infrastructure: Manages data access and external services.
    Presentation: Provides API endpoints via controllers.

Test Folder

The backend.test folder, located in the root directory, contains unit and integration tests for the backend:

    Unit Tests: Validate individual components and services.
    Integration Tests: Test end-to-end functionality of APIs and database interactions.
    StartupTest.cs: Provides a custom configuration for testing environments.

Services and Features

    User Services: Handles user registration, authentication, and management.
    Token Services: Issues and validates JWTs.
    Email Services: Sends account verification and notification emails.

🛡️ Security

    JWT Authentication: Ensures secure access to the API.
    Environment Variables: Protects sensitive data.
    Firewall and Fail2Ban: Recommended for production environments.

🛠️ Testing

The Backend.Tests folder is structured to include both unit tests and integration tests, ensuring comprehensive coverage of the backend functionality:

    /Backend.Tests
    ├───Configuration          # Test-specific configuration setups
    ├───IntegrationTests       # End-to-end tests for APIs and services
    ├───UnitTests              # Isolated tests for individual components
    ├───Backend.Tests.cs       # Main test project file

Features of the Test Setup

    Organized Structure: Unit tests and integration tests are clearly separated into respective folders.
    Base Classes: Common test setups and helpers are included as base classes to reduce redundancy and improve maintainability.
    Full Integration: Tests are fully integrated with the main project, making it easy to validate actual application functionality.
    Ease of Use: By aligning the test environment closely with the production setup, tests are straightforward to write and execute.

Running Tests

To run all tests:

    cd Backend.Tests
    dotnet test

Types of Tests

    Unit Tests: Focus on testing individual components or services in isolation.
    Integration Tests: Validate the interaction between various components, including database access and API endpoints.

📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
🤝 Contributing

Contributions are welcome! Feel free to fork the repository and create pull requests.
