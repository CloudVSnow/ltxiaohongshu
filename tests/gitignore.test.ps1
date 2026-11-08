$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    # Use hypothetical paths so the test creates no credentials or build files.
    $ignored = @(
        'node_modules/vue/package.json',
        'apps/web/node_modules/vue/package.json',
        '.pnpm-store/cache',
        'apps/web/dist/index.html',
        'apps/api/dist/main.js',
        'apps/web/unpackage/dist/build/h5/index.html',
        'apps/web/.hbuilderx/launch.json',
        'apps/web/.vite/cache',
        'apps/api/build.tsbuildinfo',
        'coverage/lcov.info',
        'test-results/result.json',
        'playwright-report/index.html',
        '.env',
        '.env.production',
        'apps/api/.env.local',
        'apps/api/.env.production.local',
        'certificates/distribution.p12',
        'certificates/profile.mobileprovision',
        'logs/server.txt',
        'apps/api/server.log',
        'uploads/photo.jpg',
        '.idea/workspace.xml',
        '.vscode/local.json',
        'apps/web/.DS_Store',
        'Thumbs.db'
    )
    $tracked = @(
        'AGENTS.md', 'LICENSE', '.gitignore',
        'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
        'apps/web/package.json', 'apps/web/src/pages/index.vue',
        'apps/web/src/manifest.json', 'apps/web/src/pages.json',
        'apps/api/src/main.ts', 'apps/api/prisma/schema.prisma',
        'apps/api/prisma/migrations/initial/migration.sql',
        '.env.example', '.env.production.example',
        'apps/api/.env.example', 'apps/web/.env.development.example',
        '.env.sample', '.env.template',
        '.vscode/extensions.json', '.vscode/settings.json',
        '.vscode/tasks.json', '.vscode/launch.json',
        'apps/api/src/uploads/controller.ts',
        'tests/gitignore.test.ps1'
    )
    foreach ($case in @(
        @{ Paths = $ignored; Expected = 0; Label = 'ignored' },
        @{ Paths = $tracked; Expected = 1; Label = 'trackable' }
    )) {
        foreach ($path in $case.Paths) {
            git check-ignore --no-index --quiet -- $path
            if ($LASTEXITCODE -ne $case.Expected) {
                throw "Expected $($case.Label): $path (exit $LASTEXITCODE)"
            }
        }
    }
    Write-Output "PASS: $($ignored.Count + $tracked.Count) gitignore cases."
} finally {
    Pop-Location
}
