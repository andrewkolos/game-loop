import { fizz } from 'index';

describe(nameof(fizz), () => {
  it('returns buzz', () => {
    expect(fizz()).toEqual("buzz");
  })
});
