# TMA3084 Software Engineering Laboratory – Lab Outline: Flutter Application Development

Text extracted from "Flutter_Application_Development_Lab_Outlines_GitHub_CICD.docx" for use as reference material.
Sem 1 2026/2027. Prepared by: Nurfauza Jali.

## Lab demonstrators

| Name | Email | Group | Time |
| --- | --- | --- | --- |
| Mr. MD. Aminul Islam Rakib | 24020247@siswa.unimas.my | Group 1 | Wednesday: 4pm - 6pm |
| Mr. Raynold anak Kabai | 100853@siswa.unimas.my | Group 2 | Wednesday: 4pm - 6pm |

## Weekly schedule

### Week 3 (5 – 11 Oct 2026) – Lab 01

Lesson 01: Introduction to Flutter and Dart Programming Language
- Introduction; Importance of Flutter; Introduction to Dart; Writing Dart code; DartPad; Installing Dart SDK; Visual Studio Code
- GitHub & CI/CD (Part 1): Version Control Foundations with Git and GitHub
  - Why version control matters in a team software project
  - Installing Git and configuring user.name and user.email
  - Creating a GitHub account and joining the course GitHub Classroom organisation
  - Core workflow: clone, status, add, commit, push, pull
  - Writing meaningful commit messages; README.md and a Dart .gitignore
  - Using Git inside Visual Studio Code (Source Control panel)
- Lab Exercise 1.1: Installing Dart IDE and Writing Dart Program
  - Installing Visual Studio Code and Git; Creating a Dart Project Using Visual Studio Code; Using DartPad
  - Pushing the Dart project to a personal GitHub repository with a README

Lesson 02: Dart Programming – Syntax
- main() function; Variables; Data Types; Input; Comments; Conditional Operators; If / If-Else / Else-If; Logical Operators; For, While and Do-while Loops; Break; Switch Case
- Lab Exercise 1.2: Create a Pizza Order Program
  - Commit each stage (menu, order input, total calculation) as a separate, well-described commit

### Week 4 (12 – 18 Oct 2026) – Lab 02

Lesson 03: Dart Functions & Object-Oriented Programming (OOP)
- Functions, structure, return types, void functions, expressions, variable scope
- OOP: Object, Class, Methods, Getters and Setters, Inheritance, Abstract Class
- Dart Project Structure and Dart Libraries
- Null Safety in Dart (nullable types, ?, !, late, required)
- Lab Exercise 2.1: Create a Small Overtime Payment Program

Lesson 04: Introduction to Flutter
- Flutter Framework; Android Studio; Flutter SDK (Flutter 3.13+ / Dart 3.0+); New Flutter project; Android Virtual Device; running on emulator, Android phone and iPhone; debug mode
- Flutter Widgets; MaterialApp widget (Material Design 3 with useMaterial3 and ColorScheme)
- GitHub & CI/CD (Part 2): Team Repository, Branching and Pull Requests
  - Team repository structure: /src, /docs, /process_forms
  - Flutter .gitignore and what must never be committed (build outputs, API keys, keystores)
  - Branching strategy: main and feature/<issue-id>-<short-name> branches
  - Pull Request (PR) workflow: open PR, request review, approve, merge
  - Branch protection on main: no direct push; at least one peer approval before merge
  - GitHub Issues, labels and Milestones (M1–M4); GitHub Projects board for sprint tracking
  - Linking issues to SRS requirement IDs (e.g., FR-01) for traceability
- Project evidence: M1 – Scope & Requirements (Weeks 4–5): team repository, issue board and milestones set up
- Lab Exercise 2.2: Creating a Simple Flutter App
  - Create the Flutter project inside the team repository /src folder
  - Each member opens an issue, works on a feature branch and submits a PR; a teammate reviews and merges

### Week 5 (19 – 25 Oct 2026) – Lab 03

Lesson 05: Flutter Widgets Fundamentals
- Scaffold, Image, Container, Column and Row, Icon, Layouts, Card, App Icons, Hot Reload/Restart, Stateful and Stateless Widgets, Custom Font
- GitHub & CI/CD (Part 3): Code Quality and the First CI Workflow
  - Static analysis with flutter analyze and analysis_options.yaml (flutter_lints)
  - Consistent code style with dart format
  - Introduction to CI/CD and GitHub Actions: workflows, events, jobs, steps and runners
  - Creating .github/workflows/ci.yml: checkout, set up Flutter, flutter pub get, format check, analyze
  - Triggering CI on push and pull_request; reading workflow logs and fixing a failing check
- Project evidence: M1 submission: proposal and initial SRS stored in /docs; CI workflow file present in the repository
- Lab Exercise 3.1: Creating a Restaurant Menu
  - Build the menu screen through a PR that must pass the CI checks before merge

### Week 6 (26 Oct – 1 Nov 2026) – Lab 04

Lesson 06: Navigation and Routing
- Button widgets (Material 3): FloatingActionButton, ElevatedButton, FilledButton, TextButton, IconButton, DropdownButton, DropdownMenu, OutlinedButton, OverflowBar, PopupMenuButton
- App Structure and Navigation; named routes; sending and returning data; Hero animation; WebView
- GitHub & CI/CD (Part 4): Automated Testing in the CI Pipeline
  - Flutter test types: unit, widget and integration tests
  - Writing unit tests (package:test) and widget tests (flutter_test: pumpWidget, find, expect)
  - Testing navigation: verifying a route push and the data returned from a screen
  - Adding flutter test to ci.yml; making the CI job a required status check for PRs
  - Recording test executions in LOGTEST and defects in LOGD
- Lab Exercise 4.1: Navigation and Routing a Pizza Store App
  - Write widget tests for the navigation flow; the PR can only merge when CI is green
- Vibe Coding Task 4: AI as Pair Programmer
  - Write a mini-spec (requirement ID, expected behaviour, 2–3 acceptance criteria, constraints) for a new "Order Summary" screen
  - Prompt Codex (ChatGPT) or Claude with the spec to generate the screen and its route
  - Compare the AI version with the screen you built by hand: structure, naming and widget choice
  - Record at least one change you made to, or rejected from, the AI output; add your first LOGAI entry (AI-001)
  - Submit through a PR; CI must pass before merge

### Week 7 (2 – 8 Nov 2026) – Lab 05

Lesson 07: Visual, Behavioral, and Motion-Rich Widgets (Material Design) – Part 1
- BottomNavigationBar and NavigationBar; DefaultTabController, TabBar, TabBarView; ListTile; ListView; Drawer and NavigationDrawer; DataTable; SelectableText; Stack
- Separating UI and State: introduction to Provider / Riverpod for shared app state
- GitHub & CI/CD (Part 5): Collaborative Code Review
  - Pull Request template: linked issue, requirement ID, screenshots, test evidence, LOGAI reference
  - Code review checklist: correctness, null safety, readability, performance and security
  - Giving and responding to review comments; "Request changes" vs "Approve"
  - Keeping feature branches up to date with main and resolving merge conflicts
  - CODEOWNERS for automatic reviewer assignment
- Lab 05 Exercises
  - Lab A: Flutter App using the BottomNavigationBar Navigation Technique
  - Lab B: Using DataTable Sorting Built-in function
  - Lab C: Review a teammate's PR using the checklist and resolve a staged merge conflict
- Vibe Coding Task 5: Reviewing AI-Generated Code
  - Ask AI to refactor the BottomNavigationBar app so that tab state moves into a Provider / Riverpod class
  - Review the AI diff with the Lab 05 code review checklist
  - A teammate reviews the PR and must leave at least one substantive comment before approving
  - Tool comparison: half the team uses Codex, half uses Claude on the same spec; compare results in a short team note

### Week 8 (9 – 15 Nov 2026) – Mid-term break

### Week 9 (16 – 22 Nov 2026) – Lab 06

Lesson 08: Visual, Behavioral, and Motion-Rich Widgets (Material Design) – Part 2
- Text Field; Form and TextFormField Validation; Checkbox, Radio and SegmentedButton; Date Picker; Time Picker; Slider; Switch
- Dialogs, Alerts, and Panels: Alert Dialog, Cupertino Alert Dialog, Bottom Sheet (modal and persistent), Expansion Panel, Snack Bar
- GitHub & CI/CD (Part 6): Test Coverage and Prototype Release
  - Generating coverage with flutter test --coverage (coverage/lcov.info)
  - Reading coverage reports and identifying untested code
  - Enforcing a coverage threshold in CI (project target: ≥60% by M3)
  - Uploading coverage reports as workflow artifacts; adding a CI status badge to the README
  - Tagging a prototype release (e.g., v0.2.0-prototype) with release notes
- Project evidence: M2 – Design & Prototype (Week 9): runnable 4–5 screen prototype on main, green CI, tagged release
- Lab Exercise 6.1: Creating a Hotel Reservation App
  - Write validation tests for the booking form; CI must publish the coverage report
- Vibe Coding Task 6: Spec → Code → Test
  - Take one SRS requirement from your team project and write its acceptance criteria
  - Ask AI to generate the form/screen plus widget tests that cover every acceptance criterion
  - Run flutter test --coverage; fix failing or missing tests by hand
  - Log the work in LOGAI and LOGTEST (M2 target: ≥10 LOGAI entries by Week 9)

### Week 10 (23 – 29 Nov 2026) – Lab 07

Lesson 09: Firebase and Cloud AI Services
- JSON; Firebase Database; Firebase authentication (Signup and Login); FlutterFire CLI; adding Firebase to Android and iOS; Login/Logout; Realtime Database vs Cloud Firestore
- Connecting a Cloud Generative AI API: calling a generative AI service from Flutter (e.g., Firebase AI Logic, or a REST API through a backend proxy); handling loading, error and empty states, timeouts and rate limits
- Recording AI-assisted development in LOGAI
- GitHub & CI/CD (Part 7): Secrets, Configuration and Dependency Management
  - Why API keys must not be committed; checking history for leaked secrets
  - Passing configuration with --dart-define / --dart-define-from-file and git-ignored env files
  - GitHub Actions encrypted secrets and using them in workflows
  - Mocking Firebase and AI services in tests so CI runs without live credentials
  - Dependabot alerts and version updates for pubspec dependencies
- Lab Exercise 7.1: Create a User Profile Interface using Firebase
  - Keep Firebase and AI keys out of the repository; CI must pass using mocked services
- Vibe Coding Task 7: Building the Cloud AI Feature with AI Assistance
  - Use AI to draft the service class that calls your chosen generative AI API, including timeout, error and fallback handling
  - Check that no API key appears in the generated code, the prompts or the commit history
  - Ask AI to generate a fake/mock of the service; write tests for the success, error and timeout cases
  - Document the human refinement and verification in LOGAI

### Week 11 (30 Nov – 6 Dec 2026) – Lab 08

Lesson 10: Location-Aware Apps: Using GPS and Google Maps
- GPS; Camera Position; Google Maps Flutter plug-in; Google API key (kept out of source control); map, markers, map types, camera animation; capturing user location

Lesson 11: App Testing & Publishing
- Test environment; integration testing with the integration_test package; Usability Testing / UAT with the client
- Publishing: versioning in pubspec.yaml; app signing with an upload keystore; release APK / App Bundle; Google Play Store
- GitHub & CI/CD (Part 8): Continuous Delivery and Release Management
  - A build job that produces a release APK/AAB only after tests pass
  - Signing in CI with the keystore stored as GitHub secrets
  - Semantic versioning, Git tags and automated GitHub Releases with build artifacts
  - Release checklist: build matches the submitted source revision, main reflects the assessed release, no secrets in the repository
- Project evidence: M3 – Product & Verification (Week 13): ≥50 test cases, ≥60% coverage, green CI/CD pipeline
- Project evidence: M4 – Final Release & Acceptance (Week 15): release APK, complete README, user manual, client acceptance
- Lab Exercise 8.1: Location-Aware Store Finder with Automated Release
  - Google Map with markers and the user's current location; integration test for the main user flow
  - Push tag v1.0.0 so the pipeline builds and publishes the release APK as a GitHub Release
- Vibe Coding Task 8: Agentic Workflow on a GitHub Issue
  - Assign a small GitHub issue to Codex or Claude Code working on a feature branch
  - The agent gets branch-level access only: no push to main, no access to production secrets
  - Review the agent's PR, fix any CI failures, and merge only after peer approval
  - AI-off checkpoint: each member explains and modifies part of the change live, without AI

## GitHub & CI/CD Track – Alignment with Project Milestones

Each lab applies one GitHub & CI/CD practice to the Flutter exercise of that week, so that by Week 11 every team already operates the full workflow required by the Group Project Assessment: issue → branch → PR review → CI (analyze, test, coverage) → tagged release.

| Lab | Week | GitHub & CI/CD focus | Project evidence produced |
| --- | --- | --- | --- |
| Lab 01 | Week 3 | Git basics, GitHub account, clone/commit/push, README | Personal repository with meaningful commit history |
| Lab 02 | Week 4 | Team repo structure, branching, PRs, branch protection, Issues, Milestones, Projects board | M1: team repository, issue board, M1–M4 milestones, requirement-linked issues |
| Lab 03 | Week 5 | flutter analyze, dart format, first GitHub Actions ci.yml | M1: proposal/SRS in /docs; CI file present |
| Lab 04 | Week 6 | Unit and widget tests; tests as a required CI status check | First LOGTEST and LOGD entries |
| Lab 05 | Week 7 | PR template, review checklist, merge conflicts, CODEOWNERS | PR review history with visible review quality |
| Lab 06 | Week 9 | Coverage report, coverage gate, CI badge, tagged prototype release | M2: runnable prototype, green CI, v0.2.0 tag |
| Lab 07 | Week 10 | Secrets management, mocked services in CI, Dependabot | No secrets in repository; LOGAI entries for AI feature |
| Lab 08 | Week 11 | Release build job, signing via secrets, GitHub Releases | M3 (Week 13): ≥50 tests, ≥60% coverage; M4 (Week 15): release APK |

## AI Usage Rules for TMA3084 Labs (Vibe Coding)

Codex (ChatGPT) and Claude may be used only within the spec-driven workflow (Assessment Guidelines, Section 4): specification first, AI assistance second. Students remain responsible for every line they submit.

### 1. How AI may be used at each stage

- Labs 01–03 – Tutor only: AI may explain concepts and error messages; all code is written by hand.
- Labs 04–05 – Pair programmer: AI generates code from a written mini-spec; students compare it with their own work and review it in a PR.
- Labs 06–07 – Spec-driven generator: AI generates code and tests from SRS requirements and acceptance criteria; students refine, test and log it.
- Lab 08 onward – Agentic assistant: AI agents may work on GitHub issues on feature branches; students review, verify and merge.

### 2. Required whenever AI generates code (from Lab 04)

- Prompt from a specification: requirement ID, expected behaviour, acceptance criteria and constraints.
- Review the full diff before committing, correct or reject what is wrong, and verify with tests; CI must pass.
- Merge only through a Pull Request with at least one peer approval; AI output never goes straight to main.
- Add a LOGAI entry: ID and date, module, tool and model, prompt/spec, output summary, human refinement, test evidence and PR link.

### 3. Never

- Paste client personal data, passwords, API keys, keystores or .env contents into any AI tool.
- Give an AI agent push access to main or access to production secrets.
- Submit AI output you cannot explain, modify or test.
- Fabricate or back-fill LOGAI, LOGTEST or coverage records.
- Present AI-generated work as unaided work.

### 4. Tool choice and access

- Students are encouraged to subscribe to a paid plan (e.g., ChatGPT Plus or Claude Pro) to explore and practise beyond free-plan limits, especially the agentic workflow in Lab 08.
- Free plans remain acceptable. A paid plan is not required for any assessed task.
- Use your own account only; sharing logins or accounts breaches the providers' terms. Teammates can pair on the plan owner's screen instead.
- Codex, Claude or both may be used; record the exact tool and model in every LOGAI entry. Plans and limits may change, so keep a fallback tool.

### 5. AI-off checkpoints

- Lab demonstrators may ask any student, during labs or the final demo, to explain or modify their own code live without AI assistance.
- Being unable to explain submitted code, or using AI without the required audit trail, may be treated under Section 9 (Academic Integrity & Ethics) of the Group Project Assessment Guidelines.
