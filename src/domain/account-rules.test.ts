import {
  ageGatePermissions,
  classifyAuthError,
  inviteCodeFromBytes,
  isValidEmail,
  isValidInviteCode,
  normalizeInviteCode,
  passwordIssues,
} from './account-rules';

describe('password rules', () => {
  it('flags each unmet rule', () => {
    expect(passwordIssues('short').map((r) => r.id)).toEqual(['length', 'number']);
    expect(passwordIssues('1234567890').map((r) => r.id)).toEqual(['letter']);
    expect(passwordIssues('correcthorse9')).toEqual([]);
  });
});

describe('email validation', () => {
  it.each(['a@b.co', ' mom@example.com '])('accepts %s', (e) => expect(isValidEmail(e)).toBe(true));
  it.each(['', 'nope', 'a@b', 'a b@c.com'])('rejects %s', (e) => expect(isValidEmail(e)).toBe(false));
});

describe('age gate (§5.2)', () => {
  it('blocks under-13 accounts entirely', () => {
    expect(ageGatePermissions('under-13')).toEqual({
      canCreateAccount: false,
      canCreateHousehold: false,
      canJoinHousehold: false,
    });
  });
  it('lets teens join but not create a household', () => {
    expect(ageGatePermissions('13-17')).toEqual({
      canCreateAccount: true,
      canCreateHousehold: false,
      canJoinHousehold: true,
    });
  });
  it('lets adults do everything', () => {
    expect(ageGatePermissions('18-plus').canCreateHousehold).toBe(true);
  });
});

describe('invite codes', () => {
  it('generates 8 valid characters from random bytes', () => {
    const code = inviteCodeFromBytes(new Uint8Array([0, 1, 2, 3, 250, 251, 252, 255]));
    expect(code).toHaveLength(8);
    expect(isValidInviteCode(code)).toBe(true);
  });
  it('normalizes spacing, dashes and case', () => {
    expect(normalizeInviteCode('abcd-efgh')).toBe('ABCDEFGH');
    expect(isValidInviteCode('abcd efgh')).toBe(true);
  });
  it('rejects ambiguous glyphs and wrong lengths', () => {
    expect(isValidInviteCode('ABCDEFG0')).toBe(false);
    expect(isValidInviteCode('ABCDEFGI')).toBe(false);
    expect(isValidInviteCode('ABCDEFG')).toBe(false);
  });
  it('requires 8 bytes', () => {
    expect(() => inviteCodeFromBytes(new Uint8Array(4))).toThrow();
  });
});

describe('auth error classification', () => {
  it('maps Firebase codes to spec error states', () => {
    expect(classifyAuthError('auth/email-already-in-use')).toBe('email-in-use');
    expect(classifyAuthError('auth/network-request-failed')).toBe('network');
    expect(classifyAuthError('auth/invalid-credential')).toBe('wrong-credentials');
    expect(classifyAuthError('something-else')).toBe('unknown');
    expect(classifyAuthError(undefined)).toBe('unknown');
  });
});
