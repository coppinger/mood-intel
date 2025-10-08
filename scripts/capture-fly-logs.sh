#!/bin/bash

# Script to capture Fly.io logs for debugging
# Saves logs to logs/ directory for quick analysis

set -e

# Default values
LINES=500
DATED=false
APP_NAME=""
OUTPUT_FILE="logs/latest.log"

# Help text
show_help() {
    cat << EOF
Usage: ./scripts/capture-fly-logs.sh [OPTIONS]

Capture Fly.io logs to a file for debugging.

OPTIONS:
    --lines <N>         Number of lines to capture (default: 500)
    --dated             Save with timestamp filename (logs/fly-YYYY-MM-DD-HHMMSS.log)
    --app <name>        Specify app name (auto-detects from fly.toml if not provided)
    --instance <id>     Capture logs from specific instance only
    --help              Show this help message

EXAMPLES:
    ./scripts/capture-fly-logs.sh
    ./scripts/capture-fly-logs.sh --lines 2000
    ./scripts/capture-fly-logs.sh --dated
    ./scripts/capture-fly-logs.sh --app mood-intel-backend --lines 1000

OUTPUT:
    Default: logs/latest.log
    With --dated: logs/fly-2025-10-08-143022.log

EOF
    exit 0
}

# Parse arguments
INSTANCE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --lines)
            LINES="$2"
            shift 2
            ;;
        --dated)
            DATED=true
            shift
            ;;
        --app)
            APP_NAME="$2"
            shift 2
            ;;
        --instance)
            INSTANCE="$2"
            shift 2
            ;;
        --help)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Auto-detect app name from fly.toml if not provided
if [ -z "$APP_NAME" ]; then
    if [ -f "fly.toml" ]; then
        APP_NAME=$(grep "^app = " fly.toml | head -1 | cut -d'"' -f2)
    fi

    if [ -z "$APP_NAME" ]; then
        echo "Error: Could not auto-detect app name from fly.toml"
        echo "Please specify app name with --app flag"
        exit 1
    fi
fi

# Set output filename with timestamp if --dated flag is used
if [ "$DATED" = true ]; then
    TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
    OUTPUT_FILE="logs/fly-${TIMESTAMP}.log"
fi

# Ensure logs directory exists
mkdir -p logs

# Build fly logs command
FLY_CMD="fly logs -a $APP_NAME --lines $LINES"

if [ -n "$INSTANCE" ]; then
    FLY_CMD="$FLY_CMD --instance $INSTANCE"
fi

# Capture logs
echo "Capturing logs from $APP_NAME..."
echo "Command: $FLY_CMD"
echo "Output: $OUTPUT_FILE"
echo ""

$FLY_CMD > "$OUTPUT_FILE" 2>&1

echo "✓ Logs saved to $OUTPUT_FILE"
echo "  Lines captured: $(wc -l < "$OUTPUT_FILE")"
echo ""
echo "To view: cat $OUTPUT_FILE"
echo "To search: grep 'error' $OUTPUT_FILE -i"
