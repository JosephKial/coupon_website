import { describe, it, expect } from 'vitest';
import { PasswordService } from '../PasswordService.js';

describe('PasswordService', () => {
  describe('hash', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await PasswordService.hash(password);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // Argon2 hashes are typically long
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await PasswordService.hash(password);
      const hash2 = await PasswordService.hash(password);
      
      expect(hash1).not.toBe(hash2); // Salt should make each hash unique
    });

    it('should throw error for empty password', async () => {
      await expect(PasswordService.hash('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for null password', async () => {
      await expect(PasswordService.hash(null as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for undefined password', async () => {
      await expect(PasswordService.hash(undefined as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for non-string password', async () => {
      await expect(PasswordService.hash(123 as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for password shorter than 8 characters', async () => {
      await expect(PasswordService.hash('short')).rejects.toThrow('Password must be at least 8 characters long');
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await PasswordService.hash(password);
      
      const isValid = await PasswordService.verify(hashedPassword, password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword123';
      const hashedPassword = await PasswordService.hash(password);
      
      const isValid = await PasswordService.verify(hashedPassword, wrongPassword);
      expect(isValid).toBe(false);
    });

    it('should reject empty plain password', async () => {
      const hashedPassword = await PasswordService.hash('TestPassword123');
      
      await expect(PasswordService.verify(hashedPassword, '')).rejects.toThrow('Plain password must be a non-empty string');
    });

    it('should reject null plain password', async () => {
      const hashedPassword = await PasswordService.hash('TestPassword123');
      
      await expect(PasswordService.verify(hashedPassword, null as any)).rejects.toThrow('Plain password must be a non-empty string');
    });

    it('should reject empty hashed password', async () => {
      await expect(PasswordService.verify('', 'TestPassword123')).rejects.toThrow('Hashed password must be a non-empty string');
    });

    it('should reject null hashed password', async () => {
      await expect(PasswordService.verify(null as any, 'TestPassword123')).rejects.toThrow('Hashed password must be a non-empty string');
    });

    it('should return false for invalid hash format', async () => {
      const result = await PasswordService.verify('invalid-hash-format', 'TestPassword123');
      expect(result).toBe(false);
    });

    it('should handle verification errors gracefully', async () => {
      // Test with a malformed hash that would cause argon2.verify to throw
      const result = await PasswordService.verify('$argon2id$malformed', 'TestPassword123');
      expect(result).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const strongPassword = 'TestPassword123';
      const isValid = PasswordService.validatePasswordStrength(strongPassword);
      expect(isValid).toBe(true);
    });

    it('should reject password without uppercase letter', () => {
      const password = 'testpassword123';
      const isValid = PasswordService.validatePasswordStrength(password);
      expect(isValid).toBe(false);
    });

    it('should reject password without lowercase letter', () => {
      const password = 'TESTPASSWORD123';
      const isValid = PasswordService.validatePasswordStrength(password);
      expect(isValid).toBe(false);
    });

    it('should reject password without number', () => {
      const password = 'TestPassword';
      const isValid = PasswordService.validatePasswordStrength(password);
      expect(isValid).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const password = 'Test1';
      const isValid = PasswordService.validatePasswordStrength(password);
      expect(isValid).toBe(false);
    });

    it('should reject empty password', () => {
      const isValid = PasswordService.validatePasswordStrength('');
      expect(isValid).toBe(false);
    });

    it('should reject null password', () => {
      const isValid = PasswordService.validatePasswordStrength(null as any);
      expect(isValid).toBe(false);
    });

    it('should reject undefined password', () => {
      const isValid = PasswordService.validatePasswordStrength(undefined as any);
      expect(isValid).toBe(false);
    });

    it('should reject non-string password', () => {
      const isValid = PasswordService.validatePasswordStrength(123 as any);
      expect(isValid).toBe(false);
    });

    it('should accept password with special characters', () => {
      const password = 'TestPassword123!@#';
      const isValid = PasswordService.validatePasswordStrength(password);
      expect(isValid).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should hash and verify multiple passwords correctly', async () => {
      const passwords = [
        'TestPassword123',
        'AnotherPassword456',
        'ComplexPassword789!',
        'SimplePass1'
      ];

      for (const password of passwords) {
        const hashedPassword = await PasswordService.hash(password);
        const isValid = await PasswordService.verify(hashedPassword, password);
        expect(isValid).toBe(true);
        
        // Verify wrong password fails
        const isInvalid = await PasswordService.verify(hashedPassword, 'WrongPassword123');
        expect(isInvalid).toBe(false);
      }
    });

    it('should maintain security with timing-safe verification', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await PasswordService.hash(password);
      
      // Multiple verification attempts should be consistent
      const results = await Promise.all([
        PasswordService.verify(hashedPassword, password),
        PasswordService.verify(hashedPassword, 'WrongPassword123'),
        PasswordService.verify(hashedPassword, password),
        PasswordService.verify(hashedPassword, 'AnotherWrongPassword456')
      ]);
      
      expect(results[0]).toBe(true);
      expect(results[1]).toBe(false);
      expect(results[2]).toBe(true);
      expect(results[3]).toBe(false);
    });
  });
});