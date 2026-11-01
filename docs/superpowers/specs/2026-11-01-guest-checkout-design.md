# Misafir Alışverişi Tasarımı

## Amaç

ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ müşterileri hesap açmadan ve giriş yapmadan ürünleri sepete ekleyip sipariş verebilsin. Bu akış web sitesi ve Android uygulamasında aynı sipariş altyapısını kullansın. Misafir, siparişini sipariş numarası ve e-posta adresiyle takip edebilsin.

## Mevcut durum

- API sepet, adres, checkout doğrulama ve sipariş uçlarında JWT oturumu istiyor.
- `Cart`, `Address` ve `Order` kayıtları bir `User` kaydına bağlı. Sipariş oluşturma kullanıcının sepetini ve kayıtlı teslimat/fatura adreslerini okuyor.
- Web sepeti `401` yanıtında kullanıcıyı girişe yönlendiriyor; checkout kayıtlı adres seçimine dayanıyor.
- Android sepet ve checkout akışları da oturumlu API uçlarını çağırıyor.
- Sipariş oluşturulunca banka havalesi bilgileri dönüyor; e-posta ve kullanıcı bildirimi mevcut kullanıcı kaydına gönderiliyor.

## Hedefler

- Oturumsuz ziyaretçi web ve Android uygulamasında sepet oluşturup düzenleyebilsin.
- Checkout ziyaretçiden ad, soyad, e-posta, telefon, teslimat adresi ve banka hesabı seçimini alsın.
- Misafir farklı fatura adresi girebilsin ve şirket faturası için şirket adı, vergi dairesi ve vergi numarası sağlayabilsin.
- Misafir siparişi fiyat, stok rezervasyonu, kupon ve muhasebe kurallarını mevcut sipariş akışıyla paylaşsın.
- Sipariş onayı ve sonraki takip, sipariş numarası ve e-posta adresi girilerek sağlansın.
- Giriş yapan müşterilerin mevcut sepet, kayıtlı adres, hesap ve sipariş akışı çalışmaya devam etsin.
- Misafir checkout e-posta sipariş onayı göndersin; e-posta gönderimi sipariş oluşturmayı başarısız kılmasın.

## Hedef dışı

- Misafir siparişini sonradan müşteri hesabına bağlama.
- Misafir kullanıcıya sipariş geçmişi, favoriler veya stok bildirimleri sunma.
- Kredi kartı ödemesi ekleme; mevcut havale/EFT yöntemi korunur.
- Yönetim panelinin normal sipariş listesini veya muhasebe onay sürecini değiştirme.

## Başarı ölçütleri

- Yeni bir ziyaretçi giriş ve kayıt sayfasına uğramadan sepete ürün ekleyip sipariş oluşturabilir.
- Başarılı sipariş için sipariş numarası gösterilir ve sipariş numarası + e-posta ile takip sayfası açılır.
- Geçersiz eşleşme sipariş verisi sızdırmaz; istekler hız sınırlamasına tabidir.
- Girişli siparişler ve admin sipariş işlemleri aynı kurallarla çalışmayı sürdürür.

## Yaklaşımlar

1. **Görünmez hesap üretmek:** Checkout sırasında müşteriye göstermeden rastgele kimlik bilgili bir kullanıcı oluşturup mevcut kullanıcı sipariş akışını kullanmak. İlk geliştirme daha küçük olur; ancak hesapsız müşteriler için sahte kullanıcı kayıtları üretir, e-posta çakışmasını ve siparişin gerçek hesapla ilişkilendirilmesini sorunlu hale getirir.
2. **Gerçek misafir sepeti ve siparişi (önerilen):** Oturum açmış ve misafir sepetlerini ayırmak; misafir sepetine opak bir oturum anahtarı, siparişe misafir iletişim bilgileri eklemek ve kullanıcı ilişkisini isteğe bağlı yapmak. Kullanıcının hesap açmadan sipariş vermesi ve siparişi sipariş numarası + e-posta ile takip etmesiyle doğrudan örtüşür. Veri modeli ve siparişle ilişkili servislerde daha geniş değişiklik gerektirir.

Seçilen yaklaşım 2’dir. Kullanıcının kararları: web + Android desteği; sipariş takibi sipariş numarası + e-posta ile; misafir checkout’ta farklı fatura adresi ve şirket/vergi bilgisi desteği.

## Tasarım

### Sepet ve oturum

- Giriş yapmış kullanıcılar için mevcut `Cart.userId` akışı korunur.
- Misafir sepetleri veritabanında kalıcı olur ve kullanıcı kimliği yerine opak, rastgele üretilen bir misafir oturum anahtarının hash’iyle bulunur. Ham anahtar sipariş veya uygulama loglarına yazılmaz.
- Web istemcisi anahtarı `httpOnly`, `sameSite` ve uygun `secure` ayarlı çerezde; Android istemcisi güvenli yerel depoda saklar. İstemci, yeni API isteklerinde anahtarı taşır.
- Giriş yaptıktan sonra misafir sepetini kullanıcı sepetine birleştirme bu işin kapsamı dışındadır; girişten sonra mevcut kullanıcı sepeti kullanılır.

### Misafir checkout ve sipariş kaydı

- API, mevcut DTO’lara benzer alan doğrulaması olan ayrı misafir checkout uçları sağlar; misafir isteği hiçbir zaman istemciden fiyat veya indirim kabul etmez.
- Misafir checkout iletişim ve teslimat bilgilerini doğrudan alır; kayıtlı adres oluşturmak veya kullanıcı kaydı açmak zorunda değildir.
- Teslimat ve fatura adresleri farklı girilebilir. Bireysel/kurumsal fatura seçeneği sunulur; kurumsal seçimde şirket adı, vergi dairesi ve vergi numarası zorunludur.
- `Order.userId` isteğe bağlı olur. Misafir e-postası, telefonu ve alıcı adı sipariş kaydında/sipariş snapshot’ında saklanır; `shippingAddressSnapshot` ve `billingAddressSnapshot` mevcut sipariş formatıyla uyumlu kalır.
- Kurumsal fatura alanları siparişin değişmez fatura snapshot’ında saklanır ve fatura oluşturulurken `User` üzerindeki kurumsal müşteri profiline ihtiyaç duyulmadan kullanılır.
- Sipariş oluşturma transaction’ı sepet içeriğini, fiyatı, stoku, rezervasyonu ve sipariş satırlarını mevcut kurallarla yeniden doğrular; başarılı işlemde misafir sepet satırlarını temizler.
- Misafir siparişleri standart müşteri fiyatını kullanır. Genel kullanıma açık kuponlar geçerlidir; kullanıcı hesabı veya geçmiş sipariş gerektiren kurallar misafir için geçersiz sayılır.
- Sipariş e-postası verilen adrese gönderilir. Misafir siparişlerinde kullanıcı içi push bildirimi atlanır.

### Sipariş takibi ve havale

- Web ve Android’de sipariş numarası + e-posta isteyen bir misafir takip ekranı bulunur. Bilgi eşleşince yalnızca sipariş tarihi, sipariş satırları, tutar, ödeme/sipariş/teslimat durumu ve varsa kargo takibi gösterilir; tam adres veya başka müşteri verisi gösterilmez.
- Misafir sipariş sorgusu sabit hız sınırına tabidir. Başarısız eşleşmeler siparişin varlığını açıklamayan aynı genel yanıtı verir.
- Checkout başarısı banka hesap bilgilerini ve sipariş numarasını gösterir. Misafir takip ekranı, havale bildirimini de aynı sipariş numarası + e-posta bilgisiyle iletebilir; mevcut admin onay adımları korunur.
- Sipariş numarası ve e-posta, misafir siparişi için doğrulama bilgisi olarak kullanılır. Bu bilgiler URL query parametresine, analitik olaylarına veya loglara yazılmaz.

### Web ve Android deneyimi

- Sepet/ürün sayfalarındaki giriş zorunluluğu kaldırılır; misafir olarak devam etme açıkça sunulur. Giriş/kayıt seçeneği korunur.
- Web’de sepet ve checkout BFF/API proxy katmanı misafir oturum anahtarını güvenli biçimde taşır.
- Android’de checkout kimlik doğrulama ekranına zorunlu yönlendirme yapmaz; misafir anahtarını uygulama güvenli depolamasında saklar.
- Girişli checkout mevcut adres seçimi ve sipariş geçmişi deneyimini kullanmaya devam eder.
- Web ve Android misafir formları teslimat adresi, opsiyonel farklı fatura adresi ve bireysel/kurumsal fatura alanlarında aynı doğrulama kurallarını kullanır.

## Kısıtlar ve teknik alanlar

- Prisma şeması, migration, cart service/controller, checkout service/controller, order service/controller, e-posta outbox ve banka transferi uçları etkilenir.
- `Order.userId` kullanan admin, rapor, ödeme ve muhasebe sorguları misafir siparişinde null ilişkiyi güvenle ele almalıdır. Misafir iletişim bilgileri sipariş snapshot/veri alanlarından okunmalıdır.
- Fatura akışı, misafir siparişleri için şirket adı/vergi bilgilerini kurumsal müşteri profilinden değil siparişin fatura snapshot’ından okuyabilmelidir.
- Web API istemci/proxy çerez taşımayı; Android API istemci/depo misafir anahtarı taşımayı desteklemelidir.
- Mevcut sipariş, ödeme, fatura ve cari hesap kayıtları migration sırasında değişmeden kalmalıdır.
- Geliştirme/test sırasında e-posta sağlayıcısı yoksa sipariş yine oluşturulmalı ve e-posta outbox davranışı mevcut ilkeye uymalıdır.

## Builder’a bırakılanlar

- Oturum anahtarının üretim uzunluğu, hash algoritması ve cookie/header adı mevcut güvenlik desenleriyle uyumlu seçilsin.
- Guest DTO ve endpoint adları, controller düzenine göre belirlenebilir.
- Admin sorgularındaki null müşteri ilişkileri bağlama göre “Misafir” olarak gösterilsin.
- Veri tabanı migration’ı mevcut siparişleri aynen koruyacak biçimde geriye uyumlu tasarlansın.
- Misafir şirket/vergi alanları değişmez sipariş fatura snapshot’ında taşınsın; ayrı bir kurumsal müşteri profili oluşturulmasın.
