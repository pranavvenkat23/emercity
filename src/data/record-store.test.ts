/**
 * @jest-environment node
 */
import type { Member } from '@/models/types';
import { createNodeDriver } from '@/test-utils/node-driver';

import { KeyValueStore, RecordStore } from './record-store';
import { migrate, SCHEMA_VERSION } from './schema';
import type { SqlDriver } from './sql-driver';

const T0 = new Date('2026-10-24T12:00:00Z');

function member(id: string, firstName: string): Member {
  return {
    id,
    householdId: 'h1',
    createdAt: '',
    updatedAt: '',
    linkedUserId: null,
    firstName,
    birthDate: null,
    role: 'adult',
    conditions: [],
    medicationIds: [],
    deviceIds: [],
    allergies: [],
    primaryLanguage: 'en',
    canDrive: true,
  };
}

let db: SqlDriver;
let store: RecordStore;
let opCounter = 0;
const opts = (sync: boolean, now = T0) => ({
  sync,
  now: () => now,
  newOpId: () => `op-${++opCounter}`,
});

beforeEach(async () => {
  db = createNodeDriver();
  await migrate(db);
  store = new RecordStore(db);
  opCounter = 0;
});

describe('schema migrations', () => {
  it('sets user_version and is idempotent', async () => {
    await migrate(db);
    const row = await db.first<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(SCHEMA_VERSION);
  });
});

describe('RecordStore', () => {
  it('runs overlapping writes one at a time (no nested BEGIN)', async () => {
    await Promise.all(['a', 'b', 'c', 'd'].map((id) => store.upsert('members', 'h1', member(id, id), opts(true))));
    expect((await store.list<Member>('members', 'h1')).map((m) => m.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('round-trips a record and stamps timestamps', async () => {
    const saved = await store.upsert('members', 'h1', member('m1', 'Mom'), opts(true));
    expect(saved.createdAt).toBe(T0.toISOString());
    expect(saved.updatedAt).toBe(T0.toISOString());
    expect(await store.get<Member>('members', 'm1')).toEqual(saved);
  });

  it('keeps createdAt on update and refreshes updatedAt', async () => {
    const first = await store.upsert('members', 'h1', member('m1', 'Mom'), opts(true));
    const later = new Date(T0.getTime() + 60_000);
    const second = await store.upsert('members', 'h1', { ...first, firstName: 'Mum' }, opts(true, later));
    expect(second.createdAt).toBe(T0.toISOString());
    expect(second.updatedAt).toBe(later.toISOString());
    expect((await store.get<Member>('members', 'm1'))?.firstName).toBe('Mum');
  });

  it('lists only the requested household and collection', async () => {
    await store.upsert('members', 'h1', member('m1', 'Mom'), opts(false));
    await store.upsert('members', 'h2', { ...member('m2', 'Other'), householdId: 'h2' }, opts(false));
    const list = await store.list<Member>('members', 'h1');
    expect(list.map((m) => m.id)).toEqual(['m1']);
  });

  it('queues an op for synced writes and none for demo writes (§21.3, §26.3)', async () => {
    await store.upsert('members', 'h1', member('m1', 'Mom'), opts(true));
    await store.upsert('members', 'demo', { ...member('d1', 'Demo'), householdId: 'demo' }, opts(false));
    expect(await store.pendingSyncCount()).toBe(1);
    expect(await store.pendingSyncCount('demo')).toBe(0);
  });

  it('records only changed fields when given (field-level merge, §19.5)', async () => {
    const saved = await store.upsert('members', 'h1', member('m1', 'Mom'), opts(false));
    await store.upsert('members', 'h1', { ...saved, canDrive: false }, opts(true), ['canDrive']);
    const [op] = await store.pendingOps();
    expect(JSON.parse(op.fields!)).toEqual({ canDrive: false });
  });

  it('soft-deletes, hides, restores, and purges after 30 days', async () => {
    await store.upsert('members', 'h1', member('m1', 'Mom'), opts(false));
    await store.softDelete('members', 'h1', 'm1', opts(true));
    expect(await store.get('members', 'm1')).toBeNull();
    expect(await store.list('members', 'h1')).toEqual([]);

    await store.restore('members', 'm1');
    expect((await store.get<Member>('members', 'm1'))?.deletedAt).toBeUndefined();

    await store.softDelete('members', 'h1', 'm1', opts(false));
    expect(await store.purgeDeleted(new Date(T0.getTime() + 29 * 86_400_000))).toBe(0);
    expect(await store.purgeDeleted(new Date(T0.getTime() + 31 * 86_400_000))).toBe(1);
  });

  it('rolls back the record write if queueing fails (never half-applied)', async () => {
    await store.upsert('members', 'h1', member('m1', 'Mom'), { ...opts(true), newOpId: () => 'dup' });
    await expect(
      store.upsert('members', 'h1', member('m2', 'Dad'), { ...opts(true), newOpId: () => 'dup' }),
    ).rejects.toThrow();
    expect(await store.get('members', 'm2')).toBeNull();
  });

  it('deletes all records and queued ops for a household', async () => {
    await store.upsert('members', 'h1', member('m1', 'Mom'), opts(true));
    await store.deleteHousehold('h1');
    expect(await store.list('members', 'h1')).toEqual([]);
    expect(await store.pendingSyncCount('h1')).toBe(0);
  });
});

describe('KeyValueStore', () => {
  it('stores strings and JSON', async () => {
    const kv = new KeyValueStore(db);
    await kv.set('a', '1');
    await kv.set('a', '2');
    expect(await kv.get('a')).toBe('2');
    await kv.setJSON('b', { x: 1 });
    expect(await kv.getJSON('b')).toEqual({ x: 1 });
    await kv.remove('a');
    expect(await kv.get('a')).toBeNull();
    expect(await kv.getJSON('missing')).toBeNull();
  });
});

describe('sync helpers (§19.4)', () => {
  it('applies remote changes without queueing them', async () => {
    const remote = { ...member('r1', 'Mom'), updatedAt: '2026-10-24T12:00:00.000Z' };
    expect(await store.applyRemote('members', 'h1', remote)).toBe(true);
    expect((await store.get<Member>('members', 'r1'))?.firstName).toBe('Mom');
    expect(await store.pendingSyncCount()).toBe(0);
  });

  it('never overwrites a record with unpushed local changes', async () => {
    await store.upsert('members', 'h1', member('m1', 'Local'), opts(true));
    const applied = await store.applyRemote('members', 'h1', { ...member('m1', 'Remote'), updatedAt: '2099-01-01T00:00:00.000Z' });
    expect(applied).toBe(false);
    expect((await store.get<Member>('members', 'm1'))?.firstName).toBe('Local');
  });

  it('ignores remote copies older than the local one, and applies remote soft deletes', async () => {
    await store.upsert('members', 'h1', member('m2', 'New'), opts(false, new Date('2026-10-24T12:00:00Z')));
    expect(await store.applyRemote('members', 'h1', { ...member('m2', 'Old'), updatedAt: '2026-10-01T00:00:00.000Z' })).toBe(false);
    await store.applyRemote('members', 'h1', { ...member('m2', 'New'), updatedAt: '2026-10-25T00:00:00.000Z', deletedAt: '2026-10-25T00:00:00.000Z' });
    expect(await store.get('members', 'm2')).toBeNull();
    expect((await store.getAny<Member>('members', 'm2'))?.deletedAt).toBeTruthy();
  });

  it('acks and fails ops', async () => {
    await store.upsert('members', 'h1', member('m3', 'A'), opts(true));
    const [op] = await store.pendingOps();
    await store.failOp(op.seq, 'offline');
    expect(await store.pendingSyncCount()).toBe(1);
    await store.ackOp(op.seq);
    expect(await store.pendingSyncCount()).toBe(0);
  });
});
