import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    fonctionnelRole?: string;
  };
}

// AUTHENTIFICATION DÉSACTIVÉE - Middleware qui laisse tout passer
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Créer un utilisateur par défaut pour la compatibilité
  req.user = {
    id: 1,
    email: 'admin@igca.paris',
    role: 'super_admin',
  };
  next();
};

// AUTHENTIFICATION DÉSACTIVÉE - Laisse tout passer
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    next();
  };
};

// AUTHENTIFICATION DÉSACTIVÉE - Laisse tout passer
export const requireFonctionnelRole = (...fonctionnelRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    next();
  };
};
