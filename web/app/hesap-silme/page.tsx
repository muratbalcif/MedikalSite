import type { Metadata } from "next";
import { DeleteAccountForm } from "./delete-account-form";

export const metadata: Metadata = {
  title: "Hesap silme",
  description:
    "Anamur Acil Medikal hesabınızı ve kişisel verilerinizi silmek için bu sayfayı kullanın.",
  alternates: { canonical: "/hesap-silme" },
};

export default function DeleteAccountPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
        ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ hesap silme
      </h1>
      <p className="text-sm leading-6 text-slate-700">
        Anamur Acil Medikal mobil uygulamasında veya sitede oluşturduğunuz müşteri
        hesabını buradan kapatabilirsiniz. Uygulama içinden de bu sayfaya
        ulaşabilirsiniz: Hesabım, Ayarlar, Hesabı sil.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
        <li>Anamur Acil Medikal hesabınızla giriş yapın.</li>
        <li>Şifrenizi yazın ve silme onayını işaretleyin.</li>
        <li>Hesabımı sil düğmesine basın. Oturumunuz kapanır.</li>
      </ol>
      <section className="space-y-2 text-sm leading-6 text-slate-700">
        <h2 className="font-semibold text-slate-900">Silinen veriler</h2>
        <p>
          Ad, soyad, e-posta, telefon, şifre, kimlik numarası, kayıtlı adres
          iletişim bilgileri, favoriler, stok uyarıları, sepet, bildirim
          tercihleri ve cihaz bildirim kayıtları silinir veya anonim hale
          getirilir.
        </p>
        <h2 className="font-semibold text-slate-900">Saklanan veriler</h2>
        <p>
          Sipariş, fatura, ödeme, havale ve cari hesap kayıtları yasal
          yükümlülükler için tutulur. Bu kayıtlardaki hesap, silinmiş kullanıcı
          olarak işaretlenir. Saklama süresi ilgili mevzuattaki süre kadardır.
        </p>
      </section>
      <DeleteAccountForm />
    </div>
  );
}
