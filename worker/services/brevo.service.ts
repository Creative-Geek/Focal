/**
 * Brevo email service for sending transactional emails
 * Using direct REST API calls for better Cloudflare Workers compatibility
 */

export class BrevoService {
    private apiKey: string;
    private senderEmail: string;
    private senderName: string;
    private apiUrl = 'https://api.brevo.com/v3';

    constructor(
        apiKey: string,
        senderEmail: string = 'verification@focal.creative-geek.tech',
        senderName: string = 'Focal - Financial Tracker'
    ) {
        if (!apiKey) {
            throw new Error('Brevo API key is not provided');
        }
        this.apiKey = apiKey;
        this.senderEmail = senderEmail;
        this.senderName = senderName;
    }

    /**
     * Send verification email to new user
     */
    async sendVerificationEmail(
        recipientEmail: string,
        recipientName: string,
        verificationToken: string,
        appUrl: string
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const verificationUrl = `${appUrl}/verify?token=${verificationToken}`;

            const emailData = {
                sender: {
                    name: this.senderName,
                    email: this.senderEmail
                },
                to: [
                    {
                        email: recipientEmail,
                        name: recipientName
                    }
                ],
                subject: 'Verify your Focal account',
                htmlContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        @media (max-width: 600px) {
            .container { width: 100% !important; padding: 20px 10px !important; }
            .email-container { width: 100% !important; padding: 20px !important; }
            .logo { width: 60px !important; height: 60px !important; }
            .button { width: 100% !important; box-sizing: border-box !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; min-height: 100vh;">
        <tr>
            <td align="center">
                <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 50px 40px 30px; text-align: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiPg0KICA8ZGVmcz4NCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxMTE4MjciLz4NCiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFmMjkzNyIvPg0KICAgIDwvbGluZWFyR3JhZGllbnQ+DQogIDwvZGVmcz4NCiAgPHJlY3Qgd2lkdGg9IjEwMjQiIGhlaWdodD0iMTAyNCIgcng9IjIwMCIgZmlsbD0idXJsKCNnKSIvPg0KICA8IS0tIEZvY2FsIGdseXBoOiBhIGZvY3VzIGJhciBtb3RpZiAtLT4NCiAgPHJlY3QgeD0iMTYwIiB5PSI0OTIiIHdpZHRoPSI3MDQiIGhlaWdodD0iNDAiIHJ4PSIyMCIgZmlsbD0iIzNiODJmNiIvPg0KICA8Y2lyY2xlIGN4PSI1MTIiIGN5PSI1MTIiIHI9IjE0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTNjNWZkIiBzdHJva2Utd2lkdGg9IjMyIi8+DQogIDxjaXJjbGUgY3g9IjUxMiIgY3k9IjUxMiIgcj0iMTYiIGZpbGw9IiMzYjgyZjYiLz4NCjwvc3ZnPg0K" alt="Focal Logo" class="logo" style="width: 80px; height: 80px; margin-bottom: 20px;" />
                            <h1 style="margin: 0; color: #1e293b; font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                Welcome to Focal! 📸
                            </h1>
                            <p style="margin: 10px 0 0; color: #64748b; font-size: 16px; font-weight: 500;">
                                AI-Powered Expense Tracking
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td class="email-container" style="padding: 40px 50px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                    <span style="color: white; font-size: 24px;">✉️</span>
                                </div>
                                <h2 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 600;">
                                    Verify Your Email Address
                                </h2>
                            </div>

                            <p style="margin: 0 0 20px; color: #475569; font-size: 18px; line-height: 1.7; font-weight: 500;">
                                Hi ${recipientName},
                            </p>
                            <p style="margin: 0 0 25px; color: #64748b; font-size: 16px; line-height: 1.7;">
                                Thanks for signing up! To get started with tracking your expenses using AI-powered receipt scanning, please verify your email address by clicking the button below:
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 35px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${verificationUrl}" class="button" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: all 0.3s ease;">
                                            ✨ Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                                <p style="margin: 0 0 8px; color: #334155; font-size: 16px; font-weight: 600;">
                                    🔗 Manual Verification Link:
                                </p>
                                <p style="margin: 0; color: #3b82f6; font-size: 14px; word-break: break-all; font-family: 'Courier New', monospace;">
                                    ${verificationUrl}
                                </p>
                            </div>

                            <div style="background: #fefce8; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #eab308;">
                                <p style="margin: 0 0 8px; color: #a16207; font-size: 14px; font-weight: 500;">
                                    ⏰ Security Notice:
                                </p>
                                <p style="margin: 0; color: #a16207; font-size: 14px; line-height: 1.6;">
                                    This link will expire in 24 hours for security reasons.
                                </p>
                            </div>

                            <p style="margin: 25px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6; text-align: center;">
                                If you didn't create an account with Focal, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 40px 50px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-top: 1px solid #e2e8f0;">
                            <div style="text-align: center;">
                                <p style="margin: 0 0 15px; color: #64748b; font-size: 16px; font-weight: 600;">
                                    Best regards,
                                </p>
                                <p style="margin: 0 0 20px; color: #3b82f6; font-size: 16px; font-weight: 700;">
                                    The Focal Team 🚀
                                </p>

                                <div style="border-top: 1px solid #cbd5e1; padding-top: 20px; margin-top: 20px;">
                                    <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px;">
                                        Need help? Contact us anytime
                                    </p>
                                    <div style="display: inline-flex; gap: 15px;">
                                        <a href="mailto:support@focal.creative-geek.tech" style="color: #3b82f6; text-decoration: none; font-size: 12px; font-weight: 500;">Support</a>
                                        <span style="color: #cbd5e1;">•</span>
                                        <a href="https://focal.creative-geek.tech" style="color: #3b82f6; text-decoration: none; font-size: 12px; font-weight: 500;">Website</a>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- Email footer -->
                <table class="container" width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                    <tr>
                        <td style="text-align: center; padding: 25px; background-color: rgba(255,255,255,0.9); border-radius: 8px;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                                © 2025 Focal. All rights reserved.<br>
                                <span style="color: #cbd5e1;">AI-Powered Expense Tracking Made Simple</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
                `.trim(),
                textContent: `
Welcome to Focal!

Hi ${recipientName},

Thanks for signing up! To get started with tracking your expenses using AI-powered receipt scanning, please verify your email address by visiting this link:

${verificationUrl}

This link will expire in 24 hours for security reasons.

If you didn't create an account with Focal, you can safely ignore this email.

Best regards,
The Focal Team
                `.trim(),
                replyTo: {
                    email: this.senderEmail,
                    name: this.senderName
                }
            };

            const response = await fetch(`${this.apiUrl}/smtp/email`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': this.apiKey,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            const data = await response.json() as any;

            if (!response.ok) {
                console.error('[Brevo] API Error Response:', data);
                return {
                    success: false,
                    error: data.message || `HTTP ${response.status}: ${response.statusText}`
                };
            }

            console.log('[Brevo] API Success Response:', data);
            return {
                success: true,
                messageId: data.messageId
            };
        } catch (error: any) {
            console.error('[Brevo] Failed to send verification email:', error);
            return {
                success: false,
                error: error.message || 'Failed to send verification email'
            };
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(
        recipientEmail: string,
        recipientName: string,
        resetToken: string,
        appUrl: string
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

            const emailData = {
                sender: {
                    name: this.senderName,
                    email: this.senderEmail
                },
                to: [
                    {
                        email: recipientEmail,
                        name: recipientName
                    }
                ],
                subject: 'Reset your Focal password',
                htmlContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        @media (max-width: 600px) {
            .container { width: 100% !important; padding: 20px 10px !important; }
            .email-container { width: 100% !important; padding: 20px !important; }
            .logo { width: 60px !important; height: 60px !important; }
            .button { width: 100% !important; box-sizing: border-box !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; min-height: 100vh;">
        <tr>
            <td align="center">
                <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 50px 40px 30px; text-align: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiPg0KICA8ZGVmcz4NCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxMTE4MjciLz4NCiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFmMjkzNyIvPg0KICAgIDwvbGluZWFyR3JhZGllbnQ+DQogIDwvZGVmcz4NCiAgPHJlY3Qgd2lkdGg9IjEwMjQiIGhlaWdodD0iMTAyNCIgcng9IjIwMCIgZmlsbD0idXJsKCNnKSIvPg0KICA8IS0tIEZvY2FsIGdseXBoOiBhIGZvY3VzIGJhciBtb3RpZiAtLT4NCiAgPHJlY3QgeD0iMTYwIiB5PSI0OTIiIHdpZHRoPSI3MDQiIGhlaWdodD0iNDAiIHJ4PSIyMCIgZmlsbD0iIzNiODJmNiIvPg0KICA8Y2lyY2xlIGN4PSI1MTIiIGN5PSI1MTIiIHI9IjE0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTNjNWZkIiBzdHJva2Utd2lkdGg9IjMyIi8+DQogIDxjaXJjbGUgY3g9IjUxMiIgY3k9IjUxMiIgcj0iMTYiIGZpbGw9IiMzYjgyZjYiLz4NCjwvc3ZnPg0K" alt="Focal Logo" class="logo" style="width: 80px; height: 80px; margin-bottom: 20px;" />
                            <h1 style="margin: 0; color: #1e293b; font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                Reset Your Password
                            </h1>
                            <p style="margin: 10px 0 0; color: #64748b; font-size: 16px; font-weight: 500;">
                                Secure Account Recovery
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td class="email-container" style="padding: 40px 50px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                    <span style="color: white; font-size: 24px;">🔐</span>
                                </div>
                                <h2 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 600;">
                                    Password Reset Request
                                </h2>
                            </div>

                            <p style="margin: 0 0 20px; color: #475569; font-size: 18px; line-height: 1.7; font-weight: 500;">
                                Hi ${recipientName},
                            </p>
                            <p style="margin: 0 0 25px; color: #64748b; font-size: 16px; line-height: 1.7;">
                                We received a request to reset your password. Click the button below to create a new password:
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 35px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetUrl}" class="button" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b, #ef4444); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); transition: all 0.3s ease;">
                                            🔑 Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                                <p style="margin: 0 0 8px; color: #334155; font-size: 16px; font-weight: 600;">
                                    🔗 Manual Reset Link:
                                </p>
                                <p style="margin: 0; color: #f59e0b; font-size: 14px; word-break: break-all; font-family: 'Courier New', monospace;">
                                    ${resetUrl}
                                </p>
                            </div>

                            <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                                <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 500;">
                                    ⏰ Security Notice:
                                </p>
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                                    This link will expire in 1 hour for security reasons.
                                </p>
                            </div>

                            <p style="margin: 25px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6; text-align: center;">
                                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 50px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-top: 1px solid #e2e8f0;">
                            <div style="text-align: center;">
                                <p style="margin: 0 0 15px; color: #64748b; font-size: 16px; font-weight: 600;">
                                    Need help with your account?
                                </p>
                                <p style="margin: 0 0 20px; color: #f59e0b; font-size: 16px; font-weight: 700;">
                                    Contact Focal Support 🛡️
                                </p>

                                <div style="border-top: 1px solid #cbd5e1; padding-top: 20px; margin-top: 20px;">
                                    <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px;">
                                        We're here to help with any account issues
                                    </p>
                                    <div style="display: inline-flex; gap: 15px;">
                                        <a href="mailto:support@focal.creative-geek.tech" style="color: #f59e0b; text-decoration: none; font-size: 12px; font-weight: 500;">Support</a>
                                        <span style="color: #cbd5e1;">•</span>
                                        <a href="https://focal.creative-geek.tech" style="color: #f59e0b; text-decoration: none; font-size: 12px; font-weight: 500;">Website</a>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
                `.trim(),
                textContent: `
Reset Your Password

Hi ${recipientName},

We received a request to reset your password. Visit this link to create a new password:

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The Focal Team
                `.trim(),
                replyTo: {
                    email: this.senderEmail,
                    name: this.senderName
                }
            };

            const response = await fetch(`${this.apiUrl}/smtp/email`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': this.apiKey,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            const data = await response.json() as any;

            if (!response.ok) {
                console.error('[Brevo] API Error Response:', data);
                return {
                    success: false,
                    error: data.message || `HTTP ${response.status}: ${response.statusText}`
                };
            }

            console.log('[Brevo] API Success Response:', data);
            return {
                success: true,
                messageId: data.messageId
            };
        } catch (error: any) {
            console.error('[Brevo] Failed to send password reset email:', error);
            return {
                success: false,
                error: error.message || 'Failed to send password reset email'
            };
        }
    }
}
