import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export const LEGAL_SLUGS = ['kvkk', 'privacy', 'terms'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export type LegalPageDto = {
  slug: string;
  title: string;
  body: string;
  version: number;
  updatedAt: string;
};

const DEFAULT_PAGES: Record<LegalSlug, { title: string; body: string }> = {
  kvkk: {
    title: 'KVKK Aydınlatma Metni',
    body: `Veri sorumlusu: ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ

Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamında, ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ (“Şirket”) tarafından işlenen kişisel verilerinize ilişkin bilgilendirme amacıyla hazırlanmıştır.

1. İşlenen veriler
Kimlik (ad, soyad), iletişim (e-posta, telefon), adres, kurumsal müşteri bilgileri (unvan, vergi no/dairesi), sipariş ve ödeme/havale bildirimleri, cari hesap hareketleri, cihaz bildirim token’ları, bildirim tercihleri ve teknik log kayıtları işlenebilir.

2. Amaçlar
Hesap oluşturma ve kimlik doğrulama, sipariş/teslimat, ödeme ve cari hesap takibi, müşteri destek, stok/kampanya bildirimleri, güvenlik, denetim ve yasal yükümlülüklerin yerine getirilmesi.

3. Hukuki sebepler
Sözleşmenin kurulması/ifası, hukuki yükümlülük, meşru menfaat ve ilgili durumlarda açık rıza.

4. Aktarım
Barındırma, bildirim ve operasyonel hizmet sağlayıcılarına; zorunlu hallerde yetkili kamu kurumlarına aktarılabilir. Kart numarası/CVV saklanmaz.

5. Saklama
Hesap süresi ve ilgili mevzuattaki ticari/mali saklama süreleri boyunca; sonrasında silinir, yok edilir veya anonimleştirilir.

6. Haklarınız
KVKK m.11 kapsamında erişim, düzeltme, silme, itiraz ve şikayet haklarınızı destek@furkansogutma.net üzerinden kullanabilirsiniz.

Bu metin yönetim panelinden güncellenebilir.`,
  },
  privacy: {
    title: 'Gizlilik Politikası',
    body: `ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ gizlilik politikası

1. Kapsam
Web sitesi, mobil uygulama ve yönetim paneli üzerinden toplanan kişisel veriler bu politika kapsamındadır.

2. Topladığımız bilgiler
Hesap ve iletişim bilgileri, teslimat/fatura adresleri, sipariş ve ödeme (havale) kayıtları, cari hesap hareketleri, bildirim tercihleri, cihaz token’ları ve güvenlik/işlem logları.

3. Kullanım
Sipariş süreçleri, müşteri hizmetleri, stok ve kampanya bildirimleri, dolandırıcılık/güvenlik önlemleri ve yasal yükümlülükler.

4. Paylaşım
Yalnızca hizmetin sunulması için gerekli iş ortakları ve yasal zorunluluk halinde yetkili mercilerle paylaşılır. Ödeme kartı verisi tutulmaz.

5. Güvenlik
Parolalar hash’lenir; yetkisiz erişime karşı erişim kontrolü ve denetim kayıtları uygulanır.

6. Çerezler / oturum
Oturum ve güvenlik amaçlı çerezler/token’lar kullanılabilir.

7. İletişim
Gizlilik talepleri için: destek e-posta ve telefon bilgileri site ayarlarından yayınlanır.

Bu metin yönetim panelinden güncellenebilir.`,
  },
  terms: {
    title: 'Kullanım Koşulları',
    body: `ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ kullanım koşulları

1. Taraflar
Bu koşullar, ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ ile site/uygulama kullanıcıları arasında geçerlidir.

2. Hesap
Kullanıcı doğru bilgi vermekle yükümlüdür. Hesap güvenliğinden kullanıcı sorumludur.

3. Sipariş ve stok
Siparişler stok ve fiyat doğrulamasına tabidir. Stok yetersizliği veya fiyat hatası halinde sipariş iptal/güncelleme yapılabilir.

4. Ödeme
v1’de ödeme yöntemi banka havalesi / EFT’tir. Havale bildirimi incelenerek onaylanır veya reddedilir.

5. Teslimat
Teslimat bilgileri siparişte belirtilen adrese göre işlenir. Yanlış adres kaynaklı gecikmelerden kullanıcı sorumludur.

6. İade / iptal
İptal ve iade talepleri sipariş durumuna ve yürürlükteki mevzuata göre değerlendirilir.

7. Fikri mülkiyet
Site içerikleri, marka ve ürün görselleri Şirket’e veya lisans verenlere aittir.

8. Sorumluluk sınırı
Kesinti, üçüncü taraf arızası veya mücbir sebeplerden doğan dolaylı zararlardan Şirket sorumlu tutulamaz.

9. Değişiklik
Koşullar yönetim panelinden güncellenebilir; güncel sürüm yayınlandığı anda geçerlidir.

10. İletişim
Destek kanalları site yapılandırmasında yer alır.`,
  },
};

@Injectable()
export class SiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async ensureLegalPages(): Promise<void> {
    for (const slug of LEGAL_SLUGS) {
      const defaults = DEFAULT_PAGES[slug];
      await this.prisma.legalPage.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          title: defaults.title,
          body: defaults.body,
        },
      });
    }
  }

  async listLegalPages(): Promise<LegalPageDto[]> {
    await this.ensureLegalPages();
    const rows = await this.prisma.legalPage.findMany({
      orderBy: { slug: 'asc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async getLegalPage(slug: string): Promise<LegalPageDto> {
    if (!LEGAL_SLUGS.includes(slug as LegalSlug)) {
      throw new NotFoundException('Legal page not found');
    }
    await this.ensureLegalPages();
    const row = await this.prisma.legalPage.findUnique({ where: { slug } });
    if (!row) {
      throw new NotFoundException('Legal page not found');
    }
    return this.toDto(row);
  }

  async updateLegalPage(
    slug: string,
    input: { title?: string; body?: string },
    adminUserId?: string,
  ): Promise<LegalPageDto> {
    if (!LEGAL_SLUGS.includes(slug as LegalSlug)) {
      throw new NotFoundException('Legal page not found');
    }
    await this.ensureLegalPages();
    const current = await this.prisma.legalPage.findUnique({ where: { slug } });
    if (!current) {
      throw new NotFoundException('Legal page not found');
    }

    const nextTitle = input.title !== undefined ? input.title : current.title;
    const nextBody = input.body !== undefined ? input.body : current.body;
    const contentChanged =
      nextTitle !== current.title || nextBody !== current.body;

    if (!contentChanged) {
      return this.toDto(current);
    }

    const row = await this.prisma.legalPage.update({
      where: { slug },
      data: {
        title: nextTitle,
        body: nextBody,
        version: { increment: 1 },
      },
    });

    if (adminUserId) {
      await this.audit.log({
        adminUserId,
        action: 'LEGAL_PAGE_UPDATED',
        entityType: 'LegalPage',
        entityId: row.id,
        metadata: {
          slug: row.slug,
          version: row.version,
          previousVersion: current.version,
          titleChanged: nextTitle !== current.title,
          bodyChanged: nextBody !== current.body,
        },
      });
    }

    return this.toDto(row);
  }

  private toDto(row: {
    slug: string;
    title: string;
    body: string;
    version: number;
    updatedAt: Date;
  }): LegalPageDto {
    return {
      slug: row.slug,
      title: row.title,
      body: row.body,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
