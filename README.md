SteenBudgetSolution is a full-stack personal finance management application designed to help users track income, expenses, and manage budgets. Built with a focus on scalability and secure deployment, the project leverages modern technologies for both backend and frontend.
Key Features:

    Secure User Authentication: JWT-based for secure user access.
    ReCAPTCHA Integration: Protects against bot registrations using Google reCAPTCHA.
    CRUD Operations: Manage financial data with full Create, Read, Update, and Delete functionality.
    Email Notifications: Integrated SMTP for user verification and notifications.
    Responsive Design: Tailwind CSS for a modern, mobile-first responsive UI.
    TypeScript Integration: Adds type safety and enhanced developer experience to the frontend.

Tech Stack:

    Backend:
        C# with .NET 8
        MariaDB (SQL-based)
        Dapper for optimized database access
        Deployed on a self-hosted Raspberry Pi with a fully configured web server
    Frontend:
        React with TypeScript for a robust, scalable client-side application
        Axios for API communication
        Tailwind CSS for modern, responsive UI development
        Vite as the build tool for fast and efficient frontend bundling
    Infrastructure:
        Custom domain hosted behind a firewall
        Graylog for centralized logging and monitoring, ensuring insights into application and server health
        Fail2Ban, UFW, and secure SSH for additional protection
    CI/CD:
        GitHub Actions for Continuous Integration and Deployment
        Secrets management with GitHub Secrets for handling sensitive environment variables (JWT, SMTP credentials, etc.)

Deployment & Infrastructure

The entire solution is deployed on a self-hosted Raspberry Pi, which serves as the primary web server. The infrastructure includes:

    MariaDB Database for storing user and financial data.
    SMTP Configuration for sending verification and notification emails to users.
    Graylog Logging for centralized log management, using Docker containers for MongoDB and Elasticsearch as required dependencies. Graylog enhances the monitoring and logging capabilities for the solution.
    Dockerized Services: MongoDB and Elasticsearch are set up in Docker containers, simplifying deployment and management for Graylog.
    Firewall Protection to safeguard the domain and ensure secure communication between the client and server.
    GitHub Actions for automated testing, building, and deploying code updates from the repository, ensuring smooth, error-free releases.

If users want to enable Graylog logging, they can uncomment the Graylog configuration in Program.cs and follow the installation guide to set up Docker-based MongoDB, Elasticsearch, and Graylog.

Domain and Email Configuration:

    SSL Certificates: It’s recommended to secure your deployment with SSL certificates to enable HTTPS. This can be achieved with free tools like Let's Encrypt to provide encrypted connections for all users.
    DNS Setup: Configure DNS records for your domain to make the application accessible publicly. See INSTALL.md for a detailed guide on DNS settings.
    SPF and DKIM: Improve email deliverability and security by setting up SPF and DKIM records to authenticate outgoing emails from your domain.

Firewall and Access Controls: Use UFW and SSH key-based authentication to secure server access.

Security:

    Security tools like Fail2Ban, UFW, and enforced SSH key-based authentication further harden the deployment. Sensitive data is managed using environment variables securely loaded on the Raspberry Pi. Graylog integration provides additional monitoring, helping to quickly identify and respond to any unusual activity or application errors.
    Scalability:

While deployed on a Raspberry Pi, SteenBudgetSolution is built to scale. With minor adjustments, it can be migrated to cloud hosting if user demand grows.
Why This Project:

This project demonstrates my ability to design, deploy, and manage a complete full-stack application independently, with a strong focus on secure practices, efficient CI/CD workflows, and the use of modern development tools.

Installation & Setup: See INSTALL.md for a full setup guide, including environment configuration, database initialization, and security recommendations.


For more details on our JWT-based authentication, periodic token checks, and WebSocket logout,
see [docs/Authentication.md](docs/Authentication.md).
