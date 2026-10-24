/**
 * The header's account button for real: the browser's Supabase client reads
 * the stored session, /api/me runs through the real route and database, and
 * Supabase Auth is answered by the fake (jest/supabase-mock).
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './header';
import { renderApp } from '@/jest/render-app';
import { prisma } from '@/src/lib/db';
import {
  SUPABASE_TEST_URL,
  fakeSession,
  fakeUser,
} from '@/jest/supabase-mock/server';

// Where supabase-js keeps the session for this project
const STORAGE_KEY = `sb-${new URL(SUPABASE_TEST_URL).hostname.split('.')[0]}-auth-token`;

function signIn(email: string, name = 'Vitor Oliveira') {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(fakeSession(fakeUser({ email, name })))
  );
}

beforeEach(async () => {
  localStorage.clear();
  await prisma.postingAllowlist.deleteMany();
});
afterAll(() => prisma.postingAllowlist.deleteMany());

it('offers the Google sign-in when signed out', async () => {
  renderApp(<Header />);

  expect(
    await screen.findByRole('button', { name: 'Entrar' })
  ).toBeInTheDocument();
});

it('an allowlisted account sees its photo and that it can post', async () => {
  await prisma.postingAllowlist.create({
    data: { email: 'vitor@gmail.com' },
  });
  signIn('vitor@gmail.com');
  const user = userEvent.setup();
  renderApp(<Header />);

  await user.click(
    await screen.findByRole('button', { name: 'Conta de Vitor Oliveira' })
  );

  expect(screen.getByText('vitor@gmail.com')).toBeInTheDocument();
  expect(
    await screen.findByText('Você pode postar na Resenha.')
  ).toBeInTheDocument();
  expect(screen.getByAltText('Foto de Vitor Oliveira')).toHaveAttribute(
    'src',
    expect.stringContaining('googleusercontent')
  );
});

it('anyone else is told to ask for access', async () => {
  signIn('amigo@gmail.com', 'Amigo');
  const user = userEvent.setup();
  renderApp(<Header />);

  await user.click(
    await screen.findByRole('button', { name: 'Conta de Amigo' })
  );

  expect(
    await screen.findByText(/Para postar, peça para liberarem seu e-mail/)
  ).toBeInTheDocument();
});

it('signing out forgets the session and shows "Entrar" again', async () => {
  signIn('amigo@gmail.com', 'Amigo');
  const user = userEvent.setup();
  renderApp(<Header />);

  await user.click(
    await screen.findByRole('button', { name: 'Conta de Amigo' })
  );
  await user.click(screen.getByRole('button', { name: 'Sair' }));

  expect(
    await screen.findByRole('button', { name: 'Entrar' })
  ).toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeNull());
});
