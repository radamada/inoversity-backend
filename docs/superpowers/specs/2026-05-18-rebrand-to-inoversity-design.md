# Rebrand: EduInovatrium → Inoversity

**Data:** 2026-05-18
**Tip:** Redenumire brand platformă (rebranding)

## Obiectiv

Redenumirea completă a platformei din `EduInovatrium` în `Inoversity` — în UI, emailuri, PDF-uri, log-uri, texte legale, domeniu și documentație. O singură formă de capitalizare folosită peste tot: `Inoversity` (capital inițial), `inoversity` (lowercase, doar în slug-uri/domenii/identificatori URL).

## Scope

### IN scope

**Texte vizibile utilizatorului (16 fișiere):**
- `frontend/src/app/layout.tsx` — `<title>` template + default
- `frontend/src/app/(auth)/layout.tsx`, `login/page.tsx`, `register/page.tsx`
- `frontend/src/app/(main)/courses/[slug]/layout.tsx`
- `frontend/src/app/(main)/contact/page.tsx`
- `frontend/src/app/(main)/cum-functioneaza/page.tsx`
- `frontend/src/app/(main)/termeni/page.tsx`
- `frontend/src/app/(main)/confidentialitate/page.tsx`
- `frontend/src/app/(main)/politica-cookies/page.tsx`
- `frontend/src/app/(main)/verify-certificate/[code]/page.tsx`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/Footer.tsx`
- `backend/src/main.ts` — log pornire
- `backend/src/enrollments/enrollments.service.ts` — text PDF certificat
- `backend/src/mail/mail.service.ts` — subject + body emailuri (welcome, reset, certificate, refund, course updates, Google account notice)

**Domeniu și emailuri:**
- `eduinovatrium.ro` → `inoversity.ro`
- `contact@eduinovatrium.ro` → `contact@inoversity.ro`
- `privacy@eduinovatrium.ro` → `privacy@inoversity.ro`
- `legal@eduinovatrium.ro` → `legal@inoversity.ro`

**Documentație internă:**
- `~/.claude/projects/.../memory/project_status.md` (memorie persistentă proiect)
- Orice comentariu de cod care menționează brand-ul (verificat cu grep final)

### OUT of scope (intenționat)

| Item | Motiv |
|---|---|
| `MONGODB_URI` / nume DB MongoDB | Risc pierdere date; e doar în `.env` local, nu afectează brand-ul vizibil |
| Folder rădăcină `test_platforma_cursuri_2` | E generic, nu conține brand; redenumirea ar invalida worktree-uri și path-uri în config-uri |
| `package.json` field `name` | Deja generic (`frontend`/`backend`) |
| Variabile env (`JWT_SECRET`, `BUNNY_*`, etc.) | Generice, nu conțin brand |
| Bunny.net storage zone, Stripe account | Resurse externe, independente de cod |
| Logo image assets | Nu există — logo-ul e text-based (icon Lucide `GraduationCap` + text) |

## Strategie de execuție

### Pas 1 — Replace mecanic

Două substituiri în toate cele 16 fișiere identificate:
- `EduInovatrium` → `Inoversity`
- `eduinovatrium` → `inoversity` (lowercase — prinde domeniile)

Folosit `Edit` cu `replace_all` per fișier, NU `sed` (evită riscul de a modifica fișiere `.git` sau `node_modules`).

### Pas 2 — Verificare exhaustivă

```bash
grep -rEi "eduinovatrium|EduInovatrium|Inovatrium" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.md" --include="*.html" --include="*.css" . \
  | grep -vE "node_modules|\.next|dist|\.git"
```

Trebuie să returneze **0 rezultate**. Dacă apare ceva neașteptat, se investighează și se include în replace.

### Pas 3 — TypeScript compile check

```bash
cd frontend && npx tsc --noEmit  # 0 erori
cd backend && npx tsc --noEmit   # 0 erori
```

### Pas 4 — Smoke test manual

Pornește `backend` + `frontend`, verifică:
- Homepage: titlu tab, Header, Footer
- Pagina `/termeni` și `/confidentialitate` (multe ocurențe)
- Pagina `/contact` (adresă email)
- Forgot-password: declanșează un email și verifică conținut
- Certificate verification: `/verify-certificate/{code}` afișează textul nou

### Pas 5 — Update memorie persistentă

Editează `project_status.md` din memory store: înlocuiește `EduInovatrium` cu `Inoversity`.

### Pas 6 — Commit unic

Mesaj: `chore: rebrand EduInovatrium → Inoversity`

## Riscuri și mitigări

| Risc | Probabilitate | Mitigare |
|---|---|---|
| Ocurență ratată într-un fișier neașteptat | Medie | Pas 2 — grep exhaustiv post-replace |
| Spargere TypeScript (puțin probabil, doar string literals) | Foarte mică | Pas 3 — `tsc --noEmit` |
| Email/link cu domeniul vechi rămas activ în prod | Medie (depinde de utilizator) | În afara scope-ului tehnic: trebuie configurat DNS pentru `inoversity.ro` și redirect de la vechiul domeniu — responsabilitatea ops |

## Criterii de succes

- [ ] 0 rezultate la grep final case-insensitive pentru `eduinovatrium|inovatrium`
- [ ] `tsc --noEmit` trece curat pe ambele subproiecte
- [ ] Smoke test: 5 pagini verificate manual afișează `Inoversity`
- [ ] Memorie persistentă actualizată
- [ ] Un singur commit cu schimbarea
