import { NextRequest } from 'next/server';

type ReadJsonOptions = {
  maxBytes?: number;
  invalidMessage?: string;
};

type ReadJsonSuccess<T> = {
  ok: true;
  body: T;
};

type ReadJsonFailure = {
  ok: false;
  status: number;
  error: string;
};

const encoder = new TextEncoder();

export const readLimitedJsonBody = async <T extends Record<string, unknown> = Record<string, unknown>>(
  request: NextRequest,
  options: ReadJsonOptions = {}
): Promise<ReadJsonSuccess<T> | ReadJsonFailure> => {
  const maxBytes = options.maxBytes ?? 16 * 1024;
  const invalidMessage = options.invalidMessage || 'Body invalido.';
  const contentLengthHeader = request.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, status: 413, error: 'Body demasiado grande.' };
  }

  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch {
    return { ok: false, status: 400, error: invalidMessage };
  }

  if (encoder.encode(rawBody).byteLength > maxBytes) {
    return { ok: false, status: 413, error: 'Body demasiado grande.' };
  }

  if (!rawBody.trim()) {
    return { ok: false, status: 400, error: invalidMessage };
  }

  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: invalidMessage };
    }
    return { ok: true, body: parsed as T };
  } catch {
    return { ok: false, status: 400, error: invalidMessage };
  }
};
