import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateUser, generateToken, verifyToken, hashPassword } from '$lib/server/auth';

// Mock dependencies
vi.mock('bcryptjs');
vi.mock('jsonwebtoken');
vi.mock('$lib/server/database', () => ({
	prisma: {
		user: {
			findUnique: vi.fn()
		}
	}
}));

const mockBcrypt = vi.mocked(bcrypt);
const mockJwt = vi.mocked(jwt);

describe('Authentication Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('hashPassword', () => {
		it('should hash password with bcrypt', async () => {
			const password = 'testpassword';
			const hashedPassword = 'hashedpassword123';
			
			mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
			
			const result = await hashPassword(password);
			
			expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
			expect(result).toBe(hashedPassword);
		});
	});

	describe('generateToken', () => {
		it('should generate JWT token with user data', () => {
			const user = {
				id: 1,
				username: 'testuser',
				email: 'test@example.com',
				role: 'EMPLOYEE' as const
			};
			const token = 'generated.jwt.token';
			
			mockJwt.sign.mockReturnValue(token as never);
			
			const result = generateToken(user);
			
			expect(mockJwt.sign).toHaveBeenCalledWith(
				user,
				expect.any(String),
				{ expiresIn: '7d' }
			);
			expect(result).toBe(token);
		});
	});

	describe('verifyToken', () => {
		it('should verify valid JWT token', () => {
			const token = 'valid.jwt.token';
			const payload = {
				id: 1,
				username: 'testuser',
				email: 'test@example.com',
				role: 'EMPLOYEE'
			};
			
			mockJwt.verify.mockReturnValue(payload as never);
			
			const result = verifyToken(token);
			
			expect(mockJwt.verify).toHaveBeenCalledWith(token, expect.any(String));
			expect(result).toEqual(payload);
		});

		it('should return null for invalid token', () => {
			const token = 'invalid.jwt.token';
			
			mockJwt.verify.mockImplementation(() => {
				throw new Error('Invalid token');
			});
			
			const result = verifyToken(token);
			
			expect(result).toBeNull();
		});
	});

	describe('authenticateUser', () => {
		it('should authenticate user with correct credentials', async () => {
			const email = 'test@example.com';
			const password = 'correctpassword';
			const user = {
				id: 1,
				username: 'testuser',
				email,
				password: 'hashedpassword',
				role: 'EMPLOYEE',
				active: true
			};

			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
			mockBcrypt.compare.mockResolvedValue(true as never);

			const result = await authenticateUser(email, password);

			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email }
			});
			expect(mockBcrypt.compare).toHaveBeenCalledWith(password, user.password);
			expect(result).toEqual({
				id: user.id,
				username: user.username,
				email: user.email,
				role: user.role
			});
		});

		it('should return null for non-existent user', async () => {
			const email = 'nonexistent@example.com';
			const password = 'password';

			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

			const result = await authenticateUser(email, password);

			expect(result).toBeNull();
		});

		it('should return null for incorrect password', async () => {
			const email = 'test@example.com';
			const password = 'wrongpassword';
			const user = {
				id: 1,
				username: 'testuser',
				email,
				password: 'hashedpassword',
				role: 'EMPLOYEE',
				active: true
			};

			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
			mockBcrypt.compare.mockResolvedValue(false as never);

			const result = await authenticateUser(email, password);

			expect(result).toBeNull();
		});

		it('should return null for inactive user', async () => {
			const email = 'test@example.com';
			const password = 'correctpassword';
			const user = {
				id: 1,
				username: 'testuser',
				email,
				password: 'hashedpassword',
				role: 'EMPLOYEE',
				active: false
			};

			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);

			const result = await authenticateUser(email, password);

			expect(result).toBeNull();
		});
	});
});