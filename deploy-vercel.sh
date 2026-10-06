#!/usr/bin/env bash
set -Eeuo pipefail

# VERTICE THERMAL — direct Vercel CLI deployment
# This bypasses the GitHub UI integration by deploying the local working tree.
# Never put API keys directly in this file or commit a .env file.

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="${VERCEL_PROJECT_NAME:-vertice-thermal}"
VERCEL_SCOPE="${VERCEL_SCOPE:-}"
VERCEL_BIN="${VERCEL_BIN:-npx --yes vercel@62.5.0}"

say() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || fail "Node.js is required."
command -v npm >/dev/null 2>&1 || fail "npm is required."

# Use VERCEL_TOKEN when supplied. Otherwise start Vercel's interactive login flow.
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  AUTH_ARGS=(--token "$VERCEL_TOKEN")
  say "Using Vercel token from the VERCEL_TOKEN environment variable."
else
  AUTH_ARGS=()
  if $VERCEL_BIN whoami >/dev/null 2>&1; then
    say "Using the existing authenticated Vercel CLI session."
  else
    say "No VERCEL_TOKEN supplied; starting interactive Vercel login."
    # This opens the standard Vercel email/device login flow. It is not a GitHub flow.
    $VERCEL_BIN login
  fi
fi

SCOPE_ARGS=()
if [[ -n "$VERCEL_SCOPE" ]]; then
  SCOPE_ARGS=(--scope "$VERCEL_SCOPE")
fi

cd "$PROJECT_DIR"

say "Installing dependencies and validating the production build."
npm ci
npm run build

say "Linking this local directory to the Vercel project: $PROJECT_NAME"
$VERCEL_BIN link --project "$PROJECT_NAME" --yes "${SCOPE_ARGS[@]}" "${AUTH_ARGS[@]}"

# Add or update production secrets from environment variables. The values are read from
# the shell, never echoed and never written to source control.
add_secret() {
  local key="$1"
  local value="${!key:-}"
  [[ -n "$value" ]] || fail "$key is not set. Export it before running this script."
  if $VERCEL_BIN env ls production "${SCOPE_ARGS[@]}" "${AUTH_ARGS[@]}" 2>/dev/null | grep -Fq "$key"; then
    printf 'Production variable already configured; leaving it unchanged: %s\n' "$key"
    return 0
  fi
  printf '%s' "$value" | $VERCEL_BIN env add "$key" production --yes "${SCOPE_ARGS[@]}" "${AUTH_ARGS[@]}" >/dev/null
  printf 'Configured encrypted production variable: %s\n' "$key"
}

say "Configuring encrypted production environment variables."
add_secret GROQ_API_KEY
add_secret SENDGRID_API_KEY
add_secret CAL_API_KEY

# Non-secret configuration.
if [[ -n "${SENDGRID_FROM_EMAIL:-}" ]]; then
  if ! $VERCEL_BIN env ls production "${SCOPE_ARGS[@]}" "${AUTH_ARGS[@]}" 2>/dev/null | grep -Fq "SENDGRID_FROM_EMAIL"; then
    printf '%s' "$SENDGRID_FROM_EMAIL" | $VERCEL_BIN env add SENDGRID_FROM_EMAIL production --yes "${SCOPE_ARGS[@]}" "${AUTH_ARGS[@]}" >/dev/null
  fi
fi
if [[ -n "${CAL_EVENT_TYPE_ID:-}" ]]; then
  if ! $VERCEL_BIN env ls production "${SCOPE_ARGS[@]}" "${AUTH_ARGS[@]}" 2>/dev/null | grep -Fq "CAL_EVENT_TYPE_ID"; then
    printf '%s' "$CAL_EVENT_TYPE_ID" | $VERCEL_BIN env add CAL_EVENT_TYPE_ID production --yes "${SCOPE_ARGS[@]}" "${AUTH_ARGS[@]}" >/dev/null
  fi
fi

say "Deploying directly from the local source tree to production."
DEPLOY_OUTPUT="$($VERCEL_BIN deploy --prod --yes "${SCOPE_ARGS[@]}" "${AUTH_ARGS[@]}" 2>&1)" || {
  printf '%s\n' "$DEPLOY_OUTPUT" >&2
  exit 1
}
printf '%s\n' "$DEPLOY_OUTPUT"

say "Deployment complete."
