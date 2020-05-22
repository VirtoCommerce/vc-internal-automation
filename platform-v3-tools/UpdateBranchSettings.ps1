param(
    $AccessToken,
    $Organization = 'VirtoCommerce'
)

$Branches = "dev", "master"

if (-not (Get-Module -ListAvailable -Name PowerShellForGitHub)) {
    Install-Module PowerShellForGitHub
}

Import-Module PowerShellForGitHub

$repositories =
    "vc-platform"

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
            'Description' =  "Get master branch protection settings for $($Repository)"
        }
        
        Invoke-GHRestMethod @params -Body $settings | Out-Null
    
        Write-Host "Repository '$($Organization)/$($Repository)' settings for the branch '$($Branch)' have been updated updated"
    }
}