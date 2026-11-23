import { createHash } from 'node:crypto';

// Git may check text out as CRLF on Windows and LF on cloud builders.
export function mobileSourceHash(bytes, file) {
  const content = /\.(?:[cm]?[jt]sx?|css|json)$/.test(file)
    ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes;
  return createHash('sha256').update(content).digest('hex');
}
