package services

import (
	"strings"
	"testing"
)

func TestParseStructuralSignals_Basic(t *testing.T) {
	html := `<!DOCTYPE html><html><head><title>Test</title><script>var x=1;</script></head><body><h1>Main</h1><h1>Dup</h1>
    <p>Hello world this is plain English text with enough letters to be detected as English language content.</p>
    <a href="/internal">In</a><a href="https://otherhost.xyz/ext">Out</a><a href="/x">In2</a>
    <a href="javascript:void(0)">JS</a>
    </body></html>`
	ss := parseStructuralSignals([]byte(html), "https://example.com/")
	if ss.H1Count != 2 {
		t.Fatalf("expected 2 h1, got %d", ss.H1Count)
	}
	if ss.LinkInternalCount != 2 {
		t.Fatalf("expected 2 internal, got %d", ss.LinkInternalCount)
	}
	if ss.LinkExternalCount != 1 {
		t.Fatalf("expected 1 external, got %d", ss.LinkExternalCount)
	}
	if ss.LinkInternalRatio <= 0.0 || ss.LinkInternalRatio >= 1.0 {
		t.Fatalf("internal ratio should be between 0 and 1, got %f", ss.LinkInternalRatio)
	}
	if ss.PrimaryLang != "en" {
		t.Fatalf("expected lang en got %s (confidence=%f)", ss.PrimaryLang, ss.LangConfidence)
	}
	if ss.LangConfidence < 0.5 {
		t.Fatalf("unexpected low lang confidence: %f", ss.LangConfidence)
	}
}

func TestParseStructuralSignals_Undetermined(t *testing.T) {
	html := `<!DOCTYPE html><html><body><p>短いテキスト🙂</p><a href="/a">in</a><a href="/b">in</a></body></html>`
	ss := parseStructuralSignals([]byte(html), "https://example.org/")
	if ss.PrimaryLang != "und" {
		t.Fatalf("expected und got %s", ss.PrimaryLang)
	}
	if ss.LangConfidence >= 0.85 {
		t.Fatalf("unexpected high ascii confidence: %f", ss.LangConfidence)
	}
}

// Benchmark to ensure structural parsing stays lightweight (< ~200µs typical for small pages)
func BenchmarkParseStructuralSignals(b *testing.B) {
	raw := []byte(`<!doctype html><html><head><title>X</title></head><body>` +
		strings.Repeat("<h1>T</h1><p>Lorem ipsum dolor sit amet test english content words.</p>", 20) +
		`<a href="/a">in</a><a href="/b">in</a><a href="https://ext.example/x">out</a></body></html>`)
	for i := 0; i < b.N; i++ {
		_ = parseStructuralSignals(raw, "https://example.com/")
	}
}

// Large page benchmark (~100KB) to ensure performance characteristics scale sub-linearly with content size.
func BenchmarkParseStructuralSignals_Large(b *testing.B) {
	para := `<p>The quick brown fox jumps over the lazy dog while considering various aspects of scalable architecture and distributed systems design within a complex modern infrastructure.</p>`
	segment := `<h1>Header</h1>` + strings.Repeat(para, 15) + `<a href="/internal">in</a><a href="https://ext.example/x">out</a>`
	body := strings.Repeat(segment, 60) // ~100KB aggregate
	raw := []byte(`<!doctype html><html><head><title>Benchmark</title></head><body>` + body + `</body></html>`)
	b.SetBytes(int64(len(raw)))
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = parseStructuralSignals(raw, "https://bench.example/")
	}
}

func TestComputeDiminishingReturns(t *testing.T) {
	cases := []struct {
		base, added, pages int
		want               bool
	}{
		{0, 0, 2, true},   // no gain
		{0, 1, 3, true},   // negligible gain
		{0, 3, 3, false},  // some gain
		{5, 0, 2, true},   // zero growth
		{5, 1, 2, false},  // 6/5=1.2 above threshold
		{5, 2, 2, false},  // 7/5=1.4
		{10, 1, 3, true},  // 11/10=1.1 below threshold
		{10, 2, 3, false}, // 12/10=1.2 above threshold
		{3, 1, 1, false},  // pages <2 always false
	}
	for i, c := range cases {
		got := computeDiminishingReturns(c.base, c.added, c.pages)
		if got != c.want {
			t.Fatalf("case %d: diminishingReturns(%d,%d,%d) got %v want %v", i, c.base, c.added, c.pages, got, c.want)
		}
	}
}

func TestParseStructuralSignals_LanguageDetectionMulti(t *testing.T) {
	en := `<!doctype html><html><body><p>The quick brown fox jumps over the lazy dog and the energetic cat during the evening session of the gathering where everyone was singing and enjoying the moment.</p></body></html>`
	es := `<!doctype html><html><body><p>La información que presentamos ofrece una conexión profunda con la nación y las cuestiones que requieren atención porque la situación actual es compleja y requiere unión.</p></body></html>`
	fr := `<!doctype html><html><body><p>Les informations que nous présentons offrent une connexion essentielle avec la nation et les questions importantes car la situation actuelle est complexe et nécessite une action coordonnée.</p></body></html>`
	de := `<!doctype html><html><body><p>Die Informationen und die Verbindung mit der Nation und den wichtigen Fragen werden dargestellt weil die Situation derzeit komplex und schwierig erscheint und besondere Aufmerksamkeit braucht.</p></body></html>`
	und := `<!doctype html><html><body><p>短いテキスト🙂 تست قيمة صغيرة</p></body></html>`

	cases := []struct{ raw, want string }{
		{en, "en"}, {es, "es"}, {fr, "fr"}, {de, "de"}, {und, "und"},
	}
	for i, c := range cases {
		ss := parseStructuralSignals([]byte(c.raw), "https://x.test/")
		if ss.PrimaryLang != c.want {
			t.Fatalf("case %d expected %s got %s (confidence=%f)", i, c.want, ss.PrimaryLang, ss.LangConfidence)
		}
	}
}
