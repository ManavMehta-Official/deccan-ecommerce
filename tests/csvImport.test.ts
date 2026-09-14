import { describe, expect, it } from 'vitest';

// CSV parse helper logic replicating actions.ts
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

describe('CSV Parser and Schema Mapping', () => {
  it('correctly parses CSV with all user schema columns and quotes', () => {
    const csv = [
      'id,name,email,role,image,email_verified,password,created_at,updated_at',
      'usr-123,"Alice Smith, Eng",alice@example.com,admin,"https://avatar.url/1.png",true,MySecurePassword123!,2026-01-01T00:00:00.000Z,2026-01-02T00:00:00.000Z',
      'usr-456,Bob Jones,bob@example.com,user,,false,,,',
    ].join('\n');

    const rows = parseCsv(csv);
    expect(rows.length).toBe(3);

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    expect(headers).toEqual(['id', 'name', 'email', 'role', 'image', 'email_verified', 'password', 'created_at', 'updated_at']);

    const row1 = rows[1];
    expect(row1[0]).toBe('usr-123');
    expect(row1[1]).toBe('Alice Smith, Eng');
    expect(row1[2]).toBe('alice@example.com');
    expect(row1[3]).toBe('admin');
    expect(row1[4]).toBe('https://avatar.url/1.png');
    expect(row1[5]).toBe('true');
    expect(row1[6]).toBe('MySecurePassword123!');
    expect(row1[7]).toBe('2026-01-01T00:00:00.000Z');
    expect(row1[8]).toBe('2026-01-02T00:00:00.000Z');

    const row2 = rows[2];
    expect(row2[0]).toBe('usr-456');
    expect(row2[1]).toBe('Bob Jones');
    expect(row2[2]).toBe('bob@example.com');
    expect(row2[3]).toBe('user');
    expect(row2[4]).toBe('');
    expect(row2[5]).toBe('false');
  });

  it('handles custom header variations and casing gracefully', () => {
    const csv = [
      'ID,Full_Name,Email_Address,User_Role,Avatar,Verified,Password',
      '1,Charlie,charlie@example.com,superadmin,https://img.com/c.png,yes,Password12345!',
    ].join('\n');

    const rows = parseCsv(csv);
    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const findIndex = (names: string[]) => headers.findIndex((h) => names.includes(h));

    expect(findIndex(['id', 'user_id', 'userid'])).toBe(0);
    expect(findIndex(['name', 'full_name', 'fullname', 'display_name'])).toBe(1);
    expect(findIndex(['email', 'email_address', 'emailaddress'])).toBe(2);
    expect(findIndex(['role', 'user_role', 'userrole'])).toBe(3);
    expect(findIndex(['image', 'avatar', 'photo', 'picture'])).toBe(4);
    expect(findIndex(['email_verified', 'emailverified', 'verified'])).toBe(5);
    expect(findIndex(['password', 'pass', 'pwd'])).toBe(6);
  });
});
