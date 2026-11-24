import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Compass, Eye, RotateCcw, ShieldCheck } from 'lucide-react'

export type ShowroomSample = { id: string; name: string; kind: 'PRODUCT' | 'STUDIO' }

export function VirtualShowroom({ samples }: { samples: ShowroomSample[] }) {
  const [yaw, setYaw] = useState(0)
  const [dragging, setDragging] = useState(false)
  const lastX = useRef<number | null>(null)

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    lastX.current = event.clientX
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (lastX.current === null) return
    const delta = event.clientX - lastX.current
    lastX.current = event.clientX
    setYaw(value => (value + delta * 0.34) % 360)
  }
  function pointerUp() {
    lastX.current = null
    setDragging(false)
  }
  function rotate(amount: number) {
    setYaw(value => (value + amount + 360) % 360)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#b99a5b]/30 bg-[#080a0e]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl border border-[#c5a66a]/30 bg-[#c5a66a]/10 text-[#d8bd83]"><Compass className="size-4"/></span>
          <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#d8bd83]">Cyber Wealth / 3D Studio</p><p className="mt-1 text-[11px] text-slate-500">Private product exhibition</p></div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-slate-400"><Eye className="size-3.5"/> Preview only <span className="text-[#d8bd83]">· Zoom 1.0×</span></div>
      </div>

      <div
        className={`cw-viewport relative h-[430px] select-none overflow-hidden sm:h-[540px] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onLostPointerCapture={pointerUp}
        role="application"
        aria-label="Showroom 3D. Geser kiri atau kanan untuk melihat ruangan 360 derajat."
      >
        <div className="cw-horizon absolute inset-0"/>
        <div className="cw-world" style={{ transform: `rotateY(${-yaw}deg)` }}>
          <div className="cw-floor"/>
          <div className="cw-ceiling"/>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="cw-wall" style={{ transform: `rotateY(${index * 60}deg) translateZ(570px)` }}>
              <div className="cw-wall-frame"/>
              <div className="cw-wall-light"/>
              <div className="cw-wall-mark">CYBER WEALTH</div>
            </div>
          ))}
          {samples.map((sample, index) => {
            const angle = (index * (360 / Math.max(samples.length, 1))) + 12
            return (
              <div key={sample.id} className="cw-exhibit" style={{ transform: `rotateY(${angle}deg) translateZ(365px)` }}>
                <div className="cw-object">
                  <div className="cw-object-top"/>
                  <div className="cw-object-front"/>
                  <div className="cw-object-side"/>
                  <div className="cw-object-glow"/>
                </div>
                <div className="cw-plinth"><span/><span/><span/></div>
                <div className="cw-caption">
                  <span>{sample.kind}</span>
                  <strong>{sample.name}</strong>
                  <small>SEALED DISPLAY · PREVIEW</small>
                </div>
              </div>
            )
          })}
          <div className="cw-center-mark"><span>CW</span><small>PRIVATE EXHIBITION</small></div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-4 pb-4 sm:px-6">
          <span className="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[9px] tracking-[.14em] text-white/55 backdrop-blur">DRAG TO ROTATE 360°</span>
          <span className="rounded-full border border-[#c5a66a]/25 bg-black/45 px-3 py-2 text-[9px] tracking-[.14em] text-[#d8bd83] backdrop-blur">NO INTERNAL DETAILS</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-6">
        <p className="max-w-xl text-[11px] leading-5 text-slate-500"><ShieldCheck className="mr-1 inline size-3.5 text-[#c5a66a]"/>Sampel dilindungi. File asli, spesifikasi, struktur, dan detail produksi tidak ditampilkan di showroom.</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => rotate(-35)} className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-[#c5a66a]/50 hover:text-[#d8bd83]" aria-label="Putar ke kiri"><ArrowLeft className="size-4"/></button>
          <button type="button" onClick={() => setYaw(0)} className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-[#c5a66a]/50 hover:text-[#d8bd83]" aria-label="Atur ulang pandangan"><RotateCcw className="size-3.5"/></button>
          <button type="button" onClick={() => rotate(35)} className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-[#c5a66a]/50 hover:text-[#d8bd83]" aria-label="Putar ke kanan"><ArrowRight className="size-4"/></button>
        </div>
      </div>

      <style jsx>{`
        .cw-viewport { perspective: 1050px; perspective-origin: 50% 46%; touch-action: pan-y; background: radial-gradient(ellipse at 50% 42%, #1a2028 0%, #0c1118 48%, #07090d 100%); }
        .cw-horizon { background: radial-gradient(ellipse at 50% 82%, rgba(197,166,106,.13), transparent 42%), linear-gradient(180deg, transparent 48%, rgba(0,0,0,.5)); }
        .cw-world { position:absolute; inset:0; transform-style:preserve-3d; transition:transform .08s linear; }
        .cw-floor { position:absolute; left:50%; top:61%; width:1150px; height:1150px; margin-left:-575px; border-radius:50%; transform:rotateX(90deg) translateZ(-210px); transform-style:preserve-3d; background:repeating-linear-gradient(0deg,rgba(197,166,106,.12) 0 1px,transparent 1px 78px),repeating-linear-gradient(90deg,rgba(197,166,106,.12) 0 1px,transparent 1px 78px),radial-gradient(circle,#202630 0%,#10151d 55%,#080b10 78%); box-shadow:0 0 100px rgba(0,0,0,.8); }
        .cw-ceiling { position:absolute; left:50%; top:40%; width:1000px; height:1000px; margin-left:-500px; border-radius:50%; transform:rotateX(90deg) translateZ(390px); border:1px solid rgba(197,166,106,.12); background:radial-gradient(circle,rgba(197,166,106,.07),transparent 62%); }
        .cw-wall { position:absolute; left:50%; top:10%; width:660px; height:78%; margin-left:-330px; transform-style:preserve-3d; border:1px solid rgba(197,166,106,.24); background:linear-gradient(90deg,rgba(8,12,18,.98),rgba(24,30,38,.96) 50%,rgba(8,12,18,.98)); box-shadow:inset 0 0 70px rgba(0,0,0,.75); }
        .cw-wall-frame { position:absolute; inset:22px; border:1px solid rgba(197,166,106,.18); }
        .cw-wall-light { position:absolute; top:18px; left:18%; right:18%; height:2px; background:linear-gradient(90deg,transparent,#c5a66a,transparent); box-shadow:0 0 22px rgba(197,166,106,.45); }
        .cw-wall-mark { position:absolute; left:50%; top:25%; transform:translateX(-50%); color:rgba(197,166,106,.16); font:600 13px ui-monospace,monospace; letter-spacing:.45em; white-space:nowrap; }
        .cw-exhibit { position:absolute; left:50%; top:40%; width:180px; height:250px; margin-left:-90px; transform-style:preserve-3d; text-align:center; }
        .cw-object { position:relative; width:112px; height:104px; margin:0 auto; transform-style:preserve-3d; filter:drop-shadow(0 0 24px rgba(87,184,185,.13)); }
        .cw-object-top { position:absolute; left:15px; top:0; width:82px; height:35px; transform:rotateX(58deg) translateY(-7px); border:1px solid rgba(221,194,136,.65); background:linear-gradient(135deg,#4b555e,#171e27); }
        .cw-object-front { position:absolute; left:15px; top:17px; width:82px; height:78px; border:1px solid rgba(197,166,106,.55); background:linear-gradient(145deg,rgba(61,78,89,.96),rgba(10,16,24,.98)); box-shadow:inset 0 0 22px rgba(85,214,181,.12); }
        .cw-object-front:after { content:'CW'; position:absolute; inset:0; display:grid; place-items:center; color:rgba(220,189,131,.75); font:600 21px ui-monospace,monospace; letter-spacing:.12em; }
        .cw-object-side { position:absolute; left:97px; top:17px; width:18px; height:78px; transform:skewY(-32deg); transform-origin:left top; background:#10151d; border:1px solid rgba(197,166,106,.25); }
        .cw-object-glow { position:absolute; left:34px; top:44px; width:44px; height:18px; background:rgba(85,214,181,.14); filter:blur(14px); }
        .cw-plinth { position:relative; width:126px; height:36px; margin:-1px auto 0; transform:perspective(180px) rotateX(15deg); border:1px solid rgba(197,166,106,.48); background:linear-gradient(180deg,#3a3a35,#141820); box-shadow:0 16px 30px rgba(0,0,0,.65),0 0 22px rgba(197,166,106,.12); }
        .cw-plinth span { position:absolute; bottom:-26px; width:1px; height:25px; background:rgba(197,166,106,.45); }
        .cw-plinth span:nth-child(1){left:14px}.cw-plinth span:nth-child(2){left:50%}.cw-plinth span:nth-child(3){right:14px}
        .cw-caption { display:grid; justify-items:center; gap:4px; margin-top:31px; padding:8px 10px; border:1px solid rgba(197,166,106,.18); background:rgba(4,7,11,.82); box-shadow:0 8px 20px rgba(0,0,0,.45); }
        .cw-caption span { color:#c5a66a; font:9px ui-monospace,monospace; letter-spacing:.18em; }
        .cw-caption strong { max-width:155px; overflow:hidden; color:#e9e5db; font-size:11px; font-weight:500; text-overflow:ellipsis; white-space:nowrap; }
        .cw-caption small { color:#727b88; font:8px ui-monospace,monospace; letter-spacing:.1em; }
        .cw-center-mark { position:absolute; left:50%; top:51%; display:grid; justify-items:center; gap:5px; transform:translate(-50%,-50%) translateZ(20px); color:rgba(197,166,106,.32); }
        .cw-center-mark span { display:grid; width:68px; height:68px; place-items:center; border:1px solid rgba(197,166,106,.2); border-radius:50%; font:600 20px ui-monospace,monospace; }
        .cw-center-mark small { font:8px ui-monospace,monospace; letter-spacing:.22em; white-space:nowrap; }
        @media(max-width:640px){.cw-wall{width:520px;margin-left:-260px}.cw-exhibit{transform-origin:center center}.cw-floor{top:63%}.cw-caption{max-width:150px}}
      `}</style>
    </section>
  )
}
