# TODO

## P0 — 测试覆盖

- [x] 补充 subject 级单测：vague subject 检测、末尾句号、超 100 字符、非法 type、空 subject（16 条用例）
- [x] 补充 `Why:` / `Impact:` 为空值时的失败用例（4 条用例）
- [x] 补充 `--max-summary-lines` 超限失败用例（含 exact max、min 不满足）
- [x] 补充 merge commit 自动豁免 + `--no-merge-commits` 强制校验用例（2 条用例）
- [x] 补充 Convention-Version 格式错误（缺/重复/非日期）用例（4 条用例）
- [x] 补充重复 AI trailer 的失败用例（含空值、三种 trailer 接受测试）
- [x] 补充空 commit message 的失败用例（空字符串 + 纯空白）
- [x] 补充 `--scan-staged` 端到端集成测试（6 条密钥扫描用例）
- [x] 补充 CLI 参数边界（负数 min、max < min）用例
- [x] 将核心校验逻辑拆分为可单测的纯函数，减少 subprocess 依赖（直接 import CommitMessageValidator）
- [x] 修复 bug：`- ` 空 bullet 未被识别为 bullet line（`_validate_bulleted_section` 中增加 `stripped == "-"` 分支）

## P1 — 可发现性与 Agent 通用化

- [x] 删除 `agents/` 目录，SKILL.md 改为 agent-agnostic
- [x] SKILL.md 新增 `compatibility` 和 `topics` 元数据
- [x] 归因示例中 "Codex" 替换为 `<agent-name>` 占位符
- [x] references/commit-message-schema.md 通用化
- [x] README.md 安装说明更新（`npx skills add` 优先）
- [x] 扁平化项目结构（移除 `skills/` 嵌套，重命名为 `commit-discipline`）
- [ ] 可选：添加 `skills-lock.json`

## P2 — 模板能力

- [x] `--print-template`：打印默认 commit 模板到 stdout
- [x] `prepare-commit-msg` hook：`git commit` 时自动预填模板

## P2 — 校验器增强

- [x] `--version` flag
- [x] `--warn-only` 模式（不阻断，仅输出警告）
- [x] `--json` 输出格式（机器可读）
- [x] 豁免 git 生成的 revert（`Revert "..."` 开头的 subject，同 merge 逻辑）

## P2 — 配置与可扩展

- [x] `.commit-discipline.config.json` 配置文件
  - `min_summary_lines` / `max_summary_lines`
  - `warn_only` / `output_json` / `scan_staged`
  - `allow_merge_commits` / `allow_revert_commits`
  - `allowed_scopes`（scope 白名单）
  - `template`（自定义模板）

## P2 — 密钥扫描增强

- [x] GitHub PAT（`ghp_`, `github_pat_`）、AWS key（`AKIA`, `ASIA`）、JWT（`eyJ`）、私钥特征

## P0 — 代码审查修复

- [x] `load_config` 异常处理（malformed JSON / 非 object 根类型）
- [x] 配置字段类型校验（类型不匹配时 warn 并 fallback 到默认值）
- [x] 删除 dead code（`asdict` 导入 + `escaped` 变量）
- [x] `--help` 加配置文件提示
- [x] 补边界测试（malformed JSON / wrong type / help）

## P0 — TypeScript 重写

- [x] `package.json` + `tsconfig.json` + `vitest.config.ts`（Node 18+，零 runtime deps）
- [x] `src/types.ts`：`ValidationConfig` 接口、常量、正则
- [x] `src/config.ts`：`loadConfig()` + `applyConfig()`（JSON 解析 + 类型校验）
- [x] `src/validate.ts`：`CommitMessageValidator` 类（subject / required fields / bulleted / AI trailer / convention-version）
- [x] `src/secrets.ts`：`scanTextForSecrets()` + `stagedDiff()`
- [x] `src/hooks.ts`：`installHook()` + `installTemplateHook()`
- [x] `src/template.ts`：`getEffectiveTemplate()` + `printTemplate()`
- [x] `src/index.ts`：CLI 入口（`parseArgs` + main 函数）
- [x] `tests/validate.test.ts`：48 条单测（subject / required / bulleted / convention / AI trailer / merge / revert / empty / scope）
- [x] `tests/secrets.test.ts`：11 条密钥扫描测试
- [x] `tests/config.test.ts`：9 条配置加载测试
- [x] `tests/hooks.test.ts`：3 条 hook 安装测试
- [x] `tests/integration.test.ts`：15 条 CLI 集成测试
- [x] 86/86 测试全部通过
- [x] 删除 Python 文件（`scripts/validate_commit_message.py`、`tests/test_validate_commit_message.py`）
- [x] 更新 README.md（Python → Node.js）
- [x] 更新 `.github/workflows/validate.yml`（Python matrix → Node matrix）
- [x] 更新 SKILL.md（script 路径 `scripts/validate_commit_message.py` → `dist/index.js`）
- [x] 更新 `references/commit-message-schema.md`（脚本路径引用）
- [x] 更新 `.gitignore`（添加 `dist/`、`node_modules/`）
- [x] 安装到 `~/.agents/skills/commit-discipline/`（替换 Python 版本）

## P3 — 文档与体验

- [ ] SKILL.md 新增 troubleshooting 章节
- [ ] SKILL.md 新增归因 trailer 选择指南
- [ ] 新增 `CHANGELOG.md`
- [ ] 新增贡献指南 `CONTRIBUTING.md`
- [ ] 新增渐进式采纳指南

## P3 — 生态与 CI

- [ ] 发布到 skills.sh（push 到 GitHub public repo）
- [x] CI workflow 增加 matrix 测试（Python 3.9 / 3.10 / 3.11 / 3.12）
- [ ] CI 增加 lint（`ruff` 或 `flake8`）
- [ ] 可选：打包为 pip 包
- [ ] 可选：提供 npm wrapper
