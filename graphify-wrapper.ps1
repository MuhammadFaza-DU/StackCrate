# graphify-wrapper.ps1
# Loads .env variables into environment, then runs graphify via uv tool
param([Parameter(ValueFromRemainingArguments=$true)]$args)

# Load .env from project root (where this script lives)
$projectRoot = $PSScriptRoot
$envFile = Join-Path $projectRoot ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and $line -notmatch "^#" -and $line -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Skip if still a placeholder
            if ($value -match '^<.*>$') {
                Write-Host "  Skipping placeholder: $key"
            }
            else {
                [Environment]::SetEnvironmentVariable($key, $value, "User")
                Write-Host "  Loaded $key"
            }
        }
    }
}

# Also load .env.graphify (shared, no secrets)
$envGraphify = Join-Path $projectRoot ".env.graphify"
if (Test-Path $envGraphify) {
    Get-Content $envGraphify | ForEach-Object {
        $line = $_.Trim()
        if ($line -and $line -notmatch "^#" -and $line -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "User")
        }
    }
}

# Run graphify via uv tool
Write-Host "`nRunning graphify..."
uv tool run --from graphifyy graphify @args