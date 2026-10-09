let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as any).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Basit bildirim sesi (harici dosya yok). */
export function beep(kind: 'msg' | 'ok' | 'warn' = 'msg') {
  try {
    const ac = getCtx()
    if (!ac) return
    const seq: [number, number, number][] =
      kind === 'msg'
        ? [[880, 0, 0.12], [1174, 0.14, 0.16]]
        : kind === 'ok'
          ? [[660, 0, 0.09], [880, 0.1, 0.14]]
          : [[440, 0, 0.14], [330, 0.16, 0.2]]
    for (const [freq, delay, dur] of seq) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = ac.currentTime + delay
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      osc.connect(gain).connect(ac.destination)
      osc.start(t0)
      osc.stop(t0 + dur + 0.05)
    }
  } catch {
    /* ses desteği yoksa sessiz geç */
  }
}

export function vibrate(pattern: number | number[] = [80, 40, 80]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* yok say */
  }
}
