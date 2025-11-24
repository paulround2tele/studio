package main

import (
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/go-chi/chi/v5"
)

// dumpRoutes builds the strict Chi router used by the API server and walks each
// registered route. The output is consumed by scripts/check-routes.mjs to ensure
// parity between the OpenAPI contract and the live router wiring.
func dumpRoutes() ([]string, error) {
	strict := &strictHandlers{}
	mux := chi.NewRouter()
	gen.HandlerFromMuxWithBaseURL(gen.NewStrictHandler(strict, nil), mux, "/api/v2")

	routes := make([]string, 0, 256)
	walker := func(method string, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		if method == "" || route == "" {
			return nil
		}
		norm := strings.TrimSpace(route)
		if norm == "" {
			norm = "/"
		}
		if norm != "/" {
			norm = strings.TrimRight(norm, "/")
			if norm == "" {
				norm = "/"
			}
		}
		// Chi emits {param} with a preceding slash already; keep as-is so
		// compare-routes.mjs can normalize consistently with the spec paths.
		routes = append(routes, fmt.Sprintf("%s %s", strings.ToUpper(method), norm))
		return nil
	}

	if err := chi.Walk(mux, walker); err != nil {
		return nil, err
	}

	sort.Strings(routes)
	return routes, nil
}

func runRouteDump() {
	routes, err := dumpRoutes()
	if err != nil {
		log.Fatalf("route dump failed: %v", err)
	}
	for _, route := range routes {
		fmt.Println(route)
	}
}
