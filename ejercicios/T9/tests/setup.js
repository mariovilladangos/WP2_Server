import 'dotenv/config';
import prisma from '../src/config/prisma.js';

// Clean test data before/after tests
export async function cleanTestData() {
  // Delete in order to respect FK constraints
  await prisma.review.deleteMany({ where: { user: { email: { contains: '@test-jest.com' } } } });
  await prisma.loan.deleteMany({ where: { user: { email: { contains: '@test-jest.com' } } } });
  await prisma.user.deleteMany({ where: { email: { contains: '@test-jest.com' } } });
  await prisma.book.deleteMany({ where: { isbn: { startsWith: 'TEST-' } } });
}

export { prisma };
