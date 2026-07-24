import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ isAdmin: false }, { status: 401 });

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) return NextResponse.json({ isAdmin: false }, { status: 403 });

  return NextResponse.json({
    isAdmin: true,
    user: {
      id: user.id,
      email: user.email || null,
    },
  });
}
