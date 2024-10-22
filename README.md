SteenBudgetSolution

SteenBudgetSolution is a full-stack personal finance management application designed to help users track income, expenses, and manage their budgets. Built with a focus on scalability and secure deployment, the project leverages cutting-edge technologies across both backend and frontend systems.
Key Features:

    Secure User Authentication: JWT-based authentication for secure access to user accounts.
    ReCAPTCHA Integration: Protects the registration process against bots with Google reCAPTCHA.
    CRUD Operations: Full Create, Read, Update, and Delete functionality for managing financial data.
    Email Notifications: SMTP server configuration for user verification and notifications.
    Responsive Design: Frontend built with React for seamless user experience across devices.

Tech Stack:

    Backend:
        C# with .NET 8
        MariaDB for the database (SQL-based)
        Dapper for lightweight, fast database access
        Deployed on Raspberry Pi with a fully configured web server
    Frontend:
        React with Axios for API integration
        State management and routing for smooth client-side navigation
    Infrastructure:
        Fully configured on a Raspberry Pi, including a web server, SQL server, and SMTP server
        Custom domain hosted behind a firewall for enhanced security
    CI/CD:
        GitHub Actions configured for Continuous Integration and Deployment (CI/CD)
        GitHub Secrets for secure handling of sensitive environment variables (such as JWT keys, reCAPTCHA keys, and SMTP credentials)

Deployment & Infrastructure:

The entire solution is deployed on a self-hosted Raspberry Pi, which serves as the primary web server. The infrastructure includes:

    MariaDB Database for storing user and financial data.
    SMTP Configuration for sending verification and notification emails to users.
    Firewall Protection to safeguard the domain and ensure secure communication between the client and server.
    GitHub Actions for automated testing, building, and deploying code updates from the repository, ensuring smooth, error-free releases.

Why This Project:

This project showcases my ability to set up, deploy, and manage a full-stack application independently, from frontend to backend, and handle CI/CD pipelines. It demonstrates proficiency with modern development practices, cloud infrastructure, and production-grade deployments.
