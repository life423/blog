param(
    [string]$AppName = 'blogportfolio',
    [string]$ResourceGroup = 'portfolio-apps',
    [string]$ImageTag
)
$ErrorActionPreference = 'Stop'

# Preserve the complete current template, including image, environment and scaling.
$raw = & az containerapp show -n $AppName -g $ResourceGroup --query '{id:id,template:properties.template}' -o json --only-show-errors
if ($LASTEXITCODE -ne 0) { throw 'Unable to read the existing container app.' }
$snapshot = $raw | ConvertFrom-Json
if ($snapshot.template.containers.Count -ne 1) { throw 'Expected one container; refusing an ambiguous update.' }
$snapshot.template.containers[0].probes = @(Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'readiness-probes.json') | ConvertFrom-Json)
if ($ImageTag) { $snapshot.template.containers[0].image = $ImageTag }
$patch = @{ properties = @{ template = $snapshot.template } } | ConvertTo-Json -Depth 40
$patchFile = [System.IO.Path]::GetTempFileName()
try {
    [System.IO.File]::WriteAllText($patchFile, $patch)
    & az rest --method patch --url "https://management.azure.com$($snapshot.id)?api-version=2025-01-01" --body "@$patchFile" --output none --only-show-errors
    if ($LASTEXITCODE -ne 0) { throw 'Readiness configuration failed.' }
} finally {
    Remove-Item -LiteralPath $patchFile
}
Write-Output 'Readiness probes configured; credentials, resources and scaling preserved.'
