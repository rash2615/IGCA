export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  fonctionnelRole?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

