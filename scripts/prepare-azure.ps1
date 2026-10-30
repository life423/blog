param(
    [string]$ResourceGroup = 'portfolio-apps',
    [string]$StorageAccount = 'drewblogdata',
    [string]$Location = 'eastus2',
    [string]$AppName = 'blogportfolio',
    [switch]$ConfigureApp
)
$ErrorActionPreference = 'Stop'

function Invoke-Azure {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    $result = & az @Arguments --only-show-errors
    if ($LASTEXITCODE -ne 0) { throw "Azure command failed: $($Arguments[0..1] -join ' ')" }
    return $result
}

$subscription = Invoke-Azure @('account', 'show', '--query', 'id', '-o', 'tsv')
$storageId = "/subscriptions/$subscription/resourceGroups/$ResourceGroup/providers/Microsoft.Storage/storageAccounts/$StorageAccount"
Invoke-Azure @('storage','account','create','--name',$StorageAccount,'--resource-group',$ResourceGroup,'--location',$Location,'--sku','Standard_LRS','--kind','StorageV2','--access-tier','Hot','--min-tls-version','TLS1_2','--allow-blob-public-access','false','--allow-shared-key-access','false','--https-only','true','-o','none')
$owner = Invoke-Azure @('ad','signed-in-user','show','--query','id','-o','tsv')
foreach ($role in @('Storage Table Data Contributor', 'Storage Blob Data Contributor')) {
    Invoke-Azure @('role','assignment','create','--assignee-object-id',$owner,'--assignee-principal-type','User','--role',$role,'--scope',$storageId,'-o','none')
}
Invoke-Azure @('storage','table','create','--name','posts','--account-name',$StorageAccount,'--auth-mode','login','-o','none')
foreach ($container in @('articles','media')) {
    Invoke-Azure @('storage','container','create','--name',$container,'--account-name',$StorageAccount,'--auth-mode','login','--public-access','off','-o','none')
}
if ($ConfigureApp) {
    # This configures the existing app for a later image deployment; it does not deploy code.
    # Read hashes/secrets from the ignored local environment without printing them.
    $settings = @{}
    foreach ($line in Get-Content -LiteralPath (Join-Path $PSScriptRoot '../.env')) {
        if ($line -match '^([A-Z_]+)=(.*)$') { $settings[$Matches[1]] = $Matches[2] }
    }
    foreach ($key in @('ADMIN_USERNAME','ADMIN_PASSWORD_HASH','ADMIN_SESSION_SECRET')) {
        if (-not $settings[$key]) { throw "Run node scripts/setup-admin.js first; missing $key." }
    }
    $identity = Invoke-Azure @('containerapp','identity','assign','-n',$AppName,'-g',$ResourceGroup,'--system-assigned','--query','principalId','-o','tsv')
    foreach ($role in @('Storage Table Data Contributor','Storage Blob Data Contributor')) {
        Invoke-Azure @('role','assignment','create','--assignee-object-id',$identity,'--assignee-principal-type','ServicePrincipal','--role',$role,'--scope',$storageId,'-o','none')
    }
    Invoke-Azure @('containerapp','secret','set','-n',$AppName,'-g',$ResourceGroup,'--secrets',"admin-password-hash=$($settings['ADMIN_PASSWORD_HASH'])","admin-session-secret=$($settings['ADMIN_SESSION_SECRET'])",'-o','none')
    Invoke-Azure @('containerapp','update','-n',$AppName,'-g',$ResourceGroup,'--set-env-vars',"AZURE_STORAGE_ACCOUNT=$StorageAccount",'NODE_ENV=production','DESIGN_PREVIEW=false','TRUST_AZURE_AUTH=false',"ADMIN_USERNAME=$($settings['ADMIN_USERNAME'])",'ADMIN_PASSWORD_HASH=secretref:admin-password-hash','ADMIN_SESSION_SECRET=secretref:admin-session-secret','PUBLIC_ORIGIN=https://blog.drewclark.io','--cpu','0.25','--memory','0.5Gi','--min-replicas','0','--max-replicas','2','-o','none')
}
Write-Output "Storage ready: $StorageAccount. Existing public image and domain have not been replaced."
