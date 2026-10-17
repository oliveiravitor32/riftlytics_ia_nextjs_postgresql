import Logo from '../../logo';
import ThemeToggle from '../../theme-toggle';
import NavMenu from './nav-menu';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 md:h-14 md:flex-nowrap md:py-0">
        <Logo />
        <NavMenu />

        <div className="ml-auto md:order-last md:ml-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
