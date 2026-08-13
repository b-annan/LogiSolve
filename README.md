# Logic_Project# Intelligent Logic Verification and Automated Reasoning Toolkit

![Project Status](https://img.shields.io/badge/status-in%20development-yellow)
![Course](https://img.shields.io/badge/Course-CE%20474-blue)
![University](https://img.shields.io/badge/University-UMaT-green)

## 📌 About the Project

The **Intelligent Logic Verification and Automated Reasoning Toolkit** is a software application designed to automatically solve and verify problems in **propositional and predicate logic**.

The project is being developed as part of the **CE 474 – Logic of Computer Science Group Project 2** at the **University of Mines and Technology (UMaT)**.

The toolkit focuses on practical implementation of logic-solving algorithms and formal verification techniques. It aims to provide users with an easy-to-use interface for entering logical expressions, performing automated reasoning, and understanding the results.

## 🎯 Project Objective

The main objective of this project is to develop a  web-based application capable of automatically solving propositional and predicate logic problems.

The system will provide tools for:

* Generating truth tables
* Checking logical equivalence
* Converting formulas into Conjunctive Normal Form (CNF)
* Performing resolution-based reasoning
* Checking satisfiability of logical formulas
* Translating simple English statements into predicate logic
* Supporting different proof strategies
* Providing a user-friendly graphical interface

## 🚀 Core Modules

### 1. Truth Table Generator

Accepts a propositional logic formula and automatically generates its complete truth table.

**Example:**

```text
(P → Q) ∧ (Q → R)
```

The system generates all possible truth assignments and evaluates the formula.

---

### 2. Logical Equivalence Checker

Determines whether two logical expressions are logically equivalent by comparing their truth values under all possible interpretations.

**Example:**

```text
P → Q
¬P ∨ Q
```

The system determines whether both expressions have identical truth values.

---

### 3. CNF Converter

Converts logical expressions into an equivalent **Conjunctive Normal Form (CNF)**.

**Example:**

```text
(P → Q)
```

The system transforms the expression into its equivalent CNF representation.

---

### 4. Resolution Theorem Prover

Accepts premises and a conclusion and uses **resolution-based reasoning** to determine whether the conclusion is:

* Valid
* Invalid
* Unsatisfiable

---

### 5. SAT Solver

Determines whether a given logical formula is **satisfiable**.

The implementation may use a custom SAT-solving algorithm or optionally integrate an external SAT engine.

---

### 6. Predicate Logic Translator

Translates simple English statements into predicate logic representations.

**Example:**

```text
Every student passed Logic.
```

Can be represented as:

```text
∀x (Student(x) → Passed(x, Logic))
```

---

### 7. Proof Assistant

Supports different proof strategies, including:

* Direct Proof
* Proof by Contradiction
* Proof by Contrapositive
* Natural Deduction *(optional)*

---

### 8. Graphical User Interface

The application will provide a graphical interface with:

* Logical expression input
* Syntax highlighting
* Error detection
* Clear output presentation
* Result explanations
* User-friendly interaction

## 🏗️ System Architecture

The proposed system will follow a flow similar to:

```text
                ┌──────────────────┐
                │    User Input    │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │      Parser      │
                └────────┬─────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │ Internal Formula Representation│
          └──────────────┬───────────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Reasoning Engine │
                └────────┬─────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Truth Table       CNF/SAT      Resolution/
       Solver           Solver       Proof Engine
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                ┌──────────────────┐
                │  Output Display  │
                └──────────────────┘
```

## 🛠️ Technologies

The project may be implemented using one or more of the permitted programming languages:

* Python
* Java
* C#
* JavaScript
* C++

Possible supporting tools include:

* Visual Studio Code
* GitHub
* SWI-Prolog
* Graphviz
* MiniSAT
* Z3 SMT Solver *(Bonus)*
* Prover9 *(Bonus)*

## 📂 Project Structure

```text
intelligent-logic-verification-toolkit/
│
├── src/
│   ├── parser/
│   ├── truth_table/
│   ├── cnf_converter/
│   ├── resolution/
│   ├── sat_solver/
│   ├── predicate_logic/
│   ├── proof_assistant/
│   └── gui/
│
├── tests/
│
├── docs/
│   ├── architecture/
│   ├── technical_report/
│   └── installation_guide/
│
├── README.md
├── requirements.txt
└── .gitignore
```

## 🚀 Deployment

The toolkit runs entirely in the browser — the parser, solvers and proof engine
are plain TypeScript with no server functions and no server-side data. It is
therefore deployed as a **static site**, prerendered at build time.

```bash
bun run build:static   # prerenders every route into dist/client
bun run serve:static   # serves that output locally through the Firebase emulator
```

`build:static` renders all eight routes to their own HTML file, so each module
URL is directly linkable and carries its own `<title>` and Open Graph tags
rather than sharing a single `index.html`.

### Firebase Hosting

One-time setup, then deploy:

```bash
firebase login
firebase use --add          # pick the Firebase project to deploy to
bun run deploy              # builds, then firebase deploy --only hosting
```

Hosting settings live in `firebase.json`: it serves `dist/client`, caches
hashed assets in `/assets` for a year, revalidates HTML on every request, and
rewrites unmatched paths to `index.html` so client-side routing works.

> **Note:** because of that rewrite, an unknown URL returns HTTP 200 and the
> app renders its own "page not found" screen, rather than answering 404.

### Other targets

Running `bun run build` without `STATIC=1` keeps the original behaviour: Nitro
bundles an SSR server for Cloudflare (`.output/server`). Both paths build from
the same source, so switching hosts does not require code changes.

## 👥 Team Roles

| Role                            | Responsibility                                                         |
| ------------------------------- | ---------------------------------------------------------------------- |
| Project Manager                 | Coordinates the team, manages milestones and oversees project progress |
| GUI Developer                   | Designs and implements the graphical user interface                    |
| Truth Table Developer           | Develops the truth table generation module                             |
| CNF Converter Developer         | Implements CNF conversion algorithms                                   |
| Resolution Developer            | Develops the resolution theorem prover                                 |
| SAT Solver Developer            | Implements the SAT-solving functionality                               |
| Predicate Logic Developer       | Develops the predicate logic translation module                        |
| Testing Lead                    | Designs and manages system testing                                     |
| Documentation Lead              | Maintains technical documentation and reports                          |
| Presentation & Integration Lead | Coordinates integration and prepares the final presentation            |

## 🔀 Git Workflow

To keep development organized, team members should avoid making changes directly to the `main` branch.

### Branches

Each major feature should have its own branch.

Example:

```text
main
│
└── develop
    ├── feature/truth-table
    ├── feature/cnf-converter
    ├── feature/resolution
    ├── feature/sat-solver
    ├── feature/predicate-logic
    └── feature/gui
```

### Contribution Process

1. Clone the repository.
2. Create or switch to your assigned feature branch.
3. Implement your changes.
4. Test your changes.
5. Commit your work with a clear commit message.
6. Push the branch to GitHub.
7. Create a Pull Request.
8. Request a review before merging into `develop`.

### Example

```bash
git clone <repository-url>

git checkout develop

git checkout -b feature/truth-table

git add .

git commit -m "Implement truth table generator"

git push origin feature/truth-table
```

## 🧪 Testing

Testing will be carried out throughout development to ensure that:

* Logical expressions are parsed correctly.
* Algorithms produce correct results.
* Invalid or malformed formulas are handled appropriately.
* Individual modules work as expected.
* Modules work correctly after integration.
* The graphical interface responds correctly to user input.

## 📅 Project Milestones

| Milestone                          | Status         |
| ---------------------------------- | -------------- |
| Project planning                   | 🟡 In Progress |
| System architecture                | ⬜ Pending      |
| Parser development                 | ⬜ Pending      |
| Truth table module                 | ⬜ Pending      |
| CNF converter                      | ⬜ Pending      |
| Resolution module                  | ⬜ Pending      |
| SAT solver                         | ⬜ Pending      |
| Predicate logic module             | ⬜ Pending      |
| Proof assistant                    | ⬜ Pending      |
| GUI development                    | ⬜ Pending      |
| Module integration                 | ⬜ Pending      |
| System testing                     | ⬜ Pending      |
| Documentation                      | ⬜ Pending      |
| Final presentation & demonstration | ⬜ Pending      |

## 📦 Deliverables

The project will produce:

* Source code
* Executable application
* GitHub repository
* Technical report
* Installation guide
* Testing report
* Presentation slides
* Live demonstration

## 📅 Submission

According to the project brief, all group deliverables are to be placed in a single folder named after the group, compressed into a ZIP archive, and submitted to the class/group representative **on or before 14 August 2026**.

## 🎓 Course Information

**Course:** CE 474 – Logic of Computer Science
**Project:** Group Project 2
**Project Title:** Intelligent Logic Verification and Automated Reasoning Toolkit
**Institution:** University of Mines and Technology (UMaT)
**Department:** Computer Science & Engineering

## 👩🏽‍💻 Contributors

Add the names and GitHub usernames of all team members below:

| #  | Name          | Role                            | GitHub                           |
| -- | ------------- | ------------------------------- | -------------------------------- |
| 1  | [Your Name]   | Project Manager                 | [@username](https://github.com/) |
| 2  | [Member Name] | GUI Developer                   | [@username](https://github.com/) |
| 3  | [Member Name] | Truth Table Developer           | [@username](https://github.com/) |
| 4  | [Member Name] | CNF Converter Developer         | [@username](https://github.com/) |
| 5  | [Member Name] | Resolution Developer            | [@username](https://github.com/) |
| 6  | [Member Name] | SAT Solver Developer            | [@username](https://github.com/) |
| 7  | [Member Name] | Predicate Logic Developer       | [@username](https://github.com/) |
| 8  | [Member Name] | Testing Lead                    | [@username](https://github.com/) |
| 9  | [Member Name] | Documentation Lead              | [@username](https://github.com/) |
| 10 | [Member Name] | Presentation & Integration Lead | [@username](https://github.com/) |

---

### 📌 Note

This repository is maintained as part of the **CE 474 Logic of Computer Science Group Project 2** and will contain the source code, documentation, testing materials, and other project deliverables.

**Built with teamwork, logic, and a little bit of debugging pain. 😅💻**
