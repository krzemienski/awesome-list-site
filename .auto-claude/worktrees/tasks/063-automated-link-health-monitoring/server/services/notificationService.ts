import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { storage } from '../storage';
import type { LinkHealthJob } from '@shared/schema';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface BrokenLinkAlertData {
  jobId: number;
  totalLinks: number;
  brokenLinks: number;
  percentage: number;
  topBrokenLinks: Array<{
    url: string;
    title: string;
    status: string;
    errorMessage: string | null;
  }>;
}

export class NotificationService {
  private static instance: NotificationService;
  private transporter: Transporter | null = null;
  private adminEmail: string;
  private enabled: boolean;

  private constructor() {
    this.adminEmail = process.env.ADMIN_EMAIL || '';
    this.enabled = !!(
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS &&
      this.adminEmail
    );

    if (this.enabled) {
      this.initializeTransporter();
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initializeTransporter(): void {
    const config: EmailConfig = {
      host: process.env.EMAIL_HOST!,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    };

    this.transporter = nodemailer.createTransport(config);
  }

  async sendBrokenLinksAlert(jobId: number): Promise<void> {
    if (!this.enabled) {
      console.log('[NotificationService] Email notifications disabled - missing configuration');
      return;
    }

    try {
      const job = await storage.getLinkHealthJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const shouldSendAlert = this.shouldSendAlert(job);
      if (!shouldSendAlert) {
        console.log('[NotificationService] Alert threshold not met, skipping notification');
        return;
      }

      const alertData = await this.prepareAlertData(job);
      const { subject, body } = this.buildEmailContent(alertData);

      const emailResult = await this.sendEmail(this.adminEmail, subject, body);

      await storage.createLinkHealthNotification({
        jobId,
        notificationType: 'broken_links_alert',
        recipients: [this.adminEmail],
        subject,
        body,
        status: emailResult.status,
        errorMessage: emailResult.errorMessage || null,
        sentAt: emailResult.sentAt || null,
        metadata: {
          totalLinks: alertData.totalLinks,
          brokenLinks: alertData.brokenLinks,
          percentage: alertData.percentage,
        },
      });

      if (emailResult.status === 'sent') {
        console.log(`[NotificationService] Broken links alert sent to ${this.adminEmail}`);
      } else {
        console.error(`[NotificationService] Failed to send alert: ${emailResult.errorMessage}`);
      }
    } catch (error: any) {
      console.error('[NotificationService] Failed to send broken links alert:', error);
      throw error;
    }
  }

  private shouldSendAlert(job: LinkHealthJob): boolean {
    const totalLinks = job.totalLinks || 0;
    const brokenLinks = job.brokenLinks || 0;

    if (totalLinks === 0) {
      return false;
    }

    const percentage = (brokenLinks / totalLinks) * 100;
    return percentage > 5;
  }

  private async prepareAlertData(job: LinkHealthJob): Promise<BrokenLinkAlertData> {
    const totalLinks = job.totalLinks || 0;
    const brokenLinks = job.brokenLinks || 0;
    const percentage = totalLinks > 0 ? (brokenLinks / totalLinks) * 100 : 0;

    const failedLinks = await storage.getFailedLinks(job.id);
    const topBrokenLinks = failedLinks.slice(0, 10).map(check => ({
      url: check.url,
      title: check.resource.title,
      status: check.status,
      errorMessage: check.errorMessage,
    }));

    return {
      jobId: job.id,
      totalLinks,
      brokenLinks,
      percentage,
      topBrokenLinks,
    };
  }

  private buildEmailContent(data: BrokenLinkAlertData): { subject: string; body: string } {
    const subject = `⚠️ Link Health Alert: ${data.brokenLinks} Broken Links Detected (${data.percentage.toFixed(1)}%)`;

    const body = `
Link Health Check Alert

A recent link health check has detected a significant number of broken links on your Awesome List site.

Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total Links Checked: ${data.totalLinks}
• Broken Links: ${data.brokenLinks}
• Failure Rate: ${data.percentage.toFixed(1)}%
• Job ID: ${data.jobId}

Top ${data.topBrokenLinks.length} Broken Links:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.topBrokenLinks
  .map(
    (link, index) => `
${index + 1}. ${link.title}
   URL: ${link.url}
   Status: ${link.status}
   ${link.errorMessage ? `Error: ${link.errorMessage}` : ''}
`
  )
  .join('\n')}

Action Required:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please review and update these broken links in the admin dashboard to maintain content quality.

This is an automated notification from the Link Health Monitoring system.
    `.trim();

    return { subject, body };
  }

  private async sendEmail(
    to: string,
    subject: string,
    body: string
  ): Promise<{ status: 'sent' | 'failed'; sentAt?: Date; errorMessage?: string }> {
    if (!this.transporter) {
      return {
        status: 'failed',
        errorMessage: 'Email transporter not initialized',
      };
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text: body,
      });

      return {
        status: 'sent',
        sentAt: new Date(),
      };
    } catch (error: any) {
      return {
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('[NotificationService] Email connection test failed:', error);
      return false;
    }
  }
}

export const notificationService = NotificationService.getInstance();
