package config

// DNSPersona defines the structure for a DNS persona, including its specific DNS validator configuration.
type DNSPersona struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	Config      DNSValidatorConfigJSON `json:"config"` // Uses the JSON variant for easy load/save
}

// LoadDNSPersonas loads DNS persona configurations from the specified file in configDir.
func LoadDNSPersonas(configDir string) ([]DNSPersona, error) {
	return loadPersonasFromFile[DNSPersona](configDir, dnsPersonasConfigFilename, "DNS")
}

// SaveDNSPersonas saves the DNS personas to their configuration file.
func SaveDNSPersonas(personas []DNSPersona, configDir string) error {
	return savePersonasToFile(personas, configDir, dnsPersonasConfigFilename, "DNS")
}
