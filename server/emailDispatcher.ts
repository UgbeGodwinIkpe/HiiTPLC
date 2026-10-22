import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { jsonDb } from '../src/data/jsonDb';
import { EmailRecord, StudentProfile } from '../src/types';

export interface CredentialsEmailPayload {
  studentName: string;
  regNumber: string;
  email: string;
  password: string;
  courseTitle?: string;
  batchName?: string;
  portalUrl?: string;
  studentId?: string;
}

export function buildStudentCredentialsHtml(payload: CredentialsEmailPayload): { subject: string; html: string; text: string; preview: string } {
  const subject = `Welcome to HiiT PLC — Your Student CBT Portal Login Credentials [${payload.regNumber}]`;
  const portalUrl = payload.portalUrl || 'http://localhost:3000/';
  const preview = `Your student account has been created. Reg Number: ${payload.regNumber}, Password: ${payload.password}`;

  const text = `
Dear ${payload.studentName},

Welcome to HiiT PLC Assessment & Examination Portal.
Your student account has been successfully created.

Your Login Credentials:
------------------------------------------
Student Name:        ${payload.studentName}
Registration Number: ${payload.regNumber}
Email Address:       ${payload.email}
Password:            ${payload.password}
Enrolled Course:     ${payload.courseTitle || 'Professional Training Program'}
Assigned Batch:      ${payload.batchName || 'Abuja Centre'}
Portal URL:          ${portalUrl}
------------------------------------------

How to Access the CBT Portal:
1. Navigate to: ${portalUrl}
2. Choose "Student" role on the login tab.
3. Enter your Registration Number (${payload.regNumber}) or your Email Address.
4. Enter your password: ${payload.password}
5. Once logged in, you can take active CBT exams, view your real-time results, and monitor your attendance.

If you encounter any issues logging in, please contact the HiiT Academic Affairs Office or your Course Instructor.

Regards,
HiiT PLC Examination & CBT Assessment Centre
Abuja Training Centre, Plot 1083 Ahmadu Bello Way, Garki II, Abuja
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #002B49 0%, #001726 100%); padding: 35px 30px; text-align: left; border-bottom: 4px solid #E11D48;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: #E11D48; color: #ffffff; font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px;">
                      OFFICIAL ENROLLMENT NOTICE
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                      HiiT PLC Assessment Portal
                    </h1>
                    <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">
                      Abuja Training Centre &bull; Computer Based Testing (CBT) System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 35px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                Dear ${payload.studentName},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Welcome to <strong>HiiT PLC</strong>. Your official student profile has been registered on the <strong>HiiT Computer-Based Testing & Assessment Portal</strong>. You are now authorized to access your scheduled examinations, mock assessments, academic materials, and performance transcripts.
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f1f5f9; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: #002B49; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                      &#128272; Your Student Login Credentials
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 18px;">
                    <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
                      <tr>
                        <td width="38%" style="color: #64748b; font-weight: 600;">Registration Number:</td>
                        <td style="color: #002B49; font-weight: 800; font-family: monospace; font-size: 14px; background: #e0f2fe; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                          ${payload.regNumber}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Registered Email:</td>
                        <td style="color: #0f172a; font-weight: 600;">${payload.email}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Student Password:</td>
                        <td style="color: #e11d48; font-weight: 800; font-family: monospace; font-size: 14px; background: #ffe4e6; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                          ${payload.password}
                        </td>
                      </tr>
                      ${payload.courseTitle ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Enrolled Course:</td>
                        <td style="color: #0f172a; font-weight: 600;">${payload.courseTitle}</td>
                      </tr>` : ''}
                      ${payload.batchName ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Assigned Batch:</td>
                        <td style="color: #0f172a; font-weight: 600;">${payload.batchName}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
              <tr>
                  <td align="center">
                    <a href="https://chat.whatsapp.com/EA3fNahhq1DAabjn9xHEsh?s=cl&p=a&mlu=4&ilr=4" target="_blank" style="display: inline-block; background-color: #08a765b9; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.35);">
                      Join The Class WhatsApp Group
                    </a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #E11D48; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.35);">
                      Launch CBT Examination Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <div style="background-color: #ffffff; border-left: 3px solid #0284c7; padding: 14px 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0; background: #f0f9ff;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">
                  Quick Login Instructions:
                </h4>
                <ol style="margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: #334155;">
                  <li>Click the button above or visit <span style="font-family: monospace; color: #0284c7;">${portalUrl}</span>.</li>
                  <li>Click on the <strong>Student</strong> tab on the login form.</li>
                  <li>Enter your <strong>Registration Number (${payload.regNumber})</strong> or your email.</li>
                  <li>Enter your password: <strong>${payload.password}</strong></li>
                  <li>Review active tests, read exam guidelines, and click <strong>Start Exam</strong> when ready.</li>
                </ol>
              </div>

              <!-- Security Advice -->
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 18px;">
                &#9888; <strong>Security Notice:</strong> Do not share your login credentials with other students. All CBT submissions are automatically time-stamped and registered to your student ID.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 30px; text-align: center; color: #94a3b8; font-size: 11.5px; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 700; color: #cbd5e1;">
                HiiT PLC Examination &amp; Academic Affairs
              </p>
              <p style="margin: 0;">
                Abuja Training Centre &bull; Plot 1083 Ahmadu Bello Way, Garki II, Abuja, FCT, Nigeria
              </p>
              <p style="margin: 6px 0 0 0; color: #64748b;">
                This automated credential dispatch was generated by the HiiT Examination Administration System.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return { subject, html, text, preview };
}

export function getSmtpConfig() {
  dotenv.config({ override: true });
  const smtpService = (process.env.SMTP_SERVICE || '').trim().toLowerCase();
  const smtpUser = process.env.SMTP_USER?.trim() || '';
  const smtpPass = process.env.SMTP_PASS?.trim() || '';
  const isGmail = smtpService === 'gmail' || smtpUser.toLowerCase().includes('@gmail.com');
  const smtpHost = process.env.SMTP_HOST?.trim() || (isGmail ? 'smtp.gmail.com' : '');
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : (isGmail ? 465 : 587);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const rawFrom = process.env.SMTP_FROM?.trim() || '';
  let smtpFrom = '';
  if (rawFrom) {
    if (rawFrom.includes('<') && rawFrom.includes('>')) {
      smtpFrom = rawFrom;
    } else if (rawFrom.includes('@')) {
      smtpFrom = rawFrom;
    } else {
      smtpFrom = `"${rawFrom.replace(/"/g, '')}" <${smtpUser}>`;
    }
  } else {
    smtpFrom = smtpUser ? `HiiT Assessment Portal <${smtpUser}>` : 'HiiT Assessment Portal <portal@hiit.ng>';
  }

  const isConfigured = Boolean(smtpUser && smtpPass);

  let maskedUser = '';
  if (smtpUser) {
    const parts = smtpUser.split('@');
    if (parts.length === 2) {
      maskedUser = `${parts[0].slice(0, 3)}***@${parts[1]}`;
    } else {
      maskedUser = `${smtpUser.slice(0, 3)}***`;
    }
  }

  return {
    isConfigured,
    smtpService: isGmail ? 'gmail' : (smtpService || 'custom'),
    smtpHost: isGmail ? 'smtp.gmail.com' : smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    smtpFrom,
    isGmail,
    maskedUser
  };
}

export function createMailTransporter() {
  const config = getSmtpConfig();
  if (!config.isConfigured) return null;

  if (config.isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      }
    });
  }

  return nodemailer.createTransport({
    host: config.smtpHost || 'smtp.gmail.com',
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });
}

export async function testSmtpConnection(targetEmail: string): Promise<{ success: boolean; message: string; details?: any }> {
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      message: 'SMTP is not configured in your .env file yet. Please set SMTP_USER and SMTP_PASS (or Gmail App Password).'
    };
  }

  const transporter = createMailTransporter();
  if (!transporter) {
    return { success: false, message: 'Could not initialize SMTP mail transporter.' };
  }

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: config.smtpFrom,
      to: targetEmail,
      subject: '✅ HiiT CBT Portal — SMTP Connection Verified',
      text: `Hello! This is an automated test email from HiiT CBT Assessment Portal. Your outgoing mail server (${config.smtpService}) is working properly and ready to deliver student credentials.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #f8fafc; border-radius: 12px; border: 1.5px solid #e2e8f0; max-width: 520px; color: #0f172a;">
          <h2 style="color: #002B49; margin-top: 0;">✅ SMTP Connection Verified</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Your outgoing mail configuration is operating successfully. Student login credentials and examination notifications will now be delivered live to student inboxes.
          </p>
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; font-size: 13px; margin: 16px 0;">
            <div><strong>Sender:</strong> ${config.smtpFrom}</div>
            <div><strong>Provider:</strong> ${config.isGmail ? 'Google Gmail (App Password)' : config.smtpHost}</div>
            <div><strong>Recipient:</strong> ${targetEmail}</div>
            <div><strong>Verified At:</strong> ${new Date().toLocaleString()}</div>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            HiiT PLC Examination &amp; CBT Assessment System &bull; Abuja Training Centre
          </p>
        </div>
      `
    });

    return {
      success: true,
      message: `Test email successfully sent to ${targetEmail} via ${config.isGmail ? 'Gmail' : config.smtpHost}!`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `SMTP Error: ${err.message || 'Authentication or connection failure. If using Gmail, make sure you use a 16-character App Password, not your standard Google account password.'}`
    };
  }
}

export async function sendStudentCredentialsEmail(
  payload: CredentialsEmailPayload,
  trigger: 'student_added' | 'bulk_imported' | 'manual_resend' | 'password_reset' = 'student_added'
): Promise<EmailRecord> {
  const { subject, html, text, preview } = buildStudentCredentialsHtml(payload);
  const config = getSmtpConfig();
  const transporter = createMailTransporter();

  let status: 'sent' | 'simulated' | 'failed' = 'simulated';
  let deliveryDetails = '';

  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.smtpFrom,
        to: payload.email,
        subject,
        text,
        html
      });
      status = 'sent';
      deliveryDetails = `Live email delivered via SMTP (${config.isGmail ? 'Gmail' : config.smtpHost}) to ${payload.email}`;
      console.log(`[EmailService] Live SMTP email delivered to ${payload.email} for ${payload.studentName}`);
    } catch (err: any) {
      console.error(`[EmailService] SMTP delivery failed for ${payload.email}:`, err);
      status = 'failed';
      deliveryDetails = `SMTP Delivery Error: ${err.message || 'Connection failure'}. (Check your SMTP_USER and App Password in .env)`;
    }
  } else {
    // If SMTP is not configured, record as simulated in portal outbox
    status = 'simulated';
    deliveryDetails = `Archived in Portal Outbox (SMTP not configured in local .env). To deliver live emails to ${payload.email}, configure SMTP_USER & SMTP_PASS in your .env file.`;
    console.log(`[EmailService] SMTP not configured. Dispatched to Portal Outbox for ${payload.studentName} (${payload.email})`);
  }

  // Persist record in emails.json collection
  const emailRecord = jsonDb.addEmail({
    to: payload.email,
    studentId: payload.studentId,
    studentName: payload.studentName,
    regNumber: payload.regNumber,
    subject,
    preview,
    passwordSent: payload.password,
    courseTitle: payload.courseTitle,
    batchName: payload.batchName,
    htmlContent: html,
    textContent: text,
    status,
    deliveryDetails,
    trigger
  });

  // Log in activity audit log
  jsonDb.addLog(
    'system_mail',
    'Email Dispatcher',
    'coordinator',
    'EMAIL_CREDENTIALS_SENT',
    `${status === 'sent' ? 'Live emailed' : 'Archived in outbox'} credentials for ${payload.studentName} (${payload.regNumber}) to ${payload.email} [${status.toUpperCase()}]`
  );

  return emailRecord;
}
