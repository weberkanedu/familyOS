/**
 * Kısa, tek başına anlamlı ve kaynağı bilinen hadis-i şerifler (TV sol üst satırı).
 * Açık API'lerdeki başlıklar çoğu zaman hadisin bağlamından kopuk bir parçası olduğundan
 * (ör. "Ölüm, alaca bir koç.") seçilmiş liste kullanılır. Sunucu ve istemci (çevrimdışı) ortak.
 */
export type HadisItem = { text: string; ref: string }

export const HADIS_LIST: HadisItem[] = [
  { text: 'Ameller niyetlere göredir.', ref: 'Buhârî' },
  { text: 'Kolaylaştırınız, zorlaştırmayınız; müjdeleyiniz, nefret ettirmeyiniz.', ref: 'Buhârî' },
  { text: 'Sizin en hayırlınız Kur’an’ı öğrenen ve öğretendir.', ref: 'Buhârî' },
  { text: 'Temizlik imanın yarısıdır.', ref: 'Müslim' },
  { text: 'Kişi sevdiği ile beraberdir.', ref: 'Buhârî' },
  { text: 'Müslüman, elinden ve dilinden Müslümanların emin olduğu kimsedir.', ref: 'Buhârî' },
  { text: 'Allah’a ve ahiret gününe iman eden ya hayır söylesin ya sussun.', ref: 'Buhârî' },
  { text: 'Güzel söz sadakadır.', ref: 'Buhârî' },
  { text: 'Din nasihattir.', ref: 'Müslim' },
  { text: 'Merhamet etmeyene merhamet edilmez.', ref: 'Buhârî' },
  { text: 'Kardeşinin yüzüne gülümsemen sadakadır.', ref: 'Tirmizî' },
  { text: 'Hayâ imandandır.', ref: 'Buhârî' },
  { text: 'Hayâ ancak hayır getirir.', ref: 'Buhârî' },
  { text: 'Güçlü kimse, öfkelendiği zaman kendine hâkim olandır.', ref: 'Buhârî' },
  { text: 'İnsanlara teşekkür etmeyen, Allah’a da şükretmez.', ref: 'Ebû Dâvûd' },
  { text: 'Hayra vesile olan, onu yapan gibidir.', ref: 'Tirmizî' },
  { text: 'Allah katında amellerin en sevimlisi, az da olsa devamlı olanıdır.', ref: 'Buhârî' },
  { text: 'Birbirinize hediye verin ki birbirinizi sevesiniz.', ref: 'Buhârî, el-Edebü’l-müfred' },
  { text: 'Selamı aranızda yayınız.', ref: 'Müslim' },
  { text: 'Mümin, aynı delikten iki defa ısırılmaz.', ref: 'Buhârî' },
  { text: 'Sizin en hayırlınız, ailesine karşı en hayırlı olanınızdır.', ref: 'Tirmizî' },
  { text: 'Mizanda güzel ahlaktan daha ağır bir şey yoktur.', ref: 'Tirmizî' },
  { text: 'Allah sizin suretlerinize ve mallarınıza değil, kalplerinize ve amellerinize bakar.', ref: 'Müslim' },
  { text: 'Dua ibadetin özüdür.', ref: 'Tirmizî' },
  { text: 'Küçüklerimize merhamet etmeyen, büyüklerimize saygı göstermeyen bizden değildir.', ref: 'Tirmizî' },
  { text: 'Allah güzeldir, güzelliği sever.', ref: 'Müslim' },
  { text: 'Öfkelenme.', ref: 'Buhârî' },
  { text: 'İki nimet vardır ki insanların çoğu onda aldanmıştır: sağlık ve boş vakit.', ref: 'Buhârî' },
  { text: 'Müminler birbirini destekleyen bir binanın tuğlaları gibidir.', ref: 'Buhârî' },
  { text: 'Allah’ın rızası, anne babanın rızasındadır.', ref: 'Tirmizî' },
  { text: 'Sadaka malı eksiltmez.', ref: 'Müslim' },
  { text: 'İlim talep etmek her Müslümana farzdır.', ref: 'İbn Mâce' },
  { text: 'Kim bir iyiliğe yol gösterirse, ona onu yapanın sevabı kadar sevap vardır.', ref: 'Müslim' },
  { text: 'Bizi aldatan bizden değildir.', ref: 'Müslim' },
  { text: 'Kolaylık gösteren, yumuşak davranan kimseye cehennem haram kılınmıştır.', ref: 'Tirmizî' },
]

export function randomHadis(): HadisItem {
  return HADIS_LIST[Math.floor(Math.random() * HADIS_LIST.length)]
}
