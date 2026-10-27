export default function Submit() {
  return (
    <div className="mx-auto max-w-xl pt-20 md:pt-28">
      <p className="eyebrow mb-5 text-accent">Add an app</p>
      <h1 className="text-[clamp(40px,5vw,64px)] font-semibold leading-[0.95] tracking-[-0.045em]">Missing an app? <span className="text-[#6e6e6a]">Send it over.</span></h1>
      <p className="mt-5 text-[17px] leading-relaxed text-soft">
        Paste an App Store or Google Play link. We pull its screenshots, product page header and search banner, tag them, and add them to the gallery.
      </p>
      <form className="mt-10 space-y-3">
        <label className="block">
          <span className="eyebrow text-muted">Store link</span>
          <input required type="url" placeholder="https://apps.apple.com/app/id…" className="mt-2 h-12 w-full rounded-full border border-edge bg-panel px-5 outline-none focus:border-accent" />
        </label>
        <label className="block">
          <span className="eyebrow text-muted">Email (we&apos;ll tell you when it&apos;s live)</span>
          <input type="email" placeholder="you@studio.com" className="mt-2 h-12 w-full rounded-full border border-edge bg-panel px-5 outline-none focus:border-accent" />
        </label>
        <button type="button" className="mt-3 h-12 w-full rounded-full bg-accent font-semibold text-ink">Submit</button>
      </form>
      <p className="mt-4 text-xs text-muted">Prototype: submissions aren&apos;t stored yet.</p>
    </div>
  );
}
