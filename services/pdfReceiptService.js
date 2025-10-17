// PDF Receipt Generator Service
const PDFDocument = require('pdfkit');

class PDFReceiptService {
  /**
   * Generate a PDF receipt for a payment
   * @param {Object} payment - Payment details
   * @param {Object} user - User details
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateReceipt(payment, user) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const chunks = [];
        
        // Collect PDF data
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.addHeader(doc);
        
        // Receipt Title
        doc.moveDown(2);
        doc.fontSize(24)
           .fillColor('#22c55e')
           .text('PAYMENT RECEIPT', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(10)
           .fillColor('#666666')
           .text(`Receipt #${payment.razorpay_payment_id}`, { align: 'center' });

        // Date and Status
        doc.moveDown(2);
        const date = new Date(payment.verified_at || payment.created_at);
        const formattedDate = date.toLocaleString('en-IN', {
          dateStyle: 'long',
          timeStyle: 'short'
        });

        doc.fontSize(10)
           .fillColor('#333333')
           .text(`Date: ${formattedDate}`, 50, doc.y);
        
        doc.moveDown(0.5);
        doc.fontSize(10)
           .fillColor('#22c55e')
           .text('Status: PAID', 50, doc.y);

        // Divider
        doc.moveDown(1);
        doc.moveTo(50, doc.y)
           .lineTo(545, doc.y)
           .strokeColor('#e5e5e5')
           .stroke();

        // Customer Details
        doc.moveDown(1.5);
        doc.fontSize(12)
           .fillColor('#333333')
           .text('BILLED TO:', 50, doc.y);
        
        doc.moveDown(0.5);
        doc.fontSize(10)
           .fillColor('#666666')
           .text(user.full_name || user.email || 'Customer', 50, doc.y);
        
        if (user.email) {
          doc.moveDown(0.3);
          doc.text(user.email, 50, doc.y);
        }

        // Payment Details Section
        doc.moveDown(2);
        doc.fontSize(12)
           .fillColor('#333333')
           .text('PAYMENT DETAILS:', 50, doc.y);

        doc.moveDown(1);
        
        // Details table
        const detailsY = doc.y;
        const leftCol = 50;
        const rightCol = 400;

        const details = [
          { label: 'Transaction ID', value: payment.razorpay_payment_id },
          { label: 'Order ID', value: payment.razorpay_order_id },
          { label: 'Payment Method', value: 'Razorpay' },
          { label: 'Currency', value: payment.currency || 'INR' },
        ];

        if (payment.notes?.description) {
          details.push({ label: 'Description', value: payment.notes.description });
        }

        let currentY = detailsY;
        details.forEach(detail => {
          doc.fontSize(10)
             .fillColor('#666666')
             .text(detail.label, leftCol, currentY);
          
          doc.fontSize(10)
             .fillColor('#333333')
             .text(detail.value, rightCol, currentY, { width: 145, align: 'right' });
          
          currentY += 25;
        });

        // Amount Section
        doc.moveDown(3);
        doc.moveTo(50, doc.y)
           .lineTo(545, doc.y)
           .strokeColor('#e5e5e5')
           .stroke();

        doc.moveDown(1);
        
        // Subtotal
        doc.fontSize(11)
           .fillColor('#666666')
           .text('Subtotal:', leftCol, doc.y);
        
        doc.fontSize(11)
           .fillColor('#333333')
           .text(`₹${payment.amount.toLocaleString('en-IN')}`, rightCol, doc.y, { 
             width: 145, 
             align: 'right' 
           });

        // Total (highlighted)
        doc.moveDown(0.8);
        doc.fontSize(14)
           .fillColor('#333333')
           .text('Total Amount:', leftCol, doc.y);
        
        doc.fontSize(16)
           .fillColor('#22c55e')
           .text(`₹${payment.amount.toLocaleString('en-IN')}`, rightCol, doc.y, { 
             width: 145, 
             align: 'right' 
           });

        doc.moveDown(1);
        doc.moveTo(50, doc.y)
           .lineTo(545, doc.y)
           .strokeColor('#22c55e')
           .lineWidth(2)
           .stroke();

        // Footer
        doc.moveDown(3);
        doc.fontSize(10)
           .fillColor('#666666')
           .text('Thank you for your payment!', { align: 'center' });

        doc.moveDown(2);
        doc.fontSize(8)
           .fillColor('#999999')
           .text('This is a computer-generated receipt and does not require a signature.', { 
             align: 'center' 
           });

        doc.moveDown(0.5);
        doc.fontSize(8)
           .fillColor('#999999')
           .text('For any queries, please contact support@expenseai.com', { 
             align: 'center' 
           });

        // Add watermark
        this.addWatermark(doc);

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add header with logo and company info
   */
  addHeader(doc) {
    doc.fontSize(20)
       .fillColor('#22c55e')
       .text('ExpenseAI', 50, 50);
    
    doc.fontSize(10)
       .fillColor('#666666')
       .text('Smart Expense Management', 50, 75);
    
    doc.fontSize(8)
       .fillColor('#999999')
       .text('www.expenseai.com', 50, 90);

    // Add a decorative line
    doc.moveTo(50, 110)
       .lineTo(545, 110)
       .strokeColor('#22c55e')
       .lineWidth(2)
       .stroke();
  }

  /**
   * Add watermark to the document
   */
  addWatermark(doc) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    doc.save();
    doc.rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] });
    doc.fontSize(60)
       .fillColor('#f0f0f0')
       .opacity(0.3)
       .text('PAID', pageWidth / 2 - 100, pageHeight / 2 - 30);
    doc.restore();
  }
}

module.exports = new PDFReceiptService();