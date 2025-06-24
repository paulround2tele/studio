package config

// Flags holds the command-line flag values.
var Flags = struct {
	AllowTerminal bool
	AllowMutation bool
	DbUrl         string
}{}