$ErrorActionPreference = "Continue"

Write-Host "Fetching latest branches..."
git fetch --all

Write-Host "Getting list of merged remote branches..."
$mergedBranches = git branch -r --merged Beginners_Branch | ForEach-Object { $_.Trim() } | Where-Object { 
    $_ -ne "" -and 
    $_ -notmatch "HEAD" -and 
    $_ -notmatch "main$" -and 
    $_ -notmatch "master$" -and 
    $_ -notmatch "Beginners_Branch$"
}

if ($mergedBranches.Count -eq 0) {
    Write-Host "No merged branches to clean up."
    exit
}

foreach ($br in $mergedBranches) {
    # Extract the remote branch name without the 'origin/' prefix
    $branchName = $br -replace "^origin/", ""
    
    Write-Host "Deleting merged branch: $branchName"
    git push origin --delete $branchName
}

Write-Host "Cleanup completed successfully!"
