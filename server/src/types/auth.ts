export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthenticatedUser {
  id: number;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
