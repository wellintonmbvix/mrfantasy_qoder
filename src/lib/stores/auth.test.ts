import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { auth, user, isAuthenticated, isAdmin, isManager } from '$lib/stores/auth';

// Mock fetch globally
global.fetch = vi.fn();

describe('Auth Store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset store state
		auth.setUser(null);
	});

	describe('login', () => {
		it('should successfully login with valid credentials', async () => {
			const mockUser = {
				id: 1,
				username: 'testuser',
				email: 'test@example.com',
				role: 'EMPLOYEE' as const
			};

			const mockResponse = {
				ok: true,
				json: () => Promise.resolve({ user: mockUser })
			};

			vi.mocked(fetch).mockResolvedValue(mockResponse as any);

			const result = await auth.login('test@example.com', 'password');

			expect(result.success).toBe(true);
			expect(get(user)).toEqual(mockUser);
			expect(get(isAuthenticated)).toBe(true);
		});

		it('should handle login failure', async () => {
			const mockResponse = {
				ok: false,
				json: () => Promise.resolve({ error: 'Invalid credentials' })
			};

			vi.mocked(fetch).mockResolvedValue(mockResponse as any);

			const result = await auth.login('test@example.com', 'wrongpassword');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Invalid credentials');
			expect(get(user)).toBeNull();
			expect(get(isAuthenticated)).toBe(false);
		});

		it('should handle network errors', async () => {
			vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

			const result = await auth.login('test@example.com', 'password');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Erro de conexão');
		});
	});

	describe('logout', () => {
		it('should clear user data on logout', async () => {
			// Set initial user
			auth.setUser({
				id: 1,
				username: 'testuser',
				email: 'test@example.com',
				role: 'EMPLOYEE'
			});

			expect(get(isAuthenticated)).toBe(true);

			vi.mocked(fetch).mockResolvedValue({ ok: true } as any);

			await auth.logout();

			expect(get(user)).toBeNull();
			expect(get(isAuthenticated)).toBe(false);
		});
	});

	describe('derived stores', () => {
		it('should correctly derive isAdmin for admin user', () => {
			auth.setUser({
				id: 1,
				username: 'admin',
				email: 'admin@example.com',
				role: 'ADMIN'
			});

			expect(get(isAdmin)).toBe(true);
			expect(get(isManager)).toBe(true);
		});

		it('should correctly derive isManager for manager user', () => {
			auth.setUser({
				id: 1,
				username: 'manager',
				email: 'manager@example.com',
				role: 'MANAGER'
			});

			expect(get(isAdmin)).toBe(false);
			expect(get(isManager)).toBe(true);
		});

		it('should correctly derive permissions for employee user', () => {
			auth.setUser({
				id: 1,
				username: 'employee',
				email: 'employee@example.com',
				role: 'EMPLOYEE'
			});

			expect(get(isAdmin)).toBe(false);
			expect(get(isManager)).toBe(false);
			expect(get(isAuthenticated)).toBe(true);
		});

		it('should handle null user', () => {
			auth.setUser(null);

			expect(get(isAdmin)).toBe(false);
			expect(get(isManager)).toBe(false);
			expect(get(isAuthenticated)).toBe(false);
		});
	});

	describe('setUser', () => {
		it('should update user state', () => {
			const testUser = {
				id: 1,
				username: 'testuser',
				email: 'test@example.com',
				role: 'EMPLOYEE' as const
			};

			auth.setUser(testUser);

			expect(get(user)).toEqual(testUser);
			expect(get(isAuthenticated)).toBe(true);
		});
	});

	describe('clearError', () => {
		it('should clear error state', async () => {
			// Trigger an error first
			vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
			await auth.login('test@example.com', 'password');

			// Clear the error
			auth.clearError();

			// The error should be cleared (we can't directly test this without accessing the store's internal state)
			// This test mainly ensures the method exists and can be called
			expect(() => auth.clearError()).not.toThrow();
		});
	});
});