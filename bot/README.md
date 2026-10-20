# Bot do WhatsApp (resumo diário)

Todo dia às **23:30 (Brasília)** o workflow `Resumo diário`
(`.github/workflows/resumo-diario.yml`) roda no GitHub Actions:

1. chama `/api/cron/fechamento` (PDL final do dia + partidas novas);
2. pede o texto em `/api/resumo` e manda no grupo do WhatsApp.

O bot usa a biblioteca **não oficial** Baileys: use um **número só para o bot**
(o WhatsApp pode banir números que usam bots). A sessão fica criptografada na
tabela `bot_session` do Supabase, com a chave `BOT_SESSION_KEY`.

## Configuração (uma vez)

1. **Coloque o número do bot no grupo** de vocês.
2. **Vincule o número** (no seu computador, na raiz do projeto, com o
   `.env.local` preenchido):

   ```bash
   cd bot
   npm install
   npm run login -- 55DDDNUMERO
   ```

   No celular do bot: WhatsApp → **Aparelhos conectados** → **Conectar
   aparelho** → **Conectar com número de telefone**, e digite o código que
   aparecer no terminal. No fim, o terminal lista os grupos com o
   `WHATSAPP_GROUP_ID` de cada um.

3. **Cadastre os secrets** no GitHub (Settings → Secrets and variables →
   Actions → New repository secret):

   | Secret              | Valor                                                      |
   | ------------------- | ---------------------------------------------------------- |
   | `APP_URL`           | endereço do site na Vercel (ex.: `https://....vercel.app`) |
   | `CRON_SECRET`       | o mesmo do `.env.local` e da Vercel                        |
   | `DIRECT_URL`        | o mesmo do `.env.local`                                    |
   | `BOT_SESSION_KEY`   | o mesmo do `.env.local`                                    |
   | `WHATSAPP_GROUP_ID` | o id do grupo listado no passo 2                           |

4. **Teste**: na aba Actions do GitHub, abra `Resumo diário` → **Run
   workflow**. O campo **Dia do resumo** é opcional: vazio manda o resumo de
   hoje (com o fechamento do dia antes); com uma data (`AAAA-MM-DD`) manda o
   resumo daquele dia, útil para testar ou reenviar.

## Manutenção

- Abra o WhatsApp no celular do bot de vez em quando: depois de ~14 dias sem
  uso, o WhatsApp desconecta os aparelhos vinculados. Se isso acontecer, o
  workflow falha com "rode `npm run login` de novo"; repita o passo 2.
- Dia sem novidade (ninguém jogou, ninguém mudou de elo) não gera mensagem.
