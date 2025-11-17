const brevo = require('@getbrevo/brevo');
const {logger}=require("../middleware/logger");

// Initialize Brevo API
let apiInstance = new brevo.TransactionalEmailsApi();
let apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.EMAIL_API_KEY;

const sendEmailNotification = async ({
  userEmail,
  userName="user",
  amount,
  transactionId,
  dateTime = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  })
}) => {
  
  // Your beautiful email template
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; line-height: 1.6; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
        .success-icon { width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
        .checkmark { width: 45px; height: 45px; border-radius: 50%; background-color: #10b981; position: relative; }
        .checkmark::after { content: ''; position: absolute; left: 16px; top: 10px; width: 12px; height: 20px; border: solid white; border-width: 0 3px 3px 0; transform: rotate(45deg); }
        .header h1 { color: #ffffff; font-size: 32px; margin-bottom: 10px; font-weight: 700; }
        .header p { color: rgba(255, 255, 255, 0.9); font-size: 16px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; color: #1f2937; margin-bottom: 20px; }
        .message { color: #6b7280; font-size: 15px; margin-bottom: 30px; line-height: 1.8; }
        .payment-details { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #667eea; }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #d1d5db; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #6b7280; font-size: 14px; font-weight: 500; }
        .detail-value { color: #1f2937; font-size: 15px; font-weight: 600; }
        .amount { font-size: 24px !important; color: #10b981 !important; font-weight: 700 !important; }
        .transaction-id { font-family: 'Courier New', monospace; background-color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 13px !important; }
        .support-section { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px; text-align: center; }
        .support-section p { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
        .support-link { color: #667eea; text-decoration: none; font-weight: 600; }
        .footer { background-color: #1f2937; padding: 30px; text-align: center; }
        .footer p { color: #9ca3af; font-size: 13px; margin-bottom: 8px; }
        @media only screen and (max-width: 600px) {
            body { padding: 20px 10px; }
            .header h1 { font-size: 26px; }
            .content { padding: 30px 20px; }
            .payment-details { padding: 20px; }
            .detail-row { flex-direction: column; align-items: flex-start; gap: 5px; }
            .amount { font-size: 20px !important; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="success-icon">
                <div class="checkmark"></div>
            </div>
            <h1>Payment Successful!</h1>
            <p>Your transaction has been completed</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello <strong>${userName}</strong>,
            </div>
            
            <div class="message">
                Thank you for your payment! We've successfully received your payment and your transaction has been processed. Below are the details of your transaction for your records.
            </div>
            
            <div class="payment-details">
                <div class="detail-row">
                    <span class="detail-label">Amount Paid</span>
                    <span class="detail-value amount">₹${amount}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Transaction ID</span>
                    <span class="detail-value transaction-id">${transactionId}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Payment Medium</span>
                    <span class="detail-value">Razorpay</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Date & Time</span>
                    <span class="detail-value">${dateTime}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value" style="color: #10b981;">✓ Completed</span>
                </div>
            </div>
            
            <div class="support-section">
                <p><strong>Need help?</strong></p>
                <p>If you have any questions about this transaction, please don't hesitate to contact us.</p>
                <a class="support-link">Contact Support At 9260946604</a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Your Website Name</strong></p>
            <p>© 2025 Your Website. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;

  // Create email object
  let sendSmtpEmail = new brevo.SendSmtpEmail();
  
  sendSmtpEmail.subject = '✅ Payment Successful - Transaction Confirmation';
  sendSmtpEmail.htmlContent = htmlTemplate;
  sendSmtpEmail.sender = { 
    name: 'Chat Town', 
    email: 'creativecoder0895@gmail.com'
  };
  sendSmtpEmail.to = [{ 
    email: userEmail, 
    name: userName 
  }];

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info('✅ Payment confirmation email sent successfully!');
    return { success: true, data };
  } catch (error) {
    logger.error('❌ Error sending payment email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmailNotification };