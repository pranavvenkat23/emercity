/**
 * @jest-environment node
 *
 * Firestore security rules (§19.3) against the local emulator.
 * Run with `npm run test:rules` (starts the emulator). Skipped by plain
 * `npm test` when no emulator is running.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deleteField, doc, getDoc, getDocs, collection, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const d = host ? describe : describe.skip;

const H = 'h1';
const now = () => Timestamp.fromMillis(Date.now());
const days = (n: number) => Timestamp.fromMillis(Date.now() + n * 86_400_000);

let env: RulesTestEnvironment;

d('Firestore rules (§19.3)', () => {
  beforeAll(async () => {
    const [h, port] = host!.split(':');
    env = await initializeTestEnvironment({
      projectId: 'demo-emercity-rules',
      firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'), host: h, port: Number(port) },
    });
  });
  afterAll(async () => env?.cleanup());

  beforeEach(async () => {
    await env.clearFirestore();
    // Seed: owner o, adult a, teen t; outsider x; adult-aged joiner j; teen joiner k.
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users/o'), { isAdult18Plus: true });
      await setDoc(doc(db, 'users/j'), { isAdult18Plus: true });
      await setDoc(doc(db, 'users/k'), { isAdult18Plus: false });
      await setDoc(doc(db, `households/${H}`), { id: H, name: 'Test', ownerUserId: 'o', roles: { o: 'owner', a: 'adult', t: 'teen' }, isDemo: false });
      await setDoc(doc(db, `households/${H}/members/m1`), { id: 'm1', firstName: 'Grandma', linkedUserId: null });
      await setDoc(doc(db, `households/${H}/members/mt`), { id: 'mt', firstName: 'Teen', linkedUserId: 't' });
      await setDoc(doc(db, `households/${H}/supplies/s1`), { id: 's1', name: 'Water', quantityHave: 0 });
      await setDoc(doc(db, 'invites/ABCDEFGH'), { householdId: H, createdBy: 'o', expiresAt: days(7) });
      await setDoc(doc(db, 'invites/EXPIREDX'), { householdId: H, createdBy: 'o', expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    });
  });

  const as = (uid: string | null) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

  it('only members read a household and its records', async () => {
    await assertSucceeds(getDoc(doc(as('t'), `households/${H}`)));
    await assertSucceeds(getDocs(collection(as('a'), `households/${H}/members`)));
    await assertFails(getDoc(doc(as('x'), `households/${H}`)));
    await assertFails(getDocs(collection(as('x'), `households/${H}/members`)));
    await assertFails(getDoc(doc(as(null), `households/${H}`)));
  });

  it('an adult creates a household only as its sole owner', async () => {
    const ok = { id: 'h2', ownerUserId: 'j', roles: { j: 'owner' }, isDemo: false };
    await assertSucceeds(setDoc(doc(as('j'), 'households/h2'), ok));
    await assertFails(setDoc(doc(as('j'), 'households/h3'), { ...ok, id: 'h3', roles: { j: 'owner', x: 'adult' } }));
    await assertFails(setDoc(doc(as('k'), 'households/h4'), { ...ok, id: 'h4', ownerUserId: 'k', roles: { k: 'owner' } }));
  });

  it('adults edit plan fields but not roles; teens edit only themselves and supply check-offs', async () => {
    await assertSucceeds(updateDoc(doc(as('a'), `households/${H}`), { name: 'Renamed' }));
    await assertFails(updateDoc(doc(as('a'), `households/${H}`), { 'roles.x': 'adult' }));
    await assertSucceeds(updateDoc(doc(as('a'), `households/${H}/members/m1`), { firstName: 'Gran' }));
    await assertFails(updateDoc(doc(as('t'), `households/${H}/members/m1`), { firstName: 'Gran' }));
    await assertSucceeds(updateDoc(doc(as('t'), `households/${H}/members/mt`), { firstName: 'Ro' }));
    await assertSucceeds(updateDoc(doc(as('t'), `households/${H}/supplies/s1`), { quantityHave: 4, updatedAt: 'x' }));
    await assertFails(updateDoc(doc(as('t'), `households/${H}/supplies/s1`), { name: 'Juice' }));
    await assertFails(setDoc(doc(as('t'), `households/${H}/medications/x`), { id: 'x' }));
  });

  it('only adults end an Emergency session for everyone', async () => {
    await assertSucceeds(setDoc(doc(as('t'), `households/${H}/sessions/s`), { id: 's', hazard: 'flood' }));
    await assertSucceeds(updateDoc(doc(as('t'), `households/${H}/sessions/s`), { stepsCompleted: [] }));
    await assertFails(updateDoc(doc(as('t'), `households/${H}/sessions/s`), { endedAt: 'now' }));
    await assertSucceeds(updateDoc(doc(as('a'), `households/${H}/sessions/s`), { endedAt: 'now' }));
  });

  it('invites: adults create, anyone signed in can read one by code, nobody can list them', async () => {
    await assertSucceeds(setDoc(doc(as('a'), 'invites/ZZZZZZZZ'), { householdId: H, createdBy: 'a', expiresAt: days(7) }));
    await assertFails(setDoc(doc(as('t'), 'invites/YYYYYYYY'), { householdId: H, createdBy: 't', expiresAt: days(7) }));
    await assertFails(setDoc(doc(as('a'), 'invites/LONGLIFE'), { householdId: H, createdBy: 'a', expiresAt: days(30) }));
    await assertSucceeds(getDoc(doc(as('x'), 'invites/ABCDEFGH')));
    await assertFails(getDocs(collection(as('x'), 'invites')));
  });

  it('joining needs a valid unexpired code and adds only yourself at your age role', async () => {
    await assertFails(updateDoc(doc(as('j'), `households/${H}`), { 'roles.j': 'owner', joinCode: 'ABCDEFGH' }));
    await assertFails(updateDoc(doc(as('j'), `households/${H}`), { 'roles.j': 'adult', joinCode: 'EXPIREDX' }));
    await assertFails(updateDoc(doc(as('j'), `households/${H}`), { 'roles.j': 'adult', 'roles.x': 'adult', joinCode: 'ABCDEFGH' }));
    await assertFails(updateDoc(doc(as('k'), `households/${H}`), { 'roles.k': 'adult', joinCode: 'ABCDEFGH' }));
    await assertSucceeds(updateDoc(doc(as('k'), `households/${H}`), { 'roles.k': 'teen', joinCode: 'ABCDEFGH' }));
    await assertSucceeds(updateDoc(doc(as('j'), `households/${H}`), { 'roles.j': 'adult', joinCode: 'ABCDEFGH' }));
    // Now a member: links an unlinked member record to themselves, not someone else's.
    await assertSucceeds(updateDoc(doc(as('j'), `households/${H}/members/m1`), { linkedUserId: 'j', updatedAt: now() }));
    await assertFails(updateDoc(doc(as('k'), `households/${H}/members/mt`), { linkedUserId: 'k' }));
  });

  it('a member can leave; the owner cannot be removed by others', async () => {
    // Leaving through the sync queue: the whole roles map plus the queue's stamps.
    const leave = { id: H, roles: { o: 'owner', t: 'teen' }, updatedAt: 'x', updatedBy: 'a' };
    await assertSucceeds(setDoc(doc(as('a'), `households/${H}`), leave, { mergeFields: Object.keys(leave) }));
    let roles: unknown;
    await env.withSecurityRulesDisabled(async (ctx) => {
      roles = (await getDoc(doc(ctx.firestore(), `households/${H}`))).data()?.roles;
    });
    expect(roles).toEqual({ o: 'owner', t: 'teen' });
    const promote = { roles: { o: 'owner', t: 'owner' }, updatedAt: 'x' };
    await assertFails(setDoc(doc(as('t'), `households/${H}`), promote, { mergeFields: Object.keys(promote) }));
    await assertFails(updateDoc(doc(as('t'), `households/${H}`), { 'roles.o': deleteField() }));
    await assertFails(updateDoc(doc(as('o'), `households/${H}`), { 'roles.o': deleteField() }));
  });

  it('users read and write only their own profile', async () => {
    await assertSucceeds(getDoc(doc(as('j'), 'users/j')));
    await assertFails(getDoc(doc(as('j'), 'users/o')));
  });
});
