export default function Footer() {
  return (
    <footer className="border-t bg-secondary">
      <div className="container grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Product</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/" className="hover:underline">
                Home
              </a>
            </li>
            <li>
              <a href="/diagnostics" className="hover:underline">
                Disease Diagnostics
              </a>
            </li>
            <li>
              <a href="/crop-switch" className="hover:underline">
                Crop Switch
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Company</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/#about" className="hover:underline">
                About Us
              </a>
            </li>
            <li>
              <a href="/#community" className="hover:underline">
                Community
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://github.com/SBH1928/THUNAI.AI"
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                GitHub
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="hover:underline">
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="container py-6 text-xs text-foreground/70">
          (c) 2026 THUNAI Project
        </div>
      </div>
    </footer>
  );
}
