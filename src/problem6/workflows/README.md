# Workflows

Canonical workflow for Problem 6 lives here:

**`problem6-ci.yml`**

GitHub Actions only executes workflows under the repository root **`.github/workflows/`**. To run this pipeline on GitHub, copy (or symlink) `problem6-ci.yml` into:

`.github/workflows/problem6-ci.yml`

and add `.github/workflows/problem6-ci.yml` to the `on.push.paths` / `on.pull_request.paths` lists in the YAML if you want workflow edits alone to retrigger CI.
