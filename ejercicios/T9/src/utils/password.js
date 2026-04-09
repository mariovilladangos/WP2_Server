import bcrypt from 'bcryptjs';

export const encrypt = async (password) => {
  return bcrypt.hash(password, 10);
};

export const compare = async (password, hash) => {
  return bcrypt.compare(password, hash);
};
