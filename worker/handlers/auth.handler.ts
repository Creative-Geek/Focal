import { Context } from 'hono';
import { Env } from '../types';
import { DBService } from '../services/db.service';
import { AuthService } from '../services/auth.service';
import { validateRequest, signupSchema, loginSchema } from '../utils/validation';
import { success, error, json } from '../utils/response';

type Variables = {
    userId: string;
    userEmail: string;
    token: string;
};

/**
 * POST /api/auth/signup
 * Create a new user account
 */
export async function signup(c: Context<{ Bindings: Env }>) {
    const env = c.env;
    const dbService = new DBService(env.DB);
    const authService = new AuthService(env.JWT_SECRET);

    // Validate request body
    const validation = await validateRequest(c.req.raw, signupSchema);
    if (!validation.success) {
        return error(validation.error, 400);
    }

    const { email, password } = validation.data;

    // Check if user already exists
    const existingUser = await dbService.getUserByEmail(email);
    if (existingUser) {
        return error('Email already registered', 409);
    }

    // Hash password
    const passwordHash = await authService.hashPassword(password);

    // Create user
    const userId = crypto.randomUUID();
    const user = await dbService.createUser(userId, email, passwordHash);

    // Generate JWT token
    const token = authService.generateToken({
        userId: user.id,
        email: user.email,
    });

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = authService.getTokenExpiration();
    await dbService.createSession(sessionId, user.id, token, expiresAt);

    // Set httpOnly cookie (use Secure only in production)
    const isDev = env.NODE_ENV === 'development';
    const cookieFlags = isDev
        ? `HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`
        : `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
    const cookieValue = `auth_token=${token}; ${cookieFlags}`;

    if (isDev) {
        console.log('[Signup] Setting cookie:', cookieValue.substring(0, 60) + '...');
    }

    c.header('Set-Cookie', cookieValue);

    return json(
        success({
            user: {
                id: user.id,
                email: user.email,
            },
            token,
        }),
        201
    );
}

/**
 * POST /api/auth/login
 * Login with email and password
 */
export async function login(c: Context<{ Bindings: Env }>) {
    const env = c.env;
    const dbService = new DBService(env.DB);
    const authService = new AuthService(env.JWT_SECRET);

    // Validate request body
    const validation = await validateRequest(c.req.raw, loginSchema);
    if (!validation.success) {
        return error(validation.error, 400);
    }

    const { email, password } = validation.data;

    // Get user by email
    const user = await dbService.getUserByEmail(email);
    if (!user) {
        return error('Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
        return error('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = authService.generateToken({
        userId: user.id,
        email: user.email,
    });

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = authService.getTokenExpiration();
    await dbService.createSession(sessionId, user.id, token, expiresAt);

    // Set httpOnly cookie (use Secure only in production)
    const isDev = env.NODE_ENV === 'development';
    const cookieFlags = isDev
        ? `HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`
        : `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
    const cookieValue = `auth_token=${token}; ${cookieFlags}`;

    if (isDev) {
        console.log('[Login] Setting cookie:', cookieValue.substring(0, 60) + '...');
    }

    c.header('Set-Cookie', cookieValue);

    return json(
        success({
            user: {
                id: user.id,
                email: user.email,
            },
            token,
        })
    );
}

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */
export async function logout(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const token = c.get('token');
    const dbService = new DBService(env.DB);

    // Delete session
    await dbService.deleteSession(token);

    // Clear cookie (match the same flags used when setting)
    const isDev = env.NODE_ENV === 'development';
    const cookieFlags = isDev
        ? `HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
        : `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
    c.header('Set-Cookie', `auth_token=; ${cookieFlags}`);

    return json(success({ message: 'Logged out successfully' }));
}

/**
 * GET /api/auth/me
 * Get current user profile
 */
export async function me(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const dbService = new DBService(env.DB);

    const user = await dbService.getUserById(userId);
    if (!user) {
        return error('User not found', 404);
    }

    return json(
        success({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
        })
    );
}
