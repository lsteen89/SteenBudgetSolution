The frontend application for the SteenBudget project, built with React, Vite, TypeScript, and Tailwind CSS. Organized using Atomic Design principles, this project ensures scalability and maintainability for modern web development.

🛠️ Project Status

⚠️ Work in Progress
This project is actively being developed. Changes to folder structure, components, and functionality may occur frequently.
🚀 Features

    Responsive Design: Optimized for different screen sizes using Tailwind CSS.
    Atomic Design Structure: Components are structured as atoms, molecules, and organisms for reusability and clarity.
    Reusable Components: Consistent UI elements with streamlined development practices.
    SVG Integration: Menu redesigned with SVG-based items.
    Modern Tech Stack: React with TypeScript and Vite for lightning-fast development and production builds.
    Tailwind CSS: Modular and utility-first styling approach.

📂 Folder Structure

    /src
    ├── Pages/                       # Main application pages
    │   ├── Home/                    # Home page
    │   │   ├── HomePage.jsx
    │   ├── auth/                    # Authentication pages
    │   │   ├── CheckEmailPage.jsx
    │   │   ├── EmailConfirmationPage.jsx
    │   │   ├── Login.jsx
    │   │   ├── Registration.jsx
    │   ├── info/                    # Informational pages
    │   │   ├── AboutUs.jsx
    │   │   ├── Contact.jsx
    │   │   ├── Faq.jsx
    │
    ├── components/                  # Reusable UI components
    │   ├── atoms/                   # Basic building blocks
    │   │   ├── InputField.jsx
    │   │   ├── SubmitButton.jsx
    │   ├── molecules/               # Grouped components
    │   │   ├── DeepBlueContainer.jsx
    │   ├── organisms/               # Larger UI sections
    │   │   ├── Menu/                # Menu component
    │   │   │   ├── MenuComponent.jsx
    │
    ├── assets/                      # Static files (images, fonts, etc.)
    ├── styles/                      # Global and Tailwind-specific styles
    ├── index.css                    # Tailwind base styles
    ├── App.jsx                      # Main application component
    ├── main.jsx                     # Entry point for the application
    ├── vite.config.js               # Vite configuration
    ├── tsconfig.json                # TypeScript configuration
    ├── declarations.d.ts            # TypeScript declaration file

🛠️ Setup and Installation
Prerequisites

    Node.js and npm installed on your system.
    Environment variables configured for the frontend application.

Installation

Clone the repository:

    git clone https://github.com/lsteen89/SteenBudgetFrontend.git
    cd SteenBudgetFrontend

Install dependencies:

    npm install

Run the development server:

    npm run dev

Build for production:

    npm run build

    Production build artifacts will be located in the dist/ directory.

⚙️ Environment Variables

The project requires the following environment variables:

    VITE_APP_API_URL: Base URL for the backend API.
    VITE_APP_RECAPTCHA_SITE_KEY: Site key for Google reCAPTCHA.

Set these variables in a .env file in the root of the project:

    VITE_APP_API_URL=https://api.example.com
    VITE_APP_RECAPTCHA_SITE_KEY=your-recaptcha-site-key

🧩 Key Components

    Atoms: Small, reusable UI elements (e.g., buttons, inputs).
    Molecules: Groupings of atoms (e.g., form fields, cards).
    Organisms: Larger UI sections (e.g., navbar, menu).
    Pages: Complete views such as Home, Login, and Contact pages.

🔍 Notes and Considerations

    Tailwind CSS: Styling is fully managed using Tailwind CSS, eliminating the need for modular CSS files.
    Vite Integration: The project uses Vite for fast development builds and optimized production outputs.
    Atomic Design: The folder structure follows the Atomic Design methodology for scalable and maintainable development.
    TypeScript: Ensures type safety across the project.
    Case Sensitivity: Ensure file paths match exactly, as this project runs on a case-sensitive server (e.g., Linux).

🛡️ Testing

Run tests using:

    npm test

🤝 Contributing

Feel free to fork the repository and submit a pull request. Contributions are welcome!
📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
