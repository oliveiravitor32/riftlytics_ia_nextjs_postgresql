import Image from 'next/image';
import logoDark from '@/src/assets/logo-dark.png';
import logoLight from '@/src/assets/logo-light.png';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="shrink-0" aria-label="Riftlytics, página inicial">
      <div className="block dark:hidden">
        <Image
          src={logoDark}
          alt=""
          width={112}
          className="h-auto w-28"
          priority
        />
      </div>
      <div className="hidden dark:block">
        <Image
          src={logoLight}
          alt=""
          width={112}
          className="h-auto w-28"
          priority
        />
      </div>
    </Link>
  );
}
