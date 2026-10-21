import Link from 'next/link';

export default function ProfileNotFound() {
  return (
    <div className="mx-auto max-w-5xl space-y-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Invocador não encontrado</h1>
      <p className="mx-auto max-w-prose text-muted-foreground">
        Confira o nome, a tag (ex.: Nome#BR1) e a região selecionada.
      </p>
      <Link href="/" className="text-primary hover:underline">
        Voltar para o início
      </Link>
    </div>
  );
}
