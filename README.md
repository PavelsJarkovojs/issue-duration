# Issue Duration Labeler

A GitHub Action that automatically labels issues based on how long they have been open. This action helps teams visualize issue age with color-coded labels, making it easier to identify stale issues that need attention.

## What This Action Does

The Issue Duration Labeler automatically adds duration labels to your GitHub issues based on customizable time thresholds. Labels are color-coded to provide quick visual feedback:
- **Green**: Short duration (recently opened issues)
- **Orange**: Medium duration (issues that need attention)
- **Red**: Long duration (stale issues that may need priority)

## Inputs

### Required

- **`github-token`** (required)
  - Description: GitHub token for authentication
  - Example: `${{ secrets.GITHUB_TOKEN }}`

### Optional

- **`issue_state`** (optional)
  - Description: Filter issues by state
  - Options: `all`, `open`, `closed`
  - Default: `all`

- **`filter_label`** (optional)
  - Description: Only process issues with this specific label
  - Default: Process all issues (no filter)

- **`short_threshold`** (optional)
  - Description: Days threshold for short duration label
  - Default: `7`

- **`medium_threshold`** (optional)
  - Description: Days threshold for medium duration label
  - Default: `14`

- **`short_color`** (optional)
  - Description: Hex color code for short duration label (without #)
  - Default: `0E8A16` (green)

- **`medium_color`** (optional)
  - Description: Hex color code for medium duration label (without #)
  - Default: `FFA500` (orange)

- **`long_color`** (optional)
  - Description: Hex color code for long duration label (without #)
  - Default: `B60205` (red)

- **`thresholded_update`** (optional)
  - Description: Only update labels when crossing thresholds
  - Options: `true`, `false`
  - Default: `false`

## Outputs

- **`labeled-issues`**
  - Description: Number of issues that were labeled

## Usage Instructions

### Basic Setup

Create a workflow file (e.g., `.github/workflows/issue-duration-labeler.yml`) in your repository:

```yaml
name: Label Issues with Duration

on:
  schedule:
    - cron: '0 0 * * *'  # Run daily at midnight
  workflow_dispatch:  # Allow manual triggering

jobs:
  label-issues:
    runs-on: ubuntu-latest
    steps:
      - uses: PavelsJarkovojs/issue-duration@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Example: Label Only Open Issues

```yaml
- uses: PavelsJarkovojs/issue-duration@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    issue_state: 'open'
```

### Example: Custom Thresholds with Label Filtering

```yaml
- uses: PavelsJarkovojs/issue-duration@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    issue_state: 'open'
    filter_label: 'bug'  # Only process open issues labeled as 'bug'
    short_threshold: '3'
    medium_threshold: '7'
    short_color: '00FF00'
    medium_color: 'FFAA00'
    long_color: 'FF0000'
```

### Example: Threshold-Based Updates

```yaml
- uses: PavelsJarkovojs/issue-duration@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    issue_state: 'all'
    short_threshold: '7'
    medium_threshold: '30'
    thresholded_update: 'true'  # Only update when crossing thresholds
```

## How It Works

1. The action fetches issues based on the `issue_state` filter
2. If `filter_label` is specified, only issues with that label are processed
3. For each issue, it calculates the duration (days since creation)
4. Based on the thresholds, it assigns the appropriate duration label:
   - `duration: short` (< short_threshold days)
   - `duration: medium` (between short_threshold and medium_threshold days)
   - `duration: long` (> medium_threshold days)
5. If `thresholded_update` is true, labels are only updated when an issue crosses a threshold
6. Labels are automatically created with the specified colors if they don't exist

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
