const EMAIL_DOMAIN = "sestape.com";

const slug = (value: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");

export function generateEmployeeEmail(fullName: string): string {
  const parts = slug(fullName).split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return `${parts[0]}@${EMAIL_DOMAIN}`;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first}.${last}@${EMAIL_DOMAIN}`;
}

export const EMPLOYEE_EMAIL_DOMAIN = EMAIL_DOMAIN;