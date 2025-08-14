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
5.  **Set Refresh Token Cookie**: The backend sets the refresh token via Set-Cookie with HttpOnly; Secure; SameSite=Strict|Lax; Path=/; Expires=<rolling>. The token is not returned in the JSON body.
6.  **Return Access Token & User Data**: The backend returns only the accessToken and public user data.
7.  **Update UI**: The frontend stores the `accessToken` and user data in its global state (`authStore`) and updates the UI to reflect that the user is logged in.

## Automatic Token Refresh Flow

When an `accessToken` expires, the frontend seamlessly refreshes it without any user interaction.

1.  **API Request Fails**: A protected API request is made with an expired `accessToken`. The server responds with a `401 Unauthorized` status.
2.  **Interceptor Catches Error**: An axios response interceptor on the frontend catches the `401` error.
3.  **POST to /api/auth/refresh**: The interceptor automatically sends a POST request to the `/api/auth/refresh` endpoint. This request includes the `refreshToken` cookie.
4.  **Backend Validates & Rotates**: The backend validates the refresh token, rotates it (single-use), and sets a new refresh cookie.
5.  **Return New Access Token**: The response body contains the new accessToken (cookie is updated by the server).
6.  **Retry Original Request**: The frontend interceptor receives the new `accessToken`, updates the `authStore`, and automatically retries the original API request that failed. This time, the request succeeds with the new `accessToken`.
Security note
    We enforce a rolling window for refreshes (extended on each refresh) with a hard absolute expiry (e.g., 90 days). After the absolute expiry, the user must log in again
## Logout Process

1.  **User Clicks Logout**: The user initiates a logout action.
2.  **POST to /api/auth/logout**: The frontend sends a POST request to `/api/auth/logout`.
3.  **Invalidate Tokens**: The backend revokes refresh tokens in the database (archived for audit) and blacklists the access token (best-effort).
4.  **Clear Cookie**: The backend clears the refresh cookie (Set-Cookie: RefreshToken=; HttpOnly; Secure; SameSite=…; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT).
5.  **Clear Local State**: The frontend clears the `accessToken` and any user data from its global state (`authStore`) and redirects the user to the login page.
