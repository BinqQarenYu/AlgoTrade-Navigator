$ErrorActionPreference = "Continue"

Write-Host "Fetching latest branches..."
git fetch --all

Write-Host "Getting list of unmerged remote branches..."
$branches = git branch -r --no-merged Beginners_Branch | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" -and $_ -notlike "*HEAD*" }

foreach ($br in $branches) {
    Write-Host "----------------------------------------"
    Write-Host "Attempting to merge $br"
    
    # Attempt merge
    git merge $br --no-edit
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Conflict detected or merge failed for $br. Aborting merge." -ForegroundColor Red
        git merge --abort
    } else {
        Write-Host "Successfully merged $br" -ForegroundColor Green
    }
}

Write-Host "----------------------------------------"
Write-Host "Merge process completed."
