---
name: prompter
description: გამოიყენე ეს skill როცა საჭიროა Claude Code-ისთვის სტრუქტურირებული პრომპტის წერა — sub-agent invocation-ის წინ, complex task-ის framing-ისთვის, ან როცა მომხმარებელი ითხოვს "დაწერე პრომპტი ამისთვის". ის ქმნის Anthropic best practices-ის შესაბამისად idealur პრომპტს XML tag-ებით, examples-ით, output_format-ით.
---

# Prompter — სრული პრომპტ-მზადების ხელსაწყო

> წყარო: [Anthropic Prompt Engineering Docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview)
> ეს skill ეფუძნება Web2Wireframe-ის Prompter.md-ის ფაილს, Legibly-ისთვის ადაპტირებული.

ამ skill-ის გააქტიურებისას შენი ამოცანაა: მომხმარებლის ბუნდოვან description-ს გარდაქმნე **production-grade პრომპტად** Claude Code-ისთვის ან Anthropic API-სთვის.

---

## 1. Core Principles (აუცილებელი 5)

| # | წესი | მოკლე ახსნა |
|---|------|--------------|
| 1 | **Be clear & direct** | LLM არ კითხულობს გონებას. დაწერე ისე, თითქოს ახალ თანამშრომელს უხსნი. |
| 2 | **Provide context** | რატომ აკეთებ ამას? ვინ წაიკითხავს output-ს? რა constraint-ები გაქვს? |
| 3 | **Use examples (multishot)** | 3-5 მაგალითი > 1000 სიტყვა instruction. |
| 4 | **Structure with XML tags** | `<task>`, `<context>`, `<example>` — Claude trained-ია XML-ზე. |
| 5 | **Let Claude think** | რთული tasks-ისთვის სთხოვე `<thinking>` step-by-step. |

---

## 2. სტანდარტული XML Tag-ები (Claude-ის სასურველი ფორმატი)

Claude **სპეციალურად დატრენილია** XML tag-ებზე — **არ არის** stylistic preference, არამედ parsing reliability boost.

### Tag-ების ჩამონათვალი

```xml
<task>
რა უნდა გააკეთო — ერთი წინადადება.
</task>

<context>
Background information. რატომ. ვინ არის audience.
</context>

<input>
ფაქტობრივი data რომელზეც უნდა იმუშავოს.
</input>

<example>
<input>...</input>
<output>...</output>
</example>

<constraints>
- Limit 1
- Limit 2
</constraints>

<output_format>
JSON / Markdown / plain text / specific schema
</output_format>

<thinking>
(Claude-ის reasoning area — სთხოვე ჩაწეროს აქ)
</thinking>
```

### რეალური მაგალითი (PR summary)

```xml
<task>
შეაჯამე ეს PR description Slack-სთვის (max 3 bullet points).
</task>

<context>
Audience: ჩვენი backend ინჟინრები. PR ცვლის DB schema-ს.
Tone: ტექნიკური, მაგრამ მოკლე. ემოჯი არ გვინდა.
</context>

<input>
{PR_DESCRIPTION_HERE}
</input>

<output_format>
Slack-flavored markdown, 3 bullet points, თითო max 15 სიტყვა.
</output_format>
```

### რატომ XML, არა JSON/YAML

- **JSON-ში** escaping აჩხუბრებს quote-ებს long text-ში
- **YAML** indentation-sensitive — error-prone
- **XML** — visually obvious boundaries, no escape hell

---

## 3. ფუნდამენტური ტექნიკები

### 3.1 Clarity Test

**ცუდი:** "გააუმჯობესე ეს კოდი"
**კარგი:** "გადააწერე ეს ფუნქცია TypeScript strict mode-ში. `any` დაუშვებელია. error handling გადააქციე `Result<T,E>` pattern-ად. function name შეინარჩუნე."

**Test:** წაიკითხე პრომპტი ხმამაღლა. თუ ერთი ინტერპრეტაცია ვერ ამოიცანი — გაარჩიე.

### 3.2 Multishot Prompting (Examples)

**არასწორი:**
> Extract dates from text.

**სწორი:**
```xml
<task>Extract dates and return ISO format.</task>

<example>
<input>"Meeting on March 5th at 3pm"</input>
<output>2026-03-05</output>
</example>

<example>
<input>"Next Tuesday"</input>
<output>UNRESOLVED (relative date)</output>
</example>

<example>
<input>"05/03/2026"</input>
<output>2026-03-05 (assumed DD/MM)</output>
</example>

<input>{ACTUAL_TEXT}</input>
```

**Rule of thumb:** 3-5 დივერსიული მაგალითი. Edge case-ები აუცილებლად ჩართე.

### 3.3 Chain of Thought (CoT)

რთული task-ისთვის სთხოვე ფიქრი step-by-step:

```xml
<task>
გადაწყვიტე უნდა გამოვუშვათ თუ არა PR production-ში.
</task>

<instructions>
1. ჯერ ჩაწერე <thinking> tag-ში:
   - რას ცვლის PR?
   - რა რისკი არსებობს?
   - უკან როგორ გავაბრუნებთ?
2. შემდეგ <answer> tag-ში: GO / NO-GO + ერთი წინადადება.
</instructions>
```

CoT ხელს უწყობს **complex reasoning, math, code review, decision-making**-ში.
**ნუ გამოიყენებ** simple lookup/extraction tasks-ში — overhead-ია.

### 3.4 Role Assignment (System Prompt)

```xml
<role>
You are a senior security engineer reviewing code for OWASP Top 10 issues.
Focus on: injection, broken auth, sensitive data exposure.
Ignore: code style, formatting, naming.
</role>
```

Role aligns Claude-ის priorities. გამოიყენე როცა გინდა consistent perspective.

### 3.5 Prefilling Response

Claude API-ში შეგიძლია მისცე response-ის დასაწყისი:

```
User: შენი task...
Assistant: <answer>
```

ეს force-ავს Claude-ს დაიწყოს `<answer>`-ით — useful structured output-ისთვის.

### 3.6 Chain Complex Prompts (Decomposition)

რთული task დაშალე **ცალკე call-ებად**:

```
Call 1: Extract relevant data from document → output structured JSON
Call 2: Analyze that JSON → output recommendations
Call 3: Format recommendations as email
```

ერთი mega-prompt < სამი focused prompt.

### 3.7 Long Context (100K+ tokens)

წესი: **დიდი დოკუმენტი ჯერ, query შემდეგ.**

```xml
<documents>
<document index="1">
<source>file1.md</source>
<content>...50K tokens...</content>
</document>
<document index="2">
<source>file2.md</source>
<content>...30K tokens...</content>
</document>
</documents>

<query>
ახლა, ამ დოკუმენტებზე დაყრდნობით, უპასუხე: ...
</query>
```

რატომ: Claude attention-ი ბოლო ნაწილს უკეთ ფიქსირდება (recency bias). Query bottom-ში დადე.

---

## 4. Templates (კოპირებადი — Legibly-სთვის ადაპტირებული)

### 4.1 Sub-agent Invocation

```xml
<role>
You are a {agent_specialty} for Legibly project.
Working directory: /Users/giorgi/Desktop/Designer
</role>

<task>
{specific_task_one_sentence}
</task>

<context>
- Project stage: planning/research (no code yet)
- Read first: docs/README.md, docs/goal.md, docs/approach.md
- Constraints: docs/architecture.md decisions are LOCKED
</context>

<input>
{specific_files, file paths with line numbers if relevant}
</input>

<output_format>
{exact format expected — markdown section, JSON object, bash commands, etc.}
</output_format>

<deliverable>
Report under {N} words. Include:
- Status: SUCCESS / PARTIAL / BLOCKED
- Files changed: list
- Recommendations: list (if any)
</deliverable>
```

### 4.2 Research Task (per Track in research-roadmap.md)

```xml
<task>
Research {tool_or_topic} for Legibly. Write findings to docs/research/{topic}.md following the template in docs/research-roadmap.md §4.
</task>

<context>
- Our wedges: system-strict, a11y-first, selection-based partial regen, MCP-first
- Threat: Figma's own Design Agent (free during beta, May 2026)
- Focus: what we can leverage AND what to avoid copying
</context>

<sources>
- {url_1}
- {url_2}
</sources>

<output_format>
Markdown file following docs/research-roadmap.md §4 template:
- TL;DR (3-5 bullets)
- Capabilities table
- Pricing
- Strengths
- Weaknesses (our wedge opportunity)
- What we can leverage
- What we should AVOID copying
- Open questions
- Sources
</output_format>
```

### 4.3 Code Generation (when we start coding)

```xml
<task>
დაწერე {LANGUAGE} ფუნქცია რომელიც {WHAT_IT_DOES}.
</task>

<requirements>
- Input: {INPUT_TYPE}
- Output: {OUTPUT_TYPE}
- Error handling: {STRATEGY}
- Style: see CLAUDE.md and existing project conventions
</requirements>

<example_usage>
{CODE EXAMPLE OF HOW IT WILL BE CALLED}
</example_usage>

<constraints>
- No external dependencies beyond {ALLOWED_LIST}
- TypeScript strict mode
- Must pass {EXISTING_TEST_FILE}
</constraints>
```

### 4.4 Code Review

```xml
<role>
Senior {STACK} engineer. Focus on correctness bugs, not style.
</role>

<task>
Review the following diff. Report only high-confidence issues.
</task>

<diff>
{GIT_DIFF}
</diff>

<output_format>
For each issue:
- File:line
- Severity: critical / high / medium
- Issue: one sentence
- Fix: one sentence
</output_format>
```

### 4.5 Debugging

```xml
<task>
Diagnose this error.
</task>

<error>
{STACK_TRACE}
</error>

<context>
- რა ვაკეთებდი როცა მოხდა: {ACTION}
- რა მოლოდინი მქონდა: {EXPECTED}
- რა მოხდა: {ACTUAL}
- რა უკვე ვცადე: {ATTEMPTED_FIXES}
</context>

<relevant_code>
{CODE}
</relevant_code>

<instructions>
1. <thinking>-ში ჩაატარე root cause analysis
2. <hypothesis>-ში დაასახელე ყველაზე სავარაუდო მიზეზი
3. <fix>-ში მომიყვანე exact code change
</instructions>
```

---

## 5. Legibly-სპეციფიკური წესები

### 5.1 Self-Contained Sub-agent Context

Sub-agent **ვერ ხედავს** მთავარი conversation-ის history-ს. ჩაუთვალე ეს:

❌ "Based on what we discussed, do X"
✅ "Working dir: /Users/giorgi/Desktop/Designer. Read docs/goal.md and docs/architecture.md §[N]. Then [specific task with file paths]."

### 5.2 File Paths + Line Numbers

ყოველთვის მიუთითე exact location:

❌ "Update the architecture doc"
✅ "Update `docs/architecture.md` §2 component table — add row for `2.15 {new component}` with single-responsibility description matching existing rows."

### 5.3 Don't Delegate Understanding

ცუდი პრაქტიკაა agent-ს უთხრა "research-ის შემდეგ implement-ი". ეს არის შენი job. Agent-ის task იყოს **დისკრეტული, აღსრულებადი**.

❌ "Investigate the issue and fix it"
✅ "The issue is X (confirmed in docs/approach.md D7). Apply this specific fix at `file.ts:Y`."

### 5.4 Expected Output Specification

```xml
<deliverable>
Report under 200 words. Format:
- Status: SUCCESS / PARTIAL / BLOCKED
- Files changed: list
- Tests run: count + result
- Blockers: list (if any)
</deliverable>
```

### 5.5 Project Context Header (Recommended)

ყოველი sub-agent prompt-ის დასაწყისში:

```xml
<project_context>
Project: Legibly
Stage: planning/research (no code yet)
Working dir: /Users/giorgi/Desktop/Designer
Read first if context unclear: docs/README.md
Git branch: dev (never commit to main without user approval)
</project_context>
```

---

## 6. Antipatterns

| Antipattern | რატომ ცუდია | რა გააკეთო |
|-------------|--------------|------------|
| "Improve this code" | Vague — Claude აიღებს რანდომ მიმართულებას | Specify: performance / readability / type safety |
| "Don't do X" (negative only) | LLM-ები პოზიტიური instruction-ით უკეთ მუშაობენ | "Do Y" instead of "Don't do X" |
| 5000-word system prompt | Context dilution, ღირებული tokens | Compress to 500 words, ჩადე examples |
| "Be creative" | Unmeasurable | "Generate 5 distinct approaches, then pick best" |
| Mixing many tasks in one prompt | Confusion + low quality on each | Chain prompts (3.6) |
| No examples for structured output | Format drift | 2-3 example outputs **always** |
| "Are you sure?" follow-up | Sycophancy trigger — Claude flip-ავს position-ს | Ask "what's the strongest counterargument?" |

---

## 7. Quick Checklist (პრომპტის გაგზავნამდე)

```
☐ Task ერთი წინადადებით ნათელია?
☐ Context მოცემულია (audience, why, constraints)?
☐ Example მინიმუმ 1 ჩავაბი (structured output-ისთვის)?
☐ XML tag-ებით სტრუქტურირებულია?
☐ Output format სპეციფიცირებულია?
☐ Long content — query ბოლოშია?
☐ Sub-agent-ისთვის — self-contained (file paths + line numbers)?
☐ Legibly context header ჩავაბი?
☐ Antipattern-ი არ ჩავუშვი?
```

---

## 8. ამ Skill-ის invocation

როცა user მთხოვს "დაწერე პრომპტი X-ისთვის":

1. **დაუსვი მე უფრო კონკრეტული კითხვები** (1-3): რა output, რა audience, რა constraints
2. **შემიყვანე** Template-ი (§4) ან custom
3. **შემიდე** XML structure
4. **შემიმოწმე** §7 Checklist
5. **დამიხატე** ფინალური პრომპტი markdown code block-ში
6. **ახსენი** რატომ აიღე ეს structure

ხელით ვერავინ წერს idealur პრომპტს — process-ი დაგვეხმარება.
