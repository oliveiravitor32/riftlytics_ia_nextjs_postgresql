/**
 * Test files always run in the same (alphabetical) order. Files share the
 * test database within a run, and the recorded Riot answers were taken in
 * this order, so a different order could ask Riot for something unrecorded.
 */
// Jest loads custom sequencers as CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sequencer = require('@jest/test-sequencer').default;

class AlphabeticalSequencer extends Sequencer {
  sort(tests) {
    return [...tests].sort((a, b) => a.path.localeCompare(b.path));
  }
}

module.exports = AlphabeticalSequencer;
