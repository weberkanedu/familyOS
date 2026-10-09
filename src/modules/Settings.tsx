import { MagnifyingGlassIcon, PlusIcon, TrashIcon, DownloadSimpleIcon, UploadSimpleIcon, ArrowsClockwiseIcon, BellIcon, BellRingingIcon, UsersIcon, MonitorIcon, MapPinIcon, ArrowClockwiseIcon, ImageIcon, TextTIcon, PaletteIcon, CopyIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Btn, Card, Chip, Field, Input, Modal, SectionTitle, Toggle, cx, Avatar, Select, GlassCard } from '../components/ui'
import { addLocation, deleteMember, removeLocation, saveMember, saveSettings, selectLocation } from '../state/actions'
import { exportDB, importDB, resetDB } from '../state/store'
import { searchPlaces, type GeoPlace } from '../lib/openMeteo'
import { disablePush, enablePush, permissionState, pushSupported } from '../lib/push'
import { fileToDataUrl, approxKb } from '../lib/image'
import { THEMES } from '../lib/themes'
import { BandCover } from '../components/BandCover'
import { HOME } from '../lib/location'
import type { AppMode, DB, Member, Role, SoundMode } from '../types'

const COLORS = ['#f97362', '#4f6ef7', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16']

/** Üst bant kapak görseli için hazır yapay zekâ prompt'u (kullanıcı isteğiyle) */
const ARTWORK_PROMPT = `Refined editorial travel-art composition based on the reference photo.
The image is divided vertically in two: the top half is a realistic cinematic travel photograph, the bottom half transforms the exact same scene into a delicate hand-painted watercolor illustration.

TOP HALF — authentic candid travel photography, natural daylight, soft shadows, fine film grain, realistic textures, sophisticated European atmosphere, documentary-style composition, people walking naturally through the scene, beautiful architectural details, slightly muted elegant colors, high-end travel magazine photography.

BOTTOM HALF — the very same scene as a minimalist handmade watercolor painting, preserving the photograph's recognizable composition, architecture, people, poses, perspective and main visual elements. Loose transparent watercolor washes, delicate ink details, visible paper texture, soft edges, imperfect brush strokes, fine pigment bleeding, airy negative space, simple pastel tones, artistic yet realistic.

Surround the watercolor illustration with a generous warm ivory / off-white textured paper margin. Add a small elegant handwritten caption near the bottom (for example "summer days" or "a quiet afternoon"), underlined by a thin minimalist horizontal line.

Overall aesthetic: luxury travel journal, fine art watercolor postcard, contemporary editorial design, nostalgic European summer, quiet elegance, tactile handmade paper, sophisticated and calm.

Vertical portrait orientation, clean composition, premium art direction, no clutter, no borders, natural proportions.`
const EMOJIS = ['👩🏽', '👨🏽', '🧒🏻', '👦🏻', '👩', '👨', '👧', '👦', '🧑', '👵', '👴', '🐱', '🐶', '🐻']

/** Modül seviyesinde: her render'da yeniden tanımlanırsa React alt ağacı
 *  yeniden mount eder → odak kaybolur ve sayfa zıplar. */
function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <GlassCard className="p-5">
      <SectionTitle title={<span className="inline-flex items-center gap-2">{icon} {title}</span>} />
      <div className="space-y-4">{children}</div>
    </GlassCard>
  )
}

interface MemberDraft {
  id?: string
  name: string
  color: string
  emoji: string
  role: Role
  photo?: string
}

export function Settings({ db, kiosk, sync }: { db: DB; kiosk: boolean; sync: { status: string; url: string | null } }) {
  const s = db.settings
  const [md, setMd] = useState<MemberDraft | null>(null)
  const [q, setQ] = useState('')
  const [places, setPlaces] = useState<GeoPlace[]>([])
  const [searching, setSearching] = useState(false)
  const [pushState, setPushState] = useState<string>('—')
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoNote, setPhotoNote] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const photoRef = useRef<HTMLInputElement | null>(null)
  const bandRef = useRef<HTMLInputElement | null>(null)
  const memberPhotoRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    void permissionState().then((p) => setPushState(p))
  }, [])

  const doSearch = async () => {
    if (!q.trim()) return
    setSearching(true)
    try {
      setPlaces(await searchPlaces(q))
    } catch {
      setPlaces([])
    } finally {
      setSearching(false)
    }
  }

  const onPush = async () => {
    const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
    try {
      if (!key) throw new Error('VITE_VAPID_PUBLIC_KEY tanımlı değil')
      await enablePush(key)
      setPushState('granted')
      setPushMsg('Bildirimler açıldı ✓')
    } catch (e: any) {
      setPushMsg(e?.message ?? 'Bildirim açılamadı')
    }
    setTimeout(() => setPushMsg(null), 4000)
  }

  const onExport = () => {
    const blob = new Blob([exportDB()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `familyos-yedek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const onImport = async (f: File | null) => {
    if (!f) return
    try {
      importDB(await f.text())
      alert('Yedek geri yüklendi')
    } catch {
      alert('Dosya okunamadı')
    }
  }

  const onPickPhoto = async (f: File | null) => {
    if (!f) return
    setPhotoBusy(true)
    try {
      // Boyut sınırı yok — yüklenen fotoğraf aynen kabul edilir
      const url = await fileToDataUrl(f, 0, 0.92)
      saveSettings({ familyPhoto: url })
      setPhotoNote(`Yüklendi · yaklaşık ${approxKb(url)} KB`)
    } catch {
      alert('Fotoğraf okunamadı')
    } finally {
      setPhotoBusy(false)
    }
  }

  const onPickBand = async (f: File | null) => {
    if (!f) return
    setPhotoBusy(true)
    try {
      // Yatay kapak: genişliği koruyarak kırpma yok (maxSize=0 → boyut sınırı yok)
      const url = await fileToDataUrl(f, 0, 0.92)
      saveSettings({ bandImage: url })
      setPhotoNote(`Yüklendi · yaklaşık ${approxKb(url)} KB`)
    } catch {
      alert('Görsel okunamadı')
    } finally {
      setPhotoBusy(false)
    }
  }

    const onPickMemberPhoto = async (f: File | null) => {
    if (!f || !md) return
    setPhotoBusy(true)
    try {
      const url = await fileToDataUrl(f, 0, 0.92)
      setMd({ ...md, photo: url })
      // Var olan üye için fotoğrafı hemen kaydet (Ek ayrı "Kaydet" gerektirmesin)
      if (md.id) saveMember({ id: md.id, photo: url })
    } catch {
      alert('Fotoğraf okunamadı')
    } finally {
      setPhotoBusy(false)
    }
  }

  const soundMode: SoundMode = s.soundMode ?? (s.soundEnabled ? 'wall' : 'off')

  return (
    <div className={cx('space-y-4', kiosk && 'max-w-4xl')}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className={cx('font-extrabold text-slate-800', kiosk ? 'text-3xl' : 'text-2xl')}>Ayarlar</h1>
          <p className="text-slate-500 font-medium">{s.familyName} · {db.members.length} üye</p>
        </div>
      </div>

      {/* Aile fotoğrafı */}
      <Section title="Aile Fotoğrafı" icon={<ImageIcon className="w-5 h-5 text-brand-500" />}>
        <div className="flex items-center gap-4 flex-wrap">
          {s.familyPhoto ? (
            <img
              src={s.familyPhoto}
              alt="Aile fotoğrafı"
              className="w-28 h-28 rounded-2xl object-cover ring-2 ring-white shadow-lg"
            />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-white/60 border border-dashed border-slate-300 grid place-items-center text-slate-300">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
          <div className="flex flex-col gap-2 items-start">
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
            />
            <Btn variant="soft" onClick={() => photoRef.current?.click()} disabled={photoBusy}>
              <UploadSimpleIcon className="w-4 h-4" />
              {photoBusy ? 'Yükleniyor…' : 'Fotoğraf yükle'}
            </Btn>
            {s.familyPhoto && (
              <Btn variant="ghost" onClick={() => saveSettings({ familyPhoto: undefined })}>
                <TrashIcon className="w-4 h-4" /> Fotoğrafı kaldır
              </Btn>
            )}
            {photoNote && <span className="text-xs font-bold text-emerald-600">{photoNote}</span>}
            <p className="text-xs text-slate-400 font-medium max-w-xs">
              Sol üstteki aile alanında görünür. Boyut sınırı yoktur — istediğiniz fotoğrafı yükleyebilirsiniz.
              Fotoğraf aileyle senkronize olur, yani duvar ekranında da görünür.
            </p>
          </div>
        </div>
      </Section>

      {/* Aile adı (marka) */}
      <Section title="Aile Adı" icon={<TextTIcon className="w-5 h-5 text-brand-500" />}>
        <Field label="Sol üstte görünen isim">
          <Input
            value={s.brandName ?? 'İÇİL Ailesi'}
            placeholder="Örn. İÇİL Ailesi"
            onChange={(e) => saveSettings({ brandName: e.target.value })}
          />
        </Field>
        <p className="text-xs text-slate-400 font-medium -mt-2">
          Duvar ekranının sol üstünde ve telefon başlığında görünür. Fotoğraf yüklüyse metin gizlenir.
        </p>
      </Section>

      {/* Kişi fotoğrafları (yoncada görünür) */}
      <Section title="Kişi Fotoğrafları" icon={<UsersIcon className="w-5 h-5 text-brand-500" />}>
        <div className={cx('grid gap-3', kiosk ? 'grid-cols-4' : 'grid-cols-2')}>
          {db.members.map((m) => (
            <div key={m.id} className="rounded-2xl glass-soft p-3 flex flex-col items-center gap-2 text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-white shadow grid place-items-center text-white text-2xl font-extrabold"
                style={{ backgroundColor: m.color }}>
                {m.photo ? (
                  <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  (m.name || '?').trim().charAt(0).toLocaleUpperCase('tr')
                )}
              </div>
              <div className="text-sm font-extrabold text-slate-700 truncate w-full">{m.name}</div>
              <div className="flex items-center gap-1.5">
                <Btn
                  variant="soft"
                  size="sm"
                  onClick={() => {
                    setMd({ id: m.id, name: m.name, color: m.color, emoji: m.emoji, role: m.role, photo: m.photo })
                    setPhotoBusy(false)
                  }}
                >
                  <UploadSimpleIcon className="w-4 h-4" />
                  {m.photo ? 'Değiştir' : 'Fotoğraf'}
                </Btn>
                {m.photo && (
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => saveMember({ ...m, photo: undefined })}
                    aria-label="Fotoğrafı kaldır"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Btn>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Yüklediğiniz fotoğraflar sol menüdeki aile yoncasında ve uygulamanın her yerinde kullanılır.
          Fotoğraflar aileyle senkronize olur, duvar ekranında da görünür.
        </p>
      </Section>

      {/* Aile üyeleri */}
      <Section title="Aile Üyeleri" icon={<UsersIcon className="w-5 h-5 text-brand-500" />}>
        <div className={cx('grid gap-3', kiosk ? 'grid-cols-2' : 'grid-cols-1')}>
          {db.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
              <Avatar member={m} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 truncate">{m.name}</div>
                <div className="text-xs font-semibold text-slate-400">
                  {m.role === 'parent' ? 'Ebeveyn' : 'Çocuk'} · {m.emoji}
                </div>
              </div>
              <Btn
                variant="soft"
                size="sm"
                onClick={() => setMd({ id: m.id, name: m.name, color: m.color, emoji: m.emoji, role: m.role })}
              >
                Düzenle
              </Btn>
              <button
                type="button"
                onClick={() => db.members.length > 1 && confirm(`${m.name} silinsin mi?`) && deleteMember(m.id)}
                className="w-10 h-10 grid place-items-center rounded-xl text-slate-400 hover:text-rose-500 touch-manipulation"
                aria-label="Sil"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
        <Btn variant="soft" onClick={() => setMd({ name: '', color: COLORS[db.members.length % COLORS.length], emoji: '🙂', role: 'child' })}>
          <PlusIcon className="w-5 h-5" /> Üye ekle
        </Btn>
      </Section>

      {/* Ekran */}
      {/* Görünüm / tema */}
      <Section title="Görünüm ve Renk" icon={<PaletteIcon className="w-5 h-5 text-violet-500" />}>
        <div>
          <span className="block text-sm font-semibold text-slate-600 mb-2">Renk teması</span>
          <div className={cx('grid gap-2', kiosk ? 'grid-cols-3' : 'grid-cols-2')}>
            {THEMES.map((t) => {
              const on = (s.theme ?? 'classic') === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => saveSettings({ theme: t.id })}
                  className={cx(
                    'rounded-2xl border-2 p-3 flex items-center gap-3 touch-manipulation transition-colors',
                    on ? 'border-brand-500 bg-white/70' : 'border-slate-200 bg-white/60 hover:border-slate-300',
                  )}
                >
                  <span className="flex -space-x-1.5 shrink-0">
                    {t.swatch.map((c, i) => (
                      <span key={i} className="w-5 h-5 rounded-full ring-2 ring-white" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  <span className={cx('text-sm font-extrabold truncate', on ? 'text-brand-600' : 'text-slate-700')}>
                    {t.label}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400 font-medium">
            Seçtiğiniz tema; buton renklerini, arka planı ve vurguları birlikte değiştirir. Ailenin tüm
            cihazlarında aynı görünür.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-700">Sol menüyü gizle</div>
            <div className="text-xs text-slate-400">Duvar ekranında daha geniş alan</div>
          </div>
          <Toggle checked={!!s.navCollapsed} onChange={(v) => saveSettings({ navCollapsed: v })} label="Menüyü gizle" />
        </div>
      </Section>

      {/* Üst bant kapak görseli */}
      <Section title="Üst Bant Kapak Görseli" icon={<ImageIcon className="w-5 h-5 text-sky-500" />}>
        <div className="flex items-center gap-4 flex-wrap">
          {s.bandImage ? (
            <div className="w-56 h-[104px]">
              <BandCover src={s.bandImage} className="w-full h-full" />
            </div>
          ) : (
            <div className="w-56 h-[104px] rounded-2xl bg-white/60 border border-dashed border-slate-300 grid place-items-center text-slate-300">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
          <div className="flex flex-col gap-2 items-start">
            <input
              ref={bandRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPickBand(e.target.files?.[0] ?? null)}
            />
            <Btn variant="soft" onClick={() => bandRef.current?.click()} disabled={photoBusy}>
              <UploadSimpleIcon className="w-4 h-4" />
              {photoBusy ? 'Yükleniyor…' : s.bandImage ? 'Değiştir' : 'Görsel yükle'}
            </Btn>
            {s.bandImage && (
              <Btn variant="ghost" onClick={() => saveSettings({ bandImage: undefined })}>
                <TrashIcon className="w-4 h-4" /> Kaldır
              </Btn>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 font-medium">
          Yüklediğiniz fotoğraf, üst bantta <b>suluboya illüstrasyona dönüştürülerek</b> gösterilir; kenarları
          zemine karışır, çerçeve olmaz ve fotoğrafın tamamı görünür. Yatay (geniş) fotoğraflar en iyi
          sonucu verir.
        </p>

        {/* Hazır yapay zekâ prompt'u */}
        <details className="rounded-2xl bg-white/60 border border-white/70 p-3">
          <summary className="cursor-pointer text-sm font-extrabold text-slate-700 touch-manipulation">
            ✨ Hazır suluboya görsel prompt'u (kopyala)
          </summary>
          <p className="text-xs text-slate-500 font-medium mt-2 mb-2">
            İsterseniz yapay zekâ görsel oluşturucuda kullanıp sonucu buradan yükleyebilirsiniz.
          </p>
          <pre className="text-[11px] leading-relaxed text-slate-600 bg-white/80 rounded-xl p-3 max-h-56 overflow-y-auto whitespace-pre-wrap font-sans">
{ARTWORK_PROMPT}
          </pre>
          <Btn
            variant="soft"
            size="sm"
            className="mt-2"
            onClick={() => {
              navigator.clipboard?.writeText(ARTWORK_PROMPT)
              setPhotoNote('Prompt kopyalandı ✓')
            }}
          >
            <CopyIcon className="w-4 h-4" /> Prompt'u kopyala
          </Btn>
        </details>
      </Section>

      <Section title="Ekran & Kiosk" icon={<MonitorIcon className="w-5 h-5 text-violet-500" />}>
        <div>
          <span className="block text-sm font-semibold text-slate-600 mb-1.5">Görünüm modu</span>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: 'auto', t: 'Otomatik', d: 'Geniş ekran → kiosk' },
              { v: 'kiosk', t: 'Duvar/Kiosk', d: 'Büyük ekran düzeni' },
              { v: 'mobile', t: 'Mobil PWA', d: 'Telefon düzeni' },
            ] as { v: AppMode; t: string; d: string }[]).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => saveSettings({ mode: o.v })}
                className={cx(
                  'rounded-2xl border-2 p-3 text-center transition-colors touch-manipulation',
                  s.mode === o.v ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300',
                )}
              >
                <div className={cx('font-extrabold', s.mode === o.v ? 'text-brand-600' : 'text-slate-700')}>{o.t}</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{o.d}</div>
              </button>
            ))}
          </div>
        </div>

        <Field label="Boşta kalınca ekran kararma süresi (dakika, 0 = kapat)">
          <Input
            type="number"
            min={0}
            max={60}
            value={s.idleMinutes}
            onChange={(e) => saveSettings({ idleMinutes: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
        <p className="-mt-2 text-xs text-slate-400 font-medium">
          Seçilen süre boyunca ekrana dokunulmazsa ekran kararır ve <b>öğrenme kelimeleri</b> 15 saniyede
          bir değişerek gösterilir. 0 yazarsanız hiç kararmaz.
        </p>

        <div>
          <span className="block text-sm font-semibold text-slate-600 mb-1.5">Yeni mesaj sesi</span>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: 'off', t: 'Kapalı', d: 'Ses çalmaz' },
              { v: 'wall', t: 'Sadece duvarda', d: 'Önerilen 🏠' },
              { v: 'all', t: 'Her cihazda', d: 'Telefon + duvar' },
            ] as { v: SoundMode; t: string; d: string }[]).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => saveSettings({ soundMode: o.v, soundEnabled: o.v !== 'off' })}
                className={cx(
                  'rounded-2xl border-2 p-3 text-center transition-colors touch-manipulation',
                  soundMode === o.v ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300',
                )}
              >
                <div className={cx('font-extrabold text-sm', soundMode === o.v ? 'text-brand-600' : 'text-slate-700')}>
                  {o.t}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{o.d}</div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400 font-medium">
            Aile mesajı yazdığında duvar ekranı "bip" der ve ekranı uyandırır; böylece mesaj kaçmaz.
            Telefonunuz zaten bildirim gösterdiği için <b>Sadece duvarda</b> genelde yeterlidir.
          </p>
        </div>
      </Section>

      {/* Hava konumu: ev + kayıtlı lokasyonlar */}
      <Section title="Hava Durumu Konumu" icon={<MapPinIcon className="w-5 h-5 text-sky-500" />}>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">
            <div className="text-xs font-bold text-sky-500 uppercase">Etkin konum</div>
            <div className="font-bold text-slate-800">{s.city}</div>
          </div>
          <Chip tone="slate">
            {(s.lat ?? HOME.lat).toFixed(3)}, {(s.lon ?? HOME.lon).toFixed(3)}
          </Chip>
        </div>

        <div>
          <span className="block text-sm font-semibold text-slate-600 mb-1.5">Kayıtlı konumlar</span>
          <ul className="space-y-2">
            {(s.savedLocations ?? [{ label: HOME.city, lat: HOME.lat, lon: HOME.lon, home: true }]).map((loc, i) => {
              const active = Math.abs((s.lat ?? HOME.lat) - loc.lat) < 0.01 && Math.abs((s.lon ?? HOME.lon) - loc.lon) < 0.01
              return (
                <li
                  key={`${loc.label}-${i}`}
                  className={cx(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                    active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectLocation(i)}
                    className="flex items-center gap-3 flex-1 text-left touch-manipulation"
                  >
                    <span
                      className={cx(
                        'w-5 h-5 rounded-full border-2 grid place-items-center shrink-0',
                        active ? 'border-brand-500' : 'border-slate-300',
                      )}
                    >
                      {active && <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-800 truncate">
                        {loc.label || 'İsimsiz'} {loc.home && <Chip tone="brand">Ev</Chip>}
                      </span>
                      <span className="block text-[11px] text-slate-400 font-semibold tabular-nums">
                        {loc.lat.toFixed(3)}, {loc.lon.toFixed(3)}
                      </span>
                    </span>
                  </button>
                  {!loc.home && (
                    <button
                      type="button"
                      onClick={() => removeLocation(i)}
                      className="w-9 h-9 grid place-items-center rounded-lg text-slate-300 hover:text-rose-500 touch-manipulation"
                      aria-label="Konumu sil"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex gap-2">
          <Input
            value={q}
            placeholder="Şehir ara (örn. İzmir, Bodrum)"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <Btn onClick={doSearch} disabled={searching || !q.trim()}>
            {searching ? <ArrowClockwiseIcon className="w-5 h-5 animate-spin" /> : <MagnifyingGlassIcon className="w-5 h-5" />}
          </Btn>
        </div>

        {places.length > 0 && (
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {places.map((p, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    addLocation([p.name, p.admin1].filter(Boolean).join(', '), p.latitude, p.longitude)
                    setPlaces([])
                    setQ('')
                  }}
                  className="w-full text-left rounded-xl border border-slate-200 px-4 py-3 hover:border-brand-400 touch-manipulation"
                >
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    {p.name}
                    <PlusIcon className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="text-xs text-slate-400 font-semibold">
                    {[p.admin1, p.country].filter(Boolean).join(' · ')}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-slate-400 font-medium">
          Ev konumu <b>Ankara 06070</b> olarak kayıtlı; istediğinizde başka şehirleri de ekleyip
          aralarında geçiş yapabilirsiniz. Hava verisi Open-Meteo'dan gelir (anahtar gerekmez).
        </p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-700">Hava durumu kartı</div>
            <div className="text-xs text-slate-400">Ana sayfada büyük ikonlu kart</div>
          </div>
          <Toggle checked={s.weatherEnabled} onChange={(v) => saveSettings({ weatherEnabled: v })} label="Hava" />
        </div>
      </Section>

      {/* Bildirimler & senkron */}
      <Section title="Bildirimler & Senkron" icon={<BellIcon className="w-5 h-5 text-emerald-500" />}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-700">Web Push bildirimleri</div>
            <div className="text-xs text-slate-400">Uygulama kapalıyken bile mesaj uyarısı</div>
          </div>
          <Btn variant={pushState === 'granted' ? 'soft' : 'primary'} onClick={onPush} disabled={!pushSupported()}>
            <BellRingingIcon className="w-4 h-4" />
            {pushState === 'granted' ? 'Açık' : 'Bildirimleri aç'}
          </Btn>
        </div>
        {pushMsg && <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600">{pushMsg}</div>}

        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="font-semibold text-slate-500">Senkron adresi</span>
            <span className="font-mono text-xs text-slate-700 break-all text-right">{sync.url ?? 'yerel mod (VITE_SYNC_URL boş)'}</span>
          </div>
          <div className="flex justify-between gap-3 mt-1.5">
            <span className="font-semibold text-slate-500">Durum</span>
            <span className="font-bold text-slate-700">{sync.status}</span>
          </div>
        </div>

        {pushSupported() && pushState === 'granted' && (
          <Btn
            variant="ghost"
            onClick={async () => {
              await disablePush()
              setPushState(await permissionState())
            }}
          >
            Bildirimleri kapat
          </Btn>
        )}
      </Section>

      {/* Veri */}
      <Section title="Veri" icon={<DownloadSimpleIcon className="w-5 h-5 text-slate-500" />}>
        <div className="flex flex-wrap gap-2">
          <Btn variant="soft" onClick={onExport}>
            <DownloadSimpleIcon className="w-4 h-4" /> Yedeği indir
          </Btn>
          <Btn variant="soft" onClick={() => fileRef.current?.click()}>
            <UploadSimpleIcon className="w-4 h-4" /> Yedek geri yükle
          </Btn>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImport(e.target.files?.[0] ?? null)}
          />
          <Btn
            variant="danger"
            onClick={() => confirm('Tüm veriler silinip fabrika ayarlarına dönülecek. Emin misiniz?') && resetDB()}
          >
            <ArrowsClockwiseIcon className="w-4 h-4" /> Sıfırla
          </Btn>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Veriler cihazda (localStorage) tutulur ve <b>senkron sunucusu üzerinden</b> tüm cihazlara dağıtılır. Düzenli yedek almanız önerilir.
        </p>
      </Section>

      {/* Üye modalı */}
      <Modal
        open={md !== null}
        onClose={() => setMd(null)}
        title={md?.id ? 'Üyeyi düzenle' : 'Yeni üye'}
        footer={
          <Btn
            className="w-full"
            disabled={!md?.name.trim()}
            onClick={() => {
              if (!md?.name.trim()) return
              saveMember(md)
              setMd(null)
            }}
          >
            Kaydet
          </Btn>
        }
      >
        {md && (
          <>
            <Field label="İsim">
              <Input autoFocus value={md.name} onChange={(e) => setMd({ ...md, name: e.target.value })} placeholder="Örn. Zeynep" />
            </Field>
            <div>
              <span className="block text-sm font-semibold text-slate-600 mb-1.5">Fotoğraf (isteğe bağlı)</span>
              <div className="flex items-center gap-3">
                <Avatar
                  member={{
                    id: md.id ?? 'preview',
                    name: md.name || 'Önizleme',
                    color: md.color,
                    emoji: md.emoji,
                    role: md.role,
                    order: 0,
                    photo: md.photo,
                    updatedAt: Date.now(),
                  }}
                  size="xl"
                />
                <input
                  ref={memberPhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onPickMemberPhoto(e.target.files?.[0] ?? null)}
                />
                <Btn variant="soft" size="sm" onClick={() => memberPhotoRef.current?.click()}>
                  <UploadSimpleIcon className="w-4 h-4" /> Fotoğraf yükle
                </Btn>
                {md.photo && (
                  <Btn variant="ghost" size="sm" onClick={() => setMd({ ...md, photo: undefined })}>
                    Kaldır
                  </Btn>
                )}
              </div>
            </div>
            <div>
              <span className="block text-sm font-semibold text-slate-600 mb-1.5">Avatar</span>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setMd({ ...md, emoji: e })}
                    className={cx(
                      'w-12 h-12 rounded-xl text-2xl grid place-items-center border-2 touch-manipulation',
                      md.emoji === e ? 'border-brand-500 bg-brand-50' : 'border-slate-200',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-sm font-semibold text-slate-600 mb-1.5">Renk</span>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setMd({ ...md, color: c })}
                    className={cx('w-11 h-11 rounded-full border-4 touch-manipulation', md.color === c ? 'border-slate-800' : 'border-transparent')}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <Field label="Rol">
              <Select value={md.role} onChange={(e) => setMd({ ...md, role: e.target.value as Role })}>
                <option value="parent">Ebeveyn</option>
                <option value="child">Çocuk</option>
              </Select>
            </Field>
            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
              <div className="w-14 h-14 rounded-full grid place-items-center text-3xl" style={{ backgroundColor: md.color }}>
                {md.emoji}
              </div>
              <div className="font-extrabold text-lg text-slate-800">{md.name || 'İsim'}</div>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
