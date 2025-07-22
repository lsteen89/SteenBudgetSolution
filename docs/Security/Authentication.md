# Authentication Flow

Our authentication system uses a secure, cookie-based approach for refresh tokens and in-memory JWTs for access tokens. It is designed to be secure and resilient, with automatic token refreshes to provide a smooth user experience.

## Key Features

*   **JWTs**: We use a short-lived `accessToken` for authenticating API requests and a long-lived `refreshToken` to obtain new access tokens.
*   **HttpOnly Refresh Token Cookie**: The `refreshToken` is stored in a secure, `HttpOnly` cookie. This means it cannot be accessed by client-side JavaScript, which protects it from XSS (Cross-Site Scripting) attacks.
*   **In-Memory Access Token**: The `accessToken` is stored in memory in the frontend application state, preventing it from being vulnerable to XSS attacks targeting local/session storage.
*   **Automatic Token Refresh**: The frontend uses an interceptor to automatically refresh expired access tokens without interrupting the user.
*   **State Management**: The user's authentication state (e.g., username, roles, and the `accessToken`) is managed in a global store on the frontend after a successful login.

## Login Process

Here is a step-by-step breakdown of the login flow:

1.  **User Submits Credentials**: The user enters their email and password into the login form.
2.  **POST to /api/auth/login**: The frontend sends a POST request to the `/api/auth/login` endpoint with the user's credentials.
3.  **Backend Validation**: The `LoginController` validates the credentials against the database.
4.  **Token Generation**: Upon successful validation, the backend generates a new `accessToken` and `refreshToken`.
5.  **Set Refresh Token Cookie**: The backend sets the `refreshToken` as an `HttpOnly` cookie in the HTTP response.
6.  **Return Access Token & User Data**: The backend returns a JSON object containing the `accessToken` and public user data (like username and roles).
7.  **Update UI**: The frontend stores the `accessToken` and user data in its global state (`authStore`) and updates the UI to reflect that the user is logged in.

## Automatic Token Refresh Flow

When an `accessToken` expires, the frontend seamlessly refreshes it without any user interaction.

1.  **API Request Fails**: A protected API request is made with an expired `accessToken`. The server responds with a `401 Unauthorized` status.
2.  **Interceptor Catches Error**: An axios response interceptor on the frontend catches the `401` error.
3.  **POST to /api/auth/refresh**: The interceptor automatically sends a POST request to the `/api/auth/refresh` endpoint. This request includes the `refreshToken` cookie.
4.  **Backend Issues New Token**: The backend validates the `refreshToken`. If valid, it generates a new `accessToken`.
5.  **Return New Access Token**: The backend returns the new `accessToken` in the response body.
6.  **Retry Original Request**: The frontend interceptor receives the new `accessToken`, updates the `authStore`, and automatically retries the original API request that failed. This time, the request succeeds with the new `accessToken`.

## Logout Process

1.  **User Clicks Logout**: The user initiates a logout action.
2.  **POST to /api/auth/logout**: The frontend sends a POST request to `/api/auth/logout`.
3.  **Backend Invalidates Tokens**: The backend blacklists the user's `refreshToken` and performs any other necessary cleanup.
4.  **Clear Cookies**: The backend sends a response that clears the `refreshToken` cookie from the browser.
5.  **Clear Local State**: The frontend clears the `accessToken` and any user data from its global state (`authStore`) and redirects the user to the login page.
