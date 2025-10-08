#!/bin/bash

# Wrapper script to capture Fly.io logs with timestamped filename
# This is a convenience alias for: ./scripts/capture-fly-logs.sh --dated

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Call the main script with --dated flag, passing through any additional arguments
"$SCRIPT_DIR/capture-fly-logs.sh" --dated "$@"
