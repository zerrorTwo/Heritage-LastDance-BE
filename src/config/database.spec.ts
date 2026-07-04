import { dataSource } from './database';

describe('database standalone data source', () => {
  it('loads entity files named model.ts for seed scripts', () => {
    const entities = (dataSource.options.entities || []) as unknown[];

    expect(entities.map(String).some((entry) => entry.includes('**/model.{js,ts}'))).toBe(true);
  });
});
