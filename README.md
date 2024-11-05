SteenBudgetSolution is a full-stack personal finance management application designed to help users track income, expenses, and manage budgets. Built with a focus on scalability and secure deployment, the project leverages modern technologies for both backend and frontend.
Key Features:

    Secure User Authentication: JWT-based for secure user access.
    ReCAPTCHA Integration: Protects against bot registrations using Google reCAPTCHA.
    CRUD Operations: Manage financial data with full Create, Read, Update, and Delete functionality.
    Email Notifications: Integrated SMTP for user verification and notifications.
    Responsive Design: React frontend ensures seamless cross-device user experience.

Tech Stack:

    Backend:
        C# with .NET 8
        MariaDB (SQL-based)
        Dapper for optimized database access
        Deployed on a self-hosted Raspberry Pi with a fully configured web server
    Frontend:
        React with Axios for API communication
        State management and routing for smooth client-side navigation
    Infrastructure:
        Custom domain hosted behind a firewall
        Graylog for centralized logging and monitoring, ensuring insights into application and server health
        Fail2Ban, UFW, and secure SSH for additional protection
    CI/CD:
        GitHub Actions for Continuous Integration and Deployment
        Secrets management with GitHub Secrets for handling sensitive environment variables (JWT, SMTP credentials, etc.)

Deployment & Infrastructure:

This application is deployed on a self-hosted Raspberry Pi, serving as the primary web server. Key infrastructure elements include:

    MariaDB for secure storage of user and financial data
    SMTP Configuration for sending verification and notification emails
    Graylog for centralized logging and monitoring of application events and errors
    Firewall Protection for secure client-server communication
    CI/CD via GitHub Actions for automated testing, building, and deployment

Security:

Security tools like Fail2Ban, UFW, and enforced SSH key-based authentication further harden the deployment. Sensitive data is managed using environment variables securely loaded on the Raspberry Pi. Graylog integration provides additional monitoring, helping to quickly identify and respond to any unusual activity or application errors.
Scalability:

While deployed on a Raspberry Pi, SteenBudgetSolution is built to scale. With minor adjustments, it can be migrated to cloud hosting if user demand grows.
Why This Project:

This project demonstrates my ability to design, deploy, and manage a complete full-stack application independently, with a strong focus on secure practices, efficient CI/CD workflows, and the use of modern development tools.

Installation & Setup: See INSTALL.md for a full setup guide, including environment configuration, database initialization, and security recommendations.
