import { getDb } from '@/lib/db';
import { healthResponse } from '@/lib/health';
import { getLogger } from '@/lib/logger';

// Nunca em cache: o objetivo é saber o estado AGORA. É pública de propósito (monitor de
// uptime): só devolve { status, db }, sem dados do sistema nem do banco.
export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return healthResponse({ ping: () => getDb().$queryRaw`SELECT 1`, logger: getLogger() });
}
