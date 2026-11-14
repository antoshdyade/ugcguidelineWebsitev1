import { deflateRawSync, inflateRawSync } from 'node:zlib';

export interface ZipInputEntry {
  name: string;
  data: Uint8Array;
}

export interface ZipParsedEntry {
  name: string;
  data: Buffer;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    c = CRC32_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function sanitizeZipEntryPath(rawName: string): string | null {
  if (!rawName || rawName.includes('\0')) return null;
  const unified = rawName.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
  if (!unified || unified.endsWith('/')) return null;
  const segments = unified.split('/');
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..') {
      return null;
    }
  }
  return segments.join('/');
}

export function buildZipBuffer(entries: ZipInputEntry[]): Buffer {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const entry of entries) {
    const safeName = sanitizeZipEntryPath(entry.name);
    if (!safeName) continue;

    const nameBuf = Buffer.from(safeName, 'utf8');
    const rawBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const crc = crc32(rawBuf);
    const deflated = deflateRawSync(rawBuf);
    const useDeflate = deflated.length < rawBuf.length;
    const method = useDeflate ? 8 : 0;
    const payload = useDeflate ? deflated : rawBuf;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra length

    localChunks.push(localHeader, nameBuf, payload);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42);

    centralChunks.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDirSize = centralChunks.reduce((acc, b) => acc + b.length, 0);
  const entryCount = centralChunks.length / 2;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entryCount, 8);
  eocd.writeUInt16LE(entryCount, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, ...centralChunks, eocd]);
}

export function parseZipBuffer(input: Uint8Array): ZipParsedEntry[] {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buf.length < 22) {
    throw new Error('Archive is too small to be a valid ZIP file.');
  }

  // Locate End of Central Directory (0x06054b50) searching backwards from tail
  let eocdOffset = -1;
  const searchFloor = Math.max(0, buf.length - 65558);
  for (let i = buf.length - 22; i >= searchFloor; i -= 1) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 &&
      buf[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error('Invalid ZIP archive: End of Central Directory signature not found.');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const centralSize = buf.readUInt32LE(eocdOffset + 12);
  const centralOffset = buf.readUInt32LE(eocdOffset + 16);
  if (centralOffset + centralSize > buf.length) {
    throw new Error('Invalid ZIP archive: Central Directory exceeds archive size.');
  }

  const results: ZipParsedEntry[] = [];
  let ptr = centralOffset;
  for (let idx = 0; idx < totalEntries; idx += 1) {
    if (ptr + 46 > buf.length || buf.readUInt32LE(ptr) !== 0x02014b50) {
      throw new Error('Invalid ZIP archive: corrupt Central Directory entry.');
    }
    const method = buf.readUInt16LE(ptr + 10);
    const expectedCrc = buf.readUInt32LE(ptr + 16);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const uncompressedSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);

    const rawName = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');
    ptr += 46 + nameLen + extraLen + commentLen;

    // Skip directory entries
    if (rawName.endsWith('/')) continue;

    const safeName = sanitizeZipEntryPath(rawName);
    if (!safeName) {
      throw new Error(`Unsafe ZIP entry path rejected: "${rawName}".`);
    }

    if (
      localHeaderOffset + 30 > buf.length ||
      buf.readUInt32LE(localHeaderOffset) !== 0x04034b50
    ) {
      throw new Error(`Corrupt local header for "${safeName}".`);
    }

    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buf.length) {
      throw new Error(`Truncated data payload for "${safeName}".`);
    }

    const compressedSlice = buf.subarray(dataStart, dataEnd);
    let data: Buffer;
    if (method === 0) {
      data = Buffer.from(compressedSlice);
    } else if (method === 8) {
      data = inflateRawSync(compressedSlice);
    } else {
      throw new Error(`Unsupported ZIP compression method ${method} for "${safeName}".`);
    }

    if (data.length !== uncompressedSize) {
      throw new Error(`Size mismatch for "${safeName}".`);
    }
    if (crc32(data) !== expectedCrc) {
      throw new Error(`CRC32 checksum mismatch for "${safeName}".`);
    }

    results.push({
      name: safeName,
      data,
      crc32: expectedCrc,
      compressedSize,
      uncompressedSize,
    });
  }

  return results;
}
