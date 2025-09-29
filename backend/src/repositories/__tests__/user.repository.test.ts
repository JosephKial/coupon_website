import { describe, it, expect, beforeEach } from 'vitest';
import { UserRepository } from '../user.repository.js';
import { testPrisma, createTestUser } from '../../test/setup.js';
import { UserRole } from '@prisma/client';

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(async () => {
    userRepository = new UserRepository(testPrisma);
  });

  describe('create', () => {
    it('should create a new user with all fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword123',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.ADMIN,
      };

      const user = await userRepository.create(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBe('hashedpassword123');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user with default role when not specified', async () => {
      const userData = {
        email: 'member@example.com',
        password: 'hashedpassword123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const user = await userRepository.create(userData);

      expect(user.role).toBe(UserRole.MEMBER);
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'hashedpassword123',
        firstName: 'First',
        lastName: 'User',
      };

      await userRepository.create(userData);

      await expect(userRepository.create(userData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const createdUser = await createTestUser({ email: 'findbyid@example.com' });

      const foundUser = await userRepository.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe('findbyid@example.com');
    });

    it('should return null for non-existent ID', async () => {
      const foundUser = await userRepository.findById('non-existent-id');

      expect(foundUser).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const createdUser = await createTestUser({ email: 'findbyemail@example.com' });

      const foundUser = await userRepository.findByEmail('findbyemail@example.com');

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe('findbyemail@example.com');
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await userRepository.findByEmail('nonexistent@example.com');

      expect(foundUser).toBeNull();
    });

    it('should be case sensitive', async () => {
      await createTestUser({ email: 'case@example.com' });

      const foundUser = await userRepository.findByEmail('CASE@example.com');

      expect(foundUser).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const createdUser = await createTestUser({ email: 'update@example.com' });

      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        role: UserRole.ADMIN,
      };

      const updatedUser = await userRepository.update(createdUser.id, updateData);

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');
      expect(updatedUser.role).toBe(UserRole.ADMIN);
      expect(updatedUser.email).toBe('update@example.com'); // Unchanged
    });

    it('should update only specified fields', async () => {
      const createdUser = await createTestUser({ 
        email: 'partial@example.com',
        firstName: 'Original',
        lastName: 'Name'
      });

      const updateData = {
        firstName: 'Updated',
      };

      const updatedUser = await userRepository.update(createdUser.id, updateData);

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name'); // Unchanged
    });

    it('should throw error for non-existent user', async () => {
      const updateData = { firstName: 'Updated' };

      await expect(userRepository.update('non-existent-id', updateData)).rejects.toThrow();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const createdUser = await createTestUser({ email: 'login@example.com' });
      expect(createdUser.lastLoginAt).toBeNull();

      const updatedUser = await userRepository.updateLastLogin(createdUser.id);

      expect(updatedUser.lastLoginAt).toBeInstanceOf(Date);
      expect(updatedUser.lastLoginAt!.getTime()).toBeCloseTo(Date.now(), -1000); // Within 1 second
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const createdUser = await createTestUser({ email: 'delete@example.com' });

      const deletedUser = await userRepository.delete(createdUser.id);

      expect(deletedUser.id).toBe(createdUser.id);

      // Verify user is deleted
      const foundUser = await userRepository.findById(createdUser.id);
      expect(foundUser).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      await expect(userRepository.delete('non-existent-id')).rejects.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true for existing email', async () => {
      await createTestUser({ email: 'exists@example.com' });

      const exists = await userRepository.exists('exists@example.com');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await userRepository.exists('notexists@example.com');

      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('should return correct user count', async () => {
      const initialCount = await userRepository.count();

      await createTestUser({ email: 'count1@example.com' });
      await createTestUser({ email: 'count2@example.com' });

      const finalCount = await userRepository.count();

      expect(finalCount).toBe(initialCount + 2);
    });

    it('should return 0 when no users exist', async () => {
      const count = await userRepository.count();

      expect(count).toBe(0);
    });
  });
});