const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    // Check if running in GitHub Actions context
    if (!github.context.repo.owner || !github.context.repo.repo) {
      core.setFailed('This action must be run within GitHub Actions context. For testing, deploy to a repository and run the workflow.');
      return;
    }

    // Configuration
    const config = {
      shortThreshold: parseInt(core.getInput('short_threshold')) || 7,
      mediumThreshold: parseInt(core.getInput('medium_threshold')) || 30,
      colors: {
        short: core.getInput('short_color') || '00FF00',
        medium: core.getInput('medium_color') || 'FFA500',
        long: core.getInput('long_color') || 'FF0000'
      },
      thresholdedUpdate: core.getInput('thresholded_update') === 'true',
      filterLabel: core.getInput('filter_label') || '',
      issueState: core.getInput('issue_state') || 'all'
    };
    const token = core.getInput('github-token');
    const octokit = github.getOctokit(token);

    // Main function to process issues
    async function processIssues() {
      let allIssues = [];
      let page = 1;
      const perPage = 100;

      // Build the API parameters
      const apiParams = {
        ...github.context.repo,
        state: config.issueState,
        per_page: perPage,
        page: page
      };

      // Only add labels filter if filterLabel is provided
      if (config.filterLabel) {
        apiParams.labels = config.filterLabel;
      }

      // Fetch all pages of issues
      while (true) {
        const labelFilter = config.filterLabel ? ` with label '${config.filterLabel}'` : '';
        core.info(`Fetching page ${page} of ${config.issueState} issues${labelFilter}...`);
        
        // Update page number for current request
        apiParams.page = page;
        
        const { data: issues } = await octokit.rest.issues.listForRepo(apiParams);

        if (issues.length === 0) {
          break; // No more issues to fetch
        }

        allIssues = allIssues.concat(issues);
        
        // If we got fewer than perPage results, this is the last page
        if (issues.length < perPage) {
          break;
        }
        
        page++;
      }

      const filterMessage = config.filterLabel 
        ? `${config.issueState} issues with '${config.filterLabel}' label` 
        : `${config.issueState} issues`;
      core.info(`Found ${allIssues.length} total ${filterMessage}`);

      for (const issue of allIssues) {

        const duration = calculateDuration(issue);
        const { label, color } = getLabelAndColorForDuration(duration, config);

        if (!config.thresholdedUpdate || (config.thresholdedUpdate && label)) {
          await removeOldDurationLabels(issue, octokit);
          if (label) {
            await createOrUpdateLabel(label, color, octokit);
            await addLabelToIssue(issue, label, octokit);
            core.info(`Updated issue #${issue.number} with label: ${label} (color: ${color})`);
          }
        }
      }
    }

    // Calculate duration of an issue
    function calculateDuration(issue) {
      const createdAt = new Date(issue.created_at);
      const endDate = issue.closed_at ? new Date(issue.closed_at) : new Date();
      return Math.ceil((endDate - createdAt) / (1000 * 60 * 60 * 24));
    }

    // Determine label and color based on duration and config
    function getLabelAndColorForDuration(duration, config) {
      if (duration <= config.shortThreshold) {
        return { label: `Duration: 1-${config.shortThreshold} days`, color: config.colors.short };
      } else if (duration <= config.mediumThreshold) {
        return { label: `Duration: ${config.shortThreshold + 1}-${config.mediumThreshold} days`, color: config.colors.medium };
      } else {
        return { label: 'Duration: >1 month', color: config.colors.long };
      }
    }

    // Remove old duration labels from an issue
    async function removeOldDurationLabels(issue, octokit) {
      const oldLabels = issue.labels.filter(label => label.name.startsWith('Duration:'));
      for (const label of oldLabels) {
        try {
          await octokit.rest.issues.removeLabel({
            ...github.context.repo,
            issue_number: issue.number,
            name: label.name
          });
        } catch (error) {
          core.warning(`Failed to remove old label from issue #${issue.number}: ${error.message}`);
        }
      }
    }

    // Create or update a label
    async function createOrUpdateLabel(name, color, octokit) {
      try {
        await octokit.rest.issues.createLabel({
          ...github.context.repo,
          name: name,
          color: color
        });
      } catch (error) {
        if (error.status === 422) {
          try {
            await octokit.rest.issues.updateLabel({
              ...github.context.repo,
              name: name,
              color: color
            });
          } catch (updateError) {
            core.warning(`Failed to update label: ${updateError.message}`);
          }
        } else {
          core.warning(`Failed to create label: ${error.message}`);
        }
      }
    }

    // Add a label to an issue
    async function addLabelToIssue(issue, label, octokit) {
      try {
        await octokit.rest.issues.addLabels({
          ...github.context.repo,
          issue_number: issue.number,
          labels: [label]
        });
      } catch (error) {
        core.warning(`Failed to add label to issue #${issue.number}: ${error.message}`);
      }
    }

    // Run the main function
    await processIssues();
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();