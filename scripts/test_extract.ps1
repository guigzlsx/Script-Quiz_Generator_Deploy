param(
  [string]$FilePath = "./tmp/extracted_spec.pdf",
  [string]$Url = "http://localhost:3000/extract-smartphone"
)

if (-not (Test-Path $FilePath)) {
  Write-Error "Fichier $FilePath introuvable. Mettez un fichier de test ou changez le paramètre FilePath."
  exit 2
}

# Envoi du fichier en multipart/form-data
$form = @{ file = Get-Item $FilePath; source = [System.IO.Path]::GetFileName($FilePath) }

try {
  $resp = Invoke-RestMethod -Uri $Url -Method Post -Form $form -TimeoutSec 120
  Write-Output "Réponse du serveur :"
  $resp | ConvertTo-Json -Depth 10
} catch {
  Write-Error "Erreur lors de la requête : $_"
}
