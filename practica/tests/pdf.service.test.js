import { generateDeliveryNotePdf } from '../src/services/pdf.service.js';

describe('pdf.service.generateDeliveryNotePdf', () => {
  const baseNote = {
    _id: 'abc123',
    workDate: new Date('2025-05-06'),
    user: { name: 'John', lastName: 'Doe', email: 'john@test.com' },
    client: { name: 'Acme', cif: 'A11111111', email: 'cli@acme.com' },
    project: { name: 'Reforma', projectCode: 'P-001' },
  };

  it('should produce a Buffer that starts with %PDF for hours format', async () => {
    const buf = await generateDeliveryNotePdf({
      ...baseNote,
      format: 'hours',
      hours: 8,
      description: 'Trabajo de campo',
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.toString('utf8', 0, 4)).toBe('%PDF');
  });

  it('should produce a Buffer for material format', async () => {
    const buf = await generateDeliveryNotePdf({
      ...baseNote,
      format: 'material',
      material: 'Cemento',
      quantity: 10,
      unit: 'sacos',
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString('utf8', 0, 4)).toBe('%PDF');
  });

  it('should include workers list when provided', async () => {
    const buf = await generateDeliveryNotePdf({
      ...baseNote,
      format: 'hours',
      workers: [
        { name: 'Alice', hours: 4 },
        { name: 'Bob', hours: 6 },
      ],
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('should render signed note section without signatureUrl', async () => {
    const buf = await generateDeliveryNotePdf({
      ...baseNote,
      format: 'hours',
      hours: 5,
      signed: true,
      signedAt: new Date('2025-05-06T12:00:00Z'),
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString('utf8', 0, 4)).toBe('%PDF');
  });
});
