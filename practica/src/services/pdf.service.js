import PDFDocument from 'pdfkit';

/**
 * Genera un PDF para un albarán y devuelve un Buffer.
 * @param {Object} note - DeliveryNote populado con user, client, project
 * @returns {Promise<Buffer>}
 */
export const generateDeliveryNotePdf = (note) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header 
    doc.fontSize(22).font('Helvetica-Bold').text('ALBARÁN', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Ref: ${note._id}`, { align: 'right' });
    doc.text(`Fecha: ${new Date(note.workDate).toLocaleDateString('es-ES')}`, { align: 'right' });
    doc.moveDown();

    // Proveedor (user / company) 
    doc.fontSize(12).font('Helvetica-Bold').text('PROVEEDOR');
    doc.font('Helvetica').fontSize(10);
    if (note.user?.name) doc.text(`${note.user.name} ${note.user.lastName || ''}`);
    if (note.user?.email) doc.text(note.user.email);
    doc.moveDown();

    // Cliente 
    doc.fontSize(12).font('Helvetica-Bold').text('CLIENTE');
    doc.font('Helvetica').fontSize(10);
    doc.text(note.client?.name || '');
    if (note.client?.cif) doc.text(`CIF: ${note.client.cif}`);
    if (note.client?.email) doc.text(note.client.email);
    doc.moveDown();

    // Proyecto
    doc.fontSize(12).font('Helvetica-Bold').text('PROYECTO');
    doc.font('Helvetica').fontSize(10);
    doc.text(note.project?.name || '');
    if (note.project?.projectCode) doc.text(`Código: ${note.project.projectCode}`);
    doc.moveDown();

    // Detalle del albarán
    doc.fontSize(12).font('Helvetica-Bold').text('DETALLE');
    doc.font('Helvetica').fontSize(10);
    doc.text(`Tipo: ${note.format === 'hours' ? 'Horas trabajadas' : 'Materiales'}`);
    if (note.description) doc.text(`Descripción: ${note.description}`);
    doc.moveDown(0.3);

    if (note.format === 'material') {
      doc.text(`Material: ${note.material}`);
      doc.text(`Cantidad: ${note.quantity} ${note.unit}`);
    } else {
      if (note.workers && note.workers.length > 0) {
        doc.font('Helvetica-Bold').text('Trabajadores:');
        doc.font('Helvetica');
        note.workers.forEach((w) => doc.text(`  • ${w.name}: ${w.hours}h`));
      } else {
        doc.text(`Horas: ${note.hours}h`);
      }
    }

    doc.moveDown();

    // Firma
    if (note.signed) {
      doc.fontSize(12).font('Helvetica-Bold').text('FIRMA');
      doc.font('Helvetica').fontSize(10);
      doc.text(`Firmado el: ${new Date(note.signedAt).toLocaleString('es-ES')}`);
      if (note.signatureUrl) {
        try {
          // pdfkit acepta URL directamente si es accesible
          doc.image(note.signatureUrl, { width: 150 });
        } catch (_) {
          doc.text('[Firma adjunta]');
        }
      }
    }

    doc.end();
  });
};