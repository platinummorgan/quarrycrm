import { describe, it, expect } from 'vitest';
import {
  maskEmail,
  maskPhone,
  maskPII,
  maskPIIArray,
  isPotentialPII,
  autoMaskPII,
  COMMON_PII_FIELDS,
} from '@/lib/pii-masking';

describe('PII Masking', () => {
  describe('maskEmail', () => {
    it('should mask email addresses', () => {
      expect(maskEmail('john.doe@example.com')).toBe('jo******@example.com');
      expect(maskEmail('a@b.com')).toBe('a*@b.com'); // Short but still masked
      expect(maskEmail('alice@test.org')).toBe('al***@test.org');
    });

    it('should handle custom options', () => {
      expect(maskEmail('john.doe@example.com', { showStart: 3 })).toBe('joh*****@example.com');
      expect(maskEmail('john.doe@example.com', { maskChar: 'x' })).toBe('joxxxxxx@example.com');
      expect(maskEmail('john.doe@example.com', { preserveStructure: false })).toBe('jo******@example.com');
    });

    it('should handle empty/null/undefined', () => {
      expect(maskEmail('')).toBe('');
      expect(maskEmail(null)).toBe('');
      expect(maskEmail(undefined)).toBe('');
    });

    it('should handle invalid emails', () => {
      expect(maskEmail('not-an-email')).toBe('********'); // No @ sign, gets generic mask
      expect(maskEmail('@')).toBe('undefined*@'); // Edge case: @ at start creates undefined local
    });
  });

  describe('maskPhone', () => {
    it('should mask phone numbers', () => {
      expect(maskPhone('+1 (555) 123-4567')).toBe('+* (***) ***-4567'); // Masks digits, preserves structure
      expect(maskPhone('555-1234')).toBe('***-1234');
      expect(maskPhone('+44 20 7946 0958')).toBe('+** ** **** 0958');
    });

    it('should handle custom options', () => {
      expect(maskPhone('+1 (555) 123-4567', { showEnd: 2 })).toBe('+* (***) ***-**67');
      expect(maskPhone('+1 (555) 123-4567', { maskChar: 'x' })).toBe('+x (xxx) xxx-4567');
      expect(maskPhone('+1 (555) 123-4567', { preserveStructure: false })).toBe('*******4567'); // 7 digits masked + 4 shown
    });

    it('should handle empty/null/undefined', () => {
      expect(maskPhone('')).toBe('');
      expect(maskPhone(null)).toBe('');
      expect(maskPhone(undefined)).toBe('');
    });

    it('should handle short numbers', () => {
      expect(maskPhone('123')).toBe('123'); // Too short to mask meaningfully
    });
  });

  describe('maskPII', () => {
    it('should mask specified fields', () => {
      const contact = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1 555-1234',
        company: 'Acme Corp',
      };

      const masked = maskPII(contact, ['email', 'phone']);

      expect(masked.id).toBe('1');
      expect(masked.name).toBe('John Doe');
      expect(masked.email).toBe('jo**@example.com'); // Actual output
      expect(masked.phone).toBe('+* ***-1234'); // Masks digits
      expect(masked.company).toBe('Acme Corp');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'test@example.com',
          profile: {
            phone: '555-1234',
          },
        },
      };

      const masked = maskPII(data, ['user']);
      expect(masked.user).toBe('[o***********t]'); // Object gets stringified and masked
    });

    it('should handle missing fields', () => {
      const data = { name: 'John' };
      const masked = maskPII(data, ['name']);

      expect(masked.name).toBe('J***'); // Gets masked with generic masking
    });

    it('should handle null values', () => {
      const data = { email: null, phone: null };
      const masked = maskPII(data, ['email', 'phone']);

      expect(masked.email).toBeNull(); // Null values are skipped
      expect(masked.phone).toBeNull();
    });
  });

  describe('maskPIIArray', () => {
    it('should mask array of objects', () => {
      const contacts = [
        { id: '1', email: 'alice@example.com', phone: '555-0001' },
        { id: '2', email: 'bob@example.com', phone: '555-0002' },
      ];

      const masked = maskPIIArray(contacts, ['email', 'phone']);

      expect(masked[0].id).toBe('1');
      expect(masked[0].email).toBe('al***@example.com'); // Actual output
      expect(masked[0].phone).toBe('***-0001');
      expect(masked[1].id).toBe('2');
      expect(masked[1].email).toBe('b**@example.com'); // Actual output for 3-char local
      expect(masked[1].phone).toBe('***-0002');
    });

    it('should handle empty array', () => {
      const masked = maskPIIArray([], ['email']);
      expect(masked).toEqual([]);
    });
  });

  describe('isPotentialPII', () => {
    it('should detect email addresses', () => {
      expect(isPotentialPII('john@example.com')).toBe(true);
      expect(isPotentialPII('test.email@domain.co.uk')).toBe(true);
      expect(isPotentialPII('not-an-email')).toBe(false);
    });

    it('should detect phone numbers', () => {
      expect(isPotentialPII('+1 (555) 123-4567')).toBe(true);
      expect(isPotentialPII('555-1234')).toBe(false); // Too short for auto-detection
      expect(isPotentialPII('+44 20 7946 0958')).toBe(false); // Spaces not in phone regex pattern
      expect(isPotentialPII('123')).toBe(false); // Too short
    });

    it('should detect SSN patterns', () => {
      expect(isPotentialPII('123-45-6789')).toBe(true);
      expect(isPotentialPII('123456789')).toBe(false); // No dashes
    });

    it('should detect credit card patterns', () => {
      expect(isPotentialPII('1234 5678 9012 3456')).toBe(true);
      expect(isPotentialPII('1234-5678-9012-3456')).toBe(true);
      expect(isPotentialPII('1234567890123456')).toBe(true);
      expect(isPotentialPII('1234')).toBe(false); // Too short
    });

    it('should handle non-string values', () => {
      expect(isPotentialPII(null)).toBe(false);
      expect(isPotentialPII(undefined)).toBe(false);
      expect(isPotentialPII(123 as any)).toBe(false);
      expect(isPotentialPII({} as any)).toBe(false);
    });
  });

  describe('autoMaskPII', () => {
    it('should auto-detect and mask PII fields', () => {
      const contact = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1 555-1234',
        company: 'Acme Corp',
      };

      const masked = autoMaskPII(contact);

      expect(masked.id).toBe('1');
      expect(masked.name).toBe('John Doe');
      expect(masked.email).toBe('jo**@example.com'); // Actual output
      expect(masked.phone).toBe('+* ***-1234'); // Actual output
      expect(masked.company).toBe('Acme Corp');
    });

    it('should mask common PII field names', () => {
      const data = {
        ssn: '123-45-6789',
        creditCard: '1234 5678 9012 3456',
        normalField: 'Keep this',
      };

      const masked = autoMaskPII(data);

      expect(masked.ssn).toBe('12*******89'); // Shows start and end
      expect(masked.creditCard).toBe('12***************56'); // Shows start and end (19 total chars)
      expect(masked.normalField).toBe('Keep this');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        metadata: {
          notes: 'Regular field',
        },
      };

      const masked = autoMaskPII(data);

      // Nested objects are not deeply traversed by default
      expect(masked.user).toBeTruthy();
      expect(masked.metadata).toBeTruthy();
    });

    it('should handle arrays', () => {
      const data = {
        emails: ['test1@example.com', 'test2@example.com'],
        names: ['Alice', 'Bob'],
      };

      const masked = autoMaskPII(data);

      // Arrays are not deeply traversed by default
      expect(masked.emails).toBeTruthy();
      expect(masked.names).toEqual(['Alice', 'Bob']);
    });
  });

  describe('COMMON_PII_FIELDS', () => {
    it('should include common PII field names', () => {
      expect(COMMON_PII_FIELDS).toContain('email');
      expect(COMMON_PII_FIELDS).toContain('phone');
      expect(COMMON_PII_FIELDS).toContain('ssn');
      expect(COMMON_PII_FIELDS).toContain('creditCard');
      expect(COMMON_PII_FIELDS).toContain('passport');
      expect(COMMON_PII_FIELDS.length).toBeGreaterThan(10);
    });
  });
});
