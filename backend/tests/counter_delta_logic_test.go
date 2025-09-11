package tests

import "testing"

// computeDNSDeltas replicates logic: pending -> {ok,error,timeout}
func computeDNSDeltas(ok, errc, timeout int) (pendingDelta, okDelta, errDelta, timeoutDelta int) {
	pendingDelta = -(ok + errc + timeout)
	okDelta = ok
	errDelta = errc
	timeoutDelta = timeout
	return
}

func TestCounterDeltaBasic(t *testing.T) {
	pd, okd, ed, td := computeDNSDeltas(3, 2, 1)
	if pd != -6 || okd != 3 || ed != 2 || td != 1 {
		t.Fatalf("unexpected deltas %v %v %v %v", pd, okd, ed, td)
	}
}

func TestCounterDeltaZero(t *testing.T) {
	pd, okd, ed, td := computeDNSDeltas(0, 0, 0)
	if pd != 0 || okd != 0 || ed != 0 || td != 0 {
		t.Fatalf("expected all zero got %d %d %d %d", pd, okd, ed, td)
	}
}

// TODO: Implement A7 counter delta unit tests (pending -> ok/error/timeout idempotency)
func TestCounterDeltaPlaceholder(t *testing.T) {}
