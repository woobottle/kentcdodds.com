const core = require('@actions/core')
const github = require('@actions/github')

async function go() {
  const {GITHUB_RUN_ID} = process.env

  const octokit = github.getOctokit(core.getInput('github_token'))
  const {
    repo: {owner, repo},
  } = github.context

  const {data: current_run} = await octokit.actions.getWorkflowRun({
    owner,
    repo,
    run_id: Number(GITHUB_RUN_ID),
  })

  const {
    data: {workflow_runs},
  } = await octokit.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: String(current_run.workflow_id),
    status: 'success',
    branch: current_run.head_branch,
    event: 'push',
  })

  const headCommits = workflow_runs.map(run => {
    return run.head_commit
  })

  const sortedHeadCommits = headCommits.sort((a, b) => {
    const dateA = new Date(a.timestamp)
    const dateB = new Date(b.timestamp)
    if (dateA < dateB) return -1
    if (dateA > dateB) return 1
    return 0
  })

  const lastSuccessCommitHash =
    sortedHeadCommits[sortedHeadCommits.length - 1].id

  core.setOutput('commit_hash', lastSuccessCommitHash)
}

go().then(
  () => core.info('Get Last Commit Hash Complete.'),
  error => {
    core.setFailed(error.message)
  },
)
