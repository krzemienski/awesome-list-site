import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built with <a href="https://reactjs.org" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">React</a> and <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">shadcn/ui</a>.
        </p>
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-right">
          <Link href="/about" className="font-medium underline underline-offset-4">About</Link>
        </p>
      </div>
    </footer>
  );
}
