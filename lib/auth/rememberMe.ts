const REMEMBER_EMAIL_KEY = "sa-remember-email";

export function getRememberedEmail(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
}

export function setRememberedEmail(email: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(REMEMBER_EMAIL_KEY, email);
}

export function clearRememberedEmail() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(REMEMBER_EMAIL_KEY);
}
