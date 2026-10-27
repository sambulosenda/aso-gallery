export default function Submit() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Add an app</h1>
      <p className="text-muted">
        Paste an App Store or Google Play link. We pull its screenshots, product page header and search banner, tag them, and add them to the gallery.
      </p>
      <form className="space-y-3">
        <input required type="url" placeholder="https://apps.apple.com/app/id…" className="w-full rounded-lg border border-line bg-panel px-3 py-2" />
        <input type="email" placeholder="Your email (we'll tell you when it's live)" className="w-full rounded-lg border border-line bg-panel px-3 py-2" />
        <button type="button" className="w-full rounded-lg bg-accent px-3 py-2 font-semibold text-ink">Submit</button>
      </form>
      <p className="text-xs text-muted">Prototype: submissions aren&apos;t stored yet.</p>
    </div>
  );
}
