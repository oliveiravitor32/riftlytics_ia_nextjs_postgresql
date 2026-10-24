/**
 * Privacy policy and terms: the pages Google's consent screen links to.
 */

import { render, screen } from '@testing-library/react';
import PrivacyPage, { metadata as privacy } from './privacidade/page';
import TermsPage, { metadata as terms } from './termos/page';
import { CONTACT_EMAIL } from '@/src/components/legal-page';

it('the privacy policy lists the Google data kept and how to delete it', () => {
  render(<PrivacyPage />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' })
  ).toBeInTheDocument();
  for (const item of ['nome;', 'endereço de e-mail;', 'foto do perfil.']) {
    expect(screen.getByText(item)).toBeInTheDocument();
  }
  expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute(
    'href',
    `mailto:${CONTACT_EMAIL}`
  );
  expect(privacy.title).toBe('Política de Privacidade');
});

it('the terms say who may post and carry the Riot disclaimer', () => {
  render(<TermsPage />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Termos de Serviço' })
  ).toBeInTheDocument();
  expect(screen.getByText(/liberadas pelo/)).toBeInTheDocument();
  expect(
    screen.getByText(/não é endossado pela Riot Games/)
  ).toBeInTheDocument();
  expect(terms.title).toBe('Termos de Serviço');
});
