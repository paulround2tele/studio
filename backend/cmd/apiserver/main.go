package main

import "flag"

// Minimal Chi-only entry point
func main() {
	dumpRoutesFlag := flag.Bool("dump-routes", false, "print all registered routes and exit")
	flag.Parse()

	if *dumpRoutesFlag {
		runRouteDump()
		return
	}

	startChiServer()
}
