import bcrypt from 'bcryptjs';

export const encrypt = async (password) => {
  return bcrypt.hash(password, 10);
};

export const compare = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};
