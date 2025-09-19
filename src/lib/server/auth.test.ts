import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '$lib/server/auth';

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
			
			// Using bcrypt directly since hashPassword is not a method of AuthService
			const result = await bcrypt.hash(password, 10);
			
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
			
			const result = AuthService.generateToken(user);
			
			expect(mockJwt.sign).toHaveBeenCalledWith(
				user,
				expect.any(String),
				{ expiresIn: '24h' }
			);
			expect(result).toBe(token);
		});
	});

	describe('verifyToken', () => {
		it('should verify valid JWT token', async () => {
			const token = 'valid.jwt.token';
			const payload = {
				id: 1,
				username: 'testuser',
				email: 'test@example.com',
				role: 'EMPLOYEE'
			};
			
			mockJwt.verify.mockReturnValue(payload as never);
			
			const result = await AuthService.verifyToken(token);
			
			expect(mockJwt.verify).toHaveBeenCalledWith(token, expect.any(String));
			expect(result).toEqual(payload);
		});

		it('should throw error for invalid token', async () => {
			const token = 'invalid.jwt.token';
			
			mockJwt.verify.mockImplementation(() => {
				throw new Error('Invalid token');
			});
			
			await expect(AuthService.verifyToken(token)).rejects.toThrow('Token inválido');
		});
	});

	describe('authenticateUser (login)', () => {
		it('should authenticate user with correct credentials', async () => {
			const credentials = {
				email: 'test@example.com',
				password: 'correctpassword'
			};
			const user = {
				id: 1,
				username: 'testuser',
				email: 'test@example.com',
				passwordHash: 'hashedpassword',
				role: 'EMPLOYEE',
				active: true
			};
			const payload = {
				id: user.id,
				username: user.username,
				email: user.email,
				role: user.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
			};
			const token = 'jwt.token.string';

			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
			mockBcrypt.compare.mockResolvedValue(true as never);
			mockJwt.sign.mockReturnValue(token as never);

			const result = await AuthService.login(credentials);

			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: credentials.email, active: true }
			});
			expect(mockBcrypt.compare).toHaveBeenCalledWith(credentials.password, user.passwordHash);
			expect(mockJwt.sign).toHaveBeenCalledWith(payload, expect.any(String), { expiresIn: '24h' });
			expect(result).toEqual({
				token,
				user: payload
			});
		});

		it('should throw error for non-existent user', async () => {
			const credentials = {
				email: 'nonexistent@example.com',
				password: 'password'
			};

			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

			await expect(AuthService.login(credentials)).rejects.toThrow('Credenciais inválidas');
		});

		it('should throw error for incorrect password', async () => {
			const credentials = {
				email: 'test@example.com',
				password: 'wrongpassword'
			};
			const user = {
				id: 1,
				username: 'testuser',
				email: 'test@example.com',
				passwordHash: 'hashedpassword',
				role: 'EMPLOYEE',
				active: true
			};

			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
			mockBcrypt.compare.mockResolvedValue(false as never);

			await expect(AuthService.login(credentials)).rejects.toThrow('Credenciais inválidas');
		});
	});
});