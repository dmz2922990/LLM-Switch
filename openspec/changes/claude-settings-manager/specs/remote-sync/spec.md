## ADDED Requirements

### Requirement: 同步配置到单台远程主机
系统 SHALL 允许用户将指定配置档案的 settings.json 通过 SSH/SCP 同步到已配置的远程主机。

#### Scenario: 一键同步到远程主机
- **WHEN** 用户选择档案 "OpenAI" 和远程主机 "dev-server"，点击"同步"按钮
- **THEN** 系统通过 SSH/SCP 将档案内容传输到远程主机的 Claude Code settings.json 路径，显示同步成功确认

#### Scenario: 同步进度显示
- **WHEN** 同步操作正在进行中
- **THEN** 系统显示同步进度指示（如加载动画），同步完成后显示结果（成功/失败）

#### Scenario: 同步失败提示
- **WHEN** SSH 连接失败或远程写入失败（如目标路径不存在、权限不足）
- **THEN** 系统显示具体错误信息（如"连接超时"、"认证失败"、"远程路径不存在"），不自动重试

### Requirement: 批量同步到多台主机
系统 SHALL 允许用户将同一个配置档案一次性同步到多台远程主机。

#### Scenario: 选择多台主机同步
- **WHEN** 用户选择档案并勾选多台主机，点击"批量同步"
- **THEN** 系统依次（或并行）将配置推送到所有选中的主机，完成后显示每台主机的同步结果摘要

#### Scenario: 部分主机同步失败
- **WHEN** 批量同步中部分主机成功、部分失败
- **THEN** 系统显示汇总结果，标明每台主机的成功/失败状态和失败原因，不因部分失败阻断其他主机的同步

### Requirement: 同步历史记录
系统 SHALL 记录每次同步操作的历史，包含同步时间、档案名称、目标主机和结果。

#### Scenario: 查看同步历史
- **WHEN** 用户打开同步历史面板
- **THEN** 系统显示按时间倒序排列的同步记录，每条包含时间、档案名、主机名和成功/失败状态

### Requirement: 远程主机路径配置
系统 SHALL 允许用户为每台远程主机配置 Claude Code settings.json 的目标路径。

#### Scenario: 自定义远程路径
- **WHEN** 用户添加或编辑远程主机时指定远程路径为 "/home/user/.claude/settings.json"
- **THEN** 同步操作将配置文件传输到该指定路径

#### Scenario: 使用默认路径
- **WHEN** 用户添加远程主机时未指定远程路径
- **THEN** 系统使用默认路径 `~/.claude/settings.json` 进行同步
