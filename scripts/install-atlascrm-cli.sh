#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# Atlas Bites CRM & Facturation — CLI Installation Script
# ==============================================================================

# Resolve absolute canonical repository directory
SCRIPT_SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SCRIPT_SOURCE" ]; do
  SCRIPT_DIR="$(cd -P "$(dirname "$SCRIPT_SOURCE")" && pwd)"
  SCRIPT_SOURCE="$(readlink "$SCRIPT_SOURCE")"
  [[ $SCRIPT_SOURCE != /* ]] && SCRIPT_SOURCE="$SCRIPT_DIR/$SCRIPT_SOURCE"
done
PROJECT_DIR="$(cd -P "$(dirname "$SCRIPT_SOURCE")/.." && pwd)"

INSTALL_DIR="$HOME/.local/bin"
TARGET_CLI="$INSTALL_DIR/atlascrm"
SOURCE_CLI="$PROJECT_DIR/scripts/atlascrm"

echo "======================================================================"
echo " Installation du CLI Atlas CRM"
echo "======================================================================"
echo " Répertoire du projet : $PROJECT_DIR"
echo " Répertoire d'installation : $INSTALL_DIR"
echo ""

# Ensure target directory exists
mkdir -p "$INSTALL_DIR"

# Ensure source CLI script exists and is executable
if [ ! -f "$SOURCE_CLI" ]; then
  echo "[ERREUR] Script CLI introuvable à l'emplacement : $SOURCE_CLI" >&2
  exit 1
fi
chmod +x "$SOURCE_CLI"

# Check if target command exists and points to something else
if [ -e "$TARGET_CLI" ] || [ -L "$TARGET_CLI" ]; then
  REAL_TARGET="$(readlink "$TARGET_CLI" 2>/dev/null || echo "$TARGET_CLI")"
  if [ "$REAL_TARGET" != "$SOURCE_CLI" ]; then
    echo "[AVERTISSEMENT] Une commande atlascrm existante pointe vers : $REAL_TARGET"
    echo "[INFO] Mise à jour du lien symbolique vers : $SOURCE_CLI"
  fi
  rm -f "$TARGET_CLI"
fi

# Create symlink in ~/.local/bin/atlascrm
ln -s "$SOURCE_CLI" "$TARGET_CLI"
chmod +x "$TARGET_CLI"
echo " ✓ Lien symbolique créé : $TARGET_CLI -> $SOURCE_CLI"

# Optional compatibility wrapper 'start atlascrm'
TARGET_START_WRAPPER="$INSTALL_DIR/start"
if command -v start &>/dev/null; then
  EXISTING_START="$(command -v start)"
  echo " ! La commande système 'start' existe déjà ($EXISTING_START)."
  echo " ! Conservation de la commande système sans écriture."
else
  cat << 'EOF' > "$TARGET_START_WRAPPER"
#!/usr/bin/env bash
set -Eeuo pipefail
if [ "${1:-}" = "atlascrm" ]; then
  shift
  exec atlascrm start "$@"
else
  echo "Utilisation : start atlascrm [options]"
  echo "Pour les autres commandes, utilisez : atlascrm <commande>"
  exit 1
fi
EOF
  chmod +x "$TARGET_START_WRAPPER"
  echo " ✓ Wrapper de compatibilité créé : $TARGET_START_WRAPPER (start atlascrm -> atlascrm start)"
fi

# Idempotently update PATH in shell profile (~/.zshrc / ~/.bashrc)
SHELL_NAME="$(basename "${SHELL:-zsh}")"
PROFILE_FILE="$HOME/.zshrc"
if [ "$SHELL_NAME" = "bash" ]; then
  if [ -f "$HOME/.bashrc" ]; then
    PROFILE_FILE="$HOME/.bashrc"
  elif [ -f "$HOME/.bash_profile" ]; then
    PROFILE_FILE="$HOME/.bash_profile"
  fi
fi

# Check if PATH already includes ~/.local/bin
PATH_UPDATED=false
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  if [ -f "$PROFILE_FILE" ]; then
    if ! grep -q "# Atlas CRM CLI PATH" "$PROFILE_FILE"; then
      # Backup profile before modifying
      TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
      BACKUP_PROFILE="${PROFILE_FILE}.bak-atlascrm-${TIMESTAMP}"
      cp "$PROFILE_FILE" "$BACKUP_PROFILE"
      echo " ✓ Sauvegarde de la configuration du shell créée : $BACKUP_PROFILE"

      cat << EOF >> "$PROFILE_FILE"

# Atlas CRM CLI PATH
export PATH="\$HOME/.local/bin:\$PATH"
EOF
      PATH_UPDATED=true
      echo " ✓ Block PATH ajouté de manière idempotente dans $PROFILE_FILE"
    fi
  else
    cat << EOF > "$PROFILE_FILE"
# Atlas CRM CLI PATH
export PATH="\$HOME/.local/bin:\$PATH"
EOF
    PATH_UPDATED=true
    echo " ✓ Fichier $PROFILE_FILE créé avec le PATH Atlas CRM."
  fi
fi

echo ""
echo "======================================================================"
echo " 🎉 Installation du CLI Atlas CRM Réussie !"
echo "======================================================================"
if [ "$PATH_UPDATED" = true ]; then
  echo " Pour activer la commande immédiatement dans ce terminal, exécutez :"
  echo "   source $PROFILE_FILE"
  echo ""
fi
echo " Vous pouvez maintenant exécuter depuis n'importe quel terminal :"
echo "   atlascrm setup"
echo "   atlascrm start --open"
if [ -f "$TARGET_START_WRAPPER" ]; then
  echo "   start atlascrm"
fi
echo "======================================================================"
