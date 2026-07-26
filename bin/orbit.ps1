# Orbit Code launcher for PowerShell
# Usage: orbit [args...]
#
# This script runs Orbit Code from any directory by
# passing the current directory as the project argument.
#
# Installation:
#   1. Download/clone Orbit Code to any directory
#   2. Add the bin directory to your PATH, or
#   3. Create an alias in your PowerShell profile:
#      function orbit { & "C:\path\to\orbit_code\bin\orbit.ps1" @args }

param(
    [Parameter(ValueFromRemainingArguments)]
    [string[]]$Arguments
)

# Get the script's directory and navigate to the project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$orbitDir = Join-Path $projectRoot "packages\mimo-core\packages\opencode"

# Store the current working directory
$currentDir = Get-Location

# Change to the Orbit Code project directory for module resolution
Set-Location $orbitDir

# Run Orbit Code with the current directory as the project argument
& bun run --conditions=browser src/index.ts "$currentDir" @Arguments

# Return to the original directory
Set-Location $currentDir
