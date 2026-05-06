import { jest } from '@jest/globals';

const sendMailMock = jest.fn();

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: sendMailMock }),
  },
}));

const { sendVerificationEmail, sendInvitationEmail } = await import('../src/services/mail.service.js');

describe('mail.service', () => {
  beforeEach(() => sendMailMock.mockReset().mockResolvedValue({ messageId: 'id' }));

  afterEach(() => { process.env.NODE_ENV = 'test'; });

  it('sendVerificationEmail skips in test env', async () => {
    process.env.NODE_ENV = 'test';
    await sendVerificationEmail('a@b.com', '123456');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('sendVerificationEmail sends in non-test env', async () => {
    process.env.NODE_ENV = 'production';
    await sendVerificationEmail('a@b.com', '654321');
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const args = sendMailMock.mock.calls[0][0];
    expect(args.to).toBe('a@b.com');
    expect(args.html).toContain('654321');
  });

  it('sendInvitationEmail skips in test env', async () => {
    process.env.NODE_ENV = 'test';
    await sendInvitationEmail('a@b.com', 'pwd', 'Acme');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('sendInvitationEmail sends in non-test env', async () => {
    process.env.NODE_ENV = 'production';
    await sendInvitationEmail('a@b.com', 'pwd', 'Acme');
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const args = sendMailMock.mock.calls[0][0];
    expect(args.subject).toContain('Acme');
    expect(args.html).toContain('pwd');
  });
});
