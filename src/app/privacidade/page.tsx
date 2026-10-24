import type { Metadata } from 'next';
import { CONTACT_EMAIL, LegalPage } from '@/src/components/legal-page';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Quais dados o Riftlytics guarda e para quê',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updated="25 de outubro de 2026">
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

      <h2>Resenha</h2>
      <p>
        A Resenha só pode ser lida por quem entrou com o Google. Suas mensagens
        aparecem para essas pessoas junto com seu nome e sua foto. Das reações,
        aparece só quantas pessoas reagiram, não quem.
      </p>
      <p>Para proteger o que você escreve:</p>
      <ul>
        <li>
          o texto das mensagens, seu nome e sua foto são guardados
          criptografados (AES-256), ilegíveis para quem tiver acesso direto ao
          banco de dados;
        </li>
        <li>seu e-mail não é guardado junto com as mensagens;</li>
        <li>
          apagar uma mensagem remove ela de verdade do banco, junto com as
          reações; respostas a ela continuam, sem a citação.
        </li>
      </ul>

      <h2>Vídeos na Resenha</h2>
      <p>
        Links do YouTube, Medal e Streamable aparecem como player dentro da
        mensagem. Esses players são dos próprios serviços: ao dar play, eles
        podem registrar dados de acesso conforme a política de privacidade de
        cada um. O YouTube é carregado no modo de privacidade aprimorada, que
        não grava cookies antes do play.
      </p>

      <h2>Para que usamos (base legal)</h2>
      <p>
        Tratamos esses dados com base no seu consentimento ao entrar com o
        Google (LGPD, art. 7º, I), apenas para identificar você e fazer a
        Resenha funcionar. Coletamos o mínimo necessário e não usamos os dados
        para publicidade nem perfilamento.
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

      <h2>Seus direitos</h2>
      <p>
        Pela LGPD (art. 18), você pode pedir para ver, corrigir ou apagar seus
        dados e retirar seu consentimento a qualquer momento.
      </p>

      <h2>Apagar seus dados</h2>
      <p>
        Você mesmo pode apagar suas mensagens na Resenha. Para apagar sua conta
        e tudo o que publicou, escreva para{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        . Você também pode remover o acesso do Riftlytics na sua conta Google,
        em Segurança → Apps de terceiros.
      </p>
    </LegalPage>
  );
}
