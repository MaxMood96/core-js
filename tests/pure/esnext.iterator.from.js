import { createIterable, createIterator } from '../helpers/helpers';

import Iterator from 'core-js-pure/features/iterator';

QUnit.test('Iterator.from', assert => {
  const { from } = Iterator;

  assert.isFunction(from);
  assert.arity(from, 1);

  assert.true(Iterator.from(createIterator([1, 2, 3])) instanceof Iterator, 'proxy, iterator');

  assert.true(Iterator.from(createIterable([1, 2, 3])) instanceof Iterator, 'proxy, iterable');

  assert.arrayEqual(Iterator.from(createIterable([1, 2, 3])).toArray(), [1, 2, 3], 'just a proxy');

  assert.throws(() => from(undefined), TypeError);
  assert.throws(() => from(null), TypeError);
  assert.throws(() => from({}), TypeError);
});
