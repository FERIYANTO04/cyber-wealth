import { useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, Eye, RotateCcw, ShieldCheck } from 'lucide-react'

export type ShowroomSample = { id: string; name: string; kind: 'PRODUCT' | 'STUDIO' }

export function VirtualShowroom({ samples }: { samples: ShowroomSample[] }) {
  const [yaw, setYaw] = useState(0)
  const [pitch, setPitch] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const activeSample = samples[selectedIndex] ?? { id: 'cw-showcase', name: 'Cyber Wealth Object', kind: 'PRODUCT' as const }
  const [dragging, setDragging] = useState(false)
  const lastX = useRef<number | null>(null)
  const lastY = useRef<number | null>(null)

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    lastX.current = event.clientX
    lastY.current = event.clientY
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (lastX.current === null) return
    const deltaX = event.clientX - lastX.current
    const deltaY = event.clientY - (lastY.current ?? event.clientY)
    lastX.current = event.clientX
    lastY.current = event.clientY
    setYaw(value => (value + deltaX * 0.34) % 360)
    setPitch(value => Math.max(-55, Math.min(55, value - deltaY * 0.28)))
  }
  function pointerUp() {
    lastX.current = null
    lastY.current = null
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
          <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#d8bd83]">Cyber Wealth / 3D Studio</p><p className="mt-1 text-[11px] text-slate-500">Central object · 360° viewing</p></div>
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
        aria-label="Showroom 3D. Geser untuk memutar objek 360 derajat. Latar dan panggung tetap diam."
      >
        <div className="cw-horizon absolute inset-0"/>
        <div className="cw-world">
          <div className="cw-floor"/>
          <div className="cw-ceiling"/>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="cw-wall" style={{ transform: `rotateY(${index * 60}deg) translateZ(570px)` }}>
              <div className="cw-wall-frame"/>
              <div className="cw-wall-light"/>
              <div className="cw-wall-mark">CYBER WEALTH</div>
            </div>
          ))}
          <div className="cw-exhibit cw-center-exhibit" style={{ transform: 'translateZ(0)' }}>
            <div className="cw-object-rotator" style={{ transform: `rotateX(${pitch}deg) rotateY(${-yaw}deg)` }}>
            <div className={`cw-object cw-object-${selectedIndex % 4}`}>
              <div className="cw-object-top"/>
              <div className="cw-object-front"/>
              <div className="cw-object-side"/>
              <div className="cw-object-glow"/>
            </div>
            </div>
            <div className="cw-plinth"><span/><span/><span/></div>
            <div className="cw-caption">
              <span>{activeSample.kind}</span>
              <strong>{activeSample.name}</strong>
              <small>360° CENTRAL EXHIBIT</small>
            </div>
          </div>

        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-4 pb-4 sm:px-6">
          <span className="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[9px] tracking-[.14em] text-white/55 backdrop-blur">DRAG: ROTATE OBJECT</span>
          <span className="rounded-full border border-[#c5a66a]/25 bg-black/45 px-3 py-2 text-[9px] tracking-[.14em] text-[#d8bd83] backdrop-blur">OBJECT CENTER STAGE</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-6">
        <p className="max-w-xl text-[11px] leading-5 text-slate-500"><ShieldCheck className="mr-1 inline size-3.5 text-[#c5a66a]"/>Objek dipajang di tengah ruangan. Geser untuk memutar objek 360°. Latar dan panggung tetap diam.</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSelectedIndex(value => samples.length ? (value - 1 + samples.length) % samples.length : 0)} className="flex h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-[9px] text-slate-300" aria-label="Objek sebelumnya">PREV</button>
          <button type="button" onClick={() => rotate(-35)} className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-[#c5a66a]/50 hover:text-[#d8bd83]" aria-label="Putar ke kiri"><ArrowLeft className="size-4"/></button>
          <button type="button" onClick={() => setPitch(value => Math.max(-55, value - 12))} className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-[#c5a66a]/50 hover:text-[#d8bd83]" aria-label="Lihat lebih ke atas"><ArrowUp className="size-4"/></button>
          <button type="button" onClick={() => { setYaw(0); setPitch(0) }} className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-[#c5a66a]/50 hover:text-[#d8bd83]" aria-label="Atur ulang pandangan"><RotateCcw className="size-3.5"/></button>
          <button type="button" onClick={() => setPitch(value => Math.min(55, value + 12))} className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-[#c5a66a]/50 hover:text-[#d8bd83]" aria-label="Lihat lebih ke bawah"><ArrowDown className="size-4"/></button>
          <button type="button" onClick={() => rotate(35)} className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-[#c5a66a]/50 hover:text-[#d8bd83]" aria-label="Putar ke kanan"><ArrowRight className="size-4"/></button>
          <button type="button" onClick={() => setSelectedIndex(value => samples.length ? (value + 1) % samples.length : 0)} className="flex h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-[9px] text-slate-300" aria-label="Objek berikutnya">NEXT</button>
        </div>
      </div>

      <style jsx>{`
        .cw-viewport { perspective: 1050px; perspective-origin: 50% 46%; touch-action: pan-y; background: radial-gradient(ellipse at 50% 42%, #1a2028 0%, #0c1118 48%, #07090d 100%); }
        .cw-horizon { background: radial-gradient(ellipse at 50% 82%, rgba(197,166,106,.13), transparent 42%), linear-gradient(180deg, transparent 48%, rgba(0,0,0,.5)); }
        .cw-world { position:absolute; inset:0; transform-style:preserve-3d; }
        .cw-object-rotator { position:relative; width:100%; height:104px; transform-style:preserve-3d; transition:transform .08s linear; }
        .cw-floor { position:absolute; left:50%; top:61%; width:1150px; height:1150px; margin-left:-575px; border-radius:50%; transform:rotateX(90deg) translateZ(-210px); transform-style:preserve-3d; background:repeating-linear-gradient(0deg,rgba(197,166,106,.12) 0 1px,transparent 1px 78px),repeating-linear-gradient(90deg,rgba(197,166,106,.12) 0 1px,transparent 1px 78px),radial-gradient(circle,#202630 0%,#10151d 55%,#080b10 78%); box-shadow:0 0 100px rgba(0,0,0,.8); }
        .cw-ceiling { position:absolute; left:50%; top:40%; width:1000px; height:1000px; margin-left:-500px; border-radius:50%; transform:rotateX(90deg) translateZ(390px); border:1px solid rgba(197,166,106,.12); background:radial-gradient(circle,rgba(197,166,106,.07),transparent 62%); }
        .cw-wall { position:absolute; left:50%; top:10%; width:660px; height:78%; margin-left:-330px; transform-style:preserve-3d; border:1px solid rgba(197,166,106,.24); background:linear-gradient(90deg,rgba(8,12,18,.98),rgba(24,30,38,.96) 50%,rgba(8,12,18,.98)); box-shadow:inset 0 0 70px rgba(0,0,0,.75); }
        .cw-wall-frame { position:absolute; inset:22px; border:1px solid rgba(197,166,106,.18); }
        .cw-wall-light { position:absolute; top:18px; left:18%; right:18%; height:2px; background:linear-gradient(90deg,transparent,#c5a66a,transparent); box-shadow:0 0 22px rgba(197,166,106,.45); }
        .cw-wall-mark { position:absolute; left:50%; top:25%; transform:translateX(-50%); color:rgba(197,166,106,.16); font:600 13px ui-monospace,monospace; letter-spacing:.45em; white-space:nowrap; }
        .cw-exhibit { position:absolute; left:50%; top:40%; width:180px; height:250px; margin-left:-90px; transform-style:preserve-3d; text-align:center; }
        .cw-center-exhibit { top:34%; transform-style:preserve-3d; filter:drop-shadow(0 18px 34px rgba(0,0,0,.45)); }
        .cw-center-exhibit .cw-object { transform:scale(1.38); transform-origin:50% 80%; }
        .cw-center-exhibit .cw-plinth { transform:perspective(180px) rotateX(15deg) scale(1.22); }
        .cw-center-exhibit .cw-caption { margin-top:38px; }
        .cw-object { position:relative; width:112px; height:104px; margin:0 auto; transform-style:preserve-3d; filter:drop-shadow(0 0 24px rgba(87,184,185,.13)); }
        .cw-object-top { position:absolute; left:15px; top:0; width:82px; height:35px; transform:rotateX(58deg) translateY(-7px); border:1px solid rgba(221,194,136,.65); background:linear-gradient(135deg,#4b555e,#171e27); }
        .cw-object-front { position:absolute; left:15px; top:17px; width:82px; height:78px; border:1px solid rgba(197,166,106,.55); background:linear-gradient(145deg,rgba(61,78,89,.96),rgba(10,16,24,.98)); box-shadow:inset 0 0 22px rgba(85,214,181,.12); }
        .cw-object-front:after { content:'CW'; position:absolute; inset:0; display:grid; place-items:center; color:rgba(220,189,131,.75); font:600 21px ui-monospace,monospace; letter-spacing:.12em; }
        .cw-object-side { position:absolute; left:97px; top:17px; width:18px; height:78px; transform:skewY(-32deg); transform-origin:left top; background:#10151d; border:1px solid rgba(197,166,106,.25); }
        .cw-object-glow { position:absolute; left:34px; top:44px; width:44px; height:18px; background:rgba(85,214,181,.14); filter:blur(14px); }
        .cw-object-1 { width:90px; height:118px; }
        .cw-object-1 .cw-object-top { left:9px; width:70px; height:25px; transform:rotateX(58deg) translateY(-5px); }
        .cw-object-1 .cw-object-front { left:9px; top:12px; width:70px; height:98px; border-radius:3px; background:linear-gradient(145deg,#514638,#151a21); }
        .cw-object-1 .cw-object-side { left:79px; top:12px; height:98px; }
        .cw-object-2 { width:116px; height:110px; }
        .cw-object-2 .cw-object-front { left:20px; top:10px; width:76px; height:76px; border-radius:50%; background:radial-gradient(circle at 35% 30%,#77818a,#25313a 45%,#0c1219 78%); }
        .cw-object-2 .cw-object-front:after { content:'◈'; color:rgba(220,189,131,.8); font-size:30px; }
        .cw-object-2 .cw-object-side { display:none; }
        .cw-object-3 { width:120px; height:105px; }
        .cw-object-3 .cw-object-front { left:8px; top:25px; width:96px; height:62px; transform:skewY(-8deg); background:linear-gradient(135deg,#3e5a5a,#101a22); }
        .cw-object-3 .cw-object-front:after { content:'PREVIEW'; font-size:10px; letter-spacing:.16em; }
        .cw-object-3 .cw-object-side { left:104px; top:25px; height:62px; }
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
