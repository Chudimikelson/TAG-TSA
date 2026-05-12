export interface JWTPayload {
  sub: string;
  role: string;
  adminRole?: string;
  name?: string;
  iat?: number;
  exp?: number;
}

export function decodeJWT(token: string): JWTPayload {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const decoded = JSON.parse(atob(parts[1]));
    return {
      sub: decoded.sub,
      role: decoded.role,
      adminRole: decoded.adminRole,
      name: decoded.name,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch {
    throw new Error('Failed to decode JWT');
  }
}
