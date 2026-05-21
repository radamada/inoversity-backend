/**
 * Detectează tipul real al unui fișier prin signature/magic bytes (primii bytes
 * din conținut), independent de extensie sau Content-Type-ul trimis de client.
 *
 * Folosit la upload-uri ca să nu acceptăm fișiere malicious mascate cu extensie
 * sau MIME type spoofed (audit findings S-08, S-09).
 *
 * Returnează un MIME type canonic, sau null dacă conținutul nu se potrivește
 * cu niciun format acceptat. Pentru video MP4 returnează 'video/mp4' chiar
 * dacă brand-ul ftyp e 'isom'/'mp42' etc.
 */
export function detectFileType(buf: Buffer): string | null {
  if (!buf || buf.length < 12) return null;

  // ── Imagini ────────────────────────────────────────────────────────────────
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // GIF: GIF8 (7a sau 9a)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return 'image/gif';
  }

  // RIFF container — folosit de WebP și AVI
  const isRiff =
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
  if (isRiff) {
    const sub = buf.slice(8, 12).toString('ascii');
    if (sub === 'WEBP') return 'image/webp';
    if (sub === 'AVI ') return 'video/x-msvideo';
  }

  // ftyp box (ISO Base Media File Format — MP4, MOV, HEIC etc.)
  // Layout: 4 bytes box size + "ftyp" + 4 bytes brand.
  if (
    buf[4] === 0x66 &&
    buf[5] === 0x74 &&
    buf[6] === 0x79 &&
    buf[7] === 0x70
  ) {
    const brand = buf.slice(8, 12).toString('ascii');
    // HEIC variants — ce trimite iPhone
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1', 'heif'].includes(brand)) {
      return 'image/heic';
    }
    // Apple QuickTime
    if (brand === 'qt  ') return 'video/quicktime';
    // Restul brand-urilor cunoscute pentru MP4 (isom, mp41, mp42, iso2, avc1, dash, etc.)
    return 'video/mp4';
  }

  // Matroska / WebM EBML header: 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    // Magic-ul nu distinge .webm de .mkv. Fără să parsăm EBML-ul complet,
    // returnăm 'video/webm' și acceptăm ambele la nivelul allowlist-urilor.
    return 'video/webm';
  }

  return null;
}

/**
 * Verifică dacă bufferul corespunde unuia dintre tipurile permise.
 * Aruncă cu mesaj user-friendly în limba română dacă nu.
 */
export function assertFileType(
  buf: Buffer,
  allowedMimes: string[],
  errorMessage: string,
): string {
  const detected = detectFileType(buf);
  if (!detected || !allowedMimes.includes(detected)) {
    throw new Error(errorMessage);
  }
  return detected;
}
