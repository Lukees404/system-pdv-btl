import { describe, expect, it } from 'vitest';
import { FakeIdGenerator, UuidGenerator } from './index';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('UuidGenerator', () => {
  it('[ADR-018] gera UUID v4 válido', () => {
    expect(new UuidGenerator().next()).toMatch(UUID_V4);
  });

  it('[ADR-018] gera 1.000 ids sem repetição', () => {
    const generator = new UuidGenerator();
    const ids = new Set(Array.from({ length: 1000 }, () => generator.next()));

    expect(ids.size).toBe(1000);
  });
});

describe('FakeIdGenerator', () => {
  it('[ADR-018] gera ids sequenciais e previsíveis, no formato de UUID v4', () => {
    const generator = new FakeIdGenerator();

    expect(generator.next()).toBe('00000000-0000-4000-8000-000000000001');
    expect(generator.next()).toBe('00000000-0000-4000-8000-000000000002');
    expect(generator.next()).toMatch(UUID_V4);
  });

  it('[ADR-018] duas instâncias recomeçam do mesmo ponto', () => {
    expect(new FakeIdGenerator().next()).toBe(new FakeIdGenerator().next());
  });
});
