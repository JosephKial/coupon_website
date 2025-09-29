import argon2 from 'argon2';

/**
 * PasswordService handles secure password hashing and verification using Argon2id
 * Implements security requirements for password protection
 */
export class PasswordService {
  private static readonly ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,         // 3 iterations
    parallelism: 1,      // 1 thread
  };

  /**
   * Hash a plain text password using Argon2id
   * @param password - Plain text password to hash
   * @returns Promise<string> - Hashed password
   * @throws Error if hashing fails
   */
  static async hash(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    try {
      return await argon2.hash(password, this.ARGON2_OPTIONS);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a plain text password against a hashed password
   * @param hashedPassword - Previously hashed password
   * @param plainPassword - Plain text password to verify
   * @returns Promise<boolean> - True if password matches, false otherwise
   * @throws Error if verification fails
   */
  static async verify(hashedPassword: string, plainPassword: string): Promise<boolean> {
    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Hashed password must be a non-empty string');
    }

    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Plain password must be a non-empty string');
    }

    try {
      return await argon2.verify(hashedPassword, plainPassword);
    } catch (error) {
      // Return false for verification errors instead of throwing
      // This prevents timing attacks and provides consistent behavior
      return false;
    }
  }

  /**
   * Check if a password meets minimum security requirements
   * @param password - Password to validate
   * @returns boolean - True if password meets requirements
   */
  static validatePasswordStrength(password: string): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Minimum 8 characters
    if (password.length < 8) {
      return false;
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // At least one number
    if (!/\d/.test(password)) {
      return false;
    }

    return true;
  }
}