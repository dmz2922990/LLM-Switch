## ADDED Requirements

### Requirement: 查看档案 JSON 内容
系统 SHALL 允许用户查看任意配置档案的 settings.json 内容，以格式化的 JSON 形式展示，支持语法高亮。

#### Scenario: 打开档案编辑器
- **WHEN** 用户选择一个档案并点击"编辑"按钮
- **THEN** 系统打开编辑视图，以格式化 JSON 展示该档案的完整内容，带语法高亮

#### Scenario: 查看只读模式
- **WHEN** 用户在档案列表中预览某个档案
- **THEN** 系统以只读方式展示 JSON 内容摘要或完整内容，不可直接编辑

### Requirement: 编辑档案 JSON 内容
系统 SHALL 提供内置 JSON 编辑器，允许用户直接修改配置档案的 settings.json 内容。编辑器 MUST 支持 JSON 语法高亮和实时校验。

#### Scenario: 修改 JSON 并保存
- **WHEN** 用户在编辑器中修改 JSON 内容并点击"保存"
- **THEN** 系统校验 JSON 格式，格式正确则保存更新到该档案，显示"保存成功"

#### Scenario: JSON 格式错误时阻止保存
- **WHEN** 用户修改内容后 JSON 格式无效（如缺少引号、括号不匹配）并尝试保存
- **THEN** 系统拒绝保存，在编辑器中高亮标记错误位置，提示具体的语法错误信息

#### Scenario: 编辑活跃档案时自动生效
- **WHEN** 用户编辑并保存的是当前活跃档案
- **THEN** 系统保存后将更新内容同步写入 Claude Code 的 settings.json 文件

#### Scenario: 放弃未保存的修改
- **WHEN** 用户有未保存的修改并关闭编辑器或切换到其他档案
- **THEN** 系统弹出确认对话框"有未保存的修改，是否放弃？"，确认后丢弃修改

### Requirement: JSON 编辑器功能
系统 SHALL 集成 Monaco Editor 作为 JSON 编辑器，提供以下编辑辅助功能。

#### Scenario: 语法高亮与自动补全
- **WHEN** 用户在编辑器中输入 JSON 内容
- **THEN** 编辑器提供 JSON 语法高亮、自动缩进和括号自动匹配

#### Scenario: 格式化 JSON
- **WHEN** 用户点击"格式化"按钮
- **THEN** 编辑器将当前内容自动格式化为标准缩进的 JSON

#### Scenario: 搜索与替换
- **WHEN** 用户在编辑器中使用搜索功能（Ctrl/Cmd+F）
- **THEN** 编辑器支持文本搜索和替换功能
