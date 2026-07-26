@echo off
REM Orbit Code launcher for Windows
REM Usage: orbit [args...]
REM
REM This script runs Orbit Code from any directory by
REM passing the current directory as the project argument.

setlocal

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Navigate to project root (parent of bin)
set PROJECT_ROOT=%SCRIPT_DIR%..

REM Set the Orbit Code directory
set ORBIT_DIR=%PROJECT_ROOT%\packages\mimo-core\packages\opencode

REM Store the original working directory
set ORIGINAL_DIR=%CD%

REM Change to the Orbit Code project directory for module resolution
cd /d "%ORBIT_DIR%"

REM Run Orbit Code with the current directory as the project argument
bun run --conditions=browser src/index.ts "%ORIGINAL_DIR%" %*

REM Return to the original directory
cd /d "%ORIGINAL_DIR%"
