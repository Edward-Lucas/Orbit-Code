# Orbit Code launcher for PowerShell
# Usage: orbit [args...]
#
# This script runs Orbit Code from any directory by
# temporarily changing to the project directory.

param(
    [Parameter(ValueFromRemainingArguments)]
    [string[]]$Arguments
)

# Get the script's directory and navigate to the project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$orbitDir = Join-Path $projectRoot "packages\mimo-core\packages\opencode"

$originalDir = Get-Location

try {
    # Change to the Orbit Code project directory
    Set-Location $orbitDir

    # Run Orbit Code
    & bun run --conditions=browser src/index.ts @Arguments
}
finally {
    # Return to the original directory
    Set-Location $originalDir
}
