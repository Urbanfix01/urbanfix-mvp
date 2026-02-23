@echo off
setlocal

git config core.hooksPath .githooks
git config pull.rebase true
git config rebase.autoStash true
git config fetch.prune true
git config push.autoSetupRemote true

echo Hooks instalados. Ya no se puede pushear si el remoto esta adelante.
echo Auto-sync roadmap soporta dos modos:
echo 1) Endpoint: ROADMAP_AUTOSYNC_URL + ROADMAP_AUTOSYNC_TOKEN
echo 2) Supabase directo: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
echo Recomendado: crear .env.roadmap.local en la raiz del repo.
echo Ejecuta este script en cada PC donde trabajes este repo.
