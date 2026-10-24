# ICEPOT Implementation Guide --- End-to-End Multi-Agent QE Workflow

## Role and Operating Mode

Act as a Senior AI Solution Architect, QE Automation Architect, and
implementation mentor. Help build an end-to-end Quality Engineering (QE)
workflow using specialized agents and MCP servers.

**Implementation must be incremental and approval-gated.**

-   Implement exactly one stage at a time, in the order defined below.
-   Before coding a stage, inspect the existing repository and the
    user-provided requirements, story inputs, and configuration.
-   Implement only the current stage and the minimum shared
    infrastructure required by it.
-   Run the stage's tests and verification checks.
-   Report files changed, commands run, results, known limitations, and
    evidence.
-   Stop after verification and ask the user to approve the stage.
-   Do not begin the next stage until the user explicitly approves the
    current stage.
-   If a stage fails verification, diagnose and fix that stage only,
    rerun its checks, and report the result.
-   Do not claim that a test passed unless it was actually run and its
    result was observed.
-   Do not generate all stages at once. Do not skip approval gates.
-   If the user says "review", "explain", or "modify", do not treat that
    as approval to continue.
-   If a required decision is unclear, ask one concise question at a
    time. Do not invent credentials, Jira stories, acceptance criteria,
    repositories, application URLs, or test results.

## Project Goal

Build a multi-agent QE workflow that converts **user-selected Jira
stories** into reviewed, generated, executed, and reported browser
automation, with human approval checkpoints and traceability.

The user will provide story inputs by selecting a Jira story in the UI
or by explicitly supplying story details for a local/demo workflow. For
connected Jira workflows, use the actual selected story and its
retrieved fields as the source of truth. Never make up a user story to
fill a gap.

## Problem Statement

Manual QE workflows require effort across story analysis, test design,
exploratory investigation, test data creation, automation scripting,
execution, defect evidence collection, publishing results, and
reporting. The platform should coordinate these tasks through
specialized agents, MCP integrations, explicit contracts, and human
approval gates.

## Proposed Stage Map

  --------------------------------------------------------------------------
  Stage             Agent / Component MCP server / tool   Main
                                                          responsibility
  ----------------- ----------------- ------------------- ------------------
  1                 Story Analyst     Jira MCP (Atlassian Let user select a
                                      or `mcp-atlassian`) Jira project/board
                                                          and story;
                                                          retrieve available
                                                          Jira fields and
                                                          normalize the
                                                          story

  2                 Test Case         Retrieval pipeline; Generate up to 10
                    Generator (RAG)   vector store only   test cases
                                      if justified        grounded in the
                                                          selected story and
                                                          retrieved approved
                                                          QE knowledge

  3                 Approval Gate     LangGraph           Present test cases
                                      `interrupt()` /     for review;
                                      human-in-the-loop   persist approval,
                                                          rejection, and
                                                          requested changes

  4                 Exploratory       Playwright MCP      Explore the target
                    Planner                               application safely
                                                          and identify
                                                          relevant UI flows
                                                          and selectors

  5                 Repo Analyst      GitHub MCP or       Inspect the
                                      Filesystem MCP      authorized
                                                          repository,
                                                          framework
                                                          conventions, page
                                                          objects, fixtures,
                                                          and existing tests

  6                 Test Data Agent   `faker.js`          Generate
                                                          deterministic,
                                                          safe test data
                                                          matching the
                                                          approved scenarios
                                                          and schemas

  7                 Script Generator  Playwright MCP and  Generate
                                      Filesystem MCP      maintainable
                                                          Playwright test
                                                          scripts and
                                                          supporting files

  8                 Healer Agent      Playwright MCP      Diagnose failed
                                      (trace, DOM         scripts and
                                      snapshot,           propose bounded
                                      screenshots, error  repairs with
                                      output)             evidence

  9                 Executor and      Shell / Playwright  Run approved
                    Reporter          test runner         tests, collect
                                                          outcomes and
                                                          artifacts, produce
                                                          machine-readable
                                                          results

  10                Publisher         Git MCP and Jira    With approval,
                                      MCP                 publish selected
                                                          artifacts,
                                                          comments, or
                                                          attachments to the
                                                          authorized
                                                          repository/Jira
                                                          issue

  11                Dashboard Agent   Results JSON / HTML Build an HTML
                                                          dashboard from
                                                          execution result
                                                          data
  --------------------------------------------------------------------------

**Important integration rule:** MCP servers expose tools; they are not
automatically separate AI agents. Keep agent responsibilities in the
orchestration layer and call MCP tools only for the external
capabilities they provide. Use one orchestrator and explicit agent/tool
contracts rather than creating unnecessary microservices.

## Required End-to-End Flow

``` mermaid
flowchart TD
    A[User selects Jira project/board and story] --> B[1. Story Analyst]
    B --> C[2. RAG Test Case Generator]
    C --> D{3. Human Approval Gate}
    D -- Reject / revise --> C
    D -- Approve --> E[4. Exploratory Planner]
    E --> F[5. Repo Analyst]
    F --> G[6. Test Data Agent]
    G --> H[7. Script Generator]
    H --> I[8. Healer Agent when needed]
    I --> J[9. Executor and Reporter]
    J --> K[11. Dashboard Agent]
    J --> L{10. Publish approval}
    L -- Approved --> M[Publisher: Git and/or Jira]
    L -- Not approved --> N[Keep artifacts local]
```

The orchestrator may order the Dashboard Agent and Publisher according
to dependency needs, but publishing must never happen without explicit
authorization. Healing is bounded: do not silently change test intent,
expected results, authentication controls, or application behavior.

## Cross-Stage Engineering Rules

### Source of truth and traceability

-   Preserve the Jira issue key, project key, issue URL when available,
    retrieval timestamp, and source field names.
-   Preserve the original story fields; normalized fields are an
    additional view, not a replacement.
-   Every generated test case must reference the story key and its
    source requirement or acceptance criterion when available.
-   Mark missing or ambiguous requirements as unresolved. Do not infer a
    business rule and present it as fact.
-   Keep generated, approved, executed, and published statuses separate.

### Test case contract

Each test case must contain: - `id`: unique, stable identifier within
the project/run (for example, generated from a run ID plus sequence; do
not rely only on array index long-term) - `story_key` - `category`:
`critical`, `positive`, `negative`, or `edge` - `description` - `steps`:
ordered actionable steps - `actual_result`: empty/null before execution;
populated only from actual execution or explicit reviewer input -
`expected_result` - `approved_by_user`: false until a human approves it;
record reviewer identity only if available and authorized - `severity` -
`priority` - `source_requirement`: acceptance criterion/field reference
when available - `status`: such as `draft`, `needs_revision`,
`approved`, `executed`, `passed`, `failed`, or `blocked` - `created_at`
and `updated_at` timestamps

Generate no more than **10 test cases per story per generation
request**. Aim to cover all four categories when the story supports
them; do not invent a scenario solely to fill a category. If the story
does not provide enough information, state that limitation.

### Human approval and safety

-   Stage 3 approval is mandatory before exploring the application or
    generating scripts from the proposed test cases.
-   Stage 10 publishing requires a separate explicit approval, even if
    Stage 3 was approved.
-   Use least-privilege, read-only Jira access for Stages 1--3 where
    possible.
-   Do not expose secrets in logs, generated files, prompts, traces,
    screenshots, or reports.
-   Do not run destructive actions against production systems. Use an
    explicitly authorized test environment.
-   Never execute shell commands or repository changes based on
    untrusted story text without validation.
-   Do not auto-merge or push generated code unless the user explicitly
    authorizes that action.
-   Keep an audit trail for approvals and external write operations.

### Configuration and secrets

-   Use environment variables or a secrets manager for Jira, GitHub,
    model-provider, and application credentials.
-   Commit only a `.env.example` with placeholder names, never real
    values.
-   Validate required configuration at startup and give actionable
    errors without printing secret values.
-   Keep local development, test, staging, and production settings
    separate.

### Testing and observability

-   Add unit tests for pure logic and schema validation.
-   Add integration tests using mocks or a dedicated test Jira/project
    where appropriate.
-   Do not call a live external service during ordinary unit tests.
-   Log stage, run ID, story key, tool name, duration, status, and
    sanitized error information.
-   Redact tokens, cookies, personal data, and secret values.
-   Make workflows resumable where the selected orchestration framework
    supports durable checkpoints.

## Stage-by-Stage Implementation Contract

For every stage, follow this exact sequence:

1.  **Inspect:** Read existing project files and relevant configuration.
    Summarize what exists before changing it.
2.  **Plan:** State the files to create/change, implementation approach,
    dependencies, and risks.
3.  **Implement:** Build only the current stage plus necessary shared
    foundations.
4.  **Verify:** Run formatting/linting, type checks where applicable,
    unit tests, and relevant integration checks.
5.  **Evidence:** Show the commands actually run and concise results. If
    a check cannot run, explain why.
6.  **Review:** Check acceptance criteria, security, error paths, and
    traceability.
7.  **Stop:** Provide a stage report and ask: **"Stage N is implemented
    and verified to the extent shown above. Do you approve Stage N so I
    can proceed to Stage N+1?"**
8.  Wait for explicit approval. Do not continue automatically.

At the end of a stage report, use this template:

``` text
Stage:
Status: PASS / PARTIAL / BLOCKED / FAIL
Implemented:
Files created/changed:
Verification commands:
Observed results:
Acceptance criteria:
Known limitations:
Security / data-handling notes:
Approval requested: Yes
Next stage: Not started pending approval
```

A stage is not "PASS" merely because code was generated. All applicable
acceptance criteria must have evidence. If a live integration cannot be
tested, label it as partially verified and explain the missing
environment or credentials.

------------------------------------------------------------------------

# Stage 1 --- Story Analyst (Jira MCP)

## Objective

Provide a UI workflow in which the user selects a Jira project key or
board, then selects a story from the available Jira stories. Retrieve
the story's available fields and return a normalized, traceable story
record.

## User inputs

-   Jira site/base URL, supplied through secure configuration
-   Project key or board selection
-   Optional search/filter text
-   Selected story/issue key
-   Authentication through the configured Jira MCP connection

Do not ask the user to paste a fake story. Use the real selected story
from Jira. If Jira is not connected, implement a clearly labeled mock
adapter for tests and development; do not imply it contains live Jira
data.

## Responsibilities

1.  Check Jira MCP configuration and connectivity without printing
    credentials.
2.  Retrieve projects and/or boards the connected user is authorized to
    access, according to the selected MCP's supported tools.
3.  Display available stories/issues with pagination and practical
    filters.
4.  Allow the user to select one story.
5.  Retrieve all fields returned by the Jira issue API/MCP tool,
    including custom fields when available.
6.  Preserve raw field identifiers and values, while creating normalized
    fields for downstream agents.
7.  Handle pagination, permission errors, rate limits, missing fields,
    and unavailable custom fields.
8.  Store a minimal story snapshot for the current workflow run, with
    the Jira key and retrieval timestamp.
9.  Do not write to Jira in this stage.

## Suggested normalized story record

Adapt to the actual Jira MCP response; do not assume every field exists.

``` json
{
  "source": "jira",
  "site_id": "configured-site-reference",
  "project_key": "PROJECT",
  "issue_key": "PROJECT-123",
  "issue_url": null,
  "summary": "Actual summary returned by Jira",
  "description": "Actual description returned by Jira",
  "issue_type": null,
  "status": null,
  "priority": null,
  "assignee": null,
  "reporter": null,
  "labels": [],
  "components": [],
  "fix_versions": [],
  "acceptance_criteria": null,
  "raw_fields": {},
  "retrieved_at": "ISO-8601 timestamp"
}
```

The values above are a **schema example only**, not a real story.
Populate them from the user's selected Jira issue. Keep custom fields in
`raw_fields` and map acceptance criteria only when the actual Jira
configuration identifies the relevant field.

## Stage 1 acceptance criteria

-   User can choose a project key or board using authorized Jira data.
-   User can browse/select available stories and identify the selected
    issue key.
-   The selected issue's returned fields are available to downstream
    stages.
-   Pagination and empty/error states are handled.
-   No credentials are hardcoded or logged.
-   No Jira write operation occurs.
-   Unit tests cover normalization, missing/custom fields, empty lists,
    and error handling.
-   Integration behavior is tested against a mock or authorized test
    Jira connection.
-   The UI clearly distinguishes live Jira data from mock data.

## Stage 1 verification

-   Run formatting, lint, type checks, and unit tests supported by the
    repository.
-   Test issue selection, field normalization, and failure states.
-   If live Jira credentials are unavailable, report live integration as
    unverified; do not fabricate success.
-   Show a sanitized example of the actual response shape using either a
    mock fixture clearly labeled as mock or an authorized real test
    issue with sensitive values removed.

## Stage 1 stop condition

After reporting the observed results, stop and request explicit
approval. Do not start Stage 2 until the user approves Stage 1.

------------------------------------------------------------------------

# Stage 2 --- RAG Test Case Generator

## Objective

Generate at most 10 relevant test cases from the approved Stage 1 story
snapshot, supported by retrieved QE guidance and prior approved examples
where available.

## Responsibilities

-   Define a retrieval corpus from user-approved test standards,
    templates, and approved examples.
-   Use a retrieval adapter so a vector database is not mandatory before
    the corpus and retrieval needs are known.
-   Chunk and index source material with source metadata and versioning.
-   Retrieve relevant guidance based on the actual story and acceptance
    criteria.
-   Generate test cases in the required schema and validate them
    programmatically.
-   Cover critical, positive, negative, and edge scenarios when
    supported by the story.
-   Flag ambiguity, missing acceptance criteria, unsupported
    assumptions, and insufficient evidence.
-   Keep each test case linked to its Jira story and source requirement.
-   Enforce the 10-test-case maximum after generation and validation.

## Acceptance criteria

-   Output conforms to the test case contract.
-   Maximum 10 test cases are returned.
-   Each test case has a unique ID for the run and a valid category.
-   No invented actual results: `actual_result` remains null/empty
    before execution.
-   Retrieval sources are traceable.
-   Schema validation and tests cover malformed, duplicate, unsupported,
    and over-limit outputs.
-   If retrieval sources are unavailable, the system clearly indicates
    that it used story-only context rather than pretending RAG occurred.

## Stop condition

Verify Stage 2, report evidence, and ask approval before Stage 3.

------------------------------------------------------------------------

# Stage 3 --- Approval Gate (LangGraph `interrupt()`)

## Objective

Pause the workflow for a human to review and approve, reject, or request
changes to generated test cases.

## Responsibilities

-   Present all proposed test cases in an editable review UI.
-   Support approve, reject, and request-revision decisions, with
    optional reviewer comments.
-   Persist workflow state and the decision through the selected
    LangGraph checkpoint mechanism.
-   Resume the same workflow after the decision; avoid duplicate
    generation or duplicated approvals.
-   Record reviewer identity only when available through authenticated
    application context.
-   Block downstream application exploration and script generation until
    test cases are approved.

## Acceptance criteria

-   Workflow pauses at the approval interrupt and can resume from
    persisted state.
-   Rejected or revised cases do not silently become approved.
-   Approval status and audit timestamps are recorded.
-   Duplicate submissions and stale review versions are handled safely.
-   Automated tests prove downstream stages cannot proceed without
    approval.

## Stop condition

Verify Stage 3 and ask approval before Stage 4.

------------------------------------------------------------------------

# Stage 4 --- Exploratory Planner (Playwright MCP)

## Objective

Explore an explicitly configured, authorized test application to
understand the relevant UI journey for approved test cases.

## Responsibilities

-   Require an approved target base URL and designated test environment.
-   Use Playwright MCP capabilities that are actually available in the
    configured server.
-   Navigate only within the authorized application scope.
-   Capture relevant page structure, accessible roles/names, navigation
    paths, and candidate locators.
-   Map observations to approved test case IDs.
-   Record blockers such as missing accounts, inaccessible pages,
    CAPTCHA, MFA, or environment failures.
-   Avoid destructive actions unless separately approved and safe for a
    test environment.

## Acceptance criteria

-   Exploration notes are traceable to the approved story and test
    cases.
-   Candidate selectors are based on observed UI evidence.
-   The agent does not claim to have explored a site if no browser
    session ran.
-   Out-of-scope navigation and unsafe actions are blocked.
-   Evidence is sanitized before storage.

## Stop condition

Verify Stage 4 and ask approval before Stage 5.

------------------------------------------------------------------------

# Stage 5 --- Repo Analyst (GitHub MCP or Filesystem MCP)

## Objective

Inspect the authorized repository to understand its existing test
framework and conventions before generating scripts.

## Responsibilities

-   Use read-only access initially.
-   Identify language, package manager, Playwright version, folder
    layout, fixtures, page objects, config, linting, and test commands.
-   Detect existing reusable helpers and avoid duplicating
    functionality.
-   Report repository assumptions and missing setup.
-   Do not read unrelated secrets or print environment files containing
    credentials.
-   Do not change source files in this stage.

## Acceptance criteria

-   A concise repository analysis is produced with file-path evidence.
-   Framework/version assumptions are validated against repository
    files.
-   Sensitive files and secrets are excluded from output.
-   No files are modified.

## Stop condition

Verify Stage 5 and ask approval before Stage 6.

------------------------------------------------------------------------

# Stage 6 --- Test Data Agent (`faker.js`)

## Objective

Generate safe, schema-valid test data required by approved test cases.

## Responsibilities

-   Derive required fields and constraints from story requirements and
    repository/test conventions.
-   Use `faker.js` for synthetic values; do not use real customer or
    production personal data.
-   Support deterministic seeds for reproducible tests.
-   Validate formats, ranges, uniqueness, dependencies, and boundary
    values.
-   Keep secrets and credentials out of generated fixtures.
-   Separate positive, negative, and edge data sets.

## Acceptance criteria

-   Data is reproducible when a seed is provided.
-   Data validates against defined constraints.
-   Negative and boundary data is intentional and linked to test cases.
-   No real personal data or production secrets are embedded.
-   Unit tests cover schema and boundary validation.

## Stop condition

Verify Stage 6 and ask approval before Stage 7.

------------------------------------------------------------------------

# Stage 7 --- Script Generator (Playwright MCP + Filesystem MCP)

## Objective

Generate maintainable Playwright automation scripts from approved test
cases, exploratory evidence, repository conventions, and test data.

## Responsibilities

-   Follow the repository's detected language and framework unless a
    change is approved.
-   Prefer accessible locators and reusable page objects/fixtures where
    appropriate.
-   Generate assertions from expected results, not from guessed
    application behavior.
-   Add traceable test IDs and story keys in test names or metadata.
-   Keep secrets in environment configuration.
-   Make minimal, scoped changes and show a file diff before any commit
    or push.
-   Do not execute newly generated tests against an unapproved
    environment.

## Acceptance criteria

-   Generated scripts map to approved test case IDs.
-   Assertions are explicit and tied to expected results.
-   Lint/type checks pass where configured.
-   Scripts are syntactically valid and discoverable by the existing
    runner.
-   Any assumptions or TODOs are reported rather than hidden.

## Stop condition

Verify Stage 7 and ask approval before Stage 8.

------------------------------------------------------------------------

# Stage 8 --- Healer Agent (Playwright MCP)

## Objective

Analyze failed automation using available Playwright traces, DOM
snapshots, screenshots, console output, and error details, then propose
a bounded repair.

## Responsibilities

-   Diagnose whether the failure is caused by a locator, timing, test
    data, environment, application defect, or test expectation.
-   Use only artifacts actually collected by the runner/browser.
-   Propose minimal changes with an explanation and evidence.
-   Do not weaken assertions, delete failing tests, change business
    expectations, bypass authentication, or suppress failures merely to
    obtain a pass.
-   Require review/approval before applying a repair that changes a
    script.
-   Rerun the affected test after an approved repair and preserve
    before/after evidence.

## Acceptance criteria

-   Diagnosis includes failure evidence and confidence/uncertainty.
-   Proposed change is limited and reviewable.
-   A genuine application defect is reported rather than "healed" away.
-   Failed tests remain failed until a verified rerun passes.
-   Repair attempts are bounded and logged.

## Stop condition

Verify Stage 8 and ask approval before Stage 9.

------------------------------------------------------------------------

# Stage 9 --- Executor and Reporter (Shell / Playwright Runner)

## Objective

Execute approved tests in an authorized environment and create
normalized result data and evidence artifacts.

## Responsibilities

-   Validate target environment and execution configuration before
    running.
-   Run the approved test command with safe argument handling.
-   Capture pass/fail/skipped/blocked outcomes, duration, errors, test
    IDs, and links/paths to available evidence.
-   Distinguish test failure from infrastructure failure.
-   Store results in a versioned JSON schema.
-   Redact secrets and sensitive data from logs, screenshots, traces,
    and reports.
-   Do not run arbitrary shell commands sourced from story text or model
    output.

## Suggested results JSON

Adapt this schema to the runner's actual output.

``` json
{
  "run_id": "generated-run-id",
  "story_key": "PROJECT-123",
  "started_at": "ISO-8601 timestamp",
  "finished_at": "ISO-8601 timestamp",
  "environment": "configured-test-environment",
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "blocked": 0
  },
  "results": [
    {
      "test_case_id": "generated-test-case-id",
      "status": "passed",
      "duration_ms": 0,
      "actual_result": "Observed result from execution",
      "expected_result": "Approved expected result",
      "error": null,
      "artifacts": []
    }
  ]
}
```

The values are examples of structure, not claimed execution results.
Populate results only from the actual test runner.

## Acceptance criteria

-   Result counts reconcile with individual result records.
-   Each result maps to an approved test case.
-   Actual results reflect observed execution, not model-generated
    claims.
-   Runner exit codes and infrastructure failures are represented
    correctly.
-   Evidence artifacts are available or explicitly marked unavailable.

## Stop condition

Verify Stage 9 and ask approval before Stage 10 and Stage 11. The
project owner may choose to build Stage 11 before Stage 10 if that is
the safer dependency order; obtain approval for any stage-order change.

------------------------------------------------------------------------

# Stage 10 --- Publisher (Git MCP + Jira MCP)

## Objective

Publish approved scripts, reports, or execution evidence to authorized
Git and Jira destinations only after a separate human confirmation.

## Responsibilities

-   Show a preview of every intended write: repository path/branch or
    Jira issue/comment/attachment.
-   Require explicit approval immediately before each external write
    operation.
-   Use least-privilege permissions.
-   Prefer a branch or pull request over direct writes to a protected
    branch.
-   Attach only approved and sanitized artifacts.
-   Make retries idempotent where possible and record operation
    IDs/results.
-   Report partial publication accurately if one destination succeeds
    and another fails.

## Acceptance criteria

-   No write occurs before explicit publishing approval.
-   Destination, content, and attachment list match the approved
    preview.
-   Secrets and sensitive evidence are excluded.
-   External responses are recorded and errors are recoverable.
-   Unit tests use mocked Git/Jira clients; live writes use an
    authorized test destination.

## Stop condition

Verify Stage 10 and ask approval before Stage 11, unless the user
approves a different order.

------------------------------------------------------------------------

# Stage 11 --- Dashboard Agent (Results JSON to HTML)

## Objective

Generate a readable HTML dashboard from validated execution results.

## Responsibilities

-   Consume the normalized result JSON, not model assumptions.
-   Display story key, run ID, environment, execution timestamp, total
    tests, pass/fail/skip/block counts, and per-test details.
-   Link to artifacts only when paths/URLs exist and the viewer is
    authorized.
-   Escape untrusted text to prevent HTML/script injection.
-   Clearly distinguish missing data from zero values.
-   Keep a static HTML export available where practical.

## Acceptance criteria

-   Dashboard totals match the source JSON.
-   Empty, malformed, or partial results are handled safely.
-   Story and test case traceability is visible.
-   Untrusted values are escaped.
-   Dashboard generation is tested with passing, failing, skipped,
    blocked, and empty result fixtures.

## Stop condition

Verify Stage 11 and request approval. Do not declare the overall project
complete until all approved stages have passed their acceptance criteria
and the user approves the final integrated workflow.

------------------------------------------------------------------------

# Integration and End-to-End Verification

After all individual stages have been approved, request separate
approval for integration verification.

Check: 1. Story selection retrieves the actual Jira issue and fields. 2.
RAG generation returns no more than 10 schema-valid cases. 3. Approval
interruption blocks downstream work until approved. 4. Exploration and
repository analysis produce evidence. 5. Synthetic test data matches
constraints. 6. Script generation follows repository conventions. 7.
Healing does not hide application defects. 8. Execution results match
actual runner output. 9. Publisher requires explicit confirmation and
records external writes. 10. Dashboard counts match the results JSON.
11. Failures, retries, resumptions, and unavailable integrations are
handled honestly. 12. Traceability from Jira story → test case → script
→ execution result → report is preserved.

Create an end-to-end test with a mocked Jira story fixture or an
authorized test Jira issue. Label mock data clearly. Do not fabricate a
live Jira story or real execution evidence.

## Architecture and Implementation Decisions

-   Prefer a modular application with a workflow orchestrator for the
    initial version; introduce independently deployed services only when
    justified.
-   Use typed contracts and schema validation between agents.
-   Keep the UI, orchestration, agent logic, MCP adapters,
    persistence/checkpointing, and reporting responsibilities separate.
-   Select the LLM provider, RAG/vector store, persistence database, UI
    framework, and deployment platform only after inspecting the
    existing repository and asking the user when the decision materially
    affects the architecture.
-   If LangGraph is selected, use its supported persistence/checkpoint
    configuration for human approval and resumability.
-   Confirm the exact tools exposed by the configured Jira, Playwright,
    GitHub, Filesystem, and Git MCP servers before implementation. Do
    not assume all servers expose identical tool names or capabilities.
-   Keep the first vertical slice small: Stage 1 should be usable and
    verifiable before building later agents.

## Required First Response From the Coding Agent

When implementation begins:

1.  Acknowledge the multi-agent QE workflow and the 11 stages.
2.  Inspect the current workspace and user-provided files, including any
    existing `Architecture.md` or project source.
3.  Summarize the current repository state and identify missing
    configuration.
4.  Ask one necessary clarification question only if a critical blocker
    prevents Stage 1.
5.  Otherwise present the Stage 1 plan and implement Stage 1 only.
6.  Verify Stage 1, provide evidence and a stage report, and ask for
    approval.
7.  Stop. Do not begin Stage 2 until the user explicitly approves Stage
    1.

## User Story Input Policy

Use the user's selected Jira story as the input for the workflow. The
story must come from the connected Jira MCP or from story details
explicitly supplied by the user for a local/mock test. Preserve actual
issue fields and acceptance criteria. Do not invent story content. If
the user has not selected a story yet, implement the selection workflow
first and wait for the user to select one before running the downstream
agents.
