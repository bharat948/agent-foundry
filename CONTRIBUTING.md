# Contributing

## Rules for `main` (enforced by branch protection)
- Change `main` only through a pull request. Direct pushes are blocked.
- The `ci` status check must pass and the branch must be up to date with `main`.
- A PR needs 1 approving review before it can merge (Sentinel reviews QA and security).
- These rules apply to admins too.
- Force pushes to `main` and deleting `main` are both blocked.
- Use one branch per ticket, named `af-NNN-short-name`.
- Keep credentials out of code, commits and logs.

## Who did what
Every agent pushes as the `bharat948` GitHub account. Tell work apart by the branch name (`af-NNN-...`) and the PR description, which should name the ticket and the agent that owns it.
