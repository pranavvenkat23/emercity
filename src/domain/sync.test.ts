import { cloudPath, pushWrite, stripUndefined } from './sync';

describe('sync mapping (§19.4–19.5)', () => {
  it('maps records to the Firestore layout', () => {
    expect(cloudPath('households', 'h1', 'h1')).toBe('households/h1');
    expect(cloudPath('members', 'h1', 'm1')).toBe('households/h1/members/m1');
    expect(cloudPath('checkIns', 'h1', 'c1')).toBe('households/h1/checkIns/c1');
  });

  it('sends only changed fields, stamped with time and author', () => {
    const w = pushWrite({ collection: 'members', record_id: 'm1', household_id: 'h1', op: 'upsert', fields: JSON.stringify({ firstName: 'Mom', nickname: undefined }), created_at: 't1' }, 'u1');
    expect(w).toEqual({ path: 'households/h1/members/m1', data: { firstName: 'Mom', id: 'm1', updatedAt: 't1', updatedBy: 'u1' } });
  });

  it('deletes are soft', () => {
    const w = pushWrite({ collection: 'pets', record_id: 'p1', household_id: 'h1', op: 'delete', fields: null, created_at: 't2' }, 'u1');
    expect(w.data).toEqual({ id: 'p1', deletedAt: 't2', updatedAt: 't2', updatedBy: 'u1' });
  });

  it('strips undefined deeply', () => {
    expect(stripUndefined({ a: 1, b: undefined, c: { d: undefined, e: [1, { f: undefined }] } })).toEqual({ a: 1, c: { e: [1, {}] } });
  });
});

import { mergeSteps } from './sync';

describe('mergeSteps (§19.5)', () => {
  it('keeps every step once, credited to the earliest phone', () => {
    const mine = [{ stepId: 'a', at: '10:02', by: 'mom' }, { stepId: 'b', at: '10:05', by: 'mom' }];
    const theirs = [{ stepId: 'a', at: '10:01', by: 'dad' }, { stepId: 'c', at: '10:03', by: 'dad' }];
    expect(mergeSteps(mine, theirs)).toEqual([
      { stepId: 'a', at: '10:01', by: 'dad' },
      { stepId: 'c', at: '10:03', by: 'dad' },
      { stepId: 'b', at: '10:05', by: 'mom' },
    ]);
    expect(mergeSteps(undefined, mine)).toHaveLength(2);
  });
});
