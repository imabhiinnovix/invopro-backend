import jwt, { JwtPayload } from 'jsonwebtoken';

import config from '../config';

export const generateToken = (payload = {}): string => {
  const token = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN || '1h',
  });
  return token;
};

export const verifyToken = async (token: string): Promise<JwtPayload | undefined> => {
  try {
    const user = (await jwt.verify(token, config.JWT_SECRET)) as JwtPayload;
    return user; // Token is valid
  } catch (error) {
    return undefined; // Token is invalid or expired
  }
};
