param(
    [String]$WorkingPath,
    [String]$Organization = "leonidnorg"
)

$V3Branch = "dev-3.0.0"
$GABranch = "dev"

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
    "vc-module-datatrans",
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

New-Item -ItemType Directory -Force -Path $GABranch | Out-Null

$processedRepositories = [System.Collections.ArrayList]@()

$repositories | ForEach-Object {

    Write-Host "Clone or pull repository $($_)"

    $repositoryPath = Join-Path $WorkingPath $_

    if (-Not (Test-Path $repositoryPath)) {
        Set-Location $WorkingPath
        git clone "https://github.com/$($Organization)/$($_)"
    }

    Set-Location $repositoryPath
    git checkout $V3Branch
    git pull
    git push --force -origin "$($V3Branch):$($GABranch)"
    git pull

    processedRepositories.Add($_) | Out-Null
}

Write-Host "Updated repositories:"
Write-Host $processedRepositories