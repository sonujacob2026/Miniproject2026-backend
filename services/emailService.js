// Email service for sending payment confirmations and receipts
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configure email transporter
    // You can use Gmail, SendGrid, or any SMTP service
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail', // 'gmail', 'sendgrid', etc.
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASSWORD // Your email password or app-specific password
      }
    });

    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service configuration error:', error);
      } else {
        console.log('Email service is ready to send messages');
      }
    });
  }

  /**
   * Send payment confirmation email with PDF receipt
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.userName - User's name
   * @param {Object} options.payment - Payment details
   * @param {Buffer} options.pdfBuffer - PDF receipt buffer
   */
  async sendPaymentConfirmation({ to, userName, payment, pdfBuffer }) {
    try {
      const mailOptions = {
        from: {
          name: 'ExpenseAI',
          address: process.env.EMAIL_USER
        },
        to: to,
        subject: `Payment Confirmation - ₹${payment.amount.toLocaleString('en-IN')}`,
        html: this.generatePaymentEmailHTML({ userName, payment }),
        attachments: [
          {
            filename: `receipt-${payment.razorpay_payment_id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Payment confirmation email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending payment confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML content for payment confirmation email
   */
  generatePaymentEmailHTML({ userName, payment }) {
    const date = new Date(payment.verified_at || payment.created_at).toLocaleString('en-IN', {
      dateStyle: 'long',
      timeStyle: 'short'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #22c55e;
          }
          .header h1 {
            color: #22c55e;
            margin: 0;
            font-size: 28px;
          }
          .success-icon {
            font-size: 48px;
            margin: 20px 0;
          }
          .amount {
            font-size: 36px;
            font-weight: bold;
            color: #22c55e;
            text-align: center;
            margin: 20px 0;
          }
          .details {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e5e5;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 600;
            color: #666;
          }
          .detail-value {
            color: #333;
            text-align: right;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            color: #666;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #22c55e;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ExpenseAI</h1>
          </div>
          
          <div style="text-align: center;">
            <div class="success-icon">✅</div>
            <h2 style="color: #333; margin: 10px 0;">Payment Successful!</h2>
            <p style="color: #666;">Hi ${userName || 'there'},</p>
            <p style="color: #666;">Your payment has been processed successfully.</p>
          </div>

          <div class="amount">₹${payment.amount.toLocaleString('en-IN')}</div>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Transaction ID</span>
              <span class="detail-value">${payment.razorpay_payment_id}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Order ID</span>
              <span class="detail-value">${payment.razorpay_order_id}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date & Time</span>
              <span class="detail-value">${date}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status</span>
              <span class="detail-value" style="color: #22c55e; font-weight: 600;">Captured</span>
            </div>
            ${payment.notes?.description ? `
            <div class="detail-row">
              <span class="detail-label">Description</span>
              <span class="detail-value">${payment.notes.description}</span>
            </div>
            ` : ''}
          </div>

          <div style="text-align: center;">
            <p style="color: #666;">A detailed receipt is attached to this email as a PDF.</p>
          </div>

          <div class="footer">
            <p>Thank you for using ExpenseAI!</p>
            <p style="font-size: 12px; color: #999;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();