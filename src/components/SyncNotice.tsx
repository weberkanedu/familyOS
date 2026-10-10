import { useEffect, useState } from 'react'
import { WarningIcon, WifiSlashIcon, KeyIcon } from '@phosphor-icons/react'
import { Btn, Field, Input, Modal, cx } from './ui'
import { useStorageOk } from '../state/store'
import { getFamilyCode, setFamilyCode } from '../sync/config'
import type { SyncStatus } from '../sync/useFamilySync'
import type { ErrorCode } from '../sync/protocol'

/** Kısa kopmalarda uyarı yanıp sönmesin: ancak bu kadar süre bağlantısız kalınca göster */
const OFFLINE_GRACE_MS = 15_000

/**
 * Kullanıcının bilmesi gereken senkron/kayıt sorunları:
 *  - cihaz hafızası doldu (değişiklik kaydedilemiyor)
 *  - sunucuya uzun süredir bağlanılamıyor (bekleyen değişiklik sayısıyla)
 *  - aile kodu gerekiyor / yanlış (kod girme penceresi)
 */
export function SyncNotice({
  status,
  pending,
  authError,
  kiosk,
}: {
  status: SyncStatus
  pending: number
  authError: ErrorCode | null
  kiosk: boolean
}) {
  const storageOk = useStorageOk()
  const [offlineLong, setOfflineLong] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)
  const [code, setCode] = useState(getFamilyCode)

  const offline = status === 'connecting' || status === 'reconnecting'
  useEffect(() => {
    if (!offline) {
      setOfflineLong(false)
      return
    }
    const t = setTimeout(() => setOfflineLong(true), OFFLINE_GRACE_MS)
    return () => clearTimeout(t)
  }, [offline])

  // Kod gerekince pencere kendiliğinden açılır
  useEffect(() => {
    if (status === 'unauthorized') setGateOpen(true)
  }, [status, authError])

  const submit = () => {
    if (!code.trim()) return
    setFamilyCode(code)
    setGateOpen(false)
  }

  const bar = (tone: string, icon: React.ReactNode, text: React.ReactNode, action?: React.ReactNode) => (
    <div
      role="status"
      className={cx(
        'flex items-center gap-3 rounded-2xl border px-4 py-3 mb-4 font-semibold',
        kiosk ? 'text-base' : 'text-sm',
        tone,
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">{text}</span>
      {action}
    </div>
  )

  const gateText =
    authError === 'not-configured'
      ? 'Sunucuda aile kodu (FAMILY_CODE) ayarlanmamış. Dokploy’da uygulamanın Environment bölümüne FAMILY_CODE ekleyip yeniden dağıtın.'
      : authError === 'rate-limit'
        ? 'Çok fazla yanlış deneme yapıldı. 10 dakika sonra tekrar deneyin.'
        : getFamilyCode()
          ? 'Aile kodu yanlış. Doğru kodu girin.'
          : 'Bu cihazı ailenin panosuna bağlamak için aile kodunu girin.'

  return (
    <>
      {!storageOk &&
        bar(
          'bg-rose-50 border-rose-200 text-rose-700',
          <WarningIcon className="w-5 h-5" weight="fill" />,
          'Bu cihazın hafızası doldu; son değişiklikler bu cihaza kaydedilemiyor. Ayarlar → Veri → “Yedeği indir” ile yedek alın.',
        )}

      {status === 'unauthorized' &&
        !gateOpen &&
        bar(
          'bg-rose-50 border-rose-200 text-rose-700',
          <KeyIcon className="w-5 h-5" weight="fill" />,
          'Aile kodu gerekli — değişiklikler şimdilik yalnızca bu cihazda.',
          <Btn size="sm" variant="danger" onClick={() => setGateOpen(true)}>
            Kodu gir
          </Btn>,
        )}

      {offlineLong &&
        bar(
          'bg-amber-50 border-amber-200 text-amber-800',
          <WifiSlashIcon className="w-5 h-5" weight="bold" />,
          pending > 0
            ? `Sunucuya bağlanılamıyor. ${pending} değişiklik bağlantı gelince otomatik gönderilecek.`
            : 'Sunucuya bağlanılamıyor. Yeniden deneniyor…',
        )}

      <Modal
        open={gateOpen && status === 'unauthorized'}
        onClose={() => setGateOpen(false)}
        title="Aile kodu"
        footer={
          authError !== 'not-configured' && (
            <Btn className="w-full" onClick={submit} disabled={!code.trim() || authError === 'rate-limit'}>
              Bağlan
            </Btn>
          )
        }
      >
        <p className="text-slate-600 font-medium">{gateText}</p>
        {authError !== 'not-configured' && (
          <Field label="Aile kodu">
            <Input
              autoFocus
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </Field>
        )}
        <p className="text-xs text-slate-400">
          Kod bir kez girilir ve bu cihazda saklanır. Kodu bilmeyen kimse aile verisini göremez.
        </p>
      </Modal>
    </>
  )
}
