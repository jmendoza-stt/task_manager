import { makeAutoObservable, runInAction } from "mobx";
import {
  signIn as cognitoSignIn,
  signUp as cognitoSignUp,
  confirmSignUp as cognitoConfirmSignUp,
  signOut as cognitoSignOut,
  isAuthenticated,
  getAccessToken,
  type AuthError,
} from "@/lib/auth";

export type AuthState =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "needs_confirmation";

class AuthStore {
  state: AuthState = "idle";
  error: string | null = null;
  pendingEmail: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get isAuthenticated() {
    return this.state === "authenticated";
  }

  get isLoading() {
    return this.state === "loading";
  }

  /**
   * Check session on app start.
   */
  async checkSession() {
    this.state = "loading";
    this.error = null;
    try {
      const authenticated = await isAuthenticated();
      runInAction(() => {
        this.state = authenticated ? "authenticated" : "unauthenticated";
      });
    } catch {
      runInAction(() => {
        this.state = "unauthenticated";
      });
    }
  }

  /**
   * Sign in with email and password.
   */
  async signIn(email: string, password: string) {
    this.state = "loading";
    this.error = null;
    try {
      await cognitoSignIn(email, password);
      runInAction(() => {
        this.state = "authenticated";
      });
    } catch (err) {
      runInAction(() => {
        const authErr = err as AuthError;
        this.state = "unauthenticated";
        this.error = authErr.message;
      });
    }
  }

  /**
   * Sign up a new user.
   */
  async signUp(email: string, password: string, name: string) {
    this.state = "loading";
    this.error = null;
    try {
      await cognitoSignUp(email, password, name);
      runInAction(() => {
        this.state = "needs_confirmation";
        this.pendingEmail = email;
      });
    } catch (err) {
      runInAction(() => {
        const authErr = err as AuthError;
        this.state = "unauthenticated";
        this.error = authErr.message;
      });
    }
  }

  /**
   * Confirm sign up with verification code.
   */
  async confirmSignUp(code: string) {
    if (!this.pendingEmail) return;
    this.state = "loading";
    this.error = null;
    try {
      await cognitoConfirmSignUp(this.pendingEmail, code);
      runInAction(() => {
        this.state = "unauthenticated";
        this.pendingEmail = null;
      });
    } catch (err) {
      runInAction(() => {
        const authErr = err as AuthError;
        this.state = "needs_confirmation";
        this.error = authErr.message;
      });
    }
  }

  /**
   * Sign out.
   */
  signOut() {
    cognitoSignOut();
    this.state = "unauthenticated";
    this.error = null;
  }

  /**
   * Get access token for API calls.
   */
  getAccessToken() {
    return getAccessToken();
  }

  clearError() {
    this.error = null;
  }
}

export const authStore = new AuthStore();
