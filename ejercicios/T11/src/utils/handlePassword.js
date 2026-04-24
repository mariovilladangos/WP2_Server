import bcryptjs from 'bcryptjs';

export const encrypt = async (password) => {
  return await bcryptjs.hash(password, 10);
};

export const compare = async (plainPassword, hashedPassword) => {
  return await bcryptjs.compare(plainPassword, hashedPassword);
};
