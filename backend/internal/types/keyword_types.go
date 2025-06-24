package types

// KeywordRuleInterface defines the common interface for keyword rules
type KeywordRuleInterface interface {
	GetPattern() string
	GetRuleType() string
	IsCaseSensitive() bool
	GetCategory() string
	GetContextChars() int
}

// KeywordSetInterface defines the common interface for keyword sets
type KeywordSetInterface interface {
	GetID() string
	GetName() string
	GetDescription() string
	GetRules() []KeywordRuleInterface
}

// KeywordConverterInterface defines the interface for converting between config and model types
type KeywordConverterInterface interface {
	ConfigToModelRule(configRule interface{}, keywordSetID string) (interface{}, error)
	ModelToConfigRule(modelRule interface{}) (interface{}, error)
	ConfigToModelSet(configSet interface{}) (interface{}, error)
	ModelToConfigSet(modelSet interface{}) (interface{}, error)
}
