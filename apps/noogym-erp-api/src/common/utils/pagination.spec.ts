import { getPagination, paginated } from './pagination';

describe('pagination utils', () => {
  it('normalizes invalid page and limit values', () => {
    expect(getPagination(0, 0)).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
      take: 20,
    });
  });

  it('caps limit at 100 and calculates skip', () => {
    expect(getPagination(3, 500)).toEqual({
      page: 3,
      limit: 100,
      skip: 200,
      take: 100,
    });
  });

  it('wraps paginated data with metadata', () => {
    expect(paginated(['a', 'b'], 5, 2, 2)).toEqual({
      items: ['a', 'b'],
      meta: {
        total: 5,
        page: 2,
        limit: 2,
        pages: 3,
      },
    });
  });
});
