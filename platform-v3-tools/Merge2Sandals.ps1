param(
    [String]$SandalsPath
)

$DevBranch = "dev-3.0.0"
$SandalsBranch = "feature/migrate-to-vc30"

$repositories =
    "vc-platform",
    "vc-module-catalog",
    "vc-module-core",
    "vc-module-order",
    "vc-module-customer",
    "vc-module-cart",
    "vc-module-pricing",
    "vc-module-store",
    "vc-module-subscription",
    "vc-module-content",
    "vc-module-marketing",
    "vc-module-image-tools",
    "vc-module-search",
    "vc-module-inventory",
    "vc-module-catalog-personalization",
    "vc-module-sitemaps",
    "vc-module-elastic-search",
    "vc-module-notification",
    "vc-module-catalog-publishing",
    "vc-module-customer-review",
    "vc-module-payment",
    "vc-module-export",
    "vc-module-shipping",
    "vc-module-tax"

New-Item -ItemType Directory -Force -Path $SandalsPath | Out-Null

$mergedRepositories = [System.Collections.ArrayList]@()

$repositories | ForEach-Object {

    Write-Host "Clone or pull repository $($_)"

    $repositoryPath = Join-Path $SandalsPath $_

    if (-Not (Test-Path $repositoryPath)) {
        Set-Location $SandalsPath
        git clone "https://github.com/VirtoCommerce/$($_)"
    }

    Set-Location $repositoryPath
    git checkout $DevBranch
    git pull
    git checkout $SandalsBranch
    git pull

    $merge = git diff $SandalsBranch..$DevBranch
    
    if ($merge)
    {
        git merge $DevBranch

        git push
        $mergedRepositories.Add($_) | Out-Null
    }
}

Write-Host "Updated repositories:"
Write-Host $mergedRepositories