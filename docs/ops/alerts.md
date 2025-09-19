# Prometheus Alerting Rules for Pipeline Monitoring

This document provides example Prometheus alerting rules for monitoring the consolidated extraction/analysis pipeline.

## Pipeline Reconciliation Alerts

### High Fatal Task Rate

Alerts when too many tasks are being marked as fatal (exhausted retries):

```yaml
groups:
- name: pipeline_reconciliation
  rules:
  - alert: ExtractionReconcileFatalSpike
    expr: |
      rate(extraction_reconcile_rows_adjusted_total{action=~"mark_fatal|give_up_fatal"}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
      component: extraction_reconciler
    annotations:
      summary: "High rate of fatal task markings detected"
      description: |
        The reconciliation process is marking tasks as fatal at a rate of {{ $value }} per second.
        This may indicate systemic issues with task processing or overly aggressive retry limits.
        Check reconciliation logs and task error patterns.
```

### Reconciliation Pass Failures

Alerts when reconciliation passes are failing consistently:

```yaml
  - alert: ExtractionReconcilePassErrors
    expr: |
      rate(extraction_reconcile_pass_total{result="error"}[10m]) > 0
    for: 5m
    labels:
      severity: critical
      component: extraction_reconciler
    annotations:
      summary: "Extraction reconciliation passes are failing"
      description: |
        Reconciliation passes have been failing for the past 5 minutes.
        Error rate: {{ $value }} failures per second.
        Check reconciler logs and database connectivity.
        Pipeline health may be degraded.
```

### Reconciliation Stuck

Alerts when reconciliation passes are taking too long:

```yaml
  - alert: ExtractionReconcileLatencyHigh
    expr: |
      histogram_quantile(0.95, rate(extraction_reconcile_latency_seconds_bucket[5m])) > 30
    for: 3m
    labels:
      severity: warning
      component: extraction_reconciler
    annotations:
      summary: "Reconciliation passes taking too long"
      description: |
        95th percentile reconciliation latency is {{ $value }}s, above the 30s threshold.
        This may indicate database performance issues or large backlogs.
        Check database performance and reconciliation batch sizes.
```

## Stale Score Detection Alerts

### Stale Score Spike

Alerts when suddenly many stale scores are detected:

```yaml
- name: stale_score_detection
  rules:
  - alert: AnalysisStaleScoresSpike
    expr: |
      rate(analysis_stale_scores_detected_total[5m]) > 10
    for: 2m
    labels:
      severity: warning
      component: stale_score_detector
    annotations:
      summary: "Sudden increase in stale scores detected"
      description: |
        Stale score detection rate has increased to {{ $value }} scores per second.
        This may indicate issues with the analysis pipeline or score updates.
        Check extraction timing and analysis job processing.
```

### No Score Updates

Alerts when stale score detection hasn't run recently (may indicate the detector is broken):

```yaml
  - alert: AnalysisStaleScoreDetectionStalled
    expr: |
      time() - analysis_stale_scores_detected_total > 3600
    for: 5m
    labels:
      severity: warning
      component: stale_score_detector
    annotations:
      summary: "Stale score detection appears stalled"
      description: |
        No stale scores have been detected in over an hour.
        This may indicate the stale score detector is not running or
        is unable to access the database.
        Check detector logs and configuration.
```

## Feature Coverage Alerts

### Low Feature Coverage

Alerts when feature table coverage drops below acceptable levels:

```yaml
- name: feature_coverage
  rules:
  - alert: AnalysisFeatureCoverageLow
    expr: |
      analysis_feature_table_coverage_ratio < 0.8
    for: 5m
    labels:
      severity: warning
      component: feature_extraction
    annotations:
      summary: "Feature table coverage is low for campaign {{ $labels.campaign_id }}"
      description: |
        Feature coverage ratio is {{ $value }}, below the 80% warning threshold.
        This may indicate issues with feature extraction or data pipeline delays.
        Check extraction job status and database synchronization.
```

## Resource and Performance Alerts

### High Reconciliation Volume

Alerts when reconciliation is processing unusually high volumes:

```yaml
- name: resource_monitoring
  rules:
  - alert: ExtractionReconcileVolumeHigh
    expr: |
      rate(extraction_reconcile_rows_examined_total[5m]) > 100
    for: 3m
    labels:
      severity: info
      component: extraction_reconciler
    annotations:
      summary: "High reconciliation processing volume"
      description: |
        Reconciliation is examining {{ $value }} rows per second.
        This is higher than normal and may indicate a backlog or system stress.
        Monitor system resources and consider scaling if sustained.
```

### Pipeline Skipped Passes

Alerts when reconciliation passes are being skipped due to overlapping execution:

```yaml
  - alert: ExtractionReconcileSkippedPasses
    expr: |
      rate(extraction_reconcile_pass_total{result="skipped"}[10m]) > 0.1
    for: 5m
    labels:
      severity: warning
      component: extraction_reconciler
    annotations:
      summary: "Reconciliation passes are being skipped frequently"
      description: |
        Rate of skipped reconciliation passes: {{ $value }} per second.
        This indicates reconciliation is taking longer than the configured interval.
        Consider increasing the reconciliation interval or optimizing database queries.
```

## Composite Health Alerts

### Pipeline Health Degraded

A composite alert combining multiple signals:

```yaml
- name: pipeline_health
  rules:
  - alert: ExtractionPipelineHealthDegraded
    expr: |
      (
        rate(extraction_reconcile_pass_total{result="error"}[10m]) > 0 or
        rate(extraction_reconcile_rows_adjusted_total{action=~"mark_fatal|give_up_fatal"}[5m]) > 0.05 or
        analysis_feature_table_coverage_ratio < 0.7
      )
    for: 5m
    labels:
      severity: critical
      component: extraction_pipeline
    annotations:
      summary: "Extraction pipeline health is degraded"
      description: |
        Multiple indicators suggest pipeline health issues:
        - Reconciliation errors: {{ with query "rate(extraction_reconcile_pass_total{result=\"error\"}[10m])" }}{{ . | first | value | printf "%.3f" }}{{ end }} per second
        - Fatal task rate: {{ with query "rate(extraction_reconcile_rows_adjusted_total{action=~\"mark_fatal|give_up_fatal\"}[5m])" }}{{ . | first | value | printf "%.3f" }}{{ end }} per second
        - Minimum coverage: {{ with query "min(analysis_feature_table_coverage_ratio)" }}{{ . | first | value | printf "%.3f" }}{{ end }}
        
        Investigate extraction jobs, database connectivity, and reconciliation logs.
```

## Alert Configuration Examples

### Alertmanager Configuration

Example routing and notification configuration:

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'component']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'pipeline-alerts'
  routes:
  - match:
      severity: critical
    receiver: 'critical-pipeline-alerts'
  - match:
      component: extraction_reconciler
    receiver: 'reconciler-alerts'

receivers:
- name: 'pipeline-alerts'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#pipeline-monitoring'
    title: 'Pipeline Alert: {{ .GroupLabels.alertname }}'
    text: |
      {{ range .Alerts }}
      *Alert:* {{ .Annotations.summary }}
      *Description:* {{ .Annotations.description }}
      *Component:* {{ .Labels.component }}
      *Severity:* {{ .Labels.severity }}
      {{ end }}

- name: 'critical-pipeline-alerts'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#critical-alerts'
    title: '🚨 CRITICAL Pipeline Alert: {{ .GroupLabels.alertname }}'
    text: |
      {{ range .Alerts }}
      *CRITICAL ALERT:* {{ .Annotations.summary }}
      *Description:* {{ .Annotations.description }}
      *Component:* {{ .Labels.component }}
      {{ end }}
  pagerduty_configs:
  - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
    description: 'Critical pipeline alert: {{ .GroupLabels.alertname }}'
```

### Recording Rules

Pre-computed metrics for better alert performance:

```yaml
# recording_rules.yml
groups:
- name: pipeline_recording_rules
  interval: 30s
  rules:
  - record: extraction:reconcile_error_rate
    expr: rate(extraction_reconcile_pass_total{result="error"}[5m])
  
  - record: extraction:fatal_task_rate
    expr: rate(extraction_reconcile_rows_adjusted_total{action=~"mark_fatal|give_up_fatal"}[5m])
  
  - record: extraction:stale_score_rate
    expr: rate(analysis_stale_scores_detected_total[5m])
  
  - record: extraction:reconcile_latency_p95
    expr: histogram_quantile(0.95, rate(extraction_reconcile_latency_seconds_bucket[5m]))
```

## Recommended Thresholds

Based on typical system behavior:

| Metric | Warning Threshold | Critical Threshold | Notes |
|--------|------------------|-------------------|--------|
| Fatal task rate | 0.1/sec | 0.5/sec | Sustained over 2-5 minutes |
| Reconcile errors | Any | Any | Immediate alert |
| Stale score spike | 10/sec | 50/sec | Check for extraction delays |
| Feature coverage | <80% | <70% | Per-campaign basis |
| Reconcile latency | 30s (p95) | 60s (p95) | May indicate DB issues |

## Runbook References

For alert response procedures, see:
- [Pipeline Troubleshooting Guide](../troubleshooting/pipeline.md)
- [Database Performance Guide](../troubleshooting/database.md)
- [Reconciliation Manual](../ops/reconciliation.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-15  
**Next Review**: After alert tuning based on production experience