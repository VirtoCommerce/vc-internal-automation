# Platform V3 Tools

Tools automating Platform V3 releases delivery

## Overview

* DeliverRelease.ps1 - takes parameters -RootPath with a local path to store repositories (without commas) and -NewVersion with new version tag (like rc.5).
* Merge2Sandals.ps1 - takes parameter -SandalsPath with a local path to store repositories (without commas)
* V3GAChangeBranches.ps1 - force push dev-3.0.0 to dev and release/3.0.0 to master for all platform repositories. Takes parameter -WorkingBranch with a local path to store repositories (without commas)