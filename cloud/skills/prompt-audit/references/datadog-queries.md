# Datadog Queries for Prompt Audit

Ready-to-use queries for production evidence.

## Skill Efficiency (steps, tool calls, utilization)

```
aggregate_spans:
  query: service:fiddle-backend resource_name:skill.execute.efficiency
  from: now-7d
  group_by: @skillId
  computes: AVG(@stepsUsed), AVG(@totalToolCalls), AVG(@stepUtilization), COUNT(*)
```

## Frustration Signals

```
aggregate_spans:
  query: service:fiddle-backend resource_name:router.classify.result
  from: now-7d
  group_by: @skillId, @frustrationSignal
  computes: COUNT(*)
```

## Frustration Scores (numeric)

```
aggregate_spans:
  query: service:fiddle-backend resource_name:router.classify.result @frustrationConfidence:>0
  from: now-7d
  group_by: @skillId
  computes: AVG(@frustrationConfidence), MAX(@frustrationConfidence), COUNT(*)
```

## Tool Errors per Skill

```
search_spans:
  query: service:fiddle-backend resource_name:skill-* status:error
  from: now-7d
  custom_attributes: error.message, error.type, skillId, toolName
```

## LLM Token Usage per Skill

```
search_llmobs_spans:
  ml_app: fiddle-app
  span_kind: llm
  from: now-7d
  # Then get_llmobs_span_content for messages to see prompt size
```

## Routing Patterns (unclear fallback rate)

```
aggregate_spans:
  query: service:fiddle-backend resource_name:router.classify.result
  from: now-7d
  group_by: @skillId, @routingPath, @wasUnclearFallback
  computes: COUNT(*)
```
