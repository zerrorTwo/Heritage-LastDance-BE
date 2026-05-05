import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { join } from 'path';
import loadEnv from '../../config/configuration';
import {
  MailType,
  MailData,
  LoginMailData,
  SignUpMailData,
  LowBalanceMailData,
  OutOfBalanceMailData,
  MonthlyReceiptMailData,
  ExclusiveProgramMailData,
} from './interfaces/mail.interface';

const env = loadEnv();

@Injectable()
export class MailService {
  private readonly resend: Resend | null;
  private readonly logger = new Logger(MailService.name);
  private readonly templateDir: string;

  constructor() {
    this.resend = env.RESEND_API_KEY
      ? new Resend(env.RESEND_API_KEY as string)
      : null;
    this.templateDir = join(__dirname, '../configs/');
    this.logger.warn(
      env.RESEND_API_KEY
        ? 'MailService initialized with Resend'
        : 'MailService: RESEND_API_KEY not set, emails will not be sent',
    );
  }

  async sendEmail(
    userEmail: string[],
    mailType: MailType,
    data: MailData,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Skipping email send - RESEND_API_KEY not configured');
      return;
    }
    try {
      const emailTitle = this.getEmailTitle(mailType);
      const emailBody = await this.generateEmailBody(mailType, data);

      await this.resend.emails.send({
        from: env.RESEND_FROM as string,
        to: userEmail,
        subject: emailTitle,
        html: emailBody,
      });

      this.logger.log(`Email sent successfully to ${userEmail.join(', ')}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${userEmail.join(', ')}`,
        error,
      );
      throw error;
    }
  }

  async sendLoginEmail(
    userEmail: string[],
    data: LoginMailData,
  ): Promise<void> {
    return this.sendEmail(userEmail, MailType.LOGIN, data);
  }

  async sendSignUpEmail(
    userEmail: string[],
    data: SignUpMailData,
  ): Promise<void> {
    return this.sendEmail(userEmail, MailType.SIGNUP, data);
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    return this.sendSignUpEmail([email], { verificationCode: otp });
  }

  async sendForgotPasswordEmail(email: string, otp: string): Promise<void> {
    return this.sendLoginEmail([email], { loginCode: otp });
  }

  async sendLowBalanceEmail(
    userEmail: string[],
    data: LowBalanceMailData,
  ): Promise<void> {
    return this.sendEmail(userEmail, MailType.LOW_BALANCE, data);
  }

  async sendOutOfBalanceEmail(
    userEmail: string[],
    data: OutOfBalanceMailData,
  ): Promise<void> {
    return this.sendEmail(userEmail, MailType.OUT_OF_BALANCE, data);
  }

  async sendMonthlyReceiptEmail(
    userEmail: string[],
    data: MonthlyReceiptMailData,
  ): Promise<void> {
    return this.sendEmail(userEmail, MailType.MONTHLY_RECEIPT, data);
  }

  async sendExclusiveProgramEmail(
    userEmail: string[],
    data: ExclusiveProgramMailData,
  ): Promise<void> {
    return this.sendEmail(
      userEmail,
      MailType.REQUEST_JOIN_EXCLUSIVE_PROGRAM,
      data,
    );
  }

  private getEmailTitle(mailType: MailType): string {
    switch (mailType) {
      case MailType.LOGIN:
        return 'Login';
      case MailType.SIGNUP:
        return 'Sign up';
      case MailType.LOW_BALANCE:
        return "Low wallet's balance";
      case MailType.OUT_OF_BALANCE:
        return 'Out of balance';
      case MailType.MONTHLY_RECEIPT:
        return 'Monthly receipt';
      case MailType.REQUEST_JOIN_EXCLUSIVE_PROGRAM:
        return 'Request join exclusive program';
      default:
        return 'AIOZ STREAM';
    }
  }

  private async generateEmailBody(
    mailType: MailType,
    data: MailData,
  ): Promise<string> {
    const defaultData = {
      Days: '7',
      EmailFeedback: 'admin@aioz.tube',
      TermOfServiceUrl: 'https://aioz.network/',
      TelegramUrl: 'https://t.me/aiozofficial',
      TwitterUrl: 'https://twitter.com/AIOZNetwork',
      GithubUrl: 'https://github.com/aioznetwork',
      CopyrightYear: new Date().getFullYear(),
      ...data,
    };

    const templateFile = this.getTemplateFile(mailType);
    const templatePath = join(this.templateDir, templateFile);

    try {
      let template = readFileSync(templatePath, 'utf8');

      // Replace template variables with data
      Object.keys(defaultData).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, String((defaultData as any)[key]));
      });

      return template;
    } catch (error) {
      this.logger.error(`Failed to read template file: ${templatePath}`, error);
      throw new Error(`Template not found: ${templateFile}`);
    }
  }

  private getTemplateFile(mailType: MailType): string {
    switch (mailType) {
      case MailType.LOGIN:
        return 'login_code.html';
      case MailType.SIGNUP:
        return 'signup_code.html';
      case MailType.LOW_BALANCE:
        return 'low_wallet_balance.html';
      case MailType.OUT_OF_BALANCE:
        return 'out_of_balance.html';
      case MailType.MONTHLY_RECEIPT:
        return 'monthly_receipt.html';
      case MailType.REQUEST_JOIN_EXCLUSIVE_PROGRAM:
        return 'request_join_exclusive_program.html';
      default:
        throw new Error(`Mail type ${mailType} not supported`);
    }
  }
}
