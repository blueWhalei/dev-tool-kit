export interface GitCommandParam {
  key: string
  labelEn: string
  labelZh: string
  placeholder: string
  defaultValue?: string
}

export interface GitCommandTemplate {
  id: string
  category: 'stash' | 'branch' | 'commit' | 'rebase' | 'reset' | 'remote' | 'other'
  titleEn: string
  titleZh: string
  descriptionEn: string
  descriptionZh: string
  template: string
  params: GitCommandParam[]
}

export const GIT_COMMAND_CATEGORIES = ['stash', 'branch', 'commit', 'rebase', 'reset', 'remote', 'other'] as const
export type GitCommandCategory = (typeof GIT_COMMAND_CATEGORIES)[number]

export const GIT_COMMAND_TEMPLATES: GitCommandTemplate[] = [
  {
    id: 'stash-push',
    category: 'stash',
    titleEn: 'Stash changes',
    titleZh: '暂存工作区修改',
    descriptionEn: 'Save uncommitted changes to stash',
    descriptionZh: '将未提交的修改存入 stash',
    template: 'git stash push -m "{message}"',
    params: [{ key: 'message', labelEn: 'Message', labelZh: '说明', placeholder: 'WIP: feature', defaultValue: 'WIP' }]
  },
  {
    id: 'stash-pop',
    category: 'stash',
    titleEn: 'Apply and drop stash',
    titleZh: '恢复并删除 stash',
    descriptionEn: 'Pop the latest stash entry',
    descriptionZh: '恢复最近一次 stash 并删除',
    template: 'git stash pop',
    params: []
  },
  {
    id: 'stash-list',
    category: 'stash',
    titleEn: 'List stashes',
    titleZh: '查看 stash 列表',
    descriptionEn: 'Show all stash entries',
    descriptionZh: '列出所有 stash',
    template: 'git stash list',
    params: []
  },
  {
    id: 'cherry-pick',
    category: 'commit',
    titleEn: 'Cherry-pick commit',
    titleZh: 'Cherry-pick 提交',
    descriptionEn: 'Apply a specific commit onto current branch',
    descriptionZh: '将指定提交应用到当前分支',
    template: 'git cherry-pick {commit}',
    params: [{ key: 'commit', labelEn: 'Commit hash', labelZh: '提交哈希', placeholder: 'abc1234' }]
  },
  {
    id: 'rebase-interactive',
    category: 'rebase',
    titleEn: 'Interactive rebase',
    titleZh: '交互式变基',
    descriptionEn: 'Rebase last N commits interactively',
    descriptionZh: '交互式变基最近 N 个提交',
    template: 'git rebase -i HEAD~{count}',
    params: [{ key: 'count', labelEn: 'Commit count', labelZh: '提交数量', placeholder: '3', defaultValue: '3' }]
  },
  {
    id: 'rebase-onto',
    category: 'rebase',
    titleEn: 'Rebase onto branch',
    titleZh: '变基到目标分支',
    descriptionEn: 'Rebase current branch onto another',
    descriptionZh: '将当前分支变基到目标分支',
    template: 'git rebase {target}',
    params: [{ key: 'target', labelEn: 'Target branch', labelZh: '目标分支', placeholder: 'main', defaultValue: 'main' }]
  },
  {
    id: 'reset-soft',
    category: 'reset',
    titleEn: 'Soft reset',
    titleZh: '软重置',
    descriptionEn: 'Reset HEAD, keep changes staged',
    descriptionZh: '移动 HEAD，保留暂存区修改',
    template: 'git reset --soft HEAD~{count}',
    params: [{ key: 'count', labelEn: 'Commits', labelZh: '提交数', placeholder: '1', defaultValue: '1' }]
  },
  {
    id: 'reset-hard',
    category: 'reset',
    titleEn: 'Hard reset',
    titleZh: '硬重置',
    descriptionEn: 'Discard commits and working tree changes',
    descriptionZh: '丢弃提交与工作区修改（危险）',
    template: 'git reset --hard HEAD~{count}',
    params: [{ key: 'count', labelEn: 'Commits', labelZh: '提交数', placeholder: '1', defaultValue: '1' }]
  },
  {
    id: 'branch-create',
    category: 'branch',
    titleEn: 'Create and switch branch',
    titleZh: '创建并切换分支',
    descriptionEn: 'Create a new branch and check it out',
    descriptionZh: '创建新分支并切换',
    template: 'git checkout -b {branch}',
    params: [{ key: 'branch', labelEn: 'Branch name', labelZh: '分支名', placeholder: 'feature/my-feature' }]
  },
  {
    id: 'branch-delete',
    category: 'branch',
    titleEn: 'Delete local branch',
    titleZh: '删除本地分支',
    descriptionEn: 'Delete a merged local branch',
    descriptionZh: '删除已合并的本地分支',
    template: 'git branch -d {branch}',
    params: [{ key: 'branch', labelEn: 'Branch name', labelZh: '分支名', placeholder: 'feature/old' }]
  },
  {
    id: 'merge-no-ff',
    category: 'branch',
    titleEn: 'Merge with merge commit',
    titleZh: '非快进合并',
    descriptionEn: 'Merge branch preserving history',
    descriptionZh: '合并分支并保留合并提交',
    template: 'git merge --no-ff {branch}',
    params: [{ key: 'branch', labelEn: 'Branch name', labelZh: '分支名', placeholder: 'feature/x' }]
  },
  {
    id: 'amend-commit',
    category: 'commit',
    titleEn: 'Amend last commit',
    titleZh: '修改最近一次提交',
    descriptionEn: 'Amend the previous commit message or content',
    descriptionZh: '修改上一次提交信息或内容',
    template: 'git commit --amend -m "{message}"',
    params: [{ key: 'message', labelEn: 'New message', labelZh: '新提交信息', placeholder: 'fix: typo' }]
  },
  {
    id: 'revert-commit',
    category: 'commit',
    titleEn: 'Revert commit',
    titleZh: '回滚提交',
    descriptionEn: 'Create a new commit that undoes a commit',
    descriptionZh: '创建新提交以撤销指定提交',
    template: 'git revert {commit} --no-edit',
    params: [{ key: 'commit', labelEn: 'Commit hash', labelZh: '提交哈希', placeholder: 'abc1234' }]
  },
  {
    id: 'fetch-prune',
    category: 'remote',
    titleEn: 'Fetch and prune',
    titleZh: '拉取并清理远程分支',
    descriptionEn: 'Fetch updates and remove stale remote refs',
    descriptionZh: '拉取更新并清理已删除的远程分支引用',
    template: 'git fetch --all --prune',
    params: []
  },
  {
    id: 'push-force-lease',
    category: 'remote',
    titleEn: 'Safe force push',
    titleZh: '安全强制推送',
    descriptionEn: 'Force push only if remote has not changed',
    descriptionZh: '仅在远程未变更时强制推送',
    template: 'git push --force-with-lease origin {branch}',
    params: [{ key: 'branch', labelEn: 'Branch name', labelZh: '分支名', placeholder: 'main' }]
  },
  {
    id: 'log-oneline',
    category: 'other',
    titleEn: 'Compact log',
    titleZh: '简洁日志',
    descriptionEn: 'Show recent commits in one line each',
    descriptionZh: '以单行格式显示最近提交',
    template: 'git log --oneline -n {count}',
    params: [{ key: 'count', labelEn: 'Count', labelZh: '条数', placeholder: '20', defaultValue: '20' }]
  },
  {
    id: 'diff-staged',
    category: 'other',
    titleEn: 'Diff staged changes',
    titleZh: '查看暂存区差异',
    descriptionEn: 'Show diff of staged files',
    descriptionZh: '显示已暂存文件的差异',
    template: 'git diff --staged',
    params: []
  },
  {
    id: 'clean-dry',
    category: 'other',
    titleEn: 'Preview untracked cleanup',
    titleZh: '预览清理未跟踪文件',
    descriptionEn: 'Dry-run clean of untracked files',
    descriptionZh: '预览将删除的未跟踪文件',
    template: 'git clean -fdn',
    params: []
  }
]

export function buildGitCommand(template: GitCommandTemplate, values: Record<string, string>): string {
  let cmd = template.template
  for (const param of template.params) {
    const value = values[param.key] ?? param.defaultValue ?? ''
    cmd = cmd.replaceAll(`{${param.key}}`, value)
  }
  return cmd
}

export function filterGitCommands(query: string, category: GitCommandCategory | 'all', locale: 'zh' | 'en'): GitCommandTemplate[] {
  const q = query.trim().toLowerCase()
  return GIT_COMMAND_TEMPLATES.filter((item) => {
    if (category !== 'all' && item.category !== category) return false
    if (!q) return true
    const title = locale === 'zh' ? item.titleZh : item.titleEn
    const desc = locale === 'zh' ? item.descriptionZh : item.descriptionEn
    return (
      title.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q) ||
      item.template.toLowerCase().includes(q) ||
      item.id.includes(q)
    )
  })
}
