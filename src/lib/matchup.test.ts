import {
  LEVELS,
  MATCHUP_ROWS,
  buildMatchupPrompt,
  orderPair,
  orientTip,
  parseMatchupTip,
  splitBold,
  type MatchupTip,
} from './matchup';

const tip: MatchupTip = {
  vantagem: { quem: 'a', motivo: 'Fumaça anula o combo' },
  trocas: { curtas: 'b', longas: 'a' },
  jungle: 'igual',
  roaming: 'b',
  dificuldade: { a: 'Fácil', b: 'Difícil' },
  linhas: MATCHUP_ROWS.map((aspecto) => ({
    aspecto,
    a: `Akali: **${aspecto}**`,
    b: `Katarina: ${aspecto}`,
  })),
};

describe('orderPair', () => {
  it('stores the pair in alphabetical order, so A×B and B×A are one row', () => {
    expect(orderPair('Katarina', 'Akali')).toEqual({
      champA: 'Akali',
      champB: 'Katarina',
      swapped: true,
    });
    expect(orderPair('Akali', 'Katarina').swapped).toBe(false);
  });
});

describe('orientTip', () => {
  it('keeps the tip as is when the order matches', () => {
    expect(orientTip(tip, false)).toEqual(tip);
  });

  it('swaps every side, difficulty and column when the user asked B×A', () => {
    const swapped = orientTip(tip, true);
    expect(swapped.vantagem).toEqual({
      quem: 'b',
      motivo: tip.vantagem.motivo,
    });
    expect(swapped.trocas).toEqual({ curtas: 'a', longas: 'b' });
    expect(swapped.jungle).toBe('igual');
    expect(swapped.roaming).toBe('a');
    expect(swapped.dificuldade).toEqual({ a: 'Difícil', b: 'Fácil' });
    expect(swapped.linhas[0]).toEqual({
      aspecto: MATCHUP_ROWS[0],
      a: tip.linhas[0].b,
      b: tip.linhas[0].a,
    });
  });
});

describe('buildMatchupPrompt', () => {
  it('names both champions, every row, short trades vs long trades and the writing rules', () => {
    const prompt = buildMatchupPrompt('Akali', 'Katarina');
    expect(prompt).toContain('Akali (a) vs Katarina (b)');
    for (const row of MATCHUP_ROWS) expect(prompt).toContain(row);
    expect(prompt).toMatch(/trocas curtas/);
    expect(prompt).toMatch(/trocas longas/);
    expect(prompt).toMatch(/acentuação/);
    expect(prompt).toMatch(/nunca invente/);
    expect(prompt).toContain(LEVELS.join(', '));
  });
});

describe('parseMatchupTip', () => {
  it('accepts the JSON text or an already parsed value', () => {
    expect(parseMatchupTip(JSON.stringify(tip))).toEqual(tip);
    expect(parseMatchupTip(tip)).toEqual(tip);
  });

  it('rejects anything else', () => {
    const bad = (change: Partial<MatchupTip>) =>
      expect(() => parseMatchupTip({ ...tip, ...change })).toThrow();

    expect(() => parseMatchupTip('Katarina é fraca')).toThrow();
    // The old format (8 rows, no summary) is not a tip anymore
    expect(() =>
      parseMatchupTip({ linhas: [{ aspecto: 'Vantagem', a: 'x', b: 'y' }] })
    ).toThrow();
    bad({ jungle: 'Akali' as never });
    bad({ dificuldade: { a: 'Impossível' as never, b: 'Fácil' } });
    bad({ linhas: tip.linhas.slice(1) });
    bad({ linhas: [{ ...tip.linhas[0], a: '' }, ...tip.linhas.slice(1)] });
    bad({
      linhas: [
        { ...tip.linhas[0], a: Array(30).fill('palavra').join(' ') },
        ...tip.linhas.slice(1),
      ],
    });
  });
});

describe('splitBold', () => {
  it('splits the **marked** word out for bold rendering', () => {
    expect(splitBold('Espere a **fumaça** acabar')).toEqual([
      { text: 'Espere a ', bold: false },
      { text: 'fumaça', bold: true },
      { text: ' acabar', bold: false },
    ]);
    expect(splitBold('Sem destaque')).toEqual([
      { text: 'Sem destaque', bold: false },
    ]);
  });
});
