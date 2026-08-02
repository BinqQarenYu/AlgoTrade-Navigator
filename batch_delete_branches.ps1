$ErrorActionPreference = "Continue"

Write-Host "Fetching latest branches..."
git fetch --all

Write-Host "Getting list of merged remote branches..."
$mergedBranches = git branch -r | ForEach-Object { $_.Trim() } | Where-Object { 
    $_ -ne "" -and 
    $_ -notmatch "HEAD" -and 
    $_ -notmatch "main$" -and 
    $_ -notmatch "master$" -and 
    $_ -notmatch "latest_aug_version$"
}

if ($mergedBranches.Count -eq 0) {
    Write-Host "No merged branches to clean up."
    exit
}

$branchNames = @()
foreach ($br in $mergedBranches) {
    # Extract the remote branch name without the 'origin/' prefix
    $branchName = $br -replace "^origin/", ""
    $branchNames += $branchName
}

Write-Host "Found $($branchNames.Count) branched to delete. Deleting in bulk..."
$cmdArgs = @("push", "origin", "--delete") + $branchNames

# Execute the single git push command
& git @cmdArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "Bulk cleanup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "An error occurred during bulk cleanup." -ForegroundColor Red
}
