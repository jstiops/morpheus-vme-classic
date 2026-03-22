#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Generate TypeScript API client from the official Morpheus OpenAPI spec
# Usage: bash scripts/generate-api.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SPEC_URL="https://raw.githubusercontent.com/HewlettPackard/morpheus-openapi/master/bundled.yaml"
OUTPUT_DIR="src/api/generated"
SPEC_FILE="/tmp/morpheus-bundled.yaml"

echo "📥  Downloading Morpheus OpenAPI spec…"
curl -fsSL "$SPEC_URL" -o "$SPEC_FILE"
echo "    Spec saved to $SPEC_FILE"

# Install openapi-typescript-codegen if not present
if ! command -v openapi &> /dev/null; then
    echo "📦  Installing openapi-typescript-codegen…"
    npm install -g openapi-typescript-codegen
fi

echo "⚙️   Generating TypeScript client to $OUTPUT_DIR…"
mkdir -p "$OUTPUT_DIR"
openapi \
    --input "$SPEC_FILE" \
    --output "$OUTPUT_DIR" \
    --client axios \
    --useOptions \
    --useUnionTypes

echo "✅  Done. Generated client is in $OUTPUT_DIR"
echo "    Import from: @/api/generated/services/..."
echo
echo "💡  Note: The hand-crafted API functions in src/api/ take priority."
echo "    Use the generated client for endpoints not yet covered."
