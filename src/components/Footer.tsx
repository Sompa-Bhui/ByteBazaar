export default function Footer() {
  return (
    <footer className="border-t py-8 mt-12">
      <div className="container text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ByteBazaar — Developer Workspace Marketplace
      </div>
    </footer>
  );
}
