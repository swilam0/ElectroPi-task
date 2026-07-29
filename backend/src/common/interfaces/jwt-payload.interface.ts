export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  jti: string;
  exp: number;
}
