# Contributing

## Rules for `main` (team rule, not enforced by GitHub)
- Change `main` only through a pull request. No direct pushes.
- Merge only after the `ci` check passes **and** Sentinel (QA/security) approves.
- No force pushes to `main`, and never delete it.
- Use one branch per ticket, named `af-NNN-short-name`.
- Keep credentials out of code, commits and logs.

## Why GitHub doesn't enforce this
This is a private repo on GitHub Free. GitHub refused both branch protection and rulesets with:
`HTTP 403 "Upgrade to GitHub Pro or make this repository public to enable this feature."`
Bharat chose to keep the repo private, so every contributor follows these rules by hand.
