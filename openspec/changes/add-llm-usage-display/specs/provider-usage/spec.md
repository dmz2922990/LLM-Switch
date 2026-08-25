## ADDED Requirements

### Requirement: Provider identification by URL keyword
The system SHALL identify the LLM provider by matching keywords in the profile's `ANTHROPIC_BASE_URL`. The keyword mapping SHALL be:
- `bigmodel.cn` → ZhiPu (BigModel)
- Unmatched URL → unsupported provider, usage display SHALL be hidden

#### Scenario: ZhiPu provider detected
- **WHEN** the active profile's `ANTHROPIC_BASE_URL` contains `bigmodel.cn`
- **THEN** the system SHALL identify the provider as ZhiPu and enable usage display

#### Scenario: Unsupported provider detected
- **WHEN** the active profile's `ANTHROPIC_BASE_URL` does not match any known provider keyword
- **THEN** the system SHALL hide the usage display and show no error

### Requirement: ZhiPu usage data retrieval
The system SHALL query ZhiPu's usage API at `https://open.bigmodel.cn/api/monitor/usage/quota/limit` using the profile's `ANTHROPIC_AUTH_TOKEN` as Bearer token. The system SHALL extract only the two Token limit entries from the response:
- `TOKENS_LIMIT` with `unit=3` (5-hour Token quota)
- `TOKENS_LIMIT` with `unit=6` (weekly Token quota)

For each entry, the system SHALL capture: `percentage` (usage percentage) and `nextResetTime` (reset timestamp in milliseconds).

#### Scenario: Successful usage query
- **WHEN** the system queries ZhiPu's usage API with a valid token
- **THEN** the system SHALL return the 5-hour and weekly Token usage percentages and reset times

#### Scenario: API request failure
- **WHEN** the usage API request fails (network error, invalid token, server error)
- **THEN** the system SHALL silently fail and display no usage data, without showing error dialogs

### Requirement: Token usage display in UI
The system SHALL display a usage section in the main interface showing two progress bars:
1. **5-hour Token quota** — percentage bar with label
2. **Weekly Token quota** — percentage bar with label

Each bar SHALL visually indicate the usage percentage. The system SHALL color-code the progress bars:
- Green: 0%–70%
- Yellow: 70%–90%
- Red: 90%–100%

#### Scenario: Usage display rendered
- **WHEN** the active profile is a supported provider and usage data is available
- **THEN** the system SHALL render two progress bars showing 5-hour and weekly Token usage percentages with appropriate color coding

#### Scenario: No usage data available
- **WHEN** usage data is unavailable (unsupported provider or API failure)
- **THEN** the system SHALL not render the usage display section

### Requirement: Usage display refresh with next-refresh tooltip
The system SHALL support both manual refresh (via click) and automatic refresh on a fixed interval. The system SHALL display the next scheduled refresh time when the user hovers over the refresh button or usage area.

#### Scenario: Manual refresh
- **WHEN** the user clicks the refresh button
- **THEN** the system SHALL immediately re-query the usage API and update the display

#### Scenario: Automatic refresh
- **WHEN** the automatic refresh interval elapses
- **THEN** the system SHALL silently re-query the usage API and update the display

#### Scenario: Hover to see next refresh time
- **WHEN** the user hovers over the refresh button or usage display area
- **THEN** the system SHALL show a tooltip with the next scheduled refresh time (e.g., "下次刷新: 14:32:00")

#### Scenario: Profile switch triggers refresh
- **WHEN** the user switches to a different profile
- **THEN** the system SHALL clear existing usage data and trigger a fresh usage query for the new profile

### Requirement: Extensible provider architecture
The system SHALL be designed to allow adding new providers without modifying existing code. Each provider SHALL define:
- URL keyword(s) for identification
- Usage API endpoint and request format
- Response parsing logic

#### Scenario: Adding a new provider
- **WHEN** a developer adds a new provider configuration with URL keyword, API endpoint, and response parser
- **THEN** the system SHALL automatically support usage display for that provider without changes to the core UI or service logic
