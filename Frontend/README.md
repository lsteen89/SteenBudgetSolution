## SteenBudget Frontend

The frontend application for the SteenBudget project, built with React and organized using Atomic Design principles for scalable and maintainable development.

## 🛠️ Project Status

⚠️ **Work in Progress**  
This project is actively being developed. Changes to folder structure, components, and functionality may occur frequently.


🚀 Features

    Responsive Design: Scalable for different screen sizes (starting with desktop-focused design).
    Atomic Design Structure: Components are organized as atoms, molecules, and organisms.
    Reusable Components: Streamlined and consistent UI elements.
    SVG Integration: Menu redesigned with SVG-based items.
    Modern Tech Stack: React with TypeScript for type safety and modular CSS for scoped styling.

📂 Folder Structure

Here’s the organized folder structure following Atomic Design principles:

    /src
    ├── Pages/                       # Main application pages
    │   ├── Home/                    # Home page
    │   │   ├── HomePage.js
    │   │   ├── HomePage.module.css
    │   ├── auth/                    # Authentication pages
    │   │   ├── CheckEmailPage.js
    │   │   ├── CheckEmailPage.module.css
    │   │   ├── EmailConfirmationPage.tsx
    │   │   ├── EmailConfirmationPage.module.css
    │   │   ├── Login.js
    │   │   ├── Login.module.css
    │   │   ├── Registration.tsx
    │   │   ├── Registration.module.css
    │   ├── info/                    # Informational pages
    │   │   ├── AboutUs.js
    │   │   ├── AboutUs.module.css
    │   │   ├── Contact.js
    │   │   ├── Contact.module.css
    │   │   ├── Faq.js
    │   │   ├── Faq.module.css
    │
    ├── components/                  # Reusable UI components
    │   ├── atoms/                   # Basic building blocks
    │   │   ├── InputField/          # Input field component
    │   │   │   ├── InputField.tsx
    │   │   ├── buttons/             # Button components
    │   │   │   ├── SubmitButton.tsx
    │   │   │   ├── SubmitButton.module.css
    │   ├── molecules/               # Grouped components
    │   │   ├── containers/          # Specialized containers
    │   │   │   ├── DeepBlueContainer.js
    │   │   │   ├── DeepBlueContainer.module.css
    │   ├── organisms/               # Larger UI sections
    │   │   ├── Menu/                # Menu component
    │   │   │   ├── MenuComponent.js
    │   │   │   ├── MenuComponent.module.css
    │
    ├── assets/                      # Static files (images, fonts, etc.)
    ├── declarations.d.ts            # TypeScript declaration file
    ├── index.css                    # Global styles

🛠️ Setup and Installation
Prerequisites

    Node.js and npm installed on your system.
    Environment variables configured (REACT_APP_API_URL, REACT_APP_RECAPTCHA_SITE_KEY, etc.).

Installation

    Clone the repository:

    git clone https://github.com/username/SteenBudgetFrontend.git
    cd SteenBudgetFrontend

Install dependencies:

    npm install

Run the development server:

    npm start

Build for production:

    npm run build

⚙️ Environment Variables

The project requires the following environment variables to function:

    REACT_APP_API_URL: Base URL for the backend API.
    REACT_APP_RECAPTCHA_SITE_KEY: Site key for Google reCAPTCHA.

Set these variables in a .env file in the root of the project:

    REACT_APP_API_URL=https://api.example.com
    REACT_APP_RECAPTCHA_SITE_KEY=your-recaptcha-site-key

🧩 Key Components

    Atoms: Small, reusable UI elements (e.g., buttons, inputs).
    Molecules: Groupings of atoms (e.g., form fields, cards).
    Organisms: Sections of the UI (e.g., navbar, menu).
    Pages: Complete views such as Home, Login, and Contact pages.

🔍 Notes and Considerations

    Styling: Modular CSS is used (*.module.css) to scope styles and avoid global CSS conflicts.
    Atomic Design: The structure follows the Atomic Design methodology for scalability.
    Folder Naming: Folders and files follow a PascalCase convention.
    Case Sensitivity: Ensure file paths match exactly, as this project runs on a case-sensitive server (e.g., Linux).

🛡️ Testing

Run tests using:

    npm test

🤝 Contributing

Feel free to fork the repository and submit a pull request. Contributions are welcome!
📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
