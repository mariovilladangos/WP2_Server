import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando datos de prueba...');

  // Users
  const adminPass = await bcrypt.hash('admin1234', 10);
  const librarianPass = await bcrypt.hash('librarian1234', 10);
  const userPass = await bcrypt.hash('user1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@biblioteca.com' },
    update: {},
    create: { email: 'admin@biblioteca.com', name: 'Admin', password: adminPass, role: 'ADMIN' },
  });

  const librarian = await prisma.user.upsert({
    where: { email: 'librarian@biblioteca.com' },
    update: {},
    create: {
      email: 'librarian@biblioteca.com',
      name: 'Bibliotecario',
      password: librarianPass,
      role: 'LIBRARIAN',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@biblioteca.com' },
    update: {},
    create: { email: 'user@biblioteca.com', name: 'Usuario', password: userPass, role: 'USER' },
  });

  // Books
  const books = [
    {
      isbn: '978-0-06-112008-4',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      genre: 'Fiction',
      description: 'A novel about racial injustice and moral growth in the American South.',
      publishedYear: 1960,
      copies: 3,
      available: 3,
    },
    {
      isbn: '978-0-7432-7356-5',
      title: '1984',
      author: 'George Orwell',
      genre: 'Dystopian Fiction',
      description: 'A chilling dystopia about totalitarianism and surveillance.',
      publishedYear: 1949,
      copies: 5,
      available: 5,
    },
    {
      isbn: '978-0-14-028329-7',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      genre: 'Fiction',
      description: 'A story of wealth, love, and the American Dream in the 1920s.',
      publishedYear: 1925,
      copies: 2,
      available: 2,
    },
    {
      isbn: '978-84-204-5989-2',
      title: 'Cien años de soledad',
      author: 'Gabriel García Márquez',
      genre: 'Magical Realism',
      description: 'La historia de la familia Buendía a lo largo de siete generaciones.',
      publishedYear: 1967,
      copies: 4,
      available: 4,
    },
    {
      isbn: '978-0-316-76948-0',
      title: 'The Catcher in the Rye',
      author: 'J.D. Salinger',
      genre: 'Fiction',
      description: 'The story of Holden Caulfield\'s disillusionment with the adult world.',
      publishedYear: 1951,
      copies: 2,
      available: 2,
    },
  ];

  for (const book of books) {
    await prisma.book.upsert({
      where: { isbn: book.isbn },
      update: {},
      create: book,
    });
  }

  console.log('✅ Datos sembrados correctamente');
  console.log('\n📝 Usuarios de prueba:');
  console.log('  Admin:      admin@biblioteca.com / admin1234');
  console.log('  Librarian:  librarian@biblioteca.com / librarian1234');
  console.log('  User:       user@biblioteca.com / user1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
