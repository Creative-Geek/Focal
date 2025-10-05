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
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                            <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">
                                Welcome to Focal! 📸
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 20px 40px;">
                            <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                Hi ${recipientName},
                            </p>
                            <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                Thanks for signing up! To get started with tracking your expenses using AI-powered receipt scanning, please verify your email address by clicking the button below:
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 10px 0 0; color: #2563eb; font-size: 14px; word-break: break-all;">
                                ${verificationUrl}
                            </p>

                            <p style="margin: 30px 0 0; color: #6b6b6b; font-size: 14px; line-height: 1.6;">
                                This link will expire in 24 hours for security reasons.
                            </p>

                            <p style="margin: 20px 0 0; color: #6b6b6b; font-size: 14px; line-height: 1.6;">
                                If you didn't create an account with Focal, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; border-top: 1px solid #e5e5e5;">
                            <p style="margin: 0; color: #8a8a8a; font-size: 13px; line-height: 1.6;">
                                Best regards,<br>
                                The Focal Team
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Email footer -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                    <tr>
                        <td style="text-align: center; padding: 20px;">
                            <p style="margin: 0; color: #8a8a8a; font-size: 12px;">
                                © 2025 Focal. All rights reserved.
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
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                            <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">
                                Reset Your Password
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 20px 40px;">
                            <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                Hi ${recipientName},
                            </p>
                            <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                We received a request to reset your password. Click the button below to create a new password:
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 10px 0 0; color: #2563eb; font-size: 14px; word-break: break-all;">
                                ${resetUrl}
                            </p>

                            <p style="margin: 30px 0 0; color: #6b6b6b; font-size: 14px; line-height: 1.6;">
                                This link will expire in 1 hour for security reasons.
                            </p>

                            <p style="margin: 20px 0 0; color: #6b6b6b; font-size: 14px; line-height: 1.6;">
                                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 30px 40px; border-top: 1px solid #e5e5e5;">
                            <p style="margin: 0; color: #8a8a8a; font-size: 13px; line-height: 1.6;">
                                Best regards,<br>
                                The Focal Team
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
