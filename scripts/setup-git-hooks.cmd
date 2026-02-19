@echo off
setlocal

git config core.hooksPath .githooks
git config pull.rebase true
git config rebase.autoStash true
git config fetch.prune true
git config push.autoSetupRemote true

echo Hooks instalados. Ya no se puede pushear si el remoto esta adelante.
echo El pre-push valida automaticamente lint/build en apps/web cuando detecta cambios web.
echo Para auto-sync de roadmap, configurar ROADMAP_AUTOSYNC_URL y ROADMAP_AUTOSYNC_TOKEN.
echo Ejecuta este script en cada PC donde trabajes este repo.
