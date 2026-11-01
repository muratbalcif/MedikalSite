import { Controller, Get, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EnvironmentVariables } from '../../config/env.validation';
import { SiteService } from './site.service';

class SiteConfigResponseDto {
  siteName!: string;
  supportEmail!: string;
  supportPhone!: string;
  address!: string;
  privacyUrl!: string;
  kvkkUrl!: string;
  termsUrl!: string;
  bankTransferInfo!: {
    bankName: string;
    iban: string;
    accountName: string;
  };
}

@ApiTags('site')
@Controller('site')
export class SiteController {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly siteService: SiteService,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: 'Public site configuration for footer/contact/bank details',
  })
  @ApiOkResponse({ type: Object })
  getConfig(): SiteConfigResponseDto {
    return {
      siteName:
        this.config.get('SITE_NAME', { infer: true }) ?? 'ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ',
      supportEmail:
        this.config.get('SITE_SUPPORT_EMAIL', { infer: true }) ??
        'info@furkansogutma.net',
      supportPhone:
        this.config.get('SITE_SUPPORT_PHONE', { infer: true }) ?? '',
      address: this.config.get('SITE_ADDRESS', { infer: true }) ?? '',
      privacyUrl:
        this.config.get('SITE_PRIVACY_URL', { infer: true }) ?? '/gizlilik',
      kvkkUrl: this.config.get('SITE_KVKK_URL', { infer: true }) ?? '/kvkk',
      termsUrl:
        this.config.get('SITE_TERMS_URL', { infer: true }) ??
        '/kullanim-kosullari',
      bankTransferInfo: {
        bankName:
          this.config.get('BANK_TRANSFER_BANK_NAME', { infer: true }) ?? '',
        iban: this.config.get('BANK_TRANSFER_IBAN', { infer: true }) ?? '',
        accountName:
          this.config.get('BANK_TRANSFER_ACCOUNT_NAME', { infer: true }) ?? '',
      },
    };
  }

  @Get('legal')
  @ApiOperation({ summary: 'List public legal pages (titles)' })
  listLegal() {
    return this.siteService.listLegalPages();
  }

  @Get('legal/:slug')
  @ApiOperation({ summary: 'Get a public legal page by slug' })
  getLegal(@Param('slug') slug: string) {
    return this.siteService.getLegalPage(slug);
  }
}
