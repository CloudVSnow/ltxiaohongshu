$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$requirementsPath = Join-Path $root 'docs/mvp-requirements.md'
$flowsPath = Join-Path $root 'docs/mvp-flows.md'
$requirements = Get-Content -LiteralPath $requirementsPath -Raw -Encoding utf8
$flows = Get-Content -LiteralPath $flowsPath -Raw -Encoding utf8

# Prevent broken local references as planning documents evolve.
foreach ($documentPath in @($requirementsPath, $flowsPath)) {
    $content = Get-Content -LiteralPath $documentPath -Raw -Encoding utf8
    foreach ($link in [regex]::Matches($content, '\]\(([^)#]+)(?:#[^)]*)?\)')) {
        $target = Join-Path (Split-Path $documentPath -Parent) $link.Groups[1].Value
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
            throw "Broken document link: $target"
        }
    }
}

# Every requirement needs an acceptance criterion and a mapped end-to-end flow.
$sections = [regex]::Matches($requirements, '(?ms)^### (R\d+) ([^\r\n]+)\r?\n(.*?)(?=^### |^## |\z)')
if ($sections.Count -eq 0) { throw 'No requirements found' }
$ids = @($sections | ForEach-Object { $_.Groups[1].Value })
if (($ids | Select-Object -Unique).Count -ne $ids.Count) { throw 'Duplicate requirement ID' }
foreach ($section in $sections) {
    $id = $section.Groups[1].Value
    if ($section.Groups[3].Value -notmatch '验收：\S') { throw "Missing acceptance criteria: $id" }
    if ($flows -notmatch "(?m)^覆盖：[^\r\n]*\b$id\b") { throw "Unmapped requirement: $id" }
}
$flowSections = [regex]::Matches($flows, '(?ms)^### (F\d+) [^\r\n]+\r?\n(.*?)(?=^### |^## |\z)')
if ($flowSections.Count -eq 0) { throw 'No acceptance flows found' }
$flowIds = @($flowSections | ForEach-Object { $_.Groups[1].Value })
if (($flowIds | Select-Object -Unique).Count -ne $flowIds.Count) { throw 'Duplicate flow ID' }
foreach ($flow in $flowSections) {
    $mapping = [regex]::Match($flow.Groups[2].Value, '(?m)^覆盖：([^\r\n]+)')
    if (-not $mapping.Success) { throw "Missing flow mapping: $($flow.Groups[1].Value)" }
    foreach ($reference in [regex]::Matches($mapping.Groups[1].Value, '\bR\d+\b')) {
        if ($reference.Value -notin $ids) { throw "Unknown requirement: $($reference.Value)" }
    }
}
Write-Output "PASS: local links, $($ids.Count) requirements and $($flowIds.Count) acceptance flows."
