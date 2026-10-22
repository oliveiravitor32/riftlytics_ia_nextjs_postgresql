import {
  MATCHUP_ASPECTS,
  buildMatchupPrompt,
  orderPair,
  orientRows,
  parseMatchupRows,
} from './matchup';

const rows = MATCHUP_ASPECTS.map((aspecto) => ({
  aspecto,
  a: `Akali: ${aspecto}`,
  b: `Katarina: ${aspecto}`,
}));

describe('orderPair', () => {
  it('stores the pair in alphabetical order, so A×B and B×A are one row', () => {
    expect(orderPair('Katarina', 'Akali')).toEqual({
      champA: 'Akali',
      champB: 'Katarina',
      swapped: true,
    });
    expect(orderPair('Akali', 'Katarina')).toEqual({
      champA: 'Akali',
      champB: 'Katarina',
      swapped: false,
    });
  });
});

describe('orientRows', () => {
  it('puts the columns back in the order the user asked', () => {
    expect(orientRows(rows, false)).toEqual(rows);
    expect(orientRows(rows, true)[0]).toEqual({
      aspecto: MATCHUP_ASPECTS[0],
      a: `Katarina: ${MATCHUP_ASPECTS[0]}`,
      b: `Akali: ${MATCHUP_ASPECTS[0]}`,
    });
  });
});

describe('buildMatchupPrompt', () => {
  it('names both champions and every aspect, asking for the lane phase', () => {
    const prompt = buildMatchupPrompt('Akali', 'Katarina');
    expect(prompt).toContain('Akali');
    expect(prompt).toContain('Katarina');
    expect(prompt).toMatch(/fase de rotas/);
    for (const aspect of MATCHUP_ASPECTS) expect(prompt).toContain(aspect);
  });
});

describe('parseMatchupRows', () => {
  it('accepts the JSON with one row per aspect, in order', () => {
    expect(parseMatchupRows(JSON.stringify({ linhas: rows }))).toEqual(rows);
  });

  it('rejects anything else: not JSON, missing or extra aspects, empty text', () => {
    expect(() => parseMatchupRows('Katarina é fraca')).toThrow();
    expect(() =>
      parseMatchupRows(JSON.stringify({ linhas: rows.slice(1) }))
    ).toThrow();
    expect(() =>
      parseMatchupRows(
        JSON.stringify({
          linhas: [...rows.slice(0, 3), { ...rows[3], aspecto: 'Outro' }],
        })
      )
    ).toThrow();
    expect(() =>
      parseMatchupRows(
        JSON.stringify({ linhas: [{ ...rows[0], a: '' }, ...rows.slice(1)] })
      )
    ).toThrow();
  });
});
