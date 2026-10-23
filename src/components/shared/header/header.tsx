import Logo from '../../logo';
import ThemeToggle from '../../theme-toggle';
import NavMenu from './nav-menu';
import AuthButton from './auth-button';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      {/* Phones: logo and theme on top, links on their own line below */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 md:h-14 md:flex-nowrap md:py-0">
        <Logo />
        <div className="order-last w-full md:order-none md:w-auto">
          <NavMenu />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
