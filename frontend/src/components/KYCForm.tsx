import React, { useEffect, useMemo, useState } from 'react'
import { CirclePlus, CircleCheck, CircleX, ScanFace } from 'lucide-react'
import clsx from 'clsx'

type Step = 1 | 2 | 3

const stepper = [
  { id: 1, label: 'Verifikasi KTP' },
  { id: 2, label: 'Verifikasi NPWP' },
  { id: 3, label: 'Pengenalan Wajah' },
]

function usePreview(file?: File) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return setUrl(null)
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

export default function KYCForm() {
  const [step, setStep] = useState<Step>(1)

  // KTP state
  const [ktpFile, setKtpFile] = useState<File | undefined>()
  const ktpPreview = usePreview(ktpFile)
  const [ktpProcessing, setKtpProcessing] = useState(false)
  const [ktpResult, setKtpResult] = useState<'idle' | 'success' | 'mismatch' | 'fake'>('idle')

  // NPWP state
  const [npwpFile, setNpwpFile] = useState<File | undefined>()
  const npwpPreview = usePreview(npwpFile)
  const [npwpProcessing, setNpwpProcessing] = useState(false)
  const [npwpResult, setNpwpResult] = useState<'idle' | 'success'>('idle')

  // Face state
  const [faceState, setFaceState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')

  function simulateKtpVerify() {
    if (!ktpFile) return
    setKtpProcessing(true)
    setKtpResult('idle')
    setTimeout(() => {
      setKtpProcessing(false)
      // deterministic-ish outcome
      const r = Math.random()
      if (r < 0.75) {
        setKtpResult('success')
        setTimeout(() => setStep(2), 700)
      } else if (r < 0.9) setKtpResult('mismatch')
      else setKtpResult('fake')
    }, 1600)
  }

  function simulateNpwpVerify() {
    if (!npwpFile) return
    setNpwpProcessing(true)
    setTimeout(() => {
      setNpwpProcessing(false)
      setNpwpResult('success')
      setTimeout(() => setStep(3), 700)
    }, 1200)
  }

  function startFaceScan() {
    setFaceState('processing')
    setTimeout(() => {
      const r = Math.random()
      if (r < 0.8) setFaceState('success')
      else setFaceState('error')
    }, 2000)
  }

  const stepColors = (s: number) => {
    if (s < step) return 'bg-paylabs-green'
    if (s === step) return 'bg-paylabs-blue'
    return 'bg-paylabs-gray'
  }

  return (
    <div className="min-h-screen bg-paylabs-bg p-6 flex items-center justify-center">
      <div className="w-full max-w-5xl">
        <header className="flex items-center gap-4 mb-6">
          <img src="/src/assets/paylabs-logo.png" alt="logo" className="h-10" />
          <h2 className="text-paylabs-navy text-2xl font-semibold">Onboarding KYC — Paylabs</h2>
        </header>

        <div className="bg-paylabs-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex">
            {/* Left / Right main split */}
            <div className="w-1/2 p-6">
                {step === 1 && (
                  <div key="step1" className="fade-slide-in">
                    <h3 className="text-xl text-paylabs-navy font-semibold mb-4">Verifikasi KTP</h3>

                    <label className="block">
                      <div className="relative">
                        <div className="h-56 rounded-lg flex items-center justify-center bg-paylabs-blue text-paylabs-white">
                          {ktpPreview ? (
                            <img src={ktpPreview} alt="ktp" className="h-full object-contain" />
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <CirclePlus size={48} />
                              <div>Unggah Foto KTP</div>
                            </div>
                          )}
                        </div>
                        <input className="sr-only" type="file" accept="image/*" onChange={(e) => setKtpFile(e.target.files?.[0])} />
                      </div>
                    </label>

                    <div className="mt-4">
                      <button className="px-4 py-2 rounded-md text-paylabs-white bg-paylabs-navy" onClick={simulateKtpVerify} disabled={!ktpFile || ktpProcessing}>
                        Verify
                      </button>
                    </div>

                    {ktpProcessing && (
                      <div className="mt-4">
                        <div className="text-paylabs-gray text-sm">Pengecekan oleh AI</div>
                        <div className="w-full bg-paylabs-gray h-2 rounded mt-2 overflow-hidden">
                          <div className="h-2 bg-paylabs-orange progress-bar-inner" style={{ animationDuration: '1.6s' }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div key="step2" className="fade-slide-in">
                    <h3 className="text-xl text-paylabs-navy font-semibold mb-4">Verifikasi Identitas Wajib Pajak</h3>
                    <div className="h-56 rounded-lg flex items-center justify-center bg-paylabs-orange text-paylabs-white">
                      {npwpPreview ? <img src={npwpPreview} className="h-full object-contain" /> : <div className="flex flex-col items-center gap-2"><CirclePlus size={48} /><div>Unggah Foto NPWP</div></div>}
                    </div>
                    <input className="sr-only" type="file" accept="image/*" onChange={(e) => setNpwpFile(e.target.files?.[0])} />
                    <div className="mt-4">
                      <button className="px-4 py-2 rounded-md text-paylabs-white bg-paylabs-navy" onClick={simulateNpwpVerify} disabled={!npwpFile || npwpProcessing}>
                        Verify NPWP
                      </button>
                    </div>
                    {npwpProcessing && (
                      <div className="mt-4">
                        <div className="text-paylabs-gray text-sm">Pengecekan oleh AI</div>
                        <div className="w-full bg-paylabs-gray h-2 rounded mt-2 overflow-hidden">
                          <div className="h-2 bg-paylabs-orange progress-bar-inner" style={{ animationDuration: '1.2s' }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div key="step3" className="fade-slide-in">
                    <div className="flex flex-col items-start gap-4">
                      <h3 className="text-xl text-paylabs-navy font-semibold">Pengenalan Wajah</h3>
                      <div className="w-full p-4 bg-paylabs-navy rounded-lg text-paylabs-white">
                        <div className="flex items-center gap-4">
                          <ScanFace size={40} />
                          <div>
                            <p className="font-semibold">Ikuti instruksi untuk verifikasi wajah</p>
                            <ol className="list-decimal ml-5 text-sm mt-2 text-paylabs-white/80">
                              <li>Mata menghadap kamera</li>
                              <li>Hapus kacamata jika perlu</li>
                              <li>Pencahayaan cukup</li>
                              <li>Tunggu hingga proses selesai</li>
                            </ol>
                          </div>
                        </div>
                        <div className="mt-4">
                          {faceState === 'idle' && <button className="px-4 py-2 rounded-md bg-paylabs-orange text-paylabs-white" onClick={startFaceScan}>Mulai</button>}
                          {faceState === 'processing' && <div className="text-paylabs-white">Mendeteksi...</div>}
                          {faceState === 'success' && <div className="flex items-center gap-2 text-paylabs-green"><CircleCheck />Sukses Terverifikasi</div>}
                          {faceState === 'error' && <div className="flex items-center gap-2 text-paylabs-red"><CircleX />Gagal Mengenali Wajah</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            
            </div>

            <div className="w-1/2 p-6 border-l border-paylabs-gray/20 flex flex-col justify-between">
              {/* Right panel changes based on step and results */}
              <div>
                  {step === 1 && (
                    <div key="right1" className="fade-slide-in">
                      <div className="space-y-3">
                        <input placeholder="Nama Lengkap" className="w-full p-2 border rounded" />
                        <input placeholder="NIK" className="w-full p-2 border rounded" />
                        <div className="flex gap-2">
                          <input placeholder="Tanggal Lahir" className="w-1/2 p-2 border rounded" />
                          <input placeholder="Tempat Lahir" className="w-1/2 p-2 border rounded" />
                        </div>
                        <input placeholder="Nama Ibu Kandung" className="w-full p-2 border rounded" />
                      </div>
                      {/* Error panels */}
                      {ktpResult === 'mismatch' && (
                        <div className="mt-6 p-4 rounded-lg bg-paylabs-navy text-paylabs-white fade-in-up">
                          <div className="font-semibold">Tanggal Lahir Tidak Sesuai. Mohon coba lagi.</div>
                          <div className="mt-3">
                            <button className="px-4 py-2 bg-paylabs-orange text-paylabs-white rounded" onClick={() => { setKtpResult('idle') }}>Coba Lagi</button>
                          </div>
                        </div>
                      )}

                      {ktpResult === 'fake' && (
                        <div className="mt-6 p-4 rounded-lg bg-paylabs-navy text-paylabs-white fade-in-up">
                          <div className="font-semibold">Verifikasi Gagal. AI mendeteksi KTP fotokopi. Mohon unggah KTP asli.</div>
                          <div className="mt-3">
                            <button className="px-4 py-2 bg-paylabs-orange text-paylabs-white rounded" onClick={() => { setKtpResult('idle') }}>Coba Lagi</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div key="right2" className="fade-slide-in">
                      <div className="space-y-3">
                        <input placeholder="NPWP" className="w-full p-2 border rounded" />
                        <input placeholder="Nama Wajib Pajak" className="w-full p-2 border rounded" />
                        <textarea placeholder="Alamat Wajib Pajak" className="w-full p-2 border rounded" />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div key="right3" className="flex flex-col items-center gap-4 fade-slide-in">
                      <div className="w-56 h-56 flex items-center justify-center">
                        <svg viewBox="0 0 200 200" className="w-56 h-56">
                          <defs />
                          <circle
                            cx="100"
                            cy="100"
                            r="84"
                            fill="none"
                            strokeWidth={6}
                            strokeLinecap="round"
                            strokeDasharray={12}
                            className={clsx(faceState === 'processing' ? 'dash-spin' : '')}
                            style={{ stroke: faceState === 'processing' ? '#F9591B' : faceState === 'success' ? '#00FF1E' : faceState === 'error' ? '#FF0000' : '#6C757D' }}
                          />
                          <image href="/src/assets/3d-avatar.png" x="40" y="40" height="120" width="120" />
                        </svg>
                      </div>

                      <div className="w-full text-center">
                        {faceState === 'idle' && <div className="text-paylabs-gray">Tekan Mulai untuk memulai pemindaian</div>}
                        {faceState === 'processing' && <div className="text-paylabs-orange">Memindai...</div>}
                        {faceState === 'success' && <div className="text-paylabs-green">Wajah terverifikasi</div>}
                        {faceState === 'error' && <div className="text-paylabs-red">Gagal mengenali wajah</div>}
                        {faceState !== 'success' && faceState !== 'processing' && <div className="mt-4" />}
                      </div>
                    </div>
                  )}
              </div>

              {/* Stepper bottom */}
              <div className="mt-6">
                <div className="flex items-center gap-4 justify-between">
                  {stepper.map((s) => (
                    <div key={s.id} className="flex-1 flex items-center gap-3">
                      <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-white', stepColors(s.id))}>{s.id}</div>
                      <div className="text-sm text-paylabs-navy">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
