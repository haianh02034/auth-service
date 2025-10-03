export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};
