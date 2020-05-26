param(
    $AccessToken,
    $Organization = 'VirtoCommerce'
)

$Branches = "dev", "master"

if (-not (Get-Module -ListAvailable -Name PowerShellForGitHub)) {
    Install-Module PowerShellForGitHub -Force
}

Import-Module PowerShellForGitHub

$repositories =
    "vc-platform",
    "vc-storefront-core",
    "vc-module-Authorize.Net",
    "vc-module-avatax",
    "vc-module-azure-search",
    "vc-module-bulk-actions",
    "vc-module-cart",
    "vc-module-catalog",
    "vc-module-catalog-csv-import",
    "vc-module-catalog-personalization",
    "vc-module-catalog-publishing",
    "vc-module-content",
    "vc-module-core",
    "vc-module-customer",
    "vc-module-customer-review",
    "vc-module-elastic-search",
    "vc-module-export",
    "vc-module-image-tools",
    "vc-module-inventory",
    "vc-module-lucene-search",
    "vc-module-marketing",
    "vc-module-notification",
    "vc-module-order",
    "vc-module-pagebuilder",
    "vc-module-payment",
    "vc-module-pricing",
    "vc-module-quote",
    "vc-module-search",
    "vc-module-shipping",
    "vc-module-sitemaps",
    "vc-module-store",
    "vc-module-subscription",
    "vc-module-tax"

$template = Get-Content "rep-branch-settings.json" | Out-String

$repositories | ForEach-Object {

    $Repository = $_

    $Branches | ForEach-Object {

        $Branch = $_

        $settings = $template.Replace("REPOSITORY_NAME_PLACEHOLDER", $Repository).Replace("BRANCH_NAME_PLACEHOLDER", $Branch).Replace("ORGANIZATION_NAME_PLACEHOLDER", $Organization)

        $params = @{
            'Method' = 'PUT'
            'AccessToken' = $AccessToken
            'UriFragment' = "repos/$($Organization)/$($Repository)/branches/$($Branch)/protection"
            'Description' =  "Set $($Repository) protection settings for $($Repository)"
        }
        
        Invoke-GHRestMethod @params -Body $settings | Out-Null
    
        Write-Host "Repository '$($Organization)/$($Repository)' settings for the branch '$($Branch)' have been updated updated"
    }
}