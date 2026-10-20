import { hasLoop } from '../transform/hasLoop';

type Node = { name: string; parents: Node[] };

const node = (name: string, parents: Node[] = []): Node => ({ name, parents });

describe('hasLoop', () => {
  it('returns true when the name is the parent itself', () => {
    expect(hasLoop('a', node('a'))).toBe(true);
  });

  it('returns true when the name is a distant ancestor', () => {
    const root = node('a');
    const chain = node('d', [node('c', [node('b', [root])])]);

    expect(hasLoop('a', chain)).toBe(true);
  });

  it('returns true when the ancestors contain a cycle', () => {
    const b = node('b');
    const c = node('c', [b]);
    b.parents.push(c);

    expect(hasLoop('a', node('d', [b]))).toBe(true);
  });

  it('returns false when the name is not an ancestor', () => {
    const shared = node('shared');
    const left = node('left', [shared]);
    const right = node('right', [shared]);

    expect(hasLoop('a', node('leaf', [left, right]))).toBe(false);
  });

  it('finds the name through a later branch after exploring an earlier one', () => {
    const shared = node('shared');
    const target = node('target');
    const left = node('left', [shared]);
    const right = node('right', [shared, target]);

    expect(hasLoop('target', node('leaf', [left, right]))).toBe(true);
  });

  it('walks a graph with many shared ancestors in linear time', () => {
    let layer = [node('root-0'), node('root-1')];
    for (let depth = 0; depth < 40; depth += 1) {
      layer = [
        node(`layer-${depth}-0`, layer),
        node(`layer-${depth}-1`, layer),
      ];
    }

    const startedAt = Date.now();
    const result = hasLoop('missing', node('leaf', layer));

    expect(result).toBe(false);
    expect(Date.now() - startedAt).toBeLessThan(1000);
  });
});
