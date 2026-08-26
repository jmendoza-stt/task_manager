import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

/**
 * Cognito Configuration
 *
 * These values come from the deployed CloudCore stack.
 * In production, these would be injected via environment variables.
 * For local dev, they can be set in .env and loaded via Vite's import.meta.env.
 */
const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "",
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || "",
};

const userPool = new CognitoUserPool(poolData);

export interface AuthError {
  code: string;
  message: string;
}

export interface SignInResult {
  session: CognitoUserSession;
  accessToken: string;
  idToken: string;
}

/**
 * Sign in with email and password.
 */
export function signIn(email: string, password: string): Promise<SignInResult> {
  const user = new CognitoUser({
    Username: email,
    Pool: userPool,
  });

  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({
          session,
          accessToken: session.getAccessToken().getJwtToken(),
          idToken: session.getIdToken().getJwtToken(),
        });
      },
      onFailure: (err) => {
        reject({
          code: err.code || "UnknownError",
          message: err.message || "Authentication failed",
        } as AuthError);
      },
    });
  });
}

/**
 * Sign up a new user with email, password, and name.
 */
export function signUp(
  email: string,
  password: string,
  name: string
): Promise<CognitoUser> {
  const attributes = [
    new CognitoUserAttribute({ Name: "email", Value: email }),
    new CognitoUserAttribute({ Name: "name", Value: name }),
  ];

  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attributes, [], (err, result) => {
      if (err) {
        reject({
          code: (err as any).code || "UnknownError",
          message: err.message || "Sign up failed",
        } as AuthError);
        return;
      }
      resolve(result!.user);
    });
  });
}

/**
 * Confirm sign up with verification code.
 */
export function confirmSignUp(
  email: string,
  code: string
): Promise<"SUCCESS"> {
  const user = new CognitoUser({
    Username: email,
    Pool: userPool,
  });

  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err, result) => {
      if (err) {
        reject({
          code: (err as any).code || "UnknownError",
          message: err.message || "Confirmation failed",
        } as AuthError);
        return;
      }
      resolve(result as "SUCCESS");
    });
  });
}

/**
 * Sign out the current user.
 */
export function signOut(): void {
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut();
  }
}

/**
 * Get the current authenticated session (refreshes token if needed).
 */
export function getCurrentSession(): Promise<CognitoUserSession | null> {
  const user = userPool.getCurrentUser();
  if (!user) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    user.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(session);
      }
    );
  });
}

/**
 * Get the current user's access token for API calls.
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.getAccessToken().getJwtToken() || null;
}

/**
 * Check if a user is currently authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getCurrentSession();
    return session?.isValid() || false;
  } catch {
    return false;
  }
}
