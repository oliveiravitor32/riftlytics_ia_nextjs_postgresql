import type { Metadata } from 'next';
import { CONTACT_EMAIL, LegalPage } from '@/src/components/legal-page';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Quais dados o Riftlytics guarda e para quê',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updated="23 de outubro de 2026">
      <p>
        O Riftlytics é um site sem fins lucrativos feito para um grupo de amigos
        acompanhar suas estatísticas de League of Legends. Esta página explica
        quais dados ele guarda.
      </p>

      <h2>Login com Google</h2>
      <p>
        Quem entra com o Google nos passa apenas o que o Google libera para
        login básico:
      </p>
      <ul>
        <li>nome;</li>
        <li>endereço de e-mail;</li>
        <li>foto do perfil.</li>
      </ul>
      <p>
        Usamos esses dados só para mostrar quem você é no site e para saber se
        você tem permissão para postar na Resenha. Não acessamos seus contatos,
        arquivos, agenda nem nada além disso.
      </p>

      <h2>O que você publica</h2>
      <p>
        Mensagens que você posta na Resenha ficam visíveis para quem acessa o
        site, junto com seu nome e sua foto.
      </p>

      <h2>Dados de League of Legends</h2>
      <p>
        Estatísticas, elos e partidas dos jogadores do grupo vêm da API pública
        da Riot Games e são guardados para montar o histórico.
      </p>

      <h2>Onde os dados ficam</h2>
      <p>
        Os dados ficam em serviços usados para hospedar o site (Supabase, Vercel
        e Upstash). Não vendemos, alugamos nem compartilhamos seus dados com
        ninguém para publicidade.
      </p>

      <h2>Sessão no navegador</h2>
      <p>
        Para manter você conectado, o navegador guarda um token de sessão. Sair
        da conta apaga esse token. Não usamos cookies de rastreamento nem de
        anúncios.
      </p>

      <h2>Apagar seus dados</h2>
      <p>
        Para apagar sua conta e o que você publicou, escreva para{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        . Você também pode remover o acesso do Riftlytics na sua conta Google,
        em Segurança → Apps de terceiros.
      </p>
    </LegalPage>
  );
}
