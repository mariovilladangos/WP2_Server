import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.mailtrap.io',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendVerificationEmail = async (email, code) => {
  if (process.env.NODE_ENV === 'test') return;
  await transporter.sendMail({
    from:    `BildyApp <${process.env.SMTP_FROM || 'no-reply@bildyapp.com'}>`,
    to:      email,
    subject: 'Verifica tu cuenta en BildyApp',
    html: `
      <h2>¡Bienvenido a BildyApp!</h2>
      <p>Tu código de verificación es:</p>
      <h1 style="letter-spacing:8px;">${code}</h1>
      <p>El código expira en 24 horas.</p>
    `,
  });
};

export const sendInvitationEmail = async (email, tempPassword, companyName) => {
  if (process.env.NODE_ENV === 'test') return;
  await transporter.sendMail({
    from:    `BildyApp <${process.env.SMTP_FROM || 'no-reply@bildyapp.com'}>`,
    to:      email,
    subject: `Invitación a ${companyName} en BildyApp`,
    html: `
      <h2>Has sido invitado a ${companyName}</h2>
      <p>Tu contraseña temporal es: <strong>${tempPassword}</strong></p>
      <p>Cámbiala al iniciar sesión.</p>
    `,
  });
};