package constants

// Campaign metrics & classification thresholds.
// These are intentionally centralized so UI, recommendation engine, and services can share a single source.
// NOTE: Domain score scale: assume 0-1 normalized (update comment if schema changes). If schema uses 0-100, adjust constant and dependent queries accordingly.

const (
	HighPotentialScoreThreshold = 0.80
	RepetitionIndexThreshold    = 0.60
	AnchorShareThreshold        = 0.80
)

// TODO: externalize HighPotentialScoreThreshold via configuration if product requires dynamic tuning.
