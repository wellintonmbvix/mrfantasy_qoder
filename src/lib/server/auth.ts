import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface UserPayload {
	id: number;
	username: string;
	email: string;
	role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
}

export class AuthService {
	static async login(credentials: LoginCredentials) {
		const { email, password } = credentials;

		console.log('Attempting to find user with email:', email); // Debug log

		// Find user by email
		const user = await prisma.user.findUnique({
			where: { email, active: true }
		});

		if (!user) {
			console.log('User not found or inactive for email:', email); // Debug log
			throw new Error('Credenciais inválidas');
		}

		console.log('User found, verifying password...'); // Debug log
		console.log('Stored password hash length:', user.passwordHash?.length || 0); // Debug log
		console.log('Input password length:', password?.length || 0); // Debug log

		// Verify password
		const isValidPassword = await bcrypt.compare(password, user.passwordHash);
		console.log('Password verification result:', isValidPassword); // Debug log
		
		if (!isValidPassword) {
			console.log('Password verification failed for user:', email); // Debug log
			throw new Error('Credenciais inválidas');
		}

		// Generate JWT token
		const payload: UserPayload = {
			id: user.id,
			username: user.username,
			email: user.email,
			role: user.role
		};

		const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
		console.log('JWT token generated successfully'); // Debug log

		return {
			token,
			user: payload
		};
	}

	static async verifyToken(token: string): Promise<UserPayload> {
		try {
			const payload = jwt.verify(token, JWT_SECRET) as UserPayload;
			return payload;
		} catch (error) {
			throw new Error('Token inválido');
		}
	}

	static async createUser(userData: {
		username: string;
		email: string;
		password: string;
		role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
	}) {
		const { username, email, password, role = 'EMPLOYEE' } = userData;

		// Check if user already exists
		const existingUser = await prisma.user.findFirst({
			where: {
				OR: [{ email }, { username }]
			}
		});

		if (existingUser) {
			throw new Error('Usuário ou email já existe');
		}

		// Hash password
		const passwordHash = await bcrypt.hash(password, 12);

		// Create user
		const user = await prisma.user.create({
			data: {
				username,
				email,
				passwordHash,
				role
			}
		});

		return {
			id: user.id,
			username: user.username,
			email: user.email,
			role: user.role
		};
	}

	static async changePassword(userId: number, oldPassword: string, newPassword: string) {
		const user = await prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user) {
			throw new Error('Usuário não encontrado');
		}

		// Verify old password
		const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
		if (!isValidPassword) {
			throw new Error('Senha atual incorreta');
		}

		// Hash new password
		const passwordHash = await bcrypt.hash(newPassword, 12);

		// Update password
		await prisma.user.update({
			where: { id: userId },
			data: { passwordHash }
		});

		return true;
	}

	static generateToken(payload: UserPayload): string {
		return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
	}
}