# Rebrand EduInovatrium → Inoversity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redenumire completă a platformei `EduInovatrium` → `Inoversity` în UI, emailuri, PDF certificat, log-uri, domeniu (`eduinovatrium.ro` → `inoversity.ro`) și memorie persistentă.

**Architecture:** Operație mecanică pe 16 fișiere identificate. 14 fișiere se rezolvă prin `Edit` cu `replace_all` (2 string substituiri per fișier: forma capital + forma lowercase). 2 fișiere (`Header.tsx`, `(auth)/layout.tsx`) au brand JSX stylized cu `<span>` split — necesită edit manual punctual. Verificare finală: grep exhaustiv + `tsc --noEmit` + smoke test manual.

**Tech Stack:** Next.js 16 (frontend), NestJS (backend), TypeScript. Niciun framework de test automat necesar pentru această schimbare (e exclusiv text-replacement; corectitudinea se verifică prin grep + compilare + inspecție vizuală).

**Spec:** [docs/superpowers/specs/2026-05-18-rebrand-to-inoversity-design.md](../specs/2026-05-18-rebrand-to-inoversity-design.md)

---

## File Structure

**Modificate (16 fișiere):**

Frontend (12):
- `frontend/src/app/layout.tsx` — meta title template + default
- `frontend/src/app/(auth)/layout.tsx` — brand JSX stylized (split span) **[edit manual]**
- `frontend/src/app/(auth)/login/page.tsx` — text "contul tău EduInovatrium"
- `frontend/src/app/(auth)/register/page.tsx` — text "contul EduInovatrium gratuit"
- `frontend/src/app/(main)/courses/[slug]/layout.tsx` — meta title curs
- `frontend/src/app/(main)/contact/page.tsx` — adresa email + text
- `frontend/src/app/(main)/cum-functioneaza/page.tsx` — 2 ocurențe în text
- `frontend/src/app/(main)/termeni/page.tsx` — ~27 ocurențe (text legal)
- `frontend/src/app/(main)/confidentialitate/page.tsx` — ~12 ocurențe
- `frontend/src/app/(main)/politica-cookies/page.tsx` — ~6 ocurențe + emailuri
- `frontend/src/app/(main)/verify-certificate/[code]/page.tsx` — text certificat
- `frontend/src/components/layout/Header.tsx` — brand JSX stylized (split span) **[edit manual]**
- `frontend/src/components/layout/Footer.tsx` — copyright

Backend (3):
- `backend/src/main.ts` — Swagger title + log bootstrap
- `backend/src/mail/mail.service.ts` — 4 funcții email (from, subject, body)
- `backend/src/enrollments/enrollments.service.ts` — text PDF certificat

Memorie persistentă (1):
- `~/.claude/projects/-Users-rada-Desktop-Projects-test-platforma-cursuri-2/memory/project_status.md`

---

## Strategie generală pentru fiecare task de tip "replace mecanic"

Pentru fișierele standard (fără JSX split), aplicați următoarea procedură:

1. Edit cu `replace_all: true`, `old_string: "EduInovatrium"`, `new_string: "Inoversity"`
2. Edit cu `replace_all: true`, `old_string: "eduinovatrium"`, `new_string: "inoversity"` (prinde domeniile)

Ordinea contează: capital primul, apoi lowercase. Inversă funcționează identic în acest caz (niciun string nu se suprapune), dar consistența ușurează revizuirea.

---

### Task 1: Frontend — meta tags & root layout

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Replace capital form**

Edit cu `replace_all: true`:
- `old_string`: `EduInovatrium`
- `new_string`: `Inoversity`

- [ ] **Step 2: Replace lowercase form**

Edit cu `replace_all: true`:
- `old_string`: `eduinovatrium`
- `new_string`: `inoversity`

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" frontend/src/app/layout.tsx
```

Expected: 0 matches.

---

### Task 2: Frontend — auth pages (login, register)

**Files:**
- Modify: `frontend/src/app/(auth)/login/page.tsx`
- Modify: `frontend/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Edit login/page.tsx — capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Edit login/page.tsx — lowercase**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Edit register/page.tsx — capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 4: Edit register/page.tsx — lowercase**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 5: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" "frontend/src/app/(auth)/login/page.tsx" "frontend/src/app/(auth)/register/page.tsx"
```

Expected: 0 matches.

---

### Task 3: Frontend — Header.tsx (JSX stylized brand)

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx:58`

Context: linia 58 conține `Edu<span className="text-indigo-600">Inovatrium</span>` — text împărțit în două elemente JSX pentru a colora doar partea "Inovatrium". Pentru brand-ul nou, structura echivalentă este `Ino<span className="text-indigo-600">versity</span>` (păstrăm același pattern vizual — partea colorată este sufixul).

- [ ] **Step 1: Read context around line 58**

Citește `frontend/src/components/layout/Header.tsx` linia 55-62 pentru a confirma structura.

- [ ] **Step 2: Replace stylized brand**

Edit (NU `replace_all`, e unic):
- `old_string`: `Edu<span className="text-indigo-600">Inovatrium</span>`
- `new_string`: `Ino<span className="text-indigo-600">versity</span>`

- [ ] **Step 3: Verify**

```bash
grep -nE "Inovatrium|EduInovatrium|eduinovatrium" frontend/src/components/layout/Header.tsx
```

Expected: 0 matches.

---

### Task 4: Frontend — (auth)/layout.tsx (JSX stylized brand)

**Files:**
- Modify: `frontend/src/app/(auth)/layout.tsx:10`

Context: linia 10 conține același pattern ca Header — `Edu<span className="text-indigo-600">Inovatrium</span>`.

- [ ] **Step 1: Read context around line 10**

Citește `frontend/src/app/(auth)/layout.tsx` linia 5-15.

- [ ] **Step 2: Replace stylized brand**

Edit (NU `replace_all`):
- `old_string`: `Edu<span className="text-indigo-600">Inovatrium</span>`
- `new_string`: `Ino<span className="text-indigo-600">versity</span>`

- [ ] **Step 3: Verify**

```bash
grep -nE "Inovatrium|EduInovatrium|eduinovatrium" "frontend/src/app/(auth)/layout.tsx"
```

Expected: 0 matches.

---

### Task 5: Frontend — Footer

**Files:**
- Modify: `frontend/src/components/layout/Footer.tsx`

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" frontend/src/components/layout/Footer.tsx
```

Expected: 0 matches.

---

### Task 6: Frontend — course slug layout

**Files:**
- Modify: `frontend/src/app/(main)/courses/[slug]/layout.tsx`

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" "frontend/src/app/(main)/courses/[slug]/layout.tsx"
```

Expected: 0 matches.

---

### Task 7: Frontend — contact page

**Files:**
- Modify: `frontend/src/app/(main)/contact/page.tsx`

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase (domain)**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" "frontend/src/app/(main)/contact/page.tsx"
```

Expected: 0 matches.

---

### Task 8: Frontend — cum-functioneaza page

**Files:**
- Modify: `frontend/src/app/(main)/cum-functioneaza/page.tsx`

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" "frontend/src/app/(main)/cum-functioneaza/page.tsx"
```

Expected: 0 matches.

---

### Task 9: Frontend — termeni page (text legal — ~27 ocurențe)

**Files:**
- Modify: `frontend/src/app/(main)/termeni/page.tsx`

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" "frontend/src/app/(main)/termeni/page.tsx"
```

Expected: 0 matches.

---

### Task 10: Frontend — confidentialitate page

**Files:**
- Modify: `frontend/src/app/(main)/confidentialitate/page.tsx`

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" "frontend/src/app/(main)/confidentialitate/page.tsx"
```

Expected: 0 matches.

---

### Task 11: Frontend — politica-cookies page

**Files:**
- Modify: `frontend/src/app/(main)/politica-cookies/page.tsx`

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" "frontend/src/app/(main)/politica-cookies/page.tsx"
```

Expected: 0 matches.

---

### Task 12: Frontend — verify-certificate page

**Files:**
- Modify: `frontend/src/app/(main)/verify-certificate/[code]/page.tsx`

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" "frontend/src/app/(main)/verify-certificate/[code]/page.tsx"
```

Expected: 0 matches.

---

### Task 13: Frontend — checkpoint commit

- [ ] **Step 1: TypeScript check frontend**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 erori. Dacă apar erori, oprește și investighează — replace mecanic nu ar trebui să afecteze tipurile.

- [ ] **Step 2: Verify global frontend**

```bash
grep -rnE "EduInovatrium|eduinovatrium|Inovatrium" frontend/src 2>/dev/null
```

Expected: 0 matches. Notă: includem și `Inovatrium` (fără prefix) pentru a prinde orice rest stylized.

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "$(cat <<'EOF'
refactor(frontend): rebrand EduInovatrium → Inoversity

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Backend — main.ts (Swagger + bootstrap log)

**Files:**
- Modify: `backend/src/main.ts:86,99`

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase (if any)**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`. Dacă Edit eroare "string not found", e OK — sări la pasul 3.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" backend/src/main.ts
```

Expected: 0 matches.

---

### Task 15: Backend — mail.service.ts (toate emailurile)

**Files:**
- Modify: `backend/src/mail/mail.service.ts`

Conține: `from` address default, 4 subject-uri, 4 corpuri HTML cu `<h1>EduInovatrium</h1>`, link-uri și texte. Toate prinse de cele două replace-uri.

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase (domain in default `from` și `CONTACT_EMAIL`)**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" backend/src/mail/mail.service.ts
```

Expected: 0 matches.

---

### Task 16: Backend — enrollments.service.ts (PDF certificat)

**Files:**
- Modify: `backend/src/enrollments/enrollments.service.ts:407,449,499,510`

Conține: text "EduInovatrium" desenat în PDF la 3 poziții + URL `www.eduinovatrium.ro`.

- [ ] **Step 1: Replace capital**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Replace lowercase (URL `www.eduinovatrium.ro`)**

Edit cu `replace_all: true`, `old_string`: `eduinovatrium`, `new_string`: `inoversity`.

- [ ] **Step 3: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" backend/src/enrollments/enrollments.service.ts
```

Expected: 0 matches.

---

### Task 17: Backend — checkpoint commit

- [ ] **Step 1: TypeScript check backend**

```bash
cd backend && npx tsc --noEmit
```

Expected: 0 erori.

- [ ] **Step 2: Verify global backend**

```bash
grep -rnE "EduInovatrium|eduinovatrium|Inovatrium" backend/src 2>/dev/null
```

Expected: 0 matches.

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "$(cat <<'EOF'
refactor(backend): rebrand EduInovatrium → Inoversity

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: Verificare exhaustivă repo-wide

- [ ] **Step 1: Grep case-insensitive pe tot repo-ul (excluzând node_modules)**

```bash
grep -rEi "eduinovatrium|inovatrium" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.md" --include="*.html" --include="*.css" \
  --include="*.js" --include="*.mjs" \
  . 2>/dev/null | grep -vE "node_modules|\.next|dist|\.git|docs/superpowers"
```

Expected: 0 matches. (Documentele din `docs/superpowers/specs/` și `docs/superpowers/plans/` sunt excluse — referințele istorice acolo sunt intenționate.)

- [ ] **Step 2: Dacă apar rezultate**

Pentru fiecare match, deschide fișierul, decide dacă e:
- Brand care trebuie redenumit → aplică același pattern de Edit cu `replace_all`
- Referință istorică în comentariu / changelog → lasă neschimbat
- False positive (ex: cuvântul "educa" — în română) → lasă neschimbat

Re-rulează Step 1 până când doar referințele istorice acceptabile rămân.

---

### Task 19: Smoke test manual

- [ ] **Step 1: Pornește backend**

```bash
cd backend && npm run start:dev
```

Așteaptă mesajul: `Inoversity API running on http://localhost:3001/api`.

- [ ] **Step 2: Pornește frontend (terminal separat)**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Verifică în browser**

Deschide:
1. `http://localhost:3000` — header afișează "Inoversity" (cu "versity" colorat indigo); titlu tab "Inoversity – Cursuri Online"; footer copyright "Inoversity"
2. `http://localhost:3000/termeni` — toate referințele textuale "Inoversity"
3. `http://localhost:3000/contact` — email `contact@inoversity.ro`
4. `http://localhost:3000/login` — text "contul tău Inoversity"; brand stylized "Inoversity" (split JSX)
5. `http://localhost:3000/cum-functioneaza` — toate cele 2 ocurențe

- [ ] **Step 4: Verifică email (opțional dar recomandat)**

În browser: `/forgot-password` cu un email valid → verifică inbox-ul. Subject ar trebui să fie "Resetare parolă Inoversity", `from`: `Inoversity <noreply@inoversity.ro>` (dacă `SMTP_FROM` env var nu suprascrie), body conține `<h1>Inoversity</h1>`.

Notă: dacă env `SMTP_FROM` e setat în `.env` cu valoarea veche, e responsabilitatea ops să-l actualizeze. Codul folosește default-ul nou.

- [ ] **Step 5: Verifică PDF certificat (opțional)**

Dacă există un cont cu enrollment 100% complet, descarcă certificatul și deschide PDF-ul. Textul "Inoversity" la antet, footer și semnătură; URL `www.inoversity.ro` în footer.

---

### Task 20: Update memorie persistentă

**Files:**
- Modify: `/Users/rada/.claude/projects/-Users-rada-Desktop-Projects-test-platforma-cursuri-2/memory/project_status.md`

- [ ] **Step 1: Replace în memorie**

Edit cu `replace_all: true`, `old_string`: `EduInovatrium`, `new_string`: `Inoversity`.

- [ ] **Step 2: Verify**

```bash
grep -nE "EduInovatrium|eduinovatrium" /Users/rada/.claude/projects/-Users-rada-Desktop-Projects-test-platforma-cursuri-2/memory/project_status.md
```

Expected: 0 matches.

Notă: nu se face commit aici — fișierul nu e în repo-ul proiectului.

---

### Task 21: Commit final

- [ ] **Step 1: Status check**

```bash
git status
```

Expected: working tree clean (toate modificările au fost commit-uite în Task 13 și Task 17). Dacă apar fișiere modificate, înseamnă că Task 18 a descoperit ocurențe ratate și au fost reparate — atunci:

- [ ] **Step 2: Commit suplimentar (dacă e cazul)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: cleanup remaining EduInovatrium references

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Final git log**

```bash
git log --oneline -5
```

Expected: cel puțin 2 commit-uri noi (frontend + backend rebrand) + eventual unul de cleanup.

---

## Criterii de finalizare (toate trebuie bifate)

- [ ] `grep -rEi "eduinovatrium|inovatrium" ... | grep -v "docs/superpowers"` → 0 matches în cod
- [ ] `cd frontend && npx tsc --noEmit` → 0 erori
- [ ] `cd backend && npx tsc --noEmit` → 0 erori
- [ ] Smoke test browser: 5 pagini afișează "Inoversity"
- [ ] Memorie persistentă actualizată
- [ ] Cel puțin 2 commit-uri în istoricul git (frontend + backend)
