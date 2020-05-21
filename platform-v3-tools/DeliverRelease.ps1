param(
    [String]$RootPath,
    $NewVersion = '3.1.0'
)

Import-Module PackageManagement

$modulesPath = Join-Path $RootPath 'modules'
$v3BranchName = 'release/3.0.0'

$manifestFilename = 'module.manifest'

function Get-OrderedModulesLocations {
    param (
        [String] $Path
    )

    $processedModules = @{}
    $restModules = @{}
    $moduleName2Branch = @{}
    $orderedModules = [System.Collections.ArrayList]@()
    $modulesLocations = Get-ChildItem $Path |
            Where-Object {$_.PSIsContainer} |
            Foreach-Object {$_.Name}

    Get-ChildItem -Path $Path -Filter $manifestFilename -Recurse | Where-Object { $_ -notmatch 'artifacts' } | ForEach-Object {
        [Xml]$xml = Get-Content -Path $_.FullName;

        $modulePath = $_.FullName;
        $modulesLocations | ForEach-Object { if ($modulePath.Contains((Join-Path $_ 'src'))) { $moduleName2Branch.Add($xml.module.id, $_) } }

        $NodeExists = $xml.SelectSingleNode("./module/dependencies")
        if ($null -ne $NodeExists) {
            $restModules.Add($xml.module.id, $xml);
        }
        else {
            $processedModules.Add($xml.module.id, $xml);
            $orderedModules.Add($moduleName2Branch[$xml.module.id]) | Out-Null
        }
    }

    do
    {
        Set-Variable -Name ModulesToProcess -Value @{}
        $restModules.GetEnumerator() | ForEach-Object { $ModulesToProcess.Add($_.Key, $_.Value) }
        $ModulesToProcess.GetEnumerator() | ForEach-Object {

            Set-Variable -Name hasDependenciesInOrderedList -Value true
            $_.Value.SelectNodes("./module/dependencies/dependency") | ForEach-Object {
                if (!$processedModules.ContainsKey($_.id))
                {
                    Set-Variable -Name hasDependenciesInOrderedList -Value false
                }
            }

            if ($hasDependenciesInOrderedList)
            {
                $processedModules.Add($_.Key, $_.Value)
                $restModules.Remove($_.Key)
                $orderedModules.Add($moduleName2Branch[$_.Key]) | Out-Null
            }

        }
    }
    while ($restModules.Count -gt 0)

    return $orderedModules
}

function Get-ModulesHavingBranch {
    param (
        [String]$BranchName
    )

    # For debug purposes take a predefined list
    return  @(
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
        "vc-module-search",
        "vc-module-shipping",
        "vc-module-sitemaps",
        "vc-module-store",
        "vc-module-subscription",
        "vc-module-tax"
        )

    $modules = [System.Collections.ArrayList]@()

    $params = @{
        'UriFragment' = 'search/repositories?q=org%3AVirtoCommerce+vc-module'
        'Description' =  'Search for all modules repositories'
    }

    $result = Invoke-GHRestMethodMultipleResult @params

    $result.items | ForEach-Object {
        $branch = Get-GitHubBranch -Uri $_.html_url |
                Where-Object -FilterScript { $_.name -eq $BranchName }

        if (-not ($null -eq $branch)) {
            $modules.Add($_.name)
        }
    }

    return $modules;
}


function Sync-Modules {
    param (
        [String]$Path,
        [String]$BranchName,
        [String[]]$Modules
    )

    New-Item -ItemType Directory -Force -Path $Path

    $Modules | ForEach-Object {
        
        Write-Host "Clone or pull repository $($_)"
        
        $modulePath = Join-Path $Path $_
        
        if (Test-Path $modulePath) {
            Write-Host "Checkout $($BranchName) and pull..."
            Set-Location $modulePath
            git checkout $BranchName
            git pull
        }
        else {
            Write-Host "Clone..."
            Set-Location $Path
            git clone "https://github.com/VirtoCommerce/$($_)"
            Set-Location $modulePath
            git checkout $BranchName
        }
    }

}

function Set-ModuleVersion {
    param ([String]$Path, [String]$Version)
    
    # Update Directory.Build.Props
    $buildPropsPath = Join-Path $Path 'Directory.Build.Props'
    [Xml]$buildPropsXml = Get-Content -Path $buildPropsPath

    $versionPrefixNode = $buildPropsXml.SelectNodes('Project/PropertyGroup/VersionPrefix') |
                         Select-Object -First 1
    
    $versionPrefixNode.InnerText = $Version
    $buildPropsXml.Save($buildPropsPath)

    # Update module.manifest
    Get-ChildItem -Path $Path -Filter $manifestFilename -Recurse | ForEach-Object {
        [Xml]$xml = Get-Content -Path $_.FullName;
        
        $node = $xml.SelectSingleNode('module/version')
        $node.InnerText = $Version

        $node = $xml.SelectSingleNode('module/platformVersion')
        $node.InnerText = $Version

        $nodes = $xml.SelectNodes('module/dependencies/dependency')
        $nodes | ForEach-Object {
            $_.version = $Version
        }
        
        $xml.Save($_.FullName)
    }
}

function Update-ModuleDependencies {
    param (
        [String]$Path, 
        [String[]]$ReleasedModulesIds,
        [String]$Version
    )

    $dependencies = [System.Collections.ArrayList]@()

    Get-ChildItem -Path $Path -Filter '*.csproj' -Recurse | ForEach-Object {
        
        [Xml]$xml = Get-Content -Path $_.FullName;

        $xml.SelectNodes('//Project/ItemGroup/PackageReference[starts-with(@Include, ''VirtoCommerce'')]') |
                ForEach-Object {
                    $name = $_.Include
                    $modules = $ReleasedModulesIds | Where-Object { $name -like "$($_)Module*" }
                    
                    if ($modules.Length -gt 0 -or $name -like "VirtoCommerce.Platform*") {
                        if (-not($dependencies.Contains($name))) {
                            $dependencies.Add($name) | Out-Null
                        }
                        
                        $_.Version = $Version
                    }
                }
        
        $xml.Save($_.FullName)
    }

    Write-Host "Ensure all dependencies of $($Path) are indexed in NuGet..."
    $dependencies | ForEach-Object {
        Wait-PackageIndexed $_ -Version $Version
    }
}

function Test-PackagePartOfAnyModule {
    param (
        [String]$Name,
        [String[]]$ModulesIds
    )
    
    $modules = $ModulesIds | Where-Object { $Name -Match $_ }
    
    return ($modules.Length -gt 0)
}

function Invoke-CommitVersionChange {
    param (
        [string] $Path,
        [String]$Version
    )
    
    Set-Location $Path

    git pull
    git commit -am $Version
    git push
    
}

function Test-PackageIndexed {
    param (
        [String] $Name,
        [String] $Version
    )

    $foundPackages = Find-Package -Name $Name -ProviderName NuGet -AllowPrereleaseVersions -AllVersions -MinimumVersion $Version -ErrorAction SilentlyContinue
    
    return $foundPackages.Length -gt 0
}

function Wait-PackageIndexed {
    param (
        [String] $Name,
        [String] $Version
    )
    
    while (-Not (Test-PackageIndexed -Name $Name -Version $Version)) {
        
        Write-Host "Module $($Name) of version $($Version) is not indexed, will check again in 60 seconds"
        
        Start-Sleep -Seconds 60
        
    }
}

function Get-ModuleId2ModuleMap {
    param (
        [String] $Path
    )

    $map = @{}
    
    Write-Host "Get-ModuleId2ModuleMap for $($Path)"

    Get-ChildItem -Path $Path -Filter $manifestFilename -Recurse | Where-Object { $_ -notmatch 'artifacts' } | ForEach-Object {
        
        [Xml]$xml = Get-Content $_.FullName;
        $moduleName = $_.Directory.Parent.Parent.Name;
        
        Write-Host "Add modulee $($xml.module.id) - $($moduleName)"
        
        $map.Add($xml.module.id, $moduleName)

    }
    
    return $map
}

# ---------------- MAIN SCRIPT ----------------

$modules = Get-ModulesHavingBranch -BranchName $v3BranchName

$module2ModuleIdMap = Get-ModuleId2ModuleMap($modulesPath)
$releasedModulesIds = $module2ModuleIdMap.GetEnumerator() |
        Where-Object { $modules.Contains($_.Value) } | Select-Object -ExpandProperty Key

Sync-Modules $modulesPath -BranchName $v3BranchName -Modules $modules
$orderedModules = Get-OrderedModulesLocations $modulesPath

$orderedModules | ForEach-Object {

    $modulePath = Join-Path $modulesPath $_;
    
    Set-ModuleVersion $modulePath -Version $NewVersion
    Update-ModuleDependencies $modulePath -ReleasedModules $releasedModulesIds -Version $NewVersion
    Invoke-CommitVersionChange $modulePath -Version $newVersion

}