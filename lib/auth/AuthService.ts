import { signIn } from "./signIn";
import { signOut } from "./signOut";
import { signUp } from "./signUp";
import { resendVerification } from "./resendVerification";

export class AuthService {
  static login(email: string, password: string) {
    return signIn(email, password);
  }

  static logout() {
    return signOut();
  }

  static register(
    email: string,
    password: string,
    metadata?: { firstName?: string; lastName?: string },
  ) {
    return signUp(email, password, metadata);
  }

  static resendVerification(email: string) {
    return resendVerification(email);
  }
}
