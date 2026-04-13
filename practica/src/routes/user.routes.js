import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { checkRole } from '../middleware/role.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import {
  register,
  validateEmail,
  login,
  onboarding,
  companyOnboarding,
  uploadLogo,
  getUser,
  refreshToken,
  logout,
  deleteUser,
  inviteUser,
  changePassword,
} from '../controllers/user.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass1
 *     responses:
 *       201:
 *         description: User registered. Returns access token, refresh token, and user data.
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post('/register', register);

/**
 * @swagger
 * /api/user/validation:
 *   put:
 *     summary: Verify email with 6-digit code
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid code or already verified
 *       429:
 *         description: Too many attempts
 */
router.put('/validation', authMiddleware, validateEmail);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass1
 *     responses:
 *       200:
 *         description: Login successful. Returns access token and refresh token.
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

/**
 * @swagger
 * /api/user/onboarding:
 *   put:
 *     summary: Update personal data (name, lastName, NIF)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, lastName, NIF]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               NIF:
 *                 type: string
 *                 example: 12345678A
 *     responses:
 *       200:
 *         description: Personal data updated
 *       400:
 *         description: Validation error
 */
router.put('/onboarding', authMiddleware, onboarding);

/**
 * @swagger
 * /api/user/company:
 *   put:
 *     summary: Company onboarding - create or join by CIF
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [isFreelance, name]
 *                 properties:
 *                   isFreelance:
 *                     type: boolean
 *                     example: true
 *                   name:
 *                     type: string
 *                     example: My Freelance Business
 *               - type: object
 *                 required: [isFreelance, name, CIF]
 *                 properties:
 *                   isFreelance:
 *                     type: boolean
 *                     example: false
 *                   name:
 *                     type: string
 *                     example: Acme Corp
 *                   CIF:
 *                     type: string
 *                     example: B12345678
 *     responses:
 *       200:
 *         description: Company assigned
 *       400:
 *         description: Validation error
 */
router.put('/company', authMiddleware, companyOnboarding);

/**
 * @swagger
 * /api/user/logo:
 *   patch:
 *     summary: Upload company logo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
 *       400:
 *         description: No file or no company
 */
router.patch('/logo', authMiddleware, upload.single('logo'), uploadLogo);

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Get authenticated user profile (with populated company)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile including fullName virtual and company
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, getUser);

/**
 * @swagger
 * /api/user/refresh:
 *   post:
 *     summary: Get new access token using refresh token
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access and refresh tokens
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', refreshToken);

/**
 * @swagger
 * /api/user/logout:
 *   delete:
 *     summary: Logout - invalidate refresh token
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.delete('/logout', authMiddleware, logout);

/**
 * @swagger
 * /api/user:
 *   delete:
 *     summary: Delete user account (hard or soft)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: soft
 *         schema:
 *           type: boolean
 *         description: If true, soft-delete (set deleted=true); otherwise hard-delete
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete('/', authMiddleware, deleteUser);

/**
 * @swagger
 * /api/user/invite:
 *   post:
 *     summary: Invite a colleague as guest user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: colleague@company.com
 *               name:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User invited
 *       403:
 *         description: Admin role required
 *       409:
 *         description: Email already registered
 */
router.post('/invite', authMiddleware, checkRole('admin'), inviteUser);

/**
 * @swagger
 * /api/user/password:
 *   put:
 *     summary: Change password (bonus)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: New password must differ from current
 *       401:
 *         description: Current password incorrect
 */
router.put('/password', authMiddleware, changePassword);

export default router;
