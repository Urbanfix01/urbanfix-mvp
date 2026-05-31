import { type NextRequest } from 'next/server';
import { GET as getNearbyRequests } from '../requests/nearby/route';

export async function GET(request: NextRequest) {
  // Auth is enforced in the delegated route before reading data via auth.getUser.
  return getNearbyRequests(request);
}
