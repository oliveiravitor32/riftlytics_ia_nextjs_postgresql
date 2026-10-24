/**
 * The Resenha page for real: the browser's Supabase client reads the stored
 * session, /api/posts and /api/me run through the real routes and database,
 * Supabase Auth answered by the fake (jest/supabase-mock).
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResenhaPage, { metadata } from './page';
import { renderApp } from '@/jest/render-app';
import { prisma } from '@/src/lib/db';
import { encryptField } from '@/src/lib/resenha-crypto';
import { POSTS_PAGE_SIZE } from '@/src/lib/resenha';
import {
  SUPABASE_TEST_URL,
  fakeSession,
  fakeUser,
} from '@/jest/supabase-mock/server';

const STORAGE_KEY = `sb-${new URL(SUPABASE_TEST_URL).hostname.split('.')[0]}-auth-token`;

function signIn(email: string, name: string) {
  const session = fakeSession(fakeUser({ email, name }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session.user;
}

/** A message already in the database, by someone else */
async function seed(text: string, name = 'Amigo', minutesAgo = 1) {
  const author = await prisma.resenhaAuthor.upsert({
    where: { id: `autor-${name}` },
    create: { id: `autor-${name}`, name: encryptField(name) },
    update: {},
  });
  return prisma.resenhaPost.create({
    data: {
      authorId: author.id,
      body: encryptField(text),
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
    },
  });
}

beforeEach(async () => {
  localStorage.clear();
  await prisma.resenhaPost.deleteMany();
  await prisma.resenhaAuthor.deleteMany();
  await prisma.postingAllowlist.deleteMany();
});
afterAll(async () => {
  await prisma.resenhaPost.deleteMany();
  await prisma.resenhaAuthor.deleteMany();
  await prisma.postingAllowlist.deleteMany();
});

const messages = () => screen.findByRole('list', { name: 'Mensagens' });

it('signed out, it asks to sign in and shows no message', async () => {
  await seed('segredo do grupo');
  renderApp(<ResenhaPage />);

  expect(
    await screen.findByRole('button', { name: 'Entrar com Google' })
  ).toBeInTheDocument();
  expect(screen.queryByText('segredo do grupo')).not.toBeInTheDocument();
});

it('shows the messages oldest first, the same author grouped like Discord', async () => {
  await seed('primeira', 'Amigo', 10);
  await seed('segunda', 'Amigo', 9);
  await seed('do outro', 'Outro', 8);
  signIn('leitor@gmail.com', 'Leitor');
  renderApp(<ResenhaPage />);

  const items = within(await messages()).getAllByRole('listitem');
  expect(
    items.map((li) => li.querySelector('p:last-child')!.textContent)
  ).toEqual(['primeira', 'segunda', 'do outro']);
  // Name only on the first message of each group
  expect(within(items[0]).getByText('Amigo')).toBeInTheDocument();
  expect(within(items[1]).queryByText('Amigo')).not.toBeInTheDocument();
  expect(within(items[2]).getByText('Outro')).toBeInTheDocument();
});

it('someone not released reads, but has no box to write', async () => {
  await seed('oi');
  signIn('leitor@gmail.com', 'Leitor');
  renderApp(<ResenhaPage />);

  await messages();
  expect(
    await screen.findByText(/Para postar, peça para liberarem seu e-mail/)
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('textbox', { name: 'Mensagem' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Apagar mensagem' })
  ).not.toBeInTheDocument();
});

it('a released account sends with Enter; Shift+Enter breaks the line', async () => {
  await prisma.postingAllowlist.create({ data: { email: 'vitor@gmail.com' } });
  signIn('vitor@gmail.com', 'Vitor');
  const user = userEvent.setup();
  renderApp(<ResenhaPage />);

  const box = await screen.findByRole('textbox', { name: 'Mensagem' });
  await user.type(box, 'Que Yasuo{Shift>}{Enter}{/Shift}criminoso! XD{Enter}');

  const sent = await screen.findByText(/Que Yasuo\s+criminoso! XD/);
  expect(sent.textContent).toBe('Que Yasuo\ncriminoso! XD');
  expect(box).toHaveValue('');
  expect(within(await messages()).getByText('Vitor')).toBeInTheDocument();
});

it('deletes your own message after confirming', async () => {
  await prisma.postingAllowlist.create({ data: { email: 'vitor@gmail.com' } });
  signIn('vitor@gmail.com', 'Vitor');
  const user = userEvent.setup();
  renderApp(<ResenhaPage />);

  await user.type(
    await screen.findByRole('textbox', { name: 'Mensagem' }),
    'apaga isso{Enter}'
  );
  await user.click(
    await screen.findByRole('button', { name: 'Apagar mensagem' })
  );
  const dialog = screen.getByRole('dialog', { name: 'Apagar mensagem?' });
  await user.click(within(dialog).getByRole('button', { name: 'Apagar' }));

  await waitFor(async () => expect(await prisma.resenhaPost.count()).toBe(0));
  await waitFor(() =>
    expect(screen.queryByText('apaga isso')).not.toBeInTheDocument()
  );
});

it('loads older messages on request', async () => {
  for (let i = 0; i <= POSTS_PAGE_SIZE; i++) {
    await seed(`msg ${i}`, 'Amigo', 100 - i);
  }
  signIn('leitor@gmail.com', 'Leitor');
  const user = userEvent.setup();
  renderApp(<ResenhaPage />);

  await messages();
  expect(screen.queryByText('msg 0')).not.toBeInTheDocument();
  await user.click(
    screen.getByRole('button', { name: 'Carregar mensagens anteriores' })
  );

  expect(await screen.findByText('msg 0')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Carregar mensagens anteriores' })
  ).not.toBeInTheDocument();
});

it('has a page title for the browser tab', () => {
  expect(metadata.title).toBe('Resenha');
});

describe('replies and reactions', () => {
  beforeEach(() =>
    prisma.postingAllowlist.create({ data: { email: 'vitor@gmail.com' } })
  );

  it('replies to a message: the reply quotes who it answers', async () => {
    await seed('Que Yasuo criminoso!', 'Amigo');
    signIn('vitor@gmail.com', 'Vitor');
    const user = userEvent.setup();
    renderApp(<ResenhaPage />);

    const original = within(await messages()).getByRole('listitem', {
      name: 'Mensagem de Amigo',
    });
    await user.click(
      within(original).getByRole('button', { name: 'Responder' })
    );
    expect(screen.getByText(/Respondendo a/)).toHaveTextContent(
      'Respondendo a Amigo'
    );
    await user.keyboard('kkkkk{Enter}');

    const quote = await screen.findByLabelText('Respondendo a Amigo');
    expect(quote).toHaveTextContent('Que Yasuo criminoso!');
    expect(quote.closest('li')).toHaveTextContent('kkkkk');
    // The bar above the box is gone after sending
    expect(screen.queryByText(/^Respondendo a$/)).not.toBeInTheDocument();
  });

  it('Esc or the X cancels a reply', async () => {
    await seed('oi', 'Amigo');
    signIn('vitor@gmail.com', 'Vitor');
    const user = userEvent.setup();
    renderApp(<ResenhaPage />);

    await user.click(
      within(await messages()).getByRole('button', { name: 'Responder' })
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar resposta' }));
    expect(
      screen.queryByRole('button', { name: 'Cancelar resposta' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Responder' }));
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('button', { name: 'Cancelar resposta' })
    ).not.toBeInTheDocument();
  });

  it('reacts from the picker, then the chip takes it back', async () => {
    await seed('jogada', 'Amigo');
    signIn('vitor@gmail.com', 'Vitor');
    const user = userEvent.setup();
    renderApp(<ResenhaPage />);

    await user.click(
      within(await messages()).getByRole('button', { name: 'Reagir' })
    );
    await user.click(screen.getByRole('button', { name: 'Reagir com 🔥' }));

    const chip = await screen.findByRole('button', { name: '🔥 1' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.click(chip);
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: '🔥 1' })
      ).not.toBeInTheDocument()
    );
    expect(await prisma.resenhaReaction.count()).toBe(0);
  });

  it('a reader sees reactions but cannot react or reply', async () => {
    await prisma.postingAllowlist.deleteMany();
    const post = await seed('jogada', 'Amigo');
    await prisma.resenhaReaction.create({
      data: { postId: post.id, userId: 'outra-conta', emoji: '😂' },
    });
    signIn('leitor@gmail.com', 'Leitor');
    renderApp(<ResenhaPage />);

    const chip = await screen.findByRole('button', { name: '😂 1' });
    expect(chip).toBeDisabled();
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.queryByRole('button', { name: 'Responder' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reagir' })
    ).not.toBeInTheDocument();
  });
});

it('plays YouTube, Medal and Streamable links inside the message; other links just open', async () => {
  await seed(
    'olha isso https://youtu.be/dQw4w9WgXcQ?t=90 e https://exemplo.com/pagina'
  );
  signIn('leitor@gmail.com', 'Leitor');
  renderApp(<ResenhaPage />);

  const player = await screen.findByTitle('Vídeo do YouTube');
  expect(player).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90'
  );
  const link = screen.getByRole('link', { name: 'https://exemplo.com/pagina' });
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  expect(screen.getAllByTitle(/^Vídeo do/)).toHaveLength(1);
});
