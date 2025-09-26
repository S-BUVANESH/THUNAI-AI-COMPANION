export default function Footer() {
  return (
    <footer className="border-t bg-secondary">
      <div className="container py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Product</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#features" className="hover:underline">Features</a></li>
            <li><a href="#how" className="hover:underline">How It Works</a></li>
            <li><a href="#community" className="hover:underline">Community</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#about" className="hover:underline">About Us</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="https://github.com/" target="_blank" rel="noreferrer" className="hover:underline">GitHub</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:underline">Privacy Policy</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-6 text-xs text-foreground/70">© 2025 THUNAI Project</div>
      </div>
    </footer>
  );
}
