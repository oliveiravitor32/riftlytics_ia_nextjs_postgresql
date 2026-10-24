import type { Metadata } from 'next';
import { CONTACT_EMAIL, LegalPage } from '@/src/components/legal-page';

export const metadata: Metadata = {
  title: 'Termos de Serviço',
  description: 'Regras de uso do Riftlytics',
};

export default function TermsPage() {
  return (
    <LegalPage title="Termos de Serviço" updated="24 de outubro de 2026">
      <p>
        O Riftlytics é um projeto pessoal e gratuito, feito para um grupo de
        amigos. Ao usar o site, você concorda com estas regras.
      </p>

      <h2>Uso</h2>
      <ul>
        <li>
          Qualquer pessoa pode ver as estatísticas. A Resenha pode ser lida por
          quem entrar com o Google.
        </li>
        <li>
          Postar, responder e reagir na Resenha é permitido só para contas
          liberadas pelo administrador, que pode liberar ou retirar o acesso a
          qualquer momento.
        </li>
        <li>
          Não publique conteúdo ilegal, ofensivo de verdade, com dados de outras
          pessoas ou que não seja seu. O administrador pode apagar qualquer
          mensagem.
        </li>
      </ul>

      <h2>Sem garantias</h2>
      <p>
        O site é oferecido como está, sem garantia de funcionamento contínuo. Os
        dados de jogo vêm da Riot Games e podem atrasar ou conter erros. As
        dicas de matchup são geradas por IA e podem estar erradas.
      </p>

      <h2>Riot Games</h2>
      <p>
        O Riftlytics não é endossado pela Riot Games e não reflete as opiniões
        da Riot Games nem de ninguém envolvido oficialmente na produção ou
        gestão de League of Legends. League of Legends e Riot Games são marcas
        registradas da Riot Games, Inc.
      </p>

      <h2>Contato</h2>
      <p>
        Dúvidas:{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPage>
  );
}
