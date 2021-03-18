// HT: @alexanderson1993 for creating the first version of this action ❤

const core = require('@actions/core')
const github = require('@actions/github')

async function go() {
  const skipRegexes = JSON.parse(github.getOctokit(core.getInput('skip_regex')))
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
  const workflowName = core.getInput('workflow_name')

  const {data: repoWorkflows} = await octokit.actions.listRepoWorkflows({
    owner,
    repo,
  })
  const workflow = repoWorkflows.workflows.find(
    ({name}) => name === workflowName,
  )

  const res = await octokit.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: workflow.id,
    status: 'success',
    branch: core.getInput('branch'),
    event: 'push',
  })

  const headCommits = res.data.workflow_runs.map(run => {
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
